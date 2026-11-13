// Search overlay: open with the header button, "/" or Ctrl/⌘+K. Filters the embedded catalog.
import { getCatalog, esc, thumbHtml, STATUS_TEXT, type CatalogEntry } from '../lib/catalog';

const dialog = document.querySelector<HTMLDialogElement>('#search');

if (dialog) {
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]')!;
  const list = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  const heading = dialog.querySelector<HTMLElement>('[data-search-heading]')!;
  const none = dialog.querySelector<HTMLElement>('[data-search-none]')!;
  const qEcho = dialog.querySelector<HTMLElement>('[data-search-q]')!;
  const total = dialog.querySelector<HTMLElement>('[data-search-total]')!;

  const all = Object.values(getCatalog()).sort((a, b) => a.order - b.order);
  total.textContent = `${all.length} pieces in the archive`;
  let results: CatalogEntry[] = [];
  let active = 0;

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const haystack = (e: CatalogEntry) => norm(`${e.title} ${e.brand} ${e.category} ${e.size} ${e.condition} ${e.no} ${e.status}`);

  function highlight(text: string, terms: string[]) {
    let html = esc(text);
    for (const t of terms) {
      if (t.length < 2) continue;
      const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      html = html.replace(re, '<mark>$1</mark>');
    }
    return html;
  }

  function render() {
    const q = input.value.trim();
    const terms = norm(q).split(/\s+/).filter(Boolean);
    results = terms.length
      ? all
          .filter((e) => terms.every((t) => haystack(e).includes(t)))
          .sort((a, b) => Number(a.status === 'sold') - Number(b.status === 'sold'))
      : all.filter((e) => e.status !== 'sold').slice(0, 6);
    active = 0;
    heading.textContent = terms.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Latest pieces';
    none.hidden = results.length > 0;
    heading.hidden = results.length === 0;
    qEcho.textContent = q;
    list.innerHTML = results
      .map(
        (e, i) => `
        <li role="option" id="sr-${i}" aria-selected="${i === 0}" class="${e.status}">
          <a href="${e.url}">
            <span class="r-media">${thumbHtml(e)}</span>
            <span>
              <span class="r-title">${highlight(e.title, terms)}</span>
              <span class="label muted">№ ${e.no} · ${esc(e.category)} · ${esc(e.size)}</span>
            </span>
            <span class="r-side">
              <span class="num">${e.priceLabel}</span>
              <span class="label muted"><span class="dot ${e.status}"></span> ${STATUS_TEXT[e.status]}</span>
            </span>
          </a>
        </li>`,
      )
      .join('');
    input.setAttribute('aria-activedescendant', results.length ? 'sr-0' : '');
  }

  function move(delta: number) {
    if (!results.length) return;
    active = (active + delta + results.length) % results.length;
    list.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    list.querySelector(`#sr-${active}`)?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', `sr-${active}`);
  }

  function open() {
    if (dialog!.open) return;
    dialog!.showModal();
    input.select();
    render();
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      const url = results[active].url;
      dialog!.close(); // a page transition can't start while a modal dialog is open
      location.href = url;
    }
  });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as Element).closest('[role="option"]');
    if (!li) return;
    const i = [...list.children].indexOf(li);
    if (i !== active && i >= 0) move(i - active);
  });

  dialog.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t === dialog || t.closest('[data-search-close]')) dialog.close();
  });

  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-search-open]')) open();
  });

  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !document.querySelector('dialog[open]'))) {
      e.preventDefault();
      open();
    }
  });
}
