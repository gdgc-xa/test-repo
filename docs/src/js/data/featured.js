/* ============================================================
   data/featured.js — which orgs are featured on Discover and Browse.
   The data lives in docs/database/featured.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import data from '../../../database/featured.json' with { type: 'json' };

export const FEATURED = data.featured;
export const FEATURED_ENABLED = data.enabled;
export const SHOW_FEATURED_IN_BROWSE = data.showInBrowse;
