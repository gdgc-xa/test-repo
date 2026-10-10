/**
 * Fetch CSG Facebook posts
 * ------------------------------------------------------------
 * Pulls the latest posts from the CSG Facebook Page through the
 * Graph API and writes them to docs/src/js/data/cup-posts.json,
 * which the News & Updates section of the Xavier Cup tab reads.
 * The newest post becomes the featured story.
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
 *   { id, tag, title, body, date, link, image }
 */
import { writeFile, mkdir, readdir, rm } from 'node:fs/promises';

const GRAPH_VERSION = 'v26.0';
// CSG Facebook Page ("Campuss Compass TEST" for now). This is the Graph API Page ID from
// the Page's About > Page transparency, not the number in its profile.php web address.
// Set the FB_PAGE_ID repository variable to switch pages without editing this file.
const PAGE_ID = process.env.FB_PAGE_ID || '1301081723094199';
const POST_COUNT = 6; // 1 featured + 5 more
const OUT_FILE = new URL('../docs/src/js/data/cup-posts.json', import.meta.url);
const IMAGE_DIR = new URL('../docs/assets/news/', import.meta.url);
const IMAGE_URL_PREFIX = 'assets/news/';       // as seen from docs/index.html
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;       // skip anything larger than 4 MB

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
  const lines = plain(post.message || post.story || '')
    .split('\n').map(l => l.trim()).filter(Boolean);
  return {
    id: post.id,
    tag: 'CSG',
    title: truncate(lines[0] || 'New post from CSG', 90),
    body: truncate(lines.slice(1).join(' '), 180),
    date: isoDate(post.created_time),
    link: post.permalink_url,
    image: await savePicture(post),
  };
}

const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/posts`);
url.search = new URLSearchParams({
  fields: 'id,message,story,created_time,permalink_url,full_picture',
  limit: String(POST_COUNT),
  access_token: token,
});

const res = await fetch(url);
const body = await res.json();
if (!res.ok) {
  // Graph API error messages never include the token, so this is safe to log.
  // The code/subcode pair tells expired (190/463), revoked (190/460) and malformed tokens apart.
  const { message = 'unknown error', code, error_subcode } = body.error ?? {};
  console.error(`Graph API error ${res.status} (code ${code ?? '-'}/${error_subcode ?? '-'}): ${message}`);
  process.exit(1);
}

await mkdir(IMAGE_DIR, { recursive: true });

const latest = body.data
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
console.log(`Saved ${items.length} post(s), ${withPictures} with a picture, to docs/src/js/data/cup-posts.json`);
