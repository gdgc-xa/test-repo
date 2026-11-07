# Campus Compass: frontend (the website)

> **Xavier University – Ateneo de Cagayan** · A campus-wide directory of every student organization, plus the campus events calendar and **The Xavier Cup** season. Created by **GDG on Campus – Xavier Ateneo**.

This folder is the whole website: plain HTML, CSS and JavaScript modules. No framework, no build step and no packages to install. Its content comes from the top-level [`database/`](../database/README.md) folder.

It ships in the **Xavier Cup 2026** design (navy, lime and cream tiles). The original **Sands of Time** beach design is still here in full, behind the gear icon.

## The one-minute version

Five screens: **Discover · Organizations · Events · The Xavier Cup · About**.

Everything you're likely to want to change is a JSON file in [`database/`](../database/README.md), not in this folder:

| I want to… | Edit |
|---|---|
| Add or correct an org | `database/organizations.json` |
| Feature an org on Discover/Browse | `database/featured.json` |
| Add or remove an event | `database/events.json` |
| Add a venue or change which sport is played where | `database/cup-venues.json` |
| Add a news post, a banner photo or an Upcoming Events card | `database/xavier-cup.json` |
| Change the season dates or the preview clock | `database/xavier-cup.json` → `config` |
| Rename a team or swap its picture | `database/teams.json` |
| Turn a tab off, rename it, change the contact email | `database/site.json` |
| Change which design the site opens in | `database/site.json` → `skin.defaultSkin` |

## Run it

From this `frontend/` folder (Node 24 or newer; there's nothing to install):

```bash
npm run dev
```

Open **http://localhost:8765**. Leave the terminal open; press `Ctrl + C` to stop. Port busy? `npm run dev -- 8766`.

`serve.js` serves this folder at `/` and `../database/` at `/database/`, the same way the site is put together online. Opening `index.html` by double-clicking it won't work: browsers only load the site's modules and JSON from a server.

It needs a browser from 2024 or later (Chrome/Edge 123+, Safari 17.2+, Firefox 138+), because the data is loaded with JSON imports.

## Test it

```bash
npm test
```

Expect `pass 25`. The tests cover the map camera, the venue plan, the campus view and the sport icons. `test/database-path.js` lets them find `../database/` on disk.

## Files

```
index.html       the page: every screen's skeleton; imports everything below
package.json     npm run dev, npm test (no dependencies)
serve.js         the local server for npm run dev
DESIGN.md        the original design spec
src/css/         styles: tokens, layout, one file per component and screen
src/js/          code: router, screens, components, helpers → src/README.md
src/js/data/     thin loaders: read ../database/*.json, add lookups and logic
test/            site tests (npm test)
assets/          pictures: orgs/ teams/ sports/ cup/ events/ news/ brand/ illustrations/ mockups/
```

How the code fits together (router, designs, the Xavier Cup views, the map, the venue plan) is in **[src/README.md](src/README.md)**.

## Put it online

`.github/workflows/pages.yml` publishes this folder plus `database/` to GitHub Pages on every push to `main`. One-time setup: GitHub → **Settings → Pages** → Source: **GitHub Actions**.

## Credit

Designed and built by **Google Developer Group on Campus – Xavier Ateneo**, for the **Sands of Time** organizational trip and **The Xavier Cup** season.
