/* ============================================================
   screens/cup.js — The Xavier Cup tab.

   Four views under a sticky tab bar, as in the TXC proposal. One
   is shown at a time and the choice is kept in ?tab=…

     MAP        hero + counters (how many fixtures are upcoming /
                live / done), and every venue as a pin. Selecting a
                pin fills the panel beside it.
     FIXTURES   pick the team you follow (its games get a lime ring
                everywhere), one featured match per day under a
                ‹ day › pager, and the full list with status + sport
                chips
     CALENDAR   the team picker again, and the season as a month with
                the chosen day's games below
     NEWS       the CSG Facebook page via data/cup-posts.json: the
                newest post large, the rest in a looping carousel
                that "See all" swaps for a grid

   Each piece can still be switched off in data/xavier-cup.js
   (CUP_CONFIG.show*); a view with nothing left in it loses its tab.

   The clock decides Upcoming / Ongoing / Finished (lib/dates.js),
   read through cupNow() so a preview clock can stand in for it,
   and the tab re-checks on a timer so a match flips to live while
   the page is open rather than on the next reload.
   ============================================================ */

import {
  CUP_CONFIG, CUP_MAP, CUP_NEWS, CUP_EVENTS, GAMES, VENUE_BY_ID, sportsInPlay,
  cupNow, isPreviewClock,
} from '../data/xavier-cup.js';
import { TEAM_BY_ID, teamFor } from '../data/teams.js';
import { byWhen, parseDate, formatDay, formatTime, formatRange } from '../lib/dates.js';
import { resolveGame } from '../components/game-card.js';
import { matchCardHtml } from '../components/match-card.js';
import { gameDetailHtml } from '../components/game-detail.js';
import { cupMapHtml, cupLegendHtml, venueStats } from '../components/cup-map.js';
import { statusPillHtml, GAME_STATUS_LABEL } from '../components/status.js';
import { mountTeamStrip } from '../components/team-strip.js';
import { dayKey, gameDays, initialDay, gamesOn, pickFeatured, keyToDate } from '../components/featured-match.js';
import { calendarHtml, gameMonths } from '../components/cup-calendar.js';
import { openDetail, closeDetail } from '../components/detail-modal.js';
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

/* The four views, in tab order, and whether each has anything in it. */
const TABS = ['map', 'fixtures', 'calendar', 'news'];
const tabHasContent = {
  map:      () => CUP_CONFIG.showHero || CUP_CONFIG.showMap,
  fixtures: () => CUP_CONFIG.showTeams || CUP_CONFIG.showFeatured || CUP_CONFIG.showSchedule,
  calendar: () => CUP_CONFIG.showCalendar,
  news:     () => CUP_CONFIG.showNews && CUP_NEWS.enabled,
};
const enabledTabs = () => TABS.filter(t => tabHasContent[t]());

