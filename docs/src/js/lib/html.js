/* ============================================================
   lib/html.js — escaping helpers shared by the newer templates
   (events, Xavier Cup, settings).

   The original components each carry their own private copies;
   those are left alone. Everything written from here on imports
   these instead of growing a fourth and fifth copy.
   ============================================================ */

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}

/**
 * safeUrl(u) — allow only links we are willing to render.
 * Event and game links come from a data file that several people
 * edit, so a stray `javascript:` string should never reach an href.
 * Returns '' for anything unrecognised, and callers drop the link.
 */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  // Relative paths and query links inside the site are fine.
  if (/^[./?#]/.test(s)) return s;
  return '';
}

/** Turn a data string into a usable DOM id / attribute value. */
export function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
