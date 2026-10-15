# Campus Compass API

A small, read-only API between the Intramurals Tracker's MySQL database and
the Campus Compass website.

```
Google Sheet ──api.gs──► n8n ──every 30 s──► MySQL ──► this API ──► the website
                 │                                                    ▲
                 └──────────── fallback, if the API is down ──────────┘
```

- **Read-only.** GET only. It logs in as `campus_api`, which can only `SELECT`.
- **Same JSON as the api.gs data link.** `/v1/snapshot` returns the exact
  shape the data link does, so the site can use either one.
- **Small.** Node 24, Express and mysql2, and nothing else. It runs in one
  Docker container next to MySQL and n8n, with HTTPS through Traefik.
- **Owned by the backend team.** The first version was built by the
  database lead.

**Live address:** `https://campus-api.srv1804367.hstgr.cloud`

---

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /health` | `{"ok":true}` when MySQL answers, otherwise **503** `{"ok":false,…}` |
| `GET /v1/snapshot` | Everything, in the data-link shape, plus `sync` and `generated_at` |
| `GET /v1/schedule?date=YYYY-MM-DD` | One day's `matches` and `events`, by start time. Optional `sport`, `college`, `venue`. With no date, today in Manila |
| `GET /v1/venues/now` | For each venue: `ongoing` (Ongoing today) and `next` (the earliest Upcoming item today, or `null`) |
| `GET /v1/status` | The `sync_status` row, for "Updated X min ago" |
| `GET /v1/meta` | `colleges`, `sports`, `venues` |
| `GET /v1/matches/:id` · `GET /v1/events/:id` | One match or event, or **404** |

Rules that apply to every endpoint:

- **Bad input → 400** with a short JSON `error`, e.g. `?date=2026-13-01`,
  a filter longer than its column, or a filter given twice.
- **Database down → 503** with JSON. The process keeps running and recovers
  on its own when MySQL is back.
- **Cached** in memory for `CACHE_SECONDS` (10). Hundreds of students
  refreshing at once cost MySQL one query. Responses also say
  `Cache-Control: public, max-age=10`.
- **CORS**: only the origins in `ALLOWED_ORIGINS` can read the API from a
  browser.
- **Rate limit**: `RATE_LIMIT_PER_MINUTE` requests per minute per IP (600),
  then 429. It's generous on purpose, because a whole campus on Wi-Fi can
  share one IP.
- **Stale data still loads.** When the sync hasn't run for
  `STALE_SECONDS` (180), `sync.stale` is `true`. The data is still sent, and
  the site shows a quiet notice.

### The JSON

```jsonc
{
  "generated_at": "2026-10-12 09:10:00",
  "colleges": ["CCS", "MED", "LAW", "PRIMUS", "NURSING", "CAS", "SBM", "ENG"],
  "sports":   [{ "name": "Frisbee", "code": "FRIS", "format": "Bracket" }],
  "venues":   ["Field (Pitch 1)", "Soccer Field", "Track Oval"],
  "matches": [{
    "match_id": "FRIS-MX-001", "source": "Official", "sport": "Frisbee", "format": "Bracket",
    "category": "Mixed", "round": "Quarterfinal",
    "team_a": "CCS", "team_a_care": "…", "team_a_score": 3,
    "team_b": "MED", "team_b_care": null, "team_b_score": 1,
    "venue": "Field (Pitch 1)", "date": "2026-10-12", "sched_start": "08:00", "sched_end": "08:40",
    "status": "Finished", "winner": "CCS",
    "actual_start": "2026-10-12 08:02:00", "expected_end": "2026-10-12 08:45:00",
    "actual_end": "2026-10-12 08:45:00", "last_updated": "2026-10-12 08:46:10"
  }],
  "events": [{
    "event_id": "ATH-M-020", "sport": "Athletics", "event": "100m Dash", "category": "Men's",
    "round": "Final", "venue": "Track Oval", "date": "2026-10-13",
    "sched_start": "07:30", "sched_end": "07:45", "status": "Finished",
    "first": "CCS", "second": "LAW", "third": "ENG",
    "started_at": "2026-10-13 07:31:00", "ended_at": "2026-10-13 07:44:00",
    "updated_at": null, "expected_end": "2026-10-13 07:45:00",
    "places": [{ "college": "CCS", "place": "1st" }, { "college": "NURSING", "place": "DNF" }]
  }],
  "sync": {
    "last_checked_at": "2026-10-12 09:09:52", "last_changed_at": "2026-10-12 08:46:21",
    "seconds_since_check": 8, "last_error_at": null, "last_error": null, "stale": false
  }
}
```

- **Times are Manila local time with no offset or `Z`.** Dates look like
  `2026-10-12`, times like `08:00`, date-times like `2026-10-12 08:00:00`.
- **Any value can be `null`.** Students fill in the sheet. A value the sync
  couldn't read (a score of "abc", a date of 2026-13-40) arrives as `null`.
- Scores are numbers. `status` is one of Upcoming, Ongoing, Finished,
  Postponed or Cancelled.
- MySQL → JSON renames: `sport_format`→`format`, `match_date`/`event_date`→`date`,
  `event_name`→`event`, `first_place`…→`first`…, events' `last_updated`→`updated_at`.
- `colleges` leaves out `TBD`, which the data link includes. The sync drops
  it on purpose.

**What the results mean (for the frontend):**

- `winner` stays `null` until both colleges agree (Win + Lose, or
  Draw + Draw). A Finished game can have no winner yet, so show the status
  and the scores rather than waiting for `winner`.
- A score is filled in as soon as either college reports it, so one side can
  be `null`.
- An event is Finished as soon as any college enters a place, so 1st–3rd can
  fill in gradually.
- `team_a_care` / `team_b_care` are students' names. They're in the public
  data today, but the site doesn't show them. Whether it ever should is a
  question for the council.

### How the site uses it

`docs/src/js/lib/live-data.js` loads `/v1/snapshot` every 45 seconds while
the page is open. It falls back to the api.gs link if the API fails, takes
over 5 seconds, or returns something that isn't JSON. It converts each match
and event into the site's game format.

The settings live in `CUP_LIVE` in `docs/src/js/data/xavier-cup.js`:
addresses, refresh rate, and the **venue** and **college** mapping tables.

---

## Settings (`.env`)

Copy `.env.example` to `.env`. **Never commit `.env`**: this repository is
public. The root `.gitignore` already excludes it.

| Name | Meaning |
|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` | `campus-mysql`, `3306`, `campus_compass`, `campus_api` |
| `DB_PASSWORD` | `API_DB_PASSWORD` from `/opt/campus-compass/.env` |
| `ALLOWED_ORIGINS` | Comma-separated: exact origins, `http://localhost:*`, or `https://*.name.pages.dev` |
| `CACHE_SECONDS` | How long each answer is kept in memory (5–10) |
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per IP before a 429 |
| `STALE_SECONDS` | Seconds without a sync before `sync.stale` is `true` |
| `TRAEFIK_ENTRYPOINT` `TRAEFIK_CERTRESOLVER` | Copied from n8n's labels (deploy step 2) |

