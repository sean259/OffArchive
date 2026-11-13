/** Step 1 of sign-in: email a 6-digit code (and a magic link) to the address. */
import type { APIRoute } from 'astro';
import { safeNext } from '../../../lib/api';

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const next = safeNext(form.get('next'));
  const back = (params: Record<string, string>) => redirect(`/login/?${new URLSearchParams({ next, ...params })}`);

  if (!locals.supabase) return back({ error: 'setup' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return back({ error: 'email', email });

  const { error } = await locals.supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${url.origin}/auth/callback/?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error('[auth] signInWithOtp:', error.message);
    return back({ error: error.status === 429 ? 'rate' : 'send', email });
  }
  return back({ step: 'code', email });
};
