/**
 * Visitor memory, kept on their device only (nothing is sent anywhere):
 *  - recently viewed pieces, for the "Recently viewed" rail
 *  - when they last visited, to mark pieces that are new since then
 * Every storage call is guarded: private mode or blocked storage just means no memory.
 */
const VIEWED = 'oa-viewed';
const LAST_VISIT = 'oa-last-visit';
const SESSION_PREV = 'oa-prev-visit';
const MAX = 12;

const read = <T>(store: Storage | undefined, key: string, fallback: T): T => {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (store: Storage | undefined, key: string, value: unknown) => {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
const local = () => (typeof localStorage === 'undefined' ? undefined : localStorage);
const session = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage);

/** Most recent first. */
export function getRecent(): string[] {
  const list = read<unknown>(local(), VIEWED, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function rememberView(id: string) {
  write(local(), VIEWED, [id, ...getRecent().filter((x) => x !== id)].slice(0, MAX));
}

export const clearRecent = () => write(local(), VIEWED, []);

/**
 * The time of the visitor's previous visit (ms), or null on a first visit.
 * A "visit" is a browser session: the value stays the same across page loads in one session.
 */
export function previousVisit(): number | null {
  const s = session();
  const cached = read<number | null>(s, SESSION_PREV, null);
  if (cached !== null) return cached || null;
  const last = read<number | null>(local(), LAST_VISIT, null);
  write(s, SESSION_PREV, last ?? 0);
  write(local(), LAST_VISIT, Date.now());
  return last;
}
