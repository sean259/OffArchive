/**
 * Supabase clients.
 *  - publicClient(): anonymous, no cookies. Used for public pages (shop, item pages, sellers),
 *    so the shop only ever shows what anyone is allowed to see.
 *  - requestClient(): per request, carries the signed-in user's session cookies, so
 *    row-level security applies as that user (their own drafts, admin powers, etc).
 *
 * Configure with PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY (see .env.example).
 * Both are safe to expose: row-level security in supabase/migrations decides what each user can do.
 * Until they're set, the site runs read-only from the Markdown files in src/content/items.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const PHOTO_BUCKET = 'listing-images';

/** Give up on a Supabase request after 8s so a slow database can't hang a page render. */
const TIMEOUT_MS = 8_000;
const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS) });

let anon: SupabaseClient | null = null;

export function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  anon ??= createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
  return anon;
}

export function requestClient(request: Request, cookies: AstroCookies): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' })),
      setAll: (list) => list.forEach(({ name, value, options }) => cookies.set(name, value, options)),
    },
  });
}

/** True if the request carries a Supabase auth cookie (skips the auth round-trip for visitors). */
export const hasAuthCookie = (request: Request) => /(?:^|;\s*)sb-[^=]+-auth-token/.test(request.headers.get('Cookie') ?? '');

/** Public URL for a photo stored in the listing-images bucket. */
export const photoUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
