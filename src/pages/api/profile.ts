/** Save the signed-in user's profile (form post from /account/profile). */
import type { APIRoute } from 'astro';
import { profileInput, firstIssue, safeNext } from '../../lib/api';
import { invalidateItems } from '../../lib/items';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return redirect('/login/?next=/account/profile/');

  const form = Object.fromEntries(await request.formData());
  const next = safeNext(form.next, '/account/');
  const back = (params: Record<string, string>) => redirect(`/account/profile/?${new URLSearchParams({ next, ...params })}`);

  const parsed = profileInput.safeParse(form);
  if (!parsed.success) return back({ error: firstIssue(parsed.error) });

  // Photos: only verified sellers, only from their own folder (the database enforces this too).
  const oldAvatar = locals.profile?.avatar ?? null;
  const verified = Boolean(locals.profile?.verified || locals.profile?.role === 'admin');
  if (parsed.data.avatar !== undefined) {
    const mine = parsed.data.avatar === null || parsed.data.avatar.startsWith(`${user.id}/`);
    if (!mine || (parsed.data.avatar !== null && !verified)) parsed.data.avatar = undefined;
  }

  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id);
  if (error) {
    const taken = error.code === '23505';
    console.error('[profile] update:', error.message);
    return back({ error: taken ? 'That username is taken. Try another.' : 'Could not save your profile. Please try again.' });
  }
  // Replaced or removed photo: delete the old file so it doesn't linger in storage.
  if (parsed.data.avatar !== undefined && oldAvatar && oldAvatar !== parsed.data.avatar) {
    const { error: rmError } = await supabase.storage.from('listing-images').remove([oldAvatar]);
    if (rmError) console.error('[profile] remove old photo:', rmError.message);
  }
  invalidateItems();
  return redirect(next === '/account/' ? '/account/?notice=profile' : next);
};
