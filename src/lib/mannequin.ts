/**
 * Size mannequin: draws the visitor's body to scale (from height + weight) and the piece on top
 * of it (from its measurements, or typical numbers for its tag size), so people can see where
 * the hem lands and how wide it sits. Pure function → SVG string; drawn in inches, y = 0 is the floor.
 *
 * Proportions are average adult proportions, not a body scan. Good enough to tell cropped from
 * long and fitted from oversized, which is the question people actually have.
 */
import { bottomSize, idealPitToPit, idealLength, letterIndex, parseInches, waistFromTag, inches, type FitItem, type Profile } from './fit';

export interface Mannequin {
  svg: string;
  notes: string[];
  /** True when the piece's numbers come from its tag size, not real measurements. */
  estimated: boolean;
  /** False when there's nothing to draw the piece from (body only). */
  drawn: boolean;
}

type Pt = [number, number];

/** Typical flat measurements per letter size (XS…XXL), used when a listing has none. */
const TAG_P2P = [18.5, 19.75, 21.25, 22.75, 24.25, 25.75];
const TAG_LENGTH = [26.5, 27.5, 28.5, 29.5, 30.5, 31.5];
const TYPICAL_INSEAM = 31;

/** Front-view width of a body/garment from its circumference (an ellipse ~0.7 deep as it is wide). */
const frontWidth = (circ: number) => circ / 2.69;

