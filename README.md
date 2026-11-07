# Campus Compass

A campus-wide directory of every student organization at **Xavier University – Ateneo de Cagayan**, plus the events calendar and **The Xavier Cup** intramurals season. Built by **GDG on Campus – Xavier Ateneo**.

The project has three parts:

```
frontend/   the website (HTML + CSS + JavaScript, no build step)  → frontend/README.md
backend/    a small read-only API (Node + Express + MySQL) for the
            live Xavier Cup results                               → backend/README.md
database/   everything the site shows, as JSON files (orgs,
            events, teams, games, settings)                       → database/README.md
```

Other guides:
- How the website's code fits together: [frontend/src/README.md](frontend/src/README.md)
- The original design spec: [frontend/DESIGN.md](frontend/DESIGN.md)
- The Xavier Cup tab overhaul plan: [XAVIER-CUP-OVERHAUL.md](XAVIER-CUP-OVERHAUL.md)

New to the project? Start at **Step 0** and go down in order.

---

## Step 0: Install the tools (one time only)

| Program | What it's for | Get it |
|---|---|---|
| **VS Code** | where you read and edit the code | [code.visualstudio.com/download](https://code.visualstudio.com/download) |
| **Git** | downloads the project from GitHub | Mac: type `git --version` in Terminal and accept the install. Windows: [git-scm.com/downloads/win](https://git-scm.com/downloads/win) |
| **Node.js 24** (LTS) | runs the website on your computer, the tests and the API | [nodejs.org/en/download](https://nodejs.org/en/download) |

Check everything installed by opening a terminal and running:

```bash
git --version
node -v
```

`node -v` should say `v24` or higher.

## Step 1: Download the project

```bash
git clone https://github.com/gdgc-xa/Campus-Compass-GDGoC-XA.git
cd Campus-Compass-GDGoC-XA
code .
```

In VS Code, use **Terminal → New Terminal**. It opens in the project folder.

## Step 2: Run the website

```bash
cd frontend
npm run dev
```

There's nothing to install first. Open **http://localhost:8765**. Leave the terminal open; press `Ctrl + C` to stop.

The Xavier Cup's live results come from the hosted API, so you don't need to run the backend yourself. To work on it, see [Step 5](#step-5-optional-run-the-backend).

## Step 3: Change something

Most changes are a JSON file in `database/`: add an org, feature one, move a game, turn a tab off. Save, then reload the page. Each file is explained in [database/README.md](database/README.md).

Changing how something looks or works is in `frontend/src/`. Start with [frontend/src/README.md](frontend/src/README.md).

## Step 4: Run the tests

```bash
cd frontend
npm test
```

Expect `pass 25`.

## Step 5 (optional): Run the backend

Only needed if you're working on the API. It needs Docker Desktop for the database tests.

```bash
cd backend
npm install
npm test
```

Expect `pass 18`. Running it against a database is in [backend/README.md](backend/README.md#run-and-test-on-your-own-computer).

---

## Words you'll see

| Word | Meaning |
|---|---|
| **Terminal** | a window where you type commands |
| **Frontend** | the part people see: the website in their browser |
| **Backend** | the part that runs on a server. Ours is the API |
| **Database** | where the data is kept. The site's content is the JSON files in `database/`; the live Xavier Cup results are in a MySQL database on the server |
| **JSON** | a plain-text data format: `{ "name": "CSG" }`. Strict: double quotes, no trailing commas |
| **API** | a server the site asks for data. Ours only answers questions; it never changes anything |
| **npm** | comes with Node. `npm run dev` and `npm test` run the commands written in `package.json` |
| **GitHub Pages** | GitHub's free hosting. It serves the website |
| **localhost** | "this computer". `localhost:8765` only works on your own machine |
| **.env** | a settings file with passwords. It's never uploaded to GitHub |

## Put it online

- **Website:** every push to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes `frontend/` plus `database/` to GitHub Pages. One-time setup: GitHub → **Settings → Pages** → Source: **GitHub Actions**.
- **API:** runs in Docker on the team's VPS. The steps are in [backend/README.md](backend/README.md#deploy-on-the-vps).

## Using Claude Code?

`CLAUDE.md` tells Claude how the project works and which rules to follow. Open a terminal in the project folder, type `claude`, and ask things like *"add a new org to the database"*.
