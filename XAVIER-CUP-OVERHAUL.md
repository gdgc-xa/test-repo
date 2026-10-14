# Xavier Cup tab — overhaul brief

> **How to use this file**
> Drop it in the repo root. In Claude Code, run **one phase per session**, e.g.
> `Read XAVIER-CUP-OVERHAUL.md and do Phase 2 only. Stop and show me before Phase 3.`
> Edit anything here as you go — Claude Code should treat this file as the source of truth.
> Put new requests in **§9 Change requests** instead of rewriting old sections.

---

## 1. Context

- Repo: `gdgc-xa/test-repo`, site in `docs/`, live at https://gdgc-xa.github.io/test-repo/?screen=cup
- Stack: plain HTML + vanilla ES modules, no framework, no build step.
- Pattern to keep:
  - `docs/src/js/data/*.js` → pure data, no DOM (`xavier-cup.js`, `teams.js`)
  - `docs/src/js/components/*.js` → render helpers returning HTML strings
  - `docs/src/js/screens/cup.js` → the Xavier Cup screen (tabs, state, URL sync)
  - `docs/src/css/screens/cup.css`, `docs/src/css/components/*.css`
  - Cup markup lives in `docs/index.html` (`data-cup-tab` / `data-cup-view`)
- Every section has an on/off switch in `CUP_CONFIG` (`show*`) — keep that pattern for anything new.
- Three skins (`Xavier Cup 2026`, `World Cup`, `Sands of Time`) + light/dark — new UI must work in all of them using existing tokens in `tokens.css` / `skins.css`.
- `CUP_CONFIG.previewNow` fakes "now" so live/finished states can be tested. Use it while testing.

## 2. What's wrong today (audit)

Current tabs: **Map · Fixtures · Calendar · News & Updates**

| Tab | What it holds now | Problem |
|---|---|---|
| Map | Hero banner, counters, campus map, venue panel that lists live/upcoming/finished games per venue + sport filter | Map is the **default** tab but it's really a second fixtures list. Hero/counters only appear here. |
| Fixtures | "Follow your team" picker, featured match (day pager), full fixture list with status + sport chips | Three jobs in one tab. "Fixtures" is unclear to most students. |
| Calendar | Team picker **again**, month grid, games for chosen day | Third place the same games are listed. Duplicated picker. |
| News | Facebook feed + "Upcoming Events" cards | Not filterable by sport. "Upcoming Events" are actually team stories, not events. Sample post mentions Badminton, which has no games. |

Missing entirely: a per-sport view, standings, a team view, a medal tally.

## 3. Target structure — one job per tab

Shared header (above the tab bar, on every tab): compact hero, live/upcoming/results counters, and **one** "Follow your team" picker (already persisted by `lib/my-team.js`). Remove the duplicated pickers inside tabs.

| Tab | Its one job | URL |
|---|---|---|
| **Matches** (default) | Every game: live, upcoming, results. Filter by status / sport / team / venue. | `?screen=cup&tab=matches` |
| **Sports** | Olympics-style sport hub: pick a sport → its news, photos, standings, bracket, matches → tap a team → that team's results in that sport. | `?screen=cup&tab=sports&sport=basketball&div=men&team=ccs` |
| **Medal Tally** | Overall ranking of the 8 teams by gold / silver / bronze. | `?screen=cup&tab=tally` |
| **Map** | Where things are, and what's on there **today**. Tap a venue → its info + that day's games. | `?screen=cup&tab=map&venue=xu-gym&day=2026-10-14` |
| **News** | All announcements + team stories, filterable by sport. | `?screen=cup&tab=news&sport=soccer` |

Old links must keep working: `tab=fixtures` → `matches`, `tab=calendar` → `matches&view=calendar`.

## 4. Phases

Do them in order. Each phase must leave the site working.

### Phase 1 — Rename Fixtures → Matches, merge Calendar
- Rename tab, headings, buttons, counters and Discover links ("See fixtures →", "Go to fixtures →", "See More Games →") to **Matches**.
- Status chips: `All · Live · Upcoming · Results` (rename "Finished" → "Results" in the UI only; keep `finished` as the internal value).
- Group the list **by day** with a sticky day strip at the top (replaces the featured-match day pager). Keep the featured match as the first card of the selected day if `showFeatured` is on.
- Add a **List / Calendar** toggle inside Matches; reuse `components/cup-calendar.js` for the calendar view. Remove the Calendar tab.
- Add team and venue filters (team = dropdown or chips from `TEAMS`; venue from `CUP_MAP.venues`). Filters go in the URL.
- Every match card shows, top line: **sport icon · Sport · Division · Round** (e.g. "🏀 Basketball · Men · Semifinal") so a match is identifiable at a glance. Venue on the card links to the Map tab with that venue selected.
- Move hero + counters + team picker into the shared header. Make Matches the default tab.
- Back-compat redirects for `tab=fixtures` and `tab=calendar`.

