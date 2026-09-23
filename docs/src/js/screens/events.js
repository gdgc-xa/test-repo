/* ============================================================
   screens/events.js — the Events tab.

   Reads data/events.js, works out what is upcoming / happening /
   finished, orders everything by date, and paints two grids: the
   featured band and the full list.

   ORDER (the part that is automatic)
     Ongoing first, soonest-starting first.
     Then Upcoming, soonest first.
     Then Finished, most recent first — nobody scrolls to the
     bottom of a list to find what happened last week.

   Nothing in here needs editing to add an event. Everything it
   reads lives in data/events.js; the section switches are at the
   bottom of that file.
   ============================================================ */

import {
  EVENTS, EVENTS_ENABLED, SHOW_FEATURED, SHOW_PAST,
  SHOW_STATUS_FILTER, SHOW_SEARCH, EVENTS_COPY,
} from '../data/events.js';
import { byWhen } from '../lib/dates.js';
import { resolveEvent, eventCardHtml, eventMatches } from '../components/event-card.js';
import { eventDetailHtml } from '../components/event-detail.js';
import { openDetail, closeDetail } from '../components/detail-modal.js';
import { attachSearchShell, setSearchValue } from '../components/search-shell.js';
import { watchReveals } from '../reveal-observer.js';
import { navigate, currentQuery } from '../router.js';
import { escapeHtml } from '../lib/html.js';

const STATUS_ORDER = { ongoing: 0, upcoming: 1, finished: 2 };

const FILTERS = [
  { id: 'all',      label: 'All',      color: 'blue'   },
  { id: 'upcoming', label: 'Upcoming', color: 'green'  },
  { id: 'ongoing',  label: 'Ongoing',  color: 'red'    },
  { id: 'finished', label: 'Finished', color: 'yellow' },
];

const state = {
  status: 'all',
  query: '',
};

let rootEl = null;

/* ---------- Boot ---------- */

export function initEvents(root) {
  rootEl = root;

  const q = currentQuery();
  state.query = q.q || '';
  state.status = FILTERS.some(f => f.id === q.status) ? q.status : 'all';

  // --- Head copy from the data file ---
  setText(root, '[data-events-kicker]', EVENTS_COPY.kicker);
  setText(root, '[data-events-title]', EVENTS_COPY.title);
  setText(root, '[data-events-lede]', EVENTS_COPY.lede);
  setText(root, '[data-events-featured-kicker]', EVENTS_COPY.featuredKicker);
  setText(root, '[data-events-featured-title]', EVENTS_COPY.featuredTitle);

  // --- Search ---
  const shell = root.querySelector('[data-events-search]');
  const searchWrap = root.querySelector('[data-events-search-section]');
  if (searchWrap) searchWrap.hidden = !SHOW_SEARCH;
  if (shell && SHOW_SEARCH) {
    setSearchValue(shell, state.query);
    if (!shell.__wired) {
      shell.__wired = true;
      attachSearchShell(shell, (query) => {
        state.query = query;
        render();
      });
    }
  }

  // --- Status chips ---
  const chipRow = root.querySelector('[data-events-chips]');
  if (chipRow) {
    chipRow.hidden = !SHOW_STATUS_FILTER;
    if (!chipRow.__wired) {
      chipRow.__wired = true;
      chipRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        state.status = chip.dataset.statusId || 'all';
        render();
      });
    }
  }

  // --- Card clicks (both grids, delegated once) ---
  for (const sel of ['[data-events-featured-grid]', '[data-events-grid]']) {
    const grid = root.querySelector(sel);
    if (!grid || grid.__wiredCards) continue;
    grid.__wiredCards = true;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-event-id]');
      if (card) openEvent(card.dataset.eventId);
    });
  }

  const clearBtn = root.querySelector('[data-events-clear]');
  if (clearBtn && !clearBtn.__wired) {
    clearBtn.__wired = true;
    clearBtn.addEventListener('click', () => {
      state.status = 'all';
      state.query = '';
      if (shell) setSearchValue(shell, '');
      render();
    });
  }

  render();
}

/* ---------- Data ---------- */

/** Every event, resolved and ordered. Exported for the router. */
export function allEvents(now = new Date()) {
  if (!EVENTS_ENABLED) return [];
  return EVENTS
    .map(ev => resolveEvent(ev, now))
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return byWhen(a, b, a.status);
    });
}

export function findEvent(id) {
  return allEvents().find(e => e.id === id) || null;
}

/* ---------- Render ---------- */

