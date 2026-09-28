/**
 * Fetch CSG Facebook posts
 * ------------------------------------------------------------
 * Pulls the latest posts from the CSG Facebook Page through the
 * Graph API and writes them to docs/src/js/data/cup-posts.json,
 * which the News & Updates section of the Xavier Cup tab reads.
 * The newest post becomes the featured story.
 *
 * Run by .github/workflows/facebook-news.yml. The Page access token
 * comes from the FB_PAGE_TOKEN secret so it never ships to the browser.
 *
 * Output shape matches CUP_NEWS.posts in data/xavier-cup.js:
 *   { id, tag, title, body, date, link }
 */
import { writeFile } from 'node:fs/promises';

const GRAPH_VERSION = 'v26.0';
// CSG Facebook Page ("Campuss Compass TEST" for now). This is the Graph API Page ID from
// the Page's About > Page transparency, not the number in its profile.php web address.
// Set the FB_PAGE_ID repository variable to switch pages without editing this file.
const PAGE_ID = process.env.FB_PAGE_ID || '1301081723094199';
const POST_COUNT = 6; // 1 featured + 5 more
const OUT_FILE = new URL('../docs/src/js/data/cup-posts.json', import.meta.url);

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

function toPost(post) {
  const lines = plain(post.message || post.story || '')
    .split('\n').map(l => l.trim()).filter(Boolean);
  return {
    id: post.id,
    tag: 'CSG',
    title: truncate(lines[0] || 'New post from CSG', 90),
    body: truncate(lines.slice(1).join(' '), 180),
    date: isoDate(post.created_time),
    link: post.permalink_url,
  };
}

const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/posts`);
url.search = new URLSearchParams({
  fields: 'id,message,story,created_time,permalink_url',
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

const items = body.data
  .sort((a, b) => b.created_time.localeCompare(a.created_time))
  .slice(0, POST_COUNT)
  .map(toPost);

await writeFile(OUT_FILE, JSON.stringify(items, null, 2) + '\n');
console.log(`Saved ${items.length} post(s) to docs/src/js/data/cup-posts.json`);
