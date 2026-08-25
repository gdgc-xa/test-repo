/* ============================================================
   screens/browse.js — filter state + grid render.
   One cluster chip at a time + search + ghost cards.

   Single-select is not a preference: every org carries exactly one
   tag, so intersecting two chips could only ever return nothing.
   ============================================================ */

import { CATEGORIES, COLOR_OF, SHORT_LABEL } from '../data/categories.js';
import { ORGS } from '../data/organizations.js';
import { SHOW_FEATURED_IN_BROWSE } from '../data/featured.js';
import { resolveFeatured } from '../components/featured.js';
import { renderChipRow } from '../components/chip.js';
import { cardHtml, ghostCardHtml } from '../components/card.js';
import { attachSearchShell, setSearchValue } from '../components/search-shell.js';
import { navigate, currentQuery } from '../router.js';
import { watchReveals } from '../reveal-observer.js';
import { renderBooth } from './booth.js';

// ---------- Filter state (module-scope singleton) ----------
const state = {
  active: null,   // one category id, or null for "all"
  query: '',
};

/**
 * initBrowse(root) — wire chips, search, clear button. Called
 * on first mount + when navigation lands on ?screen=browse.
 * Reads ?filter=<id> and ?q=<text> from the URL for deep-links.
 */
export function initBrowse(root) {
  // --- Restore state from URL query ---
  const q = currentQuery();
  // Older links may carry ?filters=a,b — honour the first and drop the rest.
  state.active = (q.filters && q.filters[0]) || null;
  state.query = q.q || '';

  // --- Sync search input value ---
  const searchShell = root.querySelector('[data-browse-search]');
  if (searchShell) {
    setSearchValue(searchShell, state.query);
    attachSearchShell(searchShell, (query) => {
      state.query = query;
      render(root);
    });
  }

  // --- Chip row: attach click delegation once ---
  const chipRow = root.querySelector('[data-chip-row]');
  if (chipRow && !chipRow.__wired) {
    chipRow.__wired = true;
    chipRow.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const id = chip.dataset.categoryId;
      // Clicking the active chip clears it; anything else replaces it.
      state.active = (state.active === id) ? null : id;
      render(root);
    });
  }

  // --- Clear filters button ---
  const clearBtn = root.querySelector('[data-clear-filters]');
  if (clearBtn && !clearBtn.__wired) {
    clearBtn.__wired = true;
    clearBtn.addEventListener('click', () => {
      state.active = null;
      state.query = '';
      if (searchShell) setSearchValue(searchShell, '');
      render(root);
    });
  }

  render(root);
}

// ---------- Filter logic ----------

function byCluster(orgs, activeId) {
  if (!activeId) return orgs;
  return orgs.filter(org => org.tags.includes(activeId));
}

function search(orgs, query) {
  if (!query) return orgs;
  const q = query.toLowerCase();
  // Every field is optional: the roster gives some orgs only a name
  // and an e-mail, so guard each one rather than assuming a tagline.
  return orgs.filter(org => {
    const hay = [
      org.name,
      org.short,
      org.tagline,
      org.fbHandle,
      ...(org.emails || []),
      ...org.tags.map(t => SHORT_LABEL[t] || t),
      // Hand-written interest aliases — what a student actually types.
      // Never displayed; they exist so "coders" finds XCEL and "farm"
      // finds the agriculture orgs.
      ...(org.keywords || []),
    ];
    return hay.some(v => v && String(v).toLowerCase().includes(q));
  });
}

/**
 * Floats featured orgs (data/featured.js) to the front of the list,
 * in that file's order, followed by everyone else in their normal
 * order. Same list Discover reads — no separate roster to maintain.
 * Reordering only; nothing is added, removed, or badged.
 */
function withFeaturedFirst(orgs) {
  const featured = resolveFeatured().filter(org => orgs.includes(org));
  if (featured.length === 0) return orgs;
  const featuredIds = new Set(featured.map(o => o.id));
  const rest = orgs.filter(org => !featuredIds.has(org.id));
  return [...featured, ...rest];
}

// ---------- Render ----------

function render(root) {
  const chipRow = root.querySelector('[data-chip-row]');
  const grid    = root.querySelector('[data-card-grid]');
  const title   = root.querySelector('[data-browse-title]');
  const count   = root.querySelector('[data-browse-count]');
  const clear   = root.querySelector('[data-clear-filters]');
  const foot    = root.querySelector('[data-grid-footnote]');

  // Re-render chips (active state changes)
  if (chipRow) renderChipRow(chipRow, state.active);

  // Filter
  const isDefaultView = !state.active && !state.query;
  let filtered = search(byCluster(ORGS, state.active), state.query);
  if (isDefaultView && SHOW_FEATURED_IN_BROWSE) {
    filtered = withFeaturedFirst(filtered);
  }
  const total    = ORGS.length;
  const shownCount = filtered.length;
  const hiddenCount = total - shownCount;

  // Title
  if (title) {
    if (!state.active && !state.query) {
      title.textContent = 'All Xavier Ateneo orgs';
    } else if (state.active) {
      title.textContent = `${SHORT_LABEL[state.active]} orgs`;
    } else {
      title.textContent = `Results for “${state.query}”`;
    }
  }

  // Count
  if (count) count.textContent = `${shownCount} org${shownCount === 1 ? '' : 's'}`;

  // Clear button visibility
  if (clear) {
    clear.classList.toggle('is-visible', !!state.active || !!state.query);
  }

  // Grid
  if (grid) {
    if (shownCount === 0) {
      grid.innerHTML = `
        <div class="filter-note filter-note--empty" style="grid-column: 1 / -1;">
          <strong>Nothing matches that.</strong>&nbsp;Try a different cluster, or clear the filters and start again.
        </div>`;
    } else {
      const cards = filtered.map((org, i) => cardHtml(org, i)).join('');
      const ghosts = Array.from({ length: hiddenCount }, () => ghostCardHtml()).join('');
      grid.innerHTML = cards + ghosts;
    }
    watchReveals(grid);
    wireCardClicks(grid);
  }

  // Footnote
  if (foot) {
    if (hiddenCount > 0 && shownCount > 0) {
      foot.textContent = `Ghost cards indicate the ${hiddenCount} org${hiddenCount === 1 ? '' : 's'} filtered out. Clear the filter to see everything again.`;
      foot.hidden = false;
    } else {
      foot.hidden = true;
    }
  }

  // Sync URL (shallow — replaceState, don't push)
  syncUrl();
}

function wireCardClicks(grid) {
  if (grid.__wiredCards) return;
  grid.__wiredCards = true;
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card:not(.card--ghost)');
    if (!card) return;
    const id = card.dataset.orgId;
    // Push URL without triggering a browse re-init flash.
    const params = new URLSearchParams(location.search);
    params.set('org', id);
    if (!params.get('screen')) params.set('screen', 'browse');
    history.pushState(null, '', `?${params.toString()}`);
    renderBooth(id);
  });
}

function syncUrl() {
  const q = new URLSearchParams();
  q.set('screen', 'browse');
  if (state.active) q.set('filter', state.active);
  if (state.query) q.set('q', state.query);
  // Preserve org param if the modal happens to be open
  const org = new URLSearchParams(location.search).get('org');
  if (org) q.set('org', org);
  const url = `?${q.toString()}`;
  history.replaceState(null, '', url);
}
