# OFFARCHIVE. Roadmap

The guiding rule: **stay a fast, simple, Messenger-first archive until the volume forces a change.** Each phase is triggered by real need, not by the calendar.

Legend: ✅ done · 🧑 needs you (content, accounts, decisions) · ⏳ later

---

## ✅ Phase 0: Foundation (v0.2)

Rebuilt from a single HTML file into an Astro + TypeScript project.

- Items as validated Markdown files (schema in `src/content.config.ts`)
- Shareable item pages at `/items/<slug>/` with gallery, measurements, flaws, and fit notes
- Messenger CTA that copies a pre-filled message with the item link
- Category filter, sort, Grid / List view, URL-synced filters
- How to buy page: condition guide, FAQ, payment/shipping copy
- SEO: Open Graph, Product/Store structured data, sitemap, robots.txt, canonical URLs
- Light and dark mode, accessibility (native `<dialog>`s, skip link, focus states, reduced motion)
- Self-hosted fonts and build-time image optimization
- Editorial redesign: Instrument Serif, bone/ink/rust palette, catalogue numbers, Saved list, hover previews

---

## Phase 1: Launch

**Goal:** a live site you're comfortable sharing on your Facebook page and stories.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Photograph the current stock | 🧑 | Same background, natural light. Front, back, tag, flaws (4–6 each). Then `npm run photos` handles cropping and compression. |
| 2 | Add measurements to every clothing item | 🧑 | Use the editor at `/keystatic` → Measurements. The size guide explains how. |
| 3 | Fill in `src/config/site.ts` | 🧑 | Real Messenger username and domain. |
| 4 | Rewrite placeholder copy | 🧑 | `site.ts` (`replyTime`, `trust`, `delivery`), `how-to-buy.astro`, `HowItWorks.astro`. Search for `TODO`. |
| 5 | Replace hero and about illustrations with photos | 🧑 | Hero shows featured items automatically once they have photos. About: see the TODO in `About.astro`. |
| 6 | Default share image | ✅ | Generated at build: `/og/default.png`. |
| 7 | Push to GitHub, deploy | 🧑 / ✅ | `netlify.toml` is ready (build, caching, security headers). Connect the repo on Netlify. |
| 8 | Domain | 🧑 | e.g. `offarchive.ph` / `.shop`, or start on `*.netlify.app`. |
| 9 | Privacy-friendly analytics | ✅ | Paste a Cloudflare token or Plausible domain into `site.ts → analytics`. Plausible also logs "Messenger click" events. |
| 10 | Test on a real phone | 🧑 | Share an item link in Messenger and check the preview card. |

**Done when:** the site is live, every item has real photos, and one sale has come through the site.

---

## ✅ Phase 2: Make updates painless

- ✅ **Visual editor (Keystatic):** `npm run dev` → <http://localhost:4321/keystatic>. Add items, upload photos, flip status to Sold. It writes the same Markdown files, so you can still hand-edit.
  - ⏳ *Editing from your phone on the live site:* switch Keystatic to GitHub mode and add a server adapter (Netlify adapter + Keystatic GitHub app). Worth it once you list several times a week.
- ✅ **One-tap "mark as sold":** Status dropdown in the editor. Sold pieces leave the shop grid automatically.
- ✅ **Photo workflow:** `npm run photos` auto-rotates, smart-crops to 4:5, resizes, compresses, and strips EXIF/GPS. It also prints the `images:` block to paste.
- ✅ **"Just dropped" rail:** pieces listed within `dropWindowDays` of your newest listing. Measured from the newest item rather than today's date, so no daily rebuild is needed.
- ✅ **Released page** (`/released/`): sold pieces as a trust-building record, kept out of the shop.

---

## Phase 3: Grow the audience

- ✅ **Drop notifications:** "Notify me on Messenger" in the Contact section. Set `site.ts → newsletter` to a Buttondown username to add an email form.
- ✅ **Search:** command palette (header icon, `/` or Ctrl/⌘+K) over every piece by title, brand, size, category or condition.
- ⏳ **Size and price filters:** worth adding at around 30+ live items.
- ✅ **Vouches section:** add real buyer quotes to `src/content/vouches.json` and the section appears on the homepage. 🧑 Only use quotes you have permission to share.
- 🧑 **Instagram link:** set `site.ts → instagram` once you have one.
- ✅ **Per-item share cards:** generated for every item without photos (`/og/items/<slug>.png`). Items with photos use the cover photo.
- ✅ **Size guide** (`/size-guide/`): measuring diagrams for tops and bottoms, plus a sneaker size chart.
- ✅ **Filipino touches:** a light "Salamat" in the footer. 🧑 Add more in your own voice.

