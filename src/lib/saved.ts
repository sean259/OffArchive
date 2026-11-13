/**
 * "Saved" list — pieces a visitor bookmarks, stored on their device only.
 * Falls back to in-memory storage if localStorage is blocked (private mode).
 */
const KEY = 'oa-saved';
let memory: string[] | null = null;

export function getSaved(): string[] {
  if (memory) return [...memory];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    memory = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    memory = [];
  }
  return [...memory];
}

function write(ids: string[]) {
  memory = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* keep in memory only */
  }
  window.dispatchEvent(new CustomEvent('saved:change', { detail: ids }));
}

/** Returns true if the item is now saved. */
export function toggleSaved(id: string): boolean {
  const ids = getSaved();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.unshift(id);
  write(ids);
  return i < 0;
}

export const removeSaved = (id: string) => write(getSaved().filter((x) => x !== id));
export const clearSaved = () => write([]);

/** Forget the cached list (e.g. when another tab changed it). */
export const refreshSaved = () => {
  memory = null;
};
