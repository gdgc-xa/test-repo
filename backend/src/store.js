/* ============================================================
   store.js — every query the API runs, and the JSON it returns.

   The JSON matches the api.gs data link field for field, so the
   site can use either one. MySQL column → JSON key renames:
     sport_format → format        match_date / event_date → date
     event_name   → event         first/second/third_place → first/second/third
     events.last_updated → updated_at
   TIME values are trimmed from "08:00:00" to "08:00".
   Every value can be null: the sheet is filled in by students.

   All SQL is fixed text with ? placeholders. Visitor input only
   ever travels as a parameter.
   ============================================================ */

import { ping, readOnly } from './db.js';
import { manilaDate, manilaDateTime } from './time.js';

/* ---------- Row → JSON ---------- */

/** "08:00:00" → "08:00" */
export const hhmm = (time) => {
  if (time === null || time === undefined) return null;
  const m = /^(\d{2}):(\d{2})/.exec(String(time));
  return m ? `${m[1]}:${m[2]}` : null;
};

export function toMatch(r) {
  return {
    match_id: r.match_id,
    source: r.source,
    sport: r.sport,
    format: r.sport_format,
    category: r.category,
    round: r.round,
    team_a: r.team_a,
    team_a_care: r.team_a_care,
    team_a_score: r.team_a_score,
    team_b: r.team_b,
    team_b_care: r.team_b_care,
    team_b_score: r.team_b_score,
    venue: r.venue,
    date: r.match_date,
    sched_start: hhmm(r.sched_start),
    sched_end: hhmm(r.sched_end),
    status: r.status,
    winner: r.winner,
    actual_start: r.actual_start,
    expected_end: r.expected_end,
    actual_end: r.actual_end,
    last_updated: r.last_updated,
  };
}

export function toEvent(r, places = []) {
  return {
    event_id: r.event_id,
    sport: r.sport,
    event: r.event_name,
    category: r.category,
    round: r.round,
    venue: r.venue,
    date: r.event_date,
    sched_start: hhmm(r.sched_start),
    sched_end: hhmm(r.sched_end),
    status: r.status,
    first: r.first_place,
    second: r.second_place,
    third: r.third_place,
    started_at: r.started_at,
    ended_at: r.ended_at,
    updated_at: r.last_updated,
    expected_end: r.expected_end,
    places,
  };
}

/** The sync_status row, plus `stale` when the sync has gone quiet. */
export function toSync(row, staleSeconds) {
  const secs = row?.seconds_since_check;
  const seconds = secs === null || secs === undefined ? null : Number(secs);
  return {
    ...(row || {}),
    seconds_since_check: seconds,
    stale: seconds === null || seconds > staleSeconds,
  };
}

/* ---------- SQL ---------- */

const MATCH_COLUMNS = `
  m.match_id, m.source, m.sport, m.sport_format, m.category, m.round,
  m.team_a, m.team_a_care, m.team_a_score, m.team_b, m.team_b_care, m.team_b_score,
  m.venue, m.match_date, m.sched_start, m.sched_end, m.status, m.winner,
  m.actual_start, m.expected_end, m.actual_end, m.last_updated`;

const EVENT_COLUMNS = `
  e.event_id, e.sport, e.event_name, e.category, e.round, e.venue,
  e.event_date, e.sched_start, e.sched_end, e.status,
  e.first_place, e.second_place, e.third_place,
  e.started_at, e.ended_at, e.last_updated, e.expected_end`;

// NULL times sort last; the id breaks ties so the order never wobbles.
const MATCH_ORDER = 'ORDER BY m.match_date IS NULL, m.match_date, m.sched_start IS NULL, m.sched_start, m.match_id';
const EVENT_ORDER = 'ORDER BY e.event_date IS NULL, e.event_date, e.sched_start IS NULL, e.sched_start, e.event_id';

/**
 * The places of the events an event query picked, in the colleges'
 * own order (the Lists tab), unknown codes last. `eventWhere` is one
 * of the fixed WHERE clauses in this file, never visitor text; its
 * ? values are passed alongside, as with every other query.
 */
const placesSql = (eventWhere) => `
  SELECT p.event_id, p.college, p.place
  FROM event_places p
  LEFT JOIN colleges c ON c.code = p.college
  WHERE p.event_id IN (SELECT e.event_id FROM events e WHERE ${eventWhere})
  ORDER BY p.event_id, c.sort_order IS NULL, c.sort_order, p.college`;

/** Attach each event's places from a flat list of place rows. */
function withPlaces(eventRows, placeRows) {
  const byEvent = new Map();
  for (const p of placeRows) {
    if (!byEvent.has(p.event_id)) byEvent.set(p.event_id, []);
    byEvent.get(p.event_id).push({ college: p.college, place: p.place });
  }
  return eventRows.map(r => toEvent(r, byEvent.get(r.event_id) || []));
}

/** Matches and events by start time (no start last), then id. */
const byStart = (a, b) =>
  ((a.sched_start === null) - (b.sched_start === null))
  || String(a.sched_start).localeCompare(String(b.sched_start))
  || String(a.match_id ?? a.event_id).localeCompare(String(b.match_id ?? b.event_id));

/* ---------- The store ---------- */

/**
 * createStore(pool, { now, staleSeconds })
 *   now()  the current moment; tests pass a fixed clock.
 */
