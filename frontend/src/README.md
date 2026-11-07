# How the code works

The site's code: plain HTML, CSS and vanilla JavaScript modules. There's no framework and no build step. The **content** (orgs, games, settings) lives in the top-level [`database/`](../../database/README.md) folder, and nothing in `js/screens/` or `js/components/` holds content. If you find yourself editing a template to change a word, the word belongs in a database file.

## Files

```
css/
  tokens.css        THE ONLY file with colour values (light + dark, both designs)
  base.css          reset, body, type defaults, focus ring, reduced motion
  layout.css        page-level layout: widths, section grid, breakpoints
  animations.css    every @keyframes block
  skins.css         the design switch: which scene/structure each skin paints
  mobile.css        the phone pass, loaded after everything else
  tweaks.css        hand adjustments saved by the layout tool, loaded last
  tweaks-history.json  the layout tool's save history
  components/       one file, one component. Never reach into a sibling
  screens/          landing, browse, booth, events, cup, about
js/
  main.js           entry: hydrate, start the router, observers, delights
  router.js         screen switching driven by the URL query string
  appearance.js     theme + design + motion, saved per device
  settings.js       the gear button and its panel
  theme-toggle.js   light/dark toggle
  nav-sheet.js      the mobile nav sheet (≤820px)
  compass-orientation.js  the nav compass points at the current screen
  reveal-observer.js      one shared IntersectionObserver + watchReveals()
  tweak.js          the layout tool (?tweak): move words and boxes by hand
  data/             thin loaders: read database/*.json, add lookups and logic
  lib/              helpers with no markup (dates, live data, standings, map maths)
  components/       functions that return HTML for one piece of UI
  screens/          one file per screen: state, events, rendering
```

**`js/lib/`**

```
dates.js            every date the site prints + Upcoming/Ongoing/Finished logic
html.js             escaping and link-safety helpers
live-data.js        the Xavier Cup's real matches: API first, api.gs fallback
standings.js        results → standings + knockout bracket, per sport
my-team.js          the teams a visitor follows (saved per device)
venue-plan.js       what the venue plan means for one sport or venue
post-filter.js      which news posts are fit to show
adaptive-tone.js    readable words on any post picture
campus-view.js      which way the campus map is drawn (flat or 3D)
cup-map-camera.js   map camera maths: zoom, pan, pinch (drawing units)
cup-map-locations.js  venue registry helpers: off-campus, GPS, Google Maps links
```

**`js/components/`**

```
card.js, chip.js, search-shell.js, booth.js, facebook-card.js, featured.js
                    Browse and the booth: org card, filter chip, search, booth, FB card, featured orgs
venue-map.js        the org-fair quad, one org lit at a time
event-card.js, event-detail.js        one event as a card / in full
status.js           the Upcoming / Ongoing / Finished pill
modal.js, detail-modal.js             modal open/close + focus trap / the shell events and games share
bento-hero.js, discover-*.js          the Discover tiles (hero numbers, games, map, teams, updates, Cup button, program flow)
game-card.js, game-detail.js, match-card.js   one Xavier Cup match: resolved, in full, as a card
featured-match.js   which game to feature on a day
team-strip.js       the eight teams as pickable tiles
cup-calendar.js     the season as a month
cup-map.js          the Xavier Cup campus map + venue panel
cup-off-campus.js   the Outside campus list
sports.js           the Sports view: sport grid, sport page, team page
sport-pictograms.js one pictogram per sport (CC0 SVGs from svgrepo.com)
```

---

## Screens and router

Discover, Organizations, Events, The Xavier Cup and About.

- **Landing:** static HTML in `index.html` under `#screen-landing`, hydrated by `screens/landing.js`.
- **Browse:** skeleton in `#screen-browse`; filter state and rendering in `screens/browse.js`.
- **Booth:** opens as a **modal**, not a separate route. `renderBooth(id)` in `screens/booth.js` puts `boothHtml()` into `#booth-modal`.

`js/router.js` handles these URLs:

