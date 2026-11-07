/* ============================================================
   data/categories.js — the 11 clusters every org belongs to.
   The data lives in docs/database/clusters.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import clusters from '../../../database/clusters.json' with { type: 'json' };

export const CATEGORIES = clusters;

export const SHORT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.short]));
export const FULL_LABEL  = Object.fromEntries(CATEGORIES.map(c => [c.id, c.full]));
export const COLOR_OF    = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));