const state = {
  tab: 'map',
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
  state.status = STATUS_FILTERS.some(f => f.id === q.status)
    ? q.status
    : (CUP_CONFIG.defaultStatus || 'all');
  state.sport = q.sport || null;
  state.venue = (q.venue && VENUE_BY_ID[q.venue]) ? q.venue : null;

  // Which view to open: the one named in the link, or the one a
  // filter in the link belongs to, or the first one.
  const tabs = enabledTabs();
  const implied = state.venue ? 'map' : ((q.status || q.sport) ? 'fixtures' : '');
  state.tab = [q.tab, implied].find(t => tabs.includes(t)) || tabs[0] || 'map';

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
  toggle(root, '[data-cup-map-section]', CUP_CONFIG.showMap);
  toggle(root, '[data-cup-schedule-section]', CUP_CONFIG.showSchedule);
  toggle(root, '[data-cup-calendar-section]', CUP_CONFIG.showCalendar);
  toggle(root, '[data-cup-news-section]', CUP_CONFIG.showNews && CUP_NEWS.enabled);
  root.querySelectorAll('[data-cup-tab]').forEach(btn => {
    btn.hidden = !tabs.includes(btn.dataset.cupTab);
  });

  // --- One-time wiring for the whole screen ---
  if (!root.__wired) {
    root.__wired = true;

    if (CUP_CONFIG.showTeams) {
      root.querySelectorAll('[data-cup-teams]').forEach(el => mountTeamStrip(el));
    }
    onMyTeamChange(() => {
      if (currentQuery().screen === 'cup') render();
    });

    wireTabs(root);

    root.addEventListener('click', (e) => {
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

      if (e.target.closest('[data-cup-clear-venue]')) { selectVenue(null); }
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

  showTab(state.tab, { scroll: false });
  render();
  startClock();
}

/* ---------- Tabs ---------- */

function wireTabs(root) {
  const nav = root.querySelector('.cup-tabs__nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cup-tab]');
    if (btn) showTab(btn.dataset.cupTab);
  });

  // Arrow keys move between tabs, as a tablist should.
  nav.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    const tabs = [...nav.querySelectorAll('[data-cup-tab]:not([hidden])')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const k = keys[e.key];
    const next = k === 'first' ? tabs[0]
      : k === 'last' ? tabs[tabs.length - 1]
      : tabs[(i + k + tabs.length) % tabs.length];
    next.focus();
    showTab(next.dataset.cupTab);
  });

  window.addEventListener('resize', movePill);
  document.fonts?.ready?.then(movePill);
}

/**
 * showTab(id) — show one view, hide the rest, move the pill.
 * Scrolls back up to the tab bar when the page is scrolled past it,
 * so a new view always starts at its top, as in the TXC proposal.
 */
