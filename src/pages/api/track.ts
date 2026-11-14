/**
 * Seller stats beacon: the browser reports a view, save, unsave or message tap on a listing.
 * Always answers 204 so tracking never shows an error to a shopper; the database function
 * decides what counts (live listings only, never the seller's own activity).
 */
import type { APIRoute } from 'astro';

const KINDS = new Set(['view', 'save', 'unsave', 'message']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const done = () => new Response(null, { status: 204 });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase) return done();
  let body: { ids?: unknown; kind?: unknown };
  try {
    body = JSON.parse(await request.text()); // sendBeacon posts text/plain
  } catch {
    return done();
  }
  const kind = String(body.kind ?? '');
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String))].filter((s) => SLUG.test(s) && s.length <= 80).slice(0, 10) : [];
  if (!KINDS.has(kind) || !ids.length) return done();

  const results = await Promise.all(ids.map((slug) => locals.supabase!.rpc('track_listing', { p_slug: slug, p_kind: kind })));
  const failed = results.find((r) => r.error);
  if (failed?.error) console.error('[track]', failed.error.message);
  return done();
};
