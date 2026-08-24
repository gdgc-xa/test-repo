# Campus Compass — Design Documentation

> **Xavier University – Ateneo de Cagayan** · A campus-wide organization directory built for the **Sands of Time** organizational trip.
> Created by **GDG on Campus – Xavier Ateneo**.

---

## 1. Overview

**Campus Compass** is a virtual campus-org fair. It gives students a single searchable hub for every student organization at Xavier Ateneo, adapted for the "Sands of Time" trip theme (warm sand, ocean teal, sun orange, half-buried hourglass, cartoony beach horizon).

### Three primary screens

| # | Screen | Purpose |
|---|---|---|
| 1 | **Landing** | Brand hero + search + all category tags + explainer |
| 2 | **Browse** | Multi-select intersecting filter over the org grid |
| 3 | **Virtual Booth** | One org's full detail with description + mockup Facebook page card |

Plus a **Mobile landing** adaptation for phone widths (~420px).

---

## 2. Design System — "Sands of Time"

### Color tokens (CSS custom properties)

```css
/* Ground / Neutrals — warm sand */
--ground:       #F5EBD3;
--ground-2:     #EFE0BF;
--surface:      #FDF6E4;   /* card / panel background */
--surface-2:    #EAD9B1;   /* muted surface */
--ink:          #2B1E12;   /* primary text */
--ink-2:        #5B4530;   /* secondary text */
--muted:        #8B735B;   /* tertiary text / captions */
--border:       #E1CFA6;
--border-strong:#C8B27F;

/* Primary accents */
--ocean:        #2C7C8E;   /* primary interactive (buttons, active state) */
--ocean-deep:   #1B5A69;   /* hover / darker variant */
--sun:          #E68A2E;   /* warm accent, hourglass sand */
--sun-deep:     #B96A1A;

/* Category accents (four Google puzzle-piece hues) */
--blue:   #4285F4;   --blue-ink:   #1A56CB;   --blue-soft:   #E3ECFD;
--red:    #EA4335;   --red-ink:    #B21E10;   --red-soft:    #FCE0DE;
--yellow: #EFB100;   --yellow-ink: #7E5B00;   --yellow-soft: #FCEEC1;
--green:  #34A853;   --green-ink:  #1B7A38;   --green-soft:  #DAEEDF;

/* Compass mark (nav + hero logo) */
--compass-face: #B8A576;
--compass-tick: #C8B27F;
```

Dark mode swaps: deep sand-brown ground, cream text, muted category-soft backgrounds. Design both modes with the same care.

### Typography

