# Campus Compass

> **Xavier University – Ateneo de Cagayan** · A campus-wide directory of every student
> organization, plus the campus events calendar and **The Xavier Cup** season.
> Created by **GDG on Campus – Xavier Ateneo**.
>
> The site ships in the **Xavier Cup 2026** design: navy, lime and cream tiles, merged in
> from the TXC proposal. The **World Cup** pitch and the original **Sands of Time** beach
> are still here in full and can be switched to from the gear icon in the nav.

Static HTML / CSS / vanilla JS. No frameworks, no build step, no npm dependencies.

---

## The one-minute version

Five screens: **Discover · Organizations · Events · The Xavier Cup · About**.

Everything you are likely to want to change lives in `src/js/data/`:

| I want to… | Edit |
|---|---|
| Add or remove an event | `data/events.js` → `EVENTS` |
| Add a fixture, a venue, or a news post | `data/xavier-cup.js` |
| Rename a team or swap its sprite | `data/teams.js` |
| Add an Upcoming Events card (News & Updates) | `data/xavier-cup.js` → `CUP_EVENTS`, photo in `assets/events/` |
| Change the season dates or preview the season on a set date | `data/xavier-cup.js` → `CUP_CONFIG.season`, `CUP_CONFIG.previewNow` |
| Turn a whole tab off, rename it, change the contact e-mail | `data/site.js` |
| Change which design the site opens in | `data/site.js` → `skin.defaultSkin` |
| Feature an org on Discover/Browse | `data/featured.js` |
| Add or correct an org | `data/organizations.js` |

No file in `src/js/screens/` or `src/js/components/` contains content. If you find
yourself editing a template to change a word, the word belongs in a data file.

---

## Run it

### Option A — local server (recommended, works in every browser)

```bash
cd C:\Users\jmark\campus-compass
python -m http.server 8765
```

Then open **http://localhost:8765** in any browser.

### Option B — double-click `index.html`

Works in **Firefox** out of the box.
**Chrome/Edge** block ES-module imports on `file://` URLs, so use Option A there.

---

## Folder layout

