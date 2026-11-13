import type { APIRoute, GetStaticPaths } from 'astro';
import { itemCard } from '../../../lib/og';
import { getItems, catalogNo, type Item } from '../../../lib/items';
import { peso } from '../../../lib/format';
import { ART } from '../../../lib/art';

export const getStaticPaths = (async () => {
  const items = await getItems();
  return items.map((item) => ({ params: { slug: item.id }, props: { item, no: catalogNo(item) } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { item, no } = props as { item: Item; no: string };
  const d = item.data;
  const png = await itemCard({
    no,
    title: d.title,
    category: d.category,
    price: peso(d.price),
    size: d.size,
    condition: d.condition,
    status: d.status,
    art: ART[d.art],
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
