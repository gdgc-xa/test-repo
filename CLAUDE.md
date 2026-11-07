# Campus Compass

Org directory + Xavier Cup intramurals site for Xavier Ateneo. Public repo, maintained by students: keep changes small, readable and surgical.

- `docs/`: the website, served as-is by GitHub Pages. Static HTML/CSS + vanilla ES modules. No framework, no build step, no npm dependencies.
- `docs/database/*.json`: ALL content (orgs, clusters, events, teams, Cup config/venues/sports/games, site switchboard).
- `docs/src/js/data/*.js`: thin loaders. Each imports its JSON (`with { type: 'json' }`), re-exports the same names, and holds the logic (lookups, clock, plan merging).
- `api/`: read-only API, Node 24 + Express 5 + mysql2, Docker on the VPS. The MySQL schema lives outside this repo (the DB lead's `campus-compass-db`).

## Commands

- Site: `cd docs && python -m http.server 8765` → http://localhost:8765
- Site tests: `node --test docs/test/*.test.mjs`
- API: `cd api && npm run dev` (port 3000). Tests: `npm test`; `npm run test:db` needs Docker + `CC_DB_DIR`.

## Rules

- Content goes in `docs/database/*.json`; logic stays in the `src/js/data` loaders. Never hard-code content in components or screens.
- Keep export names in `src/js/data/*.js` stable. Many files import them.
- One component, one file (`src/js/components/` + `src/css/components/`). Never style a sibling's internals.
- Colours only in `src/css/tokens.css`. New UI must work in both skins (`txc`, `sands`), light and dark, reduced motion, and at 390px.
- Every Xavier Cup section keeps its `show*` switch in `xavier-cup.json` → `config`; tabs keep theirs in `site.json`.
- Keep old URLs working (`?screen=`, `?tab=`, `?venues=`). The router redirects old tab names.
- The API stays GET-only and read-only. SQL is fixed text with `?` placeholders. Never commit `.env`.
- When files move or a setting is added, update the README of that folder (`docs/database/README.md` for data fields).
- Don't touch `assets/mockups/` (reference only).
