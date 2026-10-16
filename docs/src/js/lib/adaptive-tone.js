/* ============================================================
   lib/adaptive-tone.js — readable text on any post picture.
   Looks at how light or dark the corner of each news picture is
   (where the headline sits) and tags the slide / card with
   data-tone="light" or "dark". The CSS in screens/cup.css then
   flips the text and the fade behind it: dark text on a light
   picture, white text on a dark one.

   Covers every place a post picture carries text:
     · the News hero slideshow (Xavier Cup > News)
     · the Latest Updates slideshow on Discover
     · the More updates carousel and the See all grid
   Nothing else needs to change: a MutationObserver picks up
   slides and cards as the other scripts draw them.

   If a picture can't be read (the host sends no CORS header),
   the tag is simply left off and the usual dark fade + white
   text stays. It never makes anything less readable.
   ============================================================ */

const TARGETS = '.news-hero__slide, .news-card';
const LIGHT_ABOVE = 0.6;     // average brightness (0–1) above which a picture counts as light
const cache = new Map();     // picture address -> 'light' | 'dark' | null

/** Average brightness of the lower-left of a picture, or null if unreadable. */
function measure(src) {
  if (cache.has(src)) return cache.get(src);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const W = 40, H = 40;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return resolve(null);
        // The text sits low and to the left: sample that part only.
        ctx.drawImage(img, 0, h * 0.4, w * 0.7, h * 0.6, 0, 0, W, H);
        const px = ctx.getImageData(0, 0, W, H).data;
        let sum = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 128) continue;                       // skip transparent pixels
          sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          n++;
        }
        resolve(n ? (sum / n > LIGHT_ABOVE ? 'light' : 'dark') : null);
      } catch { resolve(null); }                               // tainted canvas, etc.
    };
    img.src = src;
  });
  cache.set(src, job);
  return job;
}

async function tone(el) {
  const img = el.querySelector('.news-hero__media img, .news-card__media img');
  const src = img && (img.currentSrc || img.src);
  if (!src || el.dataset.toneSrc === src) return;
  el.dataset.toneSrc = src;
  const result = await measure(src);
  if (el.dataset.toneSrc !== src) return;                      // the card was re-used meanwhile
  if (result) el.dataset.tone = result; else delete el.dataset.tone;
}

function scan(root) {
  if (root.matches?.(TARGETS)) tone(root);
  root.querySelectorAll?.(TARGETS).forEach(tone);
}

function start() {
  scan(document.body);
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); });
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
