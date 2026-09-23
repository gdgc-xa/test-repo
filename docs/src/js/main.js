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

function boot() {
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
