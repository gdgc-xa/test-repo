/* ============================================================
   data/featured.js — Featured Organizations config.
   Pure data. No DOM. This is the ONLY file you need to touch
   to change which orgs are "featured" — the strip on the
   Discover (landing) page AND the "Featured" section at the top
   of the Browse page both read this same list.
   ------------------------------------------------------------

   TO ADD AN ORG:
     1. Find its `id` in data/organizations.js (the ORGS array —
        e.g. csg, aces, gdgoc-xa).
     2. Add a line to the FEATURED array below:
             { id: 'csg', note: 'Applications open' }
     3. Save. No HTML/CSS changes needed — the card, logo, tags,
        and description are all pulled from organizations.js
        automatically. Featured cards use the exact same card
        template as every other org card (same size, layout,
        colors) — `note` and `cta` just add an optional corner
        badge and swap the button text on top of that template.

   TO REMOVE AN ORG:
     Delete its line (or comment it out with // ). It reappears
     in the main Browse list automatically — nothing else to undo.

   TO REORDER:
     Featured orgs render left-to-right, top-to-bottom in the
     order they appear in this array, on both Discover and Browse.

   TO TEMPORARILY HIDE THE DISCOVER STRIP:
     Set FEATURED_ENABLED to false below. The section disappears
     from the Discover page entirely (no empty gap left behind).

   TO TEMPORARILY STOP SHOWING THE BROWSE FEATURED SECTION:
     Set SHOW_FEATURED_IN_BROWSE to false below. Browse falls back
     to one plain list with nothing pulled out. This is independent
     of FEATURED_ENABLED above — turn either off without touching
     the other. Only affects Browse's default view (no chip
     selected, no search typed) — a chip or search always shows
     the plain filtered list, featured or not.

   FIELDS PER ENTRY:
     id       (required) Must match an id in ORGS exactly.
              A typo is never fatal — it's dropped with a
              console.warn so the rest of the strip still renders.
     note     (optional) Short "advertisement" badge shown on the
              card, e.g. 'Recruiting now', 'New this term',
              'Apply by Sept 5'. Leave it out for no badge.
     cta      (optional) Overrides the default "Know more →"
              button text, e.g. 'Join now →', 'Visit booth →'.

   GOOD PRACTICE:
     Keep this to roughly 4–8 orgs. The strip/section is designed
     to read as a single curated row, not a second browse grid —
     for a full roster, that's what the rest of Browse is for.
   ============================================================ */

export const FEATURED = [
  { id: 'gdgoc-xa', note: 'Recruiting now', cta: 'Join now →' },
  // Add more featured orgs above this line, e.g.:
  // { id: 'jpia', note: 'New this term' },
];

/** Flip to false to hide the Featured Organizations strip on Discover. */
export const FEATURED_ENABLED = true;

/**
 * Flip to false to fold featured orgs back into Browse's plain list
 * instead of pulling them into their own section up top. Only affects
 * Browse's default view (no chip selected, no search typed).
 */
export const SHOW_FEATURED_IN_BROWSE = true;
