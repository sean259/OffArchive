import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, type Category } from '../config/site';

export type Item = CollectionEntry<'items'>;
export type Status = Item['data']['status'];

const STATUS_RANK: Record<Status, number> = { available: 0, reserved: 1, sold: 2 };

export const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
};

// Catalogue numbers (№ 001, № 002…) in listing order, oldest first.
// Tip: keep sold items (status: sold) rather than deleting them so numbers stay stable.
const numbers = new Map<string, string>();

/** All published items: available first, then featured, then newest. Drafts show only in `npm run dev`. */
export async function getItems(): Promise<Item[]> {
  const items = await getCollection('items', ({ data }) => import.meta.env.DEV || !data.draft);

  [...items]
    .sort((a, b) => a.data.listed.getTime() - b.data.listed.getTime() || a.id.localeCompare(b.id))
    .forEach((item, i) => numbers.set(item.id, String(i + 1).padStart(3, '0')));

  return items.sort(
    (a, b) =>
      STATUS_RANK[a.data.status] - STATUS_RANK[b.data.status] ||
      Number(b.data.featured) - Number(a.data.featured) ||
      b.data.listed.getTime() - a.data.listed.getTime(),
  );
}

export const catalogNo = (item: Item) => numbers.get(item.id) ?? '000';
export const statusRank = (item: Item) => STATUS_RANK[item.data.status];

export function categoryOf(item: Item): Category {
  return CATEGORIES.find((c) => c.name === item.data.category) ?? CATEGORIES[0];
}

export const itemPath = (item: Item) => `/items/${item.id}/`;

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

/** Items that are still in play (available or reserved). Sold pieces live on /released/. */
export const liveItems = (items: Item[]) => items.filter((i) => i.data.status !== 'sold');
export const soldItems = (items: Item[]) =>
  items.filter((i) => i.data.status === 'sold').sort((a, b) => b.data.listed.getTime() - a.data.listed.getTime());

/**
 * The latest drop: unsold pieces listed within `windowDays` of your newest listing.
 * Relative to the newest item (not today), so it never goes stale between rebuilds.
 */
export function latestDrop(items: Item[], windowDays: number) {
  const live = liveItems(items);
  if (!live.length) return { items: [] as Item[], date: undefined };
  const newest = Math.max(...live.map((i) => i.data.listed.getTime()));
  const cutoff = newest - windowDays * 86_400_000;
  return {
    items: live
      .filter((i) => i.data.listed.getTime() >= cutoff)
      .sort((a, b) => b.data.listed.getTime() - a.data.listed.getTime()),
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
  const m = item.data.measurements ?? {};
  const pick = garment === 'top' ? { pitToPit: m.pitToPit, length: m.length } : { waist: m.waist, inseam: m.inseam };
  return { garment, size: item.data.size, m: Object.fromEntries(Object.entries(pick).filter(([, v]) => v)) };
}
