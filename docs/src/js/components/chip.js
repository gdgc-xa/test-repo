/* ============================================================
   components/chip.js — filter chip template.
   One chip is active at a time: every org carries exactly one
   cluster tag, so two chips could never both match.

   These stay toggle buttons rather than radios — a radio group
   cannot be emptied, and clicking the active chip clears back to
   "all orgs". aria-pressed carries that state correctly.
   ============================================================ */

import { CATEGORIES, COLOR_OF, SHORT_LABEL } from '../data/categories.js';

/**
 * chipHtml(categoryId, isActive) — one chip button.
 */
export function chipHtml(categoryId, isActive = false) {
  const color = COLOR_OF[categoryId];
  return `
    <button class="chip"
            type="button"
            aria-pressed="${isActive}"
            data-category-id="${categoryId}"
            style="--chip-accent: var(--${color});">
      <span class="chip__dot" aria-hidden="true"></span>
      <svg class="chip__check" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="1,7 5,11 13,2"/>
      </svg>
      <span>${SHORT_LABEL[categoryId]}</span>
    </button>
  `;
}

/**
 * renderChipRow(container, activeId) — replace the container's
 * chip children with the current active-state markup.
 * `activeId` is one category id, or null for "all orgs".
 */
export function renderChipRow(container, activeId) {
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Filter by cluster');
  container.innerHTML = CATEGORIES
    .map(c => chipHtml(c.id, c.id === activeId))
    .join('');
}