```
campus-compass/
├── index.html                       # single-page entry — imports everything below
├── DESIGN.md                        # provided spec (source of truth for content)
├── README.md                        # this file
│
├── src/
│   ├── css/
│   │   ├── tokens.css               # THE ONLY file with color values (light + dark)
│   │   ├── base.css                 # reset, body, typography stacks, focus ring, reduced-motion
│   │   ├── layout.css               # page-level layout: max-widths, section grid, responsive breakpoints
│   │   ├── animations.css           # every @keyframes block (drift, wave, sand, reveal, modal…)
│   │   │
│   │   ├── skins.css                # Xavier Cup 2026 ⇄ World Cup ⇄ Sands of Time: which scene is painted
│   │   │
│   │   ├── components/              # one file, one component. Never reach into a sibling.
│   │   │   ├── nav.css              # top navigation bar
│   │   │   ├── status.css           # Upcoming / Ongoing / Finished pill
│   │   │   ├── detail.css           # inside of the shared event/fixture modal
│   │   │   ├── cup-map.css          # Xavier Cup venue map, pins, venue panel
│   │   │   ├── settings.css         # the gear panel and its segmented controls
│   │   │   ├── bento-hero.css       # Discover tiles (Xavier Cup 2026 design)
│   │   │   ├── team-strip.css       # the eight team tiles
│   │   │   ├── match-card.css       # fixture card + featured match frame
│   │   │   ├── cup-calendar.css     # season calendar
│   │   │   ├── nav-sheet.css        # mobile hamburger sheet (<=820px)
│   │   │   ├── venue-map.css        # org-fair map panel in the booth
│   │   │   ├── button.css           # .btn base + --primary, --sun, --ghost, --back
│   │   │   ├── search-shell.css     # search input + submit (hero + compact variants)
│   │   │   ├── tag.css              # cluster pill (hero, card, booth variants)
│   │   │   ├── chip.css             # filter chip w/ active state + intersection preview
│   │   │   ├── card.css             # org card (accent rail) + ghost placeholder variant
│   │   │   ├── panel.css            # generic content panel + pending variant
│   │   │   ├── facebook-card.css    # FB page mockup (with "Preview" chip)
│   │   │   ├── theme-block.css      # 4-color legend explainer
│   │   │   ├── sea-scene.css        # ocean layer / foam / lines / sparkles / boats / birds bindings
│   │   │   ├── footer.css           # sand footer + GDG credit + footprints delight
│   │   │   ├── filter-note.css      # intersection callout
│   │   │   └── modal.css            # booth-as-modal shell
│   │   │
│   │   └── screens/
│   │       ├── landing.css          # hero stage, primitives positioning, dune divider
│   │       ├── browse.css           # explore-head, chip row, grid layout
│   │       ├── booth.css            # booth split (rendered inside modal panel)
│   │       ├── events.css           # Events tab
│   │       └── cup.css              # The Xavier Cup tab
│   │
│   ├── js/
│   │   ├── main.js                  # entry: hydrate + init router + observers + delights
│   │   ├── router.js                # SPA screen switching driven by URL query string
│   │   ├── appearance.js            # theme + design skin + motion, persisted to localStorage
│   │   ├── settings.js              # the gear panel
│   │   ├── lib/dates.js             # every date the site prints + the status logic
│   │   ├── lib/html.js              # escaping + link safety for the newer templates
│   │   ├── lib/my-team.js           # the team a visitor follows (saved per device)
│   │   ├── reveal-observer.js       # shared IntersectionObserver + watchReveals()
│   │   │
│   │   ├── footprints.js            # delight #1 — footprints in the sand footer
│   │   ├── compass-orientation.js   # delight #2 — nav compass points to current screen
│   │   ├── tag-intersection.js      # delight #4 — chip hover previews intersection
│   │   ├── nav-sheet.js             # mobile nav sheet open/close + focus
│   │   ├── components/venue-map.js   # the fair map, one org lit at a time
│   │   ├── data/venue.js             # the quad, its tents, who stands where
│   │   │
│   │   ├── data/
│   │   │   ├── site.js              # THE SWITCHBOARD — tabs, contact, default skin, season words
│   │   │   ├── categories.js        # CATEGORIES[], SHORT_LABEL, FULL_LABEL, COLOR_OF, THEME_OF
│   │   │   ├── events.js            # EVENTS[] + the Events tab's own switches
│   │   │   ├── xavier-cup.js        # CUP_CONFIG (season, preview clock), CUP_MAP, GAMES[], CUP_NEWS
│   │   │   ├── teams.js             # the eight Xavier Cup teams + sprites
│   │   │   ├── cup-posts.json       # CSG Facebook posts, written by the GitHub Action
│   │   │   └── organizations.js     # ORGS[] and fetchOrgFromFacebook(handle) STUB
│   │   │
│   │   ├── components/
│   │   │   ├── card.js              # cardHtml(org, i) + ghostCardHtml()
│   │   │   ├── chip.js              # chipHtml + renderChipRow()
│   │   │   ├── search-shell.js      # attachSearchShell(), setSearchValue()
│   │   │   ├── booth.js             # boothHtml(org) — big booth template
│   │   │   ├── facebook-card.js     # fbCardHtml(org)
│   │   │   ├── status.js            # the Upcoming / Ongoing / Finished pill
│   │   │   ├── event-card.js        # one event as a card (+ the search matcher)
│   │   │   ├── event-detail.js      # the event modal's contents
│   │   │   ├── game-card.js         # one fixture as a card, sport glyphs, scoreline
│   │   │   ├── game-detail.js       # the fixture modal's contents
│   │   │   ├── cup-map.js           # the consolidated venue map + pins
│   │   │   ├── match-card.js        # one fixture as a match card
│   │   │   ├── team-strip.js        # team picker
│   │   │   ├── featured-match.js    # which game to feature on a day
│   │   │   ├── cup-calendar.js      # the season as a month
│   │   │   ├── bento-hero.js        # live parts of the Discover tiles
│   │   │   ├── detail-modal.js      # the shell events and fixtures share
│   │   │   └── modal.js             # openModal / closeModal + focus trap + Esc
│   │   │
│   │   └── screens/
│   │       ├── landing.js           # tag cloud hydration + hero search wiring
│   │       ├── browse.js            # filter state + intersect + grid render
│   │       ├── events.js            # date ordering, status filter, search, detail
│   │       ├── cup.js               # counters, search, map, venue panel, fixtures, news
│   │       └── booth.js             # renderBooth(id) — opens booth-modal
│   │
│   └── html/                        # (unused — screens are hydrated by JS, no partials)
│
└── assets/
    ├── illustrations/               # redrawn cleaner than the mockups (per project decision)
    │   ├── compass-rose.svg
    │   ├── sea-scene.svg            # (also inlined in index.html so CSS binds to layers)
    │   ├── gdg-credit.svg           # sun mark
    │   └── primitives/
    │       ├── puzzle-red.svg
    │       ├── puzzle-blue.svg
    │       ├── puzzle-yellow.svg
    │       ├── puzzle-green.svg
    │       └── starfish.svg
    │
    └── mockups/                     # original reference SVGs (do not modify)
        ├── org-finder-01-landing.svg
        ├── org-finder-02-browse.svg
        ├── org-finder-03-booth.svg
        └── org-finder-04-mobile-landing.svg
```

---