**Done when:** no tab or link says "Fixtures"; Calendar tab is gone; old URLs land in the right place.

### Phase 2 — Interactive map: tap a venue, see that day's games
- Every venue on the map is clickable/tappable (2D and 3D). The selected venue is highlighted and kept in the URL (`&venue=<id>`).
- On each venue, show a small badge: a red **LIVE** dot if a game is on now, or the number of games there today.
- Clicking a venue opens the venue panel (side panel on desktop, bottom sheet on mobile):
  1. Venue name, indoor/outdoor, walking note, sport icons played there.
  2. **Today's games at this venue**, in time order: live first with the live score, then upcoming with kickoff time, then today's results with final score. Reuse the compact match card (sport · division · round, teams, time/score).
  3. A small day switcher (‹ Today ›) to see the same venue on other days. Defaults to today (`cupNow()`); during the season, before the first day it opens on Day 1.
  4. Empty state: "No games here today — next game: <sport, day, time>".
  5. Link **"All matches at this venue →"** → `tab=matches&venue=<id>`.
- Clicking a game in the panel opens the existing game detail (`?game=<id>`).
- Panel updates on the same timer as the rest of the tab, so an upcoming game flips to live without a reload.
- With no venue selected, the panel shows "Tap a venue to see today's games" plus a short list of venues with something live now.
- Remove the old all-days live/upcoming/finished lists and the per-venue sport filter from the panel — the panel is about **that venue on that day**.

**Done when:** tapping any venue shows only that venue's games for the selected day, live ones first, and the day switcher works.

### Phase 3 — Sports tab (reference: https://www.olympics.com/en/sports/)
- **Sports index:** grid of sport tiles (icon/photo + name + "X live / Y upcoming"). Built from a new `SPORTS` list in data (see §5).
- **Sport page** (`&sport=<slug>`), top to bottom:
  1. Header: sport name, hero photo, division switcher (Men / Women / Mixed / Open — only those that exist for the sport).
  2. Latest news for this sport (from `CUP_NEWS`, filtered by `sport`).
  3. Photo strip (from `SPORTS[].photos`, optional).
  4. **Standings** table for the chosen division: Team · P · W · L · D · Score diff · Pts. Computed from finished Elimination games.
  5. **Knockouts:** semifinals → final (→ bronze match if any) as a simple bracket.
  6. Matches for this sport/division (reuse the match card).
- **Team view** (`&team=<id>`): tapping a team in standings opens a panel/section with that team's record, results and upcoming games in this sport, plus a link "All <team> matches →" to Matches filtered by team.
- Back button / breadcrumb: Sports › Basketball › CCS Wizards.

**Done when:** every sport in `GAMES` has a working page; standings match the scores in `GAMES`.

### Phase 4 — Medal Tally tab
- Table of the 8 teams: rank · crest · team · 🥇 · 🥈 · 🥉 · total. Sorted Olympic-style (gold, then silver, then bronze).
- Each medal is one **event** = sport + division (e.g. Basketball Men). Gold = Final winner, Silver = Final loser, Bronze per `MEDALS.bronzeRule`.
- Tapping a team row expands which events they medalled in (links to that sport page).
- Show "Events decided: X of Y" so people know the tally is still moving.
- Optional (config): overall points (`MEDALS.points`) for an overall-champion column.

**Done when:** tally updates automatically when a Final gets a score.

### Phase 5 — News by sport
- Add sport filter chips to the News tab.
- Fallback posts get an optional `sport` field. For Facebook posts from the Worker, detect sport from hashtags in the post text (e.g. `#Basketball`) in `worker/src/index.js`; untagged posts show under "All" only.
- Rename `CUP_EVENTS` "Upcoming Events" → **"Team Stories"** and keep them in News.

### Phase 6 — Cleanup
- Remove dead code/CSS from the old Calendar tab and featured pager if no longer used.
- Check mobile (tab bar scrolls sideways, 5 tabs fit), all 3 skins, light/dark, reduced motion.
- Fix Discover's "Program Flow — See schedule →" tile (currently goes nowhere) → link to Matches.
- Replace placeholder/sample content before launch and set `previewNow: null`.

## 5. Data changes (in `data/xavier-cup.js`)

```js
// New: one entry per sport. Order = order on the Sports grid.
export const SPORTS = [
  { id: 'basketball', name: 'Basketball', icon: 'assets/sports/basketball.webp',
    photo: null, photos: [],            // hero + gallery, optional
    standings: { win: 2, draw: 1, loss: 0 } },   // points per result
  // ...soccer, volleyball, frisbee, softball
];

// New: medal rules.
export const MEDALS = {
  enabled: true,
  bronzeRule: 'match',   // 'match' = winner of round:'Bronze' game
                         // 'shared' = both semifinal losers get bronze
                         // 'none'
  points: { gold: 5, silver: 3, bronze: 1 },  // for the optional overall column
};
```

