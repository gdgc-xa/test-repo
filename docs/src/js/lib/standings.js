/* ============================================================
   lib/standings.js — what the results add up to, per sport.

   Pure functions over games already run through resolveGame()
   (components/game-card.js). Nothing here is typed by hand: change
   a score in data/xavier-cup.js and the table and the bracket
   follow (and the medal tally, once there is one).
   ============================================================ */

import { TEAM_BY_ID } from '../data/teams.js';
import { BRACKETS } from '../data/xavier-cup.js';

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

/** A category as one plain word, for matching: "Valorant · Mixed" → "valorantmixed". */
const plainKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const DIVISION_KEYS = DIVISION_ORDER.map(plainKey);

/** Two categories that are the same but for capitals, spaces or punctuation ("Tekken", "tekken"). */
export const sameCategory = (a, b) => plainKey(a) === plainKey(b);

/**
 * categoryIn(sport, g) — the category a game counts under on its
 * sport's page. The tracker often writes a listed category its own way,
 * so a game takes the SPORTS[].categories entry that means the same:
 *   1. the same words, whatever the capitals, spaces or punctuation
 *      ("valorant · mixed", "Dota-2" → "Dota 2");
 *   2. its event listed on its own: "Valorant" takes Valorant games
 *      in whatever division they come ("Valorant · Mixed");
 *   3. its division, for a sport listed by division only ("Mixed"
 *      takes a "Relay · Mixed" game).
 * Only a game none of these place keeps its own category, a new chip.
 * The game itself is not changed: its card still says what was sent.
 */
export function categoryIn(sport, g) {
  const own = categoryOf(g);
  const listed = sport?.categories || [];
  if (!listed.length) return own;
  const find = (word) => listed.find(c => plainKey(c) === plainKey(word));
  const byDivisionOnly = listed.every(c => DIVISION_KEYS.includes(plainKey(c)));
  return find(own)
    || (g.event && find(g.event))
    || (byDivisionOnly && g.event && g.division && find(g.division))
    || own;
}

/**
 * categoriesFor(sport, games) — a sport's categories in page order:
 * the ones listed in SPORTS first, then any its games use that the
 * list doesn't cover (categoryIn), Men, Women, Mixed, Open first among
 * those. Two that differ only in capitals or spacing are one.
 */
export function categoriesFor(sport, games) {
  const listed = sport?.categories || [];
  const rank = (d) => { const i = DIVISION_ORDER.indexOf(d); return i < 0 ? DIVISION_ORDER.length : i; };
  const seen = new Set(listed.map(plainKey));
  const extra = [];
  for (const c of games.map(g => categoryIn(sport, g))) {
    if (seen.has(plainKey(c))) continue;
    seen.add(plainKey(c));
    extra.push(c);
  }
  extra.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return [...listed, ...extra];
}

/**
 * categoryFromLink(categories, slug) — the category a link's ?div=
 * names ("valorant", "100m-men"). An older link to a category that is
 * now folded into a listed one still finds it: "valorant-mixed" opens
 * Valorant, "relay-mixed" opens Mixed. Null when nothing matches.
 */
