// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';
import { SITE } from './src/config/site.ts';

// Server-rendered so listings, logins and the admin dashboard are always live.
// Static pages (how-to-buy, size guide, 404) opt into prerendering with `export const prerender = true`.
// Netlify sets NETLIFY=true during its builds; locally we use the Node adapter so `npm run preview` works.
export default defineConfig({
  site: SITE.url,
  output: 'server',
  adapter: process.env.NETLIFY ? netlify() : node({ mode: 'standalone' }),
  security: { checkOrigin: true },
});
