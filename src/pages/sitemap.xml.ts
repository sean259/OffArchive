import type { APIRoute } from 'astro';
import { getItems, itemPath, sellerPath, type Seller } from '../lib/items';

const STATIC = ['/', '/released/', '/how-to-buy/', '/size-guide/'];

export const GET: APIRoute = async ({ site }) => {
  const items = await getItems();
  const sellers = new Map<string, Seller>();
  items.forEach((i) => sellers.set(i.data.seller.username, i.data.seller));

  const urls = [
    ...STATIC.map((p) => ({ loc: p })),
    ...items.map((i) => ({ loc: itemPath(i), lastmod: i.data.listed.toISOString().slice(0, 10) })),
    ...[...sellers.values()].map((s) => ({ loc: sellerPath(s) })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.loc, site).href}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
};
