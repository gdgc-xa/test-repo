/* ============================================================
   components/game-detail.js — one fixture in full, rendered into
   the shared detail modal.

   Everything a student standing on campus needs: who is playing,
   what state it is in, when, and — the part the search exists for
   — exactly where, shown on the same campus map as the tab itself
   with that one venue lit.
   ============================================================ */

import { CUP_CONFIG } from '../data/xavier-cup.js';
import { statusPillHtml, GAME_STATUS_LABEL } from './status.js';
import { cupMapHtml } from './cup-map.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

export function gameDetailHtml(g) {
  const link = safeUrl(g.link);
  const hasScore = CUP_CONFIG.showScores && g.score
    && g.score.home !== undefined && g.score.away !== undefined;

  const teamsBlock = g.teams.length >= 2
    ? `<div class="versus${hasScore ? ' versus--scored' : ''}">
         ${teamSide(g.sides?.[0] || g.teams[0], hasScore ? g.score.home : null,
                    hasScore && Number(g.score.home) > Number(g.score.away))}
         <span class="versus__sep" aria-hidden="true">${hasScore ? '–' : 'vs'}</span>
         ${teamSide(g.sides?.[1] || g.teams[1], hasScore ? g.score.away : null,
                    hasScore && Number(g.score.away) > Number(g.score.home))}
       </div>`
    : `<p class="versus versus--solo">${escapeHtml(g.teams[0] || g.sport || '')}</p>`;

  const facts = [
    ['Sport', g.sport],
    ['Division', g.division],
    ['Round', g.round],
    ['When', g.when],
    ['Venue', g.venueName],
  ].filter(([, v]) => v).map(([k, v]) => `
    <div class="detail-fact">
      <span class="detail-fact__label">${escapeHtml(k)}</span>
      <div class="detail-fact__value">${escapeHtml(v)}</div>
    </div>`).join('');

  /* The venue is shown, not just named: the mini map is the same
     component as the tab's big one, with this venue selected. */
  const where = g.venue ? `
    <section class="panel detail__where">
      <div class="panel__kicker">Where it is being played</div>
      <p class="detail__venue-name">${escapeHtml(g.venue.name)}</p>
      ${g.venue.note ? `<p class="detail__venue-note">${escapeHtml(g.venue.note)}</p>` : ''}
      <div class="detail__map">${cupMapHtml({}, { selected: g.venueId, mini: true })}</div>
      <button class="btn btn--ghost btn--sm detail__venue-cta" type="button" data-show-venue="${escapeAttr(g.venueId)}">
        See everything at this venue
      </button>
    </section>` : '';

  return `
    <article class="detail detail--game" style="--detail-accent: var(--${g.color});">
      <header class="detail__hero detail__hero--game">
        <div class="detail__tags">
          ${statusPillHtml(g.status, { labels: GAME_STATUS_LABEL })}
          ${g.round ? `<span class="tag tag--booth tag--plain">${escapeHtml(g.round)}</span>` : ''}
          ${g.sport ? `<span class="tag tag--booth tag--plain">${escapeHtml(g.sport)}${g.division ? ` · ${escapeHtml(g.division)}` : ''}</span>` : ''}
        </div>
        <h1 class="detail__title detail__title--game" id="detail-title">${escapeHtml(g.title)}</h1>
        ${teamsBlock}
        <p class="detail__when">${escapeHtml(g.when)}${
          g.relative && g.status === 'upcoming'
            ? ` · <span class="detail__rel">${escapeHtml(g.relative)}</span>` : ''
        }</p>
      </header>

      <div class="detail__grid">
        <div class="detail__main">
          <section class="panel">
            <div class="panel__kicker">About this match</div>
            <p class="detail__body">${
              g.description
                ? escapeHtml(g.description)
                : 'No write-up for this fixture yet.'
            }</p>
            ${link ? `
              <a class="btn btn--primary detail__cta" href="${escapeAttr(link)}"
                 ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                ${escapeHtml(g.linkLabel || 'More about this match')}
                <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 3 H3 v10 h10 V10"/><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="7" y2="9"/>
                </svg>
              </a>` : ''}
          </section>

          ${where}
        </div>

        <aside class="detail__aside">
          <section class="panel">
            <div class="panel__kicker">Fixture</div>
            <div class="detail-facts">${facts}</div>
          </section>
        </aside>
      </div>
    </article>`;
}

function teamSide(team, score, isWinner) {
  // A team record from data/teams.js, or a bare name for anything else.
  const t = typeof team === 'string' ? { name: team } : (team || {});
  return `
    <div class="versus__side${isWinner ? ' is-winner' : ''}">
      ${t.logo ? `<img class="versus__crest" src="${escapeAttr(t.logo)}" alt="">` : ''}
      <span class="versus__who">
        <span class="versus__team">${escapeHtml(t.name || '—')}</span>
        ${t.college ? `<span class="versus__college">${escapeHtml(t.college)}</span>` : ''}
      </span>
      ${score !== null && score !== undefined
        ? `<span class="versus__score">${escapeHtml(String(score))}</span>` : ''}
    </div>`;
}
