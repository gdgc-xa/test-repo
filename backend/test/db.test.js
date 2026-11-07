/* ============================================================
   Database tests — against a real MySQL with the real schema and
   the sample payload loaded through sync_snapshot.
     CC_DB_DIR=/path/to/campus-compass-db npm run test:db
   (setup-test-db.js starts that MySQL first.)
   ============================================================ */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { createApp } from '../src/app.js';
import { createPool } from '../src/db.js';
import { createStore } from '../src/store.js';
import { TEST_DB } from './test-db.js';

const sample = JSON.parse(readFileSync(join(process.env.CC_DB_DIR || '', 'mysql', 'test', 'sample-payload.json'), 'utf8'));

const config = {
  allowedOrigins: ['https://gdgc-xa.github.io', 'http://localhost:*'],
  cacheSeconds: 0,            // every request reads the database
  rateLimitPerMinute: 10000,
  staleSeconds: 180,
  trustProxyHops: 1,
};
const quiet = { error() {}, log() {} };
const apiDb = { host: TEST_DB.host, port: TEST_DB.port, database: 'campus_compass', user: 'campus_api', password: TEST_DB.apiPassword };

/** "Now" as a Manila wall-clock time. */
const manila = (s) => new Date(`${s}+08:00`);

let pool;
let root;
const servers = [];

before(async () => {
  pool = createPool(apiDb);
  root = await mysql.createConnection({
    host: TEST_DB.host, port: TEST_DB.port, user: 'root', password: TEST_DB.rootPassword, database: 'campus_compass',
  });
});

after(async () => {
  await Promise.all(servers.map(s => new Promise(resolve => s.close(resolve))));
  await pool.end();
  await root.end();
});

/** An API on a random port, reading the test database with a fixed clock. */
async function api({ now = () => new Date(), db = pool } = {}) {
  const app = createApp({ store: createStore(db, { now, staleSeconds: 180 }), config, log: quiet });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path) => {
    const res = await fetch(base + path);
    return { status: res.status, body: await res.json() };
  };
}

/* ---------- The sample payload, cleaned the way MySQL cleans it ----------
   These mirror the cc_* converter functions in 01-schema.sql: blank text
   becomes null, scores must be whole numbers, impossible dates and
   times become null, times lose their seconds, date-times get them. */

const pad = (n) => String(n).padStart(2, '0');
const realDay = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const text = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());
const int = (v) => { const s = text(v); return s && /^-?\d+(\.0+)?$/.test(s) ? Number.parseInt(s, 10) : null; };
const date = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(v) || '');
  return m && realDay(+m[1], +m[2], +m[3]) ? m[0] : null;
};
const time = (v) => {
  const s = text(v) || '';
  const m = /(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s) || /(?<=[ T])(\d{1,2}):(\d{2})/.exec(s);
  return m && +m[1] < 24 && +m[2] < 60 ? `${pad(+m[1])}:${m[2]}` : null;
};
const datetime = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text(v) || '');
  if (!m || !realDay(+m[1], +m[2], +m[3]) || +m[4] > 23) return null;
  return `${m[1]}-${m[2]}-${m[3]} ${pad(+m[4])}:${m[5]}:${m[6] || '00'}`;
};

const expectedMatch = (m) => ({
  match_id: text(m.match_id), source: text(m.source), sport: text(m.sport), format: text(m.format),
  category: text(m.category), round: text(m.round),
  team_a: text(m.team_a), team_a_care: text(m.team_a_care), team_a_score: int(m.team_a_score),
  team_b: text(m.team_b), team_b_care: text(m.team_b_care), team_b_score: int(m.team_b_score),
  venue: text(m.venue), date: date(m.date), sched_start: time(m.sched_start), sched_end: time(m.sched_end),
  status: text(m.status), winner: text(m.winner),
  actual_start: datetime(m.actual_start), expected_end: datetime(m.expected_end),
  actual_end: datetime(m.actual_end), last_updated: datetime(m.last_updated),
});

