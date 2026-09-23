/* ============================================================
   router.js — SPA-style screen switching driven by URL query.

   URL shapes we understand:
     /                        → landing
     ?screen=browse           → browse
     ?screen=events           → events
     ?screen=cup              → the Xavier Cup
     ?screen=about            → about
     ?screen=browse&filter=<id>&q=<query>   browse w/ preselect
     ?…&org=<id>              open the org booth  (any screen)
     ?…&event=<id>            open an event       (events)
     ?…&game=<id>             open a fixture      (cup)
     ?screen=cup&venue=<id>   the map with that venue selected
     ?…&status=…&sport=…      the list filters, so a filtered view
                              can be linked to and shared

   pushState is used for user-initiated navigations; the modals and
   the in-screen filters use replaceState so the Back button steps
   between screens rather than between chip clicks.

   A tab switched off in data/site.js is refused here too, so an old
   link to it lands on Discover instead of an empty page.
   ============================================================ */

import { renderBooth } from './screens/booth.js';
import { initBrowse } from './screens/browse.js';
import { initLanding } from './screens/landing.js';
import { initAbout } from './screens/about.js';
import { initEvents, renderEventDetail } from './screens/events.js';
import { initCup, renderGameDetail } from './screens/cup.js';
import { closeDetail } from './components/detail-modal.js';
import { setCompassTarget } from './compass-orientation.js';
import { SITE, tabEnabled } from './data/site.js';

const routes = {
  landing: () => showScreen('screen-landing'),
  browse:  () => showScreen('screen-browse'),
  about:   () => showScreen('screen-about'),
  events:  () => showScreen('screen-events'),
  cup:     () => showScreen('screen-cup'),
};

/** Is this screen id something we are allowed to show right now? */
function screenAllowed(screen) {
  if (!routes[screen]) return false;
  if (screen === 'events') return tabEnabled('events');
  if (screen === 'cup') return tabEnabled('cup');
  return true;
}

export function currentQuery() {
  const q = new URLSearchParams(location.search);
  const filtersParam = q.get('filters');
  const singleFilter = q.get('filter');
  const filters = filtersParam
    ? filtersParam.split(',').filter(Boolean)
    : (singleFilter ? [singleFilter] : []);
  return {
    screen: q.get('screen') || 'landing',
    filter: filters[0] || '',
    filters,
    q:      q.get('q') || '',
    org:    q.get('org') || '',
    event:  q.get('event') || '',
    game:   q.get('game') || '',
    venue:  q.get('venue') || '',
    status: q.get('status') || '',
    sport:  q.get('sport') || '',
  };
}

export function navigate(params = {}) {
  const q = new URLSearchParams();
  const merged = { screen: 'landing', ...params };

  if (merged.screen !== 'landing') q.set('screen', merged.screen);
  if (merged.filter) q.set('filter', merged.filter);
  if (merged.q)      q.set('q', merged.q);
  if (merged.org)    q.set('org', merged.org);
  if (merged.event)  q.set('event', merged.event);
  if (merged.game)   q.set('game', merged.game);
  if (merged.venue)  q.set('venue', merged.venue);
  if (merged.status) q.set('status', merged.status);
  if (merged.sport)  q.set('sport', merged.sport);

  // location.pathname, not '/': the site is served from a subpath on
  // GitHub Pages, and a bare '/' would navigate off it to the domain root.
  const url = q.toString() ? `?${q.toString()}` : location.pathname;
  history.pushState(null, '', url);
  handleRoute();
}

let lastScreen = null;

/**
 * handleRoute() — read URL and render the matching screen.
 * Also opens/closes the booth modal per ?org=… and the shared
 * detail modal per ?event=… / ?game=….
 * Screens are re-initialised only when the screen actually changed,
 * so opening a card via ?org=… doesn't re-flash the reveals.
 */
export function handleRoute() {
  const { screen: requested, org, event, game } = currentQuery();
  const screen = screenAllowed(requested) ? requested : 'landing';
  routes[screen]();

  // Nav highlight
  document.querySelectorAll('[data-nav-item]').forEach(el => {
    el.setAttribute('aria-current', el.dataset.navItem === screen ? 'page' : 'false');
  });

  // Compass points to current screen
  setCompassTarget(screen);

  // Modal state follows the URL.
  renderBooth(org || null);

  if (event && screen === 'events') {
    renderEventDetail(event);
  } else if (game && screen === 'cup') {
    renderGameDetail(game);
  } else {
    // Silent: the URL is already what we want, so closing must not
    // rewrite it back to the previous entry.
    closeDetail({ silent: true });
  }

  // About hydrates once; its own guard makes repeat calls free.
  if (screen === 'about') {
    const el = document.getElementById('screen-about');
    if (el) initAbout(el);
  }

  // Re-init a data screen only when we JUST landed on it
  if (screen === 'browse' && lastScreen !== 'browse') {
    const el = document.getElementById('screen-browse');
    if (el) initBrowse(el);
  }
  if (screen === 'events' && lastScreen !== 'events') {
    const el = document.getElementById('screen-events');
    if (el) initEvents(el);
  }
  if (screen === 'cup' && lastScreen !== 'cup') {
    const el = document.getElementById('screen-cup');
    if (el) initCup(el);
  }

  // Reset scroll to top only on screen change, not on modal open/close
  if (!org && !event && !game && lastScreen !== screen) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  lastScreen = screen;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.hidden = el.id !== id;
  });
}

/**
 * Nav entries for switched-off tabs are removed from the DOM, not
 * merely hidden: a disabled tab should not be reachable by tabbing
 * to an invisible button either. Labels come from data/site.js so
 * renaming a tab is a one-line change there.
 */
function applyTabVisibility() {
  for (const [id, cfg] of Object.entries(SITE.tabs || {})) {
    const on = Boolean(cfg.enabled);
    document.querySelectorAll(`[data-nav-item="${id}"]`).forEach(el => {
      if (!on) { el.remove(); return; }
      const isSheet = el.classList.contains('nav-sheet__item');
      const label = isSheet ? (cfg.sheetLabel || cfg.navLabel) : cfg.navLabel;
      if (label) el.textContent = label;
    });
    if (!on) {
      document.getElementById(`screen-${id}`)?.remove();
    }
  }
}

export function initRouter() {
  applyTabVisibility();

  window.addEventListener('popstate', handleRoute);

  // Delegate clicks on any [data-nav="<screen>"] element to the router
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-nav]');
    if (!el) return;
    e.preventDefault();
    const screen = el.dataset.nav;
    navigate({ screen });
  });

  handleRoute();
}
