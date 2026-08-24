/* ============================================================
   components/facebook-card.js — the org's Facebook page, as a
   link card.

   It used to imitate Facebook's own UI: a cover, a verified tick,
   a follower/like row and Like/Message buttons. All of it was
   decoration — the counts were em-dashes, the buttons were
   disabled, and a caption admitted the API was pending. Students
   tried to click it. Now the card carries only what is true:
   who they are, and one link that works.
   ============================================================ */

import { COLOR_OF } from '../data/categories.js';

/**
 * @param {Org} org
 * @returns {string} HTML string for the FB page mockup
 */
export function fbCardHtml(org) {
  const color = COLOR_OF[org.tags[0]] || 'blue';

  // Gate on the URL, not the handle. Some pages are numeric
  // profile.php links with no vanity name — they still HAVE a page,
  // and keying this on fbHandle told OSAS's visitors it had none.
  if (!org.fbUrl) {
    const mails = (org.emails || []).map(e =>
      `<a class="fb-card__mail" href="mailto:${escapeHtml(e)}">${escapeHtml(e)}</a>`).join('');
    return `
      <aside class="fb-card fb-card--nopage">
        <div class="fb-card__body">
          <div class="fb-card__emblem"
               style="background: var(--${color}-soft); color: var(--${color}-ink);">
            ${org.logo ? `<img src="${escapeHtml(org.logo)}" alt=""/>` : escapeHtml(org.short)}
          </div>
          <div class="fb-card__name">${escapeHtml(org.name)}</div>
          <div class="fb-card__handle">No Facebook page in the roster</div>
          <div class="fb-card__mails">${mails || '<span class="fb-card__handle">No contact listed</span>'}</div>
        </div>
      </aside>`;
  }

  return `
    <aside class="fb-card" aria-labelledby="fb-card-name-${org.id}">
      <div class="fb-card__cover" aria-hidden="true"></div>

      <div class="fb-card__body">
        <div class="fb-card__emblem"
             style="background: var(--${color}-soft); color: var(--${color}-ink);">
          ${org.logo ? `<img src="${escapeHtml(org.logo)}" alt=""/>` : escapeHtml(org.short)}
        </div>

        <div id="fb-card-name-${org.id}" class="fb-card__name">${escapeHtml(org.name)}</div>
        <div class="fb-card__handle">${org.fbHandle ? '@' + escapeHtml(org.fbHandle) : 'Facebook page'}</div>
      </div>

      <a class="fb-card__link" href="${escapeHtml(org.fbUrl)}" target="_blank" rel="noopener noreferrer">
        <span class="fb-card__link-mark">f</span>
        ${org.fbHandle ? 'facebook.com/' + escapeHtml(org.fbHandle) : 'View page on Facebook'}
        <span class="fb-card__link-arrow" aria-hidden="true">↗</span>
      </a>
    </aside>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
