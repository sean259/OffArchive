#!/usr/bin/env node
/**
 * Generates the OFFARCHIVE. identity from the site's own typefaces, with letters converted
 * to vector outlines so the files look identical everywhere (no fonts needed):
 *
 *   npm run brand
 *
 * Writes:
 *   src/lib/brand.ts           path data for the inline <Logo> component (follows light/dark theme)
 *   public/favicon.svg         simplified seal (ring + ✳), adapts to the browser's theme
 *   public/brand/*.svg         wordmark, seal and lockup in ink, bone and rust versions
 *   public/brand/*.png         app icon, Apple touch icon and a 1080px avatar for Messenger/Facebook
 */
import opentype from 'opentype.js';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const F = 'node_modules/@fontsource/';
const serif = opentype.loadSync(F + 'instrument-serif/files/instrument-serif-latin-400-normal.woff');
const mono = opentype.loadSync(F + 'dm-mono/files/dm-mono-latin-500-normal.woff');
const C = { ink: '#141412', paper: '#EFEBE4', rust: '#8C3A24', rustLight: '#D0714F', bone: '#ECE7DE', night: '#100F0D' };
const round = (n) => Math.round(n * 100) / 100;

/** Text → outline path with letter-spacing (em). */
function text(font, str, size, x, y, tracking = 0) {
  let cx = x;
  let d = '';
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth / font.unitsPerEm) * size + tracking * size;
  }
  return { d, width: cx - x - tracking * size };
}

/** Eight-spoke asterisk (the ✳ already used for OFFARCHIVE. picks on the site). */
const starLines = (cx, cy, r) =>
  [0, 1, 2, 3]
    .map((i) => {
      const a = (i * Math.PI) / 4;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      return `M${round(cx - dx)} ${round(cy - dy)}L${round(cx + dx)} ${round(cy + dy)}`;
    })
    .join('');

/** Text set around a circle, starting at 12 o'clock, spread evenly over the full ring. */
function ring(font, str, size, cx, cy, r, tracking) {
  const adv = [...str].map((ch) => (font.charToGlyph(ch).advanceWidth / font.unitsPerEm) * size);
  const total = adv.reduce((a, b) => a + b, 0) + tracking * size * adv.length;
  const circ = 2 * Math.PI * r;
  const k = circ / total;
  let pos = 0;
  let out = '';
  [...str].forEach((ch, i) => {
    const mid = (pos + adv[i] / 2) * k;
    const ang = (mid / circ) * 360 - 90;
    const rad = (ang * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const d = font.charToGlyph(ch).getPath(-adv[i] / 2, size * 0.36, size).toPathData(2);
    if (d) out += `<path transform="translate(${round(x)} ${round(y)}) rotate(${round(ang + 90)})" d="${d}"/>`;
    pos += adv[i] + tracking * size;
  });
  return out;
}

/* ── Wordmark: OFFARCHIVE in spaced Instrument Serif capitals + a rust full stop ── */
const W = { size: 100, base: 80, tracking: 0.045 };
const word = text(serif, 'OFFARCHIVE', W.size, 0, W.base, W.tracking);
const dot = { cx: round(word.width + 13), cy: 74.5, r: 7 };
const wordW = Math.ceil(dot.cx + dot.r + 2);
const wordH = 84;

/* ── Seal: ring text around a rust ✳ ── */
const SEAL = 200;
const ringText = 'OFFARCHIVE · PRE-LOVED ARCHIVE · CEBU PH · ';
const sealRing = ring(mono, ringText, 13.2, 100, 100, 80, 0.2);
const sealStar = starLines(100, 100, 30);
const sealSvg = (fg, accent, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SEAL} ${SEAL}" width="${SEAL}" height="${SEAL}">${bg ? `<rect width="${SEAL}" height="${SEAL}" fill="${bg}"/>` : ''}<g fill="${fg}"><circle cx="100" cy="100" r="96" fill="none" stroke="${fg}" stroke-width="1.6"/><circle cx="100" cy="100" r="64" fill="none" stroke="${fg}" stroke-width="1"/>${sealRing}</g><path d="${sealStar}" stroke="${accent}" stroke-width="6" stroke-linecap="round"/></svg>`;

const wordSvg = (fg, accent) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordW} ${wordH}" width="${wordW}" height="${wordH}"><path fill="${fg}" d="${word.d}"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${accent}"/></svg>`;

// Lockup: seal at word cap-height × 2.2, then the wordmark.
const lockScale = 1.15;
const lockW = Math.ceil(SEAL + 48 + wordW * lockScale);
const lockupSvg = (fg, accent) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lockW} ${SEAL}" width="${lockW}" height="${SEAL}"><g fill="${fg}"><circle cx="100" cy="100" r="96" fill="none" stroke="${fg}" stroke-width="1.6"/><circle cx="100" cy="100" r="64" fill="none" stroke="${fg}" stroke-width="1"/>${sealRing}</g><path d="${sealStar}" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><g transform="translate(${SEAL + 48} ${round(100 - (wordH * lockScale) / 2 - 4)}) scale(${lockScale})"><path fill="${fg}" d="${word.d}"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${accent}"/></g></svg>`;