/* ── Path helpers ───────────────────────────── */
const f = (n: number) => +n.toFixed(2);
/** Smooth curve through points (Catmull-Rom → cubic Bézier), continuing an open path. */
function smooth(pts: Pt[], yFlip: (y: number) => number): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(yFlip(c1[1]))} ${f(c2[0])} ${f(yFlip(c2[1]))} ${f(p2[0])} ${f(yFlip(p2[1]))}`;
  }
  return d;
}
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [-x, y] as Pt).reverse();

export function mannequin(p: Profile, item: FitItem): Mannequin {
  const H = p.heightCm / 2.54;
  const Y = (y: number) => H + 2 - y; // floor-up inches → SVG y
  const M = (pt: Pt) => `${f(pt[0])} ${f(Y(pt[1]))}`;

  /* ── Body landmarks (heights as a share of stature) ── */
  const y = {
    head: 0.935 * H,
    neck: 0.857 * H, // high point of the shoulder, where top lengths are measured from
    shoulder: 0.818 * H,
    chest: 0.73 * H,
    waist: 0.6 * H,
    hip: 0.52 * H,
    crotch: 0.47 * H,
    knee: 0.28 * H,
    ankle: 0.04 * H,
    wrist: 0.485 * H,
  };
  // Circumferences from the fit model: a regular-fit pit-to-pit carries ~4.5" of ease.
  const chestCirc = 2 * idealPitToPit({ ...p, pref: 'regular' }) - 4.5;
  const waistCirc = bottomSize(p).waist;
  const hipCirc = waistCirc + 5;
  const hw = {
    neck: 0.032 * H,
    chest: frontWidth(chestCirc) / 2,
    waist: frontWidth(waistCirc) / 2,
    hip: frontWidth(hipCirc) / 2,
  };
  const shoulderHW = Math.max(0.118 * H, hw.chest * 1.1);
  const armW = 0.046 * H;
  const armIn = Math.max(hw.chest, hw.hip) + 0.35;
  const kneeHW = Math.max(2.2, hw.hip * 0.56);
  const ankleHW = Math.max(1.5, hw.hip * 0.3);

  // Right half of the torso + leg outline, floor-up coordinates.
  const outer: Pt[] = [
    [hw.neck, y.neck],
    [shoulderHW * 0.8, y.neck - 0.9],
    [shoulderHW, y.shoulder],
    [hw.chest, y.chest - 1],
    [hw.waist, y.waist],
    [hw.hip, y.hip],
    [hw.hip * 0.9, y.crotch - 3],
    [kneeHW, y.knee],
    [ankleHW, y.ankle],
  ];
  const inner: Pt[] = [
    [0.55, y.ankle],
    [0.75, y.knee],
    [0.6, y.crotch - 2],
    [0, y.crotch],
  ];
  const yFlip = Y;
  const half = (side: 1 | -1) => {
    const o = side === 1 ? outer : outer.map(([x, yy]) => [-x, yy] as Pt);
    const i = side === 1 ? inner : inner.map(([x, yy]) => [-x, yy] as Pt);
    return { o, i };
  };
  const R = half(1);
  const L = half(-1);
  const foot = (s: 1 | -1) => [`L${M([s * (ankleHW + 1.4), 0.2])}`, `L${M([s * 0.4, 0.2])}`];
  const bodyPath =
    `M${M(R.o[0])}` +
    smooth(R.o, yFlip) +
    foot(1).join(' ') +
    ` L${M(R.i[0])}` +
    smooth(R.i, yFlip) +
    smooth(mirror(R.i), yFlip) +
    ` L${M([-0.4, 0.2])} L${M([-(ankleHW + 1.4), 0.2])} L${M(L.o[L.o.length - 1])}` +
    smooth([...L.o].reverse(), yFlip) +
    ' Z';
  const arm = (s: 1 | -1) => {
    const pts: Pt[] = [
      [s * (shoulderHW - 0.4), y.shoulder + 0.6],
      [s * (shoulderHW + armW * 0.55), y.shoulder - 2.5],
      [s * (armIn + armW * 0.95), 0.62 * H],
      [s * (armIn + armW * 0.8), y.wrist],
      [s * (armIn + armW * 0.45), y.wrist - 3.2],
      [s * (armIn + armW * 0.05), y.wrist],
      [s * armIn, 0.64 * H],
      [s * (hw.chest - 0.2), y.chest - 1.2],
    ];
    return `M${M(pts[0])}` + smooth(pts, yFlip) + ' Z';
  };
  const headRx = 0.047 * H;
  const headRy = 0.064 * H;

  /* ── The piece ───────────────────────────── */
  const notes: string[] = [];
  let garment = '';
  let estimated = false;
  let drawn = true;
  let hemY: number | null = null;

  if (item.garment === 'top') {
    const tag = letterIndex(item.size);
    let p2p = parseInches(item.m?.pitToPit);
    let len = parseInches(item.m?.length);
    if (p2p === undefined && tag >= 0) (p2p = TAG_P2P[tag]), (estimated = true);
    if (len === undefined && tag >= 0) (len = TAG_LENGTH[tag]), (estimated = true);
    if (p2p === undefined || len === undefined) {
      drawn = false;
    } else {
      hemY = y.neck - len;
      const gHW = frontWidth(p2p * 2) / 2;
      const gShoulder = Math.max(shoulderHW + 0.3, gHW * 1.04); // roomy pieces drop the shoulder seam
      const sleeveEnd = item.style === 'long' ? y.wrist - 0.5 : y.shoulder - Math.max(6, 0.11 * H);
      const ease = Math.max(0, gHW - hw.chest) * 0.35;
      const right: Pt[] = [
        [hw.neck + 0.7, y.neck + 0.25],
        [gShoulder, y.neck - 1.3],
        [armIn + armW + 0.7 + ease, sleeveEnd + (item.style === 'long' ? 0 : 1.2)],
        [armIn - 0.35, sleeveEnd],
        [gHW, y.chest - 1.3],
        [gHW + 0.15, hemY + 1.5],
        [gHW + 0.15, hemY],
        [0, hemY],
      ];
      const pts = [...right, ...mirror(right).slice(1)];
      // Straight lines read better for a garment (seams, hem) than curves.
      garment = `M${M([-(hw.neck + 0.7), y.neck + 0.25])} Q${M([0, y.neck - 2.6])} ${M(right[0])} ` + pts.slice(1).map((pt) => `L${M(pt)}`).join(' ') + ' Z';

      // How it sits.
      const ease2 = p2p * 2 - chestCirc;
      notes.push(
        ease2 < 2
          ? 'Tight across your chest.'
          : ease2 < 3.5
            ? 'Close, fitted feel through the chest.'
            : ease2 < 8
              ? 'Easy, regular fit through the chest.'
              : ease2 < 12
                ? 'Relaxed and roomy on you.'
                : 'Oversized: drapes off your shoulders.',
      );
      notes.push(
        hemY > y.waist + 1
          ? 'Cropped: ends above your waist.'
          : hemY > y.crotch + 2.5
            ? 'Shorter length: ends around your belt line.'
            : hemY >= y.crotch - 3.5
              ? 'Regular length: covers your waistband.'
              : hemY >= 0.39 * H
                ? 'Long: falls past your seat.'
                : 'Extra long: reaches your thighs.',
      );
      const d = len - idealLength(p);
      if (Math.abs(d) > 1) notes.push(`${inches(Math.abs(d))} ${d > 0 ? 'longer' : 'shorter'} than your usual length.`);
    }
  } else {
    let waist = parseInches(item.m?.waist) ?? waistFromTag(item.size);
    // "W30 L34" / "30x34" tags carry the inseam too.
    const tagInseam = item.size.match(/(?:L\s?|[x×/]\s*L?)(\d{2})\s*$/i);
    let inseam = parseInches(item.m?.inseam) ?? (tagInseam ? Number(tagInseam[1]) : undefined);
    if (!item.m?.waist && waist !== undefined) estimated = true;
    if (!item.m?.inseam && inseam !== undefined && !tagInseam) estimated = true;
    if (inseam === undefined) (inseam = TYPICAL_INSEAM), (estimated = true);
    if (waist === undefined) {
      drawn = false;
    } else {
      const top = y.waist - 1.2; // trousers sit a little below the natural waist
      const gW = frontWidth(waist) / 2;
      const gHip = Math.max(hw.hip + 0.5, gW * 1.08);
      hemY = Math.max(0.3, y.crotch - inseam);
      const legOut = Math.max(ankleHW + 1.1, gHip * 0.55);
      const right: Pt[] = [
        [gW, top],
        [gHip, y.hip - 0.5],
        [gHip * 0.92, y.crotch - 3],
        [legOut, hemY],
        [0.25, hemY],
        [0.35, y.crotch - 2.5],
        [0, y.crotch - 0.6],
      ];
      garment = `M${M([-gW, top])} L${M(right[0])} ` + [...right.slice(1), ...mirror(right).slice(1)].map((pt) => `L${M(pt)}`).join(' ') + ' Z';
      const wd = waist - waistCirc;
      notes.push(
        wd < -1.5
          ? 'Too tight at your waist.'
          : wd < -0.5
            ? 'Snug at the waist.'
            : wd <= 1.5
              ? 'Right at your waist.'
              : wd <= 3
                ? 'A little loose at the waist: wear a belt.'
                : 'Big at the waist: belt or tailor it.',
      );
      const extra = y.crotch - inseam - y.ankle;
      notes.push(
        extra < -1.5
          ? `Long: about ${inches(-extra)} extra, so it stacks at your shoes. Cuff or hem it.`
          : extra > 2.5
            ? `Cropped: ends about ${inches(extra)} above your ankle.`
            : 'Full length: ends at your ankles.',
      );
    }
  }
  if (!drawn) notes.push('We can’t draw this piece from its tag. Ask the seller for measurements.');

  /* ── Scale: ruler with the visitor's height ── */
  const halfW = Math.max(shoulderHW, armIn + armW) + 5;
  const rx = -halfW + 1.2;
  const ticks: string[] = [];
  for (let cm = 0; cm <= p.heightCm; cm += 10) {
    const ty = Y(cm / 2.54);
    const major = cm % 50 === 0;
    ticks.push(`<line x1="${f(rx)}" x2="${f(rx + (major ? 1.6 : 0.9))}" y1="${f(ty)}" y2="${f(ty)}"/>`);
  }
  const fs = f(Math.max(2.1, H * 0.034));
  const hemMark =
    hemY !== null && drawn
      ? `<g class="mq-hem"><line x1="${f(-halfW + 3)}" x2="${f(halfW - 0.5)}" y1="${f(Y(hemY))}" y2="${f(Y(hemY))}"/><text x="${f(halfW - 0.5)}" y="${f(Y(hemY) - 0.8)}" text-anchor="end" font-size="${fs}">hem</text></g>`
      : '';

  const svg = `<svg class="mq" viewBox="${f(-halfW)} 0 ${f(halfW * 2)} ${f(H + 4)}" role="img" aria-label="Your outline at ${Math.round(p.heightCm)} cm with this piece drawn on it to scale. ${notes.join(' ')}">
  <g class="mq-ruler"><line x1="${f(rx)}" x2="${f(rx)}" y1="${f(Y(0))}" y2="${f(Y(H))}"/>${ticks.join('')}<text x="${f(rx + 2)}" y="${f(Y(H) + fs * 0.35)}" font-size="${fs}">${Math.round(p.heightCm)} cm</text></g>
  <g class="mq-body">
    <ellipse cx="0" cy="${f(Y(y.head))}" rx="${f(headRx)}" ry="${f(headRy)}"/>
    <path d="${arm(1)}"/><path d="${arm(-1)}"/>
    <path d="${bodyPath}"/>
  </g>
  ${garment ? `<path class="mq-piece${estimated ? ' est' : ''}" d="${garment}"/>` : ''}
  ${hemMark}
  <line class="mq-floor" x1="${f(-halfW + 2)}" x2="${f(halfW - 1)}" y1="${f(Y(0))}" y2="${f(Y(0))}"/>
</svg>`;

  return { svg, notes, estimated, drawn };
}
