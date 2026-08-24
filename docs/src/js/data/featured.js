/* ============================================================
   data/featured.js — Featured Organizations config.
   Pure data. No DOM. This is the ONLY file you need to touch
   to change what shows up in the "Featured Organizations" strip
   on the landing page.
   ------------------------------------------------------------

   TO ADD AN ORG:
     1. Find its `id` in data/organizations.js (the ORGS array —
        e.g. csg, aces, gdgoc-xa).
     2. Add a line to the FEATURED array below:
             { id: 'csg', note: 'Applications open' }
     3. Save. No HTML/CSS changes needed — the card, logo, tags,
        and description are all pulled from organizations.js
        automatically.

   TO REMOVE AN ORG:
     Delete its line (or comment it out with // ).

   TO REORDER:
     Featured orgs render left-to-right, top-to-bottom in the
     order they appear in this array — just move the lines.

   TO TEMPORARILY HIDE THE WHOLE STRIP:
     Set FEATURED_ENABLED to false at the bottom. The section
     disappears from the page entirely (no empty gap left behind).

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
     Keep this to roughly 4–8 orgs. The strip is designed to read
     as a single curated row, not a second browse grid — for a
     full roster, that's what /?screen=browse is for.
   ============================================================ */

export const FEATURED = [
  { id: 'csg',      note: 'Student government' },
  { id: 'gdgoc-xa',  note: 'Tech community' },
  { id: 'aces' },
  { id: 'cssc' },
  { id: 'jpiche', note: 'Recruiting now', cta: 'Join now →' },
  // Add more featured orgs above this line, e.g.:
  // { id: 'jpia', note: 'Recruiting now', cta: 'Join now →' },
];

/** Flip to false to hide the Featured Organizations section entirely. */
export const FEATURED_ENABLED = true;
