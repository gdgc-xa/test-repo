/* ============================================================
   data/featured.js — Featured Organizations config.
   Pure data. No DOM. This is the ONLY file you need to touch
   to change which orgs are "featured" — both the strip on the
   Discover (landing) page and the front-of-grid placement on
   the Browse page read this same list.
   ------------------------------------------------------------

   TO ADD AN ORG:
     1. Find its `id` in data/organizations.js (the ORGS array —
        e.g. csg, aces, gdgoc-xa).
     2. Add a line to the FEATURED array below:
             { id: 'csg' }
     3. Save. No HTML/CSS changes needed — the card, logo, tags,
        and description are all pulled from organizations.js
        automatically. Featured cards render with the exact same
        template as every other org card — no badge, no special
        styling — so they look identical on Discover and Browse.

   TO REMOVE AN ORG:
     Delete its line (or comment it out with // ).

   TO REORDER:
     On Discover, featured orgs render left-to-right, top-to-
     bottom in the order they appear in this array. On Browse,
     this same order is used to decide which cards float to the
     front of the grid — just move the lines.

   TO TEMPORARILY HIDE THE DISCOVER STRIP:
     Set FEATURED_ENABLED to false below. The section disappears
     from the Discover page entirely (no empty gap left behind).

   TO TEMPORARILY STOP FEATURING ORGS ON BROWSE:
     Set SHOW_FEATURED_IN_BROWSE to false below. Browse falls
     back to its normal default order. This is independent of
     FEATURED_ENABLED above — you can turn either one off without
     touching the other.

   FIELDS PER ENTRY:
     id       (required) Must match an id in ORGS exactly.
              A typo is never fatal — it's dropped with a
              console.warn so the rest of the strip still renders.

   GOOD PRACTICE:
     Keep this to roughly 4–8 orgs. The strip is designed to read
     as a single curated row, not a second browse grid — for a
     full roster, that's what /?screen=browse is for.
   ============================================================ */

export const FEATURED = [
  { id: 'gdgoc-xa' },
  // Add more featured orgs above this line, e.g.:
  // { id: 'jpia' },
];

/** Flip to false to hide the Featured Organizations strip on Discover. */
export const FEATURED_ENABLED = true;

/**
 * Flip to false to stop floating featured orgs to the front of the
 * Browse grid. Only affects Browse's default view (no chip selected,
 * no search typed) — filtering and search results are never reordered.
 */
export const SHOW_FEATURED_IN_BROWSE = true;
