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
  status: 'available' | 'reserved' | 'sold';
  url: string;
  thumb?: string;
  art: string;
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
};

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Small thumbnail markup: the photo if there is one, otherwise the line illustration. */
export const thumbHtml = (e: CatalogEntry) =>
  e.thumb
    ? `<img src="${e.thumb}" alt="" loading="lazy">`
    : `<svg viewBox="0 0 100 125" aria-hidden="true"><path d="${esc(e.art)}"/></svg>`;
