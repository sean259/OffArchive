// Exit animations for every <dialog>: close() adds `.closing`, waits for the dialog's own
// closing animation, then really closes. Dialogs without a `.closing` animation close at once.
// Following a link out of a dialog closes it instantly, so the page transition can start.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && 'HTMLDialogElement' in window) {
  const proto = HTMLDialogElement.prototype;
  const nativeClose = proto.close;
  const nativeShowModal = proto.showModal;
  const pending = new WeakMap<HTMLDialogElement, () => void>();
  let instant = false;

  // A click on a link inside an open dialog: skip the exit animation for this tick.
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element).closest?.('dialog[open] a[href]')) {
        instant = true;
        setTimeout(() => (instant = false));
      }
    },
    true,
  );

  proto.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (!this.open || instant) {
      pending.get(this)?.();
      return nativeClose.call(this, returnValue);
    }
    if (pending.has(this)) return; // already on its way out

    this.classList.add('closing');
    if (getComputedStyle(this).animationName === 'none') {
      this.classList.remove('closing');
      return nativeClose.call(this, returnValue);
    }

    let timer = 0;
    const onEnd = (e: AnimationEvent) => {
      if (e.target === this && !e.pseudoElement) finish();
    };
    const cleanup = () => {
      clearTimeout(timer);
      this.removeEventListener('animationend', onEnd);
      pending.delete(this);
      this.classList.remove('closing');
    };
    const finish = () => {
      cleanup();
      nativeClose.call(this, returnValue); // same task as removing the class: no flash
    };
    this.addEventListener('animationend', onEnd);
    timer = window.setTimeout(finish, 600);
    // Reopened mid-exit: drop the pending close and keep the dialog up.
    pending.set(this, cleanup);
  };

  proto.showModal = function (this: HTMLDialogElement) {
    const cancelClose = pending.get(this);
    if (cancelClose) {
      cancelClose();
      return;
    }
    return nativeShowModal.call(this);
  };

  // Esc: route through the animated close instead of the browser's instant one.
  document.addEventListener(
    'cancel',
    (e) => {
      const d = e.target;
      if (d instanceof HTMLDialogElement) {
        e.preventDefault();
        d.close();
      }
    },
    true,
  );
}