function showTab(id, { scroll = true } = {}) {
  const root = rootEl;
  if (!root) return;
  const tabs = enabledTabs();
  state.tab = tabs.includes(id) ? id : (tabs[0] || 'map');

  root.querySelectorAll('[data-cup-view]').forEach(view => {
    view.hidden = view.dataset.cupView !== state.tab;
  });
  root.querySelectorAll('[data-cup-tab]').forEach(btn => {
    const on = btn.dataset.cupTab === state.tab;
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  movePill();

  if (scroll) {
    // Back to where the tab bar sits in the page, just under the
    // sticky site nav, so nothing of the new view hides behind it.
    const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
    const top = Math.max(0, root.getBoundingClientRect().top + window.scrollY - navH);
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
  }

  // Revealed content in a view that was hidden needs watching again.
  const view = root.querySelector(`[data-cup-view="${state.tab}"]`);
  if (view) watchReveals(view);
  syncUrl();
}

/** Slide the highlight behind the selected tab. */
function movePill() {
  const root = rootEl;
  const pill = root?.querySelector('[data-cup-tab-pill]');
  const active = root?.querySelector('[data-cup-tab][aria-selected="true"]');
  if (!pill || !active || !active.offsetParent) return;
  pill.style.width = `${active.offsetWidth}px`;
  pill.style.transform = `translateX(${active.offsetLeft}px)`;
  // On a narrow phone the bar scrolls sideways; keep the chosen tab
  // centred in it (horizontally only, so the page never jumps).
  const nav = active.parentElement;
  if (nav.scrollWidth > nav.clientWidth) {
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }
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
  // A red dot on the Fixtures tab while anything is being played.
  const live = root.querySelector('[data-cup-tab-live]');
  if (live) live.hidden = counts.ongoing === 0;
}

/* --- The line under the team picker --- */
function renderTeamNote(root, games, myTeam) {
  if (!CUP_CONFIG.showTeams) return;
  const team = TEAM_BY_ID[myTeam];
  if (!team) {
    setText(root, '[data-cup-team-note]', 'Pick a team to ring its games in every list and fill the calendar with its schedule.');
    return;
  }
  const theirs = games.filter(g => g.teamIds.includes(myTeam));
  const next = theirs
    .filter(g => g.status !== 'finished')
    .sort((a, b) => a.start - b.start)[0];
  const live = theirs.find(g => g.status === 'ongoing');
  setText(root, '[data-cup-team-note]', live
    ? `Following ${team.name}. They are playing now: ${live.sport} at ${live.venueName}.`
    : next
      ? `Following ${team.name}. Next up: ${next.sport}, ${formatDay(next.start, { withYear: false })} at ${formatTime(next.start)}.`
      : `Following ${team.name}. ${theirs.length} game${theirs.length === 1 ? '' : 's'} this season, all played.`);
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

/** A picture path from the feed: our own assets/… copy, or an https URL. */
function safeImage(src) {
  const s = String(src ?? '').trim();
  if (/^assets\/[\w\-./]+$/.test(s) && !s.includes('..')) return s;
  if (/^https:\/\//i.test(s)) return s;
  return null;
}

/** Accepts both the Action's shape and TXC's older one. */
function normalisePost(p, i) {
  return {
    id: p.id || `post-${i}`,
    tag: plain(p.tag || p.source || ''),
    title: plain(p.title),
    body: plain(p.body ?? p.snippet ?? ''),
    date: p.date || null,
    link: p.link ?? p.url ?? null,
    image: safeImage(p.image ?? p.picture),
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

/**
 * renderNews(root) — the News & Updates view, laid out like the
 * carousels on FIFA's tournament pages.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  HERO — the 3 newest posts, one at a time:  │
 *   │  picture, then category, headline, Read more│
 *   │  ▬▬▬▬▬ ───── ─────   progress bars           │
 *   └─────────────────────────────────────────────┘
 *   More updates                  ‹  ›  [See all]
 *   ┌────┐┌────┐┌────┐┌────┐┌────┐  tall picture cards → loops
 *
 * The hero advances by itself (paused on hover, on focus, in a
 * background tab, and for anyone who asks for reduced motion); the
 * bars under it are buttons. Everything after the newest post scrolls
 * in a carousel that loops (TXC's behaviour: the cards are laid out
 * three times and the scroll position jumps by one set at either
 * end). "See all" swaps the carousel for a plain grid.
 *
 * A post without a picture gets a placeholder graphic in the same
 * slot, so layouts never jump when real pictures arrive.
 */
const HERO_COUNT = 3;
const HERO_MS = 7000;
const NEW_FOR_DAYS = 7;

/** A stand-in picture: a pitch graphic in one of four brand colourways. */
function newsPlaceholder(p, i, { hero = false } = {}) {
  return `
    <span class="news-ph news-ph--${i % 4}${hero ? ' news-ph--hero' : ''}" aria-hidden="true">
      <span class="news-ph__mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l5 4V6L7 10H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/></svg>
        ${escapeHtml(p.tag || 'News')}
      </span>
    </span>`;
}

async function renderNews(root) {
  const wrap = root.querySelector('[data-cup-news]');
  if (!wrap || !CUP_CONFIG.showNews || !CUP_NEWS.enabled) return;

  const page = safeUrl(CUP_NEWS.pageUrl);
  const posts = (await loadPosts()).slice(0, CUP_NEWS.maxPosts || 6);
  const heroPosts = posts.slice(0, HERO_COUNT);
  const rest = posts.slice(1);

  const when = (p) => (parseDate(p.date) ? formatRange(p.date) : '');
  const linkFor = (p) => safeUrl(p.link) || page;
  // "New" follows the real clock, not the Cup's preview clock: it is
  // about when CSG posted, not where the season is.
  const isNew = (p) => {
    const d = parseDate(p.date);
    return d && (Date.now() - d.getTime()) < NEW_FOR_DAYS * 86400000;
  };

  // The post's picture, shown whole. CSG posts are mostly posters with
  // text on them, so cropping to fill the frame would cut words off:
  // the picture is fitted inside the frame and a blurred copy of it
  // fills the rest. If it fails to load (a Facebook link that has
  // expired), the frame falls back to the placeholder graphic.
  const pictureHtml = (p, { lazy = true } = {}) => {
    const src = escapeAttr(p.image);
    const load = lazy ? ' loading="lazy"' : '';
    return `
      <span class="news-pic">
        <img class="news-pic__backdrop" src="${src}" alt="" aria-hidden="true" decoding="async"${load}>
        <img class="news-pic__img" src="${src}" alt="${escapeAttr(`Picture from the post: ${p.title}`)}" decoding="async"${load}
             onerror="this.closest('.news-pic').classList.add('is-broken')">
      </span>`;
  };

  // One hero slide. Only the showing slide is reachable by keyboard
  // and screen reader; the others are hidden until their turn.
  const slideHtml = (p, i) => {
    const link = linkFor(p);
    const media = p.image
      ? pictureHtml(p, { lazy: i > 0 })
      : newsPlaceholder(p, i, { hero: true });
    return `
      <article class="news-hero__slide${i === 0 ? ' is-active' : ''}" data-hero-slide="${i}"
               aria-roledescription="slide" aria-label="${i + 1} of ${heroPosts.length}"${i ? ' aria-hidden="true"' : ''}>
        <div class="news-hero__media">${media}</div>
        <div class="news-hero__panel">
          <p class="news-hero__kicker">
            ${p.tag ? `<span>${escapeHtml(p.tag)}</span>` : ''}
            <span class="news-hero__date">${escapeHtml(when(p))}</span>
            ${i === 0 ? '<span class="news-hero__flag">Latest</span>' : ''}
          </p>
          <h3 class="news-hero__title">${escapeHtml(p.title)}</h3>
          ${p.body ? `<p class="news-hero__body">${escapeHtml(p.body)}</p>` : ''}
          ${link ? `<a class="news-hero__cta" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer"${i ? ' tabindex="-1"' : ''}>Read more</a>` : ''}
        </div>
      </article>`;
  };

  // A card: the post's picture (whole, never cropped) with the date and
  // headline underneath, so nothing covers the picture.
  // `clone` marks the carousel's repeat copies: hidden from screen
  // readers and taken out of the tab order.
  const cardHtml = (p, i, clone = false) => {
    const link = linkFor(p);
    const media = p.image ? pictureHtml(p) : newsPlaceholder(p, i + 1);
    const inner = `
      <span class="news-card__media">${media}</span>
      ${isNew(p) ? '<span class="news-card__new">New</span>' : ''}
      <span class="news-card__caption">
        <span class="news-card__meta">${p.tag ? `${escapeHtml(p.tag)} · ` : ''}${escapeHtml(when(p))}</span>
        <span class="news-card__title">${escapeHtml(p.title)}</span>
      </span>`;
    return link
      ? `<a class="news-card" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer"
            ${clone ? 'aria-hidden="true" tabindex="-1"' : `aria-label="${escapeAttr(`${p.title}. Opens on Facebook`)}"`}>${inner}</a>`
      : `<div class="news-card"${clone ? ' aria-hidden="true"' : ''}>${inner}</div>`;
  };

  const heroHtml = heroPosts.length ? `
    <section class="news-hero" data-news-hero aria-roledescription="carousel" aria-label="Latest updates">
      <div class="news-hero__viewport">${heroPosts.map(slideHtml).join('')}</div>
      ${heroPosts.length > 1 ? `
        <div class="news-hero__bars">
          ${heroPosts.map((p, i) => `
            <button class="news-hero__bar${i === 0 ? ' is-active' : ''}" type="button" data-hero-go="${i}"
                    aria-label="Show update ${i + 1}: ${escapeAttr(p.title)}"${i === 0 ? ' aria-current="true"' : ''}>
              <span class="news-hero__fill"></span>
            </button>`).join('')}
        </div>` : ''}
    </section>` : '';

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
        <h2 class="news-title">${escapeHtml(CUP_NEWS.title)}</h2>
        <p class="news-sub">${escapeHtml(CUP_NEWS.pageName)}${CUP_NEWS.pageHandle ? ` · @${escapeHtml(CUP_NEWS.pageHandle)}` : ''}</p>
      </div>
      ${page ? `
        <a class="btn btn--ghost btn--sm" href="${escapeAttr(page)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(CUP_NEWS.followLabel || 'Open the page')}
          <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3 H3 v10 h10 V10"/><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="7" y2="9"/>
          </svg>
        </a>` : ''}
    </div>

    ${heroHtml || `<p class="news-empty">No updates posted yet.</p>`}

    ${rest.length ? `
      <div class="news-more">
        <div class="news-more__head">
          <h3 class="news-more__title">More updates</h3>
          <div class="news-more__controls">
            <button class="news-step" type="button" data-news-step="-1" aria-label="Scroll back">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="10,3 5,8 10,13"/></svg>
            </button>
            <button class="news-step" type="button" data-news-step="1" aria-label="Scroll forward">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6,3 11,8 6,13"/></svg>
            </button>
            <button class="btn btn--primary btn--sm" type="button" data-news-toggle aria-pressed="false">See all</button>
          </div>
        </div>
        <div class="news-carousel" data-news-carousel>
          <div class="news-track" data-news-track>${rest.map((p, i) => cardHtml(p, i)).join('')}</div>
        </div>
        <div class="news-grid" data-news-grid hidden>${rest.map((p, i) => cardHtml(p, i)).join('')}</div>
      </div>` : ''}

    ${eventsHtml()}

    ${embed}`;

  wireHero(wrap.querySelector('[data-news-hero]'));

  if (!rest.length) return;

  const carousel = wrap.querySelector('[data-news-carousel]');
  const track = wrap.querySelector('[data-news-track]');
  const grid = wrap.querySelector('[data-news-grid]');
  const toggleBtn = wrap.querySelector('[data-news-toggle]');
  const steps = wrap.querySelectorAll('[data-news-step]');
  const single = rest.map((p, i) => cardHtml(p, i)).join('');
  const clones = rest.map((p, i) => cardHtml(p, i, true)).join('');
  let setWidth = 0;

  // Loop only when the cards overflow; a short row just sits still.
  const setupLoop = () => {
    track.innerHTML = single;
    carousel.onscroll = null;
    const overflowing = track.scrollWidth > carousel.clientWidth + 4;
    steps.forEach(b => { b.hidden = !overflowing; });
    if (!overflowing) { setWidth = 0; return; }

    track.innerHTML = clones + single + clones;
    setWidth = track.scrollWidth / 3;
    carousel.scrollLeft = setWidth;
    carousel.onscroll = () => {
      if (carousel.scrollLeft <= 1) carousel.scrollLeft += setWidth;
      else if (carousel.scrollLeft >= setWidth * 2) carousel.scrollLeft -= setWidth;
    };
  };

  steps.forEach(btn => btn.addEventListener('click', () => {
    const card = track.querySelector('.news-card');
    const by = (card?.offsetWidth || 280) + 16;
    carousel.scrollBy({ left: by * Number(btn.dataset.newsStep), behavior: 'smooth' });
  }));

  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-pressed') !== 'true';
    toggleBtn.setAttribute('aria-pressed', String(expanded));
    toggleBtn.textContent = expanded ? 'Back to carousel' : 'See all';
    grid.hidden = !expanded;
    carousel.hidden = expanded;
    steps.forEach(b => { b.hidden = expanded || !setWidth; });
    if (!expanded) requestAnimationFrame(setupLoop);
  });

  // The view may be hidden when this first runs (it is a tab), so
  // measure once it is actually on screen, and again on resize.
  const whenVisible = () => {
    if (carousel.offsetParent) { setupLoop(); return; }
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { obs.disconnect(); setupLoop(); }
    });
    obs.observe(carousel);
  };
  whenVisible();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!carousel.hidden && carousel.offsetParent) setupLoop(); }, 150);
  });
}

