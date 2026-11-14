// Fit finder behaviour + "Your size" badges on cards.
import {
  fitResult,
  fitsWell,
  topSize,
  bottomSize,
  idealPitToPit,
  idealLength,
  inches,
  isValid,
  ftInToCm,
  cmToFtIn,
  lbToKg,
  kgToLb,
  type FitItem,
  type Pref,
  type Profile,
} from '../lib/fit';
import { getProfile, setProfile } from '../lib/fit-profile';
import { mannequin } from '../lib/mannequin';

const TONE_MARK: Record<string, string> = { good: '✓', roomy: '+', big: '++', snug: '−', small: '−−', unknown: '?' };
const TONE_SHORT: Record<string, string> = {
  good: 'Fits you well',
  roomy: 'Roomy on you',
  big: 'Oversized on you',
  snug: 'Snug on you',
  small: 'Likely too small',
  unknown: 'Ask for measurements',
};

/* ── Card badges + archive filter data ── */
function markCards(p: Profile | null) {
  document.querySelectorAll<HTMLElement>('[data-card][data-fit]').forEach((card) => {
    let item: FitItem | null = null;
    try {
      item = JSON.parse(card.dataset.fit!);
    } catch {
      /* skip */
    }
    const fits = Boolean(p && item && fitsWell(p, item));
    card.dataset.fits = fits ? '1' : '0';
    const wrap = card.querySelector('.media-wrap');
    let badge = wrap?.querySelector('.fit-badge');
    if (fits && wrap && !badge) {
      badge = document.createElement('span');
      badge.className = 'fit-badge label';
      badge.textContent = '✓ Your size';
      wrap.append(badge);
    } else if (!fits) badge?.remove();
  });
  window.dispatchEvent(new CustomEvent('fit:applied', { detail: { hasProfile: Boolean(p) } }));
}

/* ── Size mannequin: the visitor's outline with this piece drawn on it to scale ── */
function mannequinHtml(p: Profile, item: FitItem) {
  const mq = mannequin(p, item);
  return `
    <figure class="mq-wrap">
      <div class="mq-art">${mq.svg}</div>
      <figcaption>
        <span class="label muted">How it sits on you</span>
        <ul>${mq.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
        <p class="mq-key label muted">
          <span><i class="k-you"></i>You, to scale</span>
          ${mq.drawn ? `<span><i class="k-piece${mq.estimated ? ' est' : ''}"></i>This piece${mq.estimated ? ' (estimated from tag size)' : ''}</span>` : ''}
        </p>
      </figcaption>
    </figure>`;
}

