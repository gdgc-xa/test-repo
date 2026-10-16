/* ============================================================
   lib/live-data.js — the Xavier Cup's real matches and events.

   Reads the tracker's snapshot (CUP_LIVE in data/xavier-cup.js):
     1. the Campus Compass API          (primary)
     2. the api.gs data link            (fallback: same JSON shape)
   and turns it into GAMES, the list every Cup view already draws
   from. Then it fires a `cup:data` event on window so open views
   repaint at once instead of on their next minute tick.

   While live data is on, the sample fixtures in GAMES are never
   shown: GAMES starts empty and fills when the first answer lands.

   The snapshot's shape (one match / one event) is documented in
   api/README.md. Every field can be null — the sheet is filled in
   by students — so nothing here assumes a value is present.
   Students' names (team_a_care / team_b_care) are not used.
   ============================================================ */

import { CUP_LIVE, GAMES, SPORTS, TRACKER_SPORTS } from '../data/xavier-cup.js';
import { teamFor } from '../data/teams.js';

const live = {
  loaded: false,      // a snapshot has been applied at least once
  source: '',         // 'api' | 'fallback'
  updatedAt: null,    // Date the tracker last synced (or the fallback made its JSON)
  stale: false,       // the API says the sync has gone quiet
  failing: false,     // the last refresh got nothing from any source
};

let timer = null;
let lastTry = 0;

/** Start loading; call once, before the first render. */
export function startLiveData() {
  if (!CUP_LIVE.enabled) return;
  GAMES.length = 0;
  paintNote();
  refresh();

  // Only refresh while someone is looking; catch up when they return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    clearTimeout(timer);
    const wait = intervalMs() - (Date.now() - lastTry);
    if (wait <= 0) refresh();
    else timer = setTimeout(refresh, wait);
  });
  // "Updated 3 min ago" keeps counting between refreshes.
  setInterval(paintNote, 30000);
}

/* ---------- Fetching ---------- */

const onLocalhost = () => ['localhost', '127.0.0.1'].includes(location.hostname);

function sources() {
  const list = [];
  if (onLocalhost() && CUP_LIVE.devApi) list.push(['api', CUP_LIVE.devApi]);
  if (CUP_LIVE.api) list.push(['api', CUP_LIVE.api]);
  if (CUP_LIVE.fallback) list.push(['fallback', CUP_LIVE.fallback]);
  return list;
}

// The fallback runs on Google with usage limits: while the API is
// down, ask half as often.
const intervalMs = () => (CUP_LIVE.refreshSeconds || 45) * 1000 * (live.source === 'fallback' ? 2 : 1);

let busy = false;

async function refresh() {
  clearTimeout(timer);
  if (busy) return;
  busy = true;
  lastTry = Date.now();

  let applied = false;
  for (const [kind, url] of sources()) {
    try {
      const data = await getJson(url, (CUP_LIVE.timeoutSeconds || 5) * 1000);
      if (!Array.isArray(data?.matches) || !Array.isArray(data?.events)) throw new Error('not a snapshot');
      apply(data, kind);
      applied = true;
      break;
    } catch (err) {
      console.warn(`[live-data] ${kind} unavailable (${err.name === 'AbortError' ? 'timed out' : err.message})`);
    }
  }
  live.failing = !applied;
  busy = false;
  paintNote();

  if (!document.hidden) timer = setTimeout(refresh, intervalMs());
}