## Where things live

### Categories (11 clusters)
`src/js/data/categories.js` — one edit updates everywhere: chip row, tag cloud, card tags, booth tags, legend copy.

### Orgs (75)
`src/js/data/organizations.js` — pure data, generated from the official roster PDF
("Link + Name and Description + Org Head"), so names, e-mails and Facebook handles
match the source exactly.

* **75 orgs across 11 clusters** (the roster adds **Religious** to the original ten).
* **All 75 have logos**, re-encoded to 320px WebP in `assets/orgs/` — from the
  roster PDF except XU-XCEED and IIEE, whose page pictures were supplied
  separately. Cards still fall back to initials when `logo` is null, though
  nothing needs that at present. XELLO's roster artwork is a cover photo with
  the seal small and centred, so its WebP is a centre crop on the seal rather
  than the whole picture.
* **Three are start-up orgs.** ATTG, Kazoku and Forerunners carry
  `startup: true`, which renders a "Start-Up Org" pill on the card and in the
  booth. It is a *status*, not a cluster — they still carry their normal
  cluster tag and still turn up under that chip.
* Every entry carries `pending: true` — the long-form copy (description, meeting
  time, officers, events) is not in the roster. `fetchOrgFromFacebook(handle)` is
  the slot for it.

### The three screens
- Landing: static HTML in `index.html` under `#screen-landing`; tag-cloud hydration in `src/js/screens/landing.js`.
- Browse: static skeleton in `#screen-browse`; filter state + render loop in `src/js/screens/browse.js`.
- Booth: renders as a **modal** (not a separate route). Opened by `renderBooth(id)` in `src/js/screens/booth.js`, which composes `boothHtml()` from `src/js/components/booth.js` into `#booth-modal`.

### Router
`src/js/router.js` — URL query drives the app:
- `/` → landing
- `?screen=browse` → browse
- `?screen=browse&filter=<id>` or `?filters=a,b` → browse with preselected chip(s)
- `?screen=browse&q=<text>` → browse w/ search query
- `?…&org=<id>` → open the booth modal (independent of screen)
- `?screen=events` → events; `&event=<id>` opens one; `&status=…&q=…` filter the list
- `?screen=cup` → the Xavier Cup; `&game=<id>` opens a fixture;
  `&venue=<id>` selects a venue on the map; `&status=…&sport=…` filter the list;
  `&tab=map|fixtures|calendar|news` opens one of its four views

A tab switched off in `data/site.js` is refused by the router — an old link to it
lands on Discover rather than an empty screen, and its nav entry is removed from the
DOM entirely rather than hidden.

### Designs and themes

Two axes, both saved per device and both switchable from the **gear icon** in the nav:

**Design (`data-skin`)**
- `txc` — **Xavier Cup 2026**, the default. No painted scene: Discover opens on a grid of
  tiles (a navy headline tile with the org search, a lime season tile, a live-match
  strip, the eight team sprites, the cluster tags). Archivo set expanded for display,
  Figtree for reading, both from Google Fonts. Palette and contrast rules are at the
  bottom of `tokens.css`; the structural rules are at the bottom of `skins.css`; the tiles
  are `components/bento-hero.css` + `.js`.
- `worldcup` — Floodlit stadium hero, pitch stripes, trophy in the
  lockup, bunting in the corners, green-and-gold palette.
- `sands` — the original **Sands of Time** beach, untouched: sea, surf, hourglass,
  palms, the closing tide scene.

Both designs exist in the markup at the same time and exactly one is shown
(`src/css/skins.css`), which is what makes the switch instant. Colour lives in
`tokens.css`; structure lives in `skins.css`. The default is set in
`data/site.js → skin.defaultSkin`, and `skin.allowToggle: false` locks everyone to it.

The season wording (brand subtitle, hero tagline, footer line) comes from
`data/site.js → season`, one set per design, stamped onto any `[data-season]` element.

**Theme (`data-theme`)**
- Light and dark, for either design. Dark is *night at the beach* under Sands of Time
  and *a floodlit night match* under World Cup.

**Motion (`data-motion`)** — a third row in Settings, so someone whose OS says one
thing can still ask this site for the other. `prefers-reduced-motion` is still honoured
on its own.

All three are applied by a small inline script in `<head>` before first paint, so the
page never flashes the wrong design. `src/js/appearance.js` owns them after that.

### The Xavier Cup

`data/xavier-cup.js` holds four independent things: `CUP_CONFIG` (which sections
appear at all), `CUP_MAP` (the campus map — landmarks and venues in viewBox units),
`GAMES` (the fixtures) and `CUP_NEWS` (the posts).

Upcoming / Ongoing / Finished is worked out from the clock in `lib/dates.js`, and the
tab re-checks every 60 seconds so a match goes live while the page is open. A manual
`status` on a fixture beats the clock — that is how a postponement is expressed.

