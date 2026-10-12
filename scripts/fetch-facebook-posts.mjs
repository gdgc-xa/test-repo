/**
 * Fetch TXC Compass Facebook posts
 * ------------------------------------------------------------
 * Pulls the latest posts from the main TXC Compass Facebook Page
 * through the Graph API and writes them to
 * docs/src/js/data/cup-posts.json, which the News & Updates section
 * of the Xavier Cup tab reads. The newest post becomes the featured
 * story.
 *
 * Only this one Page is read. Departmental posts show up because the
 * TXC Compass Page reshares them, so they arrive in its own /posts
 * edge. Nothing is pulled from the departmental Pages directly.
 *
 * Reshares keep both identities:
 *   link / tag     the TXC Compass post, and the department's name
 *   shared         true when TXC Compass reshared someone else's post
 *   origin         the department that first published it (or null)
 *   originalLink   the department's own post URL (or null)
 * A post TXC Compass wrote itself gets the default tag ("TXC").
 *
 * Each post's picture is downloaded into docs/assets/news/ and the
 * JSON points at that copy. Facebook's own image links are signed
 * and stop working after a few days, so the site never links to
 * them directly. Pictures of posts that have dropped off the list
 * are deleted, so the folder only ever holds the current few.
 *
 * Run by .github/workflows/facebook-news.yml. The Page access token
 * comes from the FB_PAGE_TOKEN secret so it never ships to the browser.
 *
 * Output shape matches CUP_NEWS.posts in data/xavier-cup.js:
 *   { id, tag, title, body, date, link, image,
 *     shared, origin, originalLink }
 * (the last three are extra; the renderer can ignore them.)
 */
import { writeFile, mkdir, readdir, rm } from 'node:fs/promises';

const GRAPH_VERSION = 'v26.0';
// TXC Compass Facebook Page ("Campuss Compass TEST" for now). This is the Graph API Page ID from
// the Page's About > Page transparency, not the number in its profile.php web address.
// Set the FB_PAGE_ID repository variable to switch pages without editing this file.
const PAGE_ID = process.env.FB_PAGE_ID || '1301081723094199';
// Badge shown on posts the Page wrote itself (reshares get the department's name instead).
const DEFAULT_TAG = process.env.FB_DEFAULT_TAG || 'TXC';
const POST_COUNT = 6; // 1 featured + 5 more
const OUT_FILE = new URL('../docs/src/js/data/cup-posts.json', import.meta.url);
const IMAGE_DIR = new URL('../docs/assets/news/', import.meta.url);
const IMAGE_URL_PREFIX = 'assets/news/';       // as seen from docs/index.html
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;       // skip anything larger than 4 MB

// The original fields always work. The extra ones tell a reshare from a
// post the Page wrote, and carry the original post's details. If Facebook
// rejects them (error 100) the run falls back to the original list, so
// the feed never goes down because of them.
const FIELDS_BASIC = 'id,message,story,created_time,permalink_url,full_picture';
const FIELDS_RICH = FIELDS_BASIC +
  ',status_type,parent_id,attachments{type,media_type,title,description,url,target{url}}';

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Trim so a stray space or newline pasted into the secret doesn't break the token.
const token = process.env.FB_PAGE_TOKEN?.trim();
if (!token) {
  // Skip instead of failing so the hourly run doesn't send failure emails before setup.
  console.log('::warning::FB_PAGE_TOKEN is not set. Add it under Settings > Secrets and variables > Actions.');
  process.exit(0);
}

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

// "1301081723094199_122093247141504109" → "122093247141504109", safe as a file name.
const fileStem = (postId) => String(postId).split('_').pop().replace(/[^A-Za-z0-9-]/g, '');

