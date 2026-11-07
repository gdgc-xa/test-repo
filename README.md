# Campus Compass

A campus-wide directory of every student organization at **Xavier University – Ateneo de Cagayan**, plus the events calendar and **The Xavier Cup** intramurals season. Built by **GDG on Campus – Xavier Ateneo**.

Live on **GitHub Pages**, served from the `docs/` folder.

The project has three parts:

- **docs/**: the website (static HTML + CSS + vanilla JS, no build step) → [docs/README.md](docs/README.md)
- **docs/database/**: all the site's content as JSON files (orgs, events, teams, games, settings) → [docs/database/README.md](docs/database/README.md)
- **api/**: a small read-only API (Node + Express + MySQL) that serves the live Xavier Cup results → [api/README.md](api/README.md)

Other guides:
- How the website's code fits together: [docs/src/README.md](docs/src/README.md)
- The original design spec: [docs/DESIGN.md](docs/DESIGN.md)
- The Xavier Cup tab overhaul plan: [XAVIER-CUP-OVERHAUL.md](XAVIER-CUP-OVERHAUL.md)

New to the project? Start at **Step 0** and go down in order.

---

## Step 0: Install the tools (one time only)

| Program | What it's for | Get it |
|---|---|---|
| **VS Code** | where you read and edit the code | [code.visualstudio.com/download](https://code.visualstudio.com/download) |
| **Git** | downloads the project from GitHub | Mac: type `git --version` in Terminal and accept the install. Windows: [git-scm.com/downloads/win](https://git-scm.com/downloads/win) |
| **Python 3** or **Node.js** | runs a tiny local web server so the site works on your computer | [python.org/downloads](https://www.python.org/downloads/) or [nodejs.org](https://nodejs.org/en/download) (LTS) |

Node.js (v22 or newer) is also needed to run the tests, and v24 to run the API.

Check everything installed by opening a terminal and running:

```bash
git --version
python --version     # or: node -v
```

## Step 1: Download the project

```bash
git clone https://github.com/gdgc-xa/Campus-Compass-GDGoC-XA.git
cd Campus-Compass-GDGoC-XA
code .
```

In VS Code, use **Terminal → New Terminal**. It opens in the project folder.

## Step 2: Run the website

```bash
cd docs
python -m http.server 8765
```

Open **http://localhost:8765**. Leave the terminal open; press `Ctrl + C` to stop.

The Xavier Cup's live results come from the hosted API, so you don't need to run the API yourself. To work on the API, see [api/README.md](api/README.md).

## Step 3: Change something

Most changes are a JSON file in `docs/database/`: add an org, feature one, move a game, turn a tab off. Save, then reload the page. Each file is explained in [docs/database/README.md](docs/database/README.md).

## Step 4: Run the tests

```bash
node --test docs/test/*.test.mjs     # the website
cd api && npm install && npm test    # the API
```

---

## Words you'll see

| Word | Meaning |
|---|---|
| **Terminal** | a window where you type commands |
| **JSON** | a plain-text data format: `{ "name": "CSG" }`. Strict: double quotes, no trailing commas |
| **Static site** | files the browser opens directly: no server code, no database on the site's side |
| **API** | a server the site asks for data. Ours only answers questions; it never changes anything |
| **GitHub Pages** | GitHub's free hosting. It serves the `docs/` folder as the live site |
| **localhost** | "this computer". `localhost:8765` only works on your own machine |
| **.env** | a settings file with passwords. It's never uploaded to GitHub |

## Put it online

- **Website:** GitHub → **Settings → Pages** → *Deploy from a branch* → `main` / **`/docs`**. Every push to `main` goes live.
- **API:** runs in Docker on the team's VPS. The steps are in [api/README.md](api/README.md#deploy-on-the-vps).

## Using Claude Code?

`CLAUDE.md` tells Claude how the project works and which rules to follow. Open a terminal in the project folder, type `claude`, and ask things like *"add a new org to the database"*.
