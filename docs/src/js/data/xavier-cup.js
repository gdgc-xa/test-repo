/* ============================================================
   data/xavier-cup.js — everything the Xavier Cup tab renders.
   Pure data. No DOM.

   Four things live in here and each can be edited on its own:

     1. CUP_CONFIG  which sections of the tab appear at all
     2. CUP_MAP     the venues and what is played where on the 2D map
     3. CUP_LIVE    where the real matches come from (the tracker)
        GAMES       sample matches, used only while CUP_LIVE is off
     4. CUP_NEWS    the News & Updates column
     5. CUP_EVENTS  the Upcoming Events cards under the news
     6. CUP_PHOTOS  the photo slideshow in the banner
     7. SPORTS      one entry per sport: its page, icon and points

   The tab works out Upcoming / Ongoing / Finished from the clock,
   counts the games at each venue for the map, and powers the
   search box — none of that needs touching when you add a match.
   ============================================================ */

import { parseDate } from '../lib/dates.js';
import { sportIconFor } from './sport-icons.js';

/* ============================================================
   1. CONFIGURATION
   ============================================================ */
export const CUP_CONFIG = {
  /** Master switch for the tab's content. The nav item itself is
      controlled by data/site.js → tabs.cup.enabled. */
  enabled: true,

  name: 'The Xavier Cup',
  kicker: 'University-wide · 2026',
  tagline: 'One campus. Every college. One trophy.',
  lede: 'Every match of the season — where it is being played, when it starts, and how it finished. Follow your teams below and their games come first in Matches.',

  /** The season itself. Drives the countdown on Discover and the
      "Day 3 of 11" line once play has started. Plain dates. */
  season: {
    start: '2026-10-10',
    end: '2026-10-20',
    openingNote: 'Parade of colleges at the SBM steps, 2:30 PM',
  },

  /** PREVIEW CLOCK. While this is set, the Cup behaves as if it is
      this moment: statuses, the live strip, the featured match and
      the calendar all read it instead of the real clock. It exists
      so the tab can be reviewed with games live and finished before
      the season starts. Set it to null for launch. (Live data from
      CUP_LIVE needs the real clock, so it stays null while that is on.) */
  previewNow: null,

  /* --- Sections. Each one is independent. A view with nothing
         left in it loses its tab. --- */
  showHero: true,          // the banner, above every view
  showHeroPhotos: true,    // a photo slideshow inside the banner (CUP_PHOTOS)
  showTeams: true,         // the one "follow your teams" picker, above every view
  showFeatured: true,      // the featured match, first card of the chosen day
  showSchedule: true,      // Matches: the list, grouped by day
  showCalendar: true,      // Matches: the List / Calendar switch (off = list only)
  showSports: true,        // the Sports view: one page per sport (SPORTS)
  showMap: true,           // the Map view
  showNews: true,          // News & Updates from the Facebook page
  showLegend: true,        // the colour key under the map

  /* --- Filters on Matches (sports have their own pages on Sports) --- */
  showStatusFilter: true,  // All / Live / Upcoming / Results, on one line

  /** How long a match with no `end` is assumed to run, in minutes. */
  defaultDurationMins: 90,

  /** Which status Matches opens on:
      'all' | 'ongoing' (Live) | 'upcoming' | 'finished' (Results)  */
  defaultStatus: 'all',

  /** Show scores on finished game cards. */
  showScores: true,

  /** Cap on the match list; null = show everything. */
  maxGamesShown: null,
};

/* ============================================================
   2. THE MAP
   ------------------------------------------------------------
   The campus itself (every building, path and gate) is drawn in
   data/campus-map.js and rarely needs touching. What lives here
   is what changes with the season: which buildings are venues,
   where each sport's icon sits, and optional outside locations.

   To add a venue: add an entry below whose `id` (or `footprint`)
   is a building id from data/campus-map.js, then point games at
   it. The footprint lights up and becomes tappable on its own.

   Positions (`label`, `at`) are in the drawing's own units — the
   same numbers as data/campus-map.js, not pixels — so they never
   change when the map is resized or zoomed.
   ============================================================ */
