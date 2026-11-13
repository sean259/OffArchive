/**
 * Update or delete one listing. Row-level security limits this to the owner (or an admin),
 * and the listing_guard trigger enforces which status changes a seller may make.
 *   PATCH { status: 'available' | 'reserved' | 'sold' }      quick actions from the account page
 *   PATCH { ...full listing fields }                         the edit form
 *   DELETE                                                    removes the listing and its photos
 */
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { json, fail, listingInput, firstIssue } from '../../../lib/api';
import { invalidateItems } from '../../../lib/items';
import { PHOTO_BUCKET } from '../../../lib/supabase';

const statusOnly = z.object({ status: z.enum(['available', 'reserved', 'sold']) }).strict();

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user, profile } = locals;
  if (!supabase || !user) return fail('Please log in again.', 401);

  const { data: current } = await supabase.from('listings').select('id, seller_id, images, status').eq('id', params.id!).maybeSingle();
  if (!current) return fail('Listing not found.', 404);
  const isAdmin = profile?.role === 'admin';
  if (current.seller_id !== user.id && !isAdmin) return fail('Not your listing.', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  let update: Record<string, unknown>;
  const quick = statusOnly.safeParse(body);
  if (quick.success) {
    update = quick.data;
  } else {
    const parsed = listingInput.safeParse(body);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    // New photos must come from the seller's folder; existing ones may stay as they are.
    const owner = current.seller_id as string;
    const ok = parsed.data.images.every((p) => current.images.includes(p) || p.startsWith(`${user.id}/`) || p.startsWith(`${owner}/`));
    if (!ok) return fail('Photos must be uploaded from your account.', 403);
    update = parsed.data;
  }

  const { data, error } = await supabase.from('listings').update(update).eq('id', current.id).select('id, slug, status, images').single();
  if (error || !data) {
    console.error('[listings] update:', error?.message);
    return fail('Could not save changes. Please try again.');
  }

  // Clean up photos that were removed in the editor.
  const removed = (current.images as string[]).filter((p) => !data.images.includes(p));
  if (removed.length) await supabase.storage.from(PHOTO_BUCKET).remove(removed);

  invalidateItems();
  return json({ id: data.id, slug: data.slug, status: data.status });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return fail('Please log in again.', 401);

  const { data, error } = await supabase.from('listings').delete().eq('id', params.id!).select('images').maybeSingle();
  if (error) return fail('Could not delete the listing.');
  if (!data) return fail('Listing not found.', 404);
  if (data.images.length) await supabase.storage.from(PHOTO_BUCKET).remove(data.images);

  invalidateItems();
  return json({ ok: true });
};
