/**
 * The data layer. Every page and component gets listings from here, in one shape (`Item`),
 * whether they come from Supabase (marketplace mode) or from the Markdown files in
 * src/content/items (fallback mode, used until Supabase is configured).
 */
import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, SITE, type Category, type CategoryName } from '../config/site';
import { ART_KINDS, type ArtKind } from './art';
import { publicClient, photoUrl } from './supabase';
import { LISTING_SELECT, type ListingStatus, type ListingWithSeller, type ProfileRow } from './db-types';

export type Status = ListingStatus;
export type Condition = 'Like New' | 'Excellent' | 'Good' | 'Fair';
export type MeasureKey = 'pitToPit' | 'length' | 'shoulder' | 'sleeve' | 'waist' | 'rise' | 'inseam' | 'legOpening' | 'insole';
export type RemotePhoto = { src: string; width?: number; height?: number };
export type Photo = ImageMetadata | RemotePhoto;

export interface Seller {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  /** The site owner (an admin). Their pieces are highlighted as "OFFARCHIVE. picks". */
  official: boolean;
  messenger: string | null;
  phone: string | null;
  instagram: string | null;
  location: string;
  bio: string | null;
}

export interface Item {
  /** URL slug: /items/<id>/ */
  id: string;
  /** Database id (marketplace mode only). */
  uuid?: string;
  /** Plain-text description. */
  body: string;
  data: {
    no: string;
    title: string;
    category: CategoryName;
    price: number;
    size: string;
    condition: Condition;
    status: Status;
    listed: Date;
    brand?: string;
    images: Photo[];
    alt?: string;
    art: ArtKind;
    fit?: string;
    flaws: string;
    measurements: Partial<Record<MeasureKey, string>>;
    featured: boolean;
    reviewNote?: string | null;
    seller: Seller;
  };
}

export const PUBLIC_STATUSES: Status[] = ['available', 'reserved', 'sold'];
const STATUS_RANK: Record<Status, number> = { available: 0, reserved: 1, sold: 2, pending: 3, rejected: 4, hidden: 5 };

export const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  pending: 'In review',
  rejected: 'Needs changes',
  hidden: 'Hidden',
};

export const isRemote = (p: Photo): p is RemotePhoto => !('format' in p);

/** The shop owner, used as the seller for Markdown items in fallback mode. */
export const OFFICIAL_SELLER: Seller = {
  id: 'official',
  username: 'offarchive',
  name: SITE.name,
  verified: true,
  official: true,
  messenger: SITE.messenger,
  phone: null,
  instagram: SITE.instagram || null,
  location: SITE.location,
  bio: SITE.description,
};

/* ── Mapping ───────────────────────────────────────────── */
type SellerRow = NonNullable<ListingWithSeller['seller']>;

export const toSeller = (p: SellerRow | ProfileRow): Seller => ({
  id: p.id,
  username: p.username,
  name: p.display_name,
  verified: p.verified || p.role === 'admin',
  official: p.role === 'admin',
  messenger: p.messenger,
  phone: p.phone,
  instagram: p.instagram,
  location: p.location,
  bio: p.bio,
});

const asArt = (a: string): ArtKind => ((ART_KINDS as string[]).includes(a) ? (a as ArtKind) : 'tee');

export function fromRow(row: ListingWithSeller): Item {
  return {
    id: row.slug,
    uuid: row.id,
    body: row.description,
    data: {
      no: String(row.catalog_no).padStart(3, '0'),
      title: row.title,
      category: row.category as CategoryName,
      price: row.price,
      size: row.size,
      condition: row.condition as Condition,
      status: row.status,
      listed: new Date(row.listed_at),
      brand: row.brand ?? undefined,
      images: row.images.map((path) => ({ src: photoUrl(path) })),
      art: asArt(row.art),
      fit: row.fit ?? undefined,
      flaws: row.flaws,
      measurements: row.measurements ?? {},
      featured: row.featured,
      reviewNote: row.review_note,
      seller: row.seller ? toSeller(row.seller) : { ...OFFICIAL_SELLER, id: row.seller_id, official: false, name: 'Seller' },
    },
  };
}

async function fromMarkdown(): Promise<Item[]> {
  const entries = await getCollection('items', ({ data }) => import.meta.env.DEV || !data.draft);
  const order = [...entries].sort((a, b) => a.data.listed.getTime() - b.data.listed.getTime() || a.id.localeCompare(b.id));
  return entries.map((e) => ({
    id: e.id,
    body: e.body?.trim() ?? '',
    data: {
      ...e.data,
      no: String(order.indexOf(e) + 1).padStart(3, '0'),
      measurements: e.data.measurements ?? {},
      seller: OFFICIAL_SELLER,
    },
  }));
}

const sortForShop = (items: Item[]) =>
  items.sort(
    (a, b) =>
      STATUS_RANK[a.data.status] - STATUS_RANK[b.data.status] ||
      Number(b.data.featured) - Number(a.data.featured) ||
      b.data.listed.getTime() - a.data.listed.getTime(),
  );

/* ── Public queries (cached for a few seconds per server instance) ── */
let cache: { at: number; items: Promise<Item[]> } | null = null;
const TTL = 5_000;

