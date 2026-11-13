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

/* ── Theme toggle: the new palette spreads in a circle from the button that was pressed ── */
document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try {
        localStorage.setItem('oa-theme', next);
      } catch {
        /* won't persist */
      }
    };

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Inside a dialog (mobile menu) the top layer would sit outside the reveal: just switch.
    if (!document.startViewTransition || reduce || btn.closest('dialog')) return apply();

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    const vt = document.startViewTransition(apply);
    vt.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove('theme-vt'));
  }),
);

/* ── Copy a prepared message when a [data-copy] link is clicked (Messenger CTAs) ── */
document.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-copy]');
  const text = el?.dataset.copy;
  if (!text) return;
  copy(text).then((ok) => {
    if (ok) toast('Message ready — just hit send. (Copied too, just in case.)');
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
