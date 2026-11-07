/* ============================================================
   data/venue.js — the org-fair tent map: who is in which tent.
   The data lives in docs/database/venue.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import data from '../../../database/venue.json' with { type: 'json' };

export const SHOW_FAIR_MAP = data.showFairMap;
export const VENUE = data.venue;
export const TENT_WHERE = data.tentWhere;
export const TENT_ORGS = data.tentOrgs;
const ZONED = data.zoned;   // orgs with no tent number, placed by their college colour block

/* org id -> placement. Built once, at module load. */
export const ORG_LOCATION = {};
for (const [tent, ids] of Object.entries(TENT_ORGS)) {
  for (const id of ids) {
    if (/^[a-z0-9-]+$/.test(id)) ORG_LOCATION[id] = { tent };
  }
}
for (const [zone, ids] of Object.entries(ZONED)) {
  for (const id of ids) ORG_LOCATION[id] = { zone };
}

/**
 * locationOf(orgId) → placement descriptor.
 *   { kind: 'tent', tent, zone, label, where, sharedWith[] }
 *   { kind: 'zone', zone, label, where, sharedWith: [] }
 *   { kind: 'none' }
 */
export function locationOf(orgId) {
  const loc = ORG_LOCATION[orgId];
  if (!loc) return { kind: 'none' };

  if (loc.tent) {
    const square = VENUE.squares.find(s => s.id === loc.tent);
    return {
      kind: 'tent',
      tent: loc.tent,
      zone: square ? square.zone : null,
      label: 'Tent ' + loc.tent,
      where: TENT_WHERE[loc.tent] || '',
      sharedWith: (TENT_ORGS[loc.tent] || []).filter(x => x !== orgId),
    };
  }

  const z = VENUE.zones[loc.zone] || {};
  return {
    kind: 'zone',
    zone: loc.zone,
    label: z.label || loc.zone,
    where: z.where || '',
    sharedWith: [],
  };
}
