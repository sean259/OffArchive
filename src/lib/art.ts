/**
 * Line-art illustrations used as stand-ins until real product photos are added.
 * Each value is an SVG path drawn on a 100 × 125 viewBox.
 */
const TEE_BODY =
  'M35 28 L20 36 L10 56 L24 62 L28 52 L28 100 L72 100 L72 52 L76 62 L90 56 L80 36 L65 28 Q50 40 35 28Z';
const SHOE_BODY = 'M12 82 Q12 66 22 64 L38 60 Q44 70 56 70 L74 72 Q92 74 92 86 V92 H12Z M12 92 H92';

export const ART = {
  tee: `${TEE_BODY} M40 31 Q50 42 60 31`,
  overshirt: `${TEE_BODY} M35 28 L50 40 L65 28 M50 40 V100 M34 60h12v12H34z M54 60h12v12H54z`,
  pants: 'M30 20 H70 L76 106 H55 L50 54 L45 106 H24Z M30 28 H70 M50 28 V54',
  jacket:
    'M36 24 L20 32 L12 100 L24 102 L30 62 L30 104 L70 104 L70 62 L76 102 L88 100 L80 32 L64 24 Q50 34 36 24Z M50 32 V104',
  shoe: `${SHOE_BODY} M40 62 l6 8 M47 60 l6 8 M54 61 l6 8`,
  runner: `${SHOE_BODY} M26 80 H72 M30 74 L36 80`,
  book: 'M28 22 H76 V104 H28Z M28 22 Q22 22 22 28 V98 Q22 104 28 104 M36 42 H68 M36 52 H62',
  set: 'M16 52 H84 V96 H16Z M40 52 V44 H60 V52 M34 66 L50 86 L66 66 M50 66 V86',
} as const;

export type ArtKind = keyof typeof ART;
export const ART_KINDS = Object.keys(ART) as [ArtKind, ...ArtKind[]];