const expectedEvent = (e) => ({
  event_id: text(e.event_id), sport: text(e.sport), event: text(e.event), category: text(e.category),
  round: text(e.round), venue: text(e.venue), date: date(e.date),
  sched_start: time(e.sched_start), sched_end: time(e.sched_end), status: text(e.status),
  first: text(e.first), second: text(e.second), third: text(e.third),
  started_at: datetime(e.started_at), ended_at: datetime(e.ended_at),
  updated_at: datetime(e.updated_at), expected_end: datetime(e.expected_end),
  places: (e.places || [])
    .filter(p => text(p.college) && text(p.place))
    .map(p => ({ college: text(p.college), place: text(p.place) })),
});

const byId = (key) => (a, b) => String(a[key]).localeCompare(String(b[key]));

/* ---------- /v1/snapshot ---------- */

test('snapshot matches sample-payload.json field for field', async () => {
  const get = await api({ now: () => manila('2026-10-12T09:10:00') });
  const { status, body } = await get('/v1/snapshot');
  assert.equal(status, 200);

  assert.deepEqual(Object.keys(body), ['generated_at', 'colleges', 'sports', 'venues', 'matches', 'events', 'sync']);
  assert.equal(body.generated_at, '2026-10-12 09:10:00');

  assert.deepEqual(body.colleges, sample.colleges.filter(c => text(c) && c.toUpperCase() !== 'TBD'));
  assert.deepEqual(body.sports, sample.sports.map(s => ({ name: text(s.name), code: text(s.code), format: text(s.format) })));
  assert.deepEqual(body.venues, sample.venues.map(text));

  // Same keys, in the same order as the data link sends them.
  assert.equal(body.matches.length, 12);
  assert.equal(body.events.length, 3);
  for (const m of body.matches) assert.deepEqual(Object.keys(m), Object.keys(sample.matches[0]));
  for (const e of body.events) assert.deepEqual(Object.keys(e), Object.keys(sample.events[0]));

  assert.deepEqual([...body.matches].sort(byId('match_id')), sample.matches.map(expectedMatch).sort(byId('match_id')));
  assert.deepEqual([...body.events].sort(byId('event_id')), sample.events.map(expectedEvent).sort(byId('event_id')));
});

test('snapshot: a clean match comes out exactly as the contract says', async () => {
  const get = await api();
  const { body } = await get('/v1/snapshot');
  assert.deepEqual(body.matches.find(m => m.match_id === 'FRIS-MX-001'), {
    match_id: 'FRIS-MX-001', source: 'Official', sport: 'Frisbee', format: 'Bracket',
    category: 'Mixed', round: 'Quarterfinal',
    team_a: 'CCS', team_a_care: 'Ana Cruz', team_a_score: 3,
    team_b: 'MED', team_b_care: null, team_b_score: 1,
    venue: 'Field (Pitch 1)', date: '2026-10-12', sched_start: '08:00', sched_end: '08:40',
    status: 'Finished', winner: 'CCS',
    actual_start: '2026-10-12 08:02:00', expected_end: '2026-10-12 08:45:00',
    actual_end: '2026-10-12 08:45:00', last_updated: '2026-10-12 08:46:10',
  });
});

test('snapshot: unreadable sheet values arrive as null, not as errors', async () => {
  const get = await api();
  const { body } = await get('/v1/snapshot');
  const bad = body.matches.find(m => m.match_id === 'FRIS-MX-002');
  assert.equal(bad.team_a_score, null);   // "abc"
  assert.equal(bad.date, null);           // "2026-13-40"
  assert.equal(bad.sched_start, null);    // "25:00"
  assert.equal(bad.team_b, 'TBD');
});

