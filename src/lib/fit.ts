/**
 * Fit finder: estimates a visitor's size from height + weight and compares it with a piece.
 * Pure functions, shared by the item page, the size guide and the "Your size" badges.
 *
 * These are estimates from typical men's sizing charts, not guarantees. Garment
 * measurements always win over tag sizes when they're listed. Tune the numbers below
 * if your buyers consistently tell you something runs off.
 */
export type Pref = 'fitted' | 'regular' | 'relaxed';
export type Garment = 'top' | 'bottom';
export type Tone = 'good' | 'roomy' | 'snug' | 'big' | 'small' | 'unknown';

export interface Profile {
  heightCm: number;
  weightKg: number;
  pref: Pref;
  units?: { h: 'cm' | 'ft'; w: 'kg' | 'lb' };
}

export interface FitItem {
  garment: Garment;
  size: string;
  m?: Partial<Record<'pitToPit' | 'length' | 'waist' | 'inseam', string>>;
}

export const LIMITS = { heightCm: [130, 220], weightKg: [35, 180] } as const;
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

// Typical men's tops: centre height (cm) / weight (kg) per size, and ideal flat pit-to-pit (in) for a regular fit.
const CHART = [
  { h: 161, w: 50, p2p: 18.5 },
  { h: 168, w: 59, p2p: 19.75 },
  { h: 174, w: 68.5, p2p: 21.25 },
  { h: 179, w: 78.5, p2p: 22.75 },
  { h: 184, w: 89, p2p: 24.25 },
  { h: 189, w: 101, p2p: 25.75 },
];
const P2P_PREF: Record<Pref, number> = { fitted: -0.5, regular: 0, relaxed: 1.25 };
const LENGTH_PREF: Record<Pref, number> = { fitted: -0.25, regular: 0, relaxed: 0.75 };

/* ── Units ─────────────────────────────── */
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54;
export const cmToFtIn = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inch: total % 12 };
};
export const lbToKg = (lb: number) => lb * 0.45359237;
export const kgToLb = (kg: number) => kg / 0.45359237;

export const isValid = (p: Partial<Profile>): p is Profile =>
  typeof p.heightCm === 'number' &&
  typeof p.weightKg === 'number' &&
  p.heightCm >= LIMITS.heightCm[0] &&
  p.heightCm <= LIMITS.heightCm[1] &&
  p.weightKg >= LIMITS.weightKg[0] &&
  p.weightKg <= LIMITS.weightKg[1];

/* ── Parsing what's written on listings ── */
/** "22\"" → 22, "56 cm" → 22.0, "23.5 in" → 23.5 */
export function parseInches(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return /cm/i.test(s) ? n / 2.54 : n;
}

/** "M" → 2, "XXL"/"2XL" → 5, "Large" → 3. -1 if it isn't a letter size. */
export function letterIndex(tag: string): number {
  const t = tag.trim().toUpperCase().replace(/\s+/g, '');
  const map: Record<string, number> = {
    XXS: 0, XS: 0, S: 1, SMALL: 1, M: 2, MEDIUM: 2, L: 3, LARGE: 3, XL: 4, XLARGE: 4, XXL: 5, '2XL': 5, XXXL: 5, '3XL': 5,
  };
  return map[t] ?? -1;
}

/** "32" / "W32" / "32x30" / "W32 L30" / "W32/L30" → 32 (waist). undefined if not numeric. */
export function waistFromTag(tag: string): number | undefined {
  const m = tag.trim().match(/^W?\s?(\d{2})(?:\s*(?:[x×/]\s*L?|L)\s*\d{2})?$/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 24 && n <= 48 ? n : undefined;
}

/** 21.3 → 21.5", 22 → 22" (rounded to the nearest half inch) */
export function inches(n: number) {
  const r = Math.round(n * 2) / 2;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}"`;
}

/* ── Estimates ─────────────────────────── */
/** Best letter size for tops, plus the neighbouring size when they're borderline. */
export function topSize(p: Profile): { index: number; alt?: number; label: string } {
  const scores = CHART.map((c, i) => ({
    i,
    s: (Math.abs(p.weightKg - c.w) / 10) * 0.75 + (Math.abs(p.heightCm - c.h) / 7) * 0.25,
  })).sort((a, b) => a.s - b.s);
  const [best, second] = scores;
  const borderline = Math.abs(best.i - second.i) === 1 && second.s - best.s < 0.22;
  let index = best.i;
  let alt: number | undefined;
  if (borderline) {
    const lo = Math.min(best.i, second.i);
    const hi = Math.max(best.i, second.i);
    // Preference decides which side of the line to land on.
    index = p.pref === 'relaxed' ? hi : p.pref === 'fitted' ? lo : best.i;
    alt = index === lo ? hi : lo;
  }
  const label = alt === undefined ? SIZES[index] : `${SIZES[Math.min(index, alt)]}–${SIZES[Math.max(index, alt)]}`;
  return { index, alt, label };
}

/** Ideal flat pit-to-pit (inches) for this person. */
export function idealPitToPit(p: Profile) {
  const { index, alt } = topSize(p);
  const base = alt === undefined ? CHART[index].p2p : (CHART[index].p2p + CHART[alt].p2p) / 2;
  return base + P2P_PREF[p.pref];
}

/** Ideal top length (inches, shoulder to hem). */
export const idealLength = (p: Profile) => p.heightCm * 0.166 + LENGTH_PREF[p.pref];

/** Estimated waist and inseam (inches) for bottoms. */
export function bottomSize(p: Profile) {
  const waist = 0.28 * p.weightKg + 13 - (p.heightCm - 172) * 0.05;
  const inseam = p.heightCm * 0.177;
  return { waist, inseam };
}

