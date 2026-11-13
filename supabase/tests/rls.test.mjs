/**
 * Security test for the migrations in supabase/migrations (marketplace + categories).
 * Runs the real migration in PGlite (Postgres compiled to WASM) with a stub of Supabase's
 * auth schema, then acts as anonymous visitors, sellers and admins to prove the rules hold.
 *
 *   npm run test:db
 */
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
let passed = 0;
const ok = (name) => {
  passed++;
  console.log(`  ✓ ${name}`);
};

// ── Minimal stand-in for Supabase's auth schema + API roles ──
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
for (const file of ['20261113000001_marketplace.sql', '20261113000003_more_categories.sql']) {
  await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
}
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated;
`);

// ── Helpers ──
const as = async (who, sql, params = []) => {
  await db.exec('reset role');
  if (who === 'superuser') {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  } else if (who === 'anon') {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec('set role anon');
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who]);
    await db.exec('set role authenticated');
  }
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
};
const fails = async (who, sql, params, pattern) => {
  await assert.rejects(() => as(who, sql, params), pattern);
};
const newUser = async (email) => (await db.query(`insert into auth.users (email) values ($1) returning id`, [email])).rows[0].id;
const listing = (slug, extra = {}) => ({
  slug,
  title: 'Washed Boxy Tee',
  category: 'Clothing',
  price: 650,
  size: 'M',
  condition: 'Excellent',
  ...extra,
});
const insertListing = (who, l) =>
  as(
    who,
    `insert into public.listings (seller_id, slug, title, category, price, size, condition, status, featured)
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8, 'pending')::public.listing_status, coalesce($9, false))
     returning id, status, featured, seller_id`,
    [l.seller_id ?? who, l.slug, l.title, l.category, l.price, l.size, l.condition, l.status ?? null, l.featured ?? null],
  );
const statusOf = async (id) => (await db.query(`select status, review_note from public.listings where id = $1`, [id])).rows[0];

console.log('\nProfiles & roles');
const alice = await newUser('alice@example.com');
const bob = await newUser('Bob.Smith+shop@example.com');
const carol = await newUser('carol@example.com');
const dupe = await newUser('alice@other.com');

const profiles = await db.query(`select id, username, display_name, role from public.profiles order by created_at`);
assert.equal(profiles.rows.length, 4);
assert.equal(profiles.rows.find((p) => p.id === bob).username, 'bob.smithshop');
assert.equal(profiles.rows.find((p) => p.id === dupe).username, 'alice1');
ok('sign-up creates a profile with a unique username from the email');

await as('superuser', `update public.profiles set role = 'admin' where id = $1`, [alice]);
assert.equal((await db.query(`select role from public.profiles where id = $1`, [alice])).rows[0].role, 'admin');
ok('SQL editor can bootstrap the first admin');

await as(bob, `update public.profiles set role = 'admin', verified = true, display_name = 'Bob' where id = $1`, [bob]);
const bobRow = (await db.query(`select role, verified, display_name from public.profiles where id = $1`, [bob])).rows[0];
assert.deepEqual([bobRow.role, bobRow.verified, bobRow.display_name], ['user', false, 'Bob']);
ok('users can edit their profile but not promote or verify themselves');

const touched = await as(carol, `update public.profiles set display_name = 'hacked' where id = $1 returning id`, [bob]);
assert.equal(touched.length, 0);
ok("users can't edit someone else's profile");

await as(alice, `update public.profiles set verified = true where id = $1`, [carol]);
assert.equal((await db.query(`select verified from public.profiles where id = $1`, [carol])).rows[0].verified, true);
ok('admins can verify sellers');

assert.equal((await as('anon', `select username from public.profiles`)).length, 4);
ok('seller profiles are publicly readable');

console.log('\nCreating listings');
await fails(bob, `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'x-1','Some tee','Clothing',100,'M','Good')`, [bob], /Messenger username or phone/);
ok('listing requires a Messenger username or phone on the profile');

await as(bob, `update public.profiles set messenger = 'bob.smith' where id = $1`, [bob]);
await as(carol, `update public.profiles set phone = '+63 917 555 0101' where id = $1`, [carol]);

const [b1] = await insertListing(bob, listing('bob-tee', { status: 'available', featured: true }));
assert.equal(b1.status, 'pending');
assert.equal(b1.featured, false);
ok('unverified seller: new listing is forced to pending, cannot self-feature');

const [spoof] = await as(bob, `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'not-mine','Fake','Clothing',100,'M','Good') returning seller_id`, [carol]);
assert.equal(spoof.seller_id, bob);
await as(bob, `delete from public.listings where slug = 'not-mine'`);
ok("can't create a listing on someone else's behalf (seller is always the signed-in user)");

const [c1] = await insertListing(carol, listing('carol-runner', { title: 'Retro Runner', category: 'Shoes', size: 'US 9' }));
assert.equal(c1.status, 'available');
ok('verified seller: listing goes live immediately');

await fails('anon', `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'anon-1','Anon','Clothing',100,'M','Good')`, [bob], /row-level security/);
ok("anonymous visitors can't create listings");

await fails(bob, `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'bad-price','Tee tee','Clothing',-5,'M','Good')`, [bob], /check constraint/);
ok('invalid data is rejected by constraints (e.g. negative price)');

const [perfume] = await insertListing(carol, listing('carol-perfume', { title: 'Eau de Parfum', category: 'Fragrance', size: '' }));
const [other] = await insertListing(carol, listing('carol-bag', { title: 'Canvas Tote', category: 'Others', size: '' }));
assert.ok(perfume.id && other.id);
await as(carol, `delete from public.listings where slug in ('carol-perfume', 'carol-bag')`);
ok('Fragrance and Others listings can be created without a size');

await fails(bob, `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'no-size','Some tee','Clothing',100,'','Good')`, [bob], /check constraint/);
await fails(bob, `insert into public.listings (seller_id, slug, title, category, price, size, condition) values ($1,'bad-cat','Some thing','Gadgets',100,'','Good')`, [bob], /check constraint/);
ok('clothing and shoes still require a size; unknown categories are rejected');

console.log('\nVisibility');
let visible = await as('anon', `select slug from public.listings order by slug`);
assert.deepEqual(visible.map((r) => r.slug), ['carol-runner']);
ok('anonymous visitors see only live listings (pending hidden)');

visible = await as(bob, `select slug from public.listings order by slug`);
assert.deepEqual(visible.map((r) => r.slug), ['bob-tee', 'carol-runner']);
ok('sellers also see their own pending listings');

visible = await as(carol, `select slug from public.listings where status = 'pending'`);
assert.equal(visible.length, 0);
ok("sellers can't see other sellers' pending listings");

visible = await as(alice, `select slug from public.listings order by slug`);
assert.equal(visible.length, 2);
ok('admins see everything, including the review queue');

console.log('\nSeller updates');
await as(bob, `update public.listings set status = 'available' where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'pending');
ok("sellers can't approve their own pending listing");

