/* ============================================================
   data/xavier-cup.js — everything the Xavier Cup tab renders.
   Pure data. No DOM.

   Four things live in here and each can be edited on its own:

     1. CUP_CONFIG  which sections of the tab appear at all
     2. CUP_MAP     the campus map: landmarks + venue pins
     3. GAMES       every match, with its venue and kickoff time
     4. CUP_NEWS    the News & Updates column
     5. CUP_EVENTS  the Upcoming Events cards under the news

   The tab works out Upcoming / Ongoing / Finished from the clock,
   counts the games at each venue for the map, and powers the
   search box — none of that needs touching when you add a match.
   ============================================================ */

import { parseDate } from '../lib/dates.js';

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
  lede: 'Every fixture of the season — where it is being played, when it starts, and how it finished. Tap the map to see what is on at a venue, or open Fixtures to follow your team.',

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
      the season starts. null = the real clock (what the live site
      uses). To review, set a moment such as '2026-10-12T15:30'.  */
  previewNow: null,

  /* --- Sections. Each one is independent. --- */
  showHero: true,          // the trophy banner at the top
  showCounters: true,      // the upcoming / ongoing / finished tallies
  showTeams: true,         // the "follow your team" picker
  showFeatured: true,      // one featured match per day, with a day pager
  showMap: true,           // the consolidated venue map
  showSchedule: true,      // the full fixture list below the map
  showCalendar: true,      // the month calendar of the chosen team's games
  showNews: true,          // News & Updates from the Facebook page
  showLegend: true,        // the colour key under the map

  /* --- Filters on the fixture list --- */
  showStatusFilter: true,  // All / Upcoming / Ongoing / Finished
  showSportFilter: true,   // one chip per sport found in GAMES

  /** How long a match with no `end` is assumed to run, in minutes. */
  defaultDurationMins: 90,

  /** Which fixture list the tab opens on:
      'all' | 'upcoming' | 'ongoing' | 'finished'  */
  defaultStatus: 'all',

  /** Show scores on finished game cards. */
  showScores: true,

  /** Cap on the fixture list; null = show everything. */
  maxGamesShown: null,
};

/* ============================================================
   2. THE MAP
   ------------------------------------------------------------
   Coordinates are in the map's own viewBox units, NOT pixels, so
   they never change when the map is resized.

   To move a pin: change its x / y. To add a venue: add an entry
   to `venues` and point a game's `venue` at its id. To reshape
   the campus: edit `landmarks` (rounded blocks) and `areas`
   (the green open spaces).

   Pins sit at the CENTRE of where you want them.
   ============================================================ */
export const CUP_MAP = {
  viewBox: '0 0 960 640',

  /* Green open spaces, drawn first (underneath everything). */
  areas: [
    { id: 'quad',  label: 'The Quadrangle', x: 300, y: 190, w: 360, h: 230, rx: 14 },
    { id: 'field', label: 'Football Field', x: 96,  y: 430, w: 300, h: 160, rx: 14 },
  ],

  /* Buildings — the things students actually navigate by. */
  landmarks: [
    { label: 'SBM Building',   x: 300, y: 56,  w: 360, h: 46, dir: 'h' },
    { label: 'Chapel',         x: 96,  y: 190, w: 120, h: 54, dir: 'h' },
    { label: 'Science Centrum',x: 96,  y: 286, w: 120, h: 96, dir: 'h' },
    { label: 'Engineering',    x: 744, y: 150, w: 120, h: 90,  dir: 'h' },
    { label: 'Faber Hall',     x: 744, y: 430, w: 120, h: 90,  dir: 'h' },
    { label: 'Loyola Hall',    x: 452, y: 520, w: 208, h: 60,  dir: 'h' },
    { label: 'Haggerty',       x: 688, y: 520, w: 160, h: 60,  dir: 'h' },
  ],

  /* Walkways, purely for orientation. */
  paths: [
    'M 276 160 L 276 600',
    'M 684 160 L 684 600',
    'M 60 440 L 900 440',
    'M 276 176 L 684 176',
  ],

  /* --- VENUES --------------------------------------------------
     id     referenced by each game's `venue`
     name   full name shown in the panel and the detail view
     short  what fits inside a pin label
     x / y  centre of the pin, in viewBox units
     note   the walking directions line
     indoor purely cosmetic — indoor pins get a roof glyph
     ------------------------------------------------------------ */
  venues: [
    {
      id: 'covered-court',
      name: 'Xavier Covered Court',
      short: 'Covered Court',
      x: 480, y: 250,
      indoor: true,
      note: 'Centre of the quad, straight down from the SBM Building steps.',
    },
    {
      id: 'loyola-gym',
      name: 'Loyola Gymnasium',
      short: 'Loyola Gym',
      x: 556, y: 470,
      indoor: true,
      note: 'South end of campus, beside Loyola Hall.',
    },
    {
      id: 'football-field',
      name: 'Football Field',
      short: 'Field',
      x: 246, y: 510,
      indoor: false,
      note: 'The open field west of the walkway, behind the Science Centrum.',
    },
    {
      id: 'oval',
      name: 'Athletics Oval',
      short: 'Oval',
      x: 480, y: 366,
      indoor: false,
      note: 'The track ringing the lower quad.',
    },
    {
      id: 'sbm-av',
      name: 'SBM Audio-Visual Room',
      short: 'SBM AVR',
      x: 400, y: 142,
      indoor: true,
      note: 'Second floor of the SBM Building, first door past the lobby.',
    },
    {
      id: 'eng-court',
      name: 'Engineering Court',
      short: 'Eng Court',
      x: 804, y: 330,
      indoor: false,
      note: 'The hard court behind the Engineering Building.',
    },
  ],
};