export const CUP_MAP = {
  showOffCampus: true,
  // Outside venues belong in this SAME venues array. Example shape (not a real venue):
  // { id: 'confirmed-venue-id', name: 'Confirmed venue name', venueType: 'off-campus',
  //   address: 'Confirmed address', gps: [longitude, latitude], note: 'Access details' }
  // gps/address are optional; outside venues never need campus label/footprint/icons.
  // Games reference the stable id through GAMES[].venue. Do not infer venues from sports.

  /* --- VENUES --------------------------------------------------
     id         referenced by each game's `venue`
     footprint  the building in data/campus-map.js (defaults to id)
     name       full name, shown in the panel and the detail view
     short      the name tag on the map
     label      [x, y] where that name tag sits on the drawing
     gps        optional [longitude, latitude] for Google Maps
     indoor     true for roofed venues
     note       the walking-directions line
     icons      where each sport's icon sits at this venue:
                  at   [x, y] on the drawing
                  gps  optional [longitude, latitude];
                       without it the icon uses the venue's gps
                A sport only shows here once GAMES has a fixture
                for it at this venue. One with no spot listed is
                placed automatically above the name tag.
     ------------------------------------------------------------ */
  venues: [
    {
      id: 'soccer-field',
      name: 'XU Soccer Field',
      short: 'Soccer Field',
      label: [224, 240],
      gps: [124.6478329, 8.4761031],
      indoor: false,
      note: 'Behind Loyola House and Haggerty, across the walkway from the SBM Building.',
      icons: {
        Soccer:   { at: [203, 202] },
        Frisbee:  { at: [225, 218], gps: [124.64828633923103, 8.476343007092051] },
        Softball: { at: [260, 202], gps: [124.64746719564286, 8.475821935655013] },
      },
    },
    {
      id: 'covered-court',
      name: 'XU Covered Court',
      short: 'Covered Court',
      label: [241, 337],
      gps: [124.6478784, 8.4769404],
      indoor: true,
      note: 'Past the SBM Building, between the Physical Plant Office and Social Science.',
      icons: {
        Volleyball: { at: [241, 301] },
      },
    },
    {
      id: 'xu-gym',
      name: 'Xavier University Gym',
      short: 'University Gym',
      label: [481, 352],
      gps: [124.6465004, 8.4775435],
      indoor: true,
      note: 'Beside the SPED Lab and the Agriculture Building, on the Corrales Avenue side.',
      icons: {
        Basketball: { at: [481, 324] },
      },
    },
  ],

  /* Each sport's picture is its `icon` in SPORTS (section 7). A
     sport with no picture still shows — as a plain badge with its
     first letter. */

};

/* ============================================================
   3. LIVE DATA — the Intramurals Tracker
   ------------------------------------------------------------
   The real matches and events come from the tracker (Google Sheet
   → n8n → MySQL), read by lib/live-data.js every refreshSeconds:
     api        the Campus Compass API on the VPS (see api/README.md)
     devApi     tried first when the site runs on localhost, so a
                local API can be tested; skipped when it isn't running
     fallback   the api.gs data link (same JSON), used only when the
                API fails or takes longer than timeoutSeconds
   While enabled, GAMES below is ignored and "Updated X min ago"
   shows in the banner. Set enabled: false to go back to GAMES.
   ============================================================ */
export const CUP_LIVE = {
  enabled: true,
  api: 'https://campus-api.srv1804367.hstgr.cloud/v1/snapshot',
  devApi: 'http://localhost:3000/v1/snapshot',
  // The api.gs data link (Apps Script web app). It runs on Google with
  // usage limits, so the site only uses it when the API fails.
  fallback: 'https://script.google.com/macros/s/AKfycbxGzJP10p0qmt-5kHtzLJ_0IL0MxXPjzlh2jx7dCV3pMFQjh_y4UU2WXhl-rrbwupUg/exec',
  timeoutSeconds: 5,
  refreshSeconds: 45,

  /* Venue names as the sheet writes them (its Lists tab) → the map's
     venue ids in CUP_MAP.venues. Matching ignores capitals and extra
     spaces. A venue not listed here still shows on its matches, just
     not on the map. The sheet's names are still samples: confirm
     these with the database lead. */
  venues: {
    'soccer-field':  ['Soccer Field', 'XU Soccer Field', 'Field (Pitch 1)', 'Field (Pitch 2)', 'Softball Field'],
    'covered-court': ['Covered Court', 'XU Covered Court'],
    'xu-gym':        ['University Gym', 'Xavier University Gym', 'Gym'],
  },

  /* College codes in the sheet → team ids in data/teams.js.
     PRIMUS was COLOSSUS until Oct 15; both point to the same team. */
  colleges: {
    CCS: 'ccs',
    NURSING: 'nsg',
    SBM: 'sbm',
    ENG: 'eng',
    CAS: 'cas',
    LAW: 'law',
    MED: 'med',
    PRIMUS: 'agsoe',
    COLOSSUS: 'agsoe',
  },
};