// If Supabase is unreachable, keep serving the last listings we loaded instead of an
// empty shop, and flag it so the layout can show a quiet "may be out of date" banner.
let lastGood: Item[] | null = null;
let degradedUntil = 0;
/** True for a minute after a failed listings query. */
export const isDegraded = () => Date.now() < degradedUntil;

async function loadPublic(): Promise<Item[]> {
  const db = publicClient();
  if (!db) return sortForShop(await fromMarkdown());
  try {
    const { data, error } = await db
      .from('listings')
      .select(LISTING_SELECT)
      .in('status', PUBLIC_STATUSES)
      .order('listed_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    lastGood = sortForShop((data as ListingWithSeller[]).map(fromRow));
    degradedUntil = 0;
    return lastGood;
  } catch (err) {
    console.error('[items] Supabase query failed:', (err as Error).message ?? err);
    degradedUntil = Date.now() + 60_000;
    return lastGood ?? [];
  }
}

/** Everything the public can see (available, reserved, sold), shop-sorted. */
export function getItems(): Promise<Item[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.items;
  const items = loadPublic();
  cache = { at: Date.now(), items };
  items.catch(() => (cache = null));
  return items;
}

/** Call after any write so the next page view shows fresh data. */
export const invalidateItems = () => {
  cache = null;
};

/**
 * One listing by slug. Pass the request's client (Astro.locals.supabase) so owners and
 * admins can preview listings that aren't public yet. RLS decides what comes back.
 */
export async function getItemBySlug(slug: string, client?: SupabaseClient | null): Promise<Item | null> {
  const db = client ?? publicClient();
  if (!db) return (await getItems()).find((i) => i.id === slug) ?? null;
  const { data, error } = await db.from('listings').select(LISTING_SELECT).eq('slug', slug).maybeSingle();
  if (error) {
    console.error('[items] listing lookup failed:', error.message);
    // Database hiccup: fall back to the last loaded shop listings rather than a false 404.
    degradedUntil = Date.now() + 60_000;
    return lastGood?.find((i) => i.id === slug) ?? null;
  }
  return data ? fromRow(data as ListingWithSeller) : null;
}

/** A seller's public profile by username. */
export async function getSeller(username: string): Promise<Seller | null> {
  const db = publicClient();
  if (!db) return username === OFFICIAL_SELLER.username ? OFFICIAL_SELLER : null;
  const { data } = await db.from('profiles').select('*').eq('username', username).maybeSingle();
  return data ? toSeller(data as ProfileRow) : null;
}

/* ── Helpers used across components ───────────────────── */
export const catalogNo = (item: Item) => item.data.no;
export const statusRank = (item: Item) => STATUS_RANK[item.data.status];
export const isPublic = (item: Item) => PUBLIC_STATUSES.includes(item.data.status);

export function categoryOf(item: Item): Category {
  return CATEGORIES.find((c) => c.name === item.data.category) ?? CATEGORIES[0];
}

export const itemPath = (item: Item) => `/items/${item.id}/`;
export const sellerPath = (s: Seller) => `/sellers/${s.username}/`;

export const MEASUREMENT_LABELS: Record<string, string> = {
  pitToPit: 'Pit to pit',
  length: 'Length',
  shoulder: 'Shoulder',
  sleeve: 'Sleeve',
  waist: 'Waist',
  rise: 'Rise',
  inseam: 'Inseam',
  legOpening: 'Leg opening',
  insole: 'Insole',
};

/** Items still in play (available or reserved). Sold pieces live on /released/. */
export const liveItems = (items: Item[]) => items.filter((i) => i.data.status === 'available' || i.data.status === 'reserved');
export const soldItems = (items: Item[]) =>
  items.filter((i) => i.data.status === 'sold').sort((a, b) => b.data.listed.getTime() - a.data.listed.getTime());

/**
 * The latest drop: live pieces listed within `windowDays` of the newest listing.
 * Relative to the newest item (not today), so it never goes stale.
 */
export function latestDrop(items: Item[], windowDays: number) {
  const live = liveItems(items);
  if (!live.length) return { items: [] as Item[], date: undefined };
  const newest = Math.max(...live.map((i) => i.data.listed.getTime()));
  const cutoff = newest - windowDays * 86_400_000;
  return {
    items: live
      .filter((i) => i.data.listed.getTime() >= cutoff)
      .sort((a, b) => b.data.listed.getTime() - a.data.listed.getTime())
      .slice(0, 12),
    date: new Date(newest),
  };
}

/** Which fit finder applies: tops vs bottoms for clothing, none for shoes/books. */
export function garmentOf(item: Item): 'top' | 'bottom' | null {
  if (item.data.category !== 'Clothing') return null;
  return item.data.art === 'pants' ? 'bottom' : 'top';
}

/** The data the fit finder needs about a piece (tag size + relevant measurements). */
export function fitData(item: Item) {
  const garment = garmentOf(item);
  if (!garment) return null;
  const m = item.data.measurements;
  const pick = garment === 'top' ? { pitToPit: m.pitToPit, length: m.length } : { waist: m.waist, inseam: m.inseam };
  return { garment, size: item.data.size, m: Object.fromEntries(Object.entries(pick).filter(([, v]) => v)) };
}

/** Messenger link for a seller (falls back to the shop's page). */
export const messengerFor = (s: Seller) => `https://m.me/${s.messenger || SITE.messenger}`;
