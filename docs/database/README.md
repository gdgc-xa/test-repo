# Database

Everything the site shows lives here as plain **JSON files**. To change what the site says (add an org, move a game, rename a tab), you edit a file in this folder. You don't need to touch any code.

- Edit a file → save → reload the page. There is no build step.
- JSON is strict: use double quotes, put no comma after the last item, and don't write comments. If the page goes blank after an edit, paste the file into [jsonlint.com](https://jsonlint.com) to find the typo.
- Each file is read by a small loader in `src/js/data/` with the same name. The loaders also hold anything that needs code: lookups, the clock, and plan merging.

## Files

```
organizations.json  the 75 student organizations (Browse, booths, search)
clusters.json       the 11 clusters, their colour and labels
featured.json       which orgs are featured on Discover and Browse
events.json         the Events tab: settings + the event list
venue.json          the org-fair tent map: who stands in which tent
site.json           ONE switchboard: tabs, contact, skin, settings panel
team-groups.json    the people behind Campus Compass (About page)
teams.json          the eight Xavier Cup teams
xavier-cup.json     Xavier Cup settings, live-data source, news, events, banner photos
cup-venues.json     Xavier Cup venues + the venue plan (which sport is played where)
cup-sports.json     every sport + its tournament format (brackets)
cup-games.json      sample matches, shown only while live data is off
sport-icons.json    each sport's map picture + the other names a sport goes by
campus-map.json     the campus drawing: buildings, roads, markings, gates
```

---

## organizations.json

A list of orgs. The source is the "Link + Name and Description + Org Head" PDF roster, parsed so the spelling, emails and Facebook handles match it exactly. The orgs are grouped by cluster in this order: Governance (9), Media and Arts (15), Natural Sciences, Engineering and Technology (13), Business (4), Sports and Recreation (6), Environment (2), Food and Agriculture (6), Socio-Cultural (9), Service-Learning (7), Program-Based (1), Religious (3).

| Field | Meaning |
|---|---|
| `id` | short, url-safe, unique. Used in links (`?screen=booth&org=csg`), `featured.json` and `venue.json` |
| `name` / `short` | full name / acronym |
| `tags` | cluster ids from `clusters.json` |
| `keywords` | search words a student might type ("coders", "farm"). Never shown; they only feed the Browse search, which is plain text matching |
| `description` | the org's own one-paragraph blurb. Shown as the booth lede and the card body |
| `emails` | contact addresses |
| `fbUrl` / `fbHandle` | Facebook page. For a numeric `profile.php?id=…` page, leave `fbHandle` out. Never invent a `facebook.com/<name>` path, because it will 404 |
| `logo` | `assets/orgs/<id>.webp` (320 px WebP), or `null` to show initials instead |
| `startup` | `true` = a start-up org (AECO incubation stage). It is a status, not a cluster: the org keeps its cluster and shows a "Start-Up Org" pill |
| `pending` | `true` = long-form copy (description, meeting time) not supplied yet. `fetchOrgFromFacebook()` in `src/js/data/organizations.js` is the slot for it |

**Add an org:** copy an existing entry, give it a new `id`, and put its logo in `assets/orgs/`.

## clusters.json

