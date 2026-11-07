/* ============================================================
   data/events.js — the Events tab: settings and the event list.
   The data lives in database/events.json; how to edit it
   is in database/README.md.
   ============================================================ */

import data from '../../../database/events.json' with { type: 'json' };

/* Example helper — see the note under EVENTS. Real entries should
   use plain date strings instead, e.g. start: '2026-09-25T08:00'. */
function inDays(days, hhmm = '09:00') {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hhmm}`;
}


/* Same idea, but anchored to the hour rather than the day, so the
   sample data always has something genuinely in progress to look at.
   Real entries do not need this either. */
function hoursFromNow(hours) {
  const d = new Date(Date.now() + hours * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
       + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Sample dates in events.json can be written relative to today:
   { "inDays": 3, "at": "15:00" } or { "hoursFromNow": -1 }.
   Real entries use plain strings ("2026-09-25T08:00"). */
const when = (v) =>
  v && typeof v === 'object'
    ? ('hoursFromNow' in v ? hoursFromNow(v.hoursFromNow) : inDays(v.inDays, v.at))
    : v;

export const EVENTS = data.events.map((e) => ({
  ...e,
  ...('start' in e ? { start: when(e.start) } : {}),
  ...('end' in e ? { end: when(e.end) } : {}),
}));

export const EVENTS_ENABLED = data.enabled;
export const SHOW_FEATURED = data.showFeatured;
export const SHOW_PAST = data.showPast;
export const SHOW_STATUS_FILTER = data.showStatusFilter;
export const SHOW_SEARCH = data.showSearch;
export const DEFAULT_DURATION_MINS = data.defaultDurationMins;
export const EVENTS_COPY = data.copy;
