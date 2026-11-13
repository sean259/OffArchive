# OFFARCHIVE.

> Curated. Collected. Released. A personal resale archive of clothing, footwear, and everyday essentials, based in Cebu, Philippines.

Built with [Astro](https://astro.build) and TypeScript. The public site is plain static HTML: fast on mobile data, free to host. Buyers check out by messaging on Messenger, so there's no cart and no backend.

## Quick start

```bash
npm install
npm run dev        # site: http://localhost:4321   editor: http://localhost:4321/keystatic
npm run build      # type-check + build to dist/
npm run preview    # serve the built site locally
npm run photos     # prepare product photos (see below)
```

Requires Node 18.20+ (Node 22 recommended).

## Adding and selling items

### The easy way: the editor

1. `npm run dev`, then open <http://localhost:4321/keystatic>
2. **Items → Add**: fill in the form, upload photos, save.
3. When it sells, open the item and set **Status → Sold**. It moves from the shop to `/released/`.

The editor writes normal Markdown files to `src/content/items/`, so you can still edit them by hand. Commit and push to publish.

### Photos

1. Put raw photos in `photo-inbox/<item-url>/` (e.g. `photo-inbox/black-denim-jacket/`). Filename order becomes photo order.
2. `npm run photos`
3. Each photo is rotated, smart-cropped to 4:5, resized, compressed, and stripped of EXIF/GPS data. The output goes to `src/assets/items/<item-url>/01.jpg…`, and the script prints the `images:` list to paste into the item.

`photo-inbox/` is git-ignored, so raw photos with location data never get published.

### By hand

Copy [`docs/item-template.md`](docs/item-template.md) into `src/content/items/`, rename it (the filename becomes the URL), and fill it in. `npm run build` tells you exactly which field is wrong if something's off. Set `draft: true` to hide an item while you work on it.

## Project structure

```
offarchive/
├── src/
│   ├── config/site.ts       ← Brand, Messenger, domain, analytics, newsletter, nav
│   ├── content/items/       ← One .md file per item
│   ├── content/vouches.json ← Buyer quotes (section appears when non-empty)
│   ├── assets/items/        ← Product photos, one folder per item
│   ├── content.config.ts    Item + vouch schemas
│   ├── components/          UI building blocks (.astro)
│   ├── layouts/BaseLayout   <head>, SEO/OG, header, footer, global UI
│   ├── lib/                 Item helpers, formatting, OG image renderer, saved list, catalog
│   ├── pages/               /, /items/[slug], /released, /size-guide, /how-to-buy, /og/*, 404
│   ├── scripts/             Client scripts: ui, motion, saved, search
│   └── styles/              tokens.css (palette, fonts), global.css (shared utilities)
├── tools/photos.mjs         Photo workflow
├── keystatic.config.ts      Editor fields
├── netlify.toml             Deploy settings
├── docs/item-template.md
└── ROADMAP.md
```

## Before going live

Search the code for `TODO`. Then:

- [ ] `src/config/site.ts`: `url` (your domain), `messenger` (Facebook Page username), `replyTime`, `trust`, `delivery`
- [ ] `src/pages/how-to-buy.astro` and `src/components/HowItWorks.astro`: real payment, meetup, shipping, and returns details
- [ ] Real photos and measurements on every item
- [ ] Optional: `analytics`, `newsletter`, `instagram` in `site.ts`

## Branches

| Branch | Purpose |
|--------|---------|
| `dev` | Day-to-day work. Commit and push here first. |
| `main` | What's live. Only updated by merging `dev` once it builds and looks right. |

```bash
git switch dev                 # work here
git add -A && git commit -m "Add black denim jacket"
git push                       # push dev; check the Netlify deploy preview if enabled

npm run build                  # make sure it builds
git switch main && git merge --ff-only dev && git push   # promote to live
git switch dev
```

On Netlify, set the production branch to `main` and turn on branch deploys for `dev` to get a preview URL of every change before it goes live.

## Deploying (free)

**Netlify** (configured): push to GitHub, then "Add new site → Import from Git". `netlify.toml` sets the build, caching, and headers. Cloudflare Pages and Vercel also work (build `npm run build`, output `dist`).

Every push rebuilds the site.

## Features

**Design:** editorial "archive catalogue" look. Instrument Serif display type, bone/ink palette with a rust accent, film grain, catalogue numbers (№ 001…).

**Motion** (desktop; touch-friendly fallbacks; off for reduced-motion users):
- Smooth scrolling, a cursor dot that turns into "View" / "Drag" labels, magnetic buttons
- Headline rise, scroll reveals, image curtain wipes, gentle parallax, stats that count up
- A short wordmark intro on the first page of each visit
- Page-to-page image morphs (Chrome/Edge/Safari 18+); cards glide when filtering

**Shopping:**
- **Just dropped** rail (drag to scroll) for the newest pieces
- **Search** palette: header icon, `/` or Ctrl/⌘+K
- **Saved list**: bookmark pieces and ask about all of them in one Messenger message
- Filter, sort, "Available only", Grid / List view with hover previews; settings kept in the URL
- Item pages: swipeable gallery on mobile, accordions, sticky mobile buy bar, previous/next links
- **Released** page for sold pieces; **Size guide** with diagrams and a sneaker chart
- Drop alerts via Messenger (plus an optional email list)

**Foundations:** share images generated for every page, Product/Store structured data, sitemap, robots.txt, self-hosted fonts, optimized images, works without JavaScript.
