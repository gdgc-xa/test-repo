/* ============================================================
  screens/cup.js — The Xavier Cup tab.

  A shared header, then three views under a sticky tab bar. One
  view is shown at a time and the choice is kept in ?tab=…

    HEADER     on every view: the banner (a full-screen slideshow of
                photos).
    MATCHES    the win counter, the one "Follow your teams" picker
                (followed teams' games get a lime ring and go first),
                one Filter button (day, status, venue, sport — in a
                panel it opens) and a List / Calendar switch; then three
                rows you swipe: Live now, Upcoming, Finished recently.
                Filters and the view are kept in the URL.
    SPORTS     a tile per sport (data SPORTS); a sport's page has its
                news, standings, knockouts and matches per division,
                and a team in its standings opens that team's games
                (components/sports.js, lib/standings.js). Going in
                and out adds history, so Back steps back up.
    MAP        the campus map. Tapping a venue fills the panel beside
                it with its live games, upcoming games and results;
                tapping a sport's icon narrows that to the one sport.
    NEWS       the TXC Compass Facebook page via the news Worker: the
                newest post large, the rest in a looping carousel
                that "See all" swaps for a grid

  Old links still land: ?tab=fixtures opens Matches, ?tab=calendar
  opens Matches as a calendar.

  Each piece can still be switched off in data/xavier-cup.js
  (CUP_CONFIG.show*); a view with nothing left in it loses its tab.

  The clock decides Upcoming / Ongoing / Finished (lib/dates.js),
  read through cupNow() so a preview clock can stand in for it,
  and the tab re-checks on a timer so a match flips to live while
  the page is open rather than on the next reload.
  ============================================================ */

import {
  CUP_CONFIG, CUP_MAP, CUP_NEWS, CUP_EVENTS, CUP_PHOTOS, GAMES, VENUE_BY_ID,
  allSports, findSport, cupNow, isPreviewClock,
} from '../data/xavier-cup.js';
import { TEAM_BY_ID, teamFor } from '../data/teams.js';
import { SITE } from '../data/site.js';
import { byWhen, parseDate, formatDay, formatTime, formatRange } from '../lib/dates.js';
import { resolveGame } from '../components/game-card.js';
import { matchCardHtml } from '../components/match-card.js';
import { gameDetailHtml } from '../components/game-detail.js';
import { mountCupMap, cupLegendHtml, venueStats, venueIcons } from '../components/cup-map.js';
import { offCampusHtml } from '../components/cup-off-campus.js';
import { isOffCampus, venueLocationHtml } from '../lib/cup-map-locations.js';
import { statusPillHtml, GAME_STATUS_LABEL } from '../components/status.js';
import { mountTeamStrip } from '../components/team-strip.js';
import { dayKey, gameDays, initialDay, gamesOn, pickFeatured, keyToDate } from '../components/featured-match.js';
import { calendarHtml, gameMonths } from '../components/cup-calendar.js';
import { openDetail, closeDetail } from '../components/detail-modal.js';
import { sportsIndexHtml, sportPageHtml } from '../components/sports.js';
import { myTeams, toggleMyTeam, onMyTeamChange } from '../lib/my-team.js';
import { categoryOf, categoriesFor, groupTables, bracketFor, knockouts, winnerOf } from '../lib/standings.js';
import { watchReveals } from '../reveal-observer.js';
import { currentQuery } from '../router.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

const STATUS_ORDER = { ongoing: 0, upcoming: 1, finished: 2 };

/* `finished` stays the internal value; people read "Results". */
const STATUS_FILTERS = [
  { id: 'all',      label: 'All',      color: 'blue'   },
  { id: 'ongoing',  label: 'Live',     color: 'red'    },
  { id: 'upcoming', label: 'Upcoming', color: 'green'  },
  { id: 'finished', label: 'Results',  color: 'yellow' },
];
// Friendlier spellings a link may use for ?status=
const STATUS_ALIAS = { live: 'ongoing', results: 'finished' };

/* The views, in tab order, and whether each has anything in it. */
const TABS = ['matches', 'sports', 'map', 'news'];
const tabHasContent = {
  matches: () => CUP_CONFIG.showSchedule || CUP_CONFIG.showCalendar,
  sports:  () => CUP_CONFIG.showSports && allSports().length > 0,
  map:     () => CUP_CONFIG.showMap,
  news:    () => CUP_CONFIG.showNews && CUP_NEWS.enabled,
};
const enabledTabs = () => TABS.filter(t => tabHasContent[t]());

// Views that are now part of Matches, for links made before the change.
const OLD_TABS = { fixtures: 'matches', calendar: 'matches' };

/* Phones get the short version of each view: one day of matches at
   a time, fewer cards before a "Show all". Same width as the phone
   rules in the CSS. */
const PHONE = matchMedia('(max-width: 560px)');
const isPhone = () => PHONE.matches;
// Narrow screens show each list of matches as one row you swipe
// (cup.css), so every card goes in the row and no "Show all" is needed.
const SWIPE = matchMedia('(max-width: 720px)');
const isSwipe = () => SWIPE.matches;

const defaultStatus = () =>
  (STATUS_FILTERS.some(f => f.id === CUP_CONFIG.defaultStatus) ? CUP_CONFIG.defaultStatus : 'all');

const state = {
  tab: 'matches',
  // Matches
  status: 'all',
  sport: null,        // a filter: a sport's name as in GAMES
  matchVenue: null,   // a filter; the map's own pick is `venue`
  day: '',            // a filter: one day ('' = all days); the calendar's chosen day
  dayPicked: false,   // a day chosen by the visitor (kept in the URL)
  filtersOpen: false, // the Filter panel is open
  view: 'list',       // 'list' | 'calendar'
  calMonth: null,
  // Sports
  sportsSport: '',    // a SPORTS id; '' = the grid of sports
  sportsDiv: '',      // 'Men' | 'Women' | …; '' = the sport's first
  sportsTeam: '',     // a team id for the team view, or ''
  sportsAll: false,   // a sport's match list opened past its first few
  // Map
  venue: null,
  mapSport: null,     // a sport picked on the map, within state.venue
};

let rootEl = null;
let tick = null;
let mapView = null;   // the mounted campus map (components/cup-map.js)
let mapListExpanded = null; // presentation only; survives timer renders

/* ---------- Boot ---------- */

