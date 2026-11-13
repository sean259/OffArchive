import type { APIRoute } from 'astro';
import { defaultCard } from '../../lib/og';
import { SITE } from '../../config/site';
import { ART } from '../../lib/art';

export const GET: APIRoute = async () => {
  const png = await defaultCard({ tagline: SITE.tagline, location: SITE.location, arts: [ART.tee, ART.shoe] });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