/* ============================================================
   3b. THE SAMPLE FIXTURES (only while CUP_LIVE.enabled is false)
   ------------------------------------------------------------
   id        unique, url-safe (used in the ?game=… link)
   sport     free text — the sport chips are built from these, and
             the same spelling finds it in SPORTS (its page, its icon)
   division  optional ('Men', 'Women', 'Mixed', 'Open')
   round     optional ('Elimination', 'Semifinal', 'Final', 'Bronze').
             Finished Elimination games make the standings on the
             Sports tab; the others make its bracket.
   teams     [home, away] as ids from data/teams.js ('ccs', 'eng').
             Anything that is not a team id prints as written, so
             ['All colleges'] works for a solo or all-in event.
   venue     an id from CUP_MAP.venues
   start     kickoff. See lib/dates.js for the accepted forms.
   end       optional; without it the match runs defaultDurationMins
   status    'auto' (default) | 'upcoming' | 'ongoing' | 'finished'
             A manual value beats the clock — use it for a
             postponement or a walkover.
   winner    optional 'home' | 'away' — who won when the score does
             not say (penalties, a shootout, a walkover)
   score     { home: 0, away: 0 } — shown once a match has started,
             so update it during play for a live score
   description  a short paragraph for the detail view
   link      optional external link (livestream, bracket, recap)
   note      short badge on the card ('Championship')
   featured  true → the day's featured match when nothing is live
             or still to start that day
   ------------------------------------------------------------
   Everything below is sample content for the Oct 10–20 season.
   Replace it wholesale once the official schedule is out.
   ============================================================ */