export function initCup(root) {
  rootEl = root;

  const q = currentQuery();

  // Which view to open: the one named in the link (an old Fixtures or
  // Calendar link opens Matches), a bare ?venue= opens the Map as it
  // always did, and otherwise the first view.
  const tabs = enabledTabs();
  const asked = OLD_TABS[q.tab] || q.tab;
  const implied = (!q.tab && q.venue) ? 'map' : '';
  state.tab = [asked, implied].find(t => tabs.includes(t)) || tabs[0] || 'matches';

  // Each view reads only its own filters from the link: ?venue= is a
  // filter on Matches and the picked venue on the Map.
  const onMatches = state.tab === 'matches';
  const status = STATUS_ALIAS[q.status] || q.status;
  state.status = (onMatches && STATUS_FILTERS.some(f => f.id === status)) ? status : defaultStatus();
  state.sport = onMatches ? (findSport(q.sport)?.name || null) : null;
  state.filtersOpen = false;
  state.matchVenue = (onMatches && VENUE_BY_ID[q.venue]) ? q.venue : null;
  state.dayPicked = onMatches && /^\d{4}-\d{2}-\d{2}$/.test(q.day);
  state.day = state.dayPicked ? q.day : '';
  state.view = (q.tab === 'calendar' || q.view === 'calendar') ? 'calendar' : 'list';
  state.calMonth = null;
  state.venue = (state.tab === 'map' && VENUE_BY_ID[q.venue]) ? q.venue : null;
  state.mapSport = state.venue ? (q.mapsport || null) : null;
  readSports(q);

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
  toggle(root, '[data-cup-teams-section]', CUP_CONFIG.showTeams);
  toggle(root, '[data-cup-map-section]', CUP_CONFIG.showMap);
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

    mountHeroPhotos(root);
    wireTabs(root);
    const mapSpace = new ResizeObserver(() => {
      root.style.setProperty('--cup-map-top', `${stuckHeight()}px`);
    });
    [document.querySelector('.site-nav'), root.querySelector('[data-cup-tabs]')]
      .filter(Boolean).forEach(el => mapSpace.observe(el));
    mountFilters(root);

    // Crossing the phone or swipe width changes how much each view shows.
    const rerender = () => { if (currentQuery().screen === 'cup') render(); };
    PHONE.addEventListener('change', rerender);
    SWIPE.addEventListener('change', rerender);

    // Live data (lib/live-data.js) lands after the first render and on
    // every refresh: repaint. The first time, also open a shared
    // ?game= link, which could not be found before the data arrived.
    let dataSeen = false;
    window.addEventListener('cup:data', () => {
      const q = currentQuery();
      if (q.screen === 'cup') {
        render();
        if (!dataSeen && q.game) renderGameDetail(q.game);
      }
      dataSeen = true;
    });

    // Back and Forward step through the Sports pages (sport, team);
    // screens and the match pop-up are the router's.
    window.addEventListener('popstate', () => {
      const q = currentQuery();
      if (q.screen !== 'cup' || q.game) return;
      const tab = OLD_TABS[q.tab] || q.tab;
      if (tab !== 'sports' && state.tab !== 'sports') return;
      readSports(q, tab);
      showTab(tab, { scroll: false });
      render();
    });

    // Taps on the map itself are handled by the map (mountCupMap);
    // these are the venue list and the sport chips in the panel, and
    // everything on Matches.
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-cup-map-list-toggle]')) {
        mapListExpanded = !mapListExpanded;
        render();
        requestAnimationFrame(() => mapView?.refocus());
        return;
      }
      // A match card's venue: the Map with that venue picked. A
      // new-tab click is left to the browser.
      const venueLink = e.target.closest('[data-match-venue]');
      if (venueLink) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        showVenue(venueLink.dataset.matchVenue);
        return;
      }

      const row = e.target.closest('[data-venue-id]');
      if (row) { selectVenue(row.dataset.venueId, { toggle: true }); return; }

      const venueSport = e.target.closest('[data-venue-sport]');
      if (venueSport) {
        const id = venueSport.dataset.venueSport;
        state.mapSport = (id === 'all' || state.mapSport === id) ? null : id;
        render();
        return;
      }

      // Sports: into a sport or a team, back up the breadcrumb.
      const sportOpen = e.target.closest('[data-sports-open]');
      if (sportOpen) { goSports({ sport: sportOpen.dataset.sportsOpen }); return; }

      const crumb = e.target.closest('[data-sports-crumb]');
      if (crumb) {
        goSports({ sport: crumb.dataset.sportsCrumb === 'sport' ? state.sportsSport : '' });
        return;
      }

      const sportsTeam = e.target.closest('[data-sports-team]');
      if (sportsTeam) { goSports({ sport: state.sportsSport, team: sportsTeam.dataset.sportsTeam }); return; }

      if (e.target.closest('[data-sports-more]')) {
        state.sportsAll = !state.sportsAll;
        render();
        root.querySelector('[data-sports-more]')?.focus({ preventScroll: true });
        return;
      }

      // A round's chip on the phone bracket: slide to that round.
      const slideRound = e.target.closest('[data-kslide-round]');
      if (slideRound) {
        setSlide(slideRound.closest('[data-kslide]'), Number(slideRound.dataset.kslideRound), true);
        return;
      }

      const sportsDiv = e.target.closest('[data-sports-div]');
      if (sportsDiv) {
        state.sportsDiv = sportsDiv.dataset.sportsDiv;
        state.sportsAll = false;
        render();
        root.querySelector(`[data-sports-div="${CSS.escape(state.sportsDiv)}"]`)?.focus({ preventScroll: true });
        return;
      }

      // Follow / Following on a team's page (re-renders through
      // onMyTeamChange, so focus goes back to the new button).
      const follow = e.target.closest('[data-sports-follow]');
      if (follow) {
        toggleMyTeam(follow.dataset.sportsFollow);
        root.querySelector('[data-sports-follow]')?.focus({ preventScroll: true });
        return;
      }

      const card = e.target.closest('[data-game-id]');
      if (card) { openGame(card.dataset.gameId); return; }

      const statusChip = e.target.closest('[data-status-id]');
      if (statusChip) { state.status = statusChip.dataset.statusId; render(); return; }

      if (e.target.closest('[data-cup-clear-filters]')) {
        Object.assign(state, { status: defaultStatus(), sport: null, matchVenue: null, day: '', dayPicked: false });
        render();
        return;
      }

      // The Filter button opens and shuts its panel.
      if (e.target.closest('[data-cup-filter-toggle]')) {
        state.filtersOpen = !state.filtersOpen;
        render();
        return;
      }

      // An arrow on a row of matches: one card along.
      const railStep = e.target.closest('[data-rail-step]');
      if (railStep) { stepRail(railStep); return; }

      // "Try the map" and other links to another view of the tab.
      const goto = e.target.closest('[data-cup-goto]');
      if (goto) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        showTab(goto.dataset.cupGoto);
        return;
      }

      const mode = e.target.closest('[data-cup-view-mode]');
      if (mode) { state.view = mode.dataset.cupViewMode; render(); return; }

      // A day in the Filter panel ('' = all days). It re-renders, so
      // focus goes back to the new copy of the chip.
      const dayChip = e.target.closest('[data-match-day]');
      if (dayChip) {
        pickDay(dayChip.dataset.matchDay);
        root.querySelector(`[data-match-day="${state.day}"]`)?.focus({ preventScroll: true });
        return;
      }

      const calDay = e.target.closest('[data-cal-day]');
      if (calDay) {
        pickDay(calDay.dataset.calDay);
        root.querySelector(`[data-cal-day="${state.day}"]`)?.focus({ preventScroll: true });
        return;
      }

      const calMonth = e.target.closest('[data-cal-month]');
      if (calMonth) { state.calMonth = keyToDate(calMonth.dataset.calMonth); render(); return; }

      // Today, or the next day with a game when today has none.
      if (e.target.closest('[data-cal-today]')) { pickDay(dayKey(cupNow())); return; }

      if (e.target.closest('[data-cup-clear-venue]')) { selectVenue(null); }
    });

    renderNews(root);
  }

  showTab(state.tab, { scroll: false });
  render();
  startClock();
}

