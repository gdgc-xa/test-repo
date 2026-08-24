/* ============================================================
   components/featured.js — "Featured Organizations" strip.
   Pure template; no DOM mutation. Mirrors card.js so featured
   cards look identical to browse cards, plus an optional
   "advertisement" badge.

   To change WHICH orgs appear, edit data/featured.js — nothing
   in this file needs to change for that.
   ============================================================ */

import { ORGS } from '../data/organizations.js';
import { FEATURED } from '../data/featured.js';
import { SHORT_LABEL, COLOR_OF } from '../data/categories.js';

const ORG_BY_ID = Object.fromEntries(ORGS.map(o => [o.id, o]));

/**
 * Resolves data/featured.js entries against the ORGS roster.
 * Unknown ids are dropped (with a console.warn) instead of
 * breaking the whole strip.
 * @returns {{org: Org, note?: string, cta?: string}[]}
 */
export function resolveFeatured() {
  const resolved = [];
  for (const entry of FEATURED) {
    const org = ORG_BY_ID[entry.id];
    if (!org) {
      console.warn(
        `[featured] data/featured.js references id "${entry.id}", ` +
        `which doesn't exist in data/organizations.js. Skipping it — ` +
        `check for a typo.`
      );
      continue;
    }
    resolved.push({ org, note: entry.note, cta: entry.cta });
  }
  return resolved;
}

/**
 * @param {{org: Org, note?: string, cta?: string}} entry
 * @param {number} i — index within the strip (drives reveal stagger)
 * @returns {string} HTML string
 */
export function featuredCardHtml({ org, note, cta }, i = 0) {
  const primaryColor = COLOR_OF[org.tags[0]] || 'blue';
  const staggerMs     = Math.min(i * 80, 320);

  const accent     = `var(--${primaryColor})`;
  const accentSoft = `var(--${primaryColor}-soft)`;
  const accentInk  = `var(--${primaryColor}-ink)`;

  const emblem = org.logo
    ? `<img class="card__logo" src="${escapeAttr(org.logo)}" alt="" loading="lazy" decoding="async"/>`
    : `<span class="card__initials">${escapeHtml(initialsOf(org))}</span>`;

  const blurb = org.description || org.tagline;
  const body = blurb
    ? `<p class="card__desc">${escapeHtml(blurb)}</p>`
    : `<p class="card__desc card__desc--contact">${escapeHtml(org.emails?.[0] || 'Contact details to follow')}</p>`;

  const badge = note
    ? `<span class="featured-card__badge">${escapeHtml(note)}</span>`
    : '';

  return `
    <button class="card featured-card reveal"
            data-org-id="${escapeAttr(org.id)}"
            style="--card-accent: ${accent}; --card-accent-soft: ${accentSoft}; --card-accent-ink: ${accentInk}; --reveal-delay: ${staggerMs}ms;"
            aria-label="Open ${escapeAttr(org.name)} booth">
      ${badge}
      <div class="card__head">
        <span class="card__emblem" aria-hidden="true">${emblem}</span>
        <div class="card__headtext">
          <div class="card__title">${escapeHtml(org.name)}</div>
          <div class="card__short">${escapeHtml(org.short)}</div>
        </div>
      </div>
      <div class="card__body">${body}</div>
      <div class="card__foot">
        <span class="card__meta card__meta--muted">${escapeHtml(SHORT_LABEL[org.tags[0]] ?? '')}</span>
        <span class="card__cta">${escapeHtml(cta || 'Know more →')}</span>
      </div>
    </button>
  `;
}

function initialsOf(org) {
  const s = String(org.short || org.name || '?');
  if (s.length <= 5) return s.toUpperCase();
  const words = s.split(/[\s\-·]+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  return s.slice(0, 4).toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}
