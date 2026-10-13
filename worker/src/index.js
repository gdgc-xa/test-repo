/**
 * TXC Compass news Worker
 * ------------------------------------------------------------
 * Cloudflare Worker that replaces the GitHub Action.
 *
 *   scheduled()  every 15 min: read the TXC Compass Page through the
 *                Graph API and keep the result in KV (posts + pictures).
 *                If Facebook errors, the last good copy stays.
 *   fetch()      GET /posts.json  → the stored posts (same shape as
 *                cup-posts.json), pictures pointing back at this Worker
 *                GET /img/<name>  → a stored picture
 *
 * Visitors only ever read KV (and Cloudflare's edge cache), never
 * Facebook. The Page token lives in the FB_PAGE_TOKEN Worker secret
 * and is never sent to the browser.
 *
 * Post shape: { id, tag, title, body, date, sharedDate, link, image,
 *               shared, origin, originalLink }
 * `date` is when the department first posted (falls back to the share
 * date if Facebook won't say); the list stays ordered by share date.
 */

const GRAPH_VERSION = 'v26.0';
const POST_COUNT = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const POSTS_KEY = 'posts';
const IMG_PREFIX = 'img:';

const FIELDS_BASIC = 'id,message,story,created_time,permalink_url,full_picture';
const FIELDS_RICH = FIELDS_BASIC +
  ',status_type,parent_id,attachments{type,media_type,title,description,url,target{url},media}';

const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_TYPE).map(([t, e]) => [e, t]));

/* ---------- helpers (same rules as scripts/fetch-facebook-posts.mjs) ---------- */

const plain = (text) => String(text ?? '').normalize('NFKC');

function truncate(text, max) {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max - 1).join('').trimEnd() + '…' : text;
}

const isoDate = (t) => t.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
const fileStem = (id) => String(id).split('_').pop().replace(/[^A-Za-z0-9-]/g, '');

