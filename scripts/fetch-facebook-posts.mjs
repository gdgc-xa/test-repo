/**
 * Fetch the Facebook page's posts for News & Updates
 * ------------------------------------------------------------
 * Run by .github/workflows/facebook-news.yml (every 30 minutes, and
 * whenever docs/src/js/data/news-featured.js changes). Writes
 * docs/src/js/data/cup-posts.json, which the site reads:
 *
 *   {
 *     page:     { name, link },          // the page, for labels
 *     posts:    [ post, … ],             // newest first → the carousel
 *     featured: [ { key, …post }, … ]    // posts named in news-featured.js
 *   }
 *   post = { id, title, body, date, link, image, shared }
 *
 * Every post the page makes shows up, and so does every post it
 * shares: a share's own caption is often empty, so its text and
 * picture are taken from what was shared.
 *
 * Pictures are downloaded into docs/assets/news/ and the JSON points
 * at those copies. Facebook's own image links are signed and stop
 * working after a few days, so the site never depends on them
 * (they are only used if a download fails, and the next run fixes
 * that). Pictures no longer used are deleted.
 *
 * The Page access token comes from the FB_PAGE_TOKEN secret, so it
 * never ships to the browser. No server, no database: the output is
 * two kinds of static files committed to the repo.
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';

const GRAPH = 'https://graph.facebook.com/v26.0';
// "Campuss Compass TEST" (facebook.com/profile.php?id=61595123270779). This is the Graph
// API Page ID from the Page's About > Page transparency, not the number in its web address.
// Set the FB_PAGE_ID repository variable to switch pages without editing this file.
const PAGE_ID = process.env.FB_PAGE_ID || '1301081723094199';
const POST_COUNT = 12;                          // how many recent posts the carousel gets
const OUT_FILE = new URL('../docs/src/js/data/cup-posts.json', import.meta.url);
const FEATURED_FILE = new URL('../docs/src/js/data/news-featured.js', import.meta.url);
const IMAGE_DIR = new URL('../docs/assets/news/', import.meta.url);
const IMAGE_URL_PREFIX = 'assets/news/';        // as seen from docs/index.html
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const FIELDS = [
  'id', 'message', 'story', 'created_time', 'permalink_url', 'full_picture', 'parent_id',
  'attachments{type,title,description,media,subattachments{media}}',
].join(',');

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Trim so a stray space or newline pasted into the secret doesn't break the token.
const token = process.env.FB_PAGE_TOKEN?.trim();
if (!token) {
  // Skip instead of failing so scheduled runs don't send failure emails before setup.
  console.log('::warning::FB_PAGE_TOKEN is not set. Add it under Settings > Secrets and variables > Actions.');
  process.exit(0);
}

/* ---------- Graph API ---------- */

