// Browser side of seller stats. Fire-and-forget: tracking must never slow down or break the page.
type Kind = 'view' | 'save' | 'unsave' | 'message';

function send(ids: string[], kind: Kind) {
  if (!ids.length) return;
  const body = JSON.stringify({ ids, kind });
  try {
    // sendBeacon survives the page unloading (e.g. a Message tap that leaves for Messenger).
    if (navigator.sendBeacon?.('/api/track', body)) return;
  } catch {
    /* fall through */
  }
  fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
}

/** Session-scoped "already counted" set, so a refresh or reopening the quick view isn't a new view. */
function once(store: Storage | undefined, key: string, id: string): boolean {
  try {
    if (!store) return true;
    const seen: string[] = JSON.parse(store.getItem(key) ?? '[]');
    if (seen.includes(id)) return false;
    store.setItem(key, JSON.stringify([...seen, id].slice(-200)));
  } catch {
    /* storage blocked: count it anyway */
  }
  return true;
}

const session = () => {
  try {
    return sessionStorage;
  } catch {
    return undefined;
  }
};

export function trackView(id: string) {
  if (once(session(), 'oa-viewed', id)) send([id], 'view');
}

export function trackSave(id: string, saved: boolean) {
  send([id], saved ? 'save' : 'unsave');
}

export function trackMessage(ids: string[]) {
  // One tap per piece per visit: tapping again after coming back from Messenger isn't new interest.
  send(
    ids.filter((id) => once(session(), 'oa-messaged', id)),
    'message',
  );
}
