/**
 * Keystatic: a visual editor for your items at http://localhost:4321/keystatic (while `npm run dev` runs).
 * It reads and writes the same Markdown files in src/content/items/, so you can mix it with hand edits.
 *
 * Want to edit from your phone on the live site? Switch storage to GitHub mode:
 * https://keystatic.com/docs/github-mode (needs a server adapter; see ROADMAP Phase 2).
 */
import { config, fields, collection } from '@keystatic/core';
import { CATEGORY_NAMES } from './src/config/site';
import { ART_KINDS } from './src/lib/art';

const options = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));
const optional = (label: string, description?: string) => fields.text({ label, description });

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'OFFARCHIVE.' },
  },
  collections: {
    items: collection({
      label: 'Items',
      slugField: 'title',
      path: 'src/content/items/*',
      format: { contentField: 'content' },
      entryLayout: 'form',
      columns: ['status', 'price', 'listed'],
      schema: {
        title: fields.slug({ name: { label: 'Title' }, slug: { label: 'URL', description: 'Becomes /items/<url>/' } }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Available', value: 'available' },
            { label: 'Reserved', value: 'reserved' },
            { label: 'Sold', value: 'sold' },
          ],
          defaultValue: 'available',
        }),
        category: fields.select({ label: 'Category', options: options(CATEGORY_NAMES), defaultValue: CATEGORY_NAMES[0] }),
        price: fields.integer({ label: 'Price (₱)', validation: { isRequired: true, min: 1 } }),
        size: fields.text({ label: 'Size', description: 'e.g. M, 32, US 9, Paperback', validation: { length: { min: 1 } } }),
        condition: fields.select({
          label: 'Condition',
          options: options(['Like New', 'Excellent', 'Good', 'Fair']),
          defaultValue: 'Excellent',
        }),
        listed: fields.date({ label: 'Listed on', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        brand: optional('Brand', 'Optional'),
        images: fields.array(
          fields.image({
            label: 'Photo',
            directory: 'src/assets/items',
            publicPath: '../../assets/items/',
          }),
          { label: 'Photos', description: 'First photo is the cover. Tip: run `npm run photos` first for consistent 4:5 crops.' },
        ),
        art: fields.select({
          label: 'Fallback drawing',
          description: 'Shown when there are no photos yet',
          options: options(ART_KINDS),
          defaultValue: 'tee',
        }),
        fit: optional('Fit', 'e.g. Boxy, slightly cropped'),
        flaws: fields.text({ label: 'Flaws', multiline: true, defaultValue: 'None noted. See photos.' }),
        measurements: fields.object(
          {
            pitToPit: optional('Pit to pit'),
            length: optional('Length'),
            shoulder: optional('Shoulder'),
            sleeve: optional('Sleeve'),
            waist: optional('Waist'),
            rise: optional('Rise'),
            inseam: optional('Inseam'),
            legOpening: optional('Leg opening'),
            insole: optional('Insole (shoes)'),
          },
          { label: 'Measurements', description: 'Inches, e.g. 22". Leave blank to hide.' },
        ),
        featured: fields.checkbox({ label: 'Featured', description: 'Pinned to the top and shown in the hero' }),
        draft: fields.checkbox({ label: 'Draft', description: 'Hidden on the live site' }),
        content: fields.markdoc({ label: 'Description', extension: 'md' }),
      },
    }),
  },
});
