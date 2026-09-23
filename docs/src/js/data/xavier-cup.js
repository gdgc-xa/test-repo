/* ============================================================
   data/xavier-cup.js — everything the Xavier Cup tab renders.
   Pure data. No DOM.

   Four things live in here and each can be edited on its own:

     1. CUP_CONFIG  which sections of the tab appear at all
     2. CUP_MAP     the campus map: landmarks + venue pins
     3. GAMES       every match, with its venue and kickoff time
     4. CUP_NEWS    the News & Updates column

   The tab works out Upcoming / Ongoing / Finished from the clock,
   counts the games at each venue for the map, and powers the
   search box — none of that needs touching when you add a match.
   ============================================================ */

/* Sample-data helper. Real fixtures should use plain strings,
   e.g. start: '2026-10-02T15:00'. See lib/dates.js for the forms. */
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
   1. CONFIGURATION
   ============================================================ */
export const CUP_CONFIG = {
  /** Master switch for the tab's content. The nav item itself is
      controlled by data/site.js → tabs.cup.enabled. */
  enabled: true,

  name: 'The Xavier Cup',
  kicker: 'University-wide',
  tagline: 'One campus, every college, one trophy.',
  lede: 'Every fixture of the season — where it is being played, when it kicks off, and how it finished. Tap the map to see what is happening at a venue, or search for a team.',

  /* --- Sections. Each one is independent. --- */
  showHero: true,          // the trophy banner at the top
  showCounters: true,      // the upcoming / ongoing / finished tallies
  showSearch: true,        // the game search box + its results
  showMap: true,           // the consolidated venue map
  showSchedule: true,      // the full fixture list below the map
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
   teams     [home, away]; use one entry for a solo/heat event
   venue     an id from CUP_MAP.venues
   start     kickoff. See lib/dates.js for the accepted forms.
   end       optional; without it the match runs defaultDurationMins
   status    'auto' (default) | 'upcoming' | 'ongoing' | 'finished'
             A manual value beats the clock — use it for a
             postponement or a walkover.
   score     { home: 0, away: 0 } — shown on finished cards
   description  a short paragraph for the detail view
   link      optional external link (livestream, bracket, recap)
   note      short badge on the card ('Championship')
   featured  true → pinned to the top of the fixture list
   ------------------------------------------------------------
   Everything below is sample content. Replace it wholesale.
   ============================================================ */
export const GAMES = [
  {
    id: 'bb-m-final',
    sport: 'Basketball',
    division: 'Men',
    round: 'Championship',
    teams: ['College of Engineering', 'School of Business and Management'],
    venue: 'covered-court',
    start: inDays(4, '16:00'),
    end: inDays(4, '18:00'),
    featured: true,
    note: 'Championship',
    description:
      'The men’s basketball final. Engineering come in unbeaten from the eliminations; SBM take the other side of the bracket after a one-point semifinal.',
    link: null,
  },
  {
    id: 'vb-w-semi-1',
    sport: 'Volleyball',
    division: 'Women',
    round: 'Semifinal',
    teams: ['College of Nursing', 'College of Arts and Sciences'],
    venue: 'loyola-gym',
    start: inDays(2, '14:00'),
    end: inDays(2, '16:00'),
    description:
      'First women’s volleyball semifinal. Winner takes the Saturday final slot at the Covered Court.',
  },
  {
    id: 'fb-open-elim-3',
    sport: 'Football',
    division: 'Open',
    round: 'Elimination',
    teams: ['College of Agriculture', 'School of Education'],
    venue: 'football-field',
    start: hoursFromNow(-1),        // demonstrates the "Ongoing" state
    end: hoursFromNow(1),
    description:
      'Third elimination fixture of the football bracket. A draw sends both sides into the play-off on the final weekend.',
  },
  {
    id: 'chess-open-r4',
    sport: 'Chess',
    division: 'Open',
    round: 'Round 4',
    teams: ['College of Computer Studies', 'College of Engineering'],
    venue: 'sbm-av',
    start: inDays(1, '09:00'),
    end: inDays(1, '12:00'),
    description:
      'Board one of the fourth round, played under a 25+10 rapid time control. Boards two to six run at the same time in the same room.',
  },
  {
    id: 'badminton-mixed-qf',
    sport: 'Badminton',
    division: 'Mixed',
    round: 'Quarterfinal',
    teams: ['School of Business and Management', 'College of Nursing'],
    venue: 'eng-court',
    start: inDays(1, '15:00'),
    end: inDays(1, '17:00'),
    description: 'Mixed doubles quarterfinal, best of three sets.',
  },
  {
    id: 'athletics-100m',
    sport: 'Athletics',
    division: 'Open',
    round: 'Finals',
    teams: ['All colleges'],
    venue: 'oval',
    start: inDays(6, '07:00'),
    end: inDays(6, '11:00'),
    description:
      'Track finals morning — 100m, 400m and the 4×100m relay, running back to back from seven in the morning.',
    note: 'All colleges',
  },
  {
    id: 'bb-w-semi-2',
    sport: 'Basketball',
    division: 'Women',
    round: 'Semifinal',
    teams: ['College of Arts and Sciences', 'College of Computer Studies'],
    venue: 'covered-court',
    start: inDays(-1, '16:00'),
    end: inDays(-1, '18:00'),
    score: { home: 58, away: 61 },
    description:
      'Women’s basketball semifinal. Computer Studies took it on a three with eleven seconds left.',
  },
  {
    id: 'vb-m-elim-2',
    sport: 'Volleyball',
    division: 'Men',
    round: 'Elimination',
    teams: ['College of Engineering', 'College of Agriculture'],
    venue: 'loyola-gym',
    start: inDays(-3, '14:00'),
    end: inDays(-3, '16:00'),
    score: { home: 3, away: 1 },
    description: 'Men’s volleyball elimination, taken in four sets.',
  },
  {
    id: 'esports-ml-r1',
    sport: 'Esports',
    division: 'Open',
    round: 'Round 1',
    teams: ['College of Computer Studies', 'School of Business and Management'],
    venue: 'sbm-av',
    start: inDays(-5, '13:00'),
    end: inDays(-5, '17:00'),
    score: { home: 2, away: 0 },
    description: 'Opening round of the esports bracket, best of three.',
  },
  // Add fixtures above this line.
];

/* ============================================================
   4. NEWS & UPDATES
   ------------------------------------------------------------
   A place for whatever the Xavier Cup Facebook page has posted.
   Posts are written by hand here for now — the page's public feed
   is not readable from a static site without a Graph API token,
   so this is the honest version of it rather than a fake embed.

   If you DO want the real page widget, set embed.enabled = true
   and put the page URL in `pageUrl`. That renders Facebook's own
   page plugin in an iframe. It needs no token, but it will not
   render at all if the reader blocks third-party frames — which
   is exactly why the hand-written posts stay as the default.
   ============================================================ */
export const CUP_NEWS = {
  enabled: true,
  title: 'News & Updates',
  kicker: 'From the page',
  pageName: 'The Xavier Cup',
  pageUrl: 'https://www.facebook.com/XUCSG',
  pageHandle: 'XUCSG',
  followLabel: 'Open the Facebook page',

  /** Facebook's own page plugin. Off by default — see the note above. */
  embed: {
    enabled: false,
    height: 500,
    showTimeline: true,
  },

  /** Newest first. `date` accepts the same forms as a game's start. */
  posts: [
    {
      id: 'post-bracket',
      date: inDays(-1, '19:40'),
      tag: 'Bracket',
      title: 'Semifinal pairings are out',
      body: 'Both basketball semifinals are set after tonight’s results. Full bracket on the page; the finals schedule follows tomorrow morning.',
      link: null,
    },
    {
      id: 'post-venue',
      date: inDays(-2, '12:05'),
      tag: 'Venue',
      title: 'Badminton moved to the Engineering Court',
      body: 'All mixed doubles fixtures move from the Loyola Gym to the Engineering Court for the rest of the week. Times are unchanged.',
      link: null,
    },
    {
      id: 'post-opening',
      date: inDays(-4, '08:30'),
      tag: 'Announcement',
      title: 'Parade of colleges call time',
      body: 'Contingents assemble at the SBM steps by 2:30 PM on opening day. Bring your college colours — marshals will be at the quad entrances.',
      link: null,
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
