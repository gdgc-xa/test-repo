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
- Two skins (`Xavier Cup 2026`, `Sands of Time`; World Cup was removed) + light/dark — new UI must work in all of them using existing tokens in `tokens.css` / `skins.css`.
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
- Check mobile (tab bar scrolls sideways, 5 tabs fit), both skins, light/dark, reduced motion.
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
- [Sports, done] The full lineup (20 sports) in `SPORTS`: Basketball, Volleyball, **Football** (was Soccer), Softball (all Men/Women), **Ultimate Frisbee** (was Frisbee, Mixed), Sepak Takraw, Athletics (100m, 200m, 400m, Javelin, Shot Put, Discus — each Men and Women — and Relay, Mixed), Swimming, Table Tennis and Lawn Tennis (Men/Women), Badminton, Pickleball, Taekwondo, Karatedo, Chess, Darts, Esports (ML, CODM, Valorant, Dota 2), Debate, Cheerdance, Megacrew. New in the data: `SPORTS[].categories` (what a sport's page switches between, shown even before any games) and `format: 'field'` (Athletics, Swimming, Cheerdance, Megacrew: every college at once, so no standings or bracket); `GAMES[].event` for an event within a sport (`event: '100m', division: 'Men'` → "100m · Men"). Sports without a division given are one category for now. Every sport has a pictogram (see next note).
- [Sports, done — like olympics.com/en/sports] The Sports grid is **A to Z** (`allSports()` sorts by name) and each sport has its own **pictogram**: solid Olympic-style figures from **svgrepo.com** (mostly its Multi Sports collection; all CC0, no credit needed), inlined in `components/sport-pictograms.js` with their SVG Repo numbers (no image files; the fixed black fill is dropped so the skin colours them, in all three skins and dark mode). A tile is the pictogram large in the brand colour with the name under it; three across on a phone, with the event count left for the sport's page. The same pictograms are on a sport's header and on the match cards (the old `.webp` pictures stay as a fallback). A sport added without a pictogram shows its picture, else its first letter. On a sport with many events (Athletics), the chosen event chip scrolls to the middle of its row.
- [Matches, done — from the user's sketch] Matches is calmer: title + one-line description, a **win counter** (trophy + the teams with the most wins so far, from the results), the **Follow your teams** picker (moved here from above the tabs), ONE **Filter ▾** button (its panel: day chips with "All days", All/Live/Upcoming/Results, venue and sport dropdowns, Clear; the button shows how many filters are on and a one-line summary) and **List / Calendar** — always on one line, the summary shrinking with "…", and List / Calendar as two small icons on a phone; then three rows you swipe or step with arrows — **Live now**, **Upcoming** (today / a chosen day / coming up), **Finished recently** — followed teams' games first in each; "Looking for something? Try the map →" at the foot. The day strip, the long day-by-day list and the "Your teams" box are gone. Sport is a filter on Matches again (dropdown), so old `?sport=` links filter instead of opening Sports.
- [Header, done] The photo banner is **full screen** on every screen size, like Discover's full-screen hero: edge to edge, as tall as the window under the nav, Discover's big title, a bouncing arrow at the foot. The counters (live / upcoming / results / venues) are **removed**, with `CUP_CONFIG.showCounters`; only the red live dot on the Matches tab remains.
- [Header, done] The line under "Follow your teams" only says how to use it ("Choose any teams to follow…" / "Following 2 teams. Tap any team to add it, or tap again to remove it."), no live-game status.
- [All match lists, done] Swipe rows on narrow screens (≤720px): Your teams, each day, the calendar's day, a sport's matches and a team's games are each one row of cards you swipe (the next card peeks in), so no list is taller than one card; every card goes in the row, no "Show all". Wider screens keep the grid. Cards in a swipe row skip the fade-in.
- [Matches, done] No sport filter on Matches any more (each sport has its page on Sports; `CUP_CONFIG.showSportFilter` removed; an old `?tab=fixtures|matches&sport=…` link opens that sport's page). The toolbar is: title + small List / Calendar, then All · Live · Upcoming · Results as small chips on one line, then the venue dropdown (label for screen readers only).
- [All tabs, done] Phone friendly — short, not tall (≤560px): compact banner, counters in one row of four, team picker as one sideways-scrolling row, chip rows scroll sideways, a compact two-line match card, Matches shows **one day at a time** (the strip picks the day), "Your teams" shows 3 before "Show all", a sport's page shows 3 matches before "Show all". Phone page height went from ~9,300px to ~2,900px. Phone rules for the header and Matches are in `mobile.css`; the card's in `match-card.css`; Sports' in `sports.css`.
- [Phase 1, done] The banner at the top of the Cup tab is a photo slideshow (`CUP_PHOTOS` in `data/xavier-cup.js`, switch `CUP_CONFIG.showHeroPhotos`). Its photos are now The Xavier Cup's 17.10.26 posters from its Facebook page, one sport each (Ultimate Frisbee, Volleyball, Football, Taekwondo; `assets/cup/photos/txc26-*.webp`, 1600×2000, 93–182 KB, as sent). A tall photo is marked `.is-tall` when it loads; in any frame wider than 0.95:1 (the desktop banner, the phone and tablet cards) it stands whole at the right, its left edge fading into a blurred copy of itself, with the part under the title dimmed, so nothing of the poster is cropped (`cup.css`, a container query on `.cup-photos`).

- [Sports, done — checked against "[DRAFT] TXC2627 General Guidelines", Aug 22 2026] Added the events the guidelines list that the site lacked: **Basketball 3x3**, as categories of Basketball rather than its own sport (Men · Women · 3x3 · Men · 3x3 · Women on Basketball's page; its games are `sport: 'Basketball', event: '3x3'`), **Hypemaster** and **Cheer Chant** (bonus events) were added, then removed at the user's request. Gave Men/Women to every sport the guidelines' table splits that way: Badminton, Chess, Darts, Karatedo, Pickleball, Sepak Takraw, Swimming, Taekwondo. Ultimate Frisbee, Cheerdance and Debate are **Mixed**; Megacrew and Esports' four games are Open. `SPORTS` is now grouped as the guidelines group events (major / minor / bonus, with their points in comments); the site still lists them A to Z. Kept on purpose: "Ultimate Frisbee" (guidelines: Frisbee), "Cheerdance" (its table says Cheerleading, its points list Cheerdance), "Darts" (Dart), "CODM" (guidelines: COD). Sub-events (doubles, relays, Team Kata, Team Poomsae) wait for the event list.

- [Sports, done — from the "TXC2026 Game Schedules" Drive folder] Each sport's bracket follows its official schedule (`BRACKETS` in `data/xavier-cup.js`, chosen per sport with `SPORTS[].bracket`): **crossover** — groups A and B, top two cross over (A1 v B2, B1 v A2), third place, final: Volleyball, Softball, Badminton, Table Tennis, Pickleball, and Sepak Takraw (from its printed Oct 17–18 schedule: groups 1 and 2, then T1G1 v T2G2, T2G1 v T1G2, L13 v L14, W13 v W14 for the championship). **crossover-placings** — the same plus 5th (A3 v B3) and 7th (A4 v B4): Basketball 3x3. **quarters** — group winners wait in the semis, quarterfinals A2 v B3 and A3 v B2, 5th (quarterfinal losers) and 7th (A4 v B4): Basketball 5x5. **seeded** — one table seeds quarterfinals 1v8, 4v5, 2v7, 3v6, then ranking games for 5th–8th: Ultimate Frisbee. Athletics is finals only (no bracket), as before. Sports with no schedule in the folder keep the original **round** bracket (one table, semifinals, final). Group games now take `group: 'A'`, which makes one standings table per group; empty bracket slots show the schedule's wording ("A1 vs B2") until the game is entered; new rounds: Quarterfinal, Third place (Bronze still read), 5th place, 7th place, Ranking. Badminton and Table Tennis are now five events (singles and doubles each way, mixed doubles); Pickleball six, including its schedule's "men's" and "women's mixed doubles", as written.

- [Sports, done — like the World Cup 2026 site's bracket] Every knockout bracket, on every screen size, is a **bracket you slide through**: a chip per round, the rounds side by side, every match two rounded **team bubbles** (crest, short name, score; the winner's score underlined in lime; seeds dashed until known) under a line saying Full time / Live / when. Two rounds in view on a phone, three on a tablet, four on a wide screen (a CSS container query on the bracket's own width), each round at most 280px wide and the whole centred; when every round fits, the chips go and nothing slides (`.kslide--all`). The round at the left stacks close; each later match sits halfway between the matches that feed it, joined by bracket lines (a straight line for a team with a bye). Swipe and it snaps to the next round, or tap a round's chip; the strip is only as tall as the rounds shown. Third place sits under the final in the last round; 5th, 7th and ranking games are cards under the bracket. Two-group formats put **Group A / Group B boxes** under it (gold head, teams in table order with W–L; tap for the team), which then replace the separate Standings table. Built from `lib/standings.js` → `bracketRounds` (two-group draws from `BRACKETS[].tree` via `bracketTree`), `components/sports.js` → `slideHtml`, `screens/cup.js` → `layoutSlide` / `setSlide`. (This replaced an earlier printed-poster bracket and the column bracket.)

- [Sports, done — standings and bracket follow the matches] Everything is worked out from `GAMES`: Elimination games make the standings (one table per `group`), knockout games fill the bracket by round in kickoff order, and every match in the bracket opens its match details. Seeds now **name their team once the standings settle it** (`seedTeams` in `lib/standings.js`): when every group game of group A has a result, "A1" shows group A's leader, in the bracket and in the 5th/7th place cards; until then it stays "A1". A game's group shows on its card and in its details ("Volleyball · Women · Group A · Elimination"). Before launch: give the real group games their `group` letter (the sample games have none, so two-group sports show one table), and remember a game past its time with no score shows as finished but counts for nothing until its score is in.

- [Sports, done — with the tracker's live data] The tracker names some sports differently from the Sports tab: `CUP_LIVE.sports` in `data/xavier-cup.js` maps them, like the venue and college tables (Soccer → Football, Frisbee → Ultimate Frisbee, Basketball 3x3 → Basketball's 3x3 categories, ESports MLBB / COD / Valorant / Dota → Esports' ML / CODM / Valorant / Dota 2), so each has one tile and one page. **Still open with the tracker:** the standings count only rounds named "Elimination" and the bracket reads Quarterfinal / Semifinal / Final / Third place / 5th place / 7th place / Ranking, but the sheet's rounds so far are "Round 1", "Round 2", "Upper Bracket", "Lower Bracket"; and the sheet has no group column, which the two-group formats need. Agree the round words and add a group (or map them in `lib/live-data.js`). Athletics events arrive under Men / Women, not per event, until the sheet's event names are mapped to the `ATHLETICS` categories.

- [Sports, done — no duplicate categories from the tracker] The tracker writes categories its own way (Esports' "Valorant" arrived as "Valorant · Mixed", which made a second, empty Valorant chip). Each game now counts under the `SPORTS[].categories` entry it means (`categoryIn` in `lib/standings.js`): the same words whatever the capitals, spaces or punctuation; an event listed on its own takes that event in any division; a sport listed by division only takes its events by division. Only a game none of these place makes a new chip, and two new ones that differ only in capitals are one. The game's own card still says what was sent. An older link to a folded category (`?div=valorant-mixed`) opens the listed one (`categoryFromLink`).
- [Sports, done — CODM's schedule, Oct 20–22] Esports → CODM plays **double-crossover** (`BRACKETS`): groups A (SOM, PRIMUS, SOL, CCS) and B (CAS, NSG, COE, SBM) play three rounds on Oct 20; A1 v B2 and B1 v A2 in the semifinals; then double elimination — the semifinal winners play the upper final while the losers play lower round 1, the upper final's loser plays the lower final against lower round 1's winner, and the upper final's winner meets the lower final's in the grand final. The bracket's rounds: Semifinals · Upper & lower · Lower final · Grand final; the grand final's line comes across from the upper final two rounds back. Rounds are found by the schedule's names (Semi-finals, Upper finals, Lower round 1, Lower finals, Grand finals) or, if the tracker writes "Upper bracket" / "Lower bracket" for all of them, by kickoff order. The tracker has no group column, so `SPORTS[].groups` lists the schedule's draw and `inGroups` gives each group game its group. Group games are now "Elimination", "Group stage", "Group A" or "Round 1/2/3…" (the tracker uses "Round N", so Ultimate Frisbee's table fills now too), and a group seeds the bracket only once every team in it has played all the others (the tracker adds games as they come). The tracker codes SOM, SOL, COE and NSG map to MED, LAW, ENG'G and NSG.
- [Discover, done] The Map Hub tile shows the real campus (the Map tab's drawing, `cupMapPreviewHtml` in `components/cup-map.js`, drawn by `components/discover-map.js`): framed on the three venues, each lit and named with its sports' icons; a venue's name turns red with a pulsing dot while a game is on there. Featured org cards' buttons name the org by its short name ("View GDGoC-XA →", "View CSG →") unless `data/featured.js` sets a `cta`.
- [Site, done] A layout tool for hand adjustments (`src/js/tweak.js`, loaded only on `?tweak` or Ctrl+Alt+T): pick any word or box, move it (drag, arrow keys, X / Y), change its margin, padding, gap, font size and letter spacing, for every copy of it or just one, on all screens or phones or wider ones. Laid out as ① Pick ② Change it ③ Save. **Save** writes `src/css/tweaks.css` (loaded last, `!important` rules) itself: the first time it asks for the project's docs folder (Chrome or Edge; remembered), then a refresh shows the change; other browsers get the text to copy. **Undo / Redo** step through unsaved changes, each listed in words ("“Next”: moved 12px right"). **History** lists every Save from `src/css/tweaks-history.json`; Go back makes an older one current as a new entry, so nothing is lost. The panel drags by its title bar.
- [Matches, done] A row of four games or more ("Coming up", "Finished recently") has **See all** in its heading, there as soon as the fourth game arrives: every game at once as a list going down, small two-line cards (one column on a phone, as many as fit wider). **Show less** puts the swipe row back; the heading stays put on screen either way (`state.railsOpen` in `screens/cup.js`).

<!-- Example:
- [Phase 3] Make standings rows show the team crest bigger on mobile.
-->

- [Map integration, 2026-10-15] User requested a **2D-only** map; this supersedes
  the Phase 2 reference to preserving 3D. Removed the Mapbox module/settings and
  added the TXC camera gestures, mobile venue sheet, and outside-campus panel.
  Campus Compass clock/status rules remain unchanged. The full sport catalogue,
  official external venue records, and live tracker adapter await verification.


### Tentative venue assignments — 2026-10-16

User-provided planning notes. **All assignments below await verification against
the official schedule.** These notes do not change runtime venue records, matches,
map positions, or GPS coordinates.

| Sport | Tentative venue | Existing venue ID / detail |
|---|---|---|
| Frisbee | XU Soccer Field | `soccer-field`; existing venue and Frisbee coordinates are available |
| Badminton | XU Covered Court | `covered-court` |
| Table Tennis | XU Covered Court | `covered-court` |
| Pickleball | XU Covered Court | `covered-court` |
| Lawn Tennis | XU Covered Court | `covered-court` |
| Cheerdance | Xavier University Gym | `xu-gym` |
| Swimming | Outside campus | Exact venue name, address, and coordinates to be confirmed |

Confirm these assignments before updating the tracker-to-map mapping or publishing
fixtures. Swimming should use the outside-campus panel once its venue and matches
are established; its Google Maps button requires confirmed valid coordinates.

- [Map, done] **Flat / 3D map.** The campus and every pin are stored once, flat, and drawn by `lib/campus-view.js`: Flat by default, **3D** (tilted, buildings raised by `h`) from a button on the Map tab, remembered per visitor. `CAMPUS_VIEW` in `data/campus-map.js` has `default`, `toggle` and a code-only `slant` for a tilted Flat view. Pins follow whichever view is on.
- [Map + tracker, done] **Venue plan** (`CUP_VENUE_PLAN`, `data/xavier-cup.js`): the sports office's sport → venue list. `version: 'new'` shows it (default); `'old'`, or `?venues=old`, restores the three-venue map where an icon shows only with a fixture. New: the Main Library (campus, Chess) and outside venues XU Uptown Sports Centre, Homecourt and Virtual Grounds; every planned sport's icon on its venue; tracker aliases for the sheet's spellings; a row with no venue filed under its sport's venue. **Mega Crew is overridden** to the Gym, Saturday, in the tracker (`overrides`). Lawn Tennis and Debate have no venue yet. Taekwondo's Gym is marked to be confirmed. Outside venues need their address and coordinates.
