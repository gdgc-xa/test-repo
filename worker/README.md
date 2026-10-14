# TXC Compass: Facebook News Feed Setup

This guide covers every step needed to show posts from the official **TXC Compass Facebook Page** in the **News & Updates** section of the Xavier Cup tab, including departmental posts that the Page has reshared.

It covers the Meta (Facebook) setup, the Cloudflare Worker, the two small website edits, testing, troubleshooting and maintenance.

---

## Table of contents

1. [How it works](#1-how-it-works)
2. [What you need before starting](#2-what-you-need-before-starting)
3. [Files in this setup](#3-files-in-this-setup)
4. [Part A: Meta (Facebook) setup](#4-part-a-meta-facebook-setup)
5. [Part B: Cloudflare Worker setup](#5-part-b-cloudflare-worker-setup)
6. [Part C: Test the Worker locally (optional)](#6-part-c-test-the-worker-locally-optional)
7. [Part D: Connect the website](#7-part-d-connect-the-website)
8. [Part E: Verify everything](#8-part-e-verify-everything)
9. [What a post looks like](#9-what-a-post-looks-like)
10. [Reshared posts and the date limitation](#10-reshared-posts-and-the-date-limitation)
11. [Troubleshooting](#11-troubleshooting)
12. [Security notes](#12-security-notes)
13. [Costs and limits](#13-costs-and-limits)
14. [Maintenance](#14-maintenance)
15. [Cleaning up the old pipeline](#15-cleaning-up-the-old-pipeline)
16. [Summary of every change](#16-summary-of-every-change)

---

## 1. How it works

```
 TXC Compass Facebook Page ──(Graph API, every 15 min)──▶ Cloudflare Worker
                                                              │  stores posts + pictures
                                                              ▼
                                                        Cloudflare KV
                                                              │
 Visitor's browser ◀── /posts.json, /img/<name> ◀── Worker (cached at the edge)
```

- A **scheduled job** inside the Worker runs every 15 minutes. It reads the latest posts from the **one** TXC Compass Page, saves them in Cloudflare KV, and downloads each post's picture into KV too.
- **Visitors never call Facebook.** The website downloads `/posts.json` from the Worker. Many visitors only hit Cloudflare's cache, so traffic does not affect Facebook rate limits.
- The **access token** is stored as a Cloudflare **secret**. It is never in the repository and never sent to the browser.
- Departmental posts appear because the TXC Compass Page **reshares** them, so they arrive in the Page's own post list. The Worker does not read the departmental Pages directly.
- Facebook picture links expire after a few days, so the Worker stores its own copy of each picture and serves it.
- If Facebook returns an error, the Worker **keeps serving the last good copy**.

**Why a Worker and not a GitHub Action:** a GitHub Action cannot read a Cloudflare secret, and contributors without repository secret access cannot add one. The Worker keeps the token in Cloudflare and needs no repository write access.

---

## 2. What you need before starting

| Need | Details |
|---|---|
| Facebook account | Must be an **admin of the TXC Compass Page** (full control, or a role that can see content). |
| Meta developer account | Free, at <https://developers.facebook.com>. |
| Cloudflare account | Free, at <https://dash.cloudflare.com>. |
| Node.js | Version **18 or newer**. Check with `node -v`. |
| The website repo | To edit two files (`cup.js` and `xavier-cup.js`). If you are only a contributor, send these as a pull request. |

---

## 3. Files in this setup

| File | Where it goes | Purpose |
|---|---|---|
| `worker/src/index.js` | A `worker/` folder (can live outside the website repo) | The Worker: fetches Facebook posts on a schedule and serves them. |
| `worker/wrangler.toml` | Same `worker/` folder | Worker configuration: name, schedule, Page ID, KV storage. |
| `cup.js` | `src/js/screens/cup.js` in the website | Website code that loads the news. One small edit so it accepts a full web address. |
| `xavier-cup.js` | `src/js/data/xavier-cup.js` in the website | Website settings. The `feed` line points at the Worker. |

---

## 4. Part A: Meta (Facebook) setup

The Worker needs a **Page access token** for the TXC Compass Page. This part produces that token and the Page ID.

### A1. Create a Meta app

1. Go to <https://developers.facebook.com> and log in with the Facebook account that is an admin of the Page.
2. Open **My Apps → Create App**.
3. Choose the **Other** or **Business** use case/type (the options vary over time). Give the app a name, for example `TXC Compass News`.
4. Leave the app in **Development mode**. You do not need App Review to read your own Page, because you are an admin of both the app and the Page.
5. Open **App settings → Basic** and note the **App ID** and **App Secret**. You will need them in step A4. Never share or commit the App Secret.

### A2. Open Graph API Explorer

Go to <https://developers.facebook.com/tools/explorer> and select your app in the **Meta App** dropdown on the right.

How to use the Explorer correctly (two earlier mistakes were made here):

- The method (**GET**) is a **dropdown** next to the path box. Do **not** type `GET` into the path box, or you get `Unknown path components`.
- Type only the path, for example `me/accounts`.
- The token in use is chosen under **User or Page** on the right. A new-style Page needs a **Page** token for Page calls. A **User** token gives error `190` with subcode `2069032` ("User Access Token Is Not Supported").

### A3. Get a user token with the right permissions

1. In the Explorer, under **Permissions**, add:
   - `pages_show_list`
   - `pages_read_engagement`
2. Click **Generate Access Token** and approve. When the dialog asks which Pages to allow, **tick the TXC Compass Page**.
3. You now have a **short-lived user token**. Copy it.

### A4. Exchange it for a long-lived user token

Open this address in your browser (or use `curl`), replacing the placeholders. Do this on your own computer only:

```
https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<SHORT_LIVED_USER_TOKEN>
```

The response contains an `access_token`. That is the **long-lived user token** (valid for about 60 days).

### A5. Get the Page token and the Page ID

1. In the Explorer, paste the long-lived user token into the **Access Token** box (or call this address in a browser):
   ```
   https://graph.facebook.com/v26.0/me/accounts?access_token=<LONG_LIVED_USER_TOKEN>
   ```
2. Find the **TXC Compass** entry in the result. It looks like this:
   ```json
   { "access_token": "EAA...", "name": "TXC Compass", "id": "1374516699075273", ... }
   ```
3. Copy two values:
   - **`access_token`** is your **Page access token**. A Page token obtained this way normally does not expire.
   - **`id`** is the **Graph API Page ID**. This is the value for `FB_PAGE_ID`.

> **About Page IDs.** The number in a `facebook.com/profile.php?id=...` address, or in post links, can be **different** from the Graph API ID. Always use the `id` from `/me/accounts`. If you use the wrong one, Facebook can answer with permission errors.

### A6. Check the token

1. Open <https://developers.facebook.com/tools/debug/accesstoken> and paste the Page token.
2. Confirm:
   - **Type** is **Page**.
   - **Profile ID** matches the Page ID from A5.
   - **Scopes** include `pages_read_engagement`.
   - **Expires** says `Never` (or a far-off date).

### A7. Test the Page call in the Explorer

1. Under **User or Page**, choose **TXC Compass** (this switches to the Page token), or paste the Page token directly.
2. Set the method to **GET**, and enter this path:
   ```
   <PAGE_ID>/posts?limit=2&fields=id,message,created_time,permalink_url,parent_id,attachments
   ```
3. You should get a list of posts. A reshared post shows a `parent_id` and an `attachments` entry whose `title` looks like `Photos from The Xavier Cup: <Department>'s post`.

### A8. Revoke any token that was ever exposed

The Explorer's response can contain a `next` address with a live access token inside it. If you pasted any such output into a chat, a ticket or a repo:

1. Open Facebook → **Settings → Business integrations** (also called *Apps and websites*).
2. Remove your app. This revokes the tokens issued to it.
3. Repeat steps A3 to A5 to create a fresh token. Use that fresh one below.

---

## 5. Part B: Cloudflare Worker setup

Run all commands inside the `worker/` folder (the folder that contains `wrangler.toml` and `src/`).

```
cd worker
```

### B1. Log in to Cloudflare

```
npx wrangler login
```

A browser window opens. Approve the login. (The first run offers to install Wrangler. Say yes.)

### B2. Create the KV storage

KV is where the Worker keeps the posts and pictures.

```
npx wrangler kv namespace create NEWS
```

It prints a block like:

```toml
[[kv_namespaces]]
binding = "NEWS"
id = "0123456789abcdef0123456789abcdef"
```

Open `wrangler.toml` and replace `PASTE_KV_NAMESPACE_ID_HERE` with that `id`. Keep `binding = "NEWS"` exactly as it is.
(If your Wrangler version offers to add the block to your config automatically, accepting it is fine. Just make sure there is only one `NEWS` binding.)

> On older Wrangler versions the command is `npx wrangler kv:namespace create NEWS`.

### B3. Check `wrangler.toml`

It should read:

```toml
name = "txc-compass-news"
main = "src/index.js"
compatibility_date = "2026-10-01"

# Refresh from Facebook every 15 minutes.
[triggers]
crons = ["*/15 * * * *"]

[vars]
FB_PAGE_ID = "1374516699075273"
# Optional: badge for posts the Page wrote itself (default "TXC").
# FB_DEFAULT_TAG = "TXC"

[[kv_namespaces]]
binding = "NEWS"
id = "<your KV id>"
```

- Set `FB_PAGE_ID` to the `id` you got in step A5, if it differs.
- `FB_PAGE_ID` is not secret, so it can stay in this file.
- Change `FB_DEFAULT_TAG` if you want a different badge for posts the Page wrote itself.

### B4. Store the token as a Cloudflare secret

```
npx wrangler secret put FB_PAGE_TOKEN
```

Paste the **Page access token** when asked (the input is hidden), then press Enter. If Wrangler offers to create the Worker first, say yes.

The token is now stored encrypted in Cloudflare. It is **not** in any file.

### B5. Deploy

```
npx wrangler deploy
```

At the end it prints your Worker address, for example:

```
https://txc-compass-news.<your-subdomain>.workers.dev
```

Save this address. You need it in Part D.

### B6. Wait for the first refresh, then check

- The scheduled job runs every 15 minutes. Until the first run, the Worker returns an empty list (`[]`).
- To watch the live logs while you wait:
  ```
  npx wrangler tail
  ```
  When the job runs, you should see a line like `Saved 6 post(s), 6 reshared, 6 with a picture.`
- In the Cloudflare dashboard you can also confirm the schedule exists: **Workers & Pages → txc-compass-news → Settings → Triggers** (the name varies slightly).
- Then open this in your browser:
  ```
  https://txc-compass-news.<your-subdomain>.workers.dev/posts.json
  ```
  It should list your posts.

---

## 6. Part C: Test the Worker locally (optional)

This lets you check the token and the logic without waiting for the schedule. Local testing uses a **separate, simulated KV**, so it does not fill the live one.

1. Inside `worker/`, create a file called `.dev.vars` containing:
   ```
   FB_PAGE_TOKEN=<your page token>
   ```
   Add `.dev.vars` to `.gitignore` so it is never committed.
2. Start the dev server with scheduled-job testing turned on:
   ```
   npx wrangler dev --test-scheduled
   ```
3. In a second terminal, trigger the job once:
   ```
   curl "http://localhost:8787/cdn-cgi/handler/scheduled"
   ```
   (Older Wrangler versions use `http://localhost:8787/__scheduled`.)
4. Open `http://localhost:8787/posts.json`. You should see your posts.
5. Press Ctrl+C to stop.

---

## 7. Part D: Connect the website

Two files change. If you are only a contributor, make these edits in a branch and open a pull request.

### D1. `src/js/screens/cup.js`: accept a full web address

The original `loadPosts()` always put `../data/` in front of the feed setting, which breaks a full address. Find this line (around line 662):

```js
const url = new URL(`../data/${CUP_NEWS.feed}`, import.meta.url);
```

Replace it with:

```js
// A full https:// address (the news Worker) is used as is; anything
// else is a file name inside ../data/.
const feed = String(CUP_NEWS.feed);
const url = /^https:\/\//i.test(feed) ? new URL(feed) : new URL(`../data/${feed}`, import.meta.url);
```

Or replace the whole file with the supplied `cup.js`. Nothing else in it changes.

### D2. `src/js/data/xavier-cup.js`: point the feed at the Worker

In the `CUP_NEWS` block, change these values:

```js
export const CUP_NEWS = {
  enabled: true,
  title: 'News & Updates',
  kicker: 'From the TXC Compass page',
  pageName: 'TXC Compass',
  pageUrl: 'https://www.facebook.com/<real TXC Compass page address>',
  pageHandle: '<real handle>',
  followLabel: 'Open the Facebook page',

  feed: 'https://txc-compass-news.<your-subdomain>.workers.dev/posts.json',

  maxPosts: 6,
  ...
};
```

- `feed` is the Worker address from step B5, ending in `/posts.json`.
- `pageUrl` and `pageHandle` still point at the old `XUCSG` page in the files provided. Set them to the real TXC Compass Page address and handle so the "Open the Facebook page" button goes to the right place.
- `kicker` and `pageName` are the wording shown above the news. They can be left as the supplied values.
- The comment above `CUP_NEWS` still mentions a GitHub Action. It is now out of date and can be updated or removed.
- The hand-written `posts` list below `feed` is kept as a fallback. If the Worker is down, empty or unreachable, the site shows those posts instead.

### D3. Run the website locally to check

The site uses JavaScript modules, so it cannot be opened by double-clicking `index.html`. Serve the `docs` folder:

```
cd docs
python -m http.server 8000
```

Then open <http://localhost:8000>. (Use `python3` on Mac or Linux. Alternatives: `npx serve docs`, or the VS Code "Live Server" extension.)

---

## 8. Part E: Verify everything

1. Open `https://<your-worker>/posts.json`. It should list the posts. Reshared ones have `"shared": true` and `"origin": "<department>"`.
2. Open the website, then **Xavier Cup → News**. Hard-refresh first (Ctrl+Shift+R, or Cmd+Shift+R on Mac).
3. Check that:
   - The newest post is featured and the others appear as cards.
   - Reshared posts show the **department name** as the badge.
   - Pictures load.
   - Clicking a post opens the **TXC Compass post on Facebook in a new tab**.
4. **Reshare test:** from the TXC Compass Page, reshare a post from a departmental Page. Within 15 minutes it should appear at the top with the department badge. Check `/posts.json` for the entry, with `shared: true`, `origin` set to the department and `originalLink` set to the department's own post.
5. If you still see the old sample posts, the site fell back to its hand-written list. See [Troubleshooting](#11-troubleshooting).

---

## 9. What a post looks like

`/posts.json` returns a list, newest share first (up to 6):

```json
{
  "id": "1374516699075273_122094486489516448",
  "tag": "Arcane Wizards",
  "title": "Shared from Arcane Wizards",
  "body": "",
  "date": "2026-10-12T01:00:00+00:00",
  "sharedDate": "2026-10-12T01:00:00+00:00",
  "link": "https://www.facebook.com/1374516699075273/posts/122094486489516448",
  "image": "https://txc-compass-news.<sub>.workers.dev/img/122094486489516448.jpg",
  "shared": true,
  "origin": "The Xavier Cup: Arcane Wizards",
  "originalLink": "https://www.facebook.com/122183649398966007/posts/122183617928966007"
}
```

| Field | Meaning |
|---|---|
| `id` | The Facebook post ID of the TXC Compass post. |
| `tag` | The badge shown on the card. For reshares, the department name (the leading "The Xavier Cup:" is removed and long names are shortened to 28 characters). For posts the Page wrote itself, `TXC` (or `FB_DEFAULT_TAG`). |
| `title` | First line of the post text, up to 90 characters. For a reshare with no caption it uses the original post's text, or `Shared from <department>` if there is none. |
| `body` | The rest of the text, up to 180 characters. |
| `date` | The date shown on the site. See [section 10](#10-reshared-posts-and-the-date-limitation). |
| `sharedDate` | When the TXC Compass Page published or shared the post. |
| `link` | The TXC Compass post. This is where clicking a card goes. |
| `image` | The Worker's own copy of the picture, or `null` if the post has none. |
| `shared` | `true` if TXC Compass reshared someone else's post. |
| `origin` | The department that first published it, or `null` if Facebook did not say. |
| `originalLink` | The department's own post address, or `null`. Only Facebook addresses are kept. |

The site ignores `sharedDate`, `shared`, `origin` and `originalLink` for now. They are there if you want to show more later.

How each case is handled:

- **Missing text:** falls back to the original post's text, then the Page's story line, then a default title.
- **Missing picture:** the site shows its own placeholder graphic.
- **Pictures:** each is downloaded once, limited to 4 MB, and removed when the post is no longer in the latest 6.
- **Special letters:** Facebook's styled Unicode letters (bold or italic) are converted to plain letters.
- **Deleted or unavailable posts:** these simply drop out of the list on the next refresh.

---

## 10. Reshared posts and the date limitation

### How a reshare is recognised

A post counts as a reshare if Facebook gives it a `parent_id`, or its story line says "… shared X's post". The department name comes from:

1. the story line ("… shared X's post"), or
2. the attachment title ("Photos from X's post"), or
3. a lookup of the original post's author (this may be refused, see below).

### The date limitation

The site shows the `date` field. Ideally this is the date the **department** first posted, not the date TXC Compass shared it. The Worker tries to ask Facebook for the original post's date using the `parent_id`. **Facebook usually refuses this**, because reading another Page's posts requires an extra Meta feature, **Page Public Content Access**.

What happens:

- If Facebook allows it, `date` is the original date and `sharedDate` is the share date.
- If Facebook refuses, `date` is the **share date**. The Worker logs `Could not read the original date of post …`. Nothing breaks.

The "New" badge on cards also follows `date`.

The list order is always by **share date**, so the most recently shared post comes first.

### Options to get the real original date

1. **Label it honestly (easy).** Show "Shared Oct 12" instead of a bare date on reshared posts. This needs a small edit to `cup.js`, and the failed date lookup can be removed from the Worker to stop six refused calls per refresh.
2. **Hide the date on reshares.** Posts the Page wrote itself keep their date.
3. **Request Page Public Content Access from Meta.** This is an App Review process. It requires **business verification**, possibly extra contracts, a privacy policy, a clear use description and a screen recording. The allowed usage is to analyze and/or display posts and engagement on Pages, which matches this use. It is slow, approval is not guaranteed, and it is built for companies, so a student project may struggle. Steps:
   1. In the Meta App Dashboard, complete the app's basic settings (icon, privacy policy URL, data deletion instructions, category).
   2. Start business verification for the organization that owns the app.
   3. Open **App Review → Permissions and features**, find **Page Public Content Access** and request it.
   4. Describe the use, and record the News & Updates section showing posts shared from department Pages.
   5. Submit and wait for the decision. If approved, set the app to Live mode.
4. **Add the department admins as app testers.** While an app is in testing, it can read a Page's content if that Page's admin has an admin, developer or tester role on the app. This only works in development mode and needs each department's admin to agree.

---

## 11. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Explorer: `Unknown path components: /<id>/posts` (code 2500) | You typed `GET` in the path box. Pick GET in the dropdown and type only `<id>/posts?...`. |
| `Invalid OAuth 2.0 Access Token`, code 190, subcode 2069032, "User Access Token Is Not Supported" | A **user** token was used. Switch to the Page token (**User or Page → TXC Compass**) or use the `access_token` from `/me/accounts`. |
| Code 190 (other subcodes) | The token is expired, revoked or mistyped. Repeat steps A3 to A5, then `npx wrangler secret put FB_PAGE_TOKEN` again. |
| Code 10: "requires the pages_read_engagement permission or the Page Public Content Access feature" | One of: (1) the token is not a Page token for this Page, so check step A6; (2) `FB_PAGE_ID` belongs to a different Page than the token, so use the `id` from `/me/accounts`; (3) the call is reaching into **another** Page's post (original date or author). In the Worker, the author and date lookups are allowed to fail. The main post fetch retries without the reshare fields on code 10 or 100. |
| Code 100 | A requested field is invalid. The Worker retries with the basic fields. |
| Log: `Could not read the original date/author of post …` | Facebook refused to read the original post. This is expected without Page Public Content Access. See [section 10](#10-reshared-posts-and-the-date-limitation). |
| Log: `Graph API error … (code …/…)` and the site still shows older posts | Facebook rejected the main call. The Worker keeps serving the last good copy. Fix the token or Page ID as above. |
| `FB_PAGE_TOKEN secret is not set` | Run `npx wrangler secret put FB_PAGE_TOKEN` in the `worker/` folder and redeploy. |
| `/posts.json` returns `[]` | The first scheduled run has not happened yet (wait up to 15 minutes), or it failed. Check `npx wrangler tail`. |
| The News tab shows the old sample posts | The site fell back. Check that `feed` is the full `https://…/posts.json` address, that `cup.js` has the D1 change, that `/posts.json` itself works, and hard-refresh. |
| Browser console shows a CORS error | The Worker already allows any origin. Check that the address is exactly the Worker's address and uses `https`. |
| Cards show a placeholder instead of a picture | The post has no picture, the picture is over 4 MB, or the download failed. Check the Worker log for `Could not save the picture`. |
| `/img/<name>` returns 404 | The picture is no longer in the latest 6 posts and was removed. Refresh the site. |
| A new department badge looks unstyled | If the site's CSS styles badges by value (it used to say `CSG`), new names get the default style. Edit the CSS if needed. |
| Posts take up to 15 minutes to appear | This is the refresh interval. Change `crons` in `wrangler.toml` if needed (see [Maintenance](#14-maintenance)). |
| Browser keeps showing old content | Hard-refresh. The Worker tells browsers to reuse `/posts.json` for 5 minutes. |

---

## 12. Security notes

- The Page token lives **only** as a Cloudflare secret. Never put it in `wrangler.toml`, the website code, a README or a chat message.
- `.dev.vars` (local testing) must be in `.gitignore`.
- Never share the **App Secret**.
- Graph API error messages do not contain the token, so Worker logs are safe to share.
- `/posts.json` is public and open to any website, because it only contains posts that are already public on Facebook.
- If a token is exposed anywhere, revoke it as in step A8, create a new one, and run `npx wrangler secret put FB_PAGE_TOKEN` again.
- The site only follows links that are real `https` addresses. The Worker only keeps `originalLink` values that point to facebook.com.

---

## 13. Costs and limits

Always check Cloudflare's pricing page for the current numbers. At the time of writing:

- **Workers (free plan):** about 100,000 requests per day. Cloudflare's edge cache means most visits are served from the cache.
- **KV (free plan):** daily limits on reads and writes. This setup writes the posts list once per refresh (96 times a day) and writes each picture only once, so it stays far below the limits.
- Over the limit, the paid Workers plan is about $5 a month.
- **Facebook:** the Worker makes about 96 refreshes a day, plus a few lookups per refresh. This is well within Graph API rate limits. Visitors never trigger Facebook calls.

---

## 14. Maintenance

**Change how often it refreshes.** Edit `crons` in `wrangler.toml`, then run `npx wrangler deploy`:
- `"*/15 * * * *"`: every 15 minutes (current)
- `"0 * * * *"`: every hour
- `"*/5 * * * *"`: every 5 minutes

**Change the Page.** Update `FB_PAGE_ID` in `wrangler.toml`, create a token for that Page (Part A), run `npx wrangler secret put FB_PAGE_TOKEN`, then `npx wrangler deploy`.

**Replace an expired or revoked token.** Repeat A3 to A5, then `npx wrangler secret put FB_PAGE_TOKEN`. No redeploy is needed for a secret change in most cases. If posts do not update, run `npx wrangler deploy` once.

**Watch live logs.** `npx wrangler tail`

**Change the badge for the Page's own posts.** Uncomment and edit `FB_DEFAULT_TAG` in `wrangler.toml`, then deploy.

**Change how many posts are kept.** `POST_COUNT` at the top of `worker/src/index.js` (default 6). Also check `maxPosts` in `CUP_NEWS` in `xavier-cup.js`, which limits how many the site shows.

**Show posts from more than one Page.** Not supported as written. It would need one token per Page (from an admin of each Page) and an edit to the Worker so it loops over several Pages. Reshared posts could then appear twice and would have to be de-duplicated by `parent_id`.

---

## 15. Cleaning up the old pipeline

An earlier design used a GitHub Action that ran a Node script and committed a JSON file. Once the Worker is confirmed working on the live site, these are no longer used:

- `scripts/fetch-facebook-posts.mjs`
- `docs/src/js/data/cup-posts.json`
- `docs/assets/news/` (downloaded pictures)
- `.github/workflows/facebook-news.yml`, if it exists

Remove them only after the Worker works. If you are a contributor, say in your pull request that they are now unused so maintainers know it is safe to delete them.

Note: the old script is out of date compared with the Worker (for example it has no original-date lookup), so it should not be used for new work.

---

## 16. Summary of every change

**Meta**
1. Create a Meta app (Development mode).
2. Get a long-lived user token, then the TXC Compass **Page access token** and **Page ID** from `/me/accounts`.
3. Verify the token in the Access Token Debugger. Revoke any token that was exposed.

**Cloudflare Worker (`worker/`)**
1. Add `src/index.js` and `wrangler.toml`.
2. `npx wrangler login`
3. `npx wrangler kv namespace create NEWS`, then paste the id into `wrangler.toml`.
4. Set `FB_PAGE_ID` in `wrangler.toml`.
5. `npx wrangler secret put FB_PAGE_TOKEN`
6. `npx wrangler deploy`
7. Wait for the first run (up to 15 minutes) and check `/posts.json`.

**Website**
1. `src/js/screens/cup.js`: replace the one `new URL(...)` line in `loadPosts()` (step D1).
2. `src/js/data/xavier-cup.js`: set `feed` to the Worker's `/posts.json` address, and set `pageUrl` and `pageHandle` to the real TXC Compass Page (step D2).

**What the changes do**
- Posts shared by the TXC Compass Page, including departmental reshares, appear automatically, with no manual entry.
- Reshared posts show the department as the badge and link to the TXC Compass post. The department's own post address is kept as `originalLink`.
- Missing text, pictures or metadata are handled with fallbacks. Loading, empty and error states fall back to the site's hand-written posts.
- The token is never exposed to the browser.
- The site's layout, styling and other features are unchanged.

**Known limitation**
- The date shown on reshared posts is the date TXC Compass shared them, unless Facebook allows the original date to be read (see section 10).
