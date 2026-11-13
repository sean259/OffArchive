# OFFARCHIVE. Roadmap

The guiding rule: **stay a fast, simple, Messenger-first archive until the volume forces a change.** Feature phases are triggered by real need, not by the calendar. The **engineering tracks** (security, reliability, quality) are different: they're the floor the site stands on, and each has a "before launch" line that isn't optional.

Legend: ✅ done · 🔨 to build (code) · 🧑 needs you (content, accounts, decisions) · ⏳ later / when triggered
Priority: **P0** blocks public launch · **P1** within the first month live · **P2** when there's time or demand

---

## At a glance

| Track | State today | Next milestone |
|-------|-------------|----------------|
| Product: archive | ✅ Built (v0.2–v0.3) | Real photos and copy (Phase 1) |
| Product: marketplace | ✅ Built (v0.4), not yet live | Connect Supabase, first outside seller |
| Security | 🟡 Strong data layer (RLS + triggers + CSRF origin check). Edge hardening missing | CSP and security headers, rate limits, abuse reporting |
| Error handling | 🟡 API validates input and returns clean errors. No error page, no error tracking | 500 page, Sentry, graceful Supabase-down mode |
| Testing and CI | 🟡 30 database rule tests, type checking | GitHub Actions on every push to `dev` |
| Performance | ✅ Good base (optimized images, self-hosted fonts, small JS) | Performance budget enforced in CI |
| Accessibility | ✅ Good base | Audit with a screen reader on a real phone |
| Legal and privacy | 🔴 Not started | Privacy notice and terms (P0 before strangers sign up) |
| Operations | 🟡 Deploy config ready | Backups, uptime monitor, runbook |

---

# Part A: Product phases

## ✅ Phase 0: Foundation (v0.2)

Rebuilt from a single HTML file into an Astro + TypeScript project.

- Items as validated content with a typed schema (`src/content.config.ts`)
- Shareable item pages at `/items/<slug>/` with gallery, measurements, flaws, and fit notes
- Messenger CTA that copies a pre-filled message with the item link
- Category filter, sort, grid / list view, URL-synced filters
- How to buy page: condition guide, FAQ, payment and shipping copy
- SEO: Open Graph, Product and Store structured data, sitemap, robots.txt, canonical URLs
- Light and dark mode. Accessibility: native `<dialog>`s, skip link, focus states, reduced motion
- Self-hosted fonts and build-time image optimization
- Editorial redesign: Instrument Serif, bone / ink / rust palette, catalogue numbers, Saved list, hover previews

## ✅ Phase 2: Make updates painless (v0.3)

- ✅ Photo workflow: `npm run photos` auto-rotates, smart-crops to 4:5, compresses, and strips EXIF/GPS
- ✅ "Just dropped" rail, measured from the newest listing so it needs no daily rebuild
- ✅ Released page (`/released/`): sold pieces as a trust record
- ✅ Fit finder: height + weight (+ preference) → suggested size, saved on the device
- ✅ Placeholder sample photos (`npm run sample-photos`, remove with `-- --remove`)
- ✅ In-site Sell form and admin dashboard replace the old Keystatic editor, and both work from a phone

## ✅ Phase 3: Grow the audience

- ✅ Drop notifications via Messenger. Set `site.ts → newsletter` to a Buttondown username for an email form
- ✅ Search palette (`/` or Ctrl/⌘+K)
- ✅ Vouches section. 🧑 Use only quotes you have permission to share
- ✅ Per-item share cards (`/og/items/<slug>.png`)
- ✅ Size guide with measuring diagrams and a sneaker chart
- 🧑 Instagram link: `site.ts → instagram`

## ✅ Phase 3½: Community marketplace (v0.4)

- ✅ Email sign-in (6-digit code or magic link, no passwords)
- ✅ Roles: visitor / seller / admin, enforced by row-level security and triggers (`npm run test:db`)
- ✅ Seller profiles and public seller pages
- ✅ Sell form with in-browser photo compression, type-aware measurements, edit and delete
- ✅ Moderation: review queue, reject with a note, resubmit, hide, feature. Verified sellers skip review
- ✅ Buyers contact sellers directly, with safety tips on community listings
- ✅ Your own pieces highlighted as ✳ OFFARCHIVE. picks

---

## Phase 1: Launch ← **you are here**

**Goal:** a live site you're comfortable sharing on your Facebook page and stories.
**Done when:** the site is live on a real domain, every P0 below is ✅, and one sale has come through the site.

