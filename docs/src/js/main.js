/* ============================================================
   main.js — entry point.
   Hydrates the static HTML, initializes the router, applies the
   saved appearance (theme + design skin + motion), and mounts the
   ambient/delight modules.
   Load with <script type="module" src="…"> in index.html.
   ============================================================ */

import { initRouter }       from './router.js';
import { initAppearance }   from './appearance.js';
import { initSettings }     from './settings.js';
import { watchReveals }     from './reveal-observer.js';
import { initLanding }      from './screens/landing.js';
import { initNavSheet }     from './nav-sheet.js';
import { startLiveData }    from './lib/live-data.js';
import './components/discover-updates.js';
import './components/discover-games.js';
import './components/discover-map.js';
import './components/discover-flow.js';
import './components/discover-teams.js';
import './components/discover-hero.js';
import './lib/adaptive-tone.js';
import './components/discover-cup-button.js';

function boot() {
  // Read before the router tidies the address (see the layout tool below).
  const wantsTweak = new URLSearchParams(location.search).has('tweak');

  // Live Xavier Cup data: clears the sample fixtures before anything
  // draws them, then fills them in from the tracker.
  startLiveData();

  // Appearance first: it stamps data-theme / data-skin / data-motion
  // and swaps the season wording before anything measures the page.
  initAppearance();

  // One-time hydration of the landing screen skeleton
  const landingEl = document.getElementById('screen-landing');
  if (landingEl) initLanding(landingEl);

  // Router picks the initial screen from the URL and takes over navigation
  initRouter();

  // Reveal observer — landing + any static sections in view
  watchReveals(document);

  // Mobile nav sheet (hamburger, <=820px)
  initNavSheet();

  // The gear button and its panel
  initSettings();

  // The layout tool for moving things by hand (tweak.js → tweaks.css):
  // ?tweak in the address or Ctrl+Alt+T; it stays on for the visit
  // until closed. Not downloaded otherwise.
  let tweakOn = false;
  try { tweakOn = Boolean(sessionStorage.getItem('cc-tweak')); } catch { /* no storage */ }
  if (tweakOn || wantsTweak) {
    import('./tweak.js').then(m => m.openTweak());
  }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'KeyT') import('./tweak.js').then(m => m.toggleTweak());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}