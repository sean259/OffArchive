// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { SITE } from './src/config/site.ts';

// Server-rendered on Cloudflare Workers so listings, logins and the admin dashboard are always live.
// Static pages (how-to-buy, size guide, share image) opt into prerendering with `export const prerender = true`.
export default defineConfig({
  site: SITE.url,
  output: 'server',
  adapter: cloudflare({
    // Workers can't run sharp at request time: images are optimized at build time instead.
    // Seller photos are already compressed in the browser and served straight from Supabase.
    imageService: 'compile',
    // Static pages are built with Node, so the share image (satori + sharp) can render at build time.
    prerenderEnvironment: 'node',
  }),
  // Logins are handled by Supabase cookies, so Astro sessions (and their Cloudflare KV store) aren't needed.
  session: false,
  security: { checkOrigin: true },
});
