/* ============================================================
   components/bento-hero.js — the live parts of the Discover tiles
   (Xavier Cup 2026 design only; the markup is in index.html).

     [data-bento-count]   org / cluster / team totals from the data
     [data-bento-season]  countdown before the season, "Day 3 of 11"
                          during it, a results link after it
     [data-bento-live]    the live game (or the next one); your
                          team's game wins when there is one
     [data-bento-teams]   the team picker

   Everything reads cupNow(), so the preview clock in
   data/xavier-cup.js moves Discover and the Cup tab together.
   Repaints every minute and whenever the followed team changes.
   ============================================================ */

import { ORGS } from '../data/organizations.js';
import { CATEGORIES } from '../data/categories.js';
import { TEAMS } from '../data/teams.js';
import { CUP_CONFIG, GAMES, cupNow, seasonState } from '../data/xavier-cup.js';
import { resolveGame } from './game-card.js';
import { mountTeamStrip } from './team-strip.js';
import { formatDay, formatTime } from '../lib/dates.js';
import { currentTeam, onMyTeamChange } from '../lib/my-team.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';
import { navigate } from '../router.js';

const pad = (n) => String(n).padStart(2, '0');

export function initBentoHero(root) {
  const hero = root.querySelector('[data-bento-hero]');
  if (!hero || hero.__wired) return;
  hero.__wired = true;

  const counts = { orgs: ORGS.length, clusters: CATEGORIES.length, teams: TEAMS.length };
  hero.querySelectorAll('[data-bento-count]').forEach(el => {
    const v = counts[el.dataset.bentoCount];
    if (v !== undefined) el.textContent = String(v);
  });

  mountTeamStrip(hero.querySelector('[data-bento-teams]'));

  hero.addEventListener('click', (e) => {
    const game = e.target.closest('[data-bento-game]');
    if (game) { e.preventDefault(); navigate({ screen: 'cup', game: game.dataset.bentoGame }); return; }

    // Links into one view of the Cup tab (and optionally a filter).
    const tab = e.target.closest('[data-bento-tab]');
    if (tab) {
      e.preventDefault();
      navigate({ screen: 'cup', tab: tab.dataset.bentoTab, status: tab.dataset.bentoStatus || '' });
    }
  });

  const paint = () => {
    const now = cupNow();
    const games = GAMES.map(g => resolveGame(g, now));
    paintSeason(hero.querySelector('[data-bento-season]'), now, games);
    paintLive(hero.querySelector('[data-bento-live]'), games);
  };
  paint();
  setInterval(paint, 60000);
  onMyTeamChange(paint);
}

/* ---------- The lime season tile ---------- */
function paintSeason(el, now, games) {
  if (!el) return;
  const s = seasonState(now);
  if (!s) { el.hidden = true; return; }

  if (s.phase === 'before') {
    const ms = Math.max(0, s.start - now);
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms / 3600000) % 24;
    const m = Math.floor(ms / 60000) % 60;
    el.innerHTML = `
      <p class="bento__eyebrow">Opening day</p>
      <p class="bento__season-date">${escapeHtml(formatDay(s.start, { withYear: false, weekday: false }))}</p>
      <p class="bento__season-note">${escapeHtml(CUP_CONFIG.season.openingNote || '')}</p>
      <div class="bento__count" role="timer" aria-label="${d} days, ${h} hours and ${m} minutes to go">
        <span><b>${pad(d)}</b>days</span><span><b>${pad(h)}</b>hrs</span><span><b>${pad(m)}</b>min</span>
      </div>`;
    return;
  }

  if (s.phase === 'during') {
    const today = games.filter(g => g.start && sameDay(g.start, now));
    const live = today.filter(g => g.status === 'ongoing').length;
    const left = today.filter(g => g.status === 'upcoming').length;
    el.innerHTML = `
      <p class="bento__eyebrow">Day ${s.day} of ${s.totalDays}</p>
      <p class="bento__season-date">${escapeHtml(formatDay(now, { withYear: false }))}</p>
      <p class="bento__season-note">${today.length
        ? `${today.length} game${today.length === 1 ? '' : 's'} today · ${live} live · ${left} still to start`
        : 'No games today. Rest day.'}</p>
      <a class="bento__season-link" href="?screen=cup&amp;tab=fixtures" data-bento-tab="fixtures">Today’s fixtures →</a>`;
    return;
  }

  el.innerHTML = `
    <p class="bento__eyebrow">Season complete</p>
    <p class="bento__season-date">${escapeHtml(formatDay(s.end, { withYear: false, weekday: false }))}</p>
    <p class="bento__season-note">Every result from all ${s.totalDays} days is on the Xavier Cup tab.</p>
    <a class="bento__season-link" href="?screen=cup&amp;tab=fixtures&amp;status=finished"
       data-bento-tab="fixtures" data-bento-status="finished">See the results →</a>`;
}

/* ---------- The live strip ---------- */
function paintLive(el, games) {
  if (!el) return;
  const mine = currentTeam();
  const ofMine = (list) => (mine ? list.find(g => g.teamIds.includes(mine)) : null) || list[0];

  const live = games.filter(g => g.status === 'ongoing').sort((a, b) => a.start - b.start);
  const next = games.filter(g => g.status === 'upcoming').sort((a, b) => a.start - b.start);
  const g = live.length ? ofMine(live) : ofMine(next.filter(x => !mine || x.teamIds.includes(mine))) || next[0];

  if (!g) { el.hidden = true; return; }
  el.hidden = false;

  const isLive = g.status === 'ongoing';
  const scored = isLive && g.score && g.score.home !== undefined;
  const sides = g.sides.length >= 2
    ? `<span class="bento__live-team">${escapeHtml(g.sides[0].name)}</span>
       <b class="bento__live-score">${scored ? `${escapeHtml(String(g.score.home))} – ${escapeHtml(String(g.score.away))}` : 'vs'}</b>
       <span class="bento__live-team">${escapeHtml(g.sides[1].name)}</span>`
    : `<span class="bento__live-team">${escapeHtml(g.teams[0] || '')}</span>`;
  const when = isLive ? g.venueName : `${formatDay(g.start, { withYear: false })} · ${formatTime(g.start)} · ${g.venueName}`;
  const others = isLive && live.length > 1 ? `<span class="bento__live-more">+${live.length - 1} more live</span>` : '';

  el.innerHTML = `
    <a class="bento__live-link" href="?screen=cup&amp;game=${escapeAttr(g.id)}" data-bento-game="${escapeAttr(g.id)}">
      <span class="bento__live-tag bento__live-tag--${isLive ? 'live' : 'next'}">${isLive ? 'Live' : 'Next up'}</span>
      <span class="bento__live-sport">${escapeHtml(g.sport)}</span>
      <span class="bento__live-match">${sides}</span>
      <span class="bento__live-where">${escapeHtml(when)}</span>
      ${others}
    </a>`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
