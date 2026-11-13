# OFFARCHIVE.

> Curated. Collected. Released. A curated pre-loved marketplace for clothing, footwear, and everyday essentials, based in Cebu, Philippines.

Anyone can sign up with their email and list pieces to sell. Admins review every new listing before it goes live. Buyers contact sellers directly on Messenger or by text, so there's no cart and no fees.

**Stack:** [Astro](https://astro.build) (server-rendered, TypeScript) · [Supabase](https://supabase.com) (Postgres, email sign-in, photo storage, row-level security) · Netlify.

## Quick start

```bash
npm install
cp .env.example .env   # add your Supabase URL + anon key (see docs/SUPABASE.md)
npm run dev            # http://localhost:4321
```

Without the `.env` values the site still runs, read-only, from the Markdown files in `src/content/items`. That's handy for design work. Accounts, selling and admin switch on as soon as Supabase is connected. **Setup guide: [docs/SUPABASE.md](docs/SUPABASE.md).**

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Run the production build locally |
| `npm run test:db` | Run the database security tests (30 checks, no Supabase account needed) |
| `npm run seed:export` | Turn the Markdown items into `supabase/seed.sql` for the one-time import |
| `npm run photos` | Batch-prepare photos for Markdown items (optional) |

Requires Node 18.20+ (Node 22 recommended). On Windows PowerShell, if `npm` is blocked, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Who can do what

| | Visitor | Seller (signed in) | Admin |
|---|---|---|---|
| Browse, search, save, fit finder | ✓ | ✓ | ✓ |
| Create listings (photos, details, measurements) | | ✓ needs Messenger or phone on profile | ✓ |
| New listing goes live | | after admin approval (instantly if **verified**) | instantly |
| Mark own piece reserved / sold, edit, delete | | ✓ own only | ✓ any |
| Approve, reject (with a note), hide, feature | | | ✓ |
| Verify sellers, make admins | | | ✓ |

These rules are enforced **in the database** (row-level security and triggers in `supabase/migrations`), not just in the UI. `npm run test:db` proves them.

## Using the marketplace

- **Sell:** **Sell** button → log in with email (6-digit code) → add contact details → add photos, details, measurements → submit.
- **Manage:** **My listings** shows each listing's status (In review, Live, Needs changes with the admin's note, Sold), lets you change the status in one tap, and has edit and delete.
- **Moderate:** **/admin** → Review queue: Approve, or Reject with a reason (the seller sees it and can fix & resubmit). All listings: hide, feature, edit. Sellers: verify trusted sellers so they skip the queue.
- Your own pieces (any admin's) carry the **✳ OFFARCHIVE.** badge. Community pieces show **@username**, with ✓ if verified.

## Project structure

```
offarchive/
├── supabase/
│   ├── migrations/          ← Database schema + security rules (run in Supabase SQL editor)
│   ├── tests/rls.test.mjs   Security tests (PGlite, runs offline)
│   └── seed.sql             Generated import of the Markdown archive
├── src/
│   ├── config/site.ts       ← Brand, Messenger, domain, analytics, newsletter, nav
│   ├── middleware.ts        Session + route guards (/account, /sell, /admin)
│   ├── lib/
│   │   ├── items.ts         Data layer: one Item shape from Supabase or Markdown
│   │   ├── supabase.ts      Supabase clients (public + per-request)
│   │   ├── api.ts           Validation schemas + API helpers
│   │   └── fit.ts …         Fit finder, formatting, OG images, saved list, search catalog
│   ├── pages/
│   │   ├── index, items/[slug], sellers/[username], released, size-guide, how-to-buy
│   │   ├── login, auth/callback        Email sign-in
│   │   ├── account/, sell/             Seller area
│   │   ├── admin/                      Moderation dashboard
│   │   └── api/                        listings, profile, auth, admin endpoints
│   ├── components/          UI building blocks (.astro)
│   ├── content/items/       Markdown fallback/seed items
│   └── styles/              tokens.css (palette, fonts), global.css (shared utilities)
├── docs/SUPABASE.md         Step-by-step setup
├── netlify.toml             Deploy settings
└── ROADMAP.md
```

## Before going live

- [ ] Follow [docs/SUPABASE.md](docs/SUPABASE.md), including **custom SMTP**: Supabase's built-in email won't reach customers
- [ ] `src/config/site.ts`: `url`, `messenger`, `replyTime`, `trust`, `delivery`
- [ ] `src/pages/how-to-buy.astro`: real payment, meetup, shipping, returns, and selling rules
- [ ] Add photos to your imported listings from their Edit pages

## Branches

| Branch | Purpose |
|--------|---------|
| `dev` | Day-to-day work. Commit and push here first. |
| `main` | What's live. Only updated by merging `dev` once it builds and looks right. |

```bash
git switch dev
git add -A && git commit -m "Describe the change"
git push
npm run build                                           # make sure it builds
git switch main && git merge --ff-only dev && git push  # promote to live
git switch dev
```

## Deploying

**Netlify** (configured in `netlify.toml`): import the GitHub repo, set the production branch to `main`, and add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` under Environment variables. Pages are server-rendered by Netlify Functions (free tier is plenty to start). The adapter switches automatically: Netlify builds use `@astrojs/netlify`, local builds use `@astrojs/node`.

## Features

**Marketplace:** email sign-in (code or magic link) · seller profiles with contact details · listing form with in-browser photo compression (EXIF/GPS stripped) and type-aware measurement fields · review queue, rejection notes, hide/feature, verified sellers, multiple admins · public seller pages · owners can preview pending listings · safety tips on community listings.

**Design:** editorial "archive catalogue" look. Instrument Serif display type, bone/ink palette with a rust accent, film grain, catalogue numbers (№ 001…). Motion: smooth scroll, contextual cursor, magnetic buttons, reveals, image wipes, parallax, count-ups, a once-per-visit intro, page-to-page image morphs. All of it is off for reduced-motion users.

**Shopping:** Just dropped rail · search palette (`/` or Ctrl/⌘+K) · Saved list that sends one Messenger message per seller · filter / sort / Available only / My size · Grid & List views with hover previews · fit finder (height + weight → size, compared against each piece) · Released page · size guide · drop alerts.

**Foundations:** share images, Product/Store structured data, live sitemap, robots.txt, self-hosted fonts, private pages never cached, CSRF protection on form posts.
