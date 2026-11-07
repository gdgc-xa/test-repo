/* ============================================================
   lib/adaptive-tone.js — readable words on any post picture.

   Posts are reposted from anywhere, so their pictures can be white
   tables, black posters, crowds, or all three at once. For each news
   slide and post card this reads the part of the picture that is
   actually under the words (as it is cropped on screen), and then:

     1. picks white or dark words, whichever needs less covering:
        it checks the LIGHTEST parts there for white words and the
        DARKEST parts for dark ones (not the average, so a picture
        that is half white table, half crowd is still read right);
     2. sets the fade behind the words just strong enough for the
        words to pass WCAG AA contrast (4.5 : 1) over those worst
        parts, and stronger where the picture is busy (a table, a
        crowd, small print): a clean photo is barely covered;
     3. takes the label and button colour from the picture's own
        strongest hue, shaded until it is readable too (a grey
        picture keeps the site's lime and navy).

   It writes data-tone="light" (dark words) or "dark" (white words)
   and a few --tone-* values on the slide / card; the CSS in
   screens/cup.css (ADAPTIVE TONE) uses them. It reads again when a
   card is resized (the crop changes) and picks up new slides and
   cards as the other scripts draw them.

   Covers the News hero slideshow (Xavier Cup > News), the Latest
   Updates slideshow on Discover, the More updates carousel and the
   See all grid. If a picture can't be read (no CORS header), nothing
   is set and the usual dark fade and white words stay.
   ============================================================ */

const TARGETS = '.news-hero__slide, .news-card';
const SAMPLE_W = 160;              // the picture is read this wide: plenty for colour, cheap
const TARGET = 4.5;                // WCAG AA, for the small words; the headline gets more
const NAVY = [11, 27, 51];         // the dark words
const WHITE = [255, 255, 255];
const SCRIM_DARK = [4, 12, 28];    // the fade behind white words
const SCRIM_LIGHT = [255, 255, 255];
const LIME = [176, 234, 0];        // the site's accent, for grey pictures
const DEEP = [14, 43, 85];

/* ---------- Colour maths ---------- */

const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (c, over, a) => c.map((v, i) => v * (1 - a) + over[i] * a);
const css = (c) => c.map(v => Math.round(v)).join(' ');

function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function hueOf([r, g, b]) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/* ---------- Reading a picture (once per address) ---------- */

const pictures = new Map();        // address -> Promise<{ data, w, h, hue } | null>

function read(src) {
  if (pictures.has(src)) return pictures.get(src);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const nw = img.naturalWidth, nh = img.naturalHeight;
        if (!nw || !nh) return resolve(null);
        const w = Math.min(SAMPLE_W, nw), h = Math.max(1, Math.round(nh * (w / nw)));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        resolve({ data, w, h, nw, nh, hue: strongestHue(data) });
      } catch { resolve(null); }   // tainted canvas, etc.
    };
    img.src = src;
  });
  pictures.set(src, job);
  return job;
}

/** The picture's strongest colour as a hue, or null for a grey one. */
function strongestHue(data) {
  const bins = new Array(24).fill(0);
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {          // every 4th pixel is plenty
    if (data[i + 3] < 128) continue;
    n++;
    const { h, s, l } = hueOf([data[i], data[i + 1], data[i + 2]]);
    if (s < 0.35 || l < 0.12 || l > 0.88) continue;
    bins[Math.floor(h / 15) % 24] += s;
  }
  let best = 0;
  bins.forEach((v, i) => { if (v > bins[best]) best = i; });
  return n && bins[best] / n > 0.04 ? best * 15 + 7.5 : null;
}

/* ---------- The part under the words ---------- */

/** The words' box (all of them together) inside the picture's box, or null. */
function wordsBox(el, media) {
  const words = el.querySelector('.news-hero__panel, .news-card__caption');
  if (!words) return null;
  const parts = [...words.children].map(c => c.getBoundingClientRect()).filter(r => r.width && r.height);
  if (!parts.length) return null;
  const m = media.getBoundingClientRect();
  const box = {
    left: Math.min(...parts.map(r => r.left)) - m.left,
    top: Math.min(...parts.map(r => r.top)) - m.top,
    right: Math.max(...parts.map(r => r.right)) - m.left,
    bottom: Math.max(...parts.map(r => r.bottom)) - m.top,
  };
  // Words beside the picture (Discover's wide layout), not on it: nothing to do.
  if (box.right <= 0 || box.bottom <= 0 || box.left >= m.width || box.top >= m.height) return null;
  return { box, mw: m.width, mh: m.height };
}

/** The colours of the picture under a box, as it is cropped on screen (object-fit: cover, centred). */
function colorsUnder(pic, { box, mw, mh }) {
  const s = Math.max(mw / pic.nw, mh / pic.nh);
  const ox = (mw - pic.nw * s) / 2, oy = (mh - pic.nh * s) / 2;
  const k = pic.w / pic.nw;                            // picture pixels -> sample pixels
  const clampX = (v) => Math.max(0, Math.min(pic.w - 1, Math.round(v)));
  const clampY = (v) => Math.max(0, Math.min(pic.h - 1, Math.round(v)));
  const x0 = clampX(((box.left - ox) / s) * k), x1 = clampX(((box.right - ox) / s) * k);
  const y0 = clampY(((box.top - oy) / s) * k), y1 = clampY(((box.bottom - oy) / s) * k);
  const colors = [];
  let steps = 0, changes = 0;                          // how busy it is: the change from pixel to pixel
  for (let y = y0; y <= y1; y++) {
    let prev = null;
    for (let x = x0; x <= x1; x++) {
      const i = (y * pic.w + x) * 4;
      if (pic.data[i + 3] < 128) { prev = null; continue; }
      const c = [pic.data[i], pic.data[i + 1], pic.data[i + 2]];
      colors.push(c);
      const v = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
      if (prev != null) { changes += Math.abs(v - prev); steps++; }
      prev = v;
    }
  }
  return { colors, busy: steps ? changes / steps : 0 };
}