async function getJson(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // non-JSON throws here
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Snapshot → GAMES ---------- */

function apply(data, kind) {
  const games = [
    ...data.matches.map(fromMatch),
    ...data.events.map(fromEvent),
  ].filter(g => g.id);
  GAMES.splice(0, GAMES.length, ...games);

  // The sheet's sport list, so every sport has a tile before its first game.
  const sports = (Array.isArray(data.sports) ? data.sports : []).map(s => sportName(s?.name)).filter(Boolean);
  TRACKER_SPORTS.splice(0, TRACKER_SPORTS.length, ...sports);

  live.loaded = true;
  live.source = kind;
  live.stale = Boolean(data.sync?.stale);
  // The API says when the sync last ran (Manila time). The data link
  // reads the sheet itself (cached for at most 30 s), so its data is as
  // fresh as the moment it answered; its own generated_at is written in
  // the Apps Script project's time zone, which may not be Manila.
  live.updatedAt = kind === 'api' ? manilaTime(data.sync?.last_checked_at || data.generated_at) : new Date();

  const unplaced = [...new Set(games.filter(g => g.place && !g.venue).map(g => g.place))];
  if (unplaced.length) console.info(`[live-data] venues not on the map yet: ${unplaced.join(', ')}`);

  window.dispatchEvent(new CustomEvent('cup:data'));
}

const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
const key = (v) => text(v).toLowerCase();

// Lookup tables from CUP_LIVE, case- and space-insensitive.
const VENUE_ID = new Map(Object.entries(CUP_LIVE.venues || {})
  .flatMap(([id, names]) => names.map(n => [key(n), id])));
const TEAM_ID = new Map(Object.entries(CUP_LIVE.colleges || {}).map(([code, id]) => [key(code), id]));
const SPORT_NAME = new Map(SPORTS.map(s => [key(s.name), s.name]));

const teamId = (code) => TEAM_ID.get(key(code)) || text(code) || 'TBD';
const sportName = (name) => SPORT_NAME.get(key(name)) || text(name);
const venueId = (name) => VENUE_ID.get(key(name)) || null;

// "Men's" → "Men", the division names the Sports pages already use.
const DIVISION = { "men's": 'Men', "women's": 'Women', mixed: 'Mixed', men: 'Men', women: 'Women', open: 'Open' };
const division = (category) => DIVISION[key(category)] || text(category) || undefined;

// The sheet's status → the site's. A blank status leaves it to the
// clock, as the sample fixtures did. Postponed and Cancelled keep
// their own words on the card.
const STATUS = {
  upcoming:  { status: 'upcoming' },
  ongoing:   { status: 'ongoing' },
  finished:  { status: 'finished' },
  postponed: { status: 'upcoming', statusLabel: 'Postponed' },
  cancelled: { status: 'finished', statusLabel: 'Cancelled' },
  canceled:  { status: 'finished', statusLabel: 'Cancelled' },
};
const statusOf = (s) => STATUS[key(s)] || { status: 'auto' };

/** "2026-10-12" + "08:00" → "2026-10-12T08:00" (Manila wall time). */
function at(date, time) {
  if (!text(date)) return null;
  return text(time) ? `${text(date)}T${text(time)}` : text(date);
}

const score = (v) => (v === null || v === undefined || v === '' ? null : v);

function fromMatch(m) {
  const a = score(m.team_a_score);
  const b = score(m.team_b_score);
  const winner = text(m.winner);
  return {
    id: text(m.match_id),
    sport: sportName(m.sport) || 'Match',
    division: division(m.category),
    round: text(m.round) || undefined,
    teams: [teamId(m.team_a), teamId(m.team_b)],
    venue: venueId(m.venue),
    place: text(m.venue),
    start: at(m.date, m.sched_start),
    end: at(m.date, m.sched_end),
    ...statusOf(m.status),
    // Set only once both colleges agree; until then the score decides.
    winner: winner && winner === text(m.team_a) ? 'home'
          : winner && winner === text(m.team_b) ? 'away' : undefined,
    // Filled as soon as either college reports; "?" for the side still to.
    score: a === null && b === null ? undefined : { home: a ?? '?', away: b ?? '?' },
  };
}

function fromEvent(e) {
  const podium = [['1st', e.first], ['2nd', e.second], ['3rd', e.third]]
    .filter(([, code]) => text(code))
    .map(([place, code]) => `${place} ${teamFor(teamId(code)).short}`);
  return {
    id: text(e.event_id),
    sport: sportName(e.sport) || 'Event',
    // A placement event has no two sides: its name is the title, and its
    // round stays in the title so it is not drawn into a bracket.
    title: [text(e.event), text(e.round)].filter(Boolean).join(' · ') || sportName(e.sport),
    division: division(e.category),
    teams: [],
    venue: venueId(e.venue),
    place: text(e.venue),
    start: at(e.date, e.sched_start),
    end: at(e.date, e.sched_end),
    ...statusOf(e.status),
    // The top three so far: on the match card, and as the text of the
    // detail view and the other cards.
    podium: podium.join(' · ') || undefined,
    description: podium.join(' · ') || undefined,
  };
}

/** "2026-10-12 08:00:00" in Manila → a Date, wherever the visitor is. */
function manilaTime(value) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?/.exec(text(value));
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}${m[3] || ':00'}+08:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------- "Updated X min ago" ---------- */

function ago(date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}

function paintNote() {
  const el = document.querySelector('[data-cup-live]');
  if (!el) return;
  let note = '';
  if (!live.loaded) {
    note = live.failing ? 'Live results are unavailable right now. Trying again shortly.' : 'Loading live results…';
  } else if (live.failing) {
    note = `Couldn’t refresh. Showing results from ${live.updatedAt ? ago(live.updatedAt) : 'earlier'}.`;
  } else if (live.stale) {
    note = `Results may be behind — last synced ${live.updatedAt ? ago(live.updatedAt) : 'a while ago'}.`;
  } else if (live.updatedAt) {
    note = `Live results · updated ${ago(live.updatedAt)}`;
  }
  el.textContent = note;
  el.hidden = !note;
}
