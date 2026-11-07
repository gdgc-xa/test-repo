# Campus Compass

Org directory + Xavier Cup intramurals site for Xavier Ateneo. Public repo, maintained by students: keep changes small, readable and surgical.

- `frontend/`: the website. Static HTML/CSS + vanilla ES modules. No framework, no build step, no npm dependencies.
- `database/*.json`: ALL content (orgs, clusters, events, teams, Cup config/venues/sports/games, site switchboard). Served at `/database/` next to the site.
- `frontend/src/js/data/*.js`: thin loaders. Each imports its JSON (`'../../../database/x.json' with { type: 'json' }`), re-exports the same names, and holds the logic (lookups, clock, plan merging).
- `backend/`: read-only API, Node 24 + Express 5 + mysql2, Docker on the VPS. The MySQL schema lives outside this repo (the DB lead's `campus-compass-db`).

## Commands

- Site: `cd frontend && npm run dev` → http://localhost:8765 (serves `frontend/` at `/` and `database/` at `/database/`)
- Site tests: `cd frontend && npm test` (25 tests)
- API: `cd backend && npm run dev` (port 3000). Tests: `npm test`; `npm run test:db` needs Docker + `CC_DB_DIR`.
- Deploy: `.github/workflows/pages.yml` publishes `frontend/` + `database/` on every push to `main`.

## Rules

- Content goes in `database/*.json`; logic stays in the `frontend/src/js/data` loaders. Never hard-code content in components or screens.
- Keep the loaders' JSON imports as `'../../../database/…'`. That is `/database/` on the web; `serve.js`, `test/database-path.js` and the Pages workflow all depend on it.
- Keep export names in `frontend/src/js/data/*.js` stable. Many files import them.
- One component, one file (`src/js/components/` + `src/css/components/`). Never style a sibling's internals.
- Colours only in `src/css/tokens.css`. New UI must work in both skins (`txc`, `sands`), light and dark, reduced motion, and at 390px.
- Every Xavier Cup section keeps its `show*` switch in `xavier-cup.json` → `config`; tabs keep theirs in `site.json`.
- Keep old URLs working (`?screen=`, `?tab=`, `?venues=`). The router redirects old tab names.
- The API stays GET-only and read-only. SQL is fixed text with `?` placeholders. Never commit `.env`.
- When files move or a setting is added, update the README of that folder (`database/README.md` for data fields).
- Don't touch `frontend/assets/mockups/` (reference only).