| # | Task | Pri | Status | Notes |
|---|------|-----|--------|-------|
| 1 | Connect Supabase | P0 | 🧑 | Keys in `.env`, `npm run db:login` → `db:link` → `db:push`, auth URLs. `npm run db:check` must be all ✓. See [docs/SUPABASE.md](docs/SUPABASE.md) |
| 2 | Custom email sender (SMTP via Resend) | P0 | 🧑 | Supabase's built-in email is capped at a few per hour and lands in spam |
| 3 | Make yourself admin, import your items | P0 | 🧑 | `supabase/seed.sql` after your first login |
| 4 | Photograph current stock, replace sample photos | P0 | 🧑 | Front, back, tag, flaws (4–6 each). Then run `npm run sample-photos -- --remove` |
| 5 | Measurements on every clothing item | P0 | 🧑 | Edit page → Measurements |
| 6 | Fill in `src/config/site.ts` | P0 | 🧑 | Real Messenger username, domain, `url` |
| 7 | Rewrite placeholder copy | P1 | 🧑 | Search the project for `TODO` |
| 8 | Hero and about photos | P1 | 🧑 | See TODO in `About.astro` |
| 9 | Deploy to Cloudflare Workers, set env vars there | P0 | 🧑 | Import the repo (Workers & Pages → Create → Import a repository), production branch `main`, add the two `PUBLIC_SUPABASE_*` variables under Settings → Builds → Variables and secrets |
| 10 | Domain + update Supabase auth URLs to it | P1 | 🧑 | e.g. `offarchive.shop`. Add `https://<domain>/auth/callback/**` to the Supabase redirect URLs |
| 11 | Analytics | P1 | 🧑 | Paste a Cloudflare token or Plausible domain into `site.ts → analytics` |
| 12 | **Security, error handling and legal P0s** | P0 | 🔨 | See Part B, all lines marked P0 |
| 13 | Real-phone test pass | P0 | 🧑 | Run the launch checklist at the bottom of this file |

---

## Phase 3¾: Marketplace trust and safety (first month live)

The marketplace lets strangers post and contact each other, so these come before any new features.

| Task | Pri | Notes |
|------|-----|-------|
| 🔨 **Report a listing** | P0 | "Report" on item pages (scam, stolen photos, prohibited item, wrong info). A `reports` table with RLS and an admin queue tab. Auto-hide after N reports from different accounts |
| 🔨 **Email notifications** | P1 | Seller: approved / needs changes. Admin: new listing waiting. Sent from a Supabase Edge Function or database webhook, never from the browser |
| 🔨 **Ban / suspend a user** | P1 | `profiles.status = suspended` blocks new listings and hides existing ones (enforced in RLS, not only in the UI) |
| 🔨 **Prohibited items policy** | P1 | Counterfeits, weapons and similar items. Linked from the Sell form with a checkbox to agree |
| 🔨 **Admin audit log** | P1 | Every approve, reject, hide, verify and role change is recorded with who, what and when (table written by trigger) |
| 🔨 **Listing limits for new sellers** | P2 | e.g. max 5 pending listings until verified, which slows spam floods |
| ⏳ Duplicate or stolen photo detection | P2 | Perceptual hash on upload, flag matches in the queue |
| ⏳ Seller ratings after a completed sale | P2 | Only buyer–seller pairs that were marked as a sale can rate |
| ⏳ Size and price filters, saved searches | P2 | At around 30+ live items |

---

## ⏳ Phase 4: Real checkout (only if volume demands it)

**Trigger:** more than ~20 orders a month, and Messenger back-and-forth is the bottleneck.

- Hold a piece while a buyer pays (row lock + `reserved_until`), so two buyers can't both buy a one-of-one
- 24h reservation timer that auto-releases (scheduled job)
- Payments via PayMongo or Xendit (GCash, Maya, cards). **Webhooks verified by signature** and handled idempotently (the same event twice never double-sells)
- Shipping: address at checkout, flat-rate tiers (Cebu / Visayas / Luzon / Mindanao), J&T or LBC tracking
- Orders dashboard: orders, reservations, revenue, refunds
- Never store card data. The payment provider's hosted page keeps you out of PCI scope
- Legal: terms of sale, refund policy, DTI registration, BIR receipts if required

## 🔭 Ideas parking lot

Consignment · bundles ("buy 2, save ₱100") · lookbook pages per drop · meetup scheduler · "notify me when my size drops" · seller analytics (views, saves) · PWA install with offline Saved list

---

# Part B: Engineering tracks

## 1. Security

