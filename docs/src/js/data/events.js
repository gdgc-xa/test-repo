/* ============================================================
   data/events.js — the Events tab. Pure data. No DOM.

   This is the ONLY file you edit to change what the Events tab
   shows. Add an object to EVENTS, save, reload. The tab sorts
   everything by date on its own, works out whether an event is
   upcoming / happening now / finished, and pulls the host org's
   name, logo and colour straight from data/organizations.js.

   ------------------------------------------------------------
   ADD AN EVENT
     {
       id:    'orientation-2026',        // unique, url-safe, required
       title: 'Freshie Orientation',     // required
       org:   'csg',                     // an id from organizations.js
       start: '2026-09-25T08:00',
       end:   '2026-09-25T12:00',
       location: 'Xavier Gym',
       description: 'One paragraph on what the event is.',
       link:  'https://facebook.com/events/…',
     }

   DATES
     '2026-09-25'            a whole day (no clock time shown)
     '2026-09-25T08:00'      8:00 AM in the reader's timezone
     '2026-09-25T08:00+08:00'  8:00 AM Manila, wherever they read it
     `end` is optional. Without it the event is treated as lasting
     DEFAULT_DURATION_MINS, then flips itself to "finished".

   WHO IS HOLDING IT
     org       an id from data/organizations.js — the card then
               shows that org's logo, short name and cluster colour,
               and the detail view links to its booth.
     host      free text, for anything not in the roster
               (e.g. 'Office of Student Affairs'). Use instead of
               `org`, or alongside it to name a co-host.
     Both may be omitted; the card just leaves the line out.

   OPTIONAL FIELDS
     featured  true  → pulled into the Featured band at the top
     note      short badge on the card ('Registration open')
     cta       overrides the card's button text
     linkLabel overrides the detail view's button text
     tag       a cluster id from data/categories.js, used ONLY for
               the card's accent colour when there is no `org`
     status    'auto' (default) | 'upcoming' | 'ongoing' | 'finished'
               A manual value wins over the clock — use it when
               something is postponed or called early.
     durationMins  how long it runs when there is no `end`
     tags      extra free-text labels shown as pills ('Free entry')

   REMOVE AN EVENT
     Delete the object, or comment it out. Nothing else to undo.

   TURN THE WHOLE TAB OFF
     data/site.js → tabs.events.enabled = false
   ============================================================ */

/* Example helper — see the note under EVENTS. Real entries should
   use plain date strings instead, e.g. start: '2026-09-25T08:00'. */
function inDays(days, hhmm = '09:00') {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hhmm}`;
}


/* Same idea, but anchored to the hour rather than the day, so the
   sample data always has something genuinely in progress to look at.
   Real entries do not need this either. */
function hoursFromNow(hours) {
  const d = new Date(Date.now() + hours * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
       + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============================================================
   THE LIST
   Order here does not matter — the tab sorts by date. Everything
   below is sample content: replace it, don't build on top of it.
   The dates are written with inDays() only so the demo always has
   something upcoming, ongoing and finished to look at.
   ============================================================ */
export const EVENTS = [
  {
    id: 'xavier-cup-opening',
    title: 'The Xavier Cup — Opening Ceremony',
    org: 'csg',
    host: 'Central Student Government',
    start: inDays(3, '15:00'),
    end: inDays(3, '18:00'),
    location: 'Xavier Ateneo Covered Court',
    description:
      'The parade of colleges, the lighting of the season torch, and the first whistle of the Xavier Cup. Every college marches; the opening exhibition match follows straight after.',
    link: 'https://www.facebook.com/XUCSG',
    linkLabel: 'See the programme →',
    featured: true,
    note: 'Example: Season opener',
    cta: 'Example: View event →',
    tags: ['Open to all', 'Free entry'],
  },
  {
    id: 'org-fair-2026',
    title: 'Campus Org Fair',
    org: 'gdgoc-xa',
    start: inDays(10, '08:00'),
    end: inDays(11, '17:00'),
    location: 'The Quadrangle',
    description:
      'Two days, every accredited organization, one quad. Walk the tents, talk to the officers, and sign up on the spot. Campus Compass has the full map of who is standing where.',
    link: '?screen=browse',
    linkLabel: 'Browse the orgs →',
    featured: true,
    note: 'Example: Two-day event',
    tags: ['All colleges'],
  },
  {
    id: 'devfest-mindanao',
    title: 'DevFest Workshop Series',
    org: 'gdgoc-xa',
    start: hoursFromNow(-1),          // demonstrates the "Ongoing" state
    end: hoursFromNow(3),
    location: 'SBM Auditorium',
    description:
      'A full afternoon of hands-on sessions on modern web, cloud and AI tooling, run by the student developer community. Bring a laptop; no prior experience assumed.',
    link: 'https://www.facebook.com/gdgcxavier',
    tags: ['Workshop', 'Bring a laptop'],
  },
  {
    id: 'kalinga-outreach',
    title: 'Kalinga Community Outreach',
    host: 'Office of Social Involvement',
    tag: 'service-learning',
    start: inDays(18),                 // a whole day, no clock time
    location: 'Barangay Lumbia',
    description:
      'A day of community immersion and relief packing with partner barangays. Volunteers meet at the Chapel car park before the convoy leaves.',
    link: null,
    tags: ['Volunteers needed'],
  },
  {
    id: 'acquaintance-party',
    title: 'Acquaintance Party',
    org: 'csg',
    start: inDays(-6, '18:00'),
    end: inDays(-6, '22:00'),
    location: 'Loyola Gym',
    description:
      'The first big night of the term — performances from each college, and the announcement of the Xavier Cup draw.',
    link: 'https://www.facebook.com/XUCSG',
  },
  // Add your events above this line.
];

/* ============================================================
   TAB CONFIGURATION — every section of the Events tab can be
   switched off on its own.
   ============================================================ */

/** Master switch for the content of the tab (the nav item itself
    is controlled by data/site.js → tabs.events.enabled). */
export const EVENTS_ENABLED = true;

/** The "Featured" band at the top, built from `featured: true`. */
export const SHOW_FEATURED = true;

/** Show finished events at the bottom of the list. False hides them
    entirely — useful right after a big season ends. */
export const SHOW_PAST = true;

/** The Upcoming / Ongoing / Finished filter chips above the grid. */
export const SHOW_STATUS_FILTER = true;

/** The search box on the Events tab. */
export const SHOW_SEARCH = true;

/** How long an event with no `end` is assumed to run, in minutes. */
export const DEFAULT_DURATION_MINS = 180;

/** Copy for the tab head. */
export const EVENTS_COPY = {
  kicker: 'What’s on',
  title: 'Campus Events',
  lede: 'Everything happening around Xavier Ateneo, newest first. Tap any event for the full details and where it is being held.',
  featuredKicker: 'Featured',
  featuredTitle: 'Don’t miss these',
  allLabel: 'All events',
  emptyTitle: 'Nothing scheduled yet.',
  emptyBody: 'Check back soon — events are added here as organizations confirm them.',
};
