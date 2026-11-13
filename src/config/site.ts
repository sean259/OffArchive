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
  url: 'https://offarchive.netlify.app',
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

export const CATEGORIES = [
  { name: 'Clothing', slug: 'clothing', art: 'overshirt', cta: 'View clothing', blurb: 'Streetwear & everyday pieces' },
  { name: 'Shoes', slug: 'shoes', art: 'shoe', cta: 'View shoes', blurb: 'Sneakers & footwear' },
  { name: 'Books & Supplies', slug: 'books-supplies', art: 'book', cta: 'View books', blurb: 'Textbooks & school supplies' },
] as const satisfies readonly { name: string; slug: string; art: ArtKind; cta: string; blurb: string }[];

export type Category = (typeof CATEGORIES)[number];
export type CategoryName = Category['name'];
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name) as [CategoryName, ...CategoryName[]];

export const NAV = [
  { label: 'Shop', href: '/#archive' },
  { label: 'Released', href: '/released/' },
  { label: 'How to buy', href: '/how-to-buy/' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
] as const;