**Already in place**
- ✅ Row-level security on every table, so the database itself enforces who can read and write what
- ✅ Triggers that can't be bypassed from the browser: sellers can't approve their own listings, change their own role, spoof `seller_id`, or skip re-review after editing
- ✅ Photo storage: users can only write inside their own folder
- ✅ Only the public anon key reaches the browser. `npm run db:check` refuses a service_role key
- ✅ CSRF: Astro `checkOrigin` rejects cross-site form posts
- ✅ Input validation with Zod on every API route. Safe redirect handling (`safeNext`) blocks open redirects
- ✅ Passwordless login, so there are no passwords to leak or reuse
- ✅ EXIF/GPS stripped from photos (owner tool, and re-encoded in the browser for sellers)
- ✅ `.env` is git-ignored

**To do**

| Task | Pri | Details |
|------|-----|---------|
| ✅ **Upgrade Astro 5 → 7, sharp, adapters** | P0 | Done: Astro 7.4, sharp 0.35, Cloudflare adapter 14, TypeScript 6 |
| ✅ Security headers | P0 | In `public/_headers` / middleware: `Content-Security-Policy` (self + Supabase URL + analytics only), `Strict-Transport-Security`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Permissions-Policy` (camera, mic and geolocation off). Test with securityheaders.com |
| ✅ Rate limiting | P0 | Supabase Auth limits OTP emails per hour (set it in the dashboard). Add per-IP / per-user limits on `/api/listings` and `/api/profile` (in-app limiter done; add a free Cloudflare WAF rate-limiting rule for `/api/auth/*` once live) |
| ✅ Upload validation on the server side | P0 | Storage bucket: limit size (e.g. 5 MB) and MIME types (`image/jpeg`, `image/webp`, `image/png`) in the bucket settings, not just in the browser |
| 🔨 Escape user content everywhere | P0 | Audit that descriptions and usernames are never rendered with `set:html`. Validate Messenger, Instagram and phone formats so a contact link can't be `javascript:` |
| 🧑 Account security | P0 | 2FA on GitHub, Supabase, Cloudflare, domain registrar and email. These accounts are the real keys to the site |
| 🔨 Dependency scanning | P1 | GitHub Dependabot + `npm audit` in CI |
| 🔨 Secret scanning | P1 | Turn on GitHub secret scanning + push protection |
| 🔨 Session hygiene | P1 | "Log out everywhere" on the account page. Session lifetime and refresh-token rotation (Supabase Auth settings) |
| 🔨 CAPTCHA on login | P2 | Cloudflare Turnstile via Supabase Auth if bots start spamming sign-ups |
| 🔨 Content moderation on images | P2 | Flag NSFW uploads before they reach the review queue |
| 🔨 Security review before Phase 4 | P2 | Re-test the RLS rules, webhooks and reservation races before any money flows |

**Rules that never change:** the service_role key never goes in the site or `.env`. Every permission is enforced in the database (RLS), and the UI only hides buttons. All user input is untrusted.

## 2. Error handling and resilience

**Already in place**
- ✅ API routes return consistent JSON errors (`fail()`) with readable messages from Zod (`firstIssue`)
- ✅ Branded 404 page
- ✅ Site still works with no database configured (falls back to Markdown items)
- ✅ Storage cleanup when a listing is deleted

**To do**

| Task | Pri | Details |
|------|-----|---------|
| ✅ Branded 500 page | P0 | `src/pages/500.astro`: friendly message, a "Message us on Messenger" link, and no stack traces shown to visitors |
| ✅ Supabase-down mode | P0 | If the database is unreachable, the shop shows the last cached items with a quiet banner instead of crashing. Login and sell show "temporarily unavailable" |
| ✅ Timeouts on every database call | P1 | Abort after ~8s so a slow database can't hang page renders |
| 🔨 Form error UX | P0 | Every form keeps what the user typed on error, puts the message beside the field, and announces it to screen readers (`aria-live`) |
| 🔨 Upload failure recovery | P1 | Retry failed photo uploads, show per-photo progress and errors, and remove orphaned files if the listing save fails |
| 🔨 Expired-session handling | P1 | When a session expires mid-form, keep the draft locally, send the user to log in, and bring them back to the form |
| 🔨 Offline / network errors | P1 | Toasts for "You're offline" and "Couldn't save, try again" instead of silent failures |
| 🔨 Error tracking | P1 | Sentry (free tier) on server and browser, with emails, tokens and cookies scrubbed before sending |
| 🔨 Structured server logs | P2 | One log line per request with route, status and duration, and no personal data |
| 🔨 Orphaned-photo cleanup job | P2 | Weekly: delete storage files no listing references |

## 3. Testing and quality

**Already in place**
- ✅ 30 database rule tests against real Postgres (`npm run test:db`)
- ✅ Type checking on every build (`astro check`)

**To do**

| Task | Pri | Details |
|------|-----|---------|
| ✅ CI on GitHub Actions | P0 | On every push to `dev` and every PR to `main`: install → `astro check` → `test:db` → build. `main` is protected and only merges when CI is green |
| 🔨 Unit tests (Vitest) | P1 | `fit.ts`, `api.ts` validators, `slugify`, `items.ts` mapping, `format.ts` |
| 🔨 API route tests | P1 | Auth required, wrong owner rejected, bad input → 400, CSRF rejected |
| 🔨 End-to-end tests (Playwright) | P1 | Browse → item → Messenger CTA. Log in → sell → admin approve → listing live. Mobile viewport too |
| 🔨 Visual regression | P2 | Screenshot key pages in light and dark mode to catch design breakage |
| 🔨 Lint + format | P2 | ESLint + Prettier, run in CI |
| 🔨 Staging environment | P1 | Cloudflare preview deployments for `dev` against a separate Supabase project (free tier), so tests never touch real data |

## 4. Performance

**Already in place:** optimized and lazy-loaded images, self-hosted fonts, minimal JS, immutable caching for assets, prerendered static pages, and a 5s item cache.

| Task | Pri | Details |
|------|-----|---------|
| 🔨 Performance budget | P1 | Lighthouse CI: Performance ≥ 90 on mobile, LCP < 2.5s, CLS < 0.1. CI fails if a change breaks the budget |
| 🔨 CDN caching for public pages | P1 | `Cache-Control: s-maxage=60, stale-while-revalidate` on shop and item pages for logged-out visitors |
| 🔨 Supabase image transforms | P2 | Serve thumbnails at grid size instead of full 1600px photos |
| 🔨 Database indexes | P1 | Index `listings(status, listed_at)`, `listings(seller_id)` and `listings(slug)`. Check with `explain` once there are 100+ rows |
| 🔨 Pagination | P2 | At ~60+ live items, use "load more" on the shop and admin lists |

## 5. Accessibility

**Already in place:** semantic HTML, native dialogs, skip link, visible focus, reduced-motion support, and the custom cursor and smooth scroll turned off on touch.

| Task | Pri | Details |
|------|-----|---------|
| 🔨 Automated a11y checks | P1 | axe in the Playwright tests. Zero serious violations |
| 🧑 Manual pass | P1 | TalkBack (Android) or VoiceOver (iPhone) through browse → item → contact, and through login → sell |
| 🔨 Colour contrast audit | P1 | All text meets WCAG AA in both themes, especially rust on bone |
| 🔨 Alt text for seller photos | P2 | Sell form asks for a short description per photo, defaulting to title + view |

## 6. Privacy and legal (Philippines)

| Task | Pri | Details |
|------|-----|---------|
| 🔨🧑 Privacy notice | P0 | Required under the Data Privacy Act of 2012 once you collect emails. Cover what's collected (email, profile, contact handles), why, who can see it, how long it's kept, and how to delete it |
| 🔨🧑 Terms of use + seller rules | P0 | OFFARCHIVE. is a venue, buyers and sellers deal directly, prohibited items, and moderation rights |
| 🔨 Delete my account | P1 | Self-serve from the account page: removes profile, listings and photos (database function + storage cleanup) |
| 🔨 Download my data | P2 | Account page export as JSON |
| 🔨 Cookie note | P1 | Only essential auth cookies + cookieless analytics, so a short notice is enough and no consent banner is needed. Keep it that way |
| 🧑 DTI business name | P2 | When sales become regular |

## 7. Operations and monitoring

| Task | Pri | Details |
|------|-----|---------|
| 🔨 Uptime monitor | P1 | UptimeRobot / Better Stack free tier pinging `/` and a `/api/health` route that checks the database |
| ✅🧑 Backups | P0 | **Built:** `.github/workflows/backup.yml` (weekly, encrypted, kept 90 days). **You:** add the `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` secrets on GitHub, then press "Run workflow" once to test. Originally: Supabase free tier has no point-in-time restore. Run a weekly `supabase db dump` (scripted) + bucket export, stored off-site |
| 🔨 Runbook | P1 | `docs/RUNBOOK.md` covering site down, database down, spam wave, leaked key (rotate in Supabase, redeploy), bad deploy (Cloudflare → Deployments → roll back) |
| 🔨 Migration discipline | P0 | Every database change is a new file in `supabase/migrations/`, tested with `test:db`, and pushed to staging before production. Never edit production tables by hand |
| 🧑 Supabase free-tier pause | P1 | Free projects pause after 7 days of no activity. The uptime monitor's health check keeps it awake |
| 🔨 Release process | P1 | Work on `dev`, deploy preview, CI green, merge to `main`, auto-deploy. Tag versions (`v0.5.0`) with a CHANGELOG entry |

## 8. Admin and analytics

| Task | Pri | Details |
|------|-----|---------|
| 🔨 Admin stats | P2 | Live / pending / sold counts, new sellers this week, average approval time |
| 🔨 Messenger-click tracking per listing | P2 | Which items get interest but don't sell |
| 🔨 Bulk actions in the queue | P2 | Approve or reject several listings at once |

---

# Part C: Suggested build order

1. **Now:** connect Supabase (Phase 1 #1–3) and set up CI.
2. **Before launch (P0 code):** security headers and CSP, rate limits, bucket size and type limits, contact-link validation, 500 page, Supabase-down mode, form error UX, privacy notice and terms, and a backup script.
3. **Launch:** deploy, domain, real photos, then run the launch checklist.
4. **First month:** report a listing, email notifications, ban user, audit log, Sentry, uptime monitor and health check, delete account, unit and end-to-end tests, staging.
5. **When triggered:** filters and pagination (~30–60 items), ratings, Phase 4 checkout (~20 orders a month).

---

# Launch checklist

Run on a real phone, on mobile data, logged out and then logged in.

- [ ] `npm run db:check` all ✓ against production
- [ ] Cloudflare build variables set; `PUBLIC_SUPABASE_URL` points at the production project
- [ ] Supabase Site URL and redirect URLs use the real domain; login email arrives within a minute and isn't in spam
- [ ] Sign up as a fresh test account → create listing → it shows "pending" → approve as admin → it appears in the shop
- [ ] Test account can't see the admin pages or edit another seller's listing
- [ ] Share an item link in Messenger: preview card shows photo, title, price
- [ ] Messenger / contact buttons open the right person
- [ ] 404 and 500 pages look right
- [ ] securityheaders.com grade A; Lighthouse mobile ≥ 90
- [ ] Privacy notice and terms linked in the footer and on the login page
- [ ] Backup ran at least once and you've checked the file opens
- [ ] 2FA on every account that controls the site
- [ ] Sample photos removed; no `TODO` left in visible copy

---

## Tech decisions log

| Decision | Why | Revisit when |
|----------|-----|--------------|
| **Astro, server-rendered** (was static) | Listings, logins and moderation must be live. Static pages are still prerendered. | — |
| **Cloudflare Workers** hosting (was Netlify) | Unlimited bandwidth and 100k requests/day free, servers in Manila and Cebu, built-in firewall and rate-limit rules, first-class Astro support. Static pages and the share image are still built with Node. | If you need long-running server jobs (use a Supabase Edge Function instead) |
| **Supabase** (Postgres + Auth + Storage) | One service for email sign-in, data and photos. RLS puts the marketplace rules in the database itself. Free tier, Singapore region, real Postgres (no lock-in). | If you need features Postgres can't do (unlikely) |
| **Permissions in the database, not the UI** | A bug in a page can't leak data or let someone approve their own listing. Tested with real Postgres. | Never |
| **Admin-approves-first moderation** | Protects the curated feel and buyers. Verified sellers skip the queue. | If the queue gets too long for one person: add more admins |
| **Passwordless email login** | No passwords to store, leak or reset. | If users ask for Google / Facebook login (Supabase supports both) |
| **Markdown items as fallback/seed** | Site runs without a database for design work and demos. | Can be removed once Supabase is live |
| **Keystatic** (removed in v0.4) | Replaced by the in-site Sell form and admin dashboard. | — |
| **Messenger checkout** over a cart | It's how buyers in PH already buy pre-loved items. Builds trust, costs nothing. | More than ~20 orders a month |
| **`dev` → `main` branch flow** | `main` is always what's live; work is checked on `dev` first. | — |
| **Vanilla CSS with tokens** over Tailwind | Tight token system, scoped component styles. | If a second designer/dev joins |
| **Lenis smooth scroll + custom cursor** | Premium feel on desktop. Off for touch and reduced-motion users. | If analytics show it hurts engagement |
| **Build-time OG images (Satori)** | Every link shared in Messenger gets a branded preview. | Never |
| **Cookieless analytics** (Cloudflare / Plausible) | No consent banner needed, and it respects visitors. | — |
