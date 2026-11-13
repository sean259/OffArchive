/**
 * Runs on every server-rendered request:
 *  1. Creates a Supabase client bound to the visitor's session cookies.
 *  2. Loads the signed-in user + profile into Astro.locals (skipped for anonymous visitors).
 *  3. Guards private areas: /account, /sell need a login; /admin needs the admin role.
 *  4. Rate-limits writes and adds security headers to every response.
 */
import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { requestClient, hasAuthCookie } from './lib/supabase';
import type { ProfileRow } from './lib/db-types';
import { applySecurityHeaders, rateLimited } from './lib/security';

const NEEDS_LOGIN = /^\/(account|sell|admin)(\/|$)/;
const NEEDS_ADMIN = /^\/(admin|api\/admin)(\/|$)/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const response = await handle(ctx, next);
  if (!ctx.isPrerendered) {
    try {
      applySecurityHeaders(response.headers, ctx.url.protocol === 'https:');
    } catch {
      // Some responses (e.g. passed-through static files) have read-only headers; netlify.toml covers those.
    }
  }
  return response;
});

function clientIp(ctx: APIContext) {
  const h = ctx.request.headers;
  const forwarded = h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return ctx.clientAddress;
  } catch {
    return 'unknown';
  }
}

const handle = async (ctx: APIContext, next: MiddlewareNext): Promise<Response> => {
  ctx.locals.supabase = null;
  ctx.locals.user = null;
  ctx.locals.profile = null;
  if (ctx.isPrerendered) return next();

  const wait = rateLimited(clientIp(ctx), ctx.url.pathname, ctx.request.method);
  if (wait) {
    // Login forms post normally (not JSON), so send them back to the form with a message.
    if (/^\/api\/auth\/(otp|verify)/.test(ctx.url.pathname)) return ctx.redirect('/login/?error=rate', 303);
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(wait) },
    });
  }

  const supabase = requestClient(ctx.request, ctx.cookies);
  ctx.locals.supabase = supabase;

  if (supabase && hasAuthCookie(ctx.request)) {
    // getUser() verifies the session with Supabase (unlike getSession(), which trusts the cookie).
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      ctx.locals.user = data.user;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      ctx.locals.profile = (profile as ProfileRow | null) ?? null;
    }
  }

  const path = ctx.url.pathname;
  const isApi = path.startsWith('/api/');

  if (NEEDS_LOGIN.test(path) && !ctx.locals.user) {
    return ctx.redirect(`/login?next=${encodeURIComponent(path + ctx.url.search)}`);
  }
  if (NEEDS_ADMIN.test(path) && ctx.locals.profile?.role !== 'admin') {
    if (isApi) return new Response(JSON.stringify({ error: 'Admins only.' }), { status: 403 });
    return ctx.redirect('/account?notice=admin-only');
  }

  const response = await next();
  // Private pages must never be cached by a CDN or shared between users.
  if (ctx.locals.user || NEEDS_LOGIN.test(path)) response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
