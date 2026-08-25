/* ============================================================
   components/featured.js — resolves data/featured.js against the
   ORGS roster. No rendering here: every screen paints featured
   cards with the same cardHtml() template as regular org cards
   (card.js), passing along note/cta as the only optional extras.

   To change WHICH orgs are featured, or their note/cta text,
   edit data/featured.js — nothing in this file needs to change.
   ============================================================ */

import { ORGS } from '../data/organizations.js';
import { FEATURED } from '../data/featured.js';

const ORG_BY_ID = Object.fromEntries(ORGS.map(o => [o.id, o]));

/**
 * Resolves data/featured.js entries against the ORGS roster.
 * Unknown ids are dropped (with a console.warn) instead of
 * breaking whichever screen is reading the list.
 * @returns {{org: Org, note?: string, cta?: string}[]}
 *          in the order given by data/featured.js
 */
export function resolveFeatured() {
  const resolved = [];
  for (const entry of FEATURED) {
    const org = ORG_BY_ID[entry.id];
    if (!org) {
      console.warn(
        `[featured] data/featured.js references id "${entry.id}", ` +
        `which doesn't exist in data/organizations.js. Skipping it — ` +
        `check for a typo.`
      );
      continue;
    }
    resolved.push({ org, note: entry.note, cta: entry.cta });
  }
  return resolved;
}
