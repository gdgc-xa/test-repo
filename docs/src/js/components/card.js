/* ============================================================
   components/card.js — org card for the browse grid.
   Pure template; no DOM mutation.

   The roster gives us a logo for most orgs and nothing but an
   e-mail for the rest, so the emblem falls back to initials and
   the body line falls back to the contact address.
   ============================================================ */

import { SHORT_LABEL, COLOR_OF } from '../data/categories.js';

/**
 * @param {Org} org  — organization record
 * @param {number} i — index within the filtered list (drives reveal stagger)
 * @returns {string} HTML string
 */
export function cardHtml(org, i = 0) {
  const primaryColor = COLOR_OF[org.tags[0]] || 'blue';
  const staggerMs    = Math.min(i * 60, 420);

  const accent      = `var(--${primaryColor})`;
  const accentSoft  = `var(--${primaryColor}-soft)`;
  const accentInk   = `var(--${primaryColor}-ink)`;

  const tags = org.tags.map(t => {
    const c = COLOR_OF[t];
    return `
      <span class="tag tag--card"
            style="--tag-accent-soft: var(--${c}-soft); --tag-accent-ink: var(--${c}-ink);">
        ${SHORT_LABEL[t] ?? t}
      </span>`;
  }).join('');

  const emblem = org.logo
    ? `<img class="card__logo" src="${escapeAttr(org.logo)}" alt="" loading="lazy" decoding="async"/>`
    : `<span class="card__initials">${escapeHtml(initialsOf(org))}</span>`;

  // Lead with the org's own blurb; fall back to the contact address
  // for anything the roster document has not described yet.
  const blurb = org.description || org.tagline;
  const body = blurb
    ? `<p class="card__desc">${escapeHtml(blurb)}</p>`
    : `<p class="card__desc card__desc--contact">${escapeHtml(org.emails?.[0] || 'Contact details to follow')}</p>`;

  // Two pages are numeric profile.php URLs with no vanity handle —
  // key on the URL so they still show as linked, not "Email only".
  const foot = (org.fbHandle || org.fbUrl)
    ? `<span class="card__meta">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>
         </svg>
         ${escapeHtml(org.fbHandle || 'Facebook page')}
       </span>`
    : `<span class="card__meta card__meta--muted">Email only</span>`;

  return `
    <button class="card reveal"
            data-org-id="${escapeAttr(org.id)}"
            style="--card-accent: ${accent}; --card-accent-soft: ${accentSoft}; --card-accent-ink: ${accentInk}; --reveal-delay: ${staggerMs}ms;"
            aria-label="Open ${escapeAttr(org.name)} booth">
      <div class="card__head">
        <span class="card__emblem" aria-hidden="true">${emblem}</span>
        <div class="card__headtext">
          <div class="card__title">${escapeHtml(org.name)}</div>
          <div class="card__short">${escapeHtml(org.short)}</div>
        </div>
      </div>
      <div class="card__tags">${tags}</div>
      <div class="card__body">${body}</div>
      <div class="card__foot">
        ${foot}
        <span class="card__cta">Know more →</span>
      </div>
    </button>
  `;
}

/**
 * A dashed placeholder for a filtered-out org — visualizes the
 * filter working without erasing the ghost of what was removed.
 */
export function ghostCardHtml() {
  return `<div class="card card--ghost" aria-hidden="true"></div>`;
}

/** Initials for orgs the roster listed without a logo. */
function initialsOf(org) {
  const s = String(org.short || org.name || '?');
  if (s.length <= 5) return s.toUpperCase();
  const words = s.split(/[\s\-·]+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  return s.slice(0, 4).toUpperCase();
}

// ---------- small escape helpers to keep templates safe ----------
function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}
