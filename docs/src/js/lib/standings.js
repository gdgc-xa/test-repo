/* ============================================================
   lib/standings.js — what the results add up to, per sport.

   Pure functions over games already run through resolveGame()
   (components/game-card.js). Nothing here is typed by hand: change
   a score in data/xavier-cup.js and the table and the bracket
   follow (and the medal tally, once there is one).
   ============================================================ */

import { TEAM_BY_ID } from '../data/teams.js';

const DIVISION_ORDER = ['Men', 'Women', 'Mixed', 'Open'];

/**
 * categoryOf(g) — what a game counts towards within its sport:
 *   its division ('Men'; none = 'Open'), or with an event, the event
 *   and its division ('100m · Men'; 'ML' when the event has no
 *   division or an Open one).
 */
export function categoryOf(g) {
  const div = g.division && g.division !== 'Open' ? g.division : '';
  if (g.event) return div ? `${g.event} · ${div}` : g.event;
  return g.division || 'Open';
}

/**
 * categoriesFor(sport, games) — a sport's categories in page order:
 * the ones listed in SPORTS first, then any its games use that the
 * list leaves out (Men, Women, Mixed, Open first among those).
 */
export function categoriesFor(sport, games) {
  const listed = sport?.categories || [];
  const rank = (d) => { const i = DIVISION_ORDER.indexOf(d); return i < 0 ? DIVISION_ORDER.length : i; };
  const extra = [...new Set(games.map(categoryOf))]
    .filter(c => !listed.includes(c))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return [...listed, ...extra];
}

/**
 * outcome(g) — how a game ended, or null until it has.
 *   { winner: 'home' | 'away' | null, draw: boolean }
 * A `winner` in the data beats the score (penalties, shootouts,
 * walkovers). A finished game with no score and no winner is not
 * counted yet.
 */
export function outcome(g) {
  if (g.status !== 'finished') return null;
  if (g.winner === 'home' || g.winner === 'away') return { winner: g.winner, draw: false };
  const home = Number(g.score?.home);
  const away = Number(g.score?.away);
  if (g.score?.home === undefined || g.score?.away === undefined
      || !Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home === away) return { winner: null, draw: true };
  return { winner: home > away ? 'home' : 'away', draw: false };
}

/** The team id that won a decided two-team game, or null. */
export function winnerOf(g) {
  const o = outcome(g);
  if (!o?.winner || g.teamIds?.length !== 2) return null;
  return g.teamIds[o.winner === 'home' ? 0 : 1];
}

const isGroupGame = (g) => /^elimination$/i.test(g.round || '');

/**
 * standings(games) — the table from the Elimination games.
 * One row for every team drawn in one, whether it has played yet:
 *   { id, team, p, w, d, l, for, against, diff, rank }
 * Order: most wins, then fewest losses; score difference, score
 * for and then name only break ties (the table shows W and L).
 */
export function standings(games) {
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) rows.set(id, { id, team: TEAM_BY_ID[id], p: 0, w: 0, d: 0, l: 0, for: 0, against: 0 });
    return rows.get(id);
  };

  for (const g of games.filter(isGroupGame)) {
    if (g.teamIds?.length !== 2) continue;           // "All colleges" and the like
    const [home, away] = g.teamIds.map(row);
    const o = outcome(g);
    if (!o) continue;

    home.p += 1;
    away.p += 1;
    const h = Number(g.score?.home);
    const a = Number(g.score?.away);
    if (Number.isFinite(h) && Number.isFinite(a)) {
      home.for += h; home.against += a;
      away.for += a; away.against += h;
    }
    if (o.draw) { home.d += 1; away.d += 1; }
    else {
      const [win, lose] = o.winner === 'home' ? [home, away] : [away, home];
      win.w += 1;
      lose.l += 1;
    }
  }

  const table = [...rows.values()].map(r => ({ ...r, diff: r.for - r.against }));
  table.sort((x, y) => (y.w - x.w) || (x.l - y.l) || (y.diff - x.diff) || (y.for - x.for)
    || String(x.team?.name || x.id).localeCompare(String(y.team?.name || y.id)));
  table.forEach((r, i) => { r.rank = i + 1; });
  return table;
}

/**
 * knockouts(games) — the bracket after the group games:
 *   { semis: [g, g], final: g | null, bronze: g | null }
 * Semifinals in kickoff order.
 */
export function knockouts(games) {
  const round = (re) => games
    .filter(g => re.test(g.round || ''))
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  return {
    semis: round(/^semi/i),
    final: round(/^final$/i)[0] || null,
    bronze: round(/^bronze/i)[0] || null,
  };
}