- `/` → landing
- `?screen=browse`, `&filter=<id>` or `&filters=a,b` (preselected chips), `&q=<text>` (search)
- `?…&org=<id>` → opens the booth modal on any screen
- `?screen=events`, `&event=<id>` opens one, `&status=…&q=…` filter
- `?screen=cup`, `&game=<id>` opens a match, `&tab=matches|sports|map|news` picks a view (Matches is the default; old `tab=fixtures` / `tab=calendar` links land on Matches):
  - on Matches: `&status=…&sport=…&venue=…&day=YYYY-MM-DD&view=calendar`
  - on Sports: `&sport=<id>&div=<division>&team=<id>`
  - on Map: `&venue=<id>`

A tab switched off in `site.json` is refused by the router: an old link lands on Discover, and its nav entry is removed from the page rather than hidden.

## Designs and themes

There are three settings, each saved per device and switched from the **gear icon**:

- **Design (`data-skin`)**
  - `txc` is **Xavier Cup 2026**, the default. Discover opens on a grid of tiles: a navy headline tile with the org search, a lime season tile, a live-match strip, the eight team sprites and the cluster tags. Fonts are Archivo (display) and Figtree (reading). The palette is at the bottom of `tokens.css`, the structure at the bottom of `skins.css`, and the tiles are `components/bento-hero.*`.
  - `sands` is the original **Sands of Time** beach: sea, surf, hourglass, palms, and the closing tide scene.
  - Both designs are in the markup at once and `skins.css` shows exactly one, which is why the switch is instant. The default is `site.json` → `skin.defaultSkin`.
- **Theme (`data-theme`):** light and dark, for either design. Dark under Sands of Time is "night at the beach".
- **Motion (`data-motion`):** Full / Reduced. `prefers-reduced-motion` is still honoured on its own.

A small inline script in `<head>` applies all three before first paint, so the page never flashes the wrong design. `appearance.js` takes over after that. The season wording comes from `site.json` → `season` and is stamped onto any `[data-season]` element.

## The Xavier Cup

- **Status:** Upcoming / Ongoing / Finished comes from the clock (`lib/dates.js`). The tab re-checks every 60 seconds, so a match goes live while the page is open. A manual `status` beats the clock, which is how a postponement is shown.
- **Live data:** `lib/live-data.js` reads the tracker snapshot (the Campus Compass API, then the api.gs fallback) and refills `GAMES`. Then it fires `cup:data`, so open views repaint at once. While live data is on, the sample games are never shown.
- **Layout:** a shared header (a full-screen photo slideshow), then four views under a sticky tab bar:
  - **Matches:** a win counter, the "Follow your teams" picker, one Filter button (day, status, venue, sport), a List / Calendar switch, then rows for Live now, Upcoming and Finished recently, with followed teams first.
  - **Sports:** a tile per sport. Each sport page shows its news, its standings and bracket from `lib/standings.js`, and its matches per division. A team opens that team's games.
  - **Map:** the venue map.
  - **News & Updates:** the newest post as a wide tile, the rest in a looping carousel with a "See all" grid, then the Upcoming Events cards.
- **Follow your team** is saved per device and shared with Discover (`lib/my-team.js`).

### The map

- **Camera:** it starts close enough to read on phones, supports drag, pinch, wheel, double tap, keyboard arrows, +/− and recenter (Home), and survives match refreshes and tab changes.
- **Venue panel:** a selected venue opens a translucent floating panel on desktop, or a collapsible sheet up to 1000px wide. The camera keeps selected markers clear of the panel.
- **Full screen:** the Map view fills the screen below the nav and tabs; its banner is hidden only while Map is active.
- **Flat and 3D:** the campus and every pin are stored once, flat, in `campus-map.json` / `cup-venues.json`. `lib/campus-view.js` draws them flat (the default) or in **3D**, tilted with each building raised by its `h`. A pin on a raised building rides up with its roof, and a visitor's choice is remembered.
- **Outside locations:** keep one venue record per place, with `venueType: "off-campus"` (see the database README). `map.showOffCampus` shows the Outside campus panel. It lists ongoing games (whatever their day) and today's upcoming games, using the same resolved matches and `cupNow()` as everything else. Valid coordinates add a Google Maps link (converted to latitude,longitude). Missing coordinates never hide venue info. There's no navigation or GPS tracking.

