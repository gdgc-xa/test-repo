/* ============================================================
   data/site.js — ONE switchboard for the whole site (tabs, copy, settings).
   The data lives in docs/database/site.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import site from '../../../database/site.json' with { type: 'json' };

export const SITE = site;

/** True when a tab id is switched on. Unknown ids are "off". */
export function tabEnabled(id) {
  return Boolean(SITE.tabs?.[id]?.enabled);
}

/** The season wording for the skin currently applied. */
export function seasonWords(skin) {
  return SITE.season[skin] || SITE.season.sands;
}