test('snapshot: places are in college order and blanks are left out', async () => {
  const get = await api();
  const { body } = await get('/v1/snapshot');
  const dash = body.events.find(e => e.event_id === 'ATH-M-020');
  assert.deepEqual(dash.places.map(p => `${p.college} ${p.place}`), [
    'CCS 1st', 'MED 4th', 'LAW 2nd', 'COLOSSUS 5th', 'NURSING DNF', 'CAS Did not join', 'SBM 6th', 'ENG 3rd',
  ]);
  assert.deepEqual(body.events.find(e => e.event_id === 'ATH-W-021').places, []);
});

test('snapshot: scores are numbers and times have no seconds', async () => {
  const get = await api();
  const { body } = await get('/v1/snapshot');
  for (const m of body.matches) {
    for (const s of [m.team_a_score, m.team_b_score]) assert.ok(s === null || typeof s === 'number');
    for (const t of [m.sched_start, m.sched_end]) assert.ok(t === null || /^\d{2}:\d{2}$/.test(t), t);
    for (const d of [m.actual_start, m.expected_end, m.actual_end, m.last_updated]) {
      assert.ok(d === null || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(d), d);
    }
  }
});

/* ---------- /v1/schedule ---------- */

const ids = (list, key) => list.map(i => i[key]);

test('schedule: one day, by start time', async () => {
  const get = await api();
  const { body } = await get('/v1/schedule?date=2026-10-12');
  assert.equal(body.date, '2026-10-12');
  assert.equal(body.matches.length, 11);       // FRIS-MX-002's date is unreadable
  assert.deepEqual(ids(body.matches, 'match_id').slice(0, 3), ['FRIS-MX-001', 'SOC-M-005', 'SOC-W-009']);
  assert.deepEqual(body.events, []);
  const starts = body.matches.map(m => m.sched_start);
  assert.deepEqual(starts, [...starts].sort());
});

test('schedule: filters by sport, college and venue', async () => {
  const get = await api();
  const soccer = (await get('/v1/schedule?date=2026-10-12&sport=Soccer')).body;
  assert.equal(soccer.matches.length, 8);

  const colossus = (await get('/v1/schedule?date=2026-10-12&college=COLOSSUS')).body;
  assert.deepEqual(ids(colossus.matches, 'match_id'), ['SOC-M-006', 'SOC-W-010']);

  const pitch = (await get('/v1/schedule?date=2026-10-12&venue=Field%20(Pitch%201)')).body;
  assert.deepEqual(ids(pitch.matches, 'match_id'), ['FRIS-MX-001', 'FRIS-MX-003', 'FRIS-MX-004']);

  // Events match a college through their places.
  const ath = (await get('/v1/schedule?date=2026-10-13&college=COLOSSUS')).body;
  assert.deepEqual(ids(ath.events, 'event_id'), ['ATH-M-020']);
  assert.equal(ath.events[0].places.length, 8);

  const none = (await get('/v1/schedule?date=2026-10-12&sport=Chess')).body;
  assert.deepEqual([none.matches, none.events], [[], []]);
});

test('schedule: defaults to today in Manila', async () => {
  const get = await api({ now: () => manila('2026-10-13T07:35:00') });
  const { body } = await get('/v1/schedule');
  assert.equal(body.date, '2026-10-13');
  assert.deepEqual(ids(body.events, 'event_id'), ['ATH-M-020', 'ATH-M-022', 'ATH-W-021']);
});

