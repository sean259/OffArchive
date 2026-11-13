# Switching on accounts (Supabase)

OFFARCHIVE. uses [Supabase](https://supabase.com) for sign-in, the listings database and photo storage. Until you finish these steps, the site keeps working read-only from the Markdown files in `src/content/items`.

Expect about 20–30 minutes. Everything here fits in Supabase's free tier.

---

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) → **New project**.
2. **Region:** Southeast Asia (Singapore), the closest to the Philippines.
3. Save the database password somewhere safe. You won't need it day to day.

## 2. Create the tables and security rules

**SQL Editor → New query.** Paste and run each file, in order:

1. [`supabase/migrations/0001_marketplace.sql`](../supabase/migrations/0001_marketplace.sql): profiles, listings, roles, row-level security
2. [`supabase/migrations/0002_storage.sql`](../supabase/migrations/0002_storage.sql): the `listing-images` photo bucket and its rules

Each should end with "Success. No rows returned".

> The security rules are tested: `npm run test:db` runs 30 checks against the same SQL (sellers can't publish or feature their own listings, can't touch other people's, visitors only see approved pieces, and so on).

## 3. Sign-in settings

**Authentication → Sign In / Providers → Email:** make sure Email is enabled.

**Authentication → URL Configuration:**

| Setting | Value |
|---|---|
| Site URL | `https://your-domain` (or `http://localhost:4321` while testing) |
| Redirect URLs | `http://localhost:4321/auth/callback/**` and `https://your-domain/auth/callback/**` |

**Authentication → Emails → Templates → Magic Link:** include the code so people can type it in. That's the most reliable option on phones, where links often open in a different browser. Paste this:

```html
<h2>Your OFFARCHIVE. sign-in code</h2>
<p style="font-size:32px;letter-spacing:6px;font-family:monospace"><strong>{{ .Token }}</strong></p>
<p>Enter this code on the sign-in page. It expires in 1 hour.</p>
<p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on this device.</p>
<p style="color:#888">If you didn't request this, you can ignore this email.</p>
```

Use the same content for the **Confirm signup** template (first-time sign-ins use it).

## 4. Email delivery (required for real users)

Supabase's built-in email only delivers to members of your Supabase team, and only a few emails per hour. That's fine for testing with your own address, but customers won't get their codes. Before launch, connect a free SMTP provider:

1. Create a free [Resend](https://resend.com) account (3,000 emails/month free) and verify your domain, or use any SMTP service.
2. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**
   - Host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key
   - Sender: `OFFARCHIVE. <login@your-domain>`
3. **Authentication → Rate Limits:** raise "emails per hour" to something like 30–100.

## 5. Connect the website

**Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.

Locally, copy `.env.example` to `.env` and fill it in:

```bash
PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # or sb_publishable_...
```

Restart `npm run dev`. Both values are safe in the browser, because the database rules decide what each person can do. **Never** put the `service_role` / secret key in `.env` or anywhere in the site.

On **Netlify**: Site configuration → **Environment variables**, add the same two variables, then redeploy.

## 6. Make yourself admin

1. Open the site → **Log in** → enter your email → type the code. This creates your account.
2. Supabase → **SQL Editor**, run (with your email):

```sql
update public.profiles
set role = 'admin', display_name = 'OFFARCHIVE.', username = 'offarchive'
where id = (select id from auth.users where email = 'you@example.com');
```

3. Refresh the site. Your avatar now links to **/admin**.

## 7. Bring your existing items over

```bash
npm run seed:export        # writes supabase/seed.sql from src/content/items
```

Paste `supabase/seed.sql` into the SQL Editor and run it. Your pieces become OFFARCHIVE. listings (with the ✳ pick badge). It's safe to re-run, because existing slugs are skipped. Photos from `src/assets` aren't uploaded automatically: open each listing's **Edit** page to add them.

From now on, add and edit pieces from **Sell** / **My listings** on the site (works on your phone). The Markdown files are only a fallback.

---

## Day to day

| Task | Where |
|---|---|
| Approve / reject new listings | **/admin** → Review queue |
| Hide or feature a listing | **/admin** → All listings |
| Let a trusted seller skip review | **/admin** → Sellers → **Verify** |
| Add another admin | **/admin** → Sellers → **Make admin** |
| Mark your own piece sold | **My listings** → status dropdown |
| Look at raw data, backups | Supabase dashboard → Table Editor / Database → Backups |

## Troubleshooting

- **"Accounts aren't switched on yet":** the two env variables are missing. Restart the dev server or redeploy after adding them.
- **No email arrives:** check spam; until step 4 is done, only your Supabase team's addresses receive mail.
- **"That sign-in link has expired or was opened in a different browser":** use the 6-digit code instead (step 3 template).
- **"Add a Messenger username or phone number…":** sellers need a contact method before listing (the database enforces it).
- **Photo upload fails:** the bucket from `0002_storage.sql` is missing, or the file isn't JPG/PNG/WebP.
