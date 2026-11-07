/* ============================================================
   lib/dates.js — one place for every date the site prints, and
   for the upcoming / ongoing / finished decision.

   Both the Events tab and the Xavier Cup tab sort and group by
   time, so the rules live here rather than in two screens that
   could drift apart.

   HOW DATES ARE WRITTEN IN THE DATA FILES
     "2026-09-25"              → a whole day, no clock time
     "2026-09-25T15:00"        → 3:00 PM in the READER's timezone
     "2026-09-25T15:00+08:00"  → 3:00 PM in Manila, for everyone

   The middle form is the convenient one and is what the sample
   data uses. If the audience could be in another timezone and the
   time must not shift, write the offset (the third form).
   ============================================================ */

import { SITE } from '../data/site.js';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DT  = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** True when the value carries a day but no clock time. */
export function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY.test(value.trim());
}

/**
 * parseDate(value) → Date | null
 * Bare strings are read as LOCAL time on purpose: "15:00" in the
 * data means three in the afternoon, not three UTC. `new Date()`
 * would have read the date-only form as UTC midnight and shown the
 * previous day west of Greenwich.
 */
export function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const s = String(value).trim();

  const d1 = DATE_ONLY.exec(s);
  if (d1) return new Date(+d1[1], +d1[2] - 1, +d1[3], 0, 0, 0, 0);

  const d2 = LOCAL_DT.exec(s);
  if (d2) return new Date(+d2[1], +d2[2] - 1, +d2[3], +d2[4], +d2[5], +(d2[6] || 0));

  const parsed = new Date(s);            // ISO with an offset, RFC strings…
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ---------- Formatting ---------- */

const loc = () => SITE.locale || undefined;

function fmt(date, opts) {
  try {
    return new Intl.DateTimeFormat(loc(), opts).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatDay(date, { withYear = true, weekday = true } = {}) {
  if (!date) return '';
  return fmt(date, {
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
  });
}

export function formatTime(date) {
  if (!date) return '';
  return fmt(date, { hour: 'numeric', minute: '2-digit', hour12: SITE.hour12 });
}

/** "Sep" / "25" / "2026" — the three lines of a calendar tile. */
export function tileParts(date) {
  if (!date) return { month: '—', day: '—', year: '' };
  return {
    month: fmt(date, { month: 'short' }).toUpperCase(),
    day:   fmt(date, { day: 'numeric' }),
    year:  fmt(date, { year: 'numeric' }),
  };
}

export function sameDay(a, b) {
  return !!a && !!b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * formatRange(startValue, endValue) — one human line for a span.
 *   all day, one day    → "Fri, 25 Sep 2026"
 *   timed, one day      → "Fri, 25 Sep 2026 · 8:00 AM – 12:00 PM"
 *   spanning days       → "Fri, 25 Sep · 8:00 AM → Sun, 27 Sep · 5:00 PM"
 */
export function formatRange(startValue, endValue) {
  const start = parseDate(startValue);
  if (!start) return 'Date to be announced';
  const end = parseDate(endValue);
  const allDay = isDateOnly(startValue) && (!endValue || isDateOnly(endValue));

  if (!end || sameDay(start, end)) {
    if (allDay) return formatDay(start);
    const head = `${formatDay(start)} · ${formatTime(start)}`;
    return end ? `${head} – ${formatTime(end)}` : head;
  }

  if (allDay) {
    return `${formatDay(start, { withYear: false })} → ${formatDay(end)}`;
  }
  return `${formatDay(start, { withYear: false })} · ${formatTime(start)}`
       + ` → ${formatDay(end, { withYear: false })} · ${formatTime(end)}`;
}

/**
 * relativeLabel(date, now) — the short "when" chip.
 * Deliberately coarse: nobody needs "in 3 hours 12 minutes".
 */
export function relativeLabel(date, now = new Date()) {
  if (!date) return '';
  const ms = date.getTime() - now.getTime();
  const past = ms < 0;
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  if (mins < 60) return past ? `${mins}m ago` : `in ${mins}m`;
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;
  if (days === 1) return past ? 'Yesterday' : 'Tomorrow';
  if (days < 7) return past ? `${days} days ago` : `in ${days} days`;
  const weeks = Math.round(days / 7);
  if (days < 31) return past ? `${weeks}w ago` : `in ${weeks}w`;
  const months = Math.round(days / 30);
  return past ? `${months}mo ago` : `in ${months}mo`;
}

/* ---------- Status ---------- */

export const STATUS = {
  upcoming: { id: 'upcoming', label: 'Upcoming' },
  ongoing:  { id: 'ongoing',  label: 'Ongoing'  },
  finished: { id: 'finished', label: 'Finished' },
};

/**
 * computeStatus(item, now, fallbackMinutes)
 *
 * `item.status` wins when it is set to something other than 'auto'
 * — a match can be called off, moved, or marked final early, and a
 * human override has to beat the clock.
 *
 * Otherwise: before start → upcoming, between start and end →
 * ongoing, after end → finished. An item with no end date is
 * treated as lasting `durationMins` (or the caller's fallback),
 * so a fixture with only a kickoff time still turns itself over.
 */
export function computeStatus(item, now = new Date(), fallbackMinutes = 120) {
  const manual = item?.status;
  if (manual && manual !== 'auto' && STATUS[manual]) return manual;

  const start = parseDate(item?.start);
  if (!start) return 'upcoming';

  let end = parseDate(item?.end);
  if (!end) {
    const mins = Number(item?.durationMins) || fallbackMinutes;
    end = new Date(start.getTime() + mins * 60000);
  }
  // A day-only entry runs to the end of that day, not to 00:00.
  if (isDateOnly(item?.end)) end = new Date(end.getTime() + 86399000);

  if (now < start) return 'upcoming';
  if (now <= end) return 'ongoing';
  return 'finished';
}

/**
 * Chronological comparator.
 * Upcoming and ongoing read soonest-first; finished reads
 * most-recent-first, because nobody scrolls to the bottom to find
 * what happened yesterday.
 */
export function byWhen(a, b, status) {
  const ta = parseDate(a.start)?.getTime() ?? Infinity;
  const tb = parseDate(b.start)?.getTime() ?? Infinity;
  return status === 'finished' ? tb - ta : ta - tb;
}