export const GAMES = [
  /* ---- Day 1 · Sat, Oct 10 ---- */
  { id: 'd1-bb-m-ccs-eng', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['ccs', 'eng'], venue: 'xu-gym', start: '2026-10-10T09:00', end: '2026-10-10T10:30',
    score: { home: 64, away: 71 },
    description: 'Opening game of the men’s bracket. The Warriors pulled away in the fourth quarter.' },
  { id: 'd1-vb-w-nsg-med', sport: 'Volleyball', division: 'Women', round: 'Elimination',
    teams: ['nsg', 'med'], venue: 'covered-court', start: '2026-10-10T10:30', end: '2026-10-10T12:00',
    score: { home: 3, away: 1 },
    description: 'Women’s volleyball elimination, taken in four sets.' },
  { id: 'd1-sc-sbm-cas', sport: 'Soccer', division: 'Open', round: 'Elimination',
    teams: ['sbm', 'cas'], venue: 'soccer-field', start: '2026-10-10T16:30', end: '2026-10-10T18:00',
    score: { home: 2, away: 2 },
    description: 'First soccer fixture after the opening parade. A late equaliser split the points.' },

  /* ---- Day 2 · Sun, Oct 11 ---- */
  { id: 'd2-fr-mx-law-agsoe', sport: 'Frisbee', division: 'Mixed', round: 'Elimination',
    teams: ['law', 'agsoe'], venue: 'soccer-field', start: '2026-10-11T09:00', end: '2026-10-11T10:30',
    score: { home: 13, away: 11 },
    description: 'Mixed ultimate, first to 13.' },
  { id: 'd2-sb-w-ccs-sbm', sport: 'Softball', division: 'Women', round: 'Elimination',
    teams: ['ccs', 'sbm'], venue: 'soccer-field', start: '2026-10-11T13:00', end: '2026-10-11T15:00',
    score: { home: 7, away: 4 },
    description: 'Opening game of the softball bracket, seven innings.' },
  { id: 'd2-bb-w-cas-nsg', sport: 'Basketball', division: 'Women', round: 'Elimination',
    teams: ['cas', 'nsg'], venue: 'xu-gym', start: '2026-10-11T16:00', end: '2026-10-11T17:30',
    score: { home: 48, away: 52 },
    description: 'Women’s basketball elimination. The Pythons closed it out at the line.' },

  /* ---- Day 3 · Mon, Oct 12 ---- */
  { id: 'd3-vb-m-eng-agsoe', sport: 'Volleyball', division: 'Men', round: 'Elimination',
    teams: ['eng', 'agsoe'], venue: 'covered-court', start: '2026-10-12T09:30', end: '2026-10-12T11:00',
    score: { home: 3, away: 1 },
    description: 'Men’s volleyball elimination. The Warriors’ block held all morning.' },
  { id: 'd3-fr-mx-sbm-med', sport: 'Frisbee', division: 'Mixed', round: 'Elimination',
    teams: ['sbm', 'med'], venue: 'soccer-field', start: '2026-10-12T11:00', end: '2026-10-12T12:30',
    score: { home: 9, away: 13 },
    description: 'Mixed ultimate, first to 13.' },
  { id: 'd3-bb-m-law-cas', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['law', 'cas'], venue: 'xu-gym', start: '2026-10-12T14:30', end: '2026-10-12T16:00',
    score: { home: 41, away: 38 },
    description: 'Men’s basketball elimination. Winner stays in the race for a semifinal slot.' },
  { id: 'd3-sc-nsg-ccs', sport: 'Soccer', division: 'Open', round: 'Elimination',
    teams: ['nsg', 'ccs'], venue: 'soccer-field', start: '2026-10-12T15:00', end: '2026-10-12T16:30',
    score: { home: 1, away: 0 },
    description: 'Soccer elimination. A draw sends both sides into the play-off on the final weekend.' },
  { id: 'd3-vb-w-eng-med', sport: 'Volleyball', division: 'Women', round: 'Elimination',
    teams: ['eng', 'med'], venue: 'covered-court', start: '2026-10-12T15:30', end: '2026-10-12T17:00',
    score: { home: 1, away: 0 },
    description: 'Women’s volleyball elimination, best of five sets.' },
  { id: 'd3-sb-w-sbm-law', sport: 'Softball', division: 'Women', round: 'Elimination',
    teams: ['sbm', 'law'], venue: 'soccer-field', start: '2026-10-12T17:00', end: '2026-10-12T18:30',
    description: 'Softball elimination under the lights, once the soccer is done.' },

  /* ---- Day 4 · Tue, Oct 13 ---- */
  { id: 'd4-fr-mx-nsg-cas', sport: 'Frisbee', division: 'Mixed', round: 'Elimination',
    teams: ['nsg', 'cas'], venue: 'soccer-field', start: '2026-10-13T15:00', end: '2026-10-13T16:30',
    description: 'Mixed ultimate, first to 13.' },
  { id: 'd4-bb-w-ccs-med', sport: 'Basketball', division: 'Women', round: 'Elimination',
    teams: ['ccs', 'med'], venue: 'xu-gym', start: '2026-10-13T16:00', end: '2026-10-13T17:30',
    description: 'Women’s basketball elimination.' },

  /* ---- Day 5 · Wed, Oct 14 ---- */
  { id: 'd5-vb-m-ccs-sbm', sport: 'Volleyball', division: 'Men', round: 'Elimination',
    teams: ['ccs', 'sbm'], venue: 'covered-court', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Men’s volleyball elimination.' },
  { id: 'd5-sc-eng-law', sport: 'Soccer', division: 'Open', round: 'Elimination',
    teams: ['eng', 'law'], venue: 'soccer-field', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Last round of soccer eliminations.' },

  /* ---- Day 6 · Thu, Oct 15 ---- */
  { id: 'd6-sb-w-nsg-agsoe', sport: 'Softball', division: 'Women', round: 'Elimination',
    teams: ['nsg', 'agsoe'], venue: 'soccer-field', start: '2026-10-15T13:00', end: '2026-10-15T15:00',
    description: 'Softball elimination, seven innings.' },
  { id: 'd6-bb-m-sbm-agsoe', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['sbm', 'agsoe'], venue: 'xu-gym', start: '2026-10-15T17:00', end: '2026-10-15T18:30',
    description: 'Men’s basketball elimination.' },

  /* ---- Day 7 · Fri, Oct 16 ---- */
  { id: 'd7-sb-w-semi', sport: 'Softball', division: 'Women', round: 'Semifinal',
    teams: ['ccs', 'nsg'], venue: 'soccer-field', start: '2026-10-16T14:00', end: '2026-10-16T16:00',
    description: 'Softball semifinal.' },

  /* ---- Day 8 · Sat, Oct 17 ---- */
  { id: 'd8-vb-w-semi-1', sport: 'Volleyball', division: 'Women', round: 'Semifinal',
    teams: ['nsg', 'law'], venue: 'covered-court', start: '2026-10-17T14:00', end: '2026-10-17T16:00',
    description: 'First women’s volleyball semifinal.' },
  { id: 'd8-bb-m-semi-1', sport: 'Basketball', division: 'Men', round: 'Semifinal',
    teams: ['eng', 'cas'], venue: 'xu-gym', start: '2026-10-17T16:00', end: '2026-10-17T17:30',
    description: 'First men’s basketball semifinal.' },

  /* ---- Day 9 · Sun, Oct 18 ---- */
  { id: 'd9-fr-mx-final', sport: 'Frisbee', division: 'Mixed', round: 'Final',
    teams: ['med', 'agsoe'], venue: 'soccer-field', start: '2026-10-18T10:00', end: '2026-10-18T11:30',
    note: 'Championship',
    description: 'Mixed ultimate final, first to 15.' },
  { id: 'd9-sc-semi', sport: 'Soccer', division: 'Open', round: 'Semifinal',
    teams: ['sbm', 'nsg'], venue: 'soccer-field', start: '2026-10-18T15:00', end: '2026-10-18T16:30',
    description: 'Soccer semifinal. Extra time and penalties if level.' },

  /* ---- Day 10 · Mon, Oct 19 ---- */
  { id: 'd10-sb-w-final', sport: 'Softball', division: 'Women', round: 'Final',
    teams: ['ccs', 'sbm'], venue: 'soccer-field', start: '2026-10-19T13:00', end: '2026-10-19T15:00',
    note: 'Championship',
    description: 'Softball final.' },
  { id: 'd10-vb-m-final', sport: 'Volleyball', division: 'Men', round: 'Final',
    teams: ['eng', 'ccs'], venue: 'covered-court', start: '2026-10-19T16:00', end: '2026-10-19T18:00',
    note: 'Championship',
    description: 'Men’s volleyball final.' },

  /* ---- Day 11 · Tue, Oct 20 ---- */
  { id: 'd11-sc-final', sport: 'Soccer', division: 'Open', round: 'Final',
    teams: ['sbm', 'cas'], venue: 'soccer-field', start: '2026-10-20T14:00', end: '2026-10-20T15:30',
    note: 'Championship',
    description: 'Soccer final.' },
  { id: 'd11-bb-m-final', sport: 'Basketball', division: 'Men', round: 'Final',
    teams: ['eng', 'sbm'], venue: 'xu-gym', start: '2026-10-20T16:00', end: '2026-10-20T18:00',
    note: 'Championship', featured: true,
    description: 'The men’s basketball final closes the season. The trophy is presented on court straight after.' },

  // Add fixtures above this line.
];

/* ============================================================
   4. NEWS & UPDATES
   ------------------------------------------------------------
   The newest posts from the main TXC Compass Facebook page,
   including departmental posts the page has reshared. Each
   reshared post carries its department's name as `tag`.

   They arrive through `feed`: the news Worker (worker/, see
   worker/README.md) reads the page through the Graph API every 15
   minutes with a token kept as a Cloudflare secret, and serves the
   latest posts as JSON. The browser only ever reads that address, so
   no token ships with the site. A bare file name instead of an https
   address is read from the data/ folder.

   If the feed is empty or unreachable, the hand-written `posts`
   below show instead. They are placeholders: keep them current or
   empty them.

   If you want Facebook's own page widget as well, set
   embed.enabled = true. It needs no token, but it will not render
   at all for readers who block third-party frames.
   ============================================================ */
export const CUP_NEWS = {
  enabled: true,
  title: 'News & Updates',
  kicker: 'From the TXC Compass page',
  pageName: 'TXC Compass',
  // TODO: set these to the TXC Compass Page's real address and handle.
  pageUrl: 'https://www.facebook.com/XUCSG',
  pageHandle: 'XUCSG',
  followLabel: 'Open the Facebook page',

  /** The Worker's posts.json address (https://…) or a file in this data folder.
      null = use the hand-written posts only. */
  feed: 'https://txc-compass-news.gdsc-0c0.workers.dev/posts.json',

  /** How many posts to show. The first one is featured. */
  maxPosts: 15,

  /** Facebook's own page plugin. Off by default — see the note above. */
  embed: {
    enabled: false,
    height: 500,
    showTimeline: true,
  },

  /** Fallback posts, newest first. `date` accepts the same forms
      as a game's start. `sport` (optional, as named in SPORTS)
      puts a post on that sport's page too; a post from the feed
      can do the same with a hashtag such as #Basketball. */
  posts: [
    {
      id: 'post-bracket',
      date: '2026-10-11T19:40',
      sport: 'Basketball',
      tag: 'Bracket',
      title: 'Semifinal pairings are out',
      body: 'Both basketball semifinals are set after tonight’s results. Full bracket on the page; the finals schedule follows tomorrow morning.',
      link: null,
    },
    {
      id: 'post-venue',
      date: '2026-10-10T12:05',
      tag: 'Venue',
      title: 'Badminton moved to the Engineering Court',
      body: 'All mixed doubles fixtures move from the Loyola Gym to the Engineering Court for the rest of the week. Times are unchanged.',
      link: null,
    },
    {
      id: 'post-opening',
      date: '2026-10-08T08:30',
      tag: 'Announcement',
      title: 'Parade of colleges call time',
      body: 'Contingents assemble at the SBM steps by 2:30 PM on opening day. Bring your college colours — marshals will be at the quad entrances.',
      link: null,
    },
  ],
};

/* ============================================================
   5. UPCOMING EVENTS
   ------------------------------------------------------------
   The cards at the bottom of News & Updates (from the TXC
   proposal). Cards show in this order.

   team         an id from data/teams.js; the card prints that
                team's name and crest
   photo        a file in assets/events/ (keep it under ~200 KB,
                roughly 900px wide). null = the team crest on navy
   title / description   the card text
   ============================================================ */
export const CUP_EVENTS = {
  enabled: true,
  title: 'Upcoming Events',
  items: [
    {
      id: 'wizards-most-wanted',
      team: 'ccs',
      title: 'Wizard’s Most Wanted',
      photo: null,
      description: 'CCS organization GDGC’s Chief Technology Officer claims that the moon landing was fake.',
    },
    {
      id: 'pythons-vs-warriors',
      team: 'nsg',
      title: 'Pythons VS Warriors',
      photo: 'assets/events/pythons.jpg',
      description: 'NSG started the kick off and are completely on par with the undefeated ENG’G Warriors.',
    },
    {
      id: 'warriors-iron-wall',
      team: 'eng',
      title: 'Warriors Building an Iron Wall',
      photo: 'assets/events/warriors.jpg',
      description: 'ENG’G’s volleyball iron wall has been impenetrable so far! How will they do against the fierce Wolves..',
    },
    {
      id: 'eagles-at-the-top',
      team: 'sbm',
      title: 'Eagles at the Top',
      photo: 'assets/events/eagles.jpg',
      description: 'SBM reigns victorious as the Champions of TXC 2025!',
    },
  ],
};

/* ============================================================
   6. BANNER PHOTOS
   ------------------------------------------------------------
   The slideshow in the banner at the top of the tab, behind its
   title. Slides show in this order, one every `secondsPerSlide`;
   CUP_CONFIG.showHeroPhotos switches it off.

   src      a photo in assets/cup/photos/ — landscape, about
            1600×900, kept under ~300 KB. null = a placeholder
            graphic in the same frame.
   alt      what the photo shows, for screen readers
   caption  the short label on the slide (optional)

   PLACEHOLDERS: swap in real TXC photos before launch.
   ============================================================ */
export const CUP_PHOTOS = {
  secondsPerSlide: 6,
  slides: [
    { src: null, caption: 'Parade of colleges', alt: 'The colleges marching in the opening parade at the SBM steps' },
    { src: null, caption: 'Basketball · University Gym', alt: 'A basketball game at the Xavier University Gym' },
    { src: null, caption: 'Volleyball · Covered Court', alt: 'A volleyball rally at the XU Covered Court' },
    { src: null, caption: 'Soccer · XU Soccer Field', alt: 'A soccer match at the XU Soccer Field' },
    { src: null, caption: 'The crowd', alt: 'Students cheering for their college' },
  ],
};

/* ============================================================
   7. SPORTS
   ------------------------------------------------------------
   One entry per sport, in the order they show on the Sports tab.
   A game names its sport by `name`, spelled exactly the same;
   `id` is what goes in the link (?tab=sports&sport=soccer).

   id         url-safe, lower case
   name       as written in GAMES[].sport
   icon       the sport's picture: its tile, its match cards, its
              marker on the map
   photo      a wide photo for the top of the sport's page
              (assets/sports/photos/…). null = a placeholder graphic
   photos     more photos, shown as a strip on the sport's page
              ([{ src, alt }]; leave empty for none)

   The standings (wins and losses from the finished Elimination
   games) work themselves out from GAMES. A sport in GAMES that is
   missing here still gets a page, using supplied artwork where available.
   ============================================================ */
export const SPORTS = [
  { id: 'basketball', name: 'Basketball', icon: 'assets/sports/basketball.webp', photo: null, photos: [] },
  { id: 'volleyball', name: 'Volleyball', icon: 'assets/sports/volleyball.webp', photo: null, photos: [] },
  { id: 'soccer',     name: 'Soccer',     icon: 'assets/sports/soccer.webp',     photo: null, photos: [] },
  { id: 'frisbee',    name: 'Frisbee',    icon: 'assets/sports/frisbee.webp',    photo: null, photos: [] },
  { id: 'softball',   name: 'Softball',   icon: 'assets/sports/softball.webp',   photo: null, photos: [] },
  // Placement events (100m Dash, relays...), from the tracker's Events tab.
  // Keep the Sports-tab artwork unset; map markers can use shared icon assets.
  { id: 'athletics', name: 'Athletics', icon: null, photo: null, photos: [] },
];

/* ---------- Lookups ---------- */

export const VENUE_BY_ID = Object.fromEntries(CUP_MAP.venues.map(v => [v.id, v]));
export const SPORT_BY_NAME = Object.fromEntries(SPORTS.map(s => [s.name, s]));

/** Every sport the tracker lists (its Lists tab), in its order.
    Filled by lib/live-data.js, so a sport added to the sheet gets a
    tile and a page here before its first game. */
export const TRACKER_SPORTS = [];

/**
 * allSports() — SPORTS in order, then the tracker's other sports and
 * any sport GAMES plays that SPORTS leaves out. Supplied artwork is used
 * where available, so every sport has a page.
 */
export function allSports() {
  const extra = [...new Set([...TRACKER_SPORTS, ...sportsInPlay()])]
    .filter(name => !SPORT_BY_NAME[name])
    .map(name => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      name, icon: sportIconFor(name), photo: null, photos: [],
    }));
  return [...SPORTS, ...extra];
}

