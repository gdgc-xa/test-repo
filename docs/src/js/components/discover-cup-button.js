/* ============================================================
   components/discover-cup-button.js — a button directly under the
   hero search box on Discover that opens The Xavier Cup.
   Switch: data/xavier-cup.js > CUP_CONFIG.showDiscoverButton
   (its words: discoverButtonLabel, discoverButtonNote).
   Load it with one line in main.js:
     import './components/discover-cup-button.js';
   ============================================================ */
import { CUP_CONFIG } from '../data/xavier-cup.js';
import { SITE } from '../data/site.js';
import { escapeHtml } from '../lib/html.js';

function init() {
  const main = document.getElementById('screen-landing');
  if (!main || main.querySelector('[data-discover-cup]')) return;
  if (!CUP_CONFIG.enabled || CUP_CONFIG.showDiscoverButton === false) return;
  if (SITE?.tabs?.cup?.enabled === false) return;

  const label = CUP_CONFIG.discoverButtonLabel || CUP_CONFIG.name || 'The Xavier Cup';
  const note = CUP_CONFIG.discoverButtonNote || '';
  const bar = document.createElement('div');
  bar.className = 'dcup';
  bar.setAttribute('data-discover-cup', '');
  bar.innerHTML = `
    <div class="dcup__inner">
      <a class="dcup__btn" href="?screen=cup" data-nav="cup">
        <svg class="dcup__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>
        </svg>
        <span class="dcup__text"><strong>${escapeHtml(label)}</strong>${note ? `<span>${escapeHtml(note)}</span>` : ''}</span>
        <span class="dcup__go" aria-hidden="true">→</span>
      </a>
    </div>`;
  // Directly under the search box (inside the hero). If the hero is missing
  // for any reason, fall back to the very top of Discover.
  const search = main.querySelector('[data-hero-search]');
  if (search && search.parentNode) {
    bar.classList.add('dcup--hero');
    search.insertAdjacentElement('afterend', bar);
  } else {
    main.insertBefore(bar, main.firstChild);
  }
}
init();