// Favicon: ring text is unreadable at 16px, so just the double ring + ✳ on a rounded tile.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .t { fill: ${C.ink}; } .r { stroke: ${C.paper}; } .s { stroke: ${C.rustLight}; }
    @media (prefers-color-scheme: dark) { .t { fill: ${C.paper}; } .r { stroke: ${C.ink}; } .s { stroke: ${C.rust}; } }
  </style>
  <rect class="t" width="64" height="64" rx="14"/>
  <circle class="r" cx="32" cy="32" r="22" fill="none" stroke-width="2.2"/>
  <path class="s" d="${starLines(32, 32, 11.5)}" stroke-width="4" stroke-linecap="round"/>
</svg>
`;
const iconSvg = (size, bg, fg, accent) => {
  const s = size / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/><circle cx="${size / 2}" cy="${size / 2}" r="${22 * s}" fill="none" stroke="${fg}" stroke-width="${2.2 * s}"/><path d="${starLines(size / 2, size / 2, 11.5 * s)}" stroke="${accent}" stroke-width="${4 * s}" stroke-linecap="round"/></svg>`;
};

/* ── Write everything ── */
mkdirSync('public/brand', { recursive: true });
const files = {
  'public/brand/wordmark-ink.svg': wordSvg(C.ink, C.rust),
  'public/brand/wordmark-bone.svg': wordSvg(C.bone, C.rustLight),
  'public/brand/seal-ink.svg': sealSvg(C.ink, C.rust),
  'public/brand/seal-bone.svg': sealSvg(C.bone, C.rustLight),
  'public/brand/lockup-ink.svg': lockupSvg(C.ink, C.rust),
  'public/brand/lockup-bone.svg': lockupSvg(C.bone, C.rustLight),
  'public/favicon.svg': favicon,
};
for (const [path, svg] of Object.entries(files)) writeFileSync(path, svg);

const png = (svg, size, out) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
await png(iconSvg(180, C.ink, C.paper, C.rustLight), 180, 'public/apple-touch-icon.png');
await png(iconSvg(512, C.ink, C.paper, C.rustLight), 512, 'public/brand/icon-512.png');
// Messenger / Facebook / Instagram profile picture: the full seal on bone, padded for circular crops.
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 280 280"><rect x="-40" y="-40" width="280" height="280" fill="${C.paper}"/>${sealSvg(C.ink, C.rust).replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</svg>`;
await png(avatar, 1080, 'public/brand/avatar-1080.png');

// Path data for the inline <Logo> component (colours come from CSS so it follows the theme).
writeFileSync(
  'src/lib/brand.ts',
  `// Generated by \`npm run brand\` (tools/brand.mjs). Do not edit by hand.
export const WORDMARK = { width: ${wordW}, height: ${wordH}, d: ${JSON.stringify(word.d)}, dot: ${JSON.stringify(dot)} } as const;
export const SEAL = { size: ${SEAL}, ring: ${JSON.stringify(sealRing)}, star: ${JSON.stringify(sealStar)} } as const;
`,
);
console.log('✓ Brand files written: public/brand/, public/favicon.svg, public/apple-touch-icon.png, src/lib/brand.ts');
