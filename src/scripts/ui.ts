// Site-wide behaviour: header, menu, theme, copy-to-clipboard, local clock.
import { copy, toast } from '../lib/toast';

/* ── Header: hide on scroll down, show on scroll up ── */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  let lastY = scrollY;
  let ticking = false;
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        header.classList.toggle('scrolled', y > 8);
        header.classList.toggle('away', y > lastY && y > 240);
        lastY = y;
        ticking = false;
      });
    },
    { passive: true },
  );
}

/* ── Mobile menu ── */
const menu = document.querySelector<HTMLDialogElement>('#menu');
document.querySelector('[data-menu-open]')?.addEventListener('click', () => menu?.showModal());
menu?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t === menu || t.closest('a, [data-menu-close]')) menu.close();
});

/* ── Theme toggle ── */
document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('oa-theme', next);
    } catch {
      /* won't persist */
    }
  }),
);

/* ── Copy a prepared message when a [data-copy] link is clicked (Messenger CTAs) ── */
document.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-copy]');
  const text = el?.dataset.copy;
  if (!text) return;
  copy(text).then((ok) => {
    if (ok) toast('Message copied — paste it in Messenger.');
  });
});

/* ── Local time in Cebu (footer) ── */
const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: clock.dataset.clock,
  });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 30_000);
}
