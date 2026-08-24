/* ============================================================
   components/booth.js — big template for the booth screen.
   Rendered INTO the modal panel by screens/booth.js.
   Two columns: the org's own card, and the Facebook preview + contact.
   ============================================================ */

import { COLOR_OF, FULL_LABEL, SHORT_LABEL } from '../data/categories.js';
import { fbCardHtml } from './facebook-card.js';
import { venueMapHtml } from './venue-map.js';

/**
 * boothHtml(org) → HTML for the entire booth interior
 * (breadcrumb, hero, main panels, aside).
 */
export function boothHtml(org) {
  const primaryColor = COLOR_OF[org.tags[0]] || 'blue';
  const accent      = `var(--${primaryColor})`;
  const accentInk   = `var(--${primaryColor}-ink)`;

  const tags = org.tags.map(t => {
    const c = COLOR_OF[t];
    return `
      <span class="tag tag--booth"
            style="--tag-accent-soft: var(--${c}-soft); --tag-accent-ink: var(--${c}-ink);">
        ${SHORT_LABEL[t]}
      </span>`;
  }).join('');

  return `
    <div class="booth"
         style="--booth-accent: ${accent}; --booth-accent-ink: ${accentInk};">
      <nav class="booth__crumb" aria-label="Breadcrumb">
        <a href="?screen=browse" data-nav="browse">Discover</a>
        <span class="booth__crumb-sep">/</span>
        <a href="?screen=browse" data-nav="browse">Browse</a>
        <span class="booth__crumb-sep">/</span>
        <span>${escapeHtml(org.name)}</span>
      </nav>

      <div class="booth-grid">
        <div class="booth-main">
        <section class="booth-hero">
          <div class="booth-hero__body">
            <button class="btn btn--back" type="button" data-nav="browse">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="7" x2="1" y2="7"/>
                <polyline points="5,3 1,7 5,11"/>
              </svg>
              Back to browse
            </button>

            <div class="booth-hero__head">
              <div class="booth-hero__headtext">
                <div class="booth-hero__tags">${tags}</div>
                <h1 class="booth-hero__title">${escapeHtml(org.name)}</h1>
                ${(org.description || org.tagline)
                  ? `<p class="booth-hero__tagline">${escapeHtml(org.description || org.tagline)}</p>`
                  : ''}
                ${org.meets ? `
                  <div class="booth-hero__meet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    ${escapeHtml(org.meets)}
                  </div>
                ` : ''}
              </div>

              <div class="booth-hero__emblem"
                   style="color: var(--${primaryColor}-ink); background: var(--${primaryColor}-soft);"
                   aria-hidden="true">
                ${org.logo
                  ? `<img class="booth-hero__logo" src="${escapeHtml(org.logo)}" alt=""/>`
                  : escapeHtml(org.short)}
              </div>
            </div>

            <div class="booth-hero__ctas">
              ${org.fbUrl ? `
                <a class="btn btn--primary" href="${escapeHtml(org.fbUrl)}" target="_blank" rel="noopener noreferrer">
                  Visit Facebook page
                  <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 H3 v10 h10 V10"/><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="7" y2="9"/>
                  </svg>
                </a>` : ''}
              ${(org.emails && org.emails[0]) ? `
                <a class="btn btn--ghost" href="mailto:${escapeHtml(org.emails[0])}">
                  Email the org
                  <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="1" y="3" width="14" height="10" rx="2"/><polyline points="1,4 8,9 15,4"/>
                  </svg>
                </a>` : ''}
            </div>
          </div>
        </section>

          ${venueMapHtml(org)}
        </div>

        <div class="booth-aside">
          ${fbCardHtml(org)}
          ${metaPanel(org)}
        </div>
      </div>
    </div>
  `;
}

// ---------- sub-templates ----------

function metaPanel(org) {
  const cats = org.tags.map(t => SHORT_LABEL[t] || t).join(' · ');
  const emailRows = (org.emails || []).map(e => `
    <div class="panel__row">
      <span class="panel__row-label">Email</span>
      <a class="panel__row-value panel__row-value--link" href="mailto:${escapeHtml(e)}">${escapeHtml(e)}</a>
    </div>`).join('');
  return `
    <section class="panel">
      <div class="panel__kicker">Contact</div>
      <div class="panel__rows">
        <div class="panel__row"><span class="panel__row-label">Cluster</span><span class="panel__row-value">${escapeHtml(cats)}</span></div>
        ${emailRows}
        <div class="panel__row">
          <span class="panel__row-label">Facebook</span>
          ${org.fbUrl
            ? `<a class="panel__row-value panel__row-value--link" href="${escapeHtml(org.fbUrl)}" target="_blank" rel="noopener noreferrer">${org.fbHandle ? '@' + escapeHtml(org.fbHandle) : 'Facebook page'}</a>`
            : `<span class="panel__row-value panel__row-value--none">Not listed</span>`}
        </div>
      </div>
    </section>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