/**
 * wireHero(el) — the hero's autoplay and its progress bars.
 *
 * The active bar's fill is a CSS animation lasting HERO_MS; when it
 * ends, the next slide shows. Pausing is just pausing that animation,
 * so the bar always shows exactly how long is left.
 */
function wireHero(el) {
  if (!el) return;
  const slides = [...el.querySelectorAll('[data-hero-slide]')];
  const bars = [...el.querySelectorAll('[data-hero-go]')];
  if (slides.length < 2) return;

  el.style.setProperty('--hero-ms', `${HERO_MS}ms`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-motion') === 'reduced';
  el.classList.toggle('is-static', reduced);
  let index = 0;

  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const on = i === index;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('aria-hidden', !on);
      s.querySelectorAll('a').forEach(a => { a.tabIndex = on ? 0 : -1; });
    });
    bars.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.classList.toggle('is-done', i < index);
      if (i === index) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      // Restart the fill animation on the newly active bar.
      const fill = b.querySelector('.news-hero__fill');
      if (fill) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
    });
  };

  bars.forEach(b => b.addEventListener('click', () => show(Number(b.dataset.heroGo))));
  bars.forEach(b => b.querySelector('.news-hero__fill')
    ?.addEventListener('animationend', () => { if (b.classList.contains('is-active')) show(index + 1); }));

  // Pause while someone is reading or tabbing through it.
  const pause = (on) => el.classList.toggle('is-paused', on);
  el.addEventListener('mouseenter', () => pause(true));
  el.addEventListener('mouseleave', () => pause(el.contains(document.activeElement)));
  el.addEventListener('focusin', () => pause(true));
  el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) pause(false); });

  // Swipe on phones.
  let startX = null;
  el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
}

