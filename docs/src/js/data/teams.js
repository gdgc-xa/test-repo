/* ============================================================
   data/teams.js — the eight Xavier Cup teams.
   The data lives in docs/database/teams.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import teams from '../../../database/teams.json' with { type: 'json' };

export const TEAMS = teams;

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));

/**
 * teamFor(value) — the team record for an id, or a bare stand-in
 * for anything else ("All colleges", a guest side), so a fixture
 * never fails to render because a side is not one of the eight.
 */
export function teamFor(value) {
  if (!value) return null;
  const hit = TEAM_BY_ID[value];
  if (hit) return hit;
  const name = String(value);
  return { id: null, name, short: name, mascot: '', college: '', logo: null };
}
