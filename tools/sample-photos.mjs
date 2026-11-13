#!/usr/bin/env node
/**
 * Generates SAMPLE product photos for the demo items in src/content/items, so the site
 * can be previewed with pictures before real photos exist. Each image is stamped
 * "SAMPLE" in the corner. Replace them with real photos before launch.
 *
 *   npm run sample-photos             → creates src/assets/items/<slug>/sample-1..3.jpg + links them in each .md
 *   npm run sample-photos -- --remove → deletes the samples and unlinks them
 *
 * Shots per item: 1) studio product shot  2) close-up detail  3) hang tag with № and size.
 */
import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const ITEMS = 'src/content/items';
const ASSETS = 'src/assets/items';
const W = 1200;
const H = 1500;
const REMOVE = process.argv.includes('--remove');

// Same silhouettes as src/lib/art.ts, plus extra stitch details for the photos.
const TEE = 'M35 28 L20 36 L10 56 L24 62 L28 52 L28 100 L72 100 L72 52 L76 62 L90 56 L80 36 L65 28 Q50 40 35 28Z';
const SHOE = 'M12 82 Q12 66 22 64 L38 60 Q44 70 56 70 L74 72 Q92 74 92 86 V92 H12Z';
const ART = {
  tee: [TEE, 'M40 31 Q50 42 60 31 M28 96 H72 M13 54 L25 59 M87 54 L75 59'],
  overshirt: [TEE, 'M35 28 L50 40 L65 28 M50 40 V100 M34 60h12v12H34z M54 60h12v12H54z M34 63 H46 M54 63 H66'],
  pants: ['M30 20 H70 L76 106 H55 L50 54 L45 106 H24Z', 'M30 28 H70 M50 28 V54 M34 40 l6 0 M60 40 l6 0 M25 100 H45 M55 100 H75'],
  jacket: ['M36 24 L20 32 L12 100 L24 102 L30 62 L30 104 L70 104 L70 62 L76 102 L88 100 L80 32 L64 24 Q50 34 36 24Z', 'M50 32 V104 M36 24 L42 36 M64 24 L58 36 M14 92 L24 94 M76 94 L86 92 M30 98 H70'],
  shoe: [SHOE, 'M12 86 H92 M40 62 l6 8 M47 60 l6 8 M54 61 l6 8 M66 78 q8 -2 14 2'],
  runner: [SHOE, 'M12 85 H92 M26 80 H72 M30 74 L36 80 M60 72 l10 8'],
  book: ['M28 22 H76 V104 H28Z', 'M28 22 Q22 22 22 28 V98 Q22 104 28 104 M36 42 H68 M36 52 H62 M36 92 H50'],
  set: ['M16 52 H84 V96 H16Z', 'M40 52 V44 H60 V52 M34 66 L50 86 L66 66 M50 66 V86 M16 60 H84'],
};