/* ── Verdicts ──────────────────────────── */
export interface Row {
  label: string;
  actual: string;
  ideal: string;
  note: string;
  tone: Tone;
}
export interface Result {
  you: string; // "M", "M–L", "W32–33"
  tone: Tone;
  headline: string;
  detail: string;
  rows: Row[];
}

const TOP_COPY: Record<Tone, [string, string]> = {
  good: ['Should fit you well', 'Close to your size for the way you like to wear it.'],
  roomy: ['Roomier than your usual', 'Expect a relaxed, easy fit on you.'],
  big: ['Oversized on you', 'Noticeably bigger than your size. Great if you like it baggy.'],
  snug: ['A snug fit on you', 'Closer to the body than your usual. Could be tight across the chest.'],
  small: ['Likely too small', 'Probably smaller than your size, even for a fitted look.'],
  unknown: ['Ask for measurements', 'We can’t compare this tag size. Message us and we’ll measure it for you.'],
};
const BOTTOM_COPY: Record<Tone, [string, string]> = {
  good: ['Should fit you well', 'The waist is right around your estimate.'],
  roomy: ['A little loose at the waist', 'Wearable with a belt, or for a relaxed fit.'],
  big: ['Too big at the waist', 'Several inches over your estimate. Only if you plan to tailor it.'],
  snug: ['Snug at the waist', 'Slightly under your estimate. Fine if the fabric has stretch.'],
  small: ['Likely too small', 'Well under your estimated waist.'],
  unknown: ['Ask for measurements', 'We can’t read a waist size from this tag. Message us and we’ll measure it.'],
};

const toneFromDiff = (d: number, ok: number, far: number): Tone =>
  Math.abs(d) <= ok ? 'good' : d > far ? 'big' : d > ok ? 'roomy' : d < -far ? 'small' : 'snug';

function topResult(p: Profile, item: FitItem): Result {
  const you = topSize(p);
  const rows: Row[] = [];
  const p2p = parseInches(item.m?.pitToPit);
  const len = parseInches(item.m?.length);
  const ideal = idealPitToPit(p);
  const idealLen = idealLength(p);
  let tone: Tone = 'unknown';

  if (p2p !== undefined) {
    const d = p2p - ideal;
    tone = toneFromDiff(d, 0.9, 2.5);
    rows.push({
      label: 'Pit to pit',
      actual: inches(p2p),
      ideal: `${inches(ideal - 0.75)}–${inches(ideal + 0.75)}`,
      note: Math.abs(d) <= 0.9 ? 'Just right' : d > 0 ? `${inches(d)} roomier` : `${inches(-d)} tighter`,
      tone: toneFromDiff(d, 0.9, 2.5),
    });
  }
  if (len !== undefined) {
    const d = len - idealLen;
    rows.push({
      label: 'Length',
      actual: inches(len),
      ideal: `${inches(idealLen - 1)}–${inches(idealLen + 1)}`,
      note: Math.abs(d) <= 1 ? 'Good length' : d > 0 ? `${inches(d)} longer` : `${inches(-d)} shorter`,
      tone: Math.abs(d) <= 1 ? 'good' : d > 0 ? 'roomy' : 'snug',
    });
  }
  if (tone === 'unknown') {
    const tag = letterIndex(item.size);
    if (tag >= 0) {
      let d = tag === you.alt ? 0 : tag - you.index;
      // One size up is the point of a relaxed fit; one size down is the point of a fitted one.
      if (p.pref === 'relaxed' && d > 0) d -= 1;
      if (p.pref === 'fitted' && d < 0) d += 1;
      tone = d === 0 ? 'good' : d === 1 ? 'roomy' : d >= 2 ? 'big' : d === -1 ? 'snug' : 'small';
    }
  }
  const [headline, detail] = TOP_COPY[tone];
  return { you: you.label, tone, headline, detail, rows };
}

function bottomResult(p: Profile, item: FitItem): Result {
  const est = bottomSize(p);
  const rows: Row[] = [];
  const measuredWaist = parseInches(item.m?.waist);
  const waist = measuredWaist ?? waistFromTag(item.size);
  const inseam = parseInches(item.m?.inseam);
  const lo = Math.round(est.waist - 0.5);
  let tone: Tone = 'unknown';

  if (waist !== undefined) {
    const d = waist - est.waist;
    tone = toneFromDiff(d, 1, 2.5);
    rows.push({
      label: measuredWaist !== undefined ? 'Waist' : 'Waist (tag)',
      actual: inches(waist),
      ideal: `${lo}–${lo + 1}"`,
      note: Math.abs(d) <= 1 ? 'Just right' : d > 0 ? `${inches(d)} looser` : `${inches(-d)} tighter`,
      tone,
    });
  }
  if (inseam !== undefined) {
    const d = inseam - est.inseam;
    rows.push({
      label: 'Inseam',
      actual: inches(inseam),
      ideal: inches(est.inseam),
      note: Math.abs(d) <= 1.5 ? 'Good length' : d > 0 ? `${inches(d)} long, cuff or hem` : `${inches(-d)} short, cropped`,
      tone: Math.abs(d) <= 1.5 ? 'good' : d > 0 ? 'roomy' : 'snug',
    });
  }
  const [headline, detail] = BOTTOM_COPY[tone];
  return { you: `W${lo}–${lo + 1}`, tone, headline, detail, rows };
}

export const fitResult = (p: Profile, item: FitItem): Result =>
  item.garment === 'bottom' ? bottomResult(p, item) : topResult(p, item);

/** Short verdict used for "Your size" badges and the archive "My size" filter. */
export const fitsWell = (p: Profile, item: FitItem) => fitResult(p, item).tone === 'good';
