/**
 * Magic-link landing. Handles both link styles Supabase can send:
 *  - ?code=…                 (default PKCE link; works in the same browser that requested it)
 *  - ?token_hash=…&type=email (if you customise the email template; works on any device)
 */
import type { APIRoute } from 'astro';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNext } from '../../lib/api';

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType;
  if (!locals.supabase) return redirect('/login/?error=setup');

  const { error } = code
    ? await locals.supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Missing code') };

  if (error) {
    console.error('[auth] callback:', error.message);
    return redirect(`/login/?${new URLSearchParams({ error: 'link', next })}`);
  }
  return redirect(next);
};
