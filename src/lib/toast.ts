let timer: number | undefined;

/** Shows a short message in the toast at the bottom of the screen (see components/Toast.astro). */
export function toast(text: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove('on'), 3200);
}

/** Copies text to the clipboard. Resolves false if the browser blocks it. */
export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
