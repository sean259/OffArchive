/** Admin: verify sellers or change roles. Admins can't demote themselves (avoids locking everyone out). */
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { json, fail, firstIssue } from '../../../../lib/api';
import { invalidateItems } from '../../../../lib/items';

const input = z
  .object({ verified: z.boolean().optional(), role: z.enum(['user', 'admin']).optional() })
  .refine((v) => v.verified !== undefined || v.role !== undefined, 'Nothing to change.');

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user, profile } = locals;
  if (!supabase || profile?.role !== 'admin') return fail('Admins only.', 403);

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (params.id === user?.id && parsed.data.role === 'user') return fail("You can't remove your own admin role.");

  const { data, error } = await supabase.from('profiles').update(parsed.data).eq('id', params.id!).select('id, role, verified').maybeSingle();
  if (error || !data) return fail(error?.message ?? 'User not found.', error ? 400 : 404);
  invalidateItems();
  return json(data);
};