/** One Graph API call. Never throws; the caller checks `ok`. */
async function graph(path, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  url.search = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/* ---------- Reshares ---------- */

// "TXC Compass shared Nursing Council's post." → a reshare of someone else's post.
const SHARE_STORY = /\bshared (.+?)[’']s (?:post|photo|video|reel|event|album|story)\b/i;

/** True when the Page reshared someone else's post rather than writing its own. */
const isReshare = (post) =>
  Boolean(post.parent_id) || SHARE_STORY.test(plain(post.story));

/**
 * The department that first published a reshared post, or null.
 * 1. The Page's own story line names it ("… shared X's post.") — free.
 * 2. Otherwise ask for the parent post's author. Facebook may refuse that
 *    for other Pages' posts (it needs Page Public Content Access); a
 *    refusal just means no department name, never a failed run.
 */
async function originOf(post) {
  const named = plain(post.story).match(SHARE_STORY);
  if (named) return named[1].trim();
  if (post.parent_id) {
    const r = await graph(post.parent_id, { fields: 'from{name}' });
    if (r.ok && r.body.from?.name) return plain(r.body.from.name).trim();
    console.log(`::notice::Could not read the original author of post ${post.id} (${r.body.error?.message ?? r.status}).`);
  }
  return null;
}

// Only ever keep a link that really goes to Facebook.
function facebookUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && /(^|\.)facebook\.com$/.test(u.hostname) ? u.href : null;
  } catch { return null; }
}

/**
 * Download a post's picture into assets/news/. Returns the site-relative
 * path, or null when the post has no picture or the download fails —
 * a missing picture must never stop the news from updating.
 */
async function savePicture(post) {
  if (!post.full_picture) return null;
  try {
    const res = await fetch(post.full_picture);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT_BY_TYPE[type];
    if (!res.ok || !ext) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
    const name = `${fileStem(post.id)}.${ext}`;
    await writeFile(new URL(name, IMAGE_DIR), bytes);
    return IMAGE_URL_PREFIX + name;
  } catch (err) {
    console.log(`::warning::Could not save the picture for post ${post.id}: ${err.message}`);
    return null;
  }
}

async function toPost(post) {
  const shared = isReshare(post);
  const origin = shared ? await originOf(post) : null;
  const att = post.attachments?.data?.[0];

  // The Page's own words first. A bare reshare has none, so fall back to
  // the original post's text, then to the Page's story line.
  const split = (t) => plain(t).split('\n').map(l => l.trim()).filter(Boolean);
  let lines = split(post.message);
  if (!lines.length && shared) lines = [...split(att?.title), ...split(att?.description)];
  if (!lines.length) lines = split(post.story);

  const fallbackTitle = origin ? `Shared from ${origin}` : `New post from ${DEFAULT_TAG}`;
  return {
    id: post.id,
    tag: origin ? truncate(origin, 28) : DEFAULT_TAG,
    title: truncate(lines[0] || fallbackTitle, 90),
    body: truncate(lines.slice(1).join(' '), 180),
    date: isoDate(post.created_time),
    link: post.permalink_url,                  // the TXC Compass post
    image: await savePicture(post),
    shared,
    origin,
    originalLink: shared ? facebookUrl(att?.url || att?.target?.url) : null,
  };
}

let r = await graph(`${PAGE_ID}/posts`, { fields: FIELDS_RICH, limit: String(POST_COUNT) });
if (!r.ok && r.body.error?.code === 100) {
  console.log(`::warning::Facebook rejected the reshare fields (${r.body.error.message}). Retrying without them; departments will not be named.`);
  r = await graph(`${PAGE_ID}/posts`, { fields: FIELDS_BASIC, limit: String(POST_COUNT) });
}
if (!r.ok) {
  // Graph API error messages never include the token, so this is safe to log.
  // The code/subcode pair tells expired (190/463), revoked (190/460) and malformed tokens apart.
  const { message = 'unknown error', code, error_subcode } = r.body.error ?? {};
  console.error(`Graph API error ${r.status} (code ${code ?? '-'}/${error_subcode ?? '-'}): ${message}`);
  process.exit(1);
}

await mkdir(IMAGE_DIR, { recursive: true });

const latest = r.body.data
  .sort((a, b) => b.created_time.localeCompare(a.created_time))
  .slice(0, POST_COUNT);
const items = [];
for (const post of latest) items.push(await toPost(post));

// Keep the folder to the pictures the JSON actually uses.
const keep = new Set(items.map(p => p.image?.slice(IMAGE_URL_PREFIX.length)).filter(Boolean));
for (const file of await readdir(IMAGE_DIR)) {
  if (!keep.has(file) && file !== '.gitkeep') await rm(new URL(file, IMAGE_DIR));
}

await writeFile(OUT_FILE, JSON.stringify(items, null, 2) + '\n');
const withPictures = items.filter(p => p.image).length;
const reshares = items.filter(p => p.shared).length;
console.log(`Saved ${items.length} post(s), ${reshares} reshared, ${withPictures} with a picture, to docs/src/js/data/cup-posts.json`);
