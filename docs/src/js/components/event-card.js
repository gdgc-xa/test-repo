/* ============================================================
   components/event-card.js — one event, as a card.

   Deliberately the SAME shell as the org card (components/card.js):
   the accent rail, the emblem tile, the tag row, the clamped body
   and the footer with a CTA. An events grid and an orgs grid should
   look like two views of one product, not two products.

   Three differences, all of them the event's own content:
     · the emblem tile is a calendar date, not a logo
     · a status pill (Upcoming / Ongoing / Finished) leads the tags
     · the footer meta line is the venue, not a Facebook handle

   `variant: 'spotlight'` is the featured treatment — the same card,
   wider, with the host's logo alongside the date.
   ============================================================ */

import { COLOR_OF, SHORT_LABEL } from '../data/categories.js';
import { ORGS } from '../data/organizations.js';
import { parseDate, tileParts, formatRange, relativeLabel, computeStatus } from '../lib/dates.js';
import { DEFAULT_DURATION_MINS } from '../data/events.js';
import { statusPillHtml } from './status.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

const ORG_BY_ID = Object.fromEntries(ORGS.map(o => [o.id, o]));

/**
 * resolveEvent(ev) — everything the templates need, worked out once.
 * Kept separate from the markup so the card, the detail view and the
 * search all agree about who is hosting and what state it is in.
 */
export function resolveEvent(ev, now = new Date()) {
  const org = ev.org ? ORG_BY_ID[ev.org] : null;
  if (ev.org && !org) {
    console.warn(
      `[events] "${ev.id}" lists org "${ev.org}", which is not in data/organizations.js. ` +
      `Showing the event without a host — check for a typo.`
    );
  }
  const clusterId = ev.tag || org?.tags?.[0] || null;
  const color = (clusterId && COLOR_OF[clusterId]) || 'blue';
  const status = computeStatus(ev, now, DEFAULT_DURATION_MINS);
  const start = parseDate(ev.start);

  return {
    ...ev,
    org,
    hostName: ev.host || org?.name || '',
    hostShort: org?.short || ev.host || '',
    clusterId,
    clusterLabel: clusterId ? (SHORT_LABEL[clusterId] || clusterId) : '',
    color,
    status,
    start,
    when: formatRange(ev.start, ev.end),
    relative: start ? relativeLabel(start, now) : '',
  };
}

/**
 * eventCardHtml(resolved, i, opts)
 * @param {object} e   an event already through resolveEvent()
 * @param {number} i   index in the grid (drives the reveal stagger)
 * @param {{variant?: 'spotlight'}} opts
 */
export function eventCardHtml(e, i = 0, { variant = '' } = {}) {
  const stagger = Math.min(i * 60, 420);
  const accent = `var(--${e.color})`;
  const spotlight = variant === 'spotlight';

  const { month, day } = tileParts(e.start);

  const badges = [
    e.note ? `<span class="card__badge">${escapeHtml(e.note)}</span>` : '',
  ].filter(Boolean).join('');

  const extraTags = (e.tags || []).slice(0, 3).map(t =>
    `<span class="tag tag--card tag--plain">${escapeHtml(t)}</span>`
  ).join('');

  const clusterTag = e.clusterLabel
    ? `<span class="tag tag--card"
             style="--tag-accent-soft: var(--${e.color}-soft); --tag-accent-ink: var(--${e.color}-ink);">
         ${escapeHtml(e.clusterLabel)}
       </span>`
    : '';

  const hostLine = e.hostShort
    ? `<div class="card__short">${escapeHtml(e.hostShort)}</div>`
    : '';

  // The host's logo only earns its place on the wide spotlight card;
  // on a normal card the date tile is the emblem and one image is enough.
  const hostLogo = spotlight && e.org?.logo
    ? `<img class="event-card__hostlogo" src="${escapeAttr(e.org.logo)}" alt="" loading="lazy" decoding="async"/>`
    : '';

  const venue = e.location
    ? `<span class="card__meta">
         <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
           <path d="M8 15s5-4.6 5-8.4A5 5 0 0 0 3 6.6C3 10.4 8 15 8 15z"/><circle cx="8" cy="6.5" r="1.9"/>
         </svg>
         ${escapeHtml(e.location)}
       </span>`
    : `<span class="card__meta card__meta--muted">Venue to follow</span>`;

  return `
    <button class="card card--event${spotlight ? ' card--spotlight' : ''} reveal"
            type="button"
            data-event-id="${escapeAttr(e.id)}"
            style="--card-accent: ${accent}; --card-accent-soft: var(--${e.color}-soft); --card-accent-ink: var(--${e.color}-ink); --reveal-delay: ${stagger}ms;"
            aria-label="Open ${escapeAttr(e.title)}">
      ${badges ? `<div class="card__badges">${badges}</div>` : ''}

      <div class="card__head">
        <span class="card__emblem card__emblem--date" aria-hidden="true">
          <span class="date-tile__month">${escapeHtml(month)}</span>
          <span class="date-tile__day">${escapeHtml(day)}</span>
        </span>
        ${hostLogo}
        <div class="card__headtext">
          <div class="card__title">${escapeHtml(e.title)}</div>
          ${hostLine}
        </div>
      </div>

      <div class="card__when">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${escapeHtml(e.when)}</span>
        ${e.relative && e.status !== 'finished'
          ? `<span class="card__when-rel">${escapeHtml(e.relative)}</span>` : ''}
      </div>

      <div class="card__tags">
        ${statusPillHtml(e.status)}
        ${clusterTag}
        ${extraTags}
      </div>

      <div class="card__body">
        ${e.description
          ? `<p class="card__desc">${escapeHtml(e.description)}</p>`
          : `<p class="card__desc card__desc--muted">Details to follow.</p>`}
      </div>

      <div class="card__foot">
        ${venue}
        <span class="card__cta">${escapeHtml(e.cta || 'View event →')}</span>
      </div>
    </button>`;
}

/** Does this event match a free-text query? */
export function eventMatches(e, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [
    e.title, e.description, e.location, e.hostName, e.hostShort,
    e.clusterLabel, e.when, ...(e.tags || []),
  ];
  return hay.some(v => v && String(v).toLowerCase().includes(q));
}

/** The external link, once it has been checked. '' when unusable. */
export function eventLink(e) {
  return safeUrl(e.link);
}
