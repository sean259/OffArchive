/** The visitor's fit profile, remembered on their device only. */
import { isValid, type Profile } from './fit';

const KEY = 'oa-fit';
let memory: Profile | null | undefined;

export function getProfile(): Profile | null {
  if (memory !== undefined) return memory;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    // The fit-preference buttons were removed; older saved "fitted"/"relaxed" choices are
    // treated as regular so no hidden setting keeps changing someone's results.
    memory = p && isValid(p) ? { ...p, pref: 'regular' } : null;
  } catch {
    memory = null;
  }
  return memory;
}

export function setProfile(p: Profile | null) {
  memory = p;
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* in-memory only */
  }
  window.dispatchEvent(new CustomEvent('fit:change', { detail: p }));
}
