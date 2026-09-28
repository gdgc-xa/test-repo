/* ============================================================
   screens/cup.js — The Xavier Cup tab.

   Independent pieces, each switchable in data/xavier-cup.js
   (CUP_CONFIG.show*):

     1. HERO + COUNTERS  how many fixtures are upcoming / live / done
     2. TEAMS            pick the team you follow; its games get a
                         lime ring everywhere and fill the calendar
     3. FEATURED MATCH   one game per day under a ‹ day › pager
     4. SEARCH           its own box and its own result grid. It does
                         NOT drive the map — searching for a team
                         should not silently re-centre the campus.
     5. MAP              every venue as a pin, the number of fixtures
                         on it, live venues ringed. Selecting a pin
                         fills the panel beside it.
     6. SCHEDULE         the full fixture list with status + sport chips
     7. CALENDAR         the season as a month, with a day's games below
     8. NEWS             the CSG Facebook page, via data/cup-posts.json

   The clock decides Upcoming / Ongoing / Finished (lib/dates.js),
   read through cupNow() so a preview clock can stand in for it,
   and the tab re-checks on a timer so a match flips to live while
   the page is open rather than on the next reload.
   ============================================================ */

import {
  CUP_CONFIG, CUP_MAP, CUP_NEWS, GAMES, VENUE_BY_ID, sportsInPlay,
  cupNow, isPreviewClock,
} from '../data/xavier-cup.js';
import { TEAM_BY_ID } from '../data/teams.js';
import { byWhen, parseDate, formatDay, formatTime, formatRange } from '../lib/dates.js';
import { resolveGame, gameMatches } from '../components/game-card.js';
import { matchCardHtml } from '../components/match-card.js';
import { gameDetailHtml } from '../components/game-detail.js';
import { cupMapHtml, cupLegendHtml, venueStats } from '../components/cup-map.js';
import { statusPillHtml, GAME_STATUS_LABEL } from '../components/status.js';
import { mountTeamStrip } from '../components/team-strip.js';
import { dayKey, gameDays, initialDay, gamesOn, pickFeatured, keyToDate } from '../components/featured-match.js';
import { calendarHtml, gameMonths } from '../components/cup-calendar.js';
import { openDetail, closeDetail } from '../components/detail-modal.js';
import { attachSearchShell, setSearchValue } from '../components/search-shell.js';
import { currentTeam, onMyTeamChange } from '../lib/my-team.js';
import { watchReveals } from '../reveal-observer.js';
import { currentQuery } from '../router.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

const STATUS_ORDER = { ongoing: 0, upcoming: 1, finished: 2 };

const STATUS_FILTERS = [
  { id: 'all',      label: 'All',      color: 'blue'   },
  { id: 'upcoming', label: 'Upcoming', color: 'green'  },
  { id: 'ongoing',  label: 'Live',     color: 'red'    },
  { id: 'finished', label: 'Finished', color: 'yellow' },
];

const state = {
  query: '',
  status: 'all',
  sport: null,
  venue: null,
  featuredDay: '',
  calMonth: null,
  calDay: '',
};

let rootEl = null;
let tick = null;

/* ---------- Boot ---------- */