### Venue plan

The plan switches between two versions (`cup-venues.json` → `plan.version`). Add `?venues=old` or `?venues=new` to the address to compare them without editing anything. `test/venue-plan-old.test.mjs` keeps the old version working.

| | `new` (shown) | `old` |
|---|---|---|
| Venues | Soccer Field, Covered Court, Gym, **Main Library** (Chess), and the outside venues **XU Uptown Sports Centre**, **Homecourt**, **Virtual Grounds** | the first three only |
| Map icons | every planned sport's icon is at its venue, games or not | an icon only where a game exists |
| Tracker | new venue spellings are matched; a row with no venue goes to its sport's planned venue; overrides apply | as before |
| Panels | "Planned here" lines, plus the sports with no venue yet | none |

The current plan:

| Venue | Sports |
|---|---|
| XU Uptown Sports Centre | Athletics, Swimming |
| Covered Court | Badminton, Sepak Takraw, Table Tennis, Volleyball |
| Gym | Basketball, Karatedo, Taekwondo (to be confirmed), Darts, Cheerdance; Mega Crew on Saturday |
| Library | Chess |
| Soccer Field (XU Field) | Football, Softball, Ultimate Frisbee |
| Homecourt | Pickleball |
| Virtual Grounds | Esports (Valorant, with the ML and CODM finals) |

**Lawn Tennis and Debate have no venue yet.**

**Mega Crew is overridden:** every Mega Crew row is filed under the Gym, whatever the sheet says, with the badge "Sat · Gym". Its date and time still come from the tracker. Remove the override to hand the venue back to the sheet.

### Sport artwork

`data/sport-icons.js` connects the transparent WebP sport pictures in `assets/sports/`. `sportIconFor(name)` ignores case, spaces and hyphens and knows the aliases (Basketball3x3, ESports Dota, ESports MLBB…). Map markers, match cards, outside games and automatic Sports entries use it, and explicit icons in `cup-sports.json` win. The Sports view is currently switched off (`config.showSports`).

## The layout tool

Add `?tweak` to the address, or press Ctrl+Alt+T, while the site runs on your computer:

1. **Pick** a word or box.
2. Drag it, nudge it with the arrow keys, or type numbers.
3. **Save.** This writes to `css/tweaks.css`; commit it to share it.

Full instructions are at the top of `js/tweak.js`.

## Facebook integration slot

`fetchOrgFromFacebook(handle)` in `js/data/organizations.js` is a stub that returns `null`. When it's wired to the Graph API, return an object shaped like an org entry (description, meets) and the booth re-renders with it.

## Deliberately left out (from `DESIGN.md`)

1. The prototype banner and floating screen-index chip were dropped; this ships as a product, not a prototype.
2. The **Sign in / Add my org** buttons are visual only; there's no auth or form yet.
3. The **Save to my list / Join this org** buttons in the booth are stubs.
4. "For orgs" was dropped. Events has its own screen, and The Xavier Cup sits beside it.

## Illustrations

Reusable illustration groups from the mockups (`assets/mockups/`, do not modify) are exported to `assets/illustrations/`:

| Mockup group | File |
|---|---|
| `#Compass-Icon` | `compass-rose.svg` (inlined in the nav for `currentColor`) |
| `#Sea-Scene` | `sea-scene.svg` (also inlined in `index.html` so the CSS animations bind to its groups) |
| `#GDG-Credit` | replaced by the official logo, `assets/brand/gdg-xavier-logo.webp` |
| 4 puzzle pieces + starfish | `primitives/*.svg` |

The sailboats, birds, sparkles and wave lines live inside `sea-scene.svg`. To change them, edit it **and** the inline copy in `index.html`.
