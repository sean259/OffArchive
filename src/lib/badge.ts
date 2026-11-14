/**
 * Verified-seller badge: a scalloped seal with a check, sized in em so it follows the text
 * it sits next to. One string shared by Astro components and browser-rendered HTML.
 */
const seal = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 9.4 : 11.2;
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
})();

export const VERIFIED_BADGE = `<span class="vbadge" title="Verified seller"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="vb-seal" d="${seal}"/><path class="vb-check" d="M7.6 12.4l3 3 5.8-6.2"/></svg><span class="sr-only">Verified seller</span></span>`;
