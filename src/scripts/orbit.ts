// Orbit view: the archive's pieces arranged around a turning 3D ring, like the face of a globe.
//  • Swipe (phones) or drag (desktop) left/right to turn it; it settles on the nearest piece.
//  • Arrow keys, the ‹ › buttons and horizontal trackpad scrolling also turn it.
//  • The piece facing you opens on click/tap; tapping a side piece turns it to the front.
// Respects the archive's filters and sort: only visible slides are placed, in DOM order.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

export function initOrbit(stage: HTMLElement, root: HTMLElement) {
  const atEl = stage.querySelector<HTMLElement>('[data-orbit-at]')!;
  const totalEl = stage.querySelector<HTMLElement>('[data-orbit-total]')!;
  let slides: HTMLElement[] = [];
  let step = 36; // degrees between neighbours
  let radius = 600;
  let wrap = true; // full ring when there are enough pieces; an arc otherwise
  let pos = 0; // current rotation, in "slides" (fractional while dragging)
  let target = 0;
  let raf = 0;

  const count = () => slides.length;
  const clampPos = (p: number) => (wrap ? p : Math.max(0, Math.min(count() - 1, p)));
  const index = () => {
    const n = count();
    return n ? ((Math.round(pos) % n) + n) % n : 0;
  };

  function layout() {
    const all = [...stage.querySelectorAll<HTMLElement>(':scope > .o-slide')];
    // Pieces hidden by a filter must not keep an old "front" state.
    all.forEach((s) => {
      s.classList.remove('is-front');
      s.tabIndex = -1;
    });
    slides = all.filter((s) => !s.hidden);
    const n = count();
    // A fixed number of positions around the globe (more on wide screens), so a handful of
    // pieces sits close together on the front instead of spreading 120° apart. It always loops,
    // so there are neighbours on both sides of the piece facing you.
    const positions = Math.max(n, stage.clientWidth > 900 ? 12 : 9);
    wrap = n >= 3;
    step = 360 / positions;
    const w = slides[0]?.offsetWidth || stage.clientWidth * 0.3;
    radius = Math.round(w / 2 / Math.tan((step * Math.PI) / 360) + w * 0.18);
    stage.style.setProperty('--r', `${radius}px`);
    totalEl.textContent = String(n);
    target = pos = clampPos(Math.round(pos));
    render();
  }

  function render() {
    const n = count();
    slides.forEach((s, i) => {
      let off = i - pos;
      if (wrap) off = ((((off + n / 2) % n) + n) % n) - n / 2; // shortest way round
      const angle = off * step;
      const facing = Math.cos((angle * Math.PI) / 180);
      const hidden = Math.abs(angle) > 100;
      // Turn around a point one radius behind the front card, with a slight globe-like tilt.
      s.style.transform = `translate(-50%, -50%) translateZ(calc(var(--r) * -1)) rotateX(var(--tilt)) rotateY(${angle.toFixed(2)}deg) translateZ(var(--r))`;
      s.style.opacity = hidden ? '0' : String(Math.max(0.15, facing).toFixed(3));
      s.style.filter = `brightness(${(0.55 + 0.45 * Math.max(0, facing)).toFixed(3)})`;
      s.style.zIndex = String(Math.round(facing * 100));
      s.style.pointerEvents = hidden ? 'none' : '';
      const front = Math.abs(off) < 0.5;
      s.classList.toggle('is-front', front);
      s.tabIndex = front ? 0 : -1;
      s.setAttribute('aria-hidden', String(!front));
    });
    atEl.textContent = String(index() + 1);
  }

  function animate() {
    cancelAnimationFrame(raf);
    const tick = () => {
      const d = target - pos;
      if (Math.abs(d) < 0.001 || reduce.matches) {
        pos = target;
        render();
        return;
      }
      pos += d * 0.14; // ease toward the target
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  const go = (to: number) => {
    target = clampPos(Math.round(to));
    animate();
  };

  /* ── Drag / swipe ── */
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startPos = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  const pxPerSlide = () => Math.max(120, (slides[0]?.offsetWidth ?? 240) * 0.75);

  stage.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.o-btn') || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startPos = pos;
    velocity = 0;
    cancelAnimationFrame(raf);
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) {
      moved = true;
      stage.classList.add('is-dragging');
    }
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
    pos = clampPos(startPos - dx / pxPerSlide());
    render();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    const delta = pos - startPos;
    if (Math.abs(delta) < 1.4) {
      // A normal swipe moves exactly one piece (or snaps back if it was only a nudge).
      go(Math.round(startPos) + (Math.abs(delta) > 0.12 ? Math.sign(delta) : 0));
    } else {
      // A long drag spins through several; a fast release carries on by up to one more
      // (velocity is px/ms, converted to slides).
      const flick = Math.max(-1, Math.min(1, (-velocity * 140) / pxPerSlide()));
      go(pos + (Math.abs(flick) > 0.25 ? flick : 0));
    }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // After a drag, swallow the click. A click on a side piece turns it to the front.
  stage.addEventListener(
    'click',
    (e) => {
      const slide = (e.target as Element).closest<HTMLElement>('.o-slide');
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
        return;
      }
      if (slide && !slide.classList.contains('is-front')) {
        e.preventDefault();
        const i = slides.indexOf(slide);
        let off = i - Math.round(pos);
        if (wrap) off = ((((off + count() / 2) % count()) + count()) % count()) - count() / 2;
        go(Math.round(pos) + off);
      }
    },
    true,
  );

  /* ── Buttons, keys, trackpad ── */
  stage.querySelectorAll<HTMLElement>('[data-orbit-step]').forEach((b) =>
    b.addEventListener('click', () => go(Math.round(target) + Number(b.dataset.orbitStep))),
  );
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(Math.round(target) + 1);
    else if (e.key === 'ArrowLeft') go(Math.round(target) - 1);
    else return;
    e.preventDefault();
  });
  let wheelAcc = 0;
  let wheelTimer = 0;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // leave vertical scrolling alone
      e.preventDefault();
      wheelAcc += e.deltaX;
      cancelAnimationFrame(raf);
      pos = clampPos(target + wheelAcc / pxPerSlide());
      render();
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        target = pos;
        wheelAcc = 0;
        go(pos);
      }, 120);
    },
    { passive: false },
  );

  root.addEventListener('archive:applied', () => {
    pos = target = 0;
    if (!stage.hidden) layout();
  });
  new ResizeObserver(() => !stage.hidden && layout()).observe(stage);
  layout();
}