### Add an allowed origin (e.g. a move to Cloudflare Pages)

On the server, in `/opt/campus-api/api`:

```bash
nano .env
```

Add the new origin to the end of `ALLOWED_ORIGINS`, after a comma, e.g.
`…,https://campus-compass.pages.dev`. Save with Ctrl+O, Enter, Ctrl+X. Then:

```bash
docker compose up -d
```

Expect `Container campus-api Started`. That's all; no rebuild is needed.

---

## Run and test on your own computer

You need Node 24 and Docker Desktop. Production MySQL can't be reached from
outside the server, and it shouldn't be, so tests use a throwaway copy.

```bash
cd api
npm install
npm test
```

`npm test` runs the unit tests, with no database needed. Expect `pass 18`.

The database tests start MySQL 8.4 in Docker on `127.0.0.1:3307`, load the
real `01-schema.sql`, and load the sample data through the real
`sync_snapshot` procedure. They need the `campus-compass-db` folder, which
isn't in this repo; ask the database lead for it.

```bash
CC_DB_DIR=/path/to/campus-compass-db npm run test:db
```

Expect `sync_log: ok 12 3 8`, then `pass 34`. Remove the test database
afterwards:

```bash
npm run test:db:stop
```

To run the site against a local API, start the API with the test database:

```bash
DB_HOST=127.0.0.1 DB_PORT=3307 DB_NAME=campus_compass DB_USER=campus_api DB_PASSWORD=test-api-only ALLOWED_ORIGINS='http://localhost:*' PORT=3000 node src/server.js
```

Then serve `docs/` on any localhost port. On localhost the site tries
`http://localhost:3000` first (`CUP_LIVE.devApi`).

---

## Deploy on the VPS

For the database lead, in Hostinger's **Web console**. Run one command at a
time and compare with the expected result before going on.

**Tips for the web console**

- If a pasted command shows up starting with `^[[200~`, type this once by
  hand, then paste again: `bind 'set enable-bracketed-paste off'`
