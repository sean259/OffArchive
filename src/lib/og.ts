/**
 * Build-time share images (Open Graph, 1200×630) rendered with Satori → PNG via sharp.
 * Used for the homepage/default card and for items that don't have photos yet.
 */
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children },
});

const C = { paper: '#EFEBE4', paper2: '#E6E1D8', ink: '#141412', ink2: '#2B2A26', muted: '#6C675E', accent: '#8C3A24', ok: '#5C6A4A', hold: '#A8812F' };

let fonts: Parameters<typeof satori>[1]['fonts'] | undefined;
async function loadFonts() {
  if (fonts) return fonts;
  const f = (pkg: string, file: string) => readFile(join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));
  fonts = [
    { name: 'Serif', data: await f('instrument-serif', 'instrument-serif-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Serif', data: await f('instrument-serif', 'instrument-serif-latin-400-italic.woff'), weight: 400, style: 'italic' },
    { name: 'Serif', data: await f('instrument-serif', 'instrument-serif-latin-ext-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Mono', data: await f('dm-mono', 'dm-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Mono', data: await f('dm-mono', 'dm-mono-latin-ext-400-normal.woff'), weight: 400, style: 'normal' },
  ];
  return fonts;
}

async function toPng(tree: Node) {
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

const label = (text: string, color = C.muted) =>
  h('div', { fontFamily: 'Mono', fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color }, text);

const wordmark = () =>
  h('div', { fontFamily: 'Mono', fontSize: 24, letterSpacing: 3, color: C.ink }, 'OFFARCHIVE', h('span', { color: C.accent }, '.'));

const artImg = (path: string, size: number) => ({
  type: 'img',
  props: {
    width: size,
    height: size * 1.25,
    src: `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><path d="${path}" fill="none" stroke="${C.ink2}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    ).toString('base64')}`,
  },
});

/** Default share card for the homepage and pages without their own image. */
export function defaultCard(opts: { tagline: string; location: string; arts: string[] }) {
  return toPng(
    h(
      'div',
      { width: '100%', height: '100%', background: C.paper, padding: '56px 64px', flexDirection: 'column', justifyContent: 'space-between' },
      h('div', { justifyContent: 'space-between', alignItems: 'center' }, wordmark(), label(`Pre-loved archive · ${opts.location}`)),
      h(
        'div',
        { alignItems: 'flex-end', justifyContent: 'space-between' },
        h(
          'div',
          { flexDirection: 'column', fontFamily: 'Serif', fontSize: 118, lineHeight: 0.9, color: C.ink, letterSpacing: -2 },
          h('div', {}, 'Not everything'),
          h('div', {}, 'needs to be ', h('span', { fontStyle: 'italic', color: C.accent }, 'new.')),
        ),
        h(
          'div',
          { gap: 14 },
          ...opts.arts.slice(0, 2).map((a) => h('div', { background: C.paper2, padding: 18 }, artImg(a, 120))),
        ),
      ),
      h('div', { justifyContent: 'space-between', borderTop: `1px solid rgba(20,20,18,.15)`, paddingTop: 22 }, label(opts.tagline), label('Message to reserve', C.ink)),
    ),
  );
}

/** Per-item share card: catalogue number, title, price, status and the illustration. */
export function itemCard(opts: { no: string; title: string; category: string; price: string; size: string; condition: string; status: 'available' | 'reserved' | 'sold'; art: string }) {
  const statusText = { available: 'Available', reserved: 'Reserved', sold: 'Sold' }[opts.status];
  const dot = { available: C.ok, reserved: C.hold, sold: C.muted }[opts.status];
  return toPng(
    h(
      'div',
      { width: '100%', height: '100%', background: C.paper },
      h(
        'div',
        { flex: 1, flexDirection: 'column', justifyContent: 'space-between', padding: '56px 56px 52px 64px' },
        wordmark(),
        h(
          'div',
          { flexDirection: 'column', gap: 18 },
          label(`No. ${opts.no} — ${opts.category}`),
          h('div', { fontFamily: 'Serif', fontSize: opts.title.length > 22 ? 84 : 104, lineHeight: 0.92, color: C.ink, letterSpacing: -1.5, maxWidth: 620 }, opts.title),
          // The bundled fonts have no ₱ glyph, so the currency is set as a small PHP label.
          h(
            'div',
            { alignItems: 'flex-start', gap: 12, marginTop: 6 },
            h('div', { fontFamily: 'Mono', fontSize: 22, letterSpacing: 2, color: C.muted, marginTop: 12 }, 'PHP'),
            h('div', { fontFamily: 'Serif', fontSize: 72, color: C.ink, lineHeight: 1 }, opts.price.replace(/[^0-9,.]/g, '')),
          ),
        ),
        h(
          'div',
          { gap: 28, alignItems: 'center' },
          h('div', { alignItems: 'center', gap: 10 }, h('div', { width: 12, height: 12, borderRadius: 6, background: dot }), label(statusText, C.ink)),
          ...(opts.size ? [label(opts.size)] : []),
          label(opts.condition),
        ),
      ),
      h('div', { width: 470, background: C.paper2, alignItems: 'center', justifyContent: 'center' }, artImg(opts.art, 300)),
    ),
  );
}
