/* ============================================================
   screens/cup.js — The Xavier Cup tab.

   Five independent pieces, each switchable in data/xavier-cup.js
   (CUP_CONFIG.show*):

     1. HERO + COUNTERS  how many fixtures are upcoming / live / done
     2. SEARCH           its own box and its own result grid. It does
                         NOT drive the map — searching for a team
                         should not silently re-centre the campus.
     3. MAP              every venue as a pin, the number of fixtures
                         on it, live venues ringed. Selecting a pin
                         fills the panel beside it.
     4. SCHEDULE         the full fixture list with status + sport chips
     5. NEWS             whatever the Facebook page has posted

   The clock decides Upcoming / Ongoing / Finished (lib/dates.js),
   and the tab re-checks it on a timer so a match flips to live
   while the page is open rather than on the next reload.
   ============================================================ */

import {
  CUP_CONFIG, CUP_MAP, CUP_NEWS, GAMES, VENUE_BY_ID, sportsInPlay,
} from '../data/xavier-cup.js';
import { byWhen, parseDate, formatDay, formatTime, formatRange } from '../lib/dates.js';
import { resolveGame, gameCardHtml, gameMatches } from '../components/game-card.js';
import { gameDetailHtml } from '../components/game-detail.js';
import { cupMapHtml, cupLegendHtml, venueStats } from '../components/cup-map.js';
import { statusPillHtml, GAME_STATUS_LABEL } from '../components/status.js';
import { openDetail, closeDetail } from '../components/detail-modal.js';
import { attachSearchShell, setSearchValue } from '../components/search-shell.js';
import { watchReveals } from '../reveal-observer.js';
import { currentQuery } from '../router.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

const STATUS_ORDER = { ongoing: 0, upcoming: 1, finished: 2 };

const STATUS_FILTERS = [
  { id: 'all',      label: 'All',      color: 'blue'   },
  { id: 'upcoming', label: 'Upcoming', color: 'green'  },
  { id: 'ongoing',  label: 'Ongoing',  color: 'red'    },
  { id: 'finished', label: 'Finished', color: 'yellow' },
];

const state = {
  query: '',
  status: 'all',
  sport: null,
  venue: null,
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

  // --- Section visibility ---
  toggle(root, '[data-cup-hero]', CUP_CONFIG.showHero);
  toggle(root, '[data-cup-counters]', CUP_CONFIG.showCounters);
  toggle(root, '[data-cup-search-section]', CUP_CONFIG.showSearch);
  toggle(root, '[data-cup-map-section]', CUP_CONFIG.showMap);
  toggle(root, '[data-cup-schedule-section]', CUP_CONFIG.showSchedule);
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

  // --- One delegated click handler for the whole screen ---
  if (!root.__wired) {
    root.__wired = true;

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
  }

  renderNews(root);
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

export function allGames(now = new Date()) {
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

  renderCounters(root, games);
  renderSearch(root, games);
  renderMap(root, games);
  renderSchedule(root, games);

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

/* --- Search results (independent of the map) --- */
function renderSearch(root, games) {
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
      ? `<div class="card-grid cup-results__grid">${hits.map((g, i) => gameCardHtml(g, i)).join('')}</div>`
      : `<div class="filter-note filter-note--empty">
           <strong>No fixture matches that.</strong>&nbsp;Try a college, a sport, or a venue name.
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
      ${section('ongoing', 'Ongoing')}
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
function renderSchedule(root, games) {
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
    ? list.map((g, i) => gameCardHtml(g, i)).join('')
    : `<div class="filter-note filter-note--empty" style="grid-column: 1 / -1;">
         <strong>Nothing here yet.</strong>&nbsp;Try another status or sport.
       </div>`;
  watchReveals(grid);
}

/* --- News & Updates --- */
function renderNews(root) {
  const wrap = root.querySelector('[data-cup-news]');
  if (!wrap || !CUP_CONFIG.showNews || !CUP_NEWS.enabled) return;

  const page = safeUrl(CUP_NEWS.pageUrl);

  const posts = (CUP_NEWS.posts || []).map(p => {
    const when = parseDate(p.date);
    const link = safeUrl(p.link) || page;
    return `
      <article class="news-post">
        <div class="news-post__head">
          ${p.tag ? `<span class="news-post__tag">${escapeHtml(p.tag)}</span>` : ''}
          <span class="news-post__date">${escapeHtml(when ? formatRange(p.date) : '')}</span>
        </div>
        <h4 class="news-post__title">${escapeHtml(p.title)}</h4>
        <p class="news-post__body">${escapeHtml(p.body)}</p>
        ${link ? `<a class="news-post__link" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">Read on Facebook →</a>` : ''}
      </article>`;
  }).join('');

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
    ${posts ? `<div class="news-posts">${posts}</div>` : `<p class="news-empty">No updates posted yet.</p>`}
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
