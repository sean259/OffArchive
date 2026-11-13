import type { ArtKind } from '../lib/art';

/**
 * ─────────────────────────────────────────────────────────────
 *  Site-wide settings. Edit this file first.
 *  Everything brand-related (name, links, location) lives here.
 * ─────────────────────────────────────────────────────────────
 */
export const SITE = {
  name: 'OFFARCHIVE.',
  tagline: 'Curated. Collected. Released.',
  description:
    'A personal archive of pre-loved clothing, footwear, and everyday essentials. Collected with intention. Released for someone new. Based in Cebu, Philippines.',
  // TODO: replace with your real domain once deployed (used for canonical URLs, sitemap, share links).
  // Live address on Cloudflare. Change this when you add your own domain.
  url: 'https://offarchive.seanlorico9.workers.dev',
  // Bump this after changing the logo or share image: Messenger/Facebook cache previews by image URL,
  // so a new number makes them fetch the new picture.
  shareImageVersion: 2,
  location: 'Cebu, Philippines',
  announcement: 'Curated finds. Pre-loved pieces. Ready for a new home.',
  // Your Facebook Page username — m.me/<messenger> opens a chat with the page.
  messenger: 'offarchive',
  // Optional. Leave empty ('') to hide.
  instagram: '',
  // Shown on clothing pages as a fit reference.
  sellerHeight: `5'11"`,
  timezone: 'Asia/Manila',
  // TODO: the four lines below are starter copy. Make them match how you actually sell.
  replyTime: 'Usually replies within the day',
  trust: ['One of one', 'Every flaw disclosed', 'Meetups in Cebu · ships nationwide'],
  delivery:
    'Meet up around Cebu, or ship nationwide via J&T / LBC (buyer pays shipping). Pay via GCash, bank transfer, or cash on meetup.',

  // Pieces listed within this many days of your newest listing count as the "latest drop".
  dropWindowDays: 7,

  // Optional email list for drop announcements (https://buttondown.com). Your Buttondown username, or '' to hide.
  newsletter: '',

  // Optional analytics. Fill ONE of these in; leave the rest ''.
  analytics: {
    // Cloudflare Web Analytics token (free): dash.cloudflare.com → Analytics & Logs → Web Analytics
    cloudflareToken: '',
    // Plausible: the domain you registered, e.g. 'offarchive.ph'. Also records "Messenger click" events.
    plausibleDomain: '',
  },
} as const;

export const messengerUrl = `https://m.me/${SITE.messenger}`;

/**
 * Departments. `size` says what the size field is called for that category (null hides it),
 * and `fitted` turns on fit notes, measurements and the fit finder (wearables only).
 */
export const CATEGORIES = [
  { name: 'Clothing', slug: 'clothing', art: 'overshirt', cta: 'View clothing', blurb: 'Streetwear & everyday pieces', fitted: true, size: { label: 'Size', placeholder: 'S · M · L · 32', required: true } },
  { name: 'Shoes', slug: 'shoes', art: 'shoe', cta: 'View shoes', blurb: 'Sneakers & footwear', fitted: true, size: { label: 'Size', placeholder: 'US 9 · EU 42', required: true } },
  { name: 'Fragrance', slug: 'fragrance', art: 'perfume', cta: 'View fragrance', blurb: 'Perfumes, colognes & decants', fitted: false, size: { label: 'Bottle', placeholder: '100 ml · about 80% left', required: false } },
  { name: 'Books & Supplies', slug: 'books-supplies', art: 'book', cta: 'View books', blurb: 'Textbooks & school supplies', fitted: false, size: { label: 'Format', placeholder: 'Paperback · Set of 9', required: false } },
  { name: 'Others', slug: 'others', art: 'box', cta: 'View others', blurb: 'Bags, accessories & everything else', fitted: false, size: null },
] as const satisfies readonly {
  name: string;
  slug: string;
  art: ArtKind;
  cta: string;
  blurb: string;
  fitted: boolean;
  size: { label: string; placeholder: string; required: boolean } | null;
}[];

export type Category = (typeof CATEGORIES)[number];
export type CategoryName = Category['name'];
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name) as [CategoryName, ...CategoryName[]];

/** Short label for cards and chips, e.g. "Books" instead of "Books & Supplies". */
export const shortCategory = (name: string) => (name === 'Books & Supplies' ? 'Books' : name);
/** What the size field means for a category, or null when the category has no size. */
export const sizeSpec = (name: string) => CATEGORIES.find((c) => c.name === name)?.size ?? null;
/** True for wearables, which get fit notes, measurements and the fit finder. */
export const isFitted = (name: string) => CATEGORIES.find((c) => c.name === name)?.fitted ?? false;

export const NAV = [
  { label: 'Shop', href: '/#archive' },
  { label: 'Released', href: '/released/' },
  { label: 'How to buy', href: '/how-to-buy/' },
  { label: 'About', href: '/#about' },
] as const;
