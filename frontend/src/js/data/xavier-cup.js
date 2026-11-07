/* ============================================================
   data/xavier-cup.js — loads the Xavier Cup data and works out
   what the tab needs from it. The data itself lives in
   database/ (xavier-cup, cup-venues, cup-sports, cup-games
   .json); how to edit it is in database/README.md.
   ============================================================ */

import { parseDate } from '../lib/dates.js';
import { sportIconFor } from './sport-icons.js';
import cup from '../../../database/xavier-cup.json' with { type: 'json' };
import venues from '../../../database/cup-venues.json' with { type: 'json' };
import sports from '../../../database/cup-sports.json' with { type: 'json' };
import games from '../../../database/cup-games.json' with { type: 'json' };

export const CUP_CONFIG = cup.config;
export const CUP_VENUE_PLAN = venues.plan;

/** Which version is showing: the address's ?venues=old|new, else the plan's setting. */
const askedVersion = (() => {
  try { return new URLSearchParams(globalThis.location?.search || '').get('venues'); } catch { return null; }
})();
export const PLAN_VERSION = askedVersion === 'old' || askedVersion === 'new' ? askedVersion : CUP_VENUE_PLAN.version;
export const planActive = PLAN_VERSION === 'new';

const BASE_VENUES = venues.campusVenues;   // the three campus venues
const PLAN_VENUES = venues.planVenues;     // the venues the plan adds (only while it is 'new')

/** The sports the plan puts at a venue: [{ sport, note?, tentative? }]. */
const plannedAt = id => CUP_VENUE_PLAN.sports.filter(p => p.venue === id)
  .map(({ sport, note, tentative }) => ({ sport, ...(note ? { note } : {}), ...(tentative ? { tentative } : {}) }));

/** A venue with the plan's name-tag and icon spots laid over its own. */
function withPlacement(v) {
  const p = CUP_VENUE_PLAN.placement?.[v.id];
  if (!p) return v;
  const icons = { ...(v.icons || {}) };
  for (const [sport, at] of Object.entries(p.icons || {})) icons[sport] = { ...(icons[sport] || {}), at };
  return { ...v, label: p.label || v.label, icons };
}

export const CUP_MAP = {
  ...venues.map,
  /* The venues in use. With the plan on ('new') that is every venue,
     each carrying its planned sports as `plan`; with it off ('old')
     just the three campus venues, as before. */
  venues: planActive
    ? [...BASE_VENUES, ...PLAN_VENUES].map(v => withPlacement({ ...v, plan: plannedAt(v.id) }))
    : BASE_VENUES,
};

/** Sports the plan has not given a venue yet (Lawn Tennis, Debate). */
export const UNPLACED_SPORTS = planActive ? CUP_VENUE_PLAN.sports.filter(p => !p.venue).map(p => p.sport) : [];

/** Two venue → sheet-name tables, joined. */
function mergeAliases(base, extra) {
  const out = Object.fromEntries(Object.entries(base).map(([id, names]) => [id, [...names]]));
  for (const [id, names] of Object.entries(extra)) out[id] = [...new Set([...(out[id] || []), ...names])];
  return out;
}

/* The tracker settings, with the plan's extra venue spellings joined in while it is on. */
export const CUP_LIVE = {
  ...cup.live,
  venues: mergeAliases(cup.live.venues, planActive ? CUP_VENUE_PLAN.sheetNames : {}),
};

/** Sample matches, used only while CUP_LIVE is off. lib/live-data.js empties and refills this same array. */
export const GAMES = games;
export const CUP_NEWS = cup.news;
export const CUP_EVENTS = cup.events;
export const CUP_PHOTOS = cup.photos;
export const SPORTS = sports.sports;
export const BRACKETS = sports.brackets;

/* ---------- Lookups ---------- */

export const VENUE_BY_ID = Object.fromEntries(CUP_MAP.venues.map(v => [v.id, v]));
export const SPORT_BY_NAME = Object.fromEntries(SPORTS.map(s => [s.name, s]));

/** Every sport the tracker lists (its Lists tab), in its order.
    Filled by lib/live-data.js, so a sport added to the sheet gets a
    tile and a page here before its first game. */
export const TRACKER_SPORTS = [];

/**
 * allSports() — every sport, A to Z: SPORTS, plus the tracker's other
 * sports and any sport GAMES plays that SPORTS leaves out (using
 * supplied artwork when available), so every sport has a page.
 */
export function allSports() {
  const extra = [...new Set([...TRACKER_SPORTS, ...sportsInPlay()])]
    .filter(name => !SPORT_BY_NAME[name])
    .map(name => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      name, icon: sportIconFor(name), photo: null, photos: [],
    }));
  return [...SPORTS, ...extra].sort((a, b) => a.name.localeCompare(b.name));
}

/** A sport from a link: its id ("football") or its name ("Football"). */
export function findSport(value) {
  const v = String(value || '');
  return allSports().find(s => s.id === v.toLowerCase() || s.name === v) || null;
}

/** Every distinct sport in GAMES, in the order they first appear. */
export function sportsInPlay() {
  const seen = [];
  for (const g of GAMES) {
    if (g.sport && !seen.includes(g.sport)) seen.push(g.sport);
  }
  return seen;
}

/**
 * cupNow() — the moment the Cup reads as "now".
 * The real clock, unless CUP_CONFIG.previewNow pins it for review.
 */
export function cupNow() {
  const pinned = CUP_CONFIG.previewNow ? parseDate(CUP_CONFIG.previewNow) : null;
  return pinned || new Date();
}

/** True while the preview clock is in charge. */
export function isPreviewClock() {
  return Boolean(CUP_CONFIG.previewNow && parseDate(CUP_CONFIG.previewNow));
}

/**
 * seasonState(now) — where the season stands.
 *   { phase: 'before', daysToGo, start, end }
 *   { phase: 'during', day, totalDays, start, end }
 *   { phase: 'after', start, end }
 */
export function seasonState(now = cupNow()) {
  const start = parseDate(CUP_CONFIG.season?.start);
  const end = parseDate(CUP_CONFIG.season?.end);
  if (!start || !end) return null;

  const DAY = 86400000;
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = midnight(now);
  const totalDays = Math.round((midnight(end) - midnight(start)) / DAY) + 1;

  if (today < start) {
    return { phase: 'before', daysToGo: Math.round((start - today) / DAY), start, end, totalDays };
  }
  if (today > end) return { phase: 'after', start, end, totalDays };
  return { phase: 'during', day: Math.round((today - start) / DAY) + 1, totalDays, start, end };
}
