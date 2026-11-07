# Campus Compass: the website

> **Xavier University – Ateneo de Cagayan** · A campus-wide directory of every student organization, plus the campus events calendar and **The Xavier Cup** season. Created by **GDG on Campus – Xavier Ateneo**.

This folder is the whole website. GitHub Pages serves it as it is: static HTML, CSS and vanilla JavaScript, with no framework and no build step.

It ships in the **Xavier Cup 2026** design (navy, lime and cream tiles). The original **Sands of Time** beach design is still here in full, behind the gear icon.

## The one-minute version

Five screens: **Discover · Organizations · Events · The Xavier Cup · About**.

Everything you're likely to want to change is a JSON file in [`database/`](database/README.md):

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

The site has to be served (browsers won't load its modules and JSON from a double-clicked file). From this `docs/` folder:

```bash
python -m http.server 8765
```

Then open **http://localhost:8765**. Any static server works, e.g. `npx serve`.

It needs a browser from 2024 or later (Chrome/Edge 123+, Safari 17.2+, Firefox 138+), because the data is loaded with JSON imports.

## Test it

```bash
node --test test/*.test.mjs
```

Node 22 or newer. These tests cover the map camera, venue plan, campus view and sport icons.

## Files

```
index.html     the page: every screen's skeleton; imports everything below
DESIGN.md      the original design spec
database/      ALL the content, as JSON → database/README.md
src/css/       styles: tokens, layout, one file per component and screen
src/js/        code: router, screens, components, helpers → src/README.md
test/          site tests (node --test)
assets/        pictures: orgs/ teams/ sports/ cup/ events/ news/ brand/ illustrations/ mockups/
```

How the code fits together (router, designs, the Xavier Cup views, the map, the venue plan) is in **[src/README.md](src/README.md)**.

## Put it online

GitHub → **Settings → Pages** → Source: *Deploy from a branch* → `main` / **`/docs`**. Every push to `main` updates the site.

## Credit

Designed and built by **Google Developer Group on Campus – Xavier Ateneo**, for the **Sands of Time** organizational trip and **The Xavier Cup** season.
