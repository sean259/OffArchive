/** Client-side access to the item index embedded by components/Catalog.astro. */
export interface CatalogEntry {
  id: string;
  order: number;
  no: string;
  title: string;
  brand: string;
  category: string;
  condition: string;
  price: number;
  priceLabel: string;
  size: string;
  status: 'available' | 'reserved' | 'sold' | 'pending' | 'rejected' | 'hidden';
  url: string;
  thumb?: string;
  /** Medium photos for Quick view (empty: the illustration is shown). */
  photos: string[];
  /** What the size means for this category (Size / Bottle / Format). */
  sizeLabel: string;
  fit: string | null;
  flaws: string;
  blurb: string;
  /** Listing time (ms), for "new since your last visit". */
  listed: number;
  art: string;
  seller: { username: string; name: string; official: boolean; verified: boolean; messenger: string | null; phone: string | null };
}

let cache: Record<string, CatalogEntry> | null = null;

export function getCatalog(): Record<string, CatalogEntry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(document.getElementById('catalog')?.textContent || '{}');
  } catch {
    cache = {};
  }
  return cache!;
}

export const STATUS_TEXT: Record<CatalogEntry['status'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold — released',
  pending: 'In review',
  rejected: 'Needs changes',
  hidden: 'Hidden',
};

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Small thumbnail markup: the photo if there is one, otherwise the line illustration. */
export const thumbHtml = (e: CatalogEntry) =>
  e.thumb
    ? `<img src="${e.thumb}" alt="" loading="lazy">`
    : `<svg viewBox="0 0 100 125" aria-hidden="true"><path d="${esc(e.art)}"/></svg>`;
