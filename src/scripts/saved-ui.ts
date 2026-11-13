// Wires up every [data-save] button and the Saved drawer.
import { getSaved, toggleSaved, removeSaved, clearSaved, refreshSaved } from '../lib/saved';
import { toast } from '../lib/toast';
import { getCatalog, esc, thumbHtml, STATUS_TEXT, type CatalogEntry } from '../lib/catalog';

const catalog = getCatalog();
const drawer = document.querySelector<HTMLDialogElement>('#saved');

function syncButtons(ids: string[]) {
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((btn) => {
    const on = ids.includes(btn.dataset.save!);
    btn.setAttribute('aria-pressed', String(on));
    const text = btn.querySelector('[data-save-text]');
    if (text) text.textContent = on ? 'Saved' : 'Save';
  });
  const live = ids.filter((id) => catalog[id]);
  document.querySelectorAll('[data-saved-count]').forEach((el) => (el.textContent = String(live.length)));
}

function renderDrawer(ids: string[]) {
  if (!drawer) return;
  const entries = ids.map((id) => catalog[id]).filter((e): e is CatalogEntry => Boolean(e));
  const list = drawer.querySelector<HTMLElement>('[data-saved-list]')!;
  const empty = drawer.querySelector<HTMLElement>('[data-saved-empty]')!;
  const foot = drawer.querySelector<HTMLElement>('[data-saved-foot]')!;
  const total = drawer.querySelector<HTMLElement>('[data-saved-total]')!;
  const ask = drawer.querySelector<HTMLAnchorElement>('[data-saved-ask]')!;

  empty.hidden = entries.length > 0;
  foot.hidden = entries.length === 0;

  list.innerHTML = entries
    .map(
      (e) => `
      <li class="sv ${e.status}">
        <a class="sv-media" href="${e.url}">${thumbHtml(e)}</a>
        <div class="sv-body">
          <span class="label muted">№ ${e.no} · ${esc(e.size)}</span>
          <a class="sv-title" href="${e.url}">${esc(e.title)}</a>
          <span class="label sv-status"><span class="dot ${e.status}"></span>${STATUS_TEXT[e.status]}</span>
        </div>
        <div class="sv-side">
          <span class="num">${e.status === 'sold' ? `<s>${e.priceLabel}</s>` : e.priceLabel}</span>
          <button type="button" class="label sv-remove" data-remove="${e.id}" aria-label="Remove ${esc(e.title)}">Remove</button>
        </div>
      </li>`,
    )
    .join('');

  const open = entries.filter((e) => e.status !== 'sold');
  const sum = open.reduce((n, e) => n + e.price, 0);
  total.textContent = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(sum);

  if (open.length) {
    const origin = location.origin;
    ask.dataset.copy =
      `Hi! I'm interested in ${open.length === 1 ? 'this piece' : 'these pieces'}:\n` +
      open.map((e) => `• ${e.title} (${e.size}, ${e.priceLabel}) — ${origin}${e.url}`).join('\n') +
      `\nAre ${open.length === 1 ? 'it' : 'they'} still available?`;
    ask.removeAttribute('aria-disabled');
    ask.querySelector('[data-ask-label]')!.textContent =
      open.length === 1 ? 'Ask about this piece' : `Ask about these ${open.length}`;
  } else {
    delete ask.dataset.copy;
    ask.setAttribute('aria-disabled', 'true');
  }
}

function sync() {
  const ids = getSaved();
  syncButtons(ids);
  renderDrawer(ids);
}

document.addEventListener('click', (e) => {
  const target = e.target as Element;

  const saveBtn = target.closest<HTMLButtonElement>('[data-save]');
  if (saveBtn) {
    e.preventDefault();
    const now = toggleSaved(saveBtn.dataset.save!);
    saveBtn.classList.remove('pop');
    void saveBtn.offsetWidth; // restart animation
    if (now) saveBtn.classList.add('pop');
    toast(now ? 'Saved — find it under “Saved” in the menu.' : 'Removed from saved.');
    return;
  }

  if (target.closest('[data-saved-open]')) {
    drawer?.showModal();
    return;
  }

  const remove = target.closest<HTMLElement>('[data-remove]');
  if (remove) {
    removeSaved(remove.dataset.remove!);
    return;
  }

  if (target.closest('[data-saved-clear]')) {
    clearSaved();
    return;
  }

  if (drawer && (target === drawer || target.closest('[data-drawer-close]') || target.closest('.sv a'))) {
    drawer.close();
  }
});

addEventListener('saved:change', sync);
// Keep tabs in sync.
addEventListener('storage', (e) => {
  if (e.key === 'oa-saved') {
    refreshSaved();
    sync();
  }
});
sync();