test('schedule: a bad date is a 400', async () => {
  const get = await api();
  const res = await get('/v1/schedule?date=2026-13-01');
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

/* ---------- /v1/venues/now ---------- */

const venue = (body, name) => body.venues.find(v => v.venue === name);

test('venues/now: the next Upcoming item today, per venue', async () => {
  const get = await api({ now: () => manila('2026-10-12T09:10:00') });
  const { body } = await get('/v1/venues/now');
  assert.equal(body.date, '2026-10-12');
  assert.deepEqual(body.venues.map(v => v.venue), sample.venues);
  assert.equal(venue(body, 'Field (Pitch 1)').next.match_id, 'FRIS-MX-003');
  assert.equal(venue(body, 'Soccer Field').next.match_id, 'SOC-M-005');
  assert.equal(venue(body, 'Track Oval').next, null);
  assert.deepEqual(venue(body, 'Soccer Field').ongoing, []);
});

test('venues/now: Ongoing items show, and "today" follows the clock', async () => {
  await root.query("UPDATE matches SET status = 'Ongoing' WHERE match_id = 'SOC-M-006'");
  try {
    const day1 = (await (await api({ now: () => manila('2026-10-12T09:10:00') }))('/v1/venues/now')).body;
    assert.deepEqual(ids(venue(day1, 'Soccer Field').ongoing, 'match_id'), ['SOC-M-006']);

    const day2 = (await (await api({ now: () => manila('2026-10-13T07:35:00') }))('/v1/venues/now')).body;
    assert.deepEqual(venue(day2, 'Soccer Field').ongoing, []);          // a different day
    assert.equal(venue(day2, 'Track Oval').next.event_id, 'ATH-M-022');
    assert.ok(Array.isArray(venue(day2, 'Track Oval').next.places));
  } finally {
    await root.query("UPDATE matches SET status = 'Upcoming' WHERE match_id = 'SOC-M-006'");
  }
});

/* ---------- /v1/status, /health ---------- */

test('status: fresh after a sync, stale after 3 quiet minutes', async () => {
  const fresh = (await (await api())('/v1/status')).body;
  assert.equal(typeof fresh.sync.seconds_since_check, 'number');
  assert.equal(fresh.sync.stale, false);
  assert.ok('last_checked_at' in fresh.sync && 'last_error' in fresh.sync);

  const [[saved]] = await root.query('SELECT last_checked_at FROM sync_state WHERE id = 1');
  await root.query('UPDATE sync_state SET last_checked_at = NOW() - INTERVAL 10 MINUTE WHERE id = 1');
  try {
    const old = (await (await api())('/v1/status')).body;
    assert.ok(old.sync.seconds_since_check >= 600);
    assert.equal(old.sync.stale, true);
    // The data is still served, flagged as stale.
    const snap = (await (await api())('/v1/snapshot')).body;
    assert.equal(snap.sync.stale, true);
    assert.equal(snap.matches.length, 12);
  } finally {
    await root.query('UPDATE sync_state SET last_checked_at = ? WHERE id = 1', [saved.last_checked_at]);
  }
});

test('health: ok against the real database', async () => {
  const res = await (await api())('/health');
  assert.deepEqual([res.status, res.body], [200, { ok: true }]);
});

test('the API user really is read-only', async () => {
  await assert.rejects(pool.query("UPDATE matches SET status = 'Finished'"), /UPDATE command denied/);
});

/* ---------- Extras ---------- */

test('one match, one event, and meta', async () => {
  const get = await api();
  assert.equal((await get('/v1/matches/SOC-M-005')).body.venue, 'Soccer Field');
  assert.equal((await get('/v1/events/ATH-M-020')).body.places.length, 8);
  assert.equal((await get('/v1/matches/NOPE-999')).status, 404);
  assert.deepEqual((await get('/v1/meta')).body.venues, sample.venues);
});

/* ---------- MySQL down ---------- */

test('MySQL unreachable: 503 JSON, and the API keeps running', async () => {
  const deadPool = createPool({ ...apiDb, port: 1 });
  try {
    const get = await api({ db: deadPool });
    for (const path of ['/health', '/v1/snapshot', '/v1/schedule', '/v1/venues/now', '/v1/status']) {
      const res = await get(path);
      assert.equal(res.status, 503, path);
    }
    // Still answering afterwards.
    assert.equal((await get('/v1/snapshot')).status, 503);
    assert.equal((await get('/v1/schedule?date=bad')).status, 400);
  } finally {
    await deadPool.end();
  }
});
