/* ============================================================
   data/xavier-cup.js — everything the Xavier Cup tab renders.
   Pure data. No DOM.

   Four things live in here and each can be edited on its own:

     1. CUP_CONFIG  which sections of the tab appear at all
     2. CUP_MAP     the venues and what is played where
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
  showBracket: true,       // Sports: each sport's knockout bracket (off: its standings show the groups instead)
  showMap: true,           // the Map view
  showNews: true,          // News & Updates from the Facebook page
  showEvents: true,        // News & Updates: the Upcoming Events cards under the news (CUP_EVENTS)
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
        Football: { at: [203, 202] },
        'Ultimate Frisbee': { at: [225, 218], gps: [124.64828633923103, 8.476343007092051] },
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

  /* Sports the sheet names differently from SPORTS → the site's sport,
     and for one the site shows as a category of another, its event
     ("Basketball 3x3" → Basketball's "3x3 · Men"). Matching ignores
     capitals and extra spaces; a sport not listed keeps its name. */
  sports: {
    'Soccer':           { sport: 'Football' },
    'Frisbee':          { sport: 'Ultimate Frisbee' },
    'Basketball 3x3':   { sport: 'Basketball', event: '3x3' },
    'ESports MLBB':     { sport: 'Esports', event: 'ML' },
    'ESports COD':      { sport: 'Esports', event: 'CODM' },
    'ESports Valorant': { sport: 'Esports', event: 'Valorant' },
    'ESports Dota':     { sport: 'Esports', event: 'Dota 2' },
  },
};

