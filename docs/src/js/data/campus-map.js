/* ============================================================
   data/campus-map.js — the campus drawing (buildings, paths, gates).
   The data lives in docs/database/campus-map.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import map from '../../../database/campus-map.json' with { type: 'json' };

export const CAMPUS_VIEW = map.view;
export const CAMPUS_DRAWING = map.drawing;
export const CAMPUS_OUTLINE = map.outline;
export const CAMPUS_ROAD = map.road;
export const CAMPUS_WALKWAYS = map.walkways;
export const CAMPUS_FOOTPRINTS = map.footprints;
export const CAMPUS_MARKINGS = map.markings;
export const CAMPUS_LANDMARKS = map.landmarks;
