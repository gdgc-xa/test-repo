/* ============================================================
   components/event-detail.js — the full event, rendered into the
   shared detail modal (the same shell the org booth uses).

   Layout mirrors the booth deliberately: a hero with the title and
   the actions, the long copy underneath, and a narrow aside with
   the facts (when, where, who). Someone who has opened an org
   booth already knows how to read this.
   ============================================================ */

import { statusPillHtml } from './status.js';
import { tileParts } from '../lib/dates.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

export function eventDetailHtml(e) {
  const accent = `var(--${e.color})`;
  const { month, day, year } = tileParts(e.start);
  const link = safeUrl(e.link);

  const tags = (e.tags || []).map(t =>
    `<span class="tag tag--booth tag--plain">${escapeHtml(t)}</span>`
  ).join('');

  const clusterTag = e.clusterLabel
    ? `<span class="tag tag--booth"
             style="--tag-accent-soft: var(--${e.color}-soft); --tag-accent-ink: var(--${e.color}-ink);">
         ${escapeHtml(e.clusterLabel)}
       </span>`
    : '';

  /* The host row links straight through to that org's booth when the
     event named an org from the roster — the two tabs stay connected
     instead of being two lists that happen to share a campus. */
  const hostRow = e.hostName ? `
    <div class="detail-fact">
      <span class="detail-fact__label">Organized by</span>
      <div class="detail-fact__value">
        ${e.org ? `
          <button class="host-chip" type="button" data-open-org="${escapeAttr(e.org.id)}">
            ${e.org.logo
              ? `<img class="host-chip__logo" src="${escapeAttr(e.org.logo)}" alt="" loading="lazy"/>`
              : `<span class="host-chip__initials">${escapeHtml((e.org.short || '?').slice(0, 3))}</span>`}
            <span class="host-chip__text">
              <span class="host-chip__name">${escapeHtml(e.org.name)}</span>
              <span class="host-chip__hint">Open their booth →</span>
            </span>
          </button>` : escapeHtml(e.hostName)}
        ${(e.org && e.host && e.host !== e.org.name)
          ? `<p class="detail-fact__extra">with ${escapeHtml(e.host)}</p>` : ''}
      </div>
    </div>` : '';

  return `
    <article class="detail detail--event" style="--detail-accent: ${accent};">
      <header class="detail__hero">
        <div class="detail__datetile" aria-hidden="true">
          <span class="date-tile__month">${escapeHtml(month)}</span>
          <span class="date-tile__day">${escapeHtml(day)}</span>
          <span class="date-tile__year">${escapeHtml(year)}</span>
        </div>
        <div class="detail__headtext">
          <div class="detail__tags">${statusPillHtml(e.status)}${clusterTag}${tags}</div>
          <h1 class="detail__title" id="detail-title">${escapeHtml(e.title)}</h1>
          <p class="detail__when">${escapeHtml(e.when)}${
            e.relative && e.status !== 'finished'
              ? ` · <span class="detail__rel">${escapeHtml(e.relative)}</span>` : ''
          }</p>
        </div>
      </header>

      <div class="detail__grid">
        <div class="detail__main">
          <section class="panel">
            <div class="panel__kicker">About this event</div>
            <p class="detail__body">${
              e.description
                ? escapeHtml(e.description)
                : 'The organizers have not published the details for this one yet. Check the link or their page closer to the date.'
            }</p>
            ${link ? `
              <a class="btn btn--primary detail__cta" href="${escapeAttr(link)}"
                 ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                ${escapeHtml(e.linkLabel || 'View what this event is about')}
                <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 3 H3 v10 h10 V10"/><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="7" y2="9"/>
                </svg>
              </a>` : ''}
          </section>
        </div>

        <aside class="detail__aside">
          <section class="panel">
            <div class="panel__kicker">Details</div>
            <div class="detail-facts">
              <div class="detail-fact">
                <span class="detail-fact__label">When</span>
                <div class="detail-fact__value">${escapeHtml(e.when)}</div>
              </div>
              <div class="detail-fact">
                <span class="detail-fact__label">Where</span>
                <div class="detail-fact__value">${
                  e.location ? escapeHtml(e.location) : '<span class="detail-fact__none">To be announced</span>'
                }</div>
              </div>
              ${hostRow}
            </div>
          </section>
        </aside>
      </div>
    </article>`;
}
