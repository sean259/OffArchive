/** The visitor's fit profile, remembered on their device only. */
import { isValid, type Profile } from './fit';

const KEY = 'oa-fit';
let memory: Profile | null | undefined;

export function getProfile(): Profile | null {
  if (memory !== undefined) return memory;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    memory = p && isValid(p) ? p : null;
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
