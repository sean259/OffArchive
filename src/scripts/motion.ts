// Motion layer: smooth scroll, reveals, parallax, count-ups, magnetic buttons, cursor, image peek.
// Everything here is progressive: skipped for reduced-motion users and on touch where it doesn't fit.
import Lenis from 'lenis';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ── Smooth scroll (desktop) ── */
if (!reduce && finePointer) {
  const lenis = new Lenis({
    lerp: 0.11,
    anchors: { offset: -88 },
    prevent: (node) => Boolean(node.closest?.('dialog, [data-lenis-prevent], .rail')),
  });
  const raf = (t: number) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // Freeze the page behind open dialogs (menu, saved, search).
  const sync = () => (document.querySelector('dialog[open]') ? lenis.stop() : lenis.start());
  document.querySelectorAll('dialog').forEach((d) => new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ['open'] }));
}

/* ── Reveal on scroll (.rv fade-up, .rv-img curtain wipe) + count-ups ── */
const countUp = (el: HTMLElement) => {
  const to = Number(el.dataset.countTo);
  const width = el.textContent?.trim().length ?? 2;
  if (reduce || !Number.isFinite(to)) return;
  const start = performance.now();
  const dur = 1400;
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = String(Math.round(to * eased)).padStart(width, '0');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const revealEls = document.querySelectorAll<HTMLElement>('.rv, .rv-img, [data-count-to]');
if ('IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add('in');
        if (el.dataset.countTo) countUp(el);
        io.unobserve(el);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ── Parallax: [data-parallax="0.1"] drifts relative to scroll ── */
const parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
if (parallax.length && !reduce && matchMedia('(min-width: 761px)').matches) {
  let queued = false;
  const update = () => {
    const vh = innerHeight;
    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const speed = Number(el.dataset.parallax) || 0;
      const offset = Math.max(-60, Math.min(60, (r.top + r.height / 2 - vh / 2) * speed));
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    }
    queued = false;
  };
  addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/* ── Magnetic buttons: [data-magnetic] lean toward the pointer ── */
if (finePointer && !reduce) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22;
      const y = (e.clientY - r.top - r.height / 2) * 0.32;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

/* ── Custom cursor: a dot that grows into a label over [data-cursor-label] ── */
const cursor = document.querySelector<HTMLElement>('[data-cursor]');
if (cursor && finePointer && !reduce) {
  const text = cursor.querySelector<HTMLElement>('[data-cursor-text]')!;
  let x = -100;
  let y = -100;
  let cx = x;
  let cy = y;
  document.documentElement.classList.add('has-cursor');
  addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.classList.add('on');
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const labelled = t.closest<HTMLElement>('[data-cursor-label]');
    const hot = t.closest('a, button, select, label, summary, input');
    cursor.classList.toggle('big', Boolean(labelled));
    cursor.classList.toggle('hot', !labelled && Boolean(hot));
    if (labelled) text.textContent = labelled.dataset.cursorLabel ?? '';
  });
  document.addEventListener('pointerdown', () => cursor.classList.add('down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('down'));
  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ── Peek: hovering a [data-peek] row shows its [data-peek-src] content near the cursor ── */
const layer = document.querySelector<HTMLElement>('[data-peek-layer]');
if (layer && finePointer) {
  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let raf = 0;
  let active: HTMLElement | null = null;

  const loop = () => {
    const dx = x - cx;
    cx += dx * (reduce ? 1 : 0.16);
    cy += (y - cy) * (reduce ? 1 : 0.16);
    const tilt = Math.max(-8, Math.min(8, dx * 0.08));
    layer.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(${tilt}deg)`;
    raf = requestAnimationFrame(loop);
  };

  document.addEventListener('pointerover', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-peek]');
    if (!row || row === active) return;
    const src = row.querySelector('[data-peek-src]');
    if (!src) return;
    active = row;
    layer.replaceChildren(...[...src.children].map((c) => c.cloneNode(true)));
    if (!layer.classList.contains('on')) {
      cx = x = e.clientX;
      cy = y = e.clientY;
    }
    layer.classList.add('on');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  });

  document.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
  });

  document.addEventListener('pointerout', (e) => {
    if (!active) return;
    const to = e.relatedTarget as Node | null;
    if (to && active.contains(to)) return;
    const next = to instanceof Element ? to.closest('[data-peek]') : null;
    if (next) return;
    active = null;
    layer.classList.remove('on');
    setTimeout(() => {
      if (!active) cancelAnimationFrame(raf);
    }, 400);
  });
}