/* ── Finder widgets ── */
function initFinder(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-ff-form]')!;
  const out = root.querySelector<HTMLElement>('[data-ff-result]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-ff-clear]')!;
  const item: FitItem | null = root.dataset.item ? JSON.parse(root.dataset.item) : null;
  const f = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const hintHtml = out.innerHTML;

  let hUnit: 'cm' | 'ft' = 'cm';
  let wUnit: 'kg' | 'lb' = 'kg';
  // Fit preference is no longer asked: the size mannequin shows how roomy a piece is instead.
  const pref: Pref = 'regular';

  const setPressed = (sel: string, match: (b: HTMLElement) => boolean) =>
    root.querySelectorAll<HTMLElement>(sel).forEach((b) => b.setAttribute('aria-pressed', String(match(b))));

  function showUnits() {
    root.querySelector<HTMLElement>('[data-h="cm"]')!.hidden = hUnit !== 'cm';
    root.querySelector<HTMLElement>('[data-h="ft"]')!.hidden = hUnit !== 'ft';
    root.querySelector('[data-w-unit]')!.textContent = wUnit;
    setPressed('[data-unit="h"]', (b) => b.dataset.val === hUnit);
    setPressed('[data-unit="w"]', (b) => b.dataset.val === wUnit);
  }

  function read(): Partial<Profile> {
    const num = (n: string) => (f(n).value.trim() === '' ? NaN : Number(f(n).value));
    const heightCm = hUnit === 'cm' ? num('hcm') : ftInToCm(num('hft'), Number.isNaN(num('hin')) ? 0 : num('hin'));
    const weightKg = wUnit === 'kg' ? num('w') : lbToKg(num('w'));
    return { heightCm, weightKg, pref, units: { h: hUnit, w: wUnit } };
  }

  function fill(p: Profile) {
    hUnit = p.units?.h ?? 'cm';
    wUnit = p.units?.w ?? 'kg';
    if (hUnit === 'cm') f('hcm').value = String(Math.round(p.heightCm));
    else {
      const { ft, inch } = cmToFtIn(p.heightCm);
      f('hft').value = String(ft);
      f('hin').value = String(inch);
    }
    f('w').value = String(Math.round(wUnit === 'kg' ? p.weightKg : kgToLb(p.weightKg)));
    showUnits();
  }

  function render(p: Profile | null) {
    clear.hidden = !p && !getProfile();
    if (!p) {
      out.innerHTML = hintHtml;
      return;
    }
    if (item) {
      const r = fitResult(p, item);
      out.innerHTML = `
        <div class="you"><span class="label muted">Your usual size</span><strong>${r.you}</strong></div>
        <div class="verdict ${r.tone}">
          <span class="mark" aria-hidden="true">${TONE_MARK[r.tone]}</span>
          <div><div class="t">${r.headline}</div><p>${r.detail}</p></div>
        </div>
        ${mannequinHtml(p, item)}
        ${
          r.rows.length
            ? `<table><thead><tr><th>Measure</th><th>This piece</th><th>Your ideal</th><th></th></tr></thead><tbody>${r.rows
                .map(
                  (row) =>
                    `<tr><td>${row.label}</td><td class="n">${row.actual}</td><td class="n muted">${row.ideal}</td><td class="tone-${row.tone}">${row.note}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : `<p class="muted" style="margin-top:12px">Based on the tag size (${item.size}). Measurements for this piece aren’t listed yet. Ask us for them.</p>`
        }`;
      const summary = root.closest('[data-fitbox]')?.querySelector('[data-fit-summary]');
      if (summary) summary.textContent = TONE_SHORT[r.tone];
    } else {
      const top = topSize(p);
      const b = bottomSize(p);
      const p2p = idealPitToPit(p);
      const len = idealLength(p);
      const w = Math.round(b.waist - 0.5);
      out.innerHTML = `
        <div class="general">
          <div><span class="label muted">Tops</span><strong>${top.label}</strong></div>
          <div><span class="label muted">Pit to pit</span><strong>${inches(p2p - 0.75)}–${inches(p2p + 0.75)}</strong></div>
          <div><span class="label muted">Top length</span><strong>${inches(len - 1)}–${inches(len + 1)}</strong></div>
          <div><span class="label muted">Waist</span><strong>${w}–${w + 1}"</strong></div>
          <div><span class="label muted">Inseam</span><strong>${inches(b.inseam)}</strong></div>
        </div>
        <a class="btn shop" href="/?fit=1#archive">Shop pieces in my size <span class="arrow">→</span></a>`;
    }
  }

  let timer: number | undefined;
  function update() {
    const p = read();
    window.clearTimeout(timer);
    if (isValid(p)) {
      render(p);
      timer = window.setTimeout(() => setProfile(p), 400); // save once typing settles
    } else {
      render(null); // mid-typing or out of range: show the hint until it's a real value
    }
  }

  form.addEventListener('input', update);
  root.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('[data-unit], [data-ff-clear]');
    if (!t) return;
    if (t.dataset.unit === 'h') {
      const cur = read().heightCm;
      hUnit = t.dataset.val as 'cm' | 'ft';
      if (cur && !Number.isNaN(cur)) {
        if (hUnit === 'cm') f('hcm').value = String(Math.round(cur));
        else {
          const { ft, inch } = cmToFtIn(cur);
          f('hft').value = String(ft);
          f('hin').value = String(inch);
        }
      }
    } else if (t.dataset.unit === 'w') {
      const cur = read().weightKg;
      wUnit = t.dataset.val as 'kg' | 'lb';
      if (cur && !Number.isNaN(cur)) f('w').value = String(Math.round(wUnit === 'kg' ? cur : kgToLb(cur)));
    } else if (t.hasAttribute('data-ff-clear')) {
      window.clearTimeout(timer); // a save still waiting from typing would bring the profile back
      form.reset();
      setProfile(null);
      render(null);
      const summary = root.closest('[data-fitbox]')?.querySelector('[data-fit-summary]');
      if (summary) summary.textContent = 'Find your size';
      return;
    }
    showUnits();
    update();
  });

  // Keep several finders on one page (and other tabs) in sync.
  window.addEventListener('fit:change', (e) => {
    const p = (e as CustomEvent<Profile | null>).detail;
    if (p && document.activeElement && root.contains(document.activeElement)) return;
    if (p) {
      fill(p);
      render(p);
    }
  });

  const saved = getProfile();
  if (saved) {
    fill(saved);
    render(saved);
  } else showUnits();
}

document.querySelectorAll<HTMLElement>('[data-fit-finder]').forEach(initFinder);
window.addEventListener('fit:change', (e) => markCards((e as CustomEvent<Profile | null>).detail));
window.addEventListener('storage', (e) => {
  if (e.key === 'oa-fit') location.reload();
});
markCards(getProfile());