export function initCup(root) {
  rootEl = root;

  const q = currentQuery();
  state.query = q.q || '';
  state.status = STATUS_FILTERS.some(f => f.id === q.status)
    ? q.status
    : (CUP_CONFIG.defaultStatus || 'all');
  state.sport = q.sport || null;
  state.venue = (q.venue && VENUE_BY_ID[q.venue]) ? q.venue : null;

  // --- Static copy, straight from the config ---
  setText(root, '[data-cup-kicker]', CUP_CONFIG.kicker);
  setText(root, '[data-cup-name]', CUP_CONFIG.name);
  setText(root, '[data-cup-tagline]', CUP_CONFIG.tagline);
  setText(root, '[data-cup-lede]', CUP_CONFIG.lede);

  const preview = root.querySelector('[data-cup-preview]');
  if (preview) {
    preview.hidden = !isPreviewClock();
    if (isPreviewClock()) {
      const now = cupNow();
      preview.textContent = `Preview · showing the season as of ${formatDay(now, { withYear: false })}, ${formatTime(now)}`;
    }
  }

  // --- Section visibility ---
  toggle(root, '[data-cup-hero]', CUP_CONFIG.showHero);
  toggle(root, '[data-cup-counters]', CUP_CONFIG.showCounters);
  toggle(root, '[data-cup-teams-section]', CUP_CONFIG.showTeams);
  toggle(root, '[data-cup-featured-section]', CUP_CONFIG.showFeatured);
  toggle(root, '[data-cup-search-section]', CUP_CONFIG.showSearch);
  toggle(root, '[data-cup-map-section]', CUP_CONFIG.showMap);
  toggle(root, '[data-cup-schedule-section]', CUP_CONFIG.showSchedule);
  toggle(root, '[data-cup-calendar-section]', CUP_CONFIG.showCalendar);
  toggle(root, '[data-cup-news-section]', CUP_CONFIG.showNews && CUP_NEWS.enabled);

  // --- Search ---
  const shell = root.querySelector('[data-cup-search]');
  if (shell && !shell.__wired) {
    shell.__wired = true;
    setSearchValue(shell, state.query);
    attachSearchShell(shell, (query) => {
      state.query = query;
      render();
    });
  } else if (shell) {
    setSearchValue(shell, state.query);
  }

  // --- One-time wiring for the whole screen ---
  if (!root.__wired) {
    root.__wired = true;

    if (CUP_CONFIG.showTeams) {
      mountTeamStrip(root.querySelector('[data-cup-teams]'));
    }
    onMyTeamChange(() => {
      if (currentQuery().screen === 'cup') render();
    });

    root.addEventListener('click', (e) => {
      const jump = e.target.closest('[data-cup-jump]');
      if (jump) {
        root.querySelector(`[data-cup-${jump.dataset.cupJump}-section]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const pin = e.target.closest('[data-venue-id]');
      if (pin) { selectVenue(pin.dataset.venueId, { toggle: true }); return; }

      const card = e.target.closest('[data-game-id]');
      if (card) { openGame(card.dataset.gameId); return; }

      const statusChip = e.target.closest('[data-status-id]');
      if (statusChip) { state.status = statusChip.dataset.statusId; render(); return; }

      const sportChip = e.target.closest('[data-sport-id]');
      if (sportChip) {
        const id = sportChip.dataset.sportId;
        state.sport = (state.sport === id || id === 'all') ? null : id;
        render();
        return;
      }

      const step = e.target.closest('[data-featured-step]');
      if (step) { stepFeatured(Number(step.dataset.featuredStep)); return; }

      const calDay = e.target.closest('[data-cal-day]');
      if (calDay) { state.calDay = calDay.dataset.calDay; render(); return; }

      const calMonth = e.target.closest('[data-cal-month]');
      if (calMonth) { state.calMonth = keyToDate(calMonth.dataset.calMonth); render(); return; }

      if (e.target.closest('[data-cal-today]')) {
        const now = cupNow();
        state.calDay = dayKey(now);
        state.calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        render();
        return;
      }

      if (e.target.closest('[data-cup-clear-venue]')) { selectVenue(null); return; }
      if (e.target.closest('[data-cup-clear-search]')) {
        state.query = '';
        if (shell) setSearchValue(shell, '');
        render();
      }
    });

    // Map pins are SVG groups, so they need their own key handling
    // to behave like the buttons they are announced as.
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const pin = e.target.closest?.('.cup-pin[data-venue-id]');
      if (!pin) return;
      e.preventDefault();
      selectVenue(pin.dataset.venueId, { toggle: true });
    });

    renderNews(root);
  }

  render();
  startClock();
}

/** A match starting while the page is open should go live on its
    own. One minute is far finer than any fixture needs. */
function startClock() {
  if (tick) return;
  tick = setInterval(() => {
    const screen = currentQuery().screen;
    if (screen !== 'cup') return;          // idle on other tabs
    render();
  }, 60000);
}

/* ---------- Data ---------- */

export function allGames(now = cupNow()) {
  return GAMES
    .map(g => resolveGame(g, now))
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return byWhen(a, b, a.status);
    });
}

export function findGame(id) {
  return allGames().find(g => g.id === id) || null;
}

/* ---------- Render ---------- */

function render() {
  const root = rootEl;
  if (!root) return;

  const games = allGames();
  const myTeam = currentTeam();

  renderCounters(root, games);
  renderTeamNote(root, games, myTeam);
  renderFeatured(root, games, myTeam);
  renderSearch(root, games, myTeam);
  renderMap(root, games);
  renderSchedule(root, games, myTeam);
  renderCalendar(root, games, myTeam);

  syncUrl();
}

/* --- Counters --- */
function renderCounters(root, games) {
  if (!CUP_CONFIG.showCounters) return;
  const counts = {
    upcoming: games.filter(g => g.status === 'upcoming').length,
    ongoing:  games.filter(g => g.status === 'ongoing').length,
    finished: games.filter(g => g.status === 'finished').length,
    venues:   new Set(games.map(g => g.venueId).filter(Boolean)).size,
  };
  for (const [key, value] of Object.entries(counts)) {
    setText(root, `[data-cup-count="${key}"]`, String(value));
  }
}

/* --- The line under the team picker --- */
function renderTeamNote(root, games, myTeam) {
  const note = root.querySelector('[data-cup-team-note]');
  if (!note || !CUP_CONFIG.showTeams) return;
  const team = TEAM_BY_ID[myTeam];
  if (!team) {
    note.textContent = 'Pick a team to ring its games in every list and fill the calendar with its schedule.';
    return;
  }
  const theirs = games.filter(g => g.teamIds.includes(myTeam));
  const next = theirs
    .filter(g => g.status !== 'finished')
    .sort((a, b) => a.start - b.start)[0];
  const live = theirs.find(g => g.status === 'ongoing');
  note.textContent = live
    ? `Following ${team.name}. They are playing now: ${live.sport} at ${live.venueName}.`
    : next
      ? `Following ${team.name}. Next up: ${next.sport}, ${formatDay(next.start, { withYear: false })} at ${formatTime(next.start)}.`
      : `Following ${team.name}. ${theirs.length} game${theirs.length === 1 ? '' : 's'} this season, all played.`;
}

/* --- Featured match with its day pager --- */
function renderFeatured(root, games, myTeam) {
  if (!CUP_CONFIG.showFeatured) return;
  const slot = root.querySelector('[data-featured-slot]');
  const label = root.querySelector('[data-featured-day]');
  const more = root.querySelector('[data-featured-more]');
  if (!slot || !label) return;

  const days = gameDays(games);
  if (!days.length) {
    slot.innerHTML = '<p class="filter-note filter-note--empty"><strong>No fixtures yet.</strong></p>';
    return;
  }
  if (!days.includes(state.featuredDay)) state.featuredDay = initialDay(days, cupNow());

  const i = days.indexOf(state.featuredDay);
  const date = keyToDate(state.featuredDay);
  const today = dayKey(cupNow());
  label.innerHTML = `
    <span class="featured-match__count">Day ${i + 1} of ${days.length}${state.featuredDay === today ? ' · Today' : ''}</span>
    <strong>${escapeHtml(formatDay(date, { withYear: false }))}</strong>`;

  root.querySelector('[data-featured-step="-1"]')?.toggleAttribute('disabled', i <= 0);
  root.querySelector('[data-featured-step="1"]')?.toggleAttribute('disabled', i >= days.length - 1);

  const dayGames = gamesOn(games, state.featuredDay);
  const pick = pickFeatured(dayGames, myTeam);
  slot.innerHTML = pick ? matchCardHtml(pick, { myTeam, featured: true }) : '';
  watchReveals(slot);

  if (more) {
    const rest = dayGames.length - 1;
    more.textContent = rest > 0
      ? `${rest} more game${rest === 1 ? '' : 's'} this day. They are in the fixture list and the calendar below.`
      : 'The only game this day.';
  }
}

function stepFeatured(dir) {
  const days = gameDays(allGames());
  const i = days.indexOf(state.featuredDay);
  const next = days[Math.min(days.length - 1, Math.max(0, i + dir))];
  if (next && next !== state.featuredDay) {
    state.featuredDay = next;
    render();
  }
}

/* --- Search results (independent of the map) --- */
function renderSearch(root, games, myTeam) {
  const wrap = root.querySelector('[data-cup-results]');
  if (!wrap) return;

  if (!CUP_CONFIG.showSearch || !state.query) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    return;
  }

  const hits = games.filter(g => gameMatches(g, state.query));
  wrap.hidden = false;
  wrap.innerHTML = `
    <div class="cup-results__head">
      <h3 class="cup-results__title">
        ${hits.length} result${hits.length === 1 ? '' : 's'} for “${escapeHtml(state.query)}”
      </h3>
      <button class="btn btn--ghost btn--sm" type="button" data-cup-clear-search>Clear search</button>
    </div>
    ${hits.length
      ? `<div class="match-grid">${hits.map((g, i) => matchCardHtml(g, { i, myTeam })).join('')}</div>`
      : `<div class="filter-note filter-note--empty">
           <strong>No fixture matches that.</strong>&nbsp;Try a college, a mascot, a sport, or a venue name.
         </div>`}`;
  watchReveals(wrap);
}

/* --- The consolidated map + its venue panel --- */
function renderMap(root, games) {
  if (!CUP_CONFIG.showMap) return;

  const mapWrap = root.querySelector('[data-cup-map]');
  const panel = root.querySelector('[data-cup-venue-panel]');
  const stats = venueStats(games);

  if (mapWrap) {
    mapWrap.innerHTML = cupMapHtml(stats, { selected: state.venue });
  }

  const legend = root.querySelector('[data-cup-legend]');
  if (legend) {
    legend.hidden = !CUP_CONFIG.showLegend;
    if (CUP_CONFIG.showLegend && !legend.innerHTML) legend.innerHTML = cupLegendHtml();
  }

  if (!panel) return;

  if (!state.venue) {
    // Nothing selected: the panel becomes the list of venues, so
    // the map is usable by reading as well as by pointing — which
    // is what a phone user will do.
    const rows = CUP_MAP.venues.map(v => {
      const s = stats[v.id];
      const total = s?.total ?? 0;
      return `
        <button class="venue-row${total ? '' : ' is-empty'}" type="button" data-venue-id="${escapeAttr(v.id)}">
          <span class="venue-row__name">${escapeHtml(v.name)}</span>
          <span class="venue-row__count">${total ? `${total} ${total === 1 ? 'game' : 'games'}` : 'None'}</span>
          ${s?.ongoing ? `<span class="venue-row__live">Live</span>` : ''}
        </button>`;
    }).join('');

    panel.innerHTML = `
      <div class="venue-panel__head">
        <p class="panel__kicker">All venues</p>
        <h3 class="venue-panel__title">${CUP_MAP.venues.length} venues · ${games.length} fixtures</h3>
        <p class="venue-panel__hint">Pick a pin on the map, or a venue below, to see what is on there.</p>
      </div>
      <div class="venue-rows">${rows}</div>`;
    return;
  }

  const venue = VENUE_BY_ID[state.venue];
  const here = games.filter(g => g.venueId === state.venue);
  const group = (status) => here.filter(g => g.status === status);

  const section = (status, label) => {
    const list = group(status);
    if (!list.length) return '';
    return `
      <div class="venue-group">
        <p class="venue-group__label">${escapeHtml(label)} <span>${list.length}</span></p>
        ${list.map(miniGameHtml).join('')}
      </div>`;
  };

  panel.innerHTML = `
    <div class="venue-panel__head">
      <p class="panel__kicker">Venue</p>
      <h3 class="venue-panel__title">${escapeHtml(venue.name)}</h3>
      ${venue.note ? `<p class="venue-panel__hint">${escapeHtml(venue.note)}</p>` : ''}
      <button class="btn btn--ghost btn--sm venue-panel__clear" type="button" data-cup-clear-venue>
        ← All venues
      </button>
    </div>
    ${here.length ? `
      ${section('ongoing', 'Live')}
      ${section('upcoming', 'Upcoming')}
      ${section('finished', 'Finished')}
    ` : `
      <p class="venue-panel__empty">No fixtures scheduled here yet.</p>
    `}`;
}

function miniGameHtml(g) {
  const time = g.start ? `${formatDay(g.start, { withYear: false })} · ${formatTime(g.start)}` : 'TBA';
  return `
    <button class="mini-game" type="button" data-game-id="${escapeAttr(g.id)}">
      <span class="mini-game__time">${escapeHtml(time)}</span>
      <span class="mini-game__title">${escapeHtml(g.title)}</span>
      <span class="mini-game__meta">${escapeHtml(g.meta)}</span>
      <span class="mini-game__status">${statusPillHtml(g.status, { labels: GAME_STATUS_LABEL, size: 'sm' })}</span>
    </button>`;
}

/* --- The full fixture list --- */
function renderSchedule(root, games, myTeam) {
  if (!CUP_CONFIG.showSchedule) return;

  const statusRow = root.querySelector('[data-cup-status-chips]');
  if (statusRow) {
    statusRow.hidden = !CUP_CONFIG.showStatusFilter;
    if (CUP_CONFIG.showStatusFilter) {
      const counts = Object.fromEntries(STATUS_FILTERS.map(f => [
        f.id, f.id === 'all' ? games.length : games.filter(g => g.status === f.id).length,
      ]));
      statusRow.innerHTML = STATUS_FILTERS.map(f => `
        <button class="chip" type="button" data-status-id="${f.id}"
                aria-pressed="${state.status === f.id}"
                style="--chip-accent: var(--${f.color});">
          <span class="chip__dot" aria-hidden="true"></span>
          <svg class="chip__check" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="1,7 5,11 13,2"/>
          </svg>
          <span>${escapeHtml(f.label)}</span>
          <span class="chip__count">${counts[f.id]}</span>
        </button>`).join('');
    }
  }

  const sportRow = root.querySelector('[data-cup-sport-chips]');
  if (sportRow) {
    sportRow.hidden = !CUP_CONFIG.showSportFilter;
    if (CUP_CONFIG.showSportFilter) {
      const sports = sportsInPlay();
      sportRow.innerHTML = [
        `<button class="chip chip--plain" type="button" data-sport-id="all"
                 aria-pressed="${state.sport === null}">All sports</button>`,
        ...sports.map(s => `
          <button class="chip chip--plain" type="button" data-sport-id="${escapeAttr(s)}"
                  aria-pressed="${state.sport === s}">${escapeHtml(s)}</button>`),
      ].join('');
    }
  }

  let list = games
    .filter(g => state.status === 'all' || g.status === state.status)
    .filter(g => !state.sport || g.sport === state.sport);

  if (CUP_CONFIG.maxGamesShown) list = list.slice(0, CUP_CONFIG.maxGamesShown);

  const count = root.querySelector('[data-cup-schedule-count]');
  if (count) count.textContent = `${list.length} fixture${list.length === 1 ? '' : 's'}`;

  const grid = root.querySelector('[data-cup-grid]');
  if (!grid) return;
  grid.innerHTML = list.length
    ? list.map((g, i) => matchCardHtml(g, { i, myTeam })).join('')
    : `<div class="filter-note filter-note--empty" style="grid-column: 1 / -1;">
         <strong>Nothing here yet.</strong>&nbsp;Try another status or sport.
       </div>`;
  watchReveals(grid);
}

/* --- The season calendar --- */
function renderCalendar(root, games, myTeam) {
  if (!CUP_CONFIG.showCalendar) return;
  const cal = root.querySelector('[data-cup-calendar]');
  const dayWrap = root.querySelector('[data-cup-calendar-day]');
  const title = root.querySelector('[data-cup-calendar-title]');
  if (!cal) return;

  const team = TEAM_BY_ID[myTeam];
  const shown = team ? games.filter(g => g.teamIds.includes(myTeam)) : games;
  const months = gameMonths(games);
  const now = cupNow();

  if (!state.calDay) state.calDay = initialDay(gameDays(shown.length ? shown : games), now);
  if (!state.calMonth) {
    const d = keyToDate(state.calDay) || now;
    state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  if (title) title.textContent = team ? `${team.name} schedule` : 'Season calendar';

  cal.innerHTML = calendarHtml({
    games: shown,
    month: state.calMonth,
    selected: state.calDay,
    today: dayKey(now),
    months,
  });

  if (!dayWrap) return;
  const dayGames = gamesOn(shown, state.calDay);
  const date = keyToDate(state.calDay);
  const heading = date ? formatDay(date) : '';
  dayWrap.innerHTML = `
    <h3 class="cal-day__title">${escapeHtml(heading)}</h3>
    ${dayGames.length
      ? `<div class="match-grid">${dayGames.map((g, i) => matchCardHtml(g, { i, myTeam })).join('')}</div>`
      : `<p class="filter-note filter-note--empty"><strong>No games${team ? ` for ${escapeHtml(team.name)}` : ''} this day.</strong>&nbsp;Pick a day with a game on it.</p>`}`;
  watchReveals(dayWrap);
}

/* --- News & Updates --- */

// Facebook posts use "styled" Unicode letters (𝐁𝐎𝐋𝐃); NFKC folds them
// back to plain letters the site's fonts can set.
const plain = (s) => String(s ?? '').normalize('NFKC');

/** Accepts both the Action's shape and TXC's older one. */
function normalisePost(p, i) {
  return {
    id: p.id || `post-${i}`,
    tag: plain(p.tag || p.source || ''),
    title: plain(p.title),
    body: plain(p.body ?? p.snippet ?? ''),
    date: p.date || null,
    link: p.link ?? p.url ?? null,
  };
}

async function loadPosts() {
  const fallback = (CUP_NEWS.posts || []).map(normalisePost);
  if (!CUP_NEWS.feed) return fallback;
  try {
    const url = new URL(`../data/${CUP_NEWS.feed}`, import.meta.url);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return fallback;
    const data = await res.json();
    return Array.isArray(data) && data.length ? data.map(normalisePost) : fallback;
  } catch {
    return fallback;
  }
}

async function renderNews(root) {
  const wrap = root.querySelector('[data-cup-news]');
  if (!wrap || !CUP_CONFIG.showNews || !CUP_NEWS.enabled) return;

  const page = safeUrl(CUP_NEWS.pageUrl);
  const posts = (await loadPosts()).slice(0, CUP_NEWS.maxPosts || 6);

  const postHtml = (p, lead = false) => {
    const when = parseDate(p.date);
    const link = safeUrl(p.link) || page;
    return `
      <article class="news-post${lead ? ' news-post--lead' : ''}">
        <div class="news-post__head">
          ${p.tag ? `<span class="news-post__tag">${escapeHtml(p.tag)}</span>` : ''}
          <span class="news-post__date">${escapeHtml(when ? formatRange(p.date) : '')}</span>
        </div>
        <h4 class="news-post__title">${escapeHtml(p.title)}</h4>
        ${p.body ? `<p class="news-post__body">${escapeHtml(p.body)}</p>` : ''}
        ${link ? `<a class="news-post__link" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">View on Facebook →</a>` : ''}
      </article>`;
  };

  const [lead, ...rest] = posts;

  const embed = (CUP_NEWS.embed?.enabled && page) ? `
    <div class="news-embed">
      <iframe title="${escapeAttr(CUP_NEWS.pageName)} on Facebook"
              src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(page)}&tabs=${CUP_NEWS.embed.showTimeline ? 'timeline' : ''}&width=380&height=${CUP_NEWS.embed.height}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false"
              height="${Number(CUP_NEWS.embed.height) || 500}"
              style="border:none;overflow:hidden" scrolling="no" frameborder="0"
              allow="encrypted-media" loading="lazy"></iframe>
      <p class="news-embed__note">If this stays blank, your browser is blocking third-party frames — the page link above still works.</p>
    </div>` : '';

  wrap.innerHTML = `
    <div class="news-head">
      <div>
        <p class="panel__kicker">${escapeHtml(CUP_NEWS.kicker)}</p>
        <h3 class="news-title">${escapeHtml(CUP_NEWS.title)}</h3>
        <p class="news-sub">${escapeHtml(CUP_NEWS.pageName)}${CUP_NEWS.pageHandle ? ` · @${escapeHtml(CUP_NEWS.pageHandle)}` : ''}</p>
      </div>
      ${page ? `
        <a class="btn btn--primary btn--sm" href="${escapeAttr(page)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(CUP_NEWS.followLabel || 'Open the page')}
          <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3 H3 v10 h10 V10"/><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="7" y2="9"/>
          </svg>
        </a>` : ''}
    </div>
    ${lead
      ? `<div class="news-layout">
           ${postHtml(lead, true)}
           ${rest.length ? `<div class="news-posts">${rest.map(p => postHtml(p)).join('')}</div>` : ''}
         </div>`
      : `<p class="news-empty">No updates posted yet.</p>`}
    ${embed}`;
}

/* ---------- Selection + navigation ---------- */

function selectVenue(id, { toggle: toggleSame = false } = {}) {
  const next = (toggleSame && state.venue === id) ? null : (id || null);
  state.venue = (next && VENUE_BY_ID[next]) ? next : null;
  render();

  // Keep the panel in view when a pin is tapped on a phone, where
  // it sits below the fold under the map.
  if (state.venue && window.matchMedia('(max-width: 900px)').matches) {
    rootEl?.querySelector('[data-cup-venue-panel]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Exported so a match's detail view can jump to its venue. */
export function showVenue(id) {
  selectVenue(id);
  rootEl?.querySelector('[data-cup-map-section]')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openGame(id) {
  const params = new URLSearchParams(location.search);
  params.set('screen', 'cup');
  params.set('game', id);
  history.pushState(null, '', `?${params.toString()}`);
  renderGameDetail(id);
}

function syncUrl() {
  if (currentQuery().screen !== 'cup') return;
  const q = new URLSearchParams();
  q.set('screen', 'cup');
  if (state.status !== 'all') q.set('status', state.status);
  if (state.sport) q.set('sport', state.sport);
  if (state.venue) q.set('venue', state.venue);
  if (state.query) q.set('q', state.query);
  const open = new URLSearchParams(location.search).get('game');
  if (open) q.set('game', open);
  history.replaceState(null, '', `?${q.toString()}`);
}

/* ---------- Detail modal ---------- */

export function renderGameDetail(gameId) {
  if (!gameId) return;

  const g = findGame(gameId);
  if (!g) {
    console.warn(`[xavier-cup] Unknown game id: ${gameId}`);
    closeDetail();
    return;
  }

  openDetail(gameDetailHtml(g), {
    onClose: () => {
      const q = new URLSearchParams(location.search);
      q.delete('game');
      history.replaceState(null, '', `?${q.toString()}`);
    },
    wire: (panel) => {
      panel.querySelector('[data-show-venue]')?.addEventListener('click', (e) => {
        const venueId = e.currentTarget.dataset.showVenue;
        closeDetail();
        showVenue(venueId);
      });
    },
  });
}

/* ---------- helpers ---------- */

function setText(root, selector, value) {
  root.querySelectorAll(selector).forEach(el => { el.textContent = value ?? ''; });
}
function toggle(root, selector, on) {
  root.querySelectorAll(selector).forEach(el => { el.hidden = !on; });
}
