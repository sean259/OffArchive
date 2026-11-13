#!/usr/bin/env node
/**
 * Photo workflow — turns raw phone photos into consistent, web-ready product shots.
 *
 *   1. Drop photos in  photo-inbox/<item-slug>/   (JPG / PNG / WebP; order = filename order)
 *   2. Run             npm run photos            (or: npm run photos -- <item-slug>)
 *   3. Paste the printed `images:` block into src/content/items/<item-slug>.md
 *
 * Each photo is auto-rotated, smart-cropped to 4:5 (keeps the most interesting area),
 * resized to 1600×2000, compressed, and stripped of EXIF data, including GPS location.
 * Output: src/assets/items/<item-slug>/01.jpg, 02.jpg, …
 *
 * iPhone HEIC photos: export as JPG first (Photos → Share → Options → Most Compatible).
 */
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const INBOX = 'photo-inbox';
const OUT = join('src', 'assets', 'items');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(INBOX))) {
  await mkdir(INBOX, { recursive: true });
  console.log(`Created ${INBOX}/ — add a folder per item (e.g. ${INBOX}/black-denim-jacket/) and run again.`);
  process.exit(0);
}

const only = process.argv[2];
const slugs = (await readdir(INBOX, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && (!only || d.name === only))
  .map((d) => d.name);

if (!slugs.length) {
  console.log(only ? `No folder ${INBOX}/${only}/` : `No item folders in ${INBOX}/ yet.`);
  process.exit(0);
}

for (const slug of slugs) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.warn(`! Skipping "${slug}": use lowercase letters, numbers and dashes (it becomes the URL).`);
    continue;
  }
  const files = (await readdir(join(INBOX, slug)))
    .filter((f) => EXT.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;

  const dest = join(OUT, slug);
  await mkdir(dest, { recursive: true });
  const written = [];

  for (const [i, file] of files.entries()) {
    const name = `${String(i + 1).padStart(2, '0')}.jpg`;
    await sharp(join(INBOX, slug, file))
      .rotate() // honour camera orientation, then drop the tag
      .resize(1600, 2000, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(join(dest, name)); // metadata (EXIF/GPS) is not copied unless asked for
    written.push(name);
    process.stdout.write(`  ${slug}/${file} → ${dest}/${name}\n`);
  }

  console.log(`\n✓ ${slug}: ${written.length} photo(s). Add this to src/content/items/${slug}.md:\n`);
  console.log('images:');
  for (const n of written) console.log(`  - ../../assets/items/${slug}/${n}`);
  console.log('');
}
