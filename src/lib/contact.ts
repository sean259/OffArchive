// Ready-made buyer messages and the links that carry them. Shared by the product page
// (server) and the quick view / saved drawer (browser), so every button says the same thing.

/** Meta caps the m.me `text` value at 2,083 characters; longer messages fall back to the clipboard copy only. */
const MAX_PREFILL = 2000;

/** "Hi! I'm interested in № 0123 – Title (M), ₱1,200. Is it still available? https://…" */
export function itemMessage(p: { no: string; title: string; size?: string | null; price: string; url: string }) {
  const size = p.size ? ` (${p.size})` : '';
  return `Hi! I'm interested in № ${p.no} – ${p.title}${size}, ${p.price}. Is it still available? ${p.url}`;
}

/**
 * Adds the message to a contact link so the chat opens with it already typed:
 * m.me links get `?text=`, sms: links get `?body=`. Anything else is returned unchanged.
 * The buttons also copy the message, in case Messenger ignores the text (e.g. personal profiles).
 */
export function withMessage(href: string, text?: string | null) {
  if (!text) return href;
  const encoded = encodeURIComponent(text);
  if (encoded.length > MAX_PREFILL) return href;
  if (/^https:\/\/m\.me\//i.test(href)) return `${href}${href.includes('?') ? '&' : '?'}text=${encoded}`;
  if (href.startsWith('sms:')) return `${href}?body=${encoded}`;
  return href;
}
