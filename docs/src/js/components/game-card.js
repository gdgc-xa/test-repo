/* ============================================================
   components/game-card.js — one Xavier Cup fixture, as a card.

   Same shell as the org card and the event card, so the three
   grids read as one system. What is specific to a fixture:
     · the emblem is the sport's glyph
     · the body is the scoreline once there is one
     · the footer meta is the venue, which is also the thing the
       map is keyed on
   ============================================================ */

import { CUP_CONFIG, VENUE_BY_ID, sportsInPlay } from '../data/xavier-cup.js';
import { parseDate, formatRange, relativeLabel, computeStatus, formatTime, formatDay } from '../lib/dates.js';
import { statusPillHtml, GAME_STATUS_LABEL } from './status.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

/* The four site hues, handed out one per sport in the order the
   sports first appear in the data. Keeps a long fixture list from
   reading as one grey block without inventing a fifth palette. */
const HUES = ['blue', 'green', 'yellow', 'red'];

export function colorForSport(sport) {
  const i = sportsInPlay().indexOf(sport);
  return HUES[(i < 0 ? 0 : i) % HUES.length];
}

/* ---------- Sport glyphs ----------
   Small line drawings, not logos. A sport with no glyph here falls
   back to its initial, the same way a logo-less org card does. */
const SPORT_GLYPH = {
  basketball: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/>`,
  volleyball: `<circle cx="12" cy="12" r="9"/><path d="M12 3c-3 4-3 12 0 18M3.6 9c4.5 1.2 11 .2 15.6-3M3.9 15.6C8 13 15 13 19.6 16.4"/>`,
  football:   `<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 3v4.5M4.2 9.6l3.8.8M6.2 19l3.3-3.9M17.8 19l-3.3-3.9M19.8 9.6l-3.8.8"/>`,
  chess:      `<path d="M9 21h6M8.5 21c0-3 2-4 2-6H9a3 3 0 0 1 1.2-5.2A2.5 2.5 0 1 1 13.8 9.8 3 3 0 0 1 15 15h-1.5c0 2 2 3 2 6"/>`,
  badminton:  `<path d="M14.5 3.5 9 12l3 3 8.5-5.5z"/><path d="M12 15l-6.5 6.5"/><circle cx="4" cy="20" r="1.6"/><path d="M11.5 6 15 9.5M13 4.6 16.4 8"/>`,
  athletics:  `<circle cx="14" cy="4.5" r="2"/><path d="M6 21l3.5-5 3-2.5-1-4.5L8 11l-2.5-1"/><path d="M11.5 11.5 15 14l1.5 5M14.5 9l3.5 1.5"/>`,
  esports:    `<rect x="2.5" y="7.5" width="19" height="10" rx="4"/><path d="M7 11v3M5.5 12.5h3M16 11.6h.01M18 13.6h.01"/>`,
  swimming:   `<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5S16 18 18 18s2-1.5 4-1.5"/><path d="M6.5 13 11 9l5 3.5"/><circle cx="17.5" cy="7.5" r="1.8"/>`,
};