- **Display serif** (headings, section titles, Campus Compass wordmark's "Compass"): `Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, "Times New Roman", serif` — weight 700/800.
- **Script decorative** ("Sands of Time" tagline, "Campus" in the wordmark, "Sands of Time" in the GDG credit): `"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive` — italic, 700+.
- **Body / UI**: `"Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Text", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Monospace** (Facebook URL, code brackets): `Consolas, "SF Mono", Menlo, monospace`.

### Radius / spacing

- Radii: 8 (small), 14 (base), 22 (large), 30 (xl), 999 (pill).
- Nav height: 68 (desktop) / 60 (mobile).
- Content max-width: 1200 (desktop) / 380 (mobile).

### Motion

- **Continuous ambient**: sea waves (5 ocean layers + 4 foam layers, bidirectional drift with slight bob), wind drift on hero primitives (puzzle pieces + starfish), sailboat rock, bird bob, sparkle twinkle, hourglass sand grains falling.
- **Scroll reveal**: elements fade + rise (`opacity 0 → 1`, `translateY(22px) → 0`) with staggered 60ms delays (capped at 420ms) on cards and sections. Powered by IntersectionObserver.
- **Reduced-motion**: all ambient + reveal animations disabled under `prefers-reduced-motion: reduce`.

---

## 3. Ten Xavier Ateneo Clusters

Every organization is tagged with 1–3 clusters. Color grouping enables a "four-color, ten-cluster" scan:

| Color | Group name | Clusters |
|---|---|---|
| **Blue** | Mind | Governance and Policy-making · Natural Sciences, Engineering, and Technology · Program-Based |
| **Green** | Ground | Business · Sports and Recreation · Environment |
| **Yellow** | Culture | Food and Agriculture · Socio-Cultural |
| **Red** | Voice | Media and Arts · Service-Learning |

**Short labels** (for compact UI — cards, chips, hero tags):

| Full name | Short label |
|---|---|
| Governance and Policy-making | Governance |
| Natural Sciences, Engineering, and Technology | Sci · Eng · Tech |
| Program-Based | Program-Based |
| Business | Business |
| Sports and Recreation | Sports |
| Environment | Environment |
| Food and Agriculture | Food & Agri |
| Socio-Cultural | Socio-Cultural |
| Media and Arts | Media & Arts |
| Service-Learning | Service-Learning |

---

## 4. Organizations (15 total)

Each org has: `id`, `name`, `short` (abbreviation for card logo), `tags[]`, `tagline`, `description[]` (paragraphs), `founded`, `meets`, `fb {handle, followers, likes}`, `leaders[]`, `events[]`.

| # | Name (short) | Tags |
|---|---|---|
| 1 | Google Developer Group on Campus (GDG) | Sci · Eng · Tech · Program-Based |
| 2 | Union Debate Society (UDS) | Governance · Media & Arts |
| 3 | Kultura Dance Troupe (KDT) | Media & Arts · Socio-Cultural |
| 4 | Basketball Varsity (BSK) | Sports |
| 5 | Model United Nations (MUN) | Governance · Program-Based |
| 6 | Photography Guild (PG) | Media & Arts · Socio-Cultural |
| 7 | Newman Circle (NC) | Socio-Cultural · Service-Learning |
| 8 | Coders Guild (CG) | Sci · Eng · Tech · Program-Based |
| 9 | Peer Mentorship Program (PMP) | Service-Learning · Program-Based |
| 10 | Language Exchange Club (LEC) | Socio-Cultural · Program-Based |
| 11 | Ultimate Frisbee Club (UFC) | Sports · Service-Learning |
| 12 | Philosophy Circle (PHC) | Media & Arts · Program-Based |
| 13 | Xavier Environmental Society (XES) | Environment · Service-Learning |
| 14 | Farm to Kitchen Club (F2K) | Food & Agri · Environment |
| 15 | Xavier Business Society (XBS) | Business · Program-Based |

Every cluster has ≥1 org so filter chips never return zero results on solo selection.

---

## 5. Screens

### 5.1 Landing

- **Banner** — dark stripe with prototype label.
- **Nav** — Campus Compass wordmark (compass mark + text + "Xavier Ateneo · Sands of Time" subtitle) · Discover / Browse orgs / For orgs / Events links · theme toggle · Sign in (ghost button) · Add my org (sun-orange primary).
- **Hero** with ambient decoration (puzzle pieces + starfish drifting) + **half-buried hourglass** on the right:
  - Kicker pill: "Xavier Ateneo · Club fair season · Now open"
  - Script tagline: **"Sands of Time"**
  - **Campus Compass wordmark** (yellow brush-script "Campus" + tan compass rose + outlined serif "Compass")
  - Sub copy: campus-wide directory description
  - Search shell (rounded pill, ocean-teal button)
  - **10 category tags** in 2 rows (short labels, color-coded swatch dot)
  - Dune wave divider at the bottom
- **Theme block** — "Ten categories, four familiar colors" explanation with the Mind/Ground/Culture/Voice legend
- **Footer** — Campus Compass brand + **Created by GDG Xavier Ateneo · Sands of Time** credit panel + prototype tagline
- **Sea scene** below the footer — bold cartoony ocean (5 layers, foam waves, wave motion lines, sparkles, sailboats, horizon birds)

### 5.2 Browse

- Same nav + banner
- Breadcrumb: Discover / Browse orgs
- Title (dynamic): e.g. `Sci · Eng · Tech ∩ Program-Based orgs`
- Result count (tabular numerals)
- Compact search shell
- Filter toolbar: help copy ("Pick one or more chips — orgs must match all you select") + Clear filters button (fades in when ≥1 chip is active)
- **Filter chip row** — 10 chips (short labels), multi-select toggle, active state = ocean-teal filled with white checkmark
- **Intersection callout** — highlighted sun-soft panel when 2+ chips are active, naming the active chips
- **Org grid** — 4-column card grid (auto-fit, `minmax(280px, 1fr)`). Ghost/dashed cards represent filtered-out orgs to convey the filter working.
- Footer + sea scene (same as landing)

### 5.3 Virtual Booth

- Nav + banner
- Breadcrumb: Discover / Browse / <Org name>
- **Booth hero** (split, 60/40): body left with back button, category tags, big serif org name, tagline, meeting time chip, primary CTA (Join this org, ocean-teal) + secondary (Save to my list, ghost). Visual right with ambient puzzle pieces + big org emblem tile.
- **Description panel** — 2-paragraph about section
- **Upcoming events** — date tiles + title + subtitle
- **Leadership** — avatar circles with initials + name + role
- **Facebook page mockup** (sidebar) — cover gradient, profile emblem, verified check, follower/like stats, blue Like button + Message button, `facebook.com/<handle>` link row. **Clearly a mockup, not a live link.**
- **At-a-glance** panel — Categories / Founded / Open to / Dues
- Footer + sea scene

### 5.4 Mobile Landing

- Compact nav (compass mark + wordmark + hamburger)
- Hero stacks vertically: kicker → script → **compact Campus Compass wordmark** → sub → full-width search shell → **10 category tags in 5 rows × 2 cols** → smaller hourglass on the right → dune divider
- Theme block stacked as single column (4 rows: Mind/Ground/Culture/Voice)
- Footer + GDG credit stacked
- Compact sea scene at the bottom

---

## 6. Interactions

- **Category tag → Browse** — clicking any category tag on landing navigates to Browse with that single filter preselected.
- **Multi-select intersect filter** — clicking a chip toggles it. When 2+ chips are active, only orgs carrying **all** selected clusters are shown.
- **Clear filters** — resets selection + search.
- **Search** — filters by name / cluster / tagline substring.
- **Card → Booth** — the whole card is one hit target.
- **Booth back button + breadcrumb** — return to Browse.
- **Theme toggle** — nav icon toggles Light/Dark data-theme.
- **Screen index chip** (right side, desktop only) — floating jump-links for the three screens; hidden < 900px.

---

## 7. Assets

### Live prototype
- **HTML** artifact: `https://claude.ai/code/artifact/ce63d818-62c8-4cf6-a753-2ba9504afc61` (Campus Compass, current state)

### SVG mockups (for Figma import)
| File | Purpose |
|---|---|
| `org-finder-01-landing.svg` | Desktop landing, 1440×1660 |
| `org-finder-02-browse.svg` | Desktop browse (Sci · Eng · Tech ∩ Program-Based active), 1440×1880 |
| `org-finder-03-booth.svg` | Desktop virtual booth (GDG), 1440×2100 |
| `org-finder-04-mobile-landing.svg` | Mobile landing, 420×1620 |

Each SVG uses named `<g id="…">` groups (Nav, Hero, Category-Tags, Theme-Block, Footer, GDG-Credit, Sea-Scene, Hourglass, Campus-Compass-Logo, etc.) so Figma import produces meaningfully-labeled frames.

### Reusable illustration components
- **Campus Compass wordmark** — SVG in the hero (`#Campus-Compass-Logo`)
- **Detailed tan compass rose** — SVG in nav (`#Compass-Icon`) — 8-point star, two rings, dots
- **Half-buried hourglass** — SVG in landing hero (`#Hourglass`)
- **GDG credit panel** — SVG in every footer (`#GDG-Credit`)
- **Sea scene** — SVG below every footer (`#Sea-Scene`) with named creature groups

---

## 8. Copy inventory

Key strings that are content, not decoration:

- Brand: **Campus Compass**, subtitle **Xavier Ateneo · Sands of Time**
- Hero kicker: **Xavier Ateneo · Club fair season · Now open**
- Hero tagline: **Sands of Time** (script)
- Hero sub: A campus-wide directory of every student organization at Xavier University – Ateneo de Cagayan. Search, filter, and visit any booth without leaving your seat.
- Search placeholder: **Search all orgs — try 'debate', 'coders', 'farm'…**
- Category cloud label: **BROWSE BY CLUSTER**
- Filter toolbar help: **Pick one or more chips — orgs must match all you select.**
- Intersection callout template: **Showing orgs tagged with `<A>` AND `<B>` — the intersection.**
- Empty state: **No orgs match every filter** / Loosen the intersection — remove a chip, or clear filters and start again.
- Footer credit label: **CREATED BY** / Google Developer Group · Xavier Ateneo · Sands of Time
- Prototype tagline: Prototype · Ready for the Figma "Website Prototype" rebuild
