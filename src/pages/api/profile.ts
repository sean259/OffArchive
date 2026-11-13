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

  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id);
  if (error) {
    const taken = error.code === '23505';
    console.error('[profile] update:', error.message);
    return back({ error: taken ? 'That username is taken. Try another.' : 'Could not save your profile. Please try again.' });
  }
  invalidateItems();
  return redirect(next === '/account/' ? '/account/?notice=profile' : next);
};
