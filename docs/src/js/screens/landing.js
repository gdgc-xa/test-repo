/* ============================================================
   screens/landing.js — static screen wiring.
   Attaches: category-tag click → route to browse w/ preselect;
   search submit → route to browse w/ query.
   ============================================================ */

import { CATEGORIES, COLOR_OF, SHORT_LABEL } from '../data/categories.js';
import { attachSearchShell } from '../components/search-shell.js';
import { resolveFeatured } from '../components/featured.js';
import { cardHtml } from '../components/card.js';
import { FEATURED_ENABLED } from '../data/featured.js';
import { watchReveals } from '../reveal-observer.js';
import { navigate } from '../router.js';

/**
 * Called once during main.js hydration.
 * The static HTML skeleton is in index.html — we only wire up
 * dynamic bits (tag cloud + search + featured strip).
 */
export function initLanding(root) {
  hydrateTagCloud(root);
  hydrateSearch(root);
  hydrateFeatured(root);
}

function hydrateTagCloud(root) {
  const container = root.querySelector('[data-tag-cloud]');
  if (!container) return;

  container.innerHTML = CATEGORIES.map((c, i) => {
    const stagger = Math.min(i * 30, 300);
    return `
      <button class="tag reveal"
              data-category-id="${c.id}"
              style="--tag-accent: var(--${c.color}); --reveal-delay: ${stagger}ms;"
              type="button">
        ${SHORT_LABEL[c.id]}
      </button>`;
  }).join('');

  // Clicking a tag routes to browse with that cluster preselected
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag');
    if (!btn) return;
    const id = btn.dataset.categoryId;
    navigate({ screen: 'browse', filter: id });
  });
}

function hydrateSearch(root) {
  const shell = root.querySelector('[data-hero-search]');
  if (!shell) return;
  attachSearchShell(shell, (query) => {
    if (!query) return;
    navigate({ screen: 'browse', q: query });
  });
}

/**
 * Renders the "Featured Organizations" strip. What appears here
 * is driven entirely by data/featured.js — this function just
 * resolves it against the roster and paints cards.
 */
function hydrateFeatured(root) {
  const section = root.querySelector('[data-featured-section]');
  const container = root.querySelector('[data-featured-grid]');
  if (!section || !container) return;

  const entries = FEATURED_ENABLED ? resolveFeatured() : [];

  // Nothing to feature (disabled, or every configured id was bad) —
  // hide the section instead of leaving an empty band on the page.
  if (entries.length === 0) {
    section.hidden = true;
    return;
  }

  // Same cardHtml() template as Browse — note/cta are the only
  // opt-in extras, everything else is identical to a regular card.
  container.innerHTML = entries
    .map((entry, i) => cardHtml(entry.org, i, { note: entry.note, cta: entry.cta }))
    .join('');
  watchReveals(container);

  // Clicking a featured card opens that org's booth, same as browse.
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.card');
    if (!btn) return;
    navigate({ org: btn.dataset.orgId });
  });
}