/**
 * eventsHtml() — the Upcoming Events cards under the news
 * (data/xavier-cup.js → CUP_EVENTS). A card without a photo shows
 * its team's crest on navy instead.
 */
function eventsHtml() {
  const items = CUP_EVENTS?.enabled ? (CUP_EVENTS.items || []) : [];
  if (!items.length) return '';

  const card = (ev) => {
    const team = teamFor(ev.team);
    const photo = ev.photo
      ? `<img class="cup-event__img" src="${escapeAttr(ev.photo)}" alt="${escapeAttr(ev.title)}" loading="lazy" decoding="async">`
      : (team?.logo
          ? `<img class="cup-event__crest" src="${escapeAttr(team.logo)}" alt="" loading="lazy" decoding="async">`
          : '');
    return `
      <article class="cup-event">
        <div class="cup-event__photo${ev.photo ? '' : ' cup-event__photo--crest'}">${photo}</div>
        <div class="cup-event__body">
          ${team ? `
            <span class="cup-event__team">
              ${team.logo ? `<img src="${escapeAttr(team.logo)}" alt="" loading="lazy">` : ''}
              ${escapeHtml(team.name)}
            </span>` : ''}
          <h4 class="cup-event__title">${escapeHtml(ev.title)}</h4>
          ${ev.description ? `<p class="cup-event__desc">${escapeHtml(ev.description)}</p>` : ''}
        </div>
      </article>`;
  };

  return `
    <section class="cup-events" aria-labelledby="cup-events-title">
      <h3 class="news-more__title" id="cup-events-title">${escapeHtml(CUP_EVENTS.title || 'Upcoming Events')}</h3>
      <div class="cup-events__grid">${items.map(card).join('')}</div>
    </section>`;
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
  showTab('map', { scroll: false });
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
  // Always written, so a leftover ?status= can't pull a reload onto
  // the Fixtures view when the visitor was on another one.
  q.set('tab', state.tab);
  if (state.status !== 'all') q.set('status', state.status);
  if (state.sport) q.set('sport', state.sport);
  if (state.venue) q.set('venue', state.venue);
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