/* ---------- Deciding ---------- */

/** The least fade (0–0.95) that brings `words` to TARGET over `worst`. */
function fadeFor(words, worst, scrim) {
  for (let a = 0; a <= 0.95; a += 0.025) {
    if (contrast(words, mix(worst, scrim, a)) >= TARGET) return a;
  }
  return 0.95;
}

/** A colour of `hue` shaded (lighter for dark backgrounds, darker for light) until it reads on `bg`. */
function readableHue(hue, bg, light) {
  for (let l = light ? 0.36 : 0.7; light ? l >= 0.1 : l <= 0.95; l += light ? -0.02 : 0.02) {
    const c = hsl(hue, light ? 0.75 : 0.9, l);
    if (contrast(c, bg) >= TARGET) return c;
  }
  return light ? NAVY : WHITE;
}

function decide({ colors, busy }, hue) {
  if (colors.length < 4) return null;
  const sorted = colors.map(c => [lum(c), c]).sort((a, b) => a[0] - b[0]);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))][1];
  const lightest = at(0.96), darkest = at(0.04);

  // White words over a dark fade, or dark words over a light one: the
  // one that needs less fade wins (white on a tie, the site's default).
  const forWhite = fadeFor(WHITE, lightest, SCRIM_DARK);
  const forDark = fadeFor(NAVY, darkest, SCRIM_LIGHT);
  const light = forDark < forWhite;                    // a light picture: dark words
  const scrim = light ? SCRIM_LIGHT : SCRIM_DARK;
  // Never less than a soft fade, and more where the picture is busy
  // (a table, a crowd, small print) so its detail stays out of the words.
  const calm = 0.3 + Math.min(0.5, Math.max(0, (busy - 0.03) * 8));
  const fade = Math.max(light ? forDark : forWhite, calm);
  const bg = mix(light ? darkest : lightest, scrim, fade);  // the hardest place the words sit on

  const ink = light ? NAVY : WHITE;
  const accent = hue == null
    ? (light ? DEEP : LIME)
    : readableHue(hue, bg, light);
  // The button: the accent as its fill when the picture has a colour,
  // with whichever of white / navy reads on it.
  const ctaBg = hue == null ? (light ? NAVY : WHITE) : accent;
  const ctaInk = contrast(WHITE, ctaBg) >= contrast(NAVY, ctaBg) ? WHITE : NAVY;
  return { light, scrim, fade, ink, accent, ctaBg, ctaInk };
}

/* ---------- Applying ---------- */

async function tone(el) {
  const media = el.querySelector('.news-hero__media, .news-card__media');
  const img = media?.querySelector('img');
  const src = img && (img.currentSrc || img.src);
  if (!src) return;
  el.dataset.toneSrc = src;
  const pic = await read(src);
  if (el.dataset.toneSrc !== src) return;              // the card was re-used meanwhile
  const where = pic && wordsBox(el, media);
  const d = where && decide(colorsUnder(pic, where), pic.hue);
  if (!d) { clear(el); return; }
  el.dataset.tone = d.light ? 'light' : 'dark';
  const st = el.style;
  st.setProperty('--scrim', css(d.scrim));
  st.setProperty('--scrim-a', d.fade.toFixed(3));
  // How far up the fade holds its full strength: to just above the words.
  st.setProperty('--scrim-hold', `${Math.min(100, Math.round((1 - where.box.top / where.mh) * 100) + 6)}%`);
  st.setProperty('--tone-ink', `rgb(${css(d.ink)})`);
  st.setProperty('--tone-ink-soft', `rgb(${css(d.ink)} / 0.82)`);
  st.setProperty('--tone-accent', `rgb(${css(d.accent)})`);
  st.setProperty('--tone-cta-bg', `rgb(${css(d.ctaBg)})`);
  st.setProperty('--tone-cta-ink', `rgb(${css(d.ctaInk)})`);
}

function clear(el) {
  delete el.dataset.tone;
  ['--scrim', '--scrim-a', '--scrim-hold', '--tone-ink', '--tone-ink-soft', '--tone-accent', '--tone-cta-bg', '--tone-cta-ink']
    .forEach(p => el.style.removeProperty(p));
}

// A card's crop and its words' place change with its size: read again.
const resized = new ResizeObserver((entries) => {
  for (const e of entries) {
    if (!e.contentRect.width) continue;                // hidden (another tab): wait
    clearTimeout(e.target.__toneTimer);
    e.target.__toneTimer = setTimeout(() => tone(e.target), 120);
  }
});

function watch(el) {
  if (el.__toneWatched) return;
  el.__toneWatched = true;
  resized.observe(el);
  el.querySelector('.news-hero__media img, .news-card__media img')
    ?.addEventListener('load', () => tone(el));
  tone(el);
}

function scan(root) {
  if (root.matches?.(TARGETS)) watch(root);
  root.querySelectorAll?.(TARGETS).forEach(watch);
}

function start() {
  scan(document.body);
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); });
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
