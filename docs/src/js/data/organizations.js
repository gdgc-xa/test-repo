/* ============================================================
   data/organizations.js — the Xavier Ateneo org roster (75 orgs).
   The data lives in docs/database/organizations.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import orgs from '../../../database/organizations.json' with { type: 'json' };

export const ORGS = orgs;

/**
 * fetchOrgFromFacebook(handle) — INTEGRATION STUB
 * -----------------------------------------------
 * Replace with a real Graph API call. Return an object shaped
 * like an ORGS entry (description, meets) and the booth re-renders
 * with it; return null and nothing changes.
 *
 * NOTE: the booth no longer renders events, officers or follower
 * counts — those panels and the imitation Facebook chrome were
 * removed. Returning them here would be silently dropped.
 */
export async function fetchOrgFromFacebook(handle) {
  // TODO: wire up FB Graph API here
  return null;
}
