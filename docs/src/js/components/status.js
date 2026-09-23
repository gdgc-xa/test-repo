/* ============================================================
   components/status.js — the Upcoming / Ongoing / Finished pill.
   One template, used by event cards, game cards and both detail
   views, so the three states always read the same way.

   Ongoing carries a live dot; it is the only state that is true
   only right now, and it should be findable at a glance.
   ============================================================ */

import { escapeHtml } from '../lib/html.js';

export const STATUS_LABEL = {
  upcoming: 'Upcoming',
  ongoing:  'Ongoing',
  finished: 'Finished',
};

/** Wording that fits a fixture better than a general event. */
export const GAME_STATUS_LABEL = {
  upcoming: 'Upcoming',
  ongoing:  'Live now',
  finished: 'Full time',
};

export function statusPillHtml(status, { labels = STATUS_LABEL, size = '' } = {}) {
  const id = STATUS_LABEL[status] ? status : 'upcoming';
  const cls = ['status-pill', `status-pill--${id}`, size ? `status-pill--${size}` : '']
    .filter(Boolean).join(' ');
  const dot = id === 'ongoing'
    ? '<span class="status-pill__dot" aria-hidden="true"></span>'
    : '';
  return `<span class="${cls}">${dot}${escapeHtml(labels[id] || STATUS_LABEL[id])}</span>`;
}
