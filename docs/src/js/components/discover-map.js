/* ============================================================
   components/discover-map.js — the Map Hub tile on Discover.
   Behind the tile's words: a still of the real campus map (the
   Map tab's drawing, cup-map.js → cupMapPreviewHtml) with the
   Cup's venues named on it, and a venue's name in red with a
   pulsing dot while a game is on there. Redrawn only when that
   changes: when live data arrives, and once a minute.
   Put in: docs/src/js/components/discover-map.js
   Load it with one line in main.js:
     import './components/discover-map.js';
   ============================================================ */
import { GAMES, cupNow } from '../data/xavier-cup.js';
import { resolveGame } from './game-card.js';
import { cupMapPreviewHtml, venueStats } from './cup-map.js';

function init() {
  const art = document.querySelector('[data-discover-map]');
  if (!art) return;
  let shown = null;   // the venues that were live when last drawn

  const paint = () => {
    const now = cupNow();
    const stats = venueStats(GAMES.map(g => resolveGame(g, now)));
    const live = Object.keys(stats).filter(id => stats[id].ongoing).sort().join(',');
    if (live === shown) return;
    shown = live;
    art.innerHTML = cupMapPreviewHtml(stats);
  };

  paint();
  setInterval(paint, 60000);
  window.addEventListener('cup:data', paint);   // live data arrived or refreshed
}
init();