// Colourway per piece: fabric, backdrop, stitch colour.
const LOOK = {
  'washed-boxy-tee': { fabric: '#55534f', bg: '#d8d2c6', line: '#2c2b29' },
  'utility-overshirt': { fabric: '#6d6b4b', bg: '#d6cfbf', line: '#3a3925' },
  'wide-leg-cargo-pants': { fabric: '#a48f69', bg: '#ddd6c8', line: '#5e5038' },
  'zip-track-jacket': { fabric: '#2f3a52', bg: '#cfcbc2', line: '#9aa3b8' },
  'low-top-court-sneakers': { fabric: '#ece7dc', bg: '#bfb6a6', line: '#7b7466' },
  'retro-runner': { fabric: '#8d98a6', bg: '#d4cfc5', line: '#3f4651' },
  'engineering-mechanics-14th-ed': { fabric: '#7a2f26', bg: '#d9d1c2', line: '#e6c9a8' },
  'drafting-set-and-case': { fabric: '#2b2b29', bg: '#cbc5b8', line: '#8d8a82' },
};
const DEFAULT_LOOK = { fabric: '#6b675e', bg: '#d6d0c4', line: '#2c2b29' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const stamp = (fill = 'rgba(20,20,18,.45)') =>
  `<text x="${W - 40}" y="${H - 36}" text-anchor="end" font-family="Consolas, 'DM Mono', monospace" font-size="22" letter-spacing="4" fill="${fill}">SAMPLE</text>`;

/** Noise filter in pixel space. `rgb` is the noise colour (0 = black, 1 = white). */
const noise = (id, { freq, alpha, rgb = 0, octaves = 2, seed = 3 }) => `
  <filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}"/>
    <feColorMatrix values="0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 ${alpha} 0"/>
  </filter>`;

/**
 * Studio shot: backdrop, floor, soft contact shadow, shaded garment with fabric grain and stitch lines.
 * All effects run in pixel space so blur and grain stay fine. Pass a viewBox to zoom in (detail shot).
 */
function studioSvg(kind, look, viewBox = `0 0 ${W} ${H}`, withStamp = true) {
  const [body, details] = ART[kind] ?? ART.tee;
  const s = 9.4;
  const tx = (W - 100 * s) / 2;
  const ty = (H - 125 * s) / 2 + 30;
  const place = `translate(${tx} ${ty}) scale(${s})`;
  const flat = kind === 'shoe' || kind === 'runner' || kind === 'set';
  const dash = kind === 'book' || kind === 'set' ? 'none' : '1 .65';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${viewBox}">
  <defs>
    <radialGradient id="light" cx="50%" cy="34%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity=".38"/>
      <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".2"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".09"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".2"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/>
    </linearGradient>
    <filter id="shadow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feGaussianBlur stdDeviation="${flat ? 14 : 26}"/>
    </filter>
    ${noise('grain', { freq: 1.1, alpha: 0.22 })}
    ${noise('weave', { freq: '0.012 0.05', alpha: 0.12, rgb: 1, seed: 9 })}
    ${noise('paper', { freq: 0.8, alpha: 0.06, seed: 5 })}
    <clipPath id="body" clipPathUnits="userSpaceOnUse"><path d="${body}" transform="${place}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${look.bg}"/>
  <rect width="${W}" height="${H}" filter="url(#paper)"/>
  <rect y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="url(#floor)"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  <g filter="url(#shadow)" opacity="${flat ? 0.5 : 0.3}">
    <path d="${body}" transform="translate(${tx + (flat ? 6 : 20)} ${ty + (flat ? 14 : 30)}) scale(${s})" fill="#000"/>
  </g>
  <path d="${body}" transform="${place}" fill="${look.fabric}"/>
  <g clip-path="url(#body)">
    <rect width="${W}" height="${H}" filter="url(#weave)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)"/>
    <rect x="${tx}" y="${ty}" width="${100 * s}" height="${125 * s}" fill="url(#shade)"/>
  </g>
  <g transform="${place}" fill="none" stroke="${look.line}" stroke-linejoin="round">
    <path d="${body}" stroke-opacity=".5" stroke-width=".3"/>
  </g>
  <g clip-path="url(#body)">
    <g transform="${place}" fill="none" stroke="${look.line}" stroke-linejoin="round" stroke-linecap="round">
      <path d="${details}" stroke-opacity=".65" stroke-width=".28" stroke-dasharray="${dash}"/>
    </g>
  </g>
  ${withStamp ? stamp() : ''}
</svg>`;
}

/** Hang-tag shot: fabric fills the frame, a kraft tag with the catalogue number and size. */
function tagSvg(look, { no, size, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${noise('grain', { freq: 0.95, alpha: 0.22, octaves: 3, seed: 7 })}
    ${noise('kraft', { freq: 0.7, alpha: 0.12, octaves: 3, seed: 11 })}
    <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".18"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".08"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
    <filter id="drop" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="14"/></filter>
    <clipPath id="tag" clipPathUnits="userSpaceOnUse"><rect x="-270" y="-340" width="540" height="760" rx="36"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${look.fabric}"/>
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
  <rect width="${W}" height="${H}" fill="url(#fold)"/>
  <path d="M600 0 C 560 200, 640 300, 600 420" stroke="#e9e2d2" stroke-width="5" fill="none" opacity=".85"/>
  <g transform="translate(600 760) rotate(-6)">
    <rect x="-262" y="-326" width="540" height="760" rx="36" fill="#000" opacity=".35" filter="url(#drop)"/>
    <rect x="-270" y="-340" width="540" height="760" rx="36" fill="#c9ad84"/>
    <g clip-path="url(#tag)"><rect x="-600" y="-760" width="${W}" height="${H}" filter="url(#kraft)"/></g>
    <circle cx="0" cy="-270" r="22" fill="${look.fabric}" stroke="#a88d66" stroke-width="6"/>
    <text x="0" y="-150" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="62" letter-spacing="-3" fill="#1a1712">OFFARCHIVE<tspan fill="#8c3a24">.</tspan></text>
    <line x1="-200" y1="-110" x2="200" y2="-110" stroke="#1a1712" stroke-opacity=".35" stroke-width="2"/>
    <text x="0" y="20" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="150" fill="#1a1712">№ ${esc(no)}</text>
    <text x="0" y="110" text-anchor="middle" font-family="Consolas, monospace" font-size="34" letter-spacing="6" fill="#1a1712">SIZE ${esc(size).toUpperCase()}</text>
    <text x="0" y="200" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="40" fill="#1a1712" fill-opacity=".75">${esc(title.length > 22 ? title.slice(0, 21) + '…' : title)}</text>
    <text x="0" y="330" text-anchor="middle" font-family="Consolas, monospace" font-size="22" letter-spacing="5" fill="#1a1712" fill-opacity=".6">CURATED · COLLECTED · RELEASED</text>
  </g>
  ${stamp('rgba(255,255,255,.55)')}
</svg>`;
}

/* ── Frontmatter helpers ── */
const FM = /^---\r?\n([\s\S]*?)\r?\n---/;
function setImages(md, paths) {
  const [, fm] = md.match(FM);
  let next = fm.replace(/^images:[^\n]*\r?\n(?:[ \t]+-[^\n]*(?:\r?\n|$))*/m, '');
  next = next.replace(/\s*$/, '');
  if (paths.length) next += `\nimages:\n${paths.map((p) => `  - ${p}`).join('\n')}`;
  return md.replace(FM, `---\n${next}\n---`);
}
const field = (fm, key) => fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, 'm'))?.[1]?.trim() ?? '';