- `GAMES[].sport` must match `SPORTS[].name` exactly (or switch GAMES to use the id — pick one and be consistent).
- `GAMES[].round` may now also be `'Bronze'`.
- `GAMES[].winner` (optional): `'home' | 'away'` — overrides the score for penalties, shootouts, walkovers.
- `CUP_NEWS.posts[].sport` (optional).
- `CUP_CONFIG`: add `showSports`, `showTally`; remove `showCalendar` tab switch (calendar is now a view inside Matches) — or keep it to hide the List/Calendar toggle.

## 6. Constraints

- Minimal, surgical changes. Reuse existing components (`match-card.js`, `game-card.js`, `status.js`, `team-strip.js`, `cup-calendar.js`) before writing new ones.
- No frameworks, no new dependencies, no build step.
- Keep `data/` pure data. All derived numbers (standings, tally) are computed in code, never typed by hand.
- Keep accessibility already in place (tab roles, `aria-selected`, keyboard arrows on the tab bar).
- Don't touch other screens (Discover, Browse, Events, About) except for the link/label fixes listed above.
- After each phase: list the files changed and what to check in the browser.

## 7. Open decisions (fill these in before the phase that needs them)

- [ ] Medal tally is per **college team** (the 8 in `teams.js`)? On this site "clusters" means the 11 org clusters — confirm the tally is by team, not cluster.
- [ ] Bronze rule: bronze match, shared bronze, or none?
- [ ] Standings points per sport (e.g. volleyball by sets won?).
- [ ] Do we show the overall points column or medals only?
- [ ] Sport photos: where do they come from?
- [ ] Tab order: `Matches · Sports · Medal Tally · Map · News` — OK?

## 8. Reference links

- Sports hub layout: https://www.olympics.com/en/sports/
- (add more here)

## 9. Change requests (append as you go)

- [Phase 2] Map must be interactive: clicking a location shows the games being played there that day (see Phase 2).
- [Phase 1, done] "Follow your team" → **Follow your teams**: tap any number of teams; their matches go to the top of Matches (a "Your teams" block, and first within each day). The Team dropdown on Matches is gone, so there is one place to choose teams. Discover's Teams tile adds to the same list. (Phase 3: "All <team> matches →" can no longer filter Matches by team; link to the team's sport page or follow the team instead.)
- [Phase 3, done before Phase 2 at the user's request] Sports tab. Choices made where §7 was open: the standings show **Wins and Losses only** (user's call; ranked by wins, then fewest losses, score difference breaks ties; no points, so `SPORTS[].standings` was removed); sport photos are placeholders (`photo: null`, `photos: []`); tab order is `Matches · Sports · Map · News`. The team view has a **Follow** button instead of "All <team> matches →" (Matches no longer filters by team). Sport news: a post's `sport` field, or a `#Sport` hashtag in its text, read in the browser for now (Phase 5 can move that to the Worker). `CUP_MAP.sportIcons` moved into `SPORTS[].icon`.
- [Header, done] The photo banner is **full screen** on every screen size, like Discover's full-screen hero: edge to edge, as tall as the window under the nav, Discover's big title, a bouncing arrow at the foot. The counters (live / upcoming / results / venues) are **removed**, with `CUP_CONFIG.showCounters`; only the red live dot on the Matches tab remains.
- [Header, done] The line under "Follow your teams" only says how to use it ("Choose any teams to follow…" / "Following 2 teams. Tap any team to add it, or tap again to remove it."), no live-game status.
- [All match lists, done] Swipe rows on narrow screens (≤720px): Your teams, each day, the calendar's day, a sport's matches and a team's games are each one row of cards you swipe (the next card peeks in), so no list is taller than one card; every card goes in the row, no "Show all". Wider screens keep the grid. Cards in a swipe row skip the fade-in.
- [Matches, done] No sport filter on Matches any more (each sport has its page on Sports; `CUP_CONFIG.showSportFilter` removed; an old `?tab=fixtures|matches&sport=…` link opens that sport's page). The toolbar is: title + small List / Calendar, then All · Live · Upcoming · Results as small chips on one line, then the venue dropdown (label for screen readers only).
- [All tabs, done] Phone friendly — short, not tall (≤560px): compact banner, counters in one row of four, team picker as one sideways-scrolling row, chip rows scroll sideways, a compact two-line match card, Matches shows **one day at a time** (the strip picks the day), "Your teams" shows 3 before "Show all", a sport's page shows 3 matches before "Show all". Phone page height went from ~9,300px to ~2,900px. Phone rules for the header and Matches are in `mobile.css`; the card's in `match-card.css`; Sports' in `sports.css`.
- [Phase 1, done] The banner at the top of the Cup tab is a photo slideshow (`CUP_PHOTOS` in `data/xavier-cup.js`, switch `CUP_CONFIG.showHeroPhotos`). Placeholders for now: replace with real TXC photos before launch.

<!-- Example:
- [Phase 3] Make standings rows show the team crest bigger on mobile.
-->
