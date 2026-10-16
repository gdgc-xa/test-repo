/* ============================================================
   components/match-card.js — one match as a match card.

   The layout every scores app has settled on, because it reads
   in one glance:

     🏀 BASKETBALL · MEN · SEMIFINAL           CHAMPIONSHIP
     [crest]          ┌─────────┐          [crest]
     CCS Wizards      │ 48 – 44 │     ENG'G Warriors
     College of …     ├─────────┤     College of …
                      │  LIVE   │
                      └─────────┘
     📍 Xavier Covered Court                Mon, 12 Oct

   The box in the middle holds the score once play has started
   and the start time before that. The bar under it carries the
   state: red for live, gold for final, navy for upcoming.

   The card is an <article>. A button stretched over all of it opens
   the match; the venue is a real link on top of that button, to the
   Map with the venue picked (a link can't sit inside a button).

   Takes a game already run through resolveGame() (game-card.js).
   ============================================================ */

import { CUP_CONFIG } from '../data/xavier-cup.js';
import { sportGlyph } from './game-card.js';
import { sportIcon } from './cup-map.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const BAR_LABEL = { upcoming: 'Upcoming', ongoing: 'Live', finished: 'Final' };

function hasScore(g) {
  return CUP_CONFIG.showScores && g.status !== 'upcoming' && g.score
    && g.score.home !== undefined && g.score.away !== undefined;
}

/** The sport's configured/shared WebP picture, else its line glyph. */
function sportIconHtml(sport) {
  const src = sportIcon(sport);
  if (src) return `<img class="match__icon" src="${escapeAttr(src)}" alt="" loading="lazy" decoding="async">`;
  return sportGlyph(sport) || '';
}

function sideHtml(team, { winner = false, loser = false, align = 'home' } = {}) {
  if (!team) return '<span class="match__side" aria-hidden="true"></span>';
  const crest = team.logo
    ? `<img src="${escapeAttr(team.logo)}" alt="" loading="lazy" decoding="async">`
    : `<span class="match__initials">${escapeHtml(String(team.short || team.name).slice(0, 3))}</span>`;
  return `
    <span class="match__side match__side--${align}${winner ? ' is-winner' : ''}${loser ? ' is-loser' : ''}">
      <span class="match__crest">${crest}</span>
      <span class="match__team">${escapeHtml(team.name)}</span>
      ${team.college ? `<span class="match__college">${escapeHtml(team.college)}</span>` : ''}
    </span>`;
}

/**
 * matchCardHtml(g, { i, myTeams, featured })
 *   i         position in its list, for the reveal stagger
 *   myTeams   the followed team ids; their games get a lime ring
 *   featured  the larger version, first card of the chosen day
 */
export function matchCardHtml(g, { i = 0, myTeams = [], featured = false } = {}) {
  const scored = hasScore(g);
  const home = Number(g.score?.home);
  const away = Number(g.score?.away);
  const decided = scored && g.status === 'finished' && home !== away;
  const mine = Boolean(g.teamIds?.some(id => myTeams.includes(id)));
  const solo = (g.sides?.length || 0) < 2;

  const box = scored
    ? `${escapeHtml(String(g.score.home))}<span class="match__dash" aria-hidden="true">–</span>${escapeHtml(String(g.score.away))}`
    : escapeHtml(g.timeLabel || 'TBA');

  const scoreLabel = scored
    ? `${g.status === 'ongoing' ? 'Live score' : 'Final score'} ${g.score.home} to ${g.score.away}`
    : `Starts ${g.timeLabel || 'at a time to be announced'}`;

  const stagger = Math.min(i * 40, 360);

  const middle = `
    <span class="match__mid match__mid--${g.status}">
      <span class="match__box">${box}</span>
      <span class="match__bar">${escapeHtml(g.statusLabel || BAR_LABEL[g.status] || '')}</span>
    </span>`;

  const row = solo
    ? `<span class="match__row match__row--solo" aria-hidden="true">
         <span class="match__solo">${escapeHtml(g.title || g.teams[0] || g.sport || 'All colleges')}${
           g.podium ? `<span class="match__podium">${escapeHtml(g.podium)}</span>` : ''}</span>
         ${middle}
       </span>`
    : `<span class="match__row" aria-hidden="true">
         ${sideHtml(g.sides[0], { winner: decided && home > away, loser: decided && home < away, align: 'home' })}
         ${middle}
         ${sideHtml(g.sides[1], { winner: decided && away > home, loser: decided && away < home, align: 'away' })}
       </span>`;

  const venue = g.venueId
    ? `<a class="match__venue" href="?screen=cup&amp;tab=map&amp;venue=${escapeAttr(encodeURIComponent(g.venueId))}"
          data-match-venue="${escapeAttr(g.venueId)}" aria-label="${escapeAttr(`${g.venueName}, on the map`)}">
         <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
           <path d="M8 15s5-4.6 5-8.4A5 5 0 0 0 3 6.6C3 10.4 8 15 8 15z"/><circle cx="8" cy="6.5" r="1.9"/>
         </svg>
         <span>${escapeHtml(g.venueName)}</span>
       </a>`
    : g.venueName
      ? `<span class="match__venue"><span>${escapeHtml(g.venueName)}</span></span>`
      : `<span class="match__venue match__venue--none">Venue to follow</span>`;

  const cls = [
    'match', 'reveal',
    `match--${g.status}`,
    featured ? 'match--featured' : '',
    mine ? 'is-mine' : '',
  ].filter(Boolean).join(' ');

  const label = [
    g.title, scoreLabel, g.meta,
    [g.dayLabel, g.venueName].filter(Boolean).join(', '),
    mine ? 'Your team' : '',
  ].filter(Boolean).join('. ');

  return `
    <article class="${cls}" style="--reveal-delay: ${stagger}ms;">
      <button class="match__open" type="button" data-game-id="${escapeAttr(g.id)}"
              aria-label="${escapeAttr(`${label}. Open match details`)}"></button>
      <span class="match__meta" aria-hidden="true">
        <span class="match__sport">
          ${sportIconHtml(g.sport)}
          <span class="match__what">${escapeHtml(g.meta || g.sport || '')}</span>
        </span>
        ${g.note ? `<span class="match__note">${escapeHtml(g.note)}</span>` : ''}
      </span>
      ${row}
      <span class="match__foot">
        ${venue}
        <span class="match__day" aria-hidden="true">${escapeHtml(g.dayLabel)}${scored && g.timeLabel ? ` · ${escapeHtml(g.timeLabel)}` : ''}</span>
      </span>
      ${mine ? '<span class="match__mine" aria-hidden="true">Your team</span>' : ''}
    </article>`;
}
