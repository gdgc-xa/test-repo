/* ============================================================
   lib/venue-plan.js — what the venue plan (CUP_VENUE_PLAN in
   data/xavier-cup.js) means for the rest of the site. Pure
   functions. With the plan switched to 'old' they all do nothing,
   so every caller can use them without checking.
   ============================================================ */
import { CUP_VENUE_PLAN, planActive } from '../data/xavier-cup.js';

/** The venue id a sport is planned for, or null. */
export const plannedVenueFor = sport =>
  planActive ? CUP_VENUE_PLAN.sports.find(p => p.sport === sport && p.venue)?.venue || null : null;

/** The forced venue for a sport's tracker rows ({ venue, place, note }), or null. */
export const overrideFor = sport => (planActive ? CUP_VENUE_PLAN.overrides?.[sport] || null : null);

/** The sports planned at a venue, as { sport, note?, tentative? }. */
export const planAt = venue => (planActive ? venue?.plan || [] : []);

/** A planned sport as a line of text: "Taekwondo (to be confirmed)". */
export const planText = ({ sport, tentative, note }) =>
  `${sport}${tentative ? ' (to be confirmed)' : ''}${note ? ` — ${note}` : ''}`;

/**
 * applyVenuePlan(game) — a tracker match or event with the plan
 * applied: a sport with an override always lands at that venue; a row
 * with no venue written at all is filed under its sport's planned venue.
 * A venue the sheet did write, and the plan does not override, is left
 * exactly as the sheet has it.
 */
export function applyVenuePlan(game) {
  const forced = overrideFor(game.sport);
  if (forced) return { ...game, venue: forced.venue, place: forced.place || game.place, note: game.note || forced.note };
  if (!game.venue && !game.place) {
    const venue = plannedVenueFor(game.sport);
    if (venue) return { ...game, venue };
  }
  return game;
}