await as(alice, `update public.listings set status = 'available' where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'available');
assert.equal((await as('anon', `select count(*)::int as n from public.listings where id = $1`, [b1.id]))[0].n, 1);
ok('admin approval makes the listing public');

await as(bob, `update public.listings set price = 550 where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'available');
ok('price changes stay live');

await as(bob, `update public.listings set title = 'Totally different item' where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'pending');
ok('unverified seller changing the title sends a live listing back to review');

await as(carol, `update public.listings set title = 'Retro Runner (cleaned)' where id = $1`, [c1.id]);
assert.equal((await statusOf(c1.id)).status, 'available');
ok('verified sellers can edit without re-review');

await as(alice, `update public.listings set status = 'available' where id = $1`, [b1.id]);
await as(bob, `update public.listings set status = 'reserved' where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'reserved');
await as(bob, `update public.listings set status = 'sold' where id = $1`, [b1.id]);
assert.equal((await statusOf(b1.id)).status, 'sold');
ok('sellers can mark their own listing reserved → sold');

await as(bob, `update public.listings set featured = true, status = 'hidden' where id = $1`, [b1.id]);
const afterHack = (await db.query(`select featured, status from public.listings where id = $1`, [b1.id])).rows[0];
assert.deepEqual([afterHack.featured, afterHack.status], [false, 'sold']);
ok("sellers can't feature listings or set admin-only statuses");

const stolen = await as(carol, `update public.listings set price = 1 where id = $1 returning id`, [b1.id]);
assert.equal(stolen.length, 0);
const deleted = await as(carol, `delete from public.listings where id = $1 returning id`, [b1.id]);
assert.equal(deleted.length, 0);
ok("sellers can't edit or delete other sellers' listings");

console.log('\nModeration');
const [b2] = await insertListing(bob, listing('bob-jacket', { title: 'Zip Track Jacket' }));
await as(alice, `update public.listings set status = 'rejected', review_note = 'Please add a photo of the tag.' where id = $1`, [b2.id]);
assert.deepEqual(await statusOf(b2.id), { status: 'rejected', review_note: 'Please add a photo of the tag.' });
await as(bob, `update public.listings set description = 'Added tag photo' where id = $1`, [b2.id]);
assert.deepEqual(await statusOf(b2.id), { status: 'pending', review_note: null });
ok('rejected listing: seller edits resubmit it for review');

await as(alice, `update public.listings set status = 'hidden' where id = $1`, [c1.id]);
await as(carol, `update public.listings set status = 'available' where id = $1`, [c1.id]);
assert.equal((await statusOf(c1.id)).status, 'hidden');
assert.equal((await as('anon', `select count(*)::int as n from public.listings where id = $1`, [c1.id]))[0].n, 0);
ok('admin-hidden listings stay hidden and disappear from the public');

await as(alice, `update public.listings set featured = true where id = $1`, [b2.id]);
assert.equal((await db.query(`select featured from public.listings where id = $1`, [b2.id])).rows[0].featured, true);
ok('admins can feature listings');

const own = await as(bob, `delete from public.listings where id = $1 returning id`, [b2.id]);
assert.equal(own.length, 1);
ok('sellers can delete their own listings');

const nos = (await db.query(`select catalog_no from public.listings order by catalog_no`)).rows.map((r) => Number(r.catalog_no));
assert.ok(nos.every((n, i) => i === 0 || n > nos[i - 1]));
ok('catalogue numbers are assigned automatically and never reused');

console.log('\nSeed');
try {
  const seed = await readFile(new URL('../seed.sql', import.meta.url), 'utf8');
  const before = (await db.query(`select count(*)::int as n from public.listings`)).rows[0].n;
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await db.exec(seed);
  await db.exec(seed); // re-running must not duplicate
  const rows = (await db.query(`select l.slug, p.role from public.listings l join public.profiles p on p.id = l.seller_id where l.slug = 'washed-boxy-tee'`)).rows;
  const after = (await db.query(`select count(*)::int as n from public.listings`)).rows[0].n;
  assert.equal(rows[0]?.role, 'admin');
  assert.ok(after > before);
  ok(`seed.sql imports the Markdown archive as admin listings (+${after - before}), and is safe to re-run`);
} catch (e) {
  if (e.code === 'ENOENT') console.log('  – skipped (run `npm run seed:export` first)');
  else throw e;
}

console.log(`\n${passed} checks passed.\n`);
