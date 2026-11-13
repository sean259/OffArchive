/** Shared helpers for the API routes in src/pages/api. Server-only. */
import { z } from 'astro/zod';
import { CATEGORY_NAMES, isFitted, sizeSpec } from '../config/site';
import { ART_KINDS } from './art';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const fail = (error: string, status = 400) => json({ error }, status);

/** Only allow redirects back into this site (blocks open-redirect tricks like //evil.com). */
export function safeNext(value: unknown, fallback = '/account/') {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : fallback;
}

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'piece'}-${suffix}`;
}

export const MEASURE_KEYS = ['pitToPit', 'length', 'shoulder', 'sleeve', 'waist', 'rise', 'inseam', 'legOpening', 'insole'] as const;
export const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Photo paths must live in the uploader's own folder: "<user id>/<file>.jpg". */
export const photoPath = z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/, 'Invalid photo.');

export const listingInput = z.object({
  title: z.string().trim().min(3, 'Title is too short.').max(80),
  category: z.enum(CATEGORY_NAMES),
  price: z.coerce.number().int('Price must be a whole number.').min(1, 'Add a price.').max(999999),
  size: z.string().trim().max(30).optional().default(''),
  condition: z.enum(CONDITIONS),
  art: z.enum(ART_KINDS),
  brand: optionalText(60),
  description: z.string().trim().max(2000).default(''),
  fit: optionalText(120),
  flaws: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || 'None noted. See photos.'),
  measurements: z
    .record(z.string(), z.string().trim().max(20))
    .default({})
    .transform((m) =>
      Object.fromEntries(Object.entries(m).filter(([k, v]) => (MEASURE_KEYS as readonly string[]).includes(k) && v)),
    ),
  images: z.array(photoPath).min(1, 'Add at least one photo.').max(8, 'Up to 8 photos.'),
});

export type ListingInput = z.infer<typeof listingInput>;

export const profileInput = z.object({
  display_name: z.string().trim().min(1, 'Add your name.').max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_.]{2,23}$/, 'Username: 3–24 characters, letters, numbers, dots or underscores.'),
  location: z.string().trim().min(1).max(60).default('Cebu, Philippines'),
  bio: optionalText(280),
  messenger: z
    .string()
    .trim()
    .transform((v) => v.replace(/^https?:\/\/(www\.)?(m\.me|facebook\.com|messenger\.com\/t)\//i, '').replace(/\/$/, ''))
    .refine((v) => v === '' || /^[A-Za-z0-9.]{3,50}$/.test(v), 'Messenger: use your Facebook username (the part after m.me/).')
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9 ]{7,16}$/.test(v), 'Phone: digits only, e.g. 0917 555 0101.')
    .transform((v) => v || null),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, ''))
    .refine((v) => v === '' || /^[A-Za-z0-9._]{1,30}$/.test(v), 'Instagram: just your handle.')
    .transform((v) => v || null),
});

/** First readable message from a zod error. */
export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? 'Please check the form.';