**Teams.** Fixtures name their sides by id (`teams: ['ccs', 'eng']`); names, colleges and
sprites come from `data/teams.js`. Anything that is not a team id prints as written, so
`['All colleges']` still works for an all-in event.

**Preview clock.** `CUP_CONFIG.previewNow` can pin "now" to a moment in the season
(e.g. `'2026-10-12T15:30'`) so the tab can be reviewed with games live and finished
before Oct 10; the banner says so while it is on. It is `null` (the real clock) on `main`.

**From the TXC proposal:** follow your team (saved per device, shared with Discover —
`lib/my-team.js`), a featured match per day with a day pager, the season calendar, and
match cards with the score or kickoff time boxed between the two teams
(`components/match-card.js`).

**News from Facebook.** `.github/workflows/facebook-news.yml` runs every hour, reads the
CSG page through the Graph API, and writes `src/js/data/cup-posts.json`, which the News
section reads. Setup: add a Page access token as the repository secret `FB_PAGE_TOKEN`.
It reads the TXC test page by default; set the repository variable `FB_PAGE_ID` to point
it at the real CSG page. Until the file has posts, the hand-written `CUP_NEWS.posts` show.

**Layout.** The tab is four views under a sticky tab bar, as in the TXC proposal:
**Map** (banner, counters, venue map), **Fixtures** (follow your team, featured match,
the full list with status and sport filters), **Calendar** (team picker and the season
month) and **News & Updates** (the newest post as a wide tile, the rest in a looping
carousel with a "See all" grid, then the Upcoming Events cards from `CUP_EVENTS`). The open view is kept in `?tab=map|fixtures|calendar|news`.
The fixture search box was removed; the sport and status chips cover filtering.

There is a wireframe pack for this tab (`xavier-cup-wireframes.pdf`) covering the
desktop and mobile layouts, component anatomy, states and URLs.

### Events

`data/events.js`. Add an object, save. The tab sorts by date on its own — ongoing
first, then soonest upcoming, then most recent result — and pulls the host org's name,
logo and cluster colour from `organizations.js` when the event names an `org`.

---

### Facebook pages without a vanity handle

Five pages in the roster have no vanity handle — GEMS, OSAS, CMMA and
Forerunners are numeric `profile.php?id=…` links, and Kazoku is a legacy
`/Name-<digits>/` URL. They carry `fbHandle: null`, and the card, booth and
page card print the page's own address instead of a generic "Facebook page"
label — never `facebook.com/<display name>`, which would not resolve.

## Facebook API integration slot

`fetchOrgFromFacebook(handle)` in `src/js/data/organizations.js` is a stub that returns `null`. When you wire it up to the real Graph API, return an object shaped like the GDG record — the booth will re-render as soon as data arrives, replacing its "pending" panels.

---

## From `DESIGN.md`, deliberately deferred / dropped

1. **Top prototype banner** and **floating screen-index chip** — dropped. Per project decision, this is treated as a shipped product, not a reviewer-facing prototype. If you want them back, add `components/banner.css` and `components/screen-index.css` (skeleton files intentionally omitted).
2. **Mobile hamburger dropdown** — the `<button class="nav-toggle">` shows below 820px but has no attached menu; the user's decision to strip prototype affordances left the nav paths accessible via URL bar / breadcrumbs. Add a mobile nav sheet when needed.
3. **Sign in / Add my org** buttons — visual only, no auth or form yet.
4. **Save to my list / Join this org** CTAs in the booth — stub buttons.
5. ~~**Events / For orgs** nav links point back to Discover~~ — Events now has its own
   screen, and The Xavier Cup was added alongside it. "For orgs" was dropped.

## Extracted illustrations

Every reusable illustration group in the mockup SVGs is exported to `assets/illustrations/`:

| Mockup group | File |
|---|---|
| `#Compass-Icon` | `compass-rose.svg` (inlined in nav for `currentColor`) |
| `#Sea-Scene` | `sea-scene.svg` (also inlined in `index.html` so CSS animation classes bind to internal `<g>` groups) |
| `#GDG-Credit` (sun mark) | `gdg-credit.svg` |
| 4 puzzle pieces + starfish | `primitives/*.svg` |

Small mockup-only decorations that were not extracted separately (they exist inside `sea-scene.svg` as internal groups instead): the two sailboats, the three horizon birds, the sparkles, and the wave motion lines. If you need to swap them individually, edit `sea-scene.svg` and the inline copy in `index.html`.

---

## Credit

Designed and built by **Google Developer Group on Campus – Xavier Ateneo**, for the
**Sands of Time** organizational trip and **The Xavier Cup** season.
