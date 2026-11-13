// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import { SITE } from './src/config/site.ts';

// The Keystatic editor (/keystatic) runs during `npm run dev` only. The public site stays fully static.
const isDev = process.argv.includes('dev');

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: SITE.url,
  integrations: [
    sitemap({ filter: (page) => !page.includes('/og/') }),
    ...(isDev ? [react(), keystatic()] : []),
  ],
  vite: {
    // Keystatic's API module imports astro:env, which Vite's dependency pre-bundler can't resolve.
    optimizeDeps: { exclude: ['@keystatic/astro'] },
  },
});