/* ---------- Banner photos ----------
   The slideshow behind the banner's title (data/xavier-cup.js →
   CUP_PHOTOS). A slide without a photo yet shows a placeholder in
   the same frame, so nothing jumps when the real pictures arrive.
   Off, or with no slides, the banner is the plain one. */

function mountHeroPhotos(root) {
  const hero = root.querySelector('[data-cup-hero]');
  const tile = hero?.querySelector('.cup-hero__tile');
  const wrap = hero?.querySelector('[data-cup-photos]');
  const slides = CUP_PHOTOS?.slides || [];
  const on = Boolean(tile && wrap && CUP_CONFIG.showHeroPhotos && slides.length);
  hero?.classList.toggle('has-photos', on);
  if (wrap) wrap.hidden = !on;
  if (!on) return;

  const n = slides.length;
  const camera = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

  const slide = (s, i) => {
    const src = safeImage(s.src);
    const label = `${i + 1} of ${n}${s.caption ? `: ${s.caption}` : ''}`;
    const media = src
      ? `<img class="cup-photo__img" src="${escapeAttr(src)}" alt="${escapeAttr(s.alt || '')}" decoding="async"${i ? ' loading="lazy"' : ''}>`
      : `<span class="cup-photo__img news-ph news-ph--${i % 4} news-ph--hero" role="img"
               aria-label="${escapeAttr(`Photo coming soon${s.alt ? `: ${s.alt}` : ''}`)}">
           <span class="news-ph__mark" aria-hidden="true">${camera}<span>TXC photo</span></span>
         </span>`;
    return `
      <figure class="cup-photo${i === 0 ? ' is-active' : ''}" data-hero-slide="${i}"
              role="group" aria-roledescription="slide" aria-label="${escapeAttr(label)}"${i ? ' aria-hidden="true"' : ''}>
        ${media}
        ${s.caption ? `<figcaption class="cup-photo__caption">${escapeHtml(s.caption)}</figcaption>` : ''}
      </figure>`;
  };

  wrap.innerHTML = `
    ${slides.map(slide).join('')}
    ${n > 1 ? `
      <div class="news-hero__bars cup-photos__bars">
        ${slides.map((s, i) => `
          <button class="news-hero__bar${i === 0 ? ' is-active' : ''}" type="button" data-hero-go="${i}"
                  aria-label="${escapeAttr(`Show photo ${i + 1}${s.caption ? `: ${s.caption}` : ''}`)}"${i === 0 ? ' aria-current="true"' : ''}>
            <span class="news-hero__fill"></span>
          </button>`).join('')}
      </div>` : ''}`;

  // The whole tile pauses on hover and focus, the title included.
  wireHero(tile, { ms: Math.max(3, Number(CUP_PHOTOS.secondsPerSlide) || 6) * 1000 });
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
 * When the page is scrolled past the tab bar, scrolls back so the new
 * view starts right under it; above that (reading the header) the
 * page stays put.
 */
function showTab(id, { scroll = true } = {}) {
  const root = rootEl;
  if (!root) return;
  const tabs = enabledTabs();
  state.tab = tabs.includes(id) ? id : (tabs[0] || 'matches');

  root.classList.toggle('is-map-view', state.tab === 'map');
  root.querySelectorAll('[data-cup-view]').forEach(view => {
    view.hidden = view.dataset.cupView !== state.tab;
  });
  root.querySelectorAll('[data-cup-tab]').forEach(btn => {
    const on = btn.dataset.cupTab === state.tab;
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  movePill();

  const view = root.querySelector(`[data-cup-view="${state.tab}"]`);
  root.style.setProperty('--cup-map-top', `${stuckHeight()}px`);
  if (state.tab === 'map') window.scrollTo({ top: 0, behavior: 'auto' });
  else if (scroll) scrollToView();

  // Revealed content in a view that was hidden needs watching again.
  if (view) watchReveals(view);
  syncUrl();
}

/** When the page is scrolled past the open view's top, go back to it,
    just under the sticky tab bar. */
function scrollToView() {
  const view = rootEl?.querySelector(`[data-cup-view="${state.tab}"]`);
  if (!view) return;
  const top = Math.max(0, view.getBoundingClientRect().top + window.scrollY - stuckHeight());
  if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
}

/** Height of what sticks to the top of the window: the site nav and
    the tab bar. */
function stuckHeight() {
  const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
  const tabsH = rootEl?.querySelector('[data-cup-tabs]')?.offsetHeight || 0;
  return navH + tabsH;
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.getAttribute('data-motion') === 'reduced';

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
  const mine = myTeams();

  renderLiveDot(root, games);
  renderTeamNote(root, mine);
  renderMatches(root, games, mine);
  renderSports(root, games, mine);
  renderMap(root, games);

  syncUrl();
}

/* --- A red dot on the Matches tab while anything is being played --- */
function renderLiveDot(root, games) {
  const live = root.querySelector('[data-cup-tab-live]');
  if (live) live.hidden = !games.some(g => g.status === 'ongoing');
}

/* --- The line under the team picker: how to use it, nothing more
       (their games already show first in Matches). --- */

const isMine = (g, mine) => g.teamIds.some(id => mine.includes(id));

function renderTeamNote(root, mine) {
  if (!CUP_CONFIG.showTeams) return;
  const n = mine.filter(id => TEAM_BY_ID[id]).length;
  setText(root, '[data-cup-team-note]', n
    ? `Following ${n} team${n === 1 ? '' : 's'}. Tap any team to add it, or tap again to remove it.`
    : 'Choose any teams to follow. Their matches show first.');
}

/* --- Sports: the grid, a sport's page, or a team inside it --- */

let newsPosts = [];   // every post, once the news feed has loaded (renderNews)

/** Is a post about this sport? Its own `sport`, or a hashtag in its text. */
function isAbout(p, sport) {
  if (p.sport) return [sport.id, sport.name.toLowerCase()].includes(p.sport.toLowerCase());
  const tag = `#${sport.name.replace(/\s+/g, '')}`.toLowerCase();
  return `${p.title} ${p.body}`.toLowerCase().split(/[^#\w]+/).includes(tag);
}

/** A category as it goes in a link: "100m · Men" → "100m-men". */
const catSlug = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function renderSports(root, games, mine) {
  const wrap = root.querySelector('[data-cup-sports]');
  if (!wrap || !tabHasContent.sports()) return;

  const sports = allSports();
  const index = sports.findIndex(s => s.id === state.sportsSport);
  const sport = sports[index];
  if (!sport) {
    state.sportsSport = '';
    state.sportsTeam = '';
    wrap.innerHTML = sportsIndexHtml({ sports, games, categoriesOf: categoriesFor });
    watchReveals(wrap);
    return;
  }

  // The category asked for (by its link form, "100m-men"), if the
  // sport has it; else its first.
  const sportGames = games.filter(g => g.sport === sport.name);
  const divisions = categoriesFor(sport, sportGames);
  const div = divisions.find(d => catSlug(d) === catSlug(state.sportsDiv)) || divisions[0] || 'Open';
  // With no games yet (live data still loading), keep the category the
  // link asked for so it still applies when the games arrive.
  if (sportGames.length) state.sportsDiv = div;
  const divGames = sportGames.filter(g => categoryOf(g) === div);
  // How this category's schedule runs (groups, crossovers, placings).
  const format = bracketFor(sport, div);

  wrap.innerHTML = sportPageHtml({
    sport, index, sportGames, divisions, div, divGames, format,
    tables: groupTables(divGames),
    ko: knockouts(divGames, format),
    news: newsPosts.filter(p => isAbout(p, sport)).slice(0, isPhone() ? 2 : 3),
    team: TEAM_BY_ID[state.sportsTeam] || null,
    mine,
    // How many of the division's matches show before "Show all"
    // (all of them in a swipe row).
    matchesShown: (state.sportsAll || isSwipe()) ? Infinity : 6,
    collapsible: !isSwipe(),
  });
  watchReveals(wrap);

  // A long row of categories starts back at its first chip once
  // redrawn; bring the chosen one to the middle of the row instead.
  const cats = wrap.querySelector('.sport-cats');
  const on = cats?.querySelector('[aria-pressed="true"]');
  if (on) {
    const left = on.getBoundingClientRect().left - cats.getBoundingClientRect().left;
    cats.scrollLeft = left - (cats.clientWidth - on.offsetWidth) / 2;
  }

  // The bracket you slide through, round by round.
  slideFit.disconnect();
  wrap.querySelectorAll('[data-kslide]').forEach(slide => {
    const frame = slide.querySelector('.kslide__frame');
    let settle = null;
    frame.addEventListener('scroll', () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        const i = Math.round(frame.scrollLeft / slideStep(slide));
        if (String(i) !== slide.dataset.active) layoutSlide(slide, i);
      }, 90);
    }, { passive: true });
    slideFit.observe(frame);
  });
}

/* The bracket (components/sports.js → slideHtml): one column per round,
   like the World Cup's; two in view on a phone, all of them where they
   fit (then there is nothing to slide and no chips). The round at the left is
   stacked close; every later match sits halfway between the matches
   that feed it, joined to them by a line. A swipe snaps to a round;
   so does tapping its chip. Laid out again for each round it shows. */
const SLIDE_GAP = 14;   // between two matches in a column, px

/** From one column to the next, px. */
function slideStep(slide) {
  const cols = slide.querySelectorAll('.kslide__col');
  return cols[1] ? cols[1].offsetLeft - cols[0].offsetLeft : (cols[0]?.offsetWidth || 1);
}

function layoutSlide(slide, active) {
  const frame = slide.querySelector('.kslide__frame');
  const cols = [...slide.querySelectorAll('.kslide__col')];
  if (!frame.clientWidth || !cols.length) return;   // not on screen
  const step = slideStep(slide);
  const gapX = step - cols[0].offsetWidth;
  // How many rounds are in view at once; when that is all of them,
  // there is nothing to slide.
  const visible = Math.max(1, Math.min(cols.length, Math.floor((frame.clientWidth + gapX) / step + 0.01)));
  const all = visible >= cols.length;
  slide.classList.toggle('kslide--all', all);
  if (all) active = 0;
  slide.dataset.active = String(active);

  let prev = [];   // the centres of the column before, px from its top
  cols.forEach((col, i) => {
    const matches = [...col.children];
    const h = matches[0]?.offsetHeight || 0;
    const teams = matches[0]?.querySelector('.kmatch__teams');
    const mid = teams ? teams.offsetTop + teams.offsetHeight / 2 : h / 2;   // where the lines meet it
    let last = -Infinity;
    const centres = matches.map((m, k) => {
      const feeders = (m.dataset.from || '').split(',').filter(Boolean).map(Number).filter(j => prev[j] !== undefined);
      // The round in view (and those before it) stack close; later ones line up with their feeders.
      let top = i > active && feeders.length
        ? feeders.reduce((sum, j) => sum + prev[j], 0) / feeders.length - mid
        : k * (h + SLIDE_GAP);
      top = Math.max(top, last + h + SLIDE_GAP);
      last = top;
      m.style.top = `${top}px`;

      // The line from the feeders: a bracket on the right of the round
      // before, then across to this match. None for the third-place game.
      const link = m.querySelector('.kmatch__link');
      if (i > 0 && feeders.length && !('losers' in m.dataset)) {
        const ys = feeders.map(j => prev[j] - top);
        const y1 = Math.min(...ys);
        link.style.cssText = `display: block; left: ${-gapX}px; width: ${gapX / 2}px; top: ${y1}px;`
          + ` height: ${Math.max(...ys) - y1}px; --kmid: ${mid - y1}px;`
          // One feeder (a bye on the other side): a plain line across.
          + (feeders.length === 1 ? ' border-right: 0; border-bottom: 0; border-radius: 0;' : '');
      } else {
        link.style.cssText = 'display: none;';
      }
      return top + mid;
    });
    col.style.height = `${last + h}px`;
    prev = centres;
  });
  // Only as tall as the rounds in view, not the longest round (and a
  // couple of pixels more, so the lowest bubble keeps its bottom edge).
  frame.style.height = `${Math.ceil(Math.max(...cols.slice(active, active + visible).map(c => parseFloat(c.style.height) || 0))) + 2}px`;

  // The chips follow the round in view.
  slide.querySelectorAll('[data-kslide-round]').forEach(chip => {
    const on = Number(chip.dataset.kslideRound) === active;
    chip.setAttribute('aria-pressed', String(on));
    if (on) {
      const row = chip.parentElement;
      row.scrollLeft = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    }
  });
}

/** Shows round i at the left (null: the round it is on, or opens on). */
function setSlide(slide, i, smooth = false) {
  const frame = slide?.querySelector('.kslide__frame');
  if (!frame?.clientWidth) return;
  const active = i ?? Number(slide.dataset.active ?? slide.dataset.start ?? 0);
  layoutSlide(slide, active);
  frame.scrollTo({ left: active * slideStep(slide), behavior: smooth && !reducedMotion() ? 'smooth' : 'instant' });
}
// Laid out again when its width changes (first shown, phone turned);
// not on height, which the layout itself changes mid-slide.
const slideFit = new ResizeObserver(entries => entries.forEach(e => {
  const slide = e.target.closest('[data-kslide]');
  const width = String(Math.round(e.contentRect.width));
  if (!slide || slide.dataset.width === width) return;
  slide.dataset.width = width;
  setSlide(slide);
}));

/* --- The campus map + its venue panel --- */
function renderMap(root, games) {
  if (!CUP_CONFIG.showMap) return;

  const mapWrap = root.querySelector('[data-cup-map]');
  const panel = root.querySelector('[data-cup-venue-panel]');
  const stats = venueStats(games);
  const grid = root.querySelector('.cup-map-grid');
  grid?.classList.toggle('has-selection', Boolean(state.venue));
  mapListExpanded ??= Boolean(state.venue) || matchMedia('(min-width: 1001px)').matches;
  grid?.classList.toggle('is-list-expanded', mapListExpanded);
  const list = root.querySelector('[data-cup-map-list]');
  if (list) {
    list.dataset.expanded = String(mapListExpanded);
    const button = list.querySelector('[data-cup-map-list-toggle]');
    button.setAttribute('aria-expanded', String(mapListExpanded));
    button.setAttribute('aria-label', `${mapListExpanded ? 'Collapse' : 'Expand'} games panel`);
    list.querySelector('.cup-map-list__content').hidden = !mapListExpanded;
    list.querySelector('[data-cup-map-list-title]').textContent = VENUE_BY_ID[state.venue]?.short || 'Venues & games';
    const live = games.filter(g => g.status === 'ongoing' && (!state.venue || g.venueId === state.venue)).length;
    list.querySelector('[data-cup-map-list-note]').textContent = state.venue
      ? `${live ? `${live} ongoing · ` : ''}Tap to ${mapListExpanded ? 'hide' : 'show'} games`
      : `${CUP_MAP.venues.length} venues${live ? ` · ${live} ongoing` : ''}`;
  }
  const outside = root.querySelector('[data-cup-off-campus]');
  if (outside) {
    outside.hidden = !CUP_MAP.showOffCampus;
    if (CUP_MAP.showOffCampus) {
      const old = outside.querySelector('details');
      const expanded = old ? old.open : matchMedia('(min-width: 1001px)').matches;
      outside.innerHTML = offCampusHtml(games, { now: cupNow(), selected: state.venue, expanded });
    }
  }

  // A sport picked on the map only stands while its venue still has it.
  if (state.mapSport && !stats[state.venue]?.sports?.[state.mapSport]) state.mapSport = null;

  if (mapWrap) {
    mapView ??= mountCupMap(mapWrap, {
      onVenue: (id) => selectVenue(id, { toggle: true }),
      onSport: (id, sport) => selectSport(id, sport),
      onClear: () => { if (state.venue) selectVenue(null); },
    });
    mapView.update({ stats, venue: state.venue, sport: state.mapSport });
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
      const sports = venueIcons(v, s).map(i => i.sport);
      return `
        <button class="venue-row${total ? '' : ' is-empty'}" type="button" data-venue-id="${escapeAttr(v.id)}">
          <span class="venue-row__text">
            <span class="venue-row__name">${escapeHtml(v.name)}</span>
            ${sports.length ? `<span class="venue-row__sports">${escapeHtml(sports.join(' · '))}</span>` : ''}
          </span>
          <span class="venue-row__count">${total ? `${total} ${total === 1 ? 'game' : 'games'}` : 'None'}</span>
          ${s?.ongoing ? `<span class="venue-row__live">Live</span>` : ''}
        </button>`;
    }).join('');

    panel.innerHTML = `
      <div class="venue-panel__head">
        <p class="panel__kicker">All venues</p>
        <h3 class="venue-panel__title">${CUP_MAP.venues.length} venues · ${games.length} matches</h3>
        <p class="venue-panel__hint">Tap a venue or a sport on the map, or pick a venue below, to see what is on there.</p>
      </div>
      <div class="venue-rows">${rows}</div>`;
    return;
  }

  const venue = VENUE_BY_ID[state.venue];
  const vstat = stats[state.venue];
  const sports = venueIcons(venue, vstat).map(i => i.sport);
  const here = games.filter(g => g.venueId === state.venue && (!state.mapSport || g.sport === state.mapSport));
  const group = (status) => here.filter(g => g.status === status);

  // More than one sport here: chips to narrow the list, "All sports"
  // being the way back from a sport icon to the whole venue.
  const sportChips = sports.length > 1 ? `
    <div class="venue-panel__sports" role="group" aria-label="Sports at ${escapeAttr(venue.name)}">
      <button class="chip chip--plain" type="button" data-venue-sport="all"
              aria-pressed="${!state.mapSport}">All sports <span class="chip__count">${vstat.total}</span></button>
      ${sports.map(s => `
        <button class="chip chip--plain" type="button" data-venue-sport="${escapeAttr(s)}"
                aria-pressed="${state.mapSport === s}">${escapeHtml(s)} <span class="chip__count">${vstat.sports[s].total}</span></button>`).join('')}
    </div>` : '';

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
      <p class="panel__kicker">${isOffCampus(venue) ? 'Outside campus' : 'Campus venue'}</p>
      <h3 class="venue-panel__title">${escapeHtml(venue.name)}</h3>
      ${venue.note ? `<p class="venue-panel__hint">${escapeHtml(venue.note)}</p>` : ''}
      ${venueLocationHtml(venue)}
      ${sportChips}
      <button class="btn btn--ghost btn--sm venue-panel__clear" type="button" data-cup-clear-venue>
        ← Close venue
      </button>
    </div>
    ${here.length ? `
      ${section('ongoing', 'Live')}
      ${section('upcoming', 'Upcoming')}
      ${section('finished', 'Results')}
    ` : `
      <p class="venue-panel__empty">${state.mapSport
        ? `No ${escapeHtml(state.mapSport)} matches here yet.`
        : 'No matches scheduled here yet.'}</p>
    `}`;
}

function miniGameHtml(g) {
  const time = g.start ? `${formatDay(g.start, { withYear: false })} · ${formatTime(g.start)}` : 'TBA';
  return `
    <button class="mini-game" type="button" data-game-id="${escapeAttr(g.id)}">
      <span class="mini-game__time">${escapeHtml(time)}</span>
      <span class="mini-game__title">${escapeHtml(g.title)}</span>
      <span class="mini-game__meta">${escapeHtml(g.meta)}</span>
      <span class="mini-game__status">${statusPillHtml(g.status, { labels: GAME_STATUS_LABEL, label: g.statusLabel, size: 'sm' })}</span>
    </button>`;
}

/* --- Matches: win counter, team picker, one Filter button, then
       three rows you swipe (Live now · Upcoming · Finished recently)
       or the calendar --- */

/** The two dropdowns are filled once; render() only sets their value,
    so a re-render never closes one while it is open. */
function mountFilters(root) {
  const venue = root.querySelector('[data-cup-filter="venue"]');
  if (venue) {
    venue.innerHTML = `<option value="">All venues</option>${CUP_MAP.venues.map(v =>
      `<option value="${escapeAttr(v.id)}">${escapeHtml(v.name)}</option>`).join('')}`;
  }
  const sport = root.querySelector('[data-cup-filter="sport"]');
  if (sport) {
    sport.innerHTML = `<option value="">All sports</option>${allSports().map(s =>
      `<option value="${escapeAttr(s.name)}">${escapeHtml(s.name)}</option>`).join('')}`;
  }
  root.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-cup-filter]');
    if (!sel) return;
    if (sel.dataset.cupFilter === 'venue') state.matchVenue = VENUE_BY_ID[sel.value] ? sel.value : null;
    if (sel.dataset.cupFilter === 'sport') state.sport = findSport(sel.value)?.name || null;
    render();
  });
}

/** Does a game pass the filters? `ignore` leaves one out (the day
    chips are built from what the other filters leave). */
function passes(g, { ignoreDay = false, ignoreStatus = false } = {}) {
  return (ignoreStatus || state.status === 'all' || g.status === state.status)
    && (!state.sport || g.sport === state.sport)
    && (!state.matchVenue || g.venueId === state.matchVenue)
    && (ignoreDay || !state.day || dayKey(g.start) === state.day);
}

const activeFilters = () =>
  [state.day, state.status !== defaultStatus(), state.sport, state.matchVenue].filter(Boolean).length;

/** A day from the filter's day chips or the calendar ('' = all days). */
function pickDay(key) {
  state.day = key || '';
  state.dayPicked = Boolean(key);
  state.calMonth = null;       // the calendar follows the chosen day
  render();
}

function renderMatches(root, games, mine) {
  if (!tabHasContent.matches()) return;
  renderWins(root, games);

  // A chosen day stands while it still has a game under the other filters.
  const days = gameDays(games.filter(g => passes(g, { ignoreDay: true, ignoreStatus: true })));
  if (state.day && !days.includes(state.day)) {
    state.day = '';
    state.dayPicked = false;
    state.calMonth = null;
  }
  renderFilters(root, days);

  // List or calendar; either one can be switched off in the config.
  if (!CUP_CONFIG.showCalendar) state.view = 'list';
  if (!CUP_CONFIG.showSchedule) state.view = 'calendar';
  const switcher = root.querySelector('[data-cup-viewswitch]');
  if (switcher) {
    switcher.hidden = !(CUP_CONFIG.showCalendar && CUP_CONFIG.showSchedule);
    switcher.querySelectorAll('[data-cup-view-mode]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.cupViewMode === state.view));
    });
  }
  toggle(root, '[data-cup-list]', state.view === 'list');
  toggle(root, '[data-cup-calendar-wrap]', state.view === 'calendar');

  if (state.view === 'list') {
    let list = games.filter(g => passes(g));
    if (CUP_CONFIG.maxGamesShown) list = list.slice(0, CUP_CONFIG.maxGamesShown);
    renderRails(root, list, mine);
  } else {
    renderMatchCalendar(root, games, games.filter(g => passes(g, { ignoreDay: true })), mine);
  }
}

/* --- The win counter: which teams have won the most games so far,
       worked out from the results (lib/standings.js) --- */
function renderWins(root, games) {
  const box = root.querySelector('[data-cup-wins]');
  if (!box) return;
  const wins = new Map();
  for (const g of games) {
    const id = winnerOf(g);
    if (id) wins.set(id, (wins.get(id) || 0) + 1);
  }
  const top = [...wins]
    .map(([id, n]) => ({ team: TEAM_BY_ID[id], n }))
    .filter(x => x.team)
    .sort((a, b) => (b.n - a.n) || a.team.name.localeCompare(b.team.name))
    .slice(0, 4);

  box.innerHTML = `
    <span class="cup-wins__icon" aria-hidden="true">
      <img src="assets/illustrations/hero-trophy.svg" alt="">
    </span>
    <div class="cup-wins__text">
      <p class="cup-wins__label">Most wins so far</p>
      ${top.length ? `
        <ol class="cup-wins__list">
          ${top.map(x => `
            <li class="cup-wins__team" title="${escapeAttr(x.team.name)}">
              <img src="${escapeAttr(x.team.logo)}" alt="" loading="lazy" decoding="async">
              <span>${escapeHtml(x.team.short)}</span>
              <b aria-label="${escapeAttr(`${x.n} win${x.n === 1 ? '' : 's'}`)}">${x.n}</b>
            </li>`).join('')}
        </ol>`
        : '<p class="cup-wins__none">No results yet. The first wins land soon.</p>'}
      <p class="cup-wins__note">Unofficial tally, counted from the results shown here. Not the official TXC count.</p>
    </div>`;
}

const weekday = (date) => {
  try { return new Intl.DateTimeFormat(SITE.locale || undefined, { weekday: 'short' }).format(date); }
  catch { return ''; }
};

/* --- The Filter button and the panel it opens --- */
function renderFilters(root, days) {
  const n = activeFilters();
  const toggleBtn = root.querySelector('[data-cup-filter-toggle]');
  const panel = root.querySelector('[data-cup-filter-panel]');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(state.filtersOpen));
  if (panel) panel.hidden = !state.filtersOpen;

  const count = root.querySelector('[data-cup-filter-count]');
  if (count) { count.textContent = String(n); count.hidden = !n; }

  // What is filtered, in words, beside the button while the panel is shut.
  const today = dayKey(cupNow());
  const summary = root.querySelector('[data-cup-filter-summary]');
  if (summary) {
    const parts = [
      state.day ? (state.day === today ? 'Today' : formatDay(keyToDate(state.day), { withYear: false })) : '',
      state.status !== 'all' ? STATUS_FILTERS.find(f => f.id === state.status)?.label : '',
      state.sport || '',
      state.matchVenue ? VENUE_BY_ID[state.matchVenue]?.short : '',
    ].filter(Boolean);
    summary.textContent = parts.join(' · ');
    summary.hidden = !parts.length || state.filtersOpen;
  }

  const dayRow = root.querySelector('[data-cup-day-chips]');
  if (dayRow) {
    const chip = (key, label, aria) => `
      <button class="cup-daychip${key === today ? ' is-today' : ''}" type="button" data-match-day="${escapeAttr(key)}"
              aria-pressed="${state.day === key}"${aria ? ` aria-label="${escapeAttr(aria)}"` : ''}>${escapeHtml(label)}</button>`;
    dayRow.innerHTML = chip('', 'All days') + days.map(key => {
      const date = keyToDate(key);
      return chip(key, key === today ? 'Today' : `${weekday(date)} ${date.getDate()}`,
        formatDay(date, { withYear: false }) + (key === today ? ', today' : ''));
    }).join('');
  }

  const statusRow = root.querySelector('[data-cup-status-chips]');
  if (statusRow) {
    statusRow.closest('.cup-filterpanel__row')?.toggleAttribute('hidden', !CUP_CONFIG.showStatusFilter);
    statusRow.innerHTML = STATUS_FILTERS.map(f => `
      <button class="chip" type="button" data-status-id="${f.id}"
              aria-pressed="${state.status === f.id}"
              style="--chip-accent: var(--${f.color});">
        <span class="chip__dot" aria-hidden="true"></span>
        <span>${escapeHtml(f.label)}</span>
      </button>`).join('');
  }

  const venue = root.querySelector('[data-cup-filter="venue"]');
  if (venue) venue.value = state.matchVenue || '';
  const sport = root.querySelector('[data-cup-filter="sport"]');
  if (sport) sport.value = state.sport || '';

  const clear = root.querySelector('[data-cup-clear-filters]');
  if (clear) clear.hidden = !n;
}

/* --- Three rows you swipe: Live now · Upcoming · Finished recently.
       Followed teams' games go first in each. --- */
const RAIL_ARROW = (dir) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${dir < 0 ? '10,3 5,8 10,13' : '6,3 11,8 6,13'}"/></svg>`;

function renderRails(root, list, mine) {
  const wrap = root.querySelector('[data-cup-rails]');
  if (!wrap) return;

  // Keep where each row was swiped to: the page repaints every minute.
  const kept = Object.fromEntries([...wrap.querySelectorAll('[data-rail]')]
    .map(r => [r.dataset.rail, r.querySelector('[data-rail-track]')?.scrollLeft || 0]));

  const today = dayKey(cupNow());
  const dayName = state.day && state.day !== today ? formatDay(keyToDate(state.day), { withYear: false }) : '';
  const byStart = (a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity);
  const mineFirst = (games) => [...games.filter(g => isMine(g, mine)), ...games.filter(g => !isMine(g, mine))];
  const of = (status) => list.filter(g => g.status === status);

  const rails = [
    { id: 'live', status: 'ongoing', title: 'Live now',
      games: mineFirst(of('ongoing').sort(byStart)),
      empty: 'Nothing live right now.',
      // A day that is not today has nothing live to show.
      shown: !state.day || state.day === today },
    { id: 'upcoming', status: 'upcoming',
      title: !state.day ? 'Coming up' : (dayName ? `Upcoming · ${dayName}` : 'Upcoming today'),
      games: mineFirst(of('upcoming').sort(byStart)),
      empty: dayName ? `Nothing still to come on ${dayName}.` : 'Nothing still to come.',
      shown: true },
    { id: 'finished', status: 'finished',
      title: !state.day ? 'Finished recently' : (dayName ? `Results · ${dayName}` : 'Finished today'),
      games: mineFirst(of('finished').sort((a, b) => byStart(b, a))),
      empty: 'No results yet.',
      shown: true },
  ].filter(r => r.shown && (state.status === 'all' || state.status === r.status));

  wrap.innerHTML = rails.map(r => `
    <section class="cup-rail cup-rail--${r.id}" data-rail="${r.id}" aria-labelledby="cup-rail-${r.id}">
      <div class="cup-rail__head">
        <h3 class="cup-rail__title" id="cup-rail-${r.id}">
          ${r.id === 'live' && r.games.length ? '<i class="cup-rail__live" aria-hidden="true"></i>' : ''}${escapeHtml(r.title)}
        </h3>
        ${r.games.length ? `<span class="cup-rail__count">${r.games.length}</span>` : ''}
      </div>
      ${r.games.length ? `
        <div class="cup-rail__body">
          <button class="cup-rail__arrow cup-rail__arrow--prev" type="button" data-rail-step="-1"
                  aria-label="${escapeAttr(`${r.title}: back`)}">${RAIL_ARROW(-1)}</button>
          <div class="cup-rail__track" data-rail-track>
            ${r.games.map((g, i) => matchCardHtml(g, { i, myTeams: mine })).join('')}
          </div>
          <button class="cup-rail__arrow cup-rail__arrow--next" type="button" data-rail-step="1"
                  aria-label="${escapeAttr(`${r.title}: more`)}">${RAIL_ARROW(1)}</button>
        </div>`
        : `<p class="cup-rail__empty">${escapeHtml(r.empty)}</p>`}
    </section>`).join('');

  wrap.querySelectorAll('[data-rail]').forEach(rail => {
    const track = rail.querySelector('[data-rail-track]');
    if (!track) return;
    track.scrollLeft = kept[rail.dataset.rail] || 0;
    const sync = () => railArrows(rail);
    track.addEventListener('scroll', sync, { passive: true });
    sync();
  });
}

/** Hide an arrow when there is nothing more that way. */
function railArrows(rail) {
  const track = rail.querySelector('[data-rail-track]');
  if (!track) return;
  const max = track.scrollWidth - track.clientWidth;
  rail.querySelector('[data-rail-step="-1"]')?.toggleAttribute('disabled', track.scrollLeft <= 2);
  rail.querySelector('[data-rail-step="1"]')?.toggleAttribute('disabled', track.scrollLeft >= max - 2);
}

/** An arrow: one card along. */
function stepRail(btn) {
  const track = btn.closest('[data-rail]')?.querySelector('[data-rail-track]');
  const card = track?.querySelector('.match');
  if (!track || !card) return;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  track.scrollBy({
    left: Number(btn.dataset.railStep) * (card.offsetWidth + gap),
    behavior: reducedMotion() ? 'auto' : 'smooth',
  });
}

/** A day's games in time order, the followed teams' first; the
    featured match (components/featured-match.js picks it) leads, full
    width. Used by the calendar's day. */
function dayCards(list, key, mine) {
  const dayGames = gamesOn(list, key);
  const pick = CUP_CONFIG.showFeatured ? pickFeatured(dayGames, mine) : null;
  const rest = dayGames.filter(g => g !== pick);
  const ordered = [
    ...(pick ? [pick] : []),
    ...rest.filter(g => isMine(g, mine)),
    ...rest.filter(g => !isMine(g, mine)),
  ];
  return ordered.map((g, i) => matchCardHtml(g, { i, myTeams: mine, featured: g === pick })).join('');
}

/* --- The calendar: the filtered games as a month, the chosen day's
       games (or today's, or the next day with games) underneath --- */
function renderMatchCalendar(root, games, list, mine) {
  const cal = root.querySelector('[data-cup-calendar]');
  const dayWrap = root.querySelector('[data-cup-calendar-day]');
  if (!cal) return;

  const now = cupNow();
  const day = state.day || initialDay(gameDays(list), now);
  if (!state.calMonth) {
    const d = keyToDate(day) || now;
    state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  cal.innerHTML = calendarHtml({
    games: list,
    month: state.calMonth,
    selected: day,
    today: dayKey(now),
    months: gameMonths(games),
  });

  if (!dayWrap) return;
  const date = keyToDate(day);
  dayWrap.innerHTML = date ? `
    <h3 class="cal-day__title">${escapeHtml(formatDay(date))}</h3>
    <div class="match-grid">${dayCards(list, day, mine)}</div>`
    : `<p class="filter-note filter-note--empty"><strong>No matches here.</strong>&nbsp;Try other filters.</p>`;
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
    sport: plain(p.sport || ''),
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
    // A full https:// address (the news Worker) is used as is; anything
    // else is a file name inside ../data/.
    const feed = String(CUP_NEWS.feed);
    const url = /^https:\/\//i.test(feed) ? new URL(feed) : new URL(`../data/${feed}`, import.meta.url);
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
 * bars under it are buttons. Everything after the hero's posts scrolls
 * in a carousel that loops (TXC's behaviour: the cards are laid out
 * three times and the scroll position jumps by one set at either
 * end). "See all" swaps the carousel for a plain grid.
 *
 * A post without a picture gets a placeholder graphic in the same
 * slot, so layouts never jump when real pictures arrive.
 */
const HERO_COUNT = 3;
const MORE_MAX = 12;
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
  const all = await loadPosts();
  // Each sport's page shows its own posts from the same feed.
  newsPosts = all;
  if (state.sportsSport) render();
  const posts = all.slice(0, CUP_NEWS.maxPosts || (HERO_COUNT + MORE_MAX));
  const heroPosts = posts.slice(0, HERO_COUNT);
   const rest = posts.slice(HERO_COUNT, HERO_COUNT + MORE_MAX);

  const when = (p) => (parseDate(p.date) ? formatRange(p.date) : '');
  const linkFor = (p) => safeUrl(p.link) || page;
  // "New" follows the real clock, not the Cup's preview clock: it is
  // about when CSG posted, not where the season is.
  const isNew = (p) => {
    const d = parseDate(p.date);
    return d && (Date.now() - d.getTime()) < NEW_FOR_DAYS * 86400000;
  };

  // One hero slide. Only the showing slide is reachable by keyboard
  // and screen reader; the others are hidden until their turn.
  const slideHtml = (p, i) => {
    const link = linkFor(p);
    const media = p.image
      ? `<img src="${escapeAttr(p.image)}" alt="" decoding="async"${i ? ' loading="lazy"' : ''}>`
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

  // A tall picture card, the headline over a dark fade at the bottom.
  // `clone` marks the carousel's repeat copies: hidden from screen
  // readers and taken out of the tab order.
  const cardHtml = (p, i, clone = false) => {
    const link = linkFor(p);
    const media = p.image
      ? `<img src="${escapeAttr(p.image)}" alt="" loading="lazy" decoding="async">`
      : newsPlaceholder(p, i + 1);
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
 * wireHero(el, { ms }) — autoplay and progress bars for a set of
 * [data-hero-slide] slides with [data-hero-go] bars: the news hero,
 * and the photos in the banner.
 *
 * The active bar's fill is a CSS animation lasting `ms`; when it
 * ends, the next slide shows. Pausing is just pausing that animation,
 * so the bar always shows exactly how long is left.
 */
function wireHero(el, { ms = HERO_MS } = {}) {
  if (!el) return;
  const slides = [...el.querySelectorAll('[data-hero-slide]')];
  const bars = [...el.querySelectorAll('[data-hero-go]')];
  if (slides.length < 2) return;

  el.style.setProperty('--hero-ms', `${ms}ms`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-motion') === 'reduced';
  el.classList.toggle('is-static', reduced);
  let index = 0;

  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const on = i === index;
      s.classList.toggle('is-active', on);
      if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
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

/**
 * selectVenue(id) — show everything at one venue (null = the list).
 * With toggle, tapping the venue already shown clears it — unless a
 * sport was picked there, in which case it widens back to all sports.
 */
function selectVenue(id, { toggle: toggleSame = false } = {}) {
  const next = (toggleSame && state.venue === id && !state.mapSport) ? null : (id || null);
  state.venue = (next && VENUE_BY_ID[next]) ? next : null;
  state.mapSport = null;
  mapListExpanded = Boolean(state.venue) || matchMedia('(min-width: 1001px)').matches;
  render();
  revealPanel();
}

/** selectSport(venue, sport) — one sport's games at one venue, from
    its icon on the map. Tapping the same icon again widens back out. */
function selectSport(id, sport) {
  const same = state.venue === id && state.mapSport === sport;
  state.venue = VENUE_BY_ID[id] ? id : null;
  state.mapSport = (state.venue && !same) ? sport : null;
  mapListExpanded = true;
  render();
  revealPanel();
}

/* The map and its sheet share one viewport under the existing navigation. */
function revealPanel() {
  if (state.tab === 'map') window.scrollTo({ top: 0, behavior: 'auto' });
}

/** Exported so a match's detail view can jump to its venue. */
export function showVenue(id) {
  showTab('map', { scroll: false });
  selectVenue(id);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function openGame(id) {
  const params = new URLSearchParams(location.search);
  params.set('screen', 'cup');
  params.set('game', id);
  history.pushState(null, '', `?${params.toString()}`);
  renderGameDetail(id);
}

/* --- Sports: where it is, and moving about in it --- */

/** The Sports view's place from a link: ?sport=<id>&div=<division>&team=<id>. */
function readSports(q, tab = state.tab) {
  const on = tab === 'sports';
  state.sportsSport = on ? (findSport(q.sport)?.id || '') : state.sportsSport;
  state.sportsDiv = on ? String(q.div || '') : state.sportsDiv;
  state.sportsTeam = (on && state.sportsSport && TEAM_BY_ID[q.team]) ? q.team : (on ? '' : state.sportsTeam);
}

/**
 * goSports({ sport, team }) — into a sport's page (or a team's
 * inside it), or back to the grid with no sport. Each step is a
 * history entry, so the browser's Back button walks back up.
 */
function goSports({ sport = '', team = '' } = {}) {
  const next = findSport(sport)?.id || '';
  if (next !== state.sportsSport) state.sportsDiv = '';
  state.sportsSport = next;
  state.sportsAll = false;
  state.sportsTeam = (next && TEAM_BY_ID[team]) ? team : '';
  history.pushState(null, '', urlFor());
  render();
  scrollToView();
  rootEl?.querySelector('[data-sports-heading]')?.focus({ preventScroll: true });
}

/** The link always names the view, and carries only that view's
    filters (?venue= means a filter on Matches, a pick on the Map). */
function urlFor() {
  const q = new URLSearchParams();
  q.set('screen', 'cup');
  q.set('tab', state.tab);
  if (state.tab === 'matches') {
    if (state.view === 'calendar') q.set('view', 'calendar');
    if (state.status !== defaultStatus()) q.set('status', state.status);
    if (state.sport) q.set('sport', findSport(state.sport)?.id || state.sport);
    if (state.matchVenue) q.set('venue', state.matchVenue);
    // Only a day someone chose: the default follows the clock.
    if (state.dayPicked && state.day) q.set('day', state.day);
  }
  if (state.tab === 'sports' && state.sportsSport) {
    q.set('sport', state.sportsSport);
    if (state.sportsDiv) q.set('div', catSlug(state.sportsDiv));
    if (state.sportsTeam) q.set('team', state.sportsTeam);
  }
  if (state.tab === 'map') {
    if (state.venue) q.set('venue', state.venue);
    if (state.mapSport) q.set('mapsport', state.mapSport);
  }
  const open = new URLSearchParams(location.search).get('game');
  if (open) q.set('game', open);
  return `?${q.toString()}`;
}

function syncUrl() {
  if (currentQuery().screen !== 'cup') return;
  history.replaceState(null, '', urlFor());
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