/* ============================================================
   3b. THE SAMPLE FIXTURES (only while CUP_LIVE.enabled is false)
   ------------------------------------------------------------
   id        unique, url-safe (used in the ?game=… link)
   sport     the sport's name exactly as in SPORTS below ('Football',
             'Athletics', 'Esports') — that finds its page and icon
   event     optional: the event within the sport, for sports that
             have them ('100m', 'Javelin', 'Relay' in Athletics; 'ML',
             'CODM', 'Valorant', 'Dota 2' in Esports)
   division  optional ('Men', 'Women', 'Mixed', 'Open'). With `event`
             it makes the category: event '100m' + division 'Men' is
             "100m · Men"; an Esports game needs only its event.
   round     optional ('Elimination', 'Quarterfinal', 'Semifinal', 'Final',
             'Third place', and placing games: '5th place', '7th place',
             'Ranking'). Finished Elimination games make the standings
             on the Sports tab; the others fill its bracket, in
             kickoff order within a round (see BRACKETS).
   group     optional, for Elimination games: the group letter ('A',
             'B') in the sport's schedule. Games with a group make one
             standings table per group.
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
  { id: 'd1-sc-sbm-cas', sport: 'Football', division: 'Men', round: 'Elimination',
    teams: ['sbm', 'cas'], venue: 'soccer-field', start: '2026-10-10T16:30', end: '2026-10-10T18:00',
    score: { home: 2, away: 2 },
    description: 'First men’s football game after the opening parade. A late equaliser split the points.' },

  /* ---- Day 2 · Sun, Oct 11 ---- */
  { id: 'd2-fr-mx-law-agsoe', sport: 'Ultimate Frisbee', division: 'Mixed', round: 'Elimination',
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
  { id: 'd3-fr-mx-sbm-med', sport: 'Ultimate Frisbee', division: 'Mixed', round: 'Elimination',
    teams: ['sbm', 'med'], venue: 'soccer-field', start: '2026-10-12T11:00', end: '2026-10-12T12:30',
    score: { home: 9, away: 13 },
    description: 'Mixed ultimate, first to 13.' },
  { id: 'd3-bb-m-law-cas', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['law', 'cas'], venue: 'xu-gym', start: '2026-10-12T14:30', end: '2026-10-12T16:00',
    score: { home: 41, away: 38 },
    description: 'Men’s basketball elimination. Winner stays in the race for a semifinal slot.' },
  { id: 'd3-sc-nsg-ccs', sport: 'Football', division: 'Men', round: 'Elimination',
    teams: ['nsg', 'ccs'], venue: 'soccer-field', start: '2026-10-12T15:00', end: '2026-10-12T16:30',
    score: { home: 1, away: 0 },
    description: 'Men’s football elimination. A draw sends both sides into the play-off on the final weekend.' },
  { id: 'd3-vb-w-eng-med', sport: 'Volleyball', division: 'Women', round: 'Elimination',
    teams: ['eng', 'med'], venue: 'covered-court', start: '2026-10-12T15:30', end: '2026-10-12T17:00',
    score: { home: 1, away: 0 },
    description: 'Women’s volleyball elimination, best of five sets.' },
  { id: 'd3-sb-w-sbm-law', sport: 'Softball', division: 'Women', round: 'Elimination',
    teams: ['sbm', 'law'], venue: 'soccer-field', start: '2026-10-12T17:00', end: '2026-10-12T18:30',
    description: 'Softball elimination under the lights, once the football is done.' },

  /* ---- Day 4 · Tue, Oct 13 ---- */
  { id: 'd4-fr-mx-nsg-cas', sport: 'Ultimate Frisbee', division: 'Mixed', round: 'Elimination',
    teams: ['nsg', 'cas'], venue: 'soccer-field', start: '2026-10-13T15:00', end: '2026-10-13T16:30',
    description: 'Mixed ultimate, first to 13.' },
  { id: 'd4-bb-w-ccs-med', sport: 'Basketball', division: 'Women', round: 'Elimination',
    teams: ['ccs', 'med'], venue: 'xu-gym', start: '2026-10-13T16:00', end: '2026-10-13T17:30',
    description: 'Women’s basketball elimination.' },

  /* ---- Day 5 · Wed, Oct 14 ---- */
  { id: 'd5-vb-m-ccs-sbm', sport: 'Volleyball', division: 'Men', round: 'Elimination',
    teams: ['ccs', 'sbm'], venue: 'covered-court', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Men’s volleyball elimination.' },
  { id: 'd5-sc-eng-law', sport: 'Football', division: 'Men', round: 'Elimination',
    teams: ['eng', 'law'], venue: 'soccer-field', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Last round of men’s football eliminations.' },

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
  { id: 'd9-fr-mx-final', sport: 'Ultimate Frisbee', division: 'Mixed', round: 'Final',
    teams: ['med', 'agsoe'], venue: 'soccer-field', start: '2026-10-18T10:00', end: '2026-10-18T11:30',
    note: 'Championship',
    description: 'Mixed ultimate final, first to 15.' },
  { id: 'd9-sc-semi', sport: 'Football', division: 'Men', round: 'Semifinal',
    teams: ['sbm', 'nsg'], venue: 'soccer-field', start: '2026-10-18T15:00', end: '2026-10-18T16:30',
    description: 'Men’s football semifinal. Extra time and penalties if level.' },

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
  { id: 'd11-sc-final', sport: 'Football', division: 'Men', round: 'Final',
    teams: ['sbm', 'cas'], venue: 'soccer-field', start: '2026-10-20T14:00', end: '2026-10-20T15:30',
    note: 'Championship',
    description: 'Men’s football final.' },
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
    { src: null, caption: 'Football · XU Soccer Field', alt: 'A football match at the XU Soccer Field' },
    { src: null, caption: 'The crowd', alt: 'Students cheering for their college' },
  ],
};

/* ============================================================
   7. SPORTS
   ------------------------------------------------------------
   One entry per sport, grouped below the way the Intramurals 2026-27
   General Guidelines group them (major, minor and bonus events, with
   the divisions its table of players gives); the Sports tab and the
   Matches filter list them A to Z by themselves, each with its
   pictogram (components/sport-pictograms.js).
   A game names its sport by `name`, spelled exactly the same;
   `id` is what goes in the link (?tab=sports&sport=football).

   id         url-safe, lower case
   name       as written in GAMES[].sport
   icon       the sport's marker picture on the map (its tile, page
              and match cards use its pictogram; the picture is the
              fallback for a sport without one)
   photo      a wide photo for the top of the sport's page
              (assets/sports/photos/…). null = a placeholder graphic
   photos     more photos, shown as a strip on the sport's page
              ([{ src, alt }]; leave empty for none)
   categories what the sport is split into, in the order its page
              shows them: 'Men', 'Women', 'Mixed', or an event with
              its division ('100m · Men', see GAMES[].event). Leave
              it out for a sport played as one category.
   format     'versus' (default): college against college, so the
              sport's page has standings and a knockout bracket.
              'field': every college competes at once (races,
              routines), so the page has no standings or bracket.
   bracket    for a versus sport, its tournament format: a name from
              BRACKETS below (how its schedule runs: groups, cross-
              overs, quarterfinals, placing games). Leave it out to
              keep the original table, semifinals and final.

   The standings (wins and losses from the finished Elimination
   games, one table per group) work themselves out from GAMES. A sport in GAMES that is
   missing here still gets a page, using supplied artwork where available.
   ============================================================ */
const MW = ['Men', 'Women'];
// Athletics: every event Men and Women, except the relay (Mixed).
const ATHLETICS = [
  '100m · Men', '100m · Women', '200m · Men', '200m · Women', '400m · Men', '400m · Women',
  'Relay · Mixed',
  'Javelin · Men', 'Javelin · Women', 'Shot Put · Men', 'Shot Put · Women', 'Discus · Men', 'Discus · Women',
];
// Badminton and Table Tennis: singles and doubles each way, and mixed doubles.
const RACKET = ['Singles · Men', 'Singles · Women', 'Doubles · Men', 'Doubles · Women', 'Doubles · Mixed'];
// Pickleball's schedule lists mixed doubles for men and for women, as written.
const PICKLEBALL = ['Singles · Men', 'Singles · Women', 'Doubles · Men', 'Doubles · Women', 'Mixed Doubles · Men', 'Mixed Doubles · Women'];

export const SPORTS = [
  // Major events (100 / 70 / 50 points to the top three colleges)
  // Basketball 3x3 is a category of Basketball (a minor event): its
  // games are sport 'Basketball', event '3x3', division 'Men' or 'Women'.
  { id: 'basketball', name: 'Basketball', icon: 'assets/sports/basketball.webp', photo: null, photos: [], categories: [...MW, '3x3 · Men', '3x3 · Women'],
    bracket: { default: 'quarters', '3x3': 'crossover-placings' } },   // 5x5 and 3x3 run differently
  { id: 'volleyball', name: 'Volleyball', icon: 'assets/sports/volleyball.webp', photo: null, photos: [], categories: MW, bracket: 'crossover' },
  { id: 'football',   name: 'Football',   icon: 'assets/sports/soccer.webp',     photo: null, photos: [], categories: MW },   // 8-a-side
  { id: 'softball',   name: 'Softball',   icon: 'assets/sports/softball.webp',   photo: null, photos: [], categories: MW, bracket: 'crossover' },
  { id: 'ultimate-frisbee', name: 'Ultimate Frisbee', icon: 'assets/sports/frisbee.webp', photo: null, photos: [], categories: ['Mixed'], bracket: 'seeded' },
  { id: 'esports',    name: 'Esports',    icon: null, photo: null, photos: [], categories: ['ML', 'CODM', 'Valorant', 'Dota 2'] },   // each Open
  { id: 'cheerdance', name: 'Cheerdance', icon: null, photo: null, photos: [], categories: ['Mixed'], format: 'field' },
  { id: 'megacrew',   name: 'Megacrew',   icon: null, photo: null, photos: [], format: 'field' },   // Open
  // Minor events (team 20 / 14 / 10, individual 10 / 7 / 5)
  { id: 'athletics',  name: 'Athletics',  icon: null, photo: null, photos: [], categories: ATHLETICS, format: 'field' },
  { id: 'swimming',   name: 'Swimming',   icon: null, photo: null, photos: [], categories: MW, format: 'field' },
  { id: 'sepak-takraw', name: 'Sepak Takraw', icon: null, photo: null, photos: [], categories: MW, bracket: 'crossover' },
  { id: 'table-tennis', name: 'Table Tennis', icon: null, photo: null, photos: [], categories: RACKET, bracket: 'crossover' },
  { id: 'lawn-tennis',  name: 'Lawn Tennis',  icon: null, photo: null, photos: [], categories: MW },
  { id: 'badminton',    name: 'Badminton',    icon: null, photo: null, photos: [], categories: RACKET, bracket: 'crossover' },
  { id: 'pickleball',   name: 'Pickleball',   icon: null, photo: null, photos: [], categories: PICKLEBALL, bracket: 'crossover' },
  { id: 'taekwondo',  name: 'Taekwondo',  icon: null, photo: null, photos: [], categories: MW },
  { id: 'karatedo',   name: 'Karatedo',   icon: null, photo: null, photos: [], categories: MW },
  { id: 'chess',      name: 'Chess',      icon: null, photo: null, photos: [], categories: MW },
  { id: 'darts',      name: 'Darts',      icon: null, photo: null, photos: [], categories: MW },
  // Bonus events (20 / 14 / 10)
  { id: 'debate',      name: 'Debate',      icon: null, photo: null, photos: [], categories: ['Mixed'] },
];

/* ---------- Tournament formats ----------
   How a versus sport goes from its group games to a champion,
   copied from the TXC2026 Game Schedules folder (one schedule per
   sport). A sport picks one with SPORTS[].bracket: a name, or
   { default: name, '<event>': name } when its events run
   differently. A sport with none (no schedule in the folder yet)
   keeps 'round': one table, then semifinals and a final.

   groups    group letters; games carry the same letter in
             GAMES[].group. [] = one table for everyone.
   note      one line under the standings: who goes through.
   quarters, semis
             the games of that round, in order, written the way the
             schedules write them. Each shows in its bracket slot
             until the real game is in GAMES (round 'Quarterfinal' /
             'Semifinal'):  A1 = 1st in group A · #1 = 1st overall ·
             W A3/B2 = the winner of A3 against B2.
   final, third
             the final and the third-place game (rounds 'Final' and
             'Third place'); null = no slot until a game is set.
   tree      two groups only: the draw as two halves meeting in the
             final, drawn like a printed bracket. One entry per
             semifinal (left, right), each its two entrants: a seed
             ('A1') or { quarter: i }, the winner of quarters[i].
   placings  games for places below the podium, by GAMES round. */
export const BRACKETS = {
  // No schedule to follow: the original bracket.
  round: {
    groups: [],
    note: 'From finished group games.',
    semis: [null, null],
    final: null,
    third: null,
    placings: [],
  },
  // Volleyball, Softball, Badminton, Table Tennis, Pickleball, and Sepak
  // Takraw (its Oct 17–18 schedule: groups 1 and 2 of four teams, then
  // T1G1 v T2G2 and T2G1 v T1G2, L13 v L14 for third, W13 v W14).
  crossover: {
    groups: ['A', 'B'],
    note: 'The top two of each group cross over to the semifinals.',
    semis: ['A1 vs B2', 'B1 vs A2'],
    tree: [['A1', 'B2'], ['B1', 'A2']],
    final: 'Semifinal winners',
    third: 'Semifinal losers',
    placings: [],
  },
  // Basketball 3x3: the same, and every team plays for a place.
  'crossover-placings': {
    groups: ['A', 'B'],
    note: 'The top two of each group cross over to the semifinals; 3rd and 4th play for 5th and 7th.',
    semis: ['A1 vs B2', 'B1 vs A2'],
    tree: [['A1', 'B2'], ['B1', 'A2']],
    final: 'Semifinal winners',
    third: 'Semifinal losers',
    placings: [{ round: '5th place', games: ['A3 vs B3'] }, { round: '7th place', games: ['A4 vs B4'] }],
  },
  // Basketball 5x5: group winners wait in the semifinals.
  quarters: {
    groups: ['A', 'B'],
    note: 'Group winners go straight to the semifinals; 2nd and 3rd play the quarterfinals; 4th plays for 7th.',
    quarters: ['A2 vs B3', 'A3 vs B2'],
    semis: ['A1 vs W A3/B2', 'B1 vs W A2/B3'],
    tree: [['A1', { quarter: 1 }], ['B1', { quarter: 0 }]],
    final: 'Semifinal winners',
    third: 'Semifinal losers',
    placings: [{ round: '5th place', games: ['Quarterfinal losers'] }, { round: '7th place', games: ['A4 vs B4'] }],
  },
  // Ultimate Frisbee: one table seeds an eight-team bracket.
  seeded: {
    groups: [],
    note: 'Everyone plays everyone; the table seeds the quarterfinals, 1 v 8.',
    quarters: ['#1 vs #8', '#4 vs #5', '#2 vs #7', '#3 vs #6'],
    semis: ['W 1v8 vs W 4v5', 'W 2v7 vs W 3v6'],
    final: 'Semifinal winners',
    third: 'Semifinal losers',
    placings: [{ round: 'Ranking', games: ['L 1v8 vs L 2v7', 'L 3v6 vs L 4v5'] }],
  },
};

/* ---------- Lookups ---------- */

export const VENUE_BY_ID = Object.fromEntries(CUP_MAP.venues.map(v => [v.id, v]));
export const SPORT_BY_NAME = Object.fromEntries(SPORTS.map(s => [s.name, s]));

/** Every sport the tracker lists (its Lists tab), in its order.
    Filled by lib/live-data.js, so a sport added to the sheet gets a
    tile and a page here before its first game. */
export const TRACKER_SPORTS = [];

/**
 * allSports() — every sport, A to Z: SPORTS, plus the tracker's other
 * sports and any sport GAMES plays that SPORTS leaves out (using
 * supplied artwork when available), so every sport has a page.
 */
export function allSports() {
  const extra = [...new Set([...TRACKER_SPORTS, ...sportsInPlay()])]
    .filter(name => !SPORT_BY_NAME[name])
    .map(name => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      name, icon: sportIconFor(name), photo: null, photos: [],
    }));
  return [...SPORTS, ...extra].sort((a, b) => a.name.localeCompare(b.name));
}

/** A sport from a link: its id ("football") or its name ("Football"). */
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
