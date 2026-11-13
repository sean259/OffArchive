import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { ART_KINDS } from './lib/art';
import { CATEGORY_NAMES } from './config/site';

/**
 * One Markdown file in src/content/items/ = one listing.
 * The filename becomes the URL: washed-boxy-tee.md → /items/washed-boxy-tee/
 * Files starting with "_" (like _TEMPLATE.md) are ignored.
 */
const items = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/items' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      category: z.enum(CATEGORY_NAMES),
      price: z.number().int().positive(),
      size: z.string().default(''),
      condition: z.enum(['Like New', 'Excellent', 'Good', 'Fair']),
      status: z.enum(['available', 'reserved', 'sold']).default('available'),
      listed: z.coerce.date(),
      brand: z.string().optional(),
      // Photos live in src/assets/items/<slug>/ — first one is the cover.
      images: z.array(image()).default([]),
      alt: z.string().optional(),
      // Fallback illustration when there are no photos yet.
      art: z.enum(ART_KINDS).default('tee'),
      fit: z.string().optional(),
      flaws: z.string().default('None noted. See photos.'),
      measurements: z
        .object({
          pitToPit: z.string(),
          length: z.string(),
          shoulder: z.string(),
          sleeve: z.string(),
          waist: z.string(),
          rise: z.string(),
          inseam: z.string(),
          legOpening: z.string(),
          insole: z.string(),
        })
        .partial()
        .optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

/**
 * Vouches — short quotes from real buyers, shown on the homepage once you add some.
 * Edit src/content/vouches.json. Only add quotes you have permission to share.
 */
const vouches = defineCollection({
  loader: file('src/content/vouches.json'),
  schema: z.object({
    id: z.string(),
    quote: z.string(),
    name: z.string(), // e.g. "Kim R." or "@handle"
    item: z.string().optional(), // what they bought
    date: z.coerce.date().optional(),
    draft: z.boolean().default(false), // true = hidden (handy for the example entry)
  }),
});

export const collections = { items, vouches };
