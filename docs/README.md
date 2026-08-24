# Campus Compass

> **Xavier University – Ateneo de Cagayan** · A campus-wide directory of every student organization, adapted for the **Sands of Time** organizational trip theme.
> Created by **GDG on Campus – Xavier Ateneo**.

Static HTML / CSS / vanilla JS. No frameworks, no build step, no npm dependencies.

> **Picking this up after a break?** Read [HANDOFF.md](HANDOFF.md) first —
> it covers the session history, the two scene geometries, a known regression,
> and the gotchas that will otherwise cost you an hour each.

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
│   │   ├── components/              # one file, one component. Never reach into a sibling.
│   │   │   ├── nav.css              # top navigation bar
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
│   │       └── booth.css            # booth split (rendered inside modal panel)
│   │
│   ├── js/
│   │   ├── main.js                  # entry: hydrate + init router + observers + delights
│   │   ├── router.js                # SPA screen switching driven by URL query string
│   │   ├── theme-toggle.js          # light/dark toggle, persisted to localStorage
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
│   │   │   ├── categories.js        # CATEGORIES[], SHORT_LABEL, FULL_LABEL, COLOR_OF, THEME_OF
│   │   │   └── organizations.js     # ORGS[] and fetchOrgFromFacebook(handle) STUB
│   │   │
│   │   ├── components/
│   │   │   ├── card.js              # cardHtml(org, i) + ghostCardHtml()
│   │   │   ├── chip.js              # chipHtml + renderChipRow()
│   │   │   ├── search-shell.js      # attachSearchShell(), setSearchValue()
│   │   │   ├── booth.js             # boothHtml(org) — big booth template
│   │   │   ├── facebook-card.js     # fbCardHtml(org)
│   │   │   └── modal.js             # openModal / closeModal + focus trap + Esc
│   │   │
│   │   └── screens/
│   │       ├── landing.js           # tag cloud hydration + hero search wiring
│   │       ├── browse.js            # filter state + intersect + grid render
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

### Orgs (69)
`src/js/data/organizations.js` — pure data, generated from the official roster PDF
("Link + Name and Description + Org Head"), so names, e-mails and Facebook handles
match the source exactly.

* **69 orgs across 11 clusters** (the roster adds **Religious** to the original ten).
* **All 69 have logos**, re-encoded to 320px WebP in `assets/orgs/` — from the
  roster PDF except XU-XCEED and IIEE, whose page pictures were supplied
  separately. Cards still fall back to initials when `logo` is null.
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

### Themes
- Light — the day palette from `DESIGN.md` §2.
- Dark — **night at the beach**: deep-sand ground, cream text, moonlit indigo ocean, amber lantern-glow hourglass, faint stars in the sky above the sea.

Toggle in the nav (sun / moon icon). Persists to `localStorage`. First-time visitors get the OS `prefers-color-scheme` value.

---

## Facebook API integration slot

`fetchOrgFromFacebook(handle)` in `src/js/data/organizations.js` is a stub that returns `null`. When you wire it up to the real Graph API, return an object shaped like the GDG record — the booth will re-render as soon as data arrives, replacing its "pending" panels.

---

## From `DESIGN.md`, deliberately deferred / dropped

1. **Top prototype banner** and **floating screen-index chip** — dropped. Per project decision, this is treated as a shipped product, not a reviewer-facing prototype. If you want them back, add `components/banner.css` and `components/screen-index.css` (skeleton files intentionally omitted).
2. **Mobile hamburger dropdown** — the `<button class="nav-toggle">` shows below 820px but has no attached menu; the user's decision to strip prototype affordances left the nav paths accessible via URL bar / breadcrumbs. Add a mobile nav sheet when needed.
3. **Sign in / Add my org** buttons — visual only, no auth or form yet.
4. **Save to my list / Join this org** CTAs in the booth — stub buttons.
5. **Events / For orgs** nav links point back to Discover — no dedicated screens yet.

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

Designed and built by **Google Developer Group on Campus – Xavier Ateneo** for the **Sands of Time** organizational trip.