/* ============================================================
   3. THE FIXTURES
   ------------------------------------------------------------
   id        unique, url-safe (used in the ?game=… link)
   sport     free text — the sport chips are built from these
   division  optional ('Men', 'Women', 'Mixed', 'Open')
   round     optional ('Elimination', 'Semifinal', 'Final')
   teams     [home, away] as ids from data/teams.js ('ccs', 'eng').
             Anything that is not a team id prints as written, so
             ['All colleges'] works for a solo or all-in event.
   venue     an id from CUP_MAP.venues
   start     kickoff. See lib/dates.js for the accepted forms.
   end       optional; without it the match runs defaultDurationMins
   status    'auto' (default) | 'upcoming' | 'ongoing' | 'finished'
             A manual value beats the clock — use it for a
             postponement or a walkover.
   score     { home: 0, away: 0 } — shown once a match has started,
             so update it during play for a live score
   description  a short paragraph for the detail view
   link      optional external link (livestream, bracket, recap)
   note      short badge on the card ('Championship')
   featured  true → pinned to the top of the fixture list
   ------------------------------------------------------------
   Everything below is sample content for the Oct 10–20 season.
   Replace it wholesale once the official schedule is out.
   ============================================================ */
export const GAMES = [
  /* ---- Day 1 · Sat, Oct 10 ---- */
  { id: 'd1-bb-m-ccs-eng', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['ccs', 'eng'], venue: 'covered-court', start: '2026-10-10T09:00', end: '2026-10-10T10:30',
    score: { home: 64, away: 71 },
    description: 'Opening game of the men’s bracket. The Warriors pulled away in the fourth quarter.' },
  { id: 'd1-vb-w-nsg-med', sport: 'Volleyball', division: 'Women', round: 'Elimination',
    teams: ['nsg', 'med'], venue: 'loyola-gym', start: '2026-10-10T10:30', end: '2026-10-10T12:00',
    score: { home: 3, away: 1 },
    description: 'Women’s volleyball elimination, taken in four sets.' },
  { id: 'd1-fb-sbm-cas', sport: 'Football', division: 'Open', round: 'Elimination',
    teams: ['sbm', 'cas'], venue: 'football-field', start: '2026-10-10T16:30', end: '2026-10-10T18:00',
    score: { home: 2, away: 2 },
    description: 'First football fixture after the opening parade. A late equaliser split the points.' },

  /* ---- Day 2 · Sun, Oct 11 ---- */
  { id: 'd2-bd-mx-law-agsoe', sport: 'Badminton', division: 'Mixed', round: 'Elimination',
    teams: ['law', 'agsoe'], venue: 'eng-court', start: '2026-10-11T09:00', end: '2026-10-11T10:30',
    score: { home: 2, away: 1 },
    description: 'Mixed doubles, best of three sets.' },
  { id: 'd2-es-ml-ccs-sbm', sport: 'Esports', division: 'Open', round: 'Round 1',
    teams: ['ccs', 'sbm'], venue: 'sbm-av', start: '2026-10-11T13:00', end: '2026-10-11T16:00',
    score: { home: 2, away: 0 },
    description: 'Opening round of the esports bracket, best of three.' },
  { id: 'd2-bb-w-cas-nsg', sport: 'Basketball', division: 'Women', round: 'Elimination',
    teams: ['cas', 'nsg'], venue: 'covered-court', start: '2026-10-11T16:00', end: '2026-10-11T17:30',
    score: { home: 48, away: 52 },
    description: 'Women’s basketball elimination. The Pythons closed it out at the line.' },

  /* ---- Day 3 · Mon, Oct 12 ---- */
  { id: 'd3-vb-m-eng-agsoe', sport: 'Volleyball', division: 'Men', round: 'Elimination',
    teams: ['eng', 'agsoe'], venue: 'loyola-gym', start: '2026-10-12T09:30', end: '2026-10-12T11:00',
    score: { home: 3, away: 1 },
    description: 'Men’s volleyball elimination. The Warriors’ block held all morning.' },
  { id: 'd3-bd-mx-sbm-med', sport: 'Badminton', division: 'Mixed', round: 'Elimination',
    teams: ['sbm', 'med'], venue: 'eng-court', start: '2026-10-12T11:00', end: '2026-10-12T12:30',
    score: { home: 0, away: 2 },
    description: 'Mixed doubles, best of three sets.' },
  { id: 'd3-bb-m-law-cas', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['law', 'cas'], venue: 'covered-court', start: '2026-10-12T14:30', end: '2026-10-12T16:00',
    score: { home: 41, away: 38 },
    description: 'Men’s basketball elimination. Winner stays in the race for a semifinal slot.' },
  { id: 'd3-fb-nsg-ccs', sport: 'Football', division: 'Open', round: 'Elimination',
    teams: ['nsg', 'ccs'], venue: 'football-field', start: '2026-10-12T15:00', end: '2026-10-12T16:30',
    score: { home: 1, away: 0 },
    description: 'Football elimination. A draw sends both sides into the play-off on the final weekend.' },
  { id: 'd3-es-ml-eng-med', sport: 'Esports', division: 'Open', round: 'Round 1',
    teams: ['eng', 'med'], venue: 'sbm-av', start: '2026-10-12T15:30', end: '2026-10-12T18:00',
    score: { home: 0, away: 0 },
    description: 'Esports round one, best of three.' },
  { id: 'd3-vb-w-sbm-law', sport: 'Volleyball', division: 'Women', round: 'Elimination',
    teams: ['sbm', 'law'], venue: 'loyola-gym', start: '2026-10-12T17:00', end: '2026-10-12T18:30',
    description: 'Women’s volleyball elimination under the lights.' },

  /* ---- Day 4 · Tue, Oct 13 ---- */
  { id: 'd4-bd-mx-nsg-cas', sport: 'Badminton', division: 'Mixed', round: 'Elimination',
    teams: ['nsg', 'cas'], venue: 'eng-court', start: '2026-10-13T15:00', end: '2026-10-13T16:30',
    description: 'Mixed doubles, best of three sets.' },
  { id: 'd4-bb-w-ccs-med', sport: 'Basketball', division: 'Women', round: 'Elimination',
    teams: ['ccs', 'med'], venue: 'covered-court', start: '2026-10-13T16:00', end: '2026-10-13T17:30',
    description: 'Women’s basketball elimination.' },

  /* ---- Day 5 · Wed, Oct 14 ---- */
  { id: 'd5-vb-m-ccs-sbm', sport: 'Volleyball', division: 'Men', round: 'Elimination',
    teams: ['ccs', 'sbm'], venue: 'loyola-gym', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Men’s volleyball elimination.' },
  { id: 'd5-fb-eng-law', sport: 'Football', division: 'Open', round: 'Elimination',
    teams: ['eng', 'law'], venue: 'football-field', start: '2026-10-14T16:00', end: '2026-10-14T17:30',
    description: 'Last round of football eliminations.' },

  /* ---- Day 6 · Thu, Oct 15 ---- */
  { id: 'd6-es-ml-nsg-agsoe', sport: 'Esports', division: 'Open', round: 'Round 1',
    teams: ['nsg', 'agsoe'], venue: 'sbm-av', start: '2026-10-15T13:00', end: '2026-10-15T16:00',
    description: 'Esports round one, best of three.' },
  { id: 'd6-bb-m-sbm-agsoe', sport: 'Basketball', division: 'Men', round: 'Elimination',
    teams: ['sbm', 'agsoe'], venue: 'covered-court', start: '2026-10-15T17:00', end: '2026-10-15T18:30',
    description: 'Men’s basketball elimination.' },

  /* ---- Day 7 · Fri, Oct 16 ---- */
  { id: 'd7-cheerdance', sport: 'Cheerdance', division: 'Open', round: 'Competition',
    teams: ['All colleges'], venue: 'covered-court', start: '2026-10-16T18:00', end: '2026-10-16T21:00',
    note: 'All colleges',
    description: 'Every college takes the floor in one night. Doors open at 5:00 PM; bring your college colours.' },

  /* ---- Day 8 · Sat, Oct 17 ---- */
  { id: 'd8-vb-w-semi-1', sport: 'Volleyball', division: 'Women', round: 'Semifinal',
    teams: ['nsg', 'law'], venue: 'loyola-gym', start: '2026-10-17T14:00', end: '2026-10-17T16:00',
    description: 'First women’s volleyball semifinal.' },
  { id: 'd8-bb-m-semi-1', sport: 'Basketball', division: 'Men', round: 'Semifinal',
    teams: ['eng', 'cas'], venue: 'covered-court', start: '2026-10-17T16:00', end: '2026-10-17T17:30',
    description: 'First men’s basketball semifinal.' },

  /* ---- Day 9 · Sun, Oct 18 ---- */
  { id: 'd9-bd-mx-final', sport: 'Badminton', division: 'Mixed', round: 'Final',
    teams: ['med', 'agsoe'], venue: 'eng-court', start: '2026-10-18T10:00', end: '2026-10-18T11:30',
    note: 'Championship',
    description: 'Mixed doubles final, best of three sets.' },
  { id: 'd9-fb-semi', sport: 'Football', division: 'Open', round: 'Semifinal',
    teams: ['sbm', 'nsg'], venue: 'football-field', start: '2026-10-18T15:00', end: '2026-10-18T16:30',
    description: 'Football semifinal. Extra time and penalties if level.' },

  /* ---- Day 10 · Mon, Oct 19 ---- */
  { id: 'd10-es-final', sport: 'Esports', division: 'Open', round: 'Final',
    teams: ['ccs', 'eng'], venue: 'sbm-av', start: '2026-10-19T13:00', end: '2026-10-19T17:00',
    note: 'Championship',
    description: 'Esports final, best of five.' },
  { id: 'd10-vb-m-final', sport: 'Volleyball', division: 'Men', round: 'Final',
    teams: ['eng', 'ccs'], venue: 'loyola-gym', start: '2026-10-19T16:00', end: '2026-10-19T18:00',
    note: 'Championship',
    description: 'Men’s volleyball final.' },

  /* ---- Day 11 · Tue, Oct 20 ---- */
  { id: 'd11-fb-final', sport: 'Football', division: 'Open', round: 'Final',
    teams: ['sbm', 'cas'], venue: 'football-field', start: '2026-10-20T14:00', end: '2026-10-20T15:30',
    note: 'Championship',
    description: 'Football final.' },
  { id: 'd11-bb-m-final', sport: 'Basketball', division: 'Men', round: 'Final',
    teams: ['eng', 'sbm'], venue: 'covered-court', start: '2026-10-20T16:00', end: '2026-10-20T18:00',
    note: 'Championship', featured: true,
    description: 'The men’s basketball final closes the season. The trophy is presented on court straight after.' },

  // Add fixtures above this line.
];

/* ============================================================
   4. NEWS & UPDATES
   ------------------------------------------------------------
   Everything the Facebook page posts or shares, with its own text
   and picture. Nobody uploads anything:

   a GitHub Action (.github/workflows/facebook-news.yml) runs every
   30 minutes, reads the page through the Graph API with a token kept
   in the repository's secrets, saves each post's picture into
   assets/news/ and writes data/cup-posts.json. The browser only ever
   reads those files, so no token ships with the site.

   All posts go in the "More updates" carousel. Which ones ALSO get
   the big featured slot is chosen by hand in data/news-featured.js.

   The page's name and link come from Facebook too; pageName and
   pageUrl below are only used until the Action has run once.

   If you want Facebook's own page widget as well, set
   embed.enabled = true. It needs no token, but it will not render
   at all for readers who block third-party frames.
   ============================================================ */
export const CUP_NEWS = {
  enabled: true,
  title: 'News & Updates',
  kicker: 'From Facebook',
  pageName: 'Campuss Compass TEST',
  pageUrl: 'https://www.facebook.com/profile.php?id=61595123270779',
  followLabel: 'Open the Facebook page',

  /** The file the Action writes, relative to this data folder. */
  feed: 'cup-posts.json',

  /** How many recent posts the carousel shows. */
  maxPosts: 12,

  /** Facebook's own page plugin. Off by default — see the note above. */
  embed: {
    enabled: false,
    height: 500,
    showTimeline: true,
  },

  /** Shown only if cup-posts.json can't be read at all. Left empty on
      purpose: the tab shows real posts from the page, or nothing. */
  posts: [],
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

/* ---------- Lookups ---------- */

export const VENUE_BY_ID = Object.fromEntries(CUP_MAP.venues.map(v => [v.id, v]));

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
