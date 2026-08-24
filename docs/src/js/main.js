/* ============================================================
   main.js — entry point.
   Hydrates the static HTML, initializes the router, wires up
   the theme toggle, mounts all the ambient/delight modules.
   Load with <script type="module" src="…"> in index.html.
   ============================================================ */

import { initRouter }        from './router.js';
import { initThemeToggle }   from './theme-toggle.js';
import { watchReveals }      from './reveal-observer.js';
import { initLanding }       from './screens/landing.js';
import { initNavSheet }      from './nav-sheet.js';

function boot() {
  initThemeToggle();

  // One-time hydration of the landing screen skeleton
  const landingEl = document.getElementById('screen-landing');
  if (landingEl) initLanding(landingEl);

  // Router picks the initial screen from the URL and takes over navigation
  initRouter();

  // Reveal observer — landing + any static sections in view
  watchReveals(document);

  // Mobile nav sheet (hamburger, <=820px)
  initNavSheet();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