function render() {
  const root = rootEl;
  if (!root) return;

  const events = allEvents();
  const visible = SHOW_PAST ? events : events.filter(e => e.status !== 'finished');

  const matching = visible
    .filter(e => state.status === 'all' || e.status === state.status)
    .filter(e => eventMatches(e, state.query));

  const isDefaultView = state.status === 'all' && !state.query;
  const useFeatured = SHOW_FEATURED && isDefaultView;

  const featured = useFeatured ? matching.filter(e => e.featured) : [];
  const featuredIds = new Set(featured.map(e => e.id));
  const rest = matching.filter(e => !featuredIds.has(e.id));

  // --- Chips ---
  const chipRow = root.querySelector('[data-events-chips]');
  if (chipRow && SHOW_STATUS_FILTER) {
    const counts = Object.fromEntries(
      FILTERS.map(f => [f.id, f.id === 'all' ? visible.length : visible.filter(e => e.status === f.id).length])
    );
    chipRow.innerHTML = FILTERS.map(f => `
      <button class="chip" type="button"
              data-status-id="${f.id}"
              aria-pressed="${state.status === f.id}"
              style="--chip-accent: var(--${f.color});">
        <span class="chip__dot" aria-hidden="true"></span>
        <svg class="chip__check" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="1,7 5,11 13,2"/>
        </svg>
        <span>${escapeHtml(f.label)}</span>
        <span class="chip__count">${counts[f.id]}</span>
      </button>`).join('');
  }

  // --- Count + clear ---
  const count = root.querySelector('[data-events-count]');
  if (count) {
    const n = matching.length;
    count.textContent = `${n} event${n === 1 ? '' : 's'}`;
  }
  const clear = root.querySelector('[data-events-clear]');
  if (clear) clear.classList.toggle('is-visible', state.status !== 'all' || !!state.query);

  // --- Featured band ---
  const fSection = root.querySelector('[data-events-featured-section]');
  const fGrid = root.querySelector('[data-events-featured-grid]');
  if (fSection && fGrid) {
    if (featured.length === 0) {
      fSection.hidden = true;
      fGrid.innerHTML = '';
    } else {
      fSection.hidden = false;
      fGrid.innerHTML = featured
        .map((e, i) => eventCardHtml(e, i, { variant: 'spotlight' }))
        .join('');
      watchReveals(fGrid);
    }
  }

  // --- Main grid ---
  const label = root.querySelector('[data-events-section-label]');
  if (label) {
    label.hidden = featured.length === 0 || rest.length === 0;
    label.textContent = EVENTS_COPY.allLabel;
  }

  const grid = root.querySelector('[data-events-grid]');
  if (grid) {
    if (matching.length === 0) {
      grid.innerHTML = emptyHtml();
    } else if (rest.length === 0) {
      grid.innerHTML = '';
    } else {
      grid.innerHTML = rest.map((e, i) => eventCardHtml(e, i)).join('');
    }
    watchReveals(grid);
  }

  syncUrl();
}

function emptyHtml() {
  const searching = state.query || state.status !== 'all';
  return `
    <div class="filter-note filter-note--empty" style="grid-column: 1 / -1;">
      <strong>${escapeHtml(searching ? 'Nothing matches that.' : EVENTS_COPY.emptyTitle)}</strong>&nbsp;${
        escapeHtml(searching
          ? 'Try another word, or clear the filters to see everything.'
          : EVENTS_COPY.emptyBody)
      }
    </div>`;
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (el && value !== undefined) el.textContent = value;
}

/* ---------- Navigation ---------- */

function openEvent(id) {
  const params = new URLSearchParams(location.search);
  params.set('screen', 'events');
  params.set('event', id);
  history.pushState(null, '', `?${params.toString()}`);
  renderEventDetail(id);
}

function syncUrl() {
  if (currentQuery().screen !== 'events') return;
  const q = new URLSearchParams();
  q.set('screen', 'events');
  if (state.status !== 'all') q.set('status', state.status);
  if (state.query) q.set('q', state.query);
  const open = new URLSearchParams(location.search).get('event');
  if (open) q.set('event', open);
  history.replaceState(null, '', `?${q.toString()}`);
}

/* ---------- Detail modal ----------
   Called by the router whenever ?event=… changes, so a deep link
   opens straight into the right event. */
export function renderEventDetail(eventId) {
  if (!eventId) return;

  const ev = findEvent(eventId);
  if (!ev) {
    console.warn(`[events] Unknown event id: ${eventId}`);
    closeDetail();
    return;
  }

  openDetail(eventDetailHtml(ev), {
    onClose: () => {
      const q = new URLSearchParams(location.search);
      q.delete('event');
      history.replaceState(null, '', `?${q.toString()}`);
    },
    wire: (panel) => {
      // "Open their booth" jumps to the org, closing this first.
      panel.querySelector('[data-open-org]')?.addEventListener('click', (e) => {
        const orgId = e.currentTarget.dataset.openOrg;
        closeDetail();
        navigate({ screen: 'browse', org: orgId });
      });
    },
  });
}
