/**
 * Response hardening and simple abuse protection for server-rendered requests.
 * Static (prerendered) files get the same headers from public/_headers.
 */
import { SUPABASE_URL } from './supabase';

const supabase = SUPABASE_URL ? new URL(SUPABASE_URL).origin : '';

/**
 * Content-Security-Policy: only this site, Supabase (data + photos) and the optional
 * analytics scripts may load. Astro inlines small scripts and styles, hence 'unsafe-inline';
 * the other rules still block injected third-party scripts, framing and form hijacking.
 */
export function csp(https: boolean) {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://plausible.io",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${supabase} https://cloudflareinsights.com https://plausible.io`.replace(/\s+/g, ' '),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function applySecurityHeaders(headers: Headers, https: boolean) {
  headers.set('Content-Security-Policy', csp(https));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (https) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

/* ── Rate limiting ───────────────────────────────────────────────────────────
 * A fixed-window counter per IP and route group, kept in memory. On serverless
 * hosting each instance keeps its own counts, so this stops bursts and scripts
 * rather than a determined attacker; Supabase separately limits login emails, and
 * row-level security limits what any request can do.
 */
const RULES: { test: RegExp; limit: number; windowMs: number }[] = [
  { test: /^\/api\/auth\/(otp|verify)/, limit: 8, windowMs: 10 * 60_000 }, // login attempts
  { test: /^\/api\//, limit: 60, windowMs: 60_000 }, // everything else that writes
];
const hits = new Map<string, { count: number; reset: number }>();

/** Returns seconds to wait if this request is over the limit, otherwise 0. */
export function rateLimited(ip: string, path: string, method: string): number {
  if (method === 'GET' || method === 'HEAD') return 0;
  const rule = RULES.find((r) => r.test.test(path));
  if (!rule) return 0;
  const key = `${rule.test.source}|${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    hits.set(key, { count: 1, reset: now + rule.windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    return 0;
  }
  entry.count += 1;
  return entry.count > rule.limit ? Math.ceil((entry.reset - now) / 1000) : 0;
}