/* ── Main ── */
const files = (await readdir(ITEMS)).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort();
const metas = [];
for (const file of files) {
  const md = await readFile(join(ITEMS, file), 'utf8');
  const fm = md.match(FM)?.[1] ?? '';
  metas.push({ file, md, slug: file.replace(/\.md$/, ''), title: field(fm, 'title'), size: field(fm, 'size'), art: field(fm, 'art') || 'tee', listed: field(fm, 'listed') });
}
// Catalogue numbers follow listing date, oldest first (same rule as the site).
[...metas].sort((a, b) => a.listed.localeCompare(b.listed) || a.slug.localeCompare(b.slug)).forEach((m, i) => (m.no = String(i + 1).padStart(3, '0')));

const jpeg = (img) => img.jpeg({ quality: 84, mozjpeg: true });

for (const m of metas) {
  const dir = join(ASSETS, m.slug);
  if (REMOVE) {
    for (const n of [1, 2, 3]) await rm(join(dir, `sample-${n}.jpg`), { force: true });
    await writeFile(join(ITEMS, m.file), setImages(m.md, []));
    console.log(`  removed samples · ${m.slug}`);
    continue;
  }
  await mkdir(dir, { recursive: true });
  const look = LOOK[m.slug] ?? DEFAULT_LOOK;
  // Detail: zoom 2× into the upper body (collar / toe box / spine).
  const focus = { shoe: [0.12, 0.38], runner: [0.12, 0.38], book: [0.1, 0.12], set: [0.18, 0.3], pants: [0.25, 0.12] }[m.art] ?? [0.25, 0.14];
  const vb = `${W * focus[0]} ${H * focus[1]} ${W / 2} ${H / 2}`;

  await Promise.all([
    jpeg(sharp(Buffer.from(studioSvg(m.art, look)))).toFile(join(dir, 'sample-1.jpg')),
    jpeg(
      sharp(Buffer.from(studioSvg(m.art, look, vb, false))).composite([
        { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${stamp()}</svg>`) },
      ]),
    ).toFile(join(dir, 'sample-2.jpg')),
    jpeg(sharp(Buffer.from(tagSvg(look, m)))).toFile(join(dir, 'sample-3.jpg')),
  ]);

  const paths = [1, 2, 3].map((n) => `../../assets/items/${m.slug}/sample-${n}.jpg`);
  await writeFile(join(ITEMS, m.file), setImages(m.md, paths));
  console.log(`  ✓ ${m.slug} (№ ${m.no})`);
}
console.log(REMOVE ? '\nSamples removed.' : '\nSample photos ready. They are stamped "SAMPLE". Replace them with real photos before launch.');
