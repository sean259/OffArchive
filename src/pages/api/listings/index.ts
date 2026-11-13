/** Create a listing (signed-in sellers). The database decides pending vs live (see listing_guard). */
import type { APIRoute } from 'astro';
import { json, fail, slugify, listingInput, firstIssue } from '../../../lib/api';
import { invalidateItems } from '../../../lib/items';

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user, profile } = locals;
  if (!supabase || !user) return fail('Please log in again.', 401);
  if (!profile?.messenger && !profile?.phone) return fail('Add a Messenger username or phone number to your profile first.', 409);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }
  const parsed = listingInput.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const input = parsed.data;
  if (!input.images.every((p) => p.startsWith(`${user.id}/`))) return fail('Photos must be uploaded from your account.', 403);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('listings')
      .insert({ ...input, seller_id: user.id, slug: slugify(input.title) })
      .select('id, slug, status')
      .single();
    if (!error) {
      invalidateItems();
      return json(data, 201);
    }
    if (error.code === '23505' && error.message.includes('slug')) continue; // slug collision: retry with a new suffix
    console.error('[listings] insert:', error.message);
    return fail(error.code === 'P0001' ? error.message : 'Could not save the listing. Please try again.');
  }
  return fail('Could not save the listing. Please try again.');
};