export function categoryFromLink(categories, slug) {
  const s = String(slug || '').toLowerCase();
  if (!s) return null;
  const dash = (c) => String(c).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return categories.find(c => dash(c) === s)
    || categories.find(c => s.startsWith(`${dash(c)}-`))
    || categories.find(c => s.endsWith(`-${dash(c)}`))
    || null;
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

// The games before the knockouts, as the schedules and the tracker name
// them: 'Elimination', 'Group stage', 'Group A', 'Round 1'.
const isGroupGame = (g) => /^(elimination|group(\s+stage|\s+[a-z])?|round\s*\d+)$/i.test(g.round || '');

/**
 * standings(games) — the table from the group games (isGroupGame).
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
 * groupTables(games) — standings() once per group, for a sport whose
 * group games carry GAMES[].group; one table for everyone when none do.
 *   [{ group: 'A' | null, table }]
 */
export function groupTables(games) {
  const groups = [...new Set(games.filter(isGroupGame).map(g => g.group).filter(Boolean))].sort();
  if (!groups.length) return [{ group: null, table: standings(games) }];
  return groups.map(group => ({ group, table: standings(games.filter(g => g.group === group)) }));
}

/** The event a category is of: '3x3' in '3x3 · Men', 'CODM' for 'CODM'. */
const eventOf = (category) => String(category).split(' · ')[0];

/**
 * bracketFor(sport, category) — the tournament format a category
 * plays (data/xavier-cup.js → BRACKETS): the sport's own, or the one
 * for its event ('3x3' in '3x3 · Men', 'CODM'); the original 'round'
 * when the sport names none.
 */
export function bracketFor(sport, category = '') {
  const pick = sport?.bracket;
  const name = typeof pick === 'string' ? pick : (pick?.[eventOf(category)] || pick?.default);
  return BRACKETS[name] || BRACKETS.round;
}

/**
 * groupsFor(sport, category) — who the schedule draws in which group
 * for a category (SPORTS[].groups, by event like `bracket`):
 * { A: [team ids], B: [team ids] }, or null when it doesn't say.
 */
export function groupsFor(sport, category = '') {
  const pick = sport?.groups;
  return pick?.[eventOf(category)] || pick?.default || null;
}

/**
 * inGroups(games, groups) — the games, each group game with its group
 * letter when it has none (the tracker has no group column): the group
 * its round names ('Group A'), else the one groupsFor() draws both its
 * teams in. Games that already say, or can't be placed, are unchanged.
 */
export function inGroups(games, groups = null) {
  const drawnIn = (id) => (groups ? Object.keys(groups).find(k => groups[k].includes(id)) : null);
  return games.map(g => {
    if (g.group || !isGroupGame(g)) return g;
    const named = /^group\s+([a-z])$/i.exec(g.round || '')?.[1].toUpperCase();
    const [a, b] = (g.teamIds || []).map(drawnIn);
    const group = named || (g.teamIds?.length === 2 && a && a === b ? a : null);
    return group ? { ...g, group } : g;
  });
}

/**
 * knockouts(games, format) — the bracket after the group games, laid
 * out the way the format's schedule runs:
 *   { columns: [{ label, slots }], final, third, placings, drawn }
 * A slot is { game, seed }: the game once it is in GAMES (matched by
 * round, in kickoff order), and until then the schedule's wording
 * for it ('A1 vs B2'). `drawn` is true once any knockout game exists.
 * A double-elimination format (format.double) adds
 *   double: { upper, lower1, lowerFinal }   each a game or null
 * from rounds named as its schedule names them ('Upper finals',
 * 'Lower round 1', 'Lower finals'), or 'Upper bracket' / 'Lower
 * bracket' for all of them, in kickoff order; its last game is the
 * 'Grand finals'.
 */
export function knockouts(games, format = BRACKETS.round) {
  const byKickoff = (a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0);
  const inRound = (re) => games.filter(g => re.test(g.round || '')).sort(byKickoff);
  const slots = (found, seeds = []) => Array.from({ length: Math.max(seeds.length, found.length) },
    (_, i) => ({ game: found[i] || null, seed: seeds[i] || null }));

  let semis = inRound(/^semi/i);
  let double = null;
  if (format.double) {
    const named = (g) => /final/i.test(g.round);
    const upper = inRound(/^upper/i);
    const lower = inRound(/^lower/i);
    let upperRest = upper.filter(g => !named(g));
    // Every upper game called 'Upper bracket': the first two are the semifinals.
    if (!semis.length) { semis = upperRest.slice(0, 2); upperRest = upperRest.slice(2); }
    const lowerRest = lower.filter(g => !named(g));
    double = {
      upper: upper.find(named) || upperRest[0] || null,
      lower1: lowerRest[0] || null,
      lowerFinal: lower.find(named) || lowerRest[1] || null,
    };
  }

  const columns = [];
  if (format.quarters?.length) {
    columns.push({ label: 'Quarterfinals', slots: slots(inRound(/^quarter/i), format.quarters) });
  }
  columns.push({ label: 'Semifinals', slots: slots(semis, format.semis) });

  return {
    columns,
    final: slots(inRound(/^(grand\s*)?finals?$/i), [format.final])[0],
    // 'Bronze' is the older name for the same game.
    third: slots(inRound(/^(third|3rd|bronze)/i), format.third ? [format.third] : [])[0] || null,
    placings: (format.placings || []).map(p => ({
      label: p.round,
      slots: slots(games.filter(g => (g.round || '').toLowerCase() === p.round.toLowerCase()).sort(byKickoff), p.games),
    })),
    double,
    drawn: games.some(g => g.round && !isGroupGame(g)),
  };
}

/**
 * seedTeams(tables, games) — the bracket's seeds that the standings
 * now settle: { A1: team, B2: team } for a group, { '#1': team } for
 * one table. A group counts only once every one of its group games in
 * GAMES has a result and every team in it has played all the others
 * (the tracker adds games as they come, so the ones in GAMES may not
 * be all of them), so a seed never names a team too early.
 */
export function seedTeams(tables, games) {
  const seeds = {};
  for (const { group, table } of tables) {
    const own = games.filter(g => isGroupGame(g) && (!group || g.group === group) && g.teamIds?.length === 2);
    if (!own.length || !own.every(g => outcome(g)) || table.some(r => r.p < table.length - 1)) continue;
    table.forEach(r => { seeds[group ? `${group}${r.rank}` : `#${r.rank}`] = r.team || null; });
  }
  return seeds;
}

/**
 * bracketTree(ko, format) — for a two-group format, its draw as two
 * halves that meet in the final (format.tree), or null:
 *   { left: match, right: match }
 *   match    { game, entrants: [entrant, entrant] }
 *   entrant  { seed: 'A1' } or { match } for the winner of an
 *            earlier round (a quarterfinal)
 * Games come from knockouts(): semifinals and quarterfinals in the
 * order their schedule plays them.
 */
export function bracketTree(ko, format) {
  if (!format.tree) return null;
  const round = (label) => ko.columns.find(c => c.label === label)?.slots || [];
  const semis = round('Semifinals');
  const quarters = round('Quarterfinals');
  const entrant = (e) => (typeof e === 'string' ? { seed: e } : {
    match: {
      game: quarters[e.quarter]?.game || null,
      entrants: String(format.quarters?.[e.quarter] || '').split(' vs ').map(seed => ({ seed })),
    },
  });
  const half = (i) => ({ game: semis[i]?.game || null, entrants: format.tree[i].map(entrant) });
  return { left: half(0), right: half(1) };
}

/**
 * bracketRounds(ko, format) — the knockouts round by round, for the
 * phone bracket you slide through (one column per round):
 *   [{ label, matches: [match] }]
 *   match   { game, seeds: [a, b], from: [i | null, i | null],
 *             losers: true for the third-place game, label,
 *             src: [{ r, i, loser } | null, …] }
 * `from` points at the matches of the round before that send their
 * winner (their loser, with `losers`) into this match; `src`, where
 * given, points at any round's match instead, for one entrant (double
 * elimination: the upper final's loser drops to the lower final, its
 * winner waits two rounds for the grand final). A seed is shown while
 * no game says who plays.
 */
export function bracketRounds(ko, format) {
  const split = (seed) => (seed ? String(seed).split(' vs ') : [null, null]);
  const final = { game: ko.final.game, seeds: ['Finalist', 'Finalist'], from: [0, 1] };
  let rounds;
  const tree = bracketTree(ko, format);
  if (tree) {
    // Two groups: the quarterfinals (5x5) in the order they feed the
    // semifinals, so the lines never cross.
    const quarters = [];
    const semis = [tree.left, tree.right].map(half => ({
      game: half.game,
      seeds: half.entrants.map(e => e.seed || null),
      from: half.entrants.map(e => {
        if (!e.match) return null;
        quarters.push({ game: e.match.game, seeds: e.match.entrants.map(x => x.seed), from: [null, null] });
        return quarters.length - 1;
      }),
    }));
    rounds = [
      ...(quarters.length ? [{ label: 'Quarterfinals', matches: quarters }] : []),
      { label: 'Semifinals', matches: semis },
    ];
  } else {
    // One table: each round's games pair off into the next.
    rounds = ko.columns.map((c, ci) => ({
      label: c.label,
      matches: c.slots.map((s, i) => ({
        game: s.game, seeds: split(s.seed), from: ci === 0 ? [null, null] : [2 * i, 2 * i + 1],
      })),
    }));
  }
  if (ko.double) {
    // Double elimination after the semifinals (CODM): the winners meet
    // in the upper final while the losers play lower round 1; the upper
    // final's loser plays the lower final, its winner the grand final.
    const up = rounds.length;   // the round of the upper final
    const { upper, lower1, lowerFinal } = ko.double;
    return [
      ...rounds,
      { label: 'Upper & lower', matches: [
        { game: upper, seeds: ['Semifinal winner', 'Semifinal winner'], from: [0, 1], label: 'Upper final' },
        { game: lower1, seeds: ['Semifinal loser', 'Semifinal loser'], from: [0, 1], losers: true, label: 'Lower round 1' },
      ] },
      { label: 'Lower final', matches: [
        { game: lowerFinal, seeds: ['Upper final loser', 'Lower round 1 winner'], from: [null, 1], src: [{ r: up, i: 0, loser: true }, null] },
      ] },
      { label: 'Grand final', matches: [
        { game: ko.final.game, seeds: ['Upper final winner', 'Lower final winner'], from: [null, 0], src: [{ r: up, i: 0 }, null] },
      ] },
    ];
  }
  const last = { label: 'Final', matches: [final] };
  if (ko.third) {
    last.matches.push({ game: ko.third.game, seeds: ['Semifinal loser', 'Semifinal loser'], from: [0, 1], losers: true, label: 'Third place' });
  }
  return [...rounds, last];
}