- `docker compose` only works inside the stack's folder
  (`/opt/campus-api/api`).
- `docker compose logs -f` keeps running until you press **Ctrl+C**.
- If a command says *permission denied*, put `sudo ` in front of it.

**Before you start:** the `api/` folder must already be pushed to GitHub,
because step 1 downloads it from there.

### 1. Get the code

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/gdgc-xa/Campus-Compass-GDGoC-XA /opt/campus-api
```

Expect `Cloning into '/opt/campus-api'...`. This downloads the repository
without the website's files.

```bash
cd /opt/campus-api && git sparse-checkout set api && cd api && ls
```

Expect a list that includes `Dockerfile  docker-compose.yml  package.json  src`.

### 2. Find Traefik's names

```bash
docker inspect n8n-9duu-n8n-1 --format '{{json .Config.Labels}}' | tr ',' '\n' | grep -E 'entrypoints|certresolver'
```

Expect two lines, something like:

```
"traefik.http.routers.n8n.entrypoints":"websecure"
"traefik.http.routers.n8n.tls.certresolver":"mytlschallenge"
```

Write down the two values after the colons (here `websecure` and
`mytlschallenge`). Yours may differ; use yours.

### 3. Create the settings file

```bash
cp .env.example .env && chmod 600 .env
```

No output is expected. Next, copy the database password across **without
showing it on screen**:

```bash
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(grep '^API_DB_PASSWORD=' /opt/campus-compass/.env | cut -d= -f2-)/" .env
```

No output is expected. To check it worked without printing it:

```bash
grep -c '^DB_PASSWORD=..' .env
```

Expect `1`. A `0` means the copy didn't work, so stop and check.

Now add the two Traefik values from step 2:

```bash
nano .env
```

Scroll to the bottom and fill in `TRAEFIK_ENTRYPOINT=` and
`TRAEFIK_CERTRESOLVER=`. Save with Ctrl+O, Enter, then exit with Ctrl+X.

### 4. Look at the sync status once

```bash
docker exec campus-mysql sh -c 'MYSQL_PWD="$API_DB_PASSWORD" mysql -ucampus_api campus_compass -e "SELECT * FROM sync_status\G"'
```

Expect the columns `last_checked_at`, `last_changed_at`,
`seconds_since_check`, `last_error_at` and `last_error`. If they differ, tell
the backend team. The API passes every column through, so it still works.

### 5. Build and start

```bash
docker compose up -d --build
```

The first build takes a minute or two. Expect it to end with
`Container campus-api Started`.

```bash
docker compose logs -f
```

Expect `[api] listening on port 3000; allowed origins: https://gdgc-xa.github.io, http://localhost:*`.
Press **Ctrl+C** to stop watching. The API keeps running.

### 6. Check it from inside the server

```bash
docker exec campus-api wget -qO- localhost:3000/health
```

Expect `{"ok":true}`.

### 7. Check it from the internet

In a browser, open `https://campus-api.srv1804367.hstgr.cloud/health`. Expect
`{"ok":true}`. Traefik may take a minute to get the HTTPS certificate, so
retry if you see a certificate warning. Then open
`https://campus-api.srv1804367.hstgr.cloud/v1/status`; `seconds_since_check`
should be under 60.

### 8. Check the server still has room

```bash
docker stats --no-stream
```

Expect `campus-api` to use around 30 MiB of its 150 MiB.

```bash
free -h
```

In the `available` column, expect more than about **1 GB** (1.0Gi).

### 9. Only now, switch the website

Push the site change (`docs/`) to GitHub. GitHub Pages takes 1–2 minutes to
update.

### Roll back

```bash
cd /opt/campus-api/api && docker compose down
```

Expect `Container campus-api Removed`. The site then uses the api.gs
fallback, but **only if** `CUP_LIVE.fallback` is set in
`docs/src/js/data/xavier-cup.js`. Without it, the site shows "Live results
are unavailable".

### Update after a code change

```bash
cd /opt/campus-api && git pull && cd api && docker compose up -d --build
```

---

## Safety

- No port is published on the server. Traefik reaches the container over
  the Docker network `n8n-9duu_default`, the same way it reaches n8n.
- The container runs as a non-root user with a read-only filesystem, no
  Linux capabilities, and a 150 MB memory limit.
- MySQL access is `SELECT`-only, and every query uses `?` placeholders.
  Visitor input is never pasted into SQL.
- Errors are logged one line each to `docker compose logs`, with no passwords
  or data.
- This API never touches the schema, `sync_snapshot`, n8n, the sheet or the
  Apps Script. A change there belongs to the database lead.