---

## ✅ Phase 3½: Community marketplace (v0.4)

Other people can now sell on OFFARCHIVE. Built on Supabase. See [docs/SUPABASE.md](docs/SUPABASE.md) to switch it on.

- ✅ Email sign-in (6-digit code or magic link, no passwords)
- ✅ Roles: visitor / seller / admin, enforced by row-level security and triggers (30 automated checks: `npm run test:db`)
- ✅ Seller profiles with Messenger / phone / Instagram, public seller pages
- ✅ Sell form: in-browser photo compression, type-aware measurements, edit & delete
- ✅ Moderation: review queue, reject with a note → fix & resubmit, hide, feature, verified sellers skip review
- ✅ Buyers contact sellers directly; safety tips on community listings; Saved list messages each seller separately
- ✅ Your own pieces highlighted as ✳ OFFARCHIVE. picks
- 🧑 Create the Supabase project, set up SMTP (Resend), make yourself admin, import your items (docs/SUPABASE.md)

**Next in this area** (when there's demand):
- ⏳ Report a listing (buyers flag scams; shows in the admin queue)
- ⏳ Email notifications: "your listing was approved / needs changes", "new listing waiting for review"
- ⏳ Seller ratings after a completed sale
- ⏳ Size and price filters, saved searches ("tell me when a US 9 drops")
- ⏳ Image moderation / duplicate-photo detection to catch stolen photos

---

## ⏳ Phase 4: Real checkout (only if volume demands it)

**Trigger:** more than ~20 orders a month, and Messenger back-and-forth is the bottleneck. Not started on purpose.

- ✅ Server rendering and Supabase inventory are already in place (Phase 3½)
- Hold a piece while a buyer pays, so two buyers can't both "buy" a one-of-one
- Reservations with a 24h timer that auto-releases
- Payments via PayMongo or Xendit (GCash, Maya, cards). Webhooks mark items sold.
- Shipping: address at checkout, flat-rate tiers (Cebu / Visayas / Luzon / Mindanao), J&T or LBC tracking
- Small admin dashboard: orders, reservations, revenue
- Legal basics: privacy notice (Data Privacy Act of 2012), terms of sale, DTI registration if you scale

---

## 🔭 Later / ideas parking lot

- Consignment: friends submit pieces for you to sell, for a cut
- Bundles ("buy 2, save ₱100")
- "Notify me if something in my size drops" (needs accounts or an email list)
- Lookbook / editorial pages per drop
- Meetup scheduler (pick a slot and location)

---

## Tech decisions log

| Decision | Why | Revisit when |
|----------|-----|--------------|
| **Astro, server-rendered** (was static) | Listings, logins and moderation must be live. Static pages (guides, 404) are still prerendered. | — |
| **Supabase** (Postgres + Auth + Storage) | One service for email sign-in, data and photos. Row-level security puts the marketplace rules in the database itself. Free tier, Singapore region, real Postgres (no lock-in). | If you need features Postgres can't do (unlikely) |
| **Admin-approves-first moderation** | Protects the curated feel and buyers. Verified sellers skip the queue so it doesn't become a bottleneck. | If the queue gets too long for one person: add more admins |
| **Markdown items as fallback/seed** | The site runs without a database (design work, demos), and the archive imports in one SQL paste. | Can be removed once Supabase is live |
| **Keystatic** (removed in v0.4) | Replaced by the in-site Sell form and admin dashboard, which work from a phone. | — |
| **Messenger checkout** over a cart | It's how buyers in PH already buy pre-loved items. Builds trust, costs nothing. | More than ~20 orders a month |
| **Vanilla CSS with tokens** over Tailwind | Tight token system, scoped component styles. | If a second designer/dev joins |
| **Lenis smooth scroll + custom cursor** | Premium feel on desktop. Off for touch and reduced-motion users. | If analytics show it hurts engagement |
| **Build-time OG images (Satori)** | Every link shared in Messenger gets a branded preview, with no image service. | Never |