export function createStore(pool, { now = () => new Date(), staleSeconds = 180 } = {}) {
  const today = () => manilaDate(now());

  return {
    today,

    health: () => ping(pool),

    /** Everything, in the api.gs shape, plus `sync`. */
    snapshot: () => readOnly(pool, async (q) => {
      const colleges = await q('SELECT code FROM colleges ORDER BY sort_order, code');
      const sports = await q('SELECT name, code, format FROM sports ORDER BY sort_order, name');
      const venues = await q('SELECT name FROM venues ORDER BY sort_order, name');
      const matches = await q(`SELECT ${MATCH_COLUMNS} FROM matches m ${MATCH_ORDER}`);
      const events = await q(`SELECT ${EVENT_COLUMNS} FROM events e ${EVENT_ORDER}`);
      const places = await q(placesSql('TRUE'));
      const [sync] = await q('SELECT * FROM sync_status');

      return {
        generated_at: manilaDateTime(now()),
        colleges: colleges.map(r => r.code),
        sports: sports.map(r => ({ name: r.name, code: r.code, format: r.format })),
        venues: venues.map(r => r.name),
        matches: matches.map(toMatch),
        events: withPlaces(events, places),
        sync: toSync(sync, staleSeconds),
      };
    }),

    /**
     * One day's matches and events, by start time.
     * Filters (all optional, already validated):
     *   sport, venue   exact name
     *   college        a match's team_a or team_b; an event's places
     */
    schedule: ({ date, sport, college, venue }) => readOnly(pool, async (q) => {
      const m = ['m.match_date = ?'];
      const mp = [date];
      const e = ['e.event_date = ?'];
      const ep = [date];
      if (sport)   { m.push('m.sport = ?');   mp.push(sport);   e.push('e.sport = ?'); ep.push(sport); }
      if (venue)   { m.push('m.venue = ?');   mp.push(venue);   e.push('e.venue = ?'); ep.push(venue); }
      if (college) {
        m.push('(m.team_a = ? OR m.team_b = ?)');
        mp.push(college, college);
        e.push('EXISTS (SELECT 1 FROM event_places x WHERE x.event_id = e.event_id AND x.college = ?)');
        ep.push(college);
      }
      const eventWhere = e.join(' AND ');

      const matches = await q(`SELECT ${MATCH_COLUMNS} FROM matches m WHERE ${m.join(' AND ')} ${MATCH_ORDER}`, mp);
      const events = await q(`SELECT ${EVENT_COLUMNS} FROM events e WHERE ${eventWhere} ${EVENT_ORDER}`, ep);
      const places = await q(placesSql(eventWhere), ep);

      return {
        generated_at: manilaDateTime(now()),
        date,
        matches: matches.map(toMatch),
        events: withPlaces(events, places),
      };
    }),

    /**
     * For each venue: what is Ongoing there today, and the next
     * Upcoming item today (earliest scheduled start).
     * Items keep their match / event shape; tell them apart by
     * match_id or event_id.
     */
    venuesNow: () => readOnly(pool, async (q) => {
      const date = today();
      const venues = await q('SELECT name FROM venues ORDER BY sort_order, name');
      const where = "status IN ('Ongoing', 'Upcoming')";
      const matches = await q(`SELECT ${MATCH_COLUMNS} FROM matches m WHERE m.match_date = ? AND m.${where} ${MATCH_ORDER}`, [date]);
      const eventWhere = `e.event_date = ? AND e.${where}`;
      const events = await q(`SELECT ${EVENT_COLUMNS} FROM events e WHERE ${eventWhere} ${EVENT_ORDER}`, [date]);
      const places = await q(placesSql(eventWhere), [date]);

      const items = [...matches.map(toMatch), ...withPlaces(events, places)].sort(byStart);

      return {
        generated_at: manilaDateTime(now()),
        date,
        venues: venues.map(({ name }) => {
          const here = items.filter(i => i.venue === name);
          return {
            venue: name,
            ongoing: here.filter(i => i.status === 'Ongoing'),
            next: here.find(i => i.status === 'Upcoming') || null,
          };
        }),
      };
    }),

    /** The sync_status row, for "Updated X min ago" and monitoring. */
    status: () => readOnly(pool, async (q) => {
      const [sync] = await q('SELECT * FROM sync_status');
      return { generated_at: manilaDateTime(now()), sync: toSync(sync, staleSeconds) };
    }),

    /** Colleges, sports and venues only. */
    meta: () => readOnly(pool, async (q) => {
      const colleges = await q('SELECT code FROM colleges ORDER BY sort_order, code');
      const sports = await q('SELECT name, code, format FROM sports ORDER BY sort_order, name');
      const venues = await q('SELECT name FROM venues ORDER BY sort_order, name');
      return {
        colleges: colleges.map(r => r.code),
        sports: sports.map(r => ({ name: r.name, code: r.code, format: r.format })),
        venues: venues.map(r => r.name),
      };
    }),

    match: (id) => readOnly(pool, async (q) => {
      const [row] = await q(`SELECT ${MATCH_COLUMNS} FROM matches m WHERE m.match_id = ?`, [id]);
      return row ? toMatch(row) : null;
    }),

    event: (id) => readOnly(pool, async (q) => {
      const eventWhere = 'e.event_id = ?';
      const rows = await q(`SELECT ${EVENT_COLUMNS} FROM events e WHERE ${eventWhere}`, [id]);
      if (!rows.length) return null;
      const places = await q(placesSql(eventWhere), [id]);
      return withPlaces(rows, places)[0];
    }),
  };
}
