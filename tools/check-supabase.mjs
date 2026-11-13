#!/usr/bin/env node
/**
 * Checks that this project can reach your Supabase project and that the database is set up.
 *   npm run db:check
 * Uses only the public URL + anon key from .env (no secrets).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL?.trim();
const key = process.env.PUBLIC_SUPABASE_ANON_KEY?.trim();
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => {
  console.log(`  ✗ ${m}${fix ? `\n      → ${fix}` : ''}`);
  process.exitCode = 1;
};

console.log('\nSupabase connection check\n');
if (!url || !key) {
  bad('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are empty in .env', 'Supabase → Project Settings → API: copy the Project URL and the anon/publishable key into .env');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) console.log(`  ! URL looks unusual: ${url} (expected https://<ref>.supabase.co)`);
if (/service_role|sb_secret_/.test(key) || (key.startsWith('eyJ') && JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString() || '{}').role === 'service_role')) {
  bad('That is the SECRET service_role key. Never put it in .env', 'Use the anon / publishable key instead');
  process.exit(1);
}
ok(`URL and key found (${new URL(url).hostname})`);

const db = createClient(url, key, { auth: { persistSession: false } });

const { error: pingError } = await db.auth.getSession();
if (pingError) bad(`Couldn't reach Supabase: ${pingError.message}`);

const listings = await db.from('listings').select('id', { count: 'exact', head: true });
if (listings.error) {
  bad(
    `Listings table: ${listings.error.message}`,
    listings.error.code === '42P01' || /does not exist|schema cache/i.test(listings.error.message)
      ? 'Run supabase/migrations/20261113000001_marketplace.sql (SQL Editor) or `npm run db:push`'
      : 'Check the key is the anon key for this project',
  );
} else ok(`Listings table ready (${listings.count ?? 0} public listings)`);

const profiles = await db.from('profiles').select('id, role', { count: 'exact' }).eq('role', 'admin');
if (profiles.error) bad(`Profiles table: ${profiles.error.message}`);
else if (!profiles.data.length) console.log('  ! No admin yet: log in on the site, then run the "make yourself admin" SQL (docs/SUPABASE.md step 6)');
else ok(`Admin account exists (${profiles.data.length})`);

const bucket = await db.storage.from('listing-images').list('', { limit: 1 });
if (bucket.error) bad(`Photo bucket: ${bucket.error.message}`, 'Run supabase/migrations/20261113000002_storage.sql (SQL Editor) or `npm run db:push`');
else ok('Photo bucket "listing-images" ready');

console.log(process.exitCode ? '\nNot quite there. Fix the ✗ items above.\n' : '\nAll good. Restart `npm run dev` and open http://localhost:4321/login\n');