async function graph(env, path, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  url.search = new URLSearchParams({ ...params, access_token: env.FB_PAGE_TOKEN.trim() });
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const TITLE_FROM = /\bfrom (.+?)[’']s (?:post|photo|video|reel|event|album|story)\s*$/i;
const SHARE_STORY = /\bshared (.+?)[’']s (?:post|photo|video|reel|event|album|story)\b/i;

const isReshare = (post) => Boolean(post.parent_id) || SHARE_STORY.test(plain(post.story));

async function originOf(env, post, att) {
  const named = plain(post.story).match(SHARE_STORY) || plain(att?.title).match(TITLE_FROM);
  if (named) return named[1].trim();
  if (post.parent_id) {
    const r = await graph(env, post.parent_id, { fields: 'from{name}' });
    if (r.ok && r.body.from?.name) return plain(r.body.from.name).trim();
    console.log(`Could not read the original author of post ${post.id} (${r.body.error?.message ?? r.status}).`);
  }
  return null;
}

function facebookUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && /(^|\.)facebook\.com$/.test(u.hostname) ? u.href : null;
  } catch { return null; }
}

/** Store a post's picture in KV. Returns its name (e.g. "123.jpg") or null. */
async function savePicture(env, post, att) {
  const source = post.full_picture || att?.media?.image?.src;
  if (!source) return null;
  try {
    const res = await fetch(source);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT_BY_TYPE[type];
    if (!res.ok || !ext) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
    const name = `${fileStem(post.id)}.${ext}`;
    // Pictures never change for a given post, so only write each one once.
    if ((await env.NEWS.get(IMG_PREFIX + name, 'arrayBuffer')) === null) {
      await env.NEWS.put(IMG_PREFIX + name, bytes);
    }
    return name;
  } catch (err) {
    console.log(`Could not save the picture for post ${post.id}: ${err.message}`);
    return null;
  }
}

/**
 * When the original department published a reshared post, or null.
 * Needs Facebook to let this Page read that post; a refusal just means
 * the card shows the date the Page shared it.
 */
async function originalDate(env, post) {
  if (!post.parent_id) return null;
  const r = await graph(env, post.parent_id, { fields: 'created_time' });
  if (r.ok && r.body.created_time) return isoDate(r.body.created_time);
  console.log(`Could not read the original date of post ${post.id} (${r.body.error?.message ?? r.status}).`);
  return null;
}

async function toPost(env, post) {
  const tagDefault = env.FB_DEFAULT_TAG || 'TXC';
  const shared = isReshare(post);
  const att = post.attachments?.data?.[0];
  const origin = shared ? await originOf(env, post, att) : null;
  const sharedDate = isoDate(post.created_time);
  const originalAt = shared ? await originalDate(env, post) : null;

  const split = (t) => plain(t).split('\n').map(l => l.trim()).filter(Boolean);
  let lines = split(post.message);
  const attTitle = TITLE_FROM.test(plain(att?.title)) ? [] : split(att?.title);
  if (!lines.length && shared) lines = [...attTitle, ...split(att?.description)];
  if (!lines.length) lines = split(post.story);

  const short = origin?.replace(/^the xavier cup\s*[:–-]\s*/i, '') || origin;
  const fallbackTitle = origin ? `Shared from ${short}` : `New post from ${tagDefault}`;
  return {
    id: post.id,
    tag: origin ? truncate(short, 28) : tagDefault,
    title: truncate(lines[0] || fallbackTitle, 90),
    body: truncate(lines.slice(1).join(' '), 180),
    date: originalAt || sharedDate,   // shown on the site: the department's date when known
    sharedDate,                       // when the TXC Compass Page shared it
    link: post.permalink_url,
    image: await savePicture(env, post, att),   // a name; made absolute when served
    shared,
    origin,
    originalLink: shared ? facebookUrl(att?.url || att?.target?.url) : null,
  };
}

/* ---------- refresh (cron) ---------- */

export async function refresh(env) {
  if (!env.FB_PAGE_TOKEN) throw new Error('FB_PAGE_TOKEN secret is not set.');

  let r = await graph(env, `${env.FB_PAGE_ID}/posts`, { fields: FIELDS_RICH, limit: String(POST_COUNT) });
  if (!r.ok && [100, 10].includes(r.body.error?.code)) {
    console.log(`Facebook rejected the reshare fields (${r.body.error.message}); retrying without them.`);
    r = await graph(env, `${env.FB_PAGE_ID}/posts`, { fields: FIELDS_BASIC, limit: String(POST_COUNT) });
  }
  if (!r.ok) {
    const { message = 'unknown error', code, error_subcode } = r.body.error ?? {};
    // Keep serving the last good copy; just report.
    throw new Error(`Graph API error ${r.status} (code ${code ?? '-'}/${error_subcode ?? '-'}): ${message}`);
  }

  const latest = r.body.data
    .sort((a, b) => b.created_time.localeCompare(a.created_time))
    .slice(0, POST_COUNT);
  const items = [];
  for (const post of latest) items.push(await toPost(env, post));

  await env.NEWS.put(POSTS_KEY, JSON.stringify(items));

  // Drop pictures that are no longer in the list.
  const keep = new Set(items.map(p => p.image).filter(Boolean).map(n => IMG_PREFIX + n));
  const { keys } = await env.NEWS.list({ prefix: IMG_PREFIX });
  for (const { name } of keys) if (!keep.has(name)) await env.NEWS.delete(name);

  console.log(`Saved ${items.length} post(s), ${items.filter(p => p.shared).length} reshared, ${items.filter(p => p.image).length} with a picture.`);
  return items;
}

/* ---------- serving (visitors) ---------- */

const CORS = { 'Access-Control-Allow-Origin': '*' };

async function serve(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/posts.json') {
    const stored = await env.NEWS.get(POSTS_KEY, 'json');
    const posts = (stored ?? []).map(p => ({
      ...p,
      image: p.image ? `${url.origin}/img/${p.image}` : null,
    }));
    return new Response(JSON.stringify(posts), {
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        // Browsers and the edge reuse this for 5 minutes.
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const img = url.pathname.match(/^\/img\/([A-Za-z0-9-]+\.(jpg|png|webp|gif))$/);
  if (img) {
    const bytes = await env.NEWS.get(IMG_PREFIX + img[1], 'arrayBuffer');
    if (!bytes) return new Response('Not found', { status: 404, headers: CORS });
    return new Response(bytes, {
      headers: {
        ...CORS,
        'Content-Type': TYPE_BY_EXT[img[2]],
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  }

  return new Response('Not found', { status: 404, headers: CORS });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },

  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

    // Serve repeat visitors from Cloudflare's edge cache, not KV.
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cached = cache && (await cache.match(request));
    if (cached) return cached;

    const response = await serve(request, env);
    if (cache && response.ok) ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
