// Quick view: fills the #quick dialog from the embedded catalog when a [data-quick] button is clicked.
import { getCatalog, esc, STATUS_TEXT, type CatalogEntry } from '../lib/catalog';
import { getSaved } from '../lib/saved';
import { rememberView } from '../lib/recent';
import { trackView } from '../lib/track';
import { itemMessage, withMessage } from '../lib/contact';

const dialog = document.querySelector<HTMLDialogElement>('#quick');
const body = dialog?.querySelector<HTMLElement>('[data-qv-body]');

function contactHref(e: CatalogEntry) {
  if (e.seller.messenger) return e.seller.messenger;
  if (e.seller.phone) return `sms:${e.seller.phone.replace(/\s/g, '')}`;
  return null;
}

function render(e: CatalogEntry) {
  const slides = e.photos.length
    ? e.photos.map((src, i) => `<div class="qv-slide"><img src="${esc(src)}" alt="${esc(e.title)}, photo ${i + 1}" ${i ? 'loading="lazy"' : ''}></div>`)
    : [`<div class="qv-slide"><svg viewBox="0 0 100 125" aria-hidden="true"><path d="${esc(e.art)}"/></svg></div>`];
  const dots =
    slides.length > 1
      ? `<div class="qv-dots">${slides.map((_, i) => `<button type="button" data-qv-dot="${i}" aria-label="Photo ${i + 1}" aria-current="${i === 0}"></button>`).join('')}</div>`
      : '';
  const saved = getSaved().includes(e.id);
  const sold = e.status === 'sold';
  const href = contactHref(e);
  const message = itemMessage({ no: e.no, title: e.title, size: e.size, price: e.priceLabel, url: location.origin + e.url });
  const seller = e.seller.official ? 'OFFARCHIVE.' : `@${esc(e.seller.username)}`;
  const specs = [
    e.size && [e.sizeLabel, e.size],
    ['Condition', e.condition],
    e.fit && ['Fit', e.fit],
  ].filter(Boolean) as [string, string][];

  body!.innerHTML = `
    <div class="qv-gallery">
      <div class="qv-track" data-qv-track>${slides.join('')}</div>
      ${dots}
    </div>
    <div class="qv-info">
      <span class="label muted">№ ${esc(e.no)} · ${esc(e.category)}</span>
      <h2 class="qv-title" id="qv-title">${esc(e.title)}</h2>
      <div class="qv-price">
        <strong class="num">${sold ? `<s>${esc(e.priceLabel)}</s>` : esc(e.priceLabel)}</strong>
        <span class="label"><span class="dot ${e.status}"></span> ${esc(STATUS_TEXT[e.status])}</span>
      </div>
      <dl class="qv-specs">${specs.map(([k, v]) => `<div><dt class="label muted">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${e.blurb ? `<p class="qv-blurb">${esc(e.blurb)}</p>` : ''}
      <div class="qv-seller label muted"><span>Sold by ${seller}</span><span>Flaws: ${esc(e.flaws)}</span></div>
      <div class="qv-actions">
        ${
          sold
            ? `<span class="btn btn--block" aria-disabled="true">Released — sold</span>`
            : href
              ? `<a class="btn btn--block" href="${esc(withMessage(href, message))}" target="_blank" rel="noopener" data-copy="${esc(message)}" data-track-msg="${esc(e.id)}">Message ${e.seller.official ? 'us' : 'seller'} <span class="arrow">→</span><span class="sr-only">(opens in a new tab)</span></a>`
              : ''
        }
        <a class="btn btn--ghost" href="${esc(e.url)}">Full details <span class="arrow">→</span></a>
        <button type="button" class="save round" data-save="${esc(e.id)}" aria-pressed="${saved}" aria-label="Save ${esc(e.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>
        </button>
      </div>
    </div>`;

  const track = body!.querySelector<HTMLElement>('[data-qv-track]')!;
  const dotEls = [...body!.querySelectorAll<HTMLButtonElement>('[data-qv-dot]')];
  track.addEventListener(
    'scroll',
    () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      dotEls.forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
    },
    { passive: true },
  );
  dotEls.forEach((d) =>
    d.addEventListener('click', () => track.scrollTo({ left: track.clientWidth * Number(d.dataset.qvDot), behavior: 'smooth' })),
  );
}

if (dialog && body) {
  document.addEventListener('click', (ev) => {
    const btn = (ev.target as Element).closest<HTMLElement>('[data-quick]');
    if (!btn) return;
    ev.preventDefault();
    const entry = getCatalog()[btn.dataset.quick!];
    if (!entry) return void (location.href = btn.closest('[data-card]')?.querySelector<HTMLAnchorElement>('a[href]')?.href ?? '/');
    render(entry);
    rememberView(entry.id);
    trackView(entry.id);
    dialog.showModal();
    // Start focus on the panel itself (not the first button), so nothing looks pre-selected.
    body.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    if (t === dialog || t.closest('[data-qv-close]')) dialog.close();
    // Following a link out of the dialog: close it first so page transitions can run.
    if (t.closest('a[href^="/"]')) dialog.close();
  });
  // Keep the save button in sync if it's toggled from elsewhere.
  addEventListener('saved:change', () => {
    const b = body.querySelector<HTMLElement>('[data-save]');
    if (b) b.setAttribute('aria-pressed', String(getSaved().includes(b.dataset.save!)));
  });
}