function sportGlyph(sport) {
  const key = String(sport || '').toLowerCase().replace(/[^a-z]/g, '');
  const paths = SPORT_GLYPH[key];
  if (!paths) return null;
  return `<svg class="sport-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/**
 * resolveGame(g, now) — one fixture with everything worked out:
 * its venue record, its live status, its scoreline and its label.
 */
export function resolveGame(g, now = new Date()) {
  const venue = g.venue ? VENUE_BY_ID[g.venue] : null;
  if (g.venue && !venue) {
    console.warn(
      `[xavier-cup] game "${g.id}" is at venue "${g.venue}", which is not in CUP_MAP.venues. ` +
      `It will show without a location and will not appear on the map.`
    );
  }
  const status = computeStatus(g, now, CUP_CONFIG.defaultDurationMins);
  const start = parseDate(g.start);
  const teams = Array.isArray(g.teams) ? g.teams.filter(Boolean) : [];
  const title = g.title || (teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : (teams[0] || g.sport || 'Fixture'));

  return {
    ...g,
    venue,
    venueId: g.venue || null,
    venueName: venue?.name || '',
    status,
    start,
    teams,
    title,
    color: colorForSport(g.sport),
    when: formatRange(g.start, g.end),
    dayLabel: start ? formatDay(start, { withYear: false }) : '',
    timeLabel: start ? formatTime(start) : '',
    relative: start ? relativeLabel(start, now) : '',
    meta: [g.sport, g.division, g.round].filter(Boolean).join(' · '),
  };
}

/** The scoreline, or '' when there is nothing to show yet. */
function scoreHtml(g) {
  if (!CUP_CONFIG.showScores || !g.score) return '';
  const { home, away } = g.score;
  if (home === undefined || away === undefined) return '';
  const homeWin = Number(home) > Number(away);
  const awayWin = Number(away) > Number(home);
  const side = (name, value, win) => `
    <div class="score__side${win ? ' is-winner' : ''}">
      <span class="score__team">${escapeHtml(name || '—')}</span>
      <span class="score__value">${escapeHtml(String(value))}</span>
    </div>`;
  return `
    <div class="score" role="group" aria-label="Final score">
      ${side(g.teams[0], home, homeWin)}
      <span class="score__sep" aria-hidden="true">–</span>
      ${side(g.teams[1], away, awayWin)}
    </div>`;
}

export function gameCardHtml(g, i = 0) {
  const stagger = Math.min(i * 50, 400);
  const glyph = sportGlyph(g.sport);
  const score = scoreHtml(g);

  const badges = [
    g.note ? `<span class="card__badge">${escapeHtml(g.note)}</span>` : '',
  ].filter(Boolean).join('');

  const venueMeta = g.venue
    ? `<span class="card__meta">
         <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
           <path d="M8 15s5-4.6 5-8.4A5 5 0 0 0 3 6.6C3 10.4 8 15 8 15z"/><circle cx="8" cy="6.5" r="1.9"/>
         </svg>
         ${escapeHtml(g.venue.short || g.venue.name)}
       </span>`
    : `<span class="card__meta card__meta--muted">Venue to follow</span>`;

  return `
    <button class="card card--game reveal"
            type="button"
            data-game-id="${escapeAttr(g.id)}"
            style="--card-accent: var(--${g.color}); --card-accent-soft: var(--${g.color}-soft); --card-accent-ink: var(--${g.color}-ink); --reveal-delay: ${stagger}ms;"
            aria-label="Open ${escapeAttr(g.title)}">
      ${badges ? `<div class="card__badges">${badges}</div>` : ''}

      <div class="card__head">
        <span class="card__emblem card__emblem--sport" aria-hidden="true">
          ${glyph || `<span class="card__initials">${escapeHtml(String(g.sport || '?').slice(0, 2).toUpperCase())}</span>`}
        </span>
        <div class="card__headtext">
          <div class="card__title">${escapeHtml(g.title)}</div>
          ${g.meta ? `<div class="card__short">${escapeHtml(g.meta)}</div>` : ''}
        </div>
      </div>

      <div class="card__when">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15.5,14"/>
        </svg>
        <span>${escapeHtml(g.when)}</span>
        ${g.relative && g.status === 'upcoming'
          ? `<span class="card__when-rel">${escapeHtml(g.relative)}</span>` : ''}
      </div>

      <div class="card__tags">
        ${statusPillHtml(g.status, { labels: GAME_STATUS_LABEL })}
        ${g.round ? `<span class="tag tag--card tag--plain">${escapeHtml(g.round)}</span>` : ''}
      </div>

      <div class="card__body">
        ${score || (g.description
          ? `<p class="card__desc">${escapeHtml(g.description)}</p>`
          : `<p class="card__desc card__desc--muted">Details to follow.</p>`)}
      </div>

      <div class="card__foot">
        ${venueMeta}
        <span class="card__cta">Match details →</span>
      </div>
    </button>`;
}

/** Free-text match used by the Cup search box. */
export function gameMatches(g, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [
    g.title, g.sport, g.division, g.round, g.description,
    g.venueName, g.venue?.short, g.when, g.note, ...(g.teams || []),
  ];
  return hay.some(v => v && String(v).toLowerCase().includes(q));
}

export function gameLink(g) {
  return safeUrl(g.link);
}
