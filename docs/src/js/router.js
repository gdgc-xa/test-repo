/* ============================================================
   router.js — SPA-style screen switching driven by URL query.
   URL shapes we understand:
     /              → landing
     ?screen=browse → browse
     ?screen=about  → about
     ?screen=browse&filter=<id>&q=<query> → browse w/ preselect
     ?…&org=<id>    → open booth modal for that org
   pushState is used for user-initiated navigations; the modal
   uses replaceState for its close cleanup.
   ============================================================ */

import { renderBooth } from './screens/booth.js';
import { initBrowse } from './screens/browse.js';
import { initLanding } from './screens/landing.js';
import { initAbout } from './screens/about.js';
import { setCompassTarget } from './compass-orientation.js';

const routes = {
  landing: () => showScreen('screen-landing'),
  browse:  () => showScreen('screen-browse'),
  about:   () => showScreen('screen-about'),
};

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
  };
}

export function navigate(params = {}) {
  const q = new URLSearchParams();
  const merged = { screen: 'landing', ...params };

  if (merged.screen !== 'landing') q.set('screen', merged.screen);
  if (merged.filter) q.set('filter', merged.filter);
  if (merged.q)      q.set('q', merged.q);
  if (merged.org)    q.set('org', merged.org);

  // location.pathname, not '/': the site is served from a subpath on
  // GitHub Pages, and a bare '/' would navigate off it to the domain root.
  const url = q.toString() ? `?${q.toString()}` : location.pathname;
  history.pushState(null, '', url);
  handleRoute();
}

let lastScreen = null;

/**
 * handleRoute() — read URL and render the matching screen.
 * Also opens/closes the booth modal per ?org=….
 * Only re-inits browse when the screen actually changed, so
 * opening a card via ?org=… doesn't re-flash the reveal animations.
 */
export function handleRoute() {
  const { screen, org } = currentQuery();
  const routeFn = routes[screen] || routes.landing;
  routeFn();

  // Nav highlight
  document.querySelectorAll('[data-nav-item]').forEach(el => {
    el.setAttribute('aria-current', el.dataset.navItem === screen ? 'page' : 'false');
  });

  // Compass points to current screen
  setCompassTarget(screen);

  // Modal state follows ?org=…
  renderBooth(org || null);

  // About hydrates once; its own guard makes repeat calls free.
  if (screen === 'about') {
    const el = document.getElementById('screen-about');
    if (el) initAbout(el);
  }

  // Re-init the browse screen only when we JUST landed on it
  if (screen === 'browse' && lastScreen !== 'browse') {
    const el = document.getElementById('screen-browse');
    if (el) initBrowse(el);
  }

  // Reset scroll to top only on screen change, not on modal open/close
  if (!org && lastScreen !== screen) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  lastScreen = screen;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.hidden = el.id !== id;
  });
}

export function initRouter() {
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