The 11 clusters. Each has an `id` (what an org's `tags` use), a `short` and a `full` label, and a `color`: `blue`, `red`, `yellow` or `green`, the Google puzzle-piece hue.

## featured.json

| Field | Meaning |
|---|---|
| `enabled` | `false` hides the Featured strip on Discover (no gap is left) |
| `showInBrowse` | `false` folds featured orgs back into Browse's plain list. It only affects Browse's default view (no chip, no search) and works independently of `enabled` |
| `featured` | `[{ "id", "note"?, "cta"? }]`, shown in this order on both pages |

- `id` must match an org exactly. A typo is dropped with a console warning and the rest still renders.
- `note` is a short badge ("Recruiting now").
- `cta` replaces the button text (default: "View CSG →").
- Keep it to about 4–8 orgs.

## events.json

The Events tab. The tab sorts by date itself, works out upcoming / happening now / finished from the clock, and pulls the host org's name, logo and colour from `organizations.json`.

Settings:
- `enabled`, `showFeatured`, `showPast` (false hides finished events), `showStatusFilter`, `showSearch`.
- `defaultDurationMins`: how long an event with no `end` lasts (180).
- `copy`: the tab's headings.

To turn the whole tab off, use `site.json` → `tabs.events.enabled`.

**Add an event** to `events`:

```json
{
  "id": "orientation-2026",
  "title": "Freshie Orientation",
  "org": "csg",
  "start": "2026-09-25T08:00",
  "end": "2026-09-25T12:00",
  "location": "Xavier Gym",
  "description": "One paragraph on what the event is.",
  "link": "https://facebook.com/events/…"
}
```

**Dates:**
- `"2026-09-25"` is a whole day.
- `"2026-09-25T08:00"` is 8:00 AM in the reader's timezone.
- `"2026-09-25T08:00+08:00"` is 8:00 AM Manila time wherever it's read.

The sample events use **relative dates** so the demo always has something upcoming, ongoing and finished: `{ "inDays": 3, "at": "15:00" }` or `{ "hoursFromNow": -1 }`. Real events should use plain date strings.

**Who is holding it:**
- `org` is an org id. The card then shows that org's logo, short name and cluster colour, and the detail view links to its booth.
- `host` is free text for anyone not in the roster (e.g. 'Office of Student Affairs'). Use it instead of `org`, or alongside it to name a co-host.
- Both can be left out; the card just skips that line.

**Optional fields:**

| Field | Meaning |
|---|---|
| `featured` | `true` puts the event in the Featured band at the top |
| `note` | short badge on the card ('Registration open') |
| `cta` | replaces the card's button text |
| `linkLabel` | replaces the detail view's button text |
| `tag` | a cluster id, used only for the card's accent colour when there is no `org` |
| `status` | `auto` (default), `upcoming`, `ongoing` or `finished`. A manual value beats the clock; use it when something is postponed or called early |
| `durationMins` | how long the event runs when there is no `end` |
| `tags` | extra free-text pills ('Free entry') |

**Remove an event:** delete its object. There is nothing else to undo.

## venue.json

The org-fair quad map. Coordinates are in the map's own viewBox units, not pixels.

- `showFairMap`: `true` brings the tent map back in the booth.
- `venue`:
  - `viewBox`, `field`, `stage`, `circles`, `buildings` are the quad drawing.
  - `squares` lists every square on the map. `id` is set only where the printed map numbers the tent; the rest are zone blocks.
  - `zones` gives a legend label and a plain-language position for each colour block.
- `tentWhere`: a plain-language position for each numbered tent.
- `tentOrgs`: who shares each tent, in the printed map's order. Entries that aren't org ids are kept as plain names so students still see who else is there.
- `zoned`: orgs with no tent number, placed by their college colour block.

Orgs that are in neither list aren't placed, and the booth says so instead of guessing.

## site.json

The site's switchboard.

| Key | What it controls |
|---|---|
| `contact` | email block on About. `email: null` removes it; `altEmail` adds an optional second address |
| `locale` / `hour12` | `locale: null` uses the visitor's device locale; `"en-PH"` forces one. Times are read as the visitor's local time unless they carry an offset (`+08:00`) |
| `tabs` | each tab's `enabled`, `navLabel` (desktop) and `sheetLabel` (mobile). `enabled: false` removes the tab from the nav and the router, so a stale `?screen=events` link falls back to Discover |
| `skin` | `defaultSkin` (`txc` = Xavier Cup 2026, `sands` = Sands of Time). `allowToggle: false` hides the Design row and locks everyone to the default |
| `season` | the season line under the brand and in the footer, one per skin |
| `settings` | which rows the gear panel shows (`showAppearance`, `showDesign`, `showMotion`). All off hides the gear |

Discover, Browse and About are always on.

## team-groups.json

The About page team, in three groups (CEO, founders, developers), each with a list of `people`. Each person has:
- `name`, as written in the GDGC 26'27 directory;
- `role`;
- optional `title`, a founder's second position;
- `dept`, for developers only: the part of the project they work on.

Developers are listed by department, lead first. People show in the order listed.

## teams.json

The eight Xavier Cup teams. A game names its sides by team `id` (`["ccs", "eng"]`), and everything printed about a team comes from here, so a rename is a one-line change.

| Field | Meaning |
|---|---|
| `id` | short, url-safe; what games refer to |
| `name` | the team as students say it ("CCS Wizards") |
| `short` | what fits on a small badge ("CCS") |
| `mascot` | the mascot on its own ("Wizards") |
| `college` | the full college name, printed under the team name |
| `logo` | picture in `assets/teams/` (WebP, 1024 px square, transparent) |

A side that isn't one of the eight (e.g. "All colleges") still prints as written.

---

## The Xavier Cup files

The tab works out Upcoming / Ongoing / Finished from the clock and counts the games at each venue by itself. None of that needs touching when you add a match.

### xavier-cup.json → `config`

- `enabled` is the tab's content switch. The nav item itself is `site.json` → `tabs.cup.enabled`.
- `name`, `kicker`, `tagline`, `lede` are the banner text.
- `season` holds `start` / `end` (plain dates). They drive the Discover countdown and the "Day 3 of 11" line.
- `previewNow` is the **preview clock**. While it's set (e.g. `"2026-10-12T15:30"`), the Cup behaves as if it is that moment. Keep it `null` for launch, and keep it `null` while live data is on.

Sections (each one independent; a view left empty loses its tab):

| Switch | What it shows |
|---|---|
| `showHero` | the banner, above every view |
| `showHeroPhotos` | the photo slideshow inside the banner (`photos`) |
| `showTeams` | the "follow your teams" picker, above every view |
| `showFeatured` | the featured match, first card of the chosen day |
| `showSchedule` | Matches: the list, grouped by day |
| `showCalendar` | Matches: the List / Calendar switch (off = list only) |
| `showSports` | the Sports view, one page per sport (currently off) |
| `showBracket` | Sports: each sport's knockout bracket (off = standings show the groups instead) |
| `showMap` | the Map view |
| `showNews` | News & Updates from the Facebook page |
| `showEvents` | News & Updates: the Upcoming Events cards (currently off) |
| `showLegend` | the colour key under the map |
| `showStatusFilter` | All / Live / Upcoming / Results, on one line |
| `showLiveNow` | Matches: the "Live now" row and the Live chip |
| `showComingUp` | Matches: the "Coming up" row and the Upcoming chip |
| `showDiscoverButton` | the Xavier Cup button at the top of Discover (with `discoverButtonLabel` / `discoverButtonNote`) |

Other settings:
- `defaultDurationMins` (90): how long a match with no `end` lasts.
- `defaultStatus`: which status Matches opens on (`all`, `ongoing`, `upcoming`, `finished`).
- `showScores`: show scores on finished cards.
- `maxGamesShown`: cap on the list; `null` = all.

### xavier-cup.json → `live` (the Intramurals Tracker)

Real matches come from the tracker (Google Sheet → n8n → MySQL). `src/js/lib/live-data.js` reads them every `refreshSeconds`:

- `api`: the Campus Compass API (see [`../../api/README.md`](../../api/README.md)).
- `devApi`: tried first on localhost, so a local API can be tested.
- `fallback`: the api.gs data link (same JSON). It runs on Google with usage limits, so it's used only when the API fails or takes longer than `timeoutSeconds`.

While `enabled` is true, `cup-games.json` is ignored and "Updated X min ago" shows. Set it to `false` to go back to the sample games.

- `venues`: venue names as the sheet writes them → map venue ids. Matching ignores capitals and extra spaces. A venue not listed still shows on its matches, just not on the map. The venue plan's `sheetNames` get joined in while the plan is on. These names are still samples; confirm them with the database lead.
- `colleges`: sheet college codes → team ids. PRIMUS was COLOSSUS until Oct 15, and both point to the same team. NSG, COE, SOL and SOM are codes some schedules use (CODM's).
- `sports`: sheet sport names → the site's sport, plus an `event` when the site shows it as a category of another sport ("Basketball 3x3" → Basketball, event "3x3"). A sport not listed keeps its name.

### xavier-cup.json → `news`

The newest posts from the TXC Compass Facebook page, including reshared departmental posts (each carries its department as `tag`).

- They arrive through `feed`, a news Worker on Cloudflare that reads the page through the Graph API every 15 minutes. Its token stays a Cloudflare secret, so no token ships with the site. The Worker's code isn't in this repo.
- A bare file name in `feed` is read from the data folder. `null` = use the hand-written `posts` only.
- If the feed is empty or unreachable, the hand-written `posts` show instead (newest first). They are placeholders, so keep them current or empty them.
- A post's `sport` (or a hashtag like `#Basketball` in a feed post) also puts it on that sport's page.
- `pageUrl` / `pageHandle` still point at XUCSG; set them to the TXC Compass page's real address.
- Reels show only if the feed gives a picture for them:
  - `hideReelsWithoutPhoto` leaves out a reel with no picture, or one that won't load;
  - `hideAllReels` leaves out every reel;
  - `requirePhoto` leaves out every post without a picture.
- `embed` is Facebook's own page widget. It's off by default; it needs no token, but it won't render for readers who block third-party frames.

### xavier-cup.json → `events`

The Upcoming Events cards under the news, shown in order. Each card has:
- `team`: a team id; the card prints that team's name and crest;
- `photo`: a file in `assets/events/`, under ~200 KB and about 900 px wide; `null` = the team crest on navy;
- `title` and `description`: the card text.

### xavier-cup.json → `photos`

The banner slideshow, one slide every `secondsPerSlide`. Each slide has:
- `src`: a photo in `assets/cup/photos/`, under ~300 KB. It can be landscape (about 1600×900) or a portrait poster (4:5, 1600×2000). A poster fills the tall phone banner, and on a wide screen it stands whole at the right over a blurred copy of itself. `null` = a placeholder graphic.
- `alt`: what the photo shows, for screen readers.
- `caption`: an optional short label.

The current slides are the Xavier Cup's 17.10.26 posters, one per sport.

### cup-venues.json

The campus itself is drawn in `campus-map.json`. This file covers what changes with the season: which buildings are venues, where each sport's icon sits, and the outside venues.

**`campusVenues`** are the three campus venues. **`planVenues`** are the venues the plan adds, used only while the plan is `"new"`. Each venue has:

| Field | Meaning |
|---|---|
| `id` | what games use as their `venue` |
| `footprint` | the building in `campus-map.json` (defaults to `id`). Its footprint lights up and becomes tappable |
| `name` / `short` | full name / the name tag on the map |
| `label` | `[x, y]` where the name tag sits on the drawing |
| `gps` | optional `[longitude, latitude]`, for Google Maps |
| `indoor` | `true` for roofed venues |
| `note` | the walking-directions line |
| `icons` | where each sport's icon sits: `{ "at": [x, y], "gps"?: [...] }`. A sport shows only once a game is played there; one with no spot is placed above the name tag |

Positions are in the drawing's own units (the same numbers as `campus-map.json`), so they never change when the map is resized or zoomed.

**Outside venues** go in `planVenues` with `"venueType": "off-campus"` and no map spot; they sit in the "Outside campus" list. Add `address` and `gps` once confirmed and they get an Open in Google Maps button. Never guess a venue from a sport.

**`plan`** says which sport is played where, from the sports office's list. On its own (no games needed), it puts each planned sport's icon on the map, tells the tracker where to file a match when the sheet's venue name is unknown, and fills the venue panel.

| Field | Meaning |
|---|---|
| `version` | `"new"` = this plan (default). `"old"` = three campus venues, icons only where a game exists, no overrides. For a quick look without editing, add `?venues=old` to the page address |
| `sports` | `{ "sport", "venue" }`. `sport` is the name in `cup-sports.json`; `venue` is a venue id, or `null` for no venue yet (Lawn Tennis, Debate). Optional: `note`, and `tentative: true` (shown as "to be confirmed") |
| `overrides` | sports whose tracker rows are always filed under one venue, e.g. Megacrew → Gym (placed by the sports office, not the tracker). `place` is the name shown; `note` is the badge on the card |
| `placement` | icon and name-tag spots for venues with several sports. They're applied on top of the venue's own spots, so the old version keeps its originals |
| `sheetNames` | extra spellings the tracker sheet uses for each venue |

`map.showOffCampus` shows or hides the Outside campus list.

### cup-sports.json

**`sports`** has one entry per sport, grouped like the Intramurals 2026-27 General Guidelines (major events: 100/70/50 points to the top three; minor: team 20/14/10, individual 10/7/5; bonus: 20/14/10). The Sports tab and the Matches filter list them A to Z.

| Field | Meaning |
|---|---|
| `id` | url-safe, lower case; used in links (`?tab=sports&sport=football`) |
| `name` | spelled exactly as games write it |
| `icon` | the sport's map marker picture (tiles and cards use its pictogram) |
| `photo` / `photos` | wide header photo / extra photos `[{ "src", "alt" }]` |
| `categories` | what the sport is split into, in page order: `Men`, `Women`, `Mixed`, or event + division (`100m · Men`). Leave it out for one category |
| `format` | `versus` (default): college vs college, with standings and a bracket. `field`: everyone competes at once (races, routines), so no standings |
| `bracket` | tournament format, a name from `brackets` (or `{ "default": name, "<event>": name }`). Leave it out for one table → semifinals → final |
| `groups` | per event, the teams each group draws, `{ "A": [ids], "B": [ids] }`, for tracker games that don't say their group |

Notes on specific sports:
- Basketball 3x3 is a category of Basketball: sport `Basketball`, event `3x3`.
- Football is 8-a-side.
- The Esports events are each Open. CODM runs two groups of four, then double elimination (Oct 20–22).

**`brackets`** describe how a versus sport goes from group games to a champion, copied from the TXC2026 Game Schedules folder:

| Field | Meaning |
|---|---|
| `groups` | group letters; `[]` = one table for everyone |
| `note` | one line under the standings: who goes through |
| `quarters`, `semis` | that round's games, in order, as the schedules write them: `A1` = 1st in group A, `#1` = 1st overall, `W A3/B2` = winner of A3 vs B2 |
| `final`, `third` | the final and third-place game; `null` = no slot until a game is set |
| `tree` | two groups only: the draw as two halves (a seed `"A1"` or `{ "quarter": i }`) |
| `placings` | games for places below the podium |
| `double` | `true` = double elimination after the semis (Upper finals, Lower round 1, Lower finals, Grand finals) |

A sport that plays games but is missing from `sports` still gets a page.

### cup-games.json

Sample matches, used **only while `live.enabled` is false**. They're sample content for the Oct 10–20 season; replace them wholesale with the official schedule.

| Field | Meaning |
|---|---|
| `id` | unique, url-safe (`?game=…`) |
| `sport` | exactly as in `cup-sports.json` ('Football', 'Esports') |
| `event` | optional event within the sport ('100m', 'ML', 'CODM') |
| `division` | optional: `Men`, `Women`, `Mixed`, `Open`. With `event` it makes the category ("100m · Men") |
| `round` | optional: `Elimination` / `Round 1`, `Quarterfinal`, `Semifinal`, `Final`, `Third place`, placing games, or the double-elimination rounds. Finished group games make the standings; the others fill the bracket |
| `group` | optional group letter ('A'); games with a group make one table per group |
| `teams` | `[home, away]` team ids. Anything else prints as written (`["All colleges"]`) |
| `venue` | a venue id |
| `start` / `end` | kickoff / optional end (else `defaultDurationMins`) |
| `status` | `auto`, `upcoming`, `ongoing` or `finished`. Manual beats the clock (postponement, walkover) |
| `winner` | optional `home` / `away`, for when the score doesn't say (penalties, walkover) |
| `score` | `{ "home": 0, "away": 0 }`, shown once the match has started |
| `description`, `link`, `note` | detail paragraph, external link, short card badge ('Championship') |
| `featured` | `true` = the day's featured match when nothing is live or still to start |

### sport-icons.json

`assets` maps a sport id to its map picture in `assets/sports/` (lowercase kebab-case file names). `aliases` lists other names the same sport goes by ("Ping Pong" → table tennis). Matching ignores capitals, spaces and symbols. This file is an artwork lookup only: `cup-sports.json` and the tracker still decide the official sports. Generic "COD" stays unmatched until its game is confirmed.

### campus-map.json

The Xavier main campus, drawn flat from the university's flat campus plan, turned so the soccer field is on the left and Corrales Avenue runs down the right. Positions are in drawing units (one plan pixel = 0.93 units), not GPS. `src/js/lib/campus-view.js` turns this into the flat or 3D view, so a building is only ever placed once, here.

| Key | Meaning |
|---|---|
| `view` | `default` (`flat` / `3d`); `toggle` shows the Flat/3D button; `slant` (code only) tilts the flat view |
| `drawing` | the viewBox: `0 top width height` |
| `outline`, `road`, `walkways` | campus edge, Corrales Avenue, roads and corridors (`pts` = corners) |
| `footprints` | buildings: `id` (venues point at these), `name`, `lines` (label lines), `points` (polygon), `center` (label spot), `h` (3D height, 0 = flat), `kind` (`field`, `court`, `gym`, `church`), `small` (smaller label) |
| `markings` | court and pitch lines; `on` = the footprint they sit on; a circle is `[x, y, r]`; `stripes` = mown-grass polygon |
| `landmarks` | gates and other things you navigate by; `ticks` = gate bars; `along` = label runs along Corrales Avenue |

Venues and icon spots are **not** set here; they live in `cup-venues.json`.