/** A sport from a link: its id ("soccer") or its name ("Soccer"). */
export function findSport(value) {
  const v = String(value || '');
  return allSports().find(s => s.id === v.toLowerCase() || s.name === v) || null;
}

/** Every distinct sport in GAMES, in the order they first appear. */
export function sportsInPlay() {
  const seen = [];
  for (const g of GAMES) {
    if (g.sport && !seen.includes(g.sport)) seen.push(g.sport);
  }
  return seen;
}

/**
 * cupNow() — the moment the Cup reads as "now".
 * The real clock, unless CUP_CONFIG.previewNow pins it for review.
 */
export function cupNow() {
  const pinned = CUP_CONFIG.previewNow ? parseDate(CUP_CONFIG.previewNow) : null;
  return pinned || new Date();
}

/** True while the preview clock is in charge. */
export function isPreviewClock() {
  return Boolean(CUP_CONFIG.previewNow && parseDate(CUP_CONFIG.previewNow));
}

/**
 * seasonState(now) — where the season stands.
 *   { phase: 'before', daysToGo, start, end }
 *   { phase: 'during', day, totalDays, start, end }
 *   { phase: 'after', start, end }
 */
export function seasonState(now = cupNow()) {
  const start = parseDate(CUP_CONFIG.season?.start);
  const end = parseDate(CUP_CONFIG.season?.end);
  if (!start || !end) return null;

  const DAY = 86400000;
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = midnight(now);
  const totalDays = Math.round((midnight(end) - midnight(start)) / DAY) + 1;

  if (today < start) {
    return { phase: 'before', daysToGo: Math.round((start - today) / DAY), start, end, totalDays };
  }
  if (today > end) return { phase: 'after', start, end, totalDays };
  return { phase: 'during', day: Math.round((today - start) / DAY) + 1, totalDays, start, end };
}