async function graph(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  url.search = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Graph API error messages never include the token, so this is safe to log.
    // The code/subcode pair tells expired (190/463), revoked (190/460) and malformed tokens apart.
    const { message = 'unknown error', code, error_subcode } = body.error ?? {};
    const err = new Error(`Graph API ${res.status} (code ${code ?? '-'}/${error_subcode ?? '-'}): ${message}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

/* ---------- Text ---------- */

// Facebook posts often use "styled" Unicode letters (𝐁𝐎𝐋𝐃, 𝘪𝘵𝘢𝘭𝘪𝘤). NFKC folds
// them back to plain letters so the site's own fonts can set them.
const plain = (text) => String(text ?? '').normalize('NFKC');

// Counts characters by code point so emoji aren't cut mid-character.
function truncate(text, max) {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max - 1).join('').trimEnd() + '…' : text;
}

// Graph API sends "2026-09-27T12:34:56+0000"; add the colon so every browser parses it.
const isoDate = (createdTime) => createdTime.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

/* ---------- Pictures ---------- */

/**
 * The best picture a post has. The attachment's own image is full
 * size; for an album it is the first photo; full_picture is
 * Facebook's ~720px copy, used when there is nothing better.
 */
function pictureUrl(post) {
  const att = post.attachments?.data?.[0];
  return att?.media?.image?.src
    || att?.subattachments?.data?.[0]?.media?.image?.src
    || post.full_picture
    || null;
}

// "1301081723094199_122093247141504109" → "122093247141504109", safe as a file name.
const postNumber = (postId) => String(postId).split('_').pop().replace(/[^0-9A-Za-z-]/g, '');

/**
 * Download a post's picture into assets/news/. Returns the site-relative
 * path, or null when there is no picture or the download fails — a
 * missing picture must never stop the news from updating.
 */
async function savePicture(post) {
  const src = pictureUrl(post);
  if (!src) return null;
  try {
    const res = await fetch(src);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT_BY_TYPE[type];
    if (!res.ok || !ext) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
    const name = `${postNumber(post.id)}.${ext}`;
    await writeFile(new URL(name, IMAGE_DIR), bytes);
    return IMAGE_URL_PREFIX + name;
  } catch (err) {
    console.log(`::warning::Could not save the picture for post ${post.id}: ${err.message}`);
    return null;
  }
}

/* ---------- One post ---------- */

async function toPost(post) {
  const att = post.attachments?.data?.[0] ?? {};
  const shared = Boolean(post.parent_id) || att.type === 'share' || /\bshared\b/i.test(post.story || '');

  // The page's own words first; for a share with no caption, the shared post's.
  const own = plain(post.message).trim();
  const theirs = plain(att.description || att.title || '').trim();
  const text = own || theirs || plain(post.story).trim();

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let title = lines[0] || 'New post';
  let body = lines.slice(1).join(' ');
  // A share with a caption: show the caption as the title and what
  // was shared as the body, so both are there.
  if (own && theirs && shared && !body) body = theirs;

  return {
    id: post.id,
    title: truncate(title, 110),
    body: truncate(body, 320),
    date: isoDate(post.created_time),
    link: post.permalink_url,
    image: (await savePicture(post)) || pictureUrl(post),
    shared,
  };
}

/* ---------- Featured list (news-featured.js) ---------- */

/**
 * Read news-featured.js. It is an ES module full of comments, so it is
 * loaded as a module (from a data: URL, which Node always treats as
 * ESM) rather than parsed by hand.
 */
async function readFeatured() {
  try {
    const source = await readFile(FEATURED_FILE, 'utf8');
    const mod = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
    const cfg = mod.FEATURED_NEWS ?? {};
    return cfg.enabled === false ? [] : (cfg.items ?? []);
  } catch (err) {
    console.log(`::warning::Could not read news-featured.js: ${err.message}`);
    return [];
  }
}

/** The numeric post id in a Facebook link or id, or null. */
function linkToPostNumber(value) {
  const s = String(value ?? '').trim();
  const m = s.match(/\/posts\/(\d+)/) || s.match(/[?&](?:story_fbid|fbid)=(\d+)/)
    || s.match(/\/permalink\/(\d+)/) || s.match(/^(?:\d+_)?(\d+)$/);
  return m ? m[1] : null;
}

const searchable = (p) => `${p.title} ${p.body}`.toLowerCase();

/* ============================================================ */

await mkdir(IMAGE_DIR, { recursive: true });

// The page itself, so the site can label posts with its real name.
let page = null;
try {
  const info = await graph(PAGE_ID, { fields: 'name,link' });
  page = { name: plain(info.name), link: info.link || null };
} catch (err) {
  console.log(`::warning::Could not read the page's name: ${err.message}`);
}

// The newest posts, shares included.
let latestRaw;
try {
  latestRaw = (await graph(`${PAGE_ID}/posts`, { fields: FIELDS, limit: String(POST_COUNT) })).data ?? [];
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
latestRaw.sort((a, b) => b.created_time.localeCompare(a.created_time));
const posts = [];
for (const raw of latestRaw.slice(0, POST_COUNT)) posts.push(await toPost(raw));

// Featured posts: found among the newest, or fetched by id if older.
const featured = [];
for (const item of await readFeatured()) {
  if (item?.post) {
    const num = linkToPostNumber(item.post);
    if (!num) { console.log(`::warning::Can't read a post id from ${item.post}`); continue; }
    let hit = posts.find(p => postNumber(p.id) === num);
    if (!hit) {
      try {
        hit = await toPost(await graph(`${PAGE_ID}_${num}`, { fields: FIELDS }));
      } catch (err) {
        console.log(`::warning::Featured post ${num} not found: ${err.message}`);
      }
    }
    if (hit) featured.push({ key: `post:${num}`, ...hit });
  } else if (item?.match) {
    const needle = String(item.match).toLowerCase().trim();
    const hit = posts.find(p => searchable(p).includes(needle));
    if (hit) featured.push({ key: `match:${needle}`, ...hit });
    else console.log(`::warning::No recent post contains "${item.match}"`);
  }
  // Items written out in full need nothing from Facebook; the site reads them directly.
}

// Keep the folder to the pictures the JSON actually uses (and hand-added ones).
const keep = new Set([...posts, ...featured]
  .filter(p => p.image?.startsWith(IMAGE_URL_PREFIX))
  .map(p => p.image.slice(IMAGE_URL_PREFIX.length)));
for (const entry of await readdir(IMAGE_DIR, { withFileTypes: true })) {
  if (entry.isFile() && !keep.has(entry.name) && entry.name !== '.gitkeep') {
    await rm(new URL(entry.name, IMAGE_DIR));
  }
}

await writeFile(OUT_FILE, JSON.stringify({ page, posts, featured }, null, 2) + '\n');
const saved = posts.filter(p => p.image?.startsWith(IMAGE_URL_PREFIX)).length;
console.log(`Saved ${posts.length} post(s) (${saved} with a picture, ${posts.filter(p => p.shared).length} shared) `
  + `and ${featured.length} featured to docs/src/js/data/cup-posts.json`);
