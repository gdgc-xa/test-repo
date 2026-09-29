/* ============================================================
   components/cup-calendar.js — the season as a month calendar.

   With a team picked it shows that team's games; without one it
   shows every game, so the calendar is useful before anyone has
   chosen. Each day with games is a button; the screen lists the
   chosen day's matches underneath.

   On a phone the day cells are too narrow for text, so the pills
   shrink to dots (see cup-calendar.css) and the list below does
   the reading.
   ============================================================ */

import { formatTime } from '../lib/dates.js';
import { dayKey } from './featured-match.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PILLS = 3;

function monthLabel(date) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return date.toDateString();
  }
}

/** The first of every month that has a game, in order. */
export function gameMonths(games) {
  const keys = [...new Set(games
    .filter(g => g.start)
    .map(g => `${g.start.getFullYear()}-${g.start.getMonth()}`))];
  return keys
    .map(k => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 1); })
    .sort((a, b) => a - b);
}

/**
 * calendarHtml({ games, month, selected, today, months })
 *   games     already filtered to what should show (a team's, or all)
 *   month     a Date inside the month to draw
 *   selected  day key of the chosen day
 *   today     day key of "now"
 *   months    gameMonths(), for the ‹ › buttons
 */
export function calendarHtml({ games, month, selected, today, months = [] }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const lead = first.getDay();

  const byDay = new Map();
  for (const g of games) {
    const k = dayKey(g.start);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(g);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.start - b.start);

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-cell is-outside" aria-hidden="true"></span>');

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, m, d);
    const key = dayKey(date);
    const list = byDay.get(key) || [];
    const cls = ['cal-cell'];
    if (key === today) cls.push('is-today');
    if (key === selected) cls.push('is-selected');
    if (list.length) cls.push('has-games');

    const pills = list.slice(0, MAX_PILLS).map(g => `
      <span class="cal-pill cal-pill--${g.status}">
        <span class="cal-pill__text">${escapeHtml(g.status === 'ongoing' ? `Live · ${g.sport}` : `${formatTime(g.start)} ${g.sport}`)}</span>
      </span>`).join('');
    const more = list.length > MAX_PILLS
      ? `<span class="cal-more">+${list.length - MAX_PILLS} more</span>` : '';

    const label = `${date.toDateString()}: ${list.length ? `${list.length} game${list.length === 1 ? '' : 's'}` : 'no games'}`;

    cells.push(list.length
      ? `<button class="${cls.join(' ')}" type="button" data-cal-day="${escapeAttr(key)}"
                 aria-pressed="${key === selected}" aria-label="${escapeAttr(label)}">
           <span class="cal-cell__num">${d}</span>
           <span class="cal-pills">${pills}${more}</span>
         </button>`
      : `<span class="${cls.join(' ')}" aria-label="${escapeAttr(label)}">
           <span class="cal-cell__num">${d}</span>
         </span>`);
  }
  while (cells.length % 7 !== 0) cells.push('<span class="cal-cell is-outside" aria-hidden="true"></span>');

  const idx = months.findIndex(x => x.getFullYear() === year && x.getMonth() === m);
  const prev = idx > 0 ? months[idx - 1] : null;
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;
  const step = (target, dir, label) => `
    <button class="cal-step" type="button" ${target ? `data-cal-month="${escapeAttr(dayKey(target))}"` : 'disabled'}
            aria-label="${label}">${dir}</button>`;

  return `
    <div class="cal-head">
      <h3 class="cal-title">${escapeHtml(monthLabel(first))}</h3>
      <div class="cal-nav">
        ${months.length > 1 ? step(prev, '‹', 'Previous month') : ''}
        <button class="btn btn--ghost btn--sm" type="button" data-cal-today>Today</button>
        ${months.length > 1 ? step(next, '›', 'Next month') : ''}
      </div>
    </div>
    <div class="cal-weekdays" aria-hidden="true">${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>`;
}
