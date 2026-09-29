/* ============================================================
   components/match-card.js — one fixture as a match card.

   The layout every scores app has settled on, because it reads
   in one glance:

     BASKETBALL · MEN                       ELIMINATION
     [crest]          ┌─────────┐          [crest]
     CCS Wizards      │ 48 – 44 │     ENG'G Warriors
     College of …     ├─────────┤     College of …
                      │  LIVE   │
                      └─────────┘
     Xavier Covered Court                  Mon, 12 Oct

   The box in the middle holds the score once play has started
   and the start time before that. The bar under it carries the
   state: red for live, gold for final, navy for upcoming.

   Takes a game already run through resolveGame() (game-card.js).
   ============================================================ */

import { CUP_CONFIG } from '../data/xavier-cup.js';
import { sportGlyph } from './game-card.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const BAR_LABEL = { upcoming: 'Upcoming', ongoing: 'Live', finished: 'Final' };

function hasScore(g) {
  return CUP_CONFIG.showScores && g.status !== 'upcoming' && g.score
    && g.score.home !== undefined && g.score.away !== undefined;
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
 * matchCardHtml(g, { i, myTeam, featured })
 *   i         position in its list, for the reveal stagger
 *   myTeam    the followed team id; its games get a lime ring
 *   featured  the larger version used under "Featured match"
 */
export function matchCardHtml(g, { i = 0, myTeam = '', featured = false } = {}) {
  const scored = hasScore(g);
  const home = Number(g.score?.home);
  const away = Number(g.score?.away);
  const decided = scored && g.status === 'finished' && home !== away;
  const mine = Boolean(myTeam) && g.teamIds?.includes(myTeam);
  const solo = (g.sides?.length || 0) < 2;

  const box = scored
    ? `${escapeHtml(String(g.score.home))}<span class="match__dash" aria-hidden="true">–</span>${escapeHtml(String(g.score.away))}`
    : escapeHtml(g.timeLabel || 'TBA');

  const scoreLabel = scored
    ? `${g.status === 'ongoing' ? 'Live score' : 'Final score'} ${g.score.home} to ${g.score.away}`
    : `Starts ${g.timeLabel || 'at a time to be announced'}`;

  const glyph = sportGlyph(g.sport);
  const stagger = Math.min(i * 40, 360);

  const middle = `
    <span class="match__mid match__mid--${g.status}" aria-hidden="true">
      <span class="match__box">${box}</span>
      <span class="match__bar">${BAR_LABEL[g.status] || ''}</span>
    </span>`;

  const row = solo
    ? `<span class="match__row match__row--solo">
         <span class="match__solo">${escapeHtml(g.teams[0] || g.sport || 'All colleges')}</span>
         ${middle}
       </span>`
    : `<span class="match__row">
         ${sideHtml(g.sides[0], { winner: decided && home > away, loser: decided && home < away, align: 'home' })}
         ${middle}
         ${sideHtml(g.sides[1], { winner: decided && away > home, loser: decided && away < home, align: 'away' })}
       </span>`;

  const cls = [
    'match', 'reveal',
    `match--${g.status}`,
    featured ? 'match--featured' : '',
    mine ? 'is-mine' : '',
  ].filter(Boolean).join(' ');

  return `
    <button class="${cls}" type="button" data-game-id="${escapeAttr(g.id)}"
            style="--reveal-delay: ${stagger}ms;"
            aria-label="${escapeAttr(`${g.title}. ${scoreLabel}. ${g.sport}${g.round ? `, ${g.round}` : ''}. Open match details`)}">
      <span class="match__meta">
        <span class="match__sport">
          ${glyph || ''}
          <span>${escapeHtml(g.sport)}${g.division ? ` · ${escapeHtml(g.division)}` : ''}</span>
        </span>
        ${g.note
          ? `<span class="match__note">${escapeHtml(g.note)}</span>`
          : (g.round ? `<span class="match__round">${escapeHtml(g.round)}</span>` : '')}
      </span>
      ${row}
      <span class="match__foot">
        <span class="match__venue">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M8 15s5-4.6 5-8.4A5 5 0 0 0 3 6.6C3 10.4 8 15 8 15z"/><circle cx="8" cy="6.5" r="1.9"/>
          </svg>
          ${escapeHtml(g.venueName || 'Venue to follow')}
        </span>
        <span class="match__day">${escapeHtml(g.dayLabel)}${scored && g.timeLabel ? ` · ${escapeHtml(g.timeLabel)}` : ''}</span>
      </span>
      ${mine ? '<span class="match__mine">Your team</span>' : ''}
    </button>`;
}
