// Flip through a product card's photos (ProductMedia with `browse`).
//  Desktop: move the mouse across the photo (left edge = first photo, right edge = last),
//           or click the ‹ › arrows. Leaving the card returns to the cover.
//  Phones:  swipe left/right on the photo. A tap still opens the piece.
// Extra photos are stored in data-src and only downloaded once someone starts browsing that card.

const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function wake(media: HTMLElement) {
  if (media.dataset.awake) return;
  media.dataset.awake = '1';
  media.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
    img.src = img.dataset.src!;
    img.removeAttribute('data-src');
  });
}

function show(media: HTMLElement, index: number) {
  const imgs = [...media.querySelectorAll<HTMLImageElement>('img.photo[data-i]')];
  if (!imgs.length) return;
  const n = imgs.length;
  const i = ((index % n) + n) % n;
  if (media.dataset.at === String(i)) return;
  media.dataset.at = String(i);
  imgs.forEach((img, j) => img.classList.toggle('is-on', j === i));
  media.querySelectorAll('.pips span').forEach((p, j) => p.classList.toggle('on', j === i));
  const at = media.querySelector('[data-media-at]');
  if (at) at.textContent = String(i + 1);
}

const current = (media: HTMLElement) => Number(media.dataset.at ?? 0);
/**
 * The browsable photo frame under the pointer. Cards have a full-card link layered on top, so the
 * event target is often that link: fall back to the card's frame if the point is inside it.
 */
function mediaOf(t: EventTarget | null, x?: number, y?: number): HTMLElement | null {
  if (!(t instanceof Element)) return null;
  const direct = t.closest<HTMLElement>('[data-media]');
  if (direct) return direct;
  const m = t.closest('[data-card]')?.querySelector<HTMLElement>('[data-media]');
  if (!m || x === undefined || y === undefined) return null;
  const r = m.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom ? m : null;
}

/* ── Desktop: scrub by pointer position ── */
if (canHover) {
  document.addEventListener(
    'pointerover',
    (e) => {
      const m = mediaOf(e.target, e.clientX, e.clientY);
      if (m) wake(m);
    },
    { passive: true },
  );
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const m = mediaOf(e.target, e.clientX, e.clientY);
      if (!m || (e.target as Element).closest('[data-media-nav], [data-save], [data-quick]')) return;
      const r = m.getBoundingClientRect();
      const n = Number(m.dataset.media);
      show(m, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerout',
    (e) => {
      // Leaving the card altogether returns to the cover photo.
      const card = (e.target as Element).closest?.('[data-card]');
      const m = card?.querySelector<HTMLElement>('[data-media]');
      if (m && !card!.contains(e.relatedTarget as Node)) show(m, 0);
    },
    { passive: true },
  );
}

/* ── Arrows (also keyboard-focusable), and clicking the photo opens the piece ── */
document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-media-nav]');
  if (!btn) {
    // The browsable frame sits above the card's link, so follow that link ourselves.
    const frame = (e.target as Element).closest<HTMLElement>('[data-card] [data-media]');
    const link = frame?.closest('[data-card]')?.querySelector<HTMLAnchorElement>('a.stretch');
    if (frame && link && !e.defaultPrevented) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) window.open(link.href, '_blank', 'noopener');
      else location.href = link.href;
    }
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const m = mediaOf(btn)!;
  wake(m);
  show(m, current(m) + Number(btn.dataset.mediaNav));
});
document.addEventListener('focusin', (e) => {
  const m = mediaOf(e.target);
  if (m) wake(m);
});

/* ── Phones: swipe ── */
let start: { x: number; y: number; m: HTMLElement } | null = null;
let swiped = false;
document.addEventListener(
  'touchstart',
  (e) => {
    const t0 = e.touches[0];
    const m = mediaOf(e.target, t0.clientX, t0.clientY);
    start = m ? { x: t0.clientX, y: t0.clientY, m } : null;
    swiped = false;
    if (m) wake(m);
  },
  { passive: true },
);
document.addEventListener(
  'touchend',
  (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // A clear horizontal swipe (not a scroll): change photo and swallow the tap that follows.
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      show(start.m, current(start.m) + (dx < 0 ? 1 : -1));
      swiped = true;
    }
    start = null;
  },
  { passive: true },
);
document.addEventListener(
  'click',
  (e) => {
    if (swiped && (e.target as Element).closest?.('[data-card]')) {
      e.preventDefault();
      e.stopPropagation();
    }
    swiped = false;
  },
  true,
);
