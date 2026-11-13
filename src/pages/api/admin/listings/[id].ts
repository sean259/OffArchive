/** Admin moderation: approve, reject (with a note), hide, restore, feature. Admin-only (middleware + RLS). */
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { json, fail, firstIssue } from '../../../../lib/api';
import { invalidateItems } from '../../../../lib/items';

const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3, 'Add a short reason for the seller.').max(300) }),
  z.object({ action: z.literal('hide') }),
  z.object({ action: z.literal('restore') }),
  z.object({ action: z.literal('feature') }),
  z.object({ action: z.literal('unfeature') }),
]);

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile } = locals;
  if (!supabase || profile?.role !== 'admin') return fail('Admins only.', 403);

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const a = parsed.data;

  const update =
    a.action === 'approve' || a.action === 'restore'
      ? { status: 'available', review_note: null }
      : a.action === 'reject'
        ? { status: 'rejected', review_note: a.note }
        : a.action === 'hide'
          ? { status: 'hidden' }
          : { featured: a.action === 'feature' };

  const { data, error } = await supabase.from('listings').update(update).eq('id', params.id!).select('id, status, featured').maybeSingle();
  if (error || !data) return fail(error?.message ?? 'Listing not found.', error ? 400 : 404);
  invalidateItems();
  return json(data);
};
