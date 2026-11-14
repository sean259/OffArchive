/** Step 2 of sign-in: check the code from the email and start a session. */
import type { APIRoute } from 'astro';
import { afterLogin, safeNext } from '../../../lib/api';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const token = String(form.get('token') ?? '').replace(/\D/g, '');
  const next = safeNext(form.get('next'));

  if (!locals.supabase) return redirect('/login/?error=setup');
  if (token.length < 6) return redirect(`/login/?${new URLSearchParams({ step: 'code', email, next, error: 'code' })}`);

  const { data, error } = await locals.supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    console.error('[auth] verifyOtp:', error.message);
    return redirect(`/login/?${new URLSearchParams({ step: 'code', email, next, error: 'code' })}`);
  }
  return redirect(afterLogin(next, data.user));
};
