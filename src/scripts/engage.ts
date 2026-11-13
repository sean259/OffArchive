// Engagement touches that run on the visitor's device only:
//  - remembers pieces they open and shows a "Recently viewed" rail
//  - marks pieces listed since their last visit
//  - fades photos in as they load
import { getCatalog, esc, STATUS_TEXT, type CatalogEntry } from '../lib/catalog';
import { getRecent, rememberView, clearRecent, previousVisit } from '../lib/recent';
import { toast } from '../lib/toast';

/* ── Remember the piece on an item page ── */
const current = document.querySelector<HTMLElement>('[data-view-item]')?.dataset.viewItem;
if (current) rememberView(current);

/* ── Recently viewed rail ── */
const media = (e: CatalogEntry) => {
  const src = e.photos[0] ?? e.thumb;
  return src
    ? `<div class="frame pf rv-media"><img class="photo" src="${esc(src)}" alt="" loading="lazy" decoding="async"></div>`
    : `<div class="frame rv-media"><svg viewBox="0 0 100 125" aria-hidden="true"><path d="${esc(e.art)}"/></svg></div>`;
};

function renderRecent() {
  const catalog = getCatalog();
  const entries = getRecent()
    .filter((id) => id !== current)
    .map((id) => catalog[id])
    .filter((e): e is CatalogEntry => Boolean(e));
  document.querySelectorAll<HTMLElement>('[data-recent]').forEach((section) => {
    const list = section.querySelector<HTMLElement>('[data-recent-list]')!;
    section.hidden = entries.length === 0;
    list.innerHTML = entries
      .map(
        (e, i) => `
        <li style="--i:${i}" class="${e.status === 'sold' ? 'sold' : ''}">
          <a href="${esc(e.url)}">
            ${media(e)}
            <span class="rv-t">${esc(e.title)}</span>
            <span class="rv-meta label muted"><span class="num">${esc(e.priceLabel)}</span><span>${esc(STATUS_TEXT[e.status])}</span></span>
          </a>
        </li>`,
      )
      .join('');
  });
}
renderRecent();
document.addEventListener('click', (ev) => {
  if (!(ev.target as Element).closest('[data-recent-clear]')) return;
  clearRecent();
  renderRecent();
  toast('Viewing history cleared.');
});

/* ── New since your last visit ── */
const prev = previousVisit();
if (prev) {
  const fresh = new Set<string>();
  document.querySelectorAll<HTMLElement>('[data-card][data-listed]').forEach((card) => {
    if (Number(card.dataset.listed) <= prev || card.dataset.status !== 'available') return;
    fresh.add(card.dataset.id!);
    card.classList.add('is-new');
    const wrap = card.querySelector('.media-wrap');
    if (wrap && !wrap.querySelector('.new-chip')) wrap.insertAdjacentHTML('beforeend', '<span class="new-chip label" title="Listed since your last visit">New</span>');
  });
  try {
    if (fresh.size && !sessionStorage.getItem('oa-new-toast')) {
      sessionStorage.setItem('oa-new-toast', '1');
      setTimeout(() => toast(`${fresh.size} new ${fresh.size === 1 ? 'piece' : 'pieces'} since your last visit.`), 1200);
    }
  } catch {
    /* no session storage: skip the toast */
  }
}

/* ── Fade photos in as they arrive (only ones still loading, so cached photos show instantly) ── */
document.querySelectorAll<HTMLImageElement>('img.photo:not(.alt)').forEach((img) => {
  // Skip photos that aren't showing yet (extra card photos load on demand).
  if (img.complete || img.dataset.src || (img.dataset.i && img.dataset.i !== '0')) return;
  img.classList.add('fade-in');
  const done = () => img.classList.add('is-loaded');
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', done, { once: true });
});
