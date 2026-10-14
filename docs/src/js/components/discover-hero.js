/* ============================================================
   components/discover-hero.js — numbers and the live pill for the
   landing hero. Put in: docs/src/js/components/discover-hero.js
   Load it with one line in main.js:
     import './components/discover-hero.js';
   ============================================================ */
import { ORGS } from '../data/organizations.js';
import { CATEGORIES } from '../data/categories.js';
import { TEAMS } from '../data/teams.js';
import { GAMES, cupNow } from '../data/xavier-cup.js';
import { resolveGame } from './game-card.js';
import { escapeAttr, escapeHtml } from '../lib/html.js';
import { navigate } from '../router.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.getAttribute('data-motion') === 'reduced';

function countUp(el, to) {
  if (reduced() || to < 2) { el.textContent = to; return; }
  const t0 = performance.now(), ms = 900;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const FILL_LOGOS = new Set(['xu-jpama']);   // org ids whose logo should fill the circle
const COPIES = 5, HOME = 2;        // logos laid out 5x; we live in the middle copy
const SPEED = 38;                  // px per second while idle
const IDLE_MS = 1400;              // how long after your last touch it starts drifting again

function initTicker(ticker, track, orgs) {
  const item = (o, clone) => `<button class="dlogo${FILL_LOGOS.has(o.id) ? ' dlogo--fill' : ''}" type="button" data-q="${escapeAttr(o.short || o.name)}"
      aria-label="${escapeAttr(o.name)}" title="${escapeAttr(o.name)}"${clone ? ' tabindex="-1" aria-hidden="true"' : ''}>
      <img src="${escapeAttr(o.logo)}" alt="" loading="lazy" decoding="async"
           onerror="this.nextElementSibling.hidden=false;this.remove()"><span class="dlogo__t" hidden>${escapeHtml((o.short || o.name).slice(0, 5))}</span></button>`;
  track.innerHTML = Array.from({ length: COPIES }, (_, c) => orgs.map(o => item(o, c !== HOME)).join('')).join('');

  let W = 0, pos = 0, lastSet = 0, paused = false, idleT = 0, last = 0, drag = null, justDragged = false;
  const set = (x) => { pos = x; ticker.scrollLeft = x; lastSet = ticker.scrollLeft; };
  const measure = () => {
    const kids = track.children;
    const w = kids[orgs.length] ? kids[orgs.length].offsetLeft - kids[0].offsetLeft : 0;
    if (!w) return;                               // hidden screen: try again when it has a size
    const first = !W; W = w;
    set(first ? HOME * W : ((ticker.scrollLeft % W) + W) % W + HOME * W);
  };
  // Slide back to the middle copy (looks identical), so there is always room either way.
  const home = () => {
    if (!W) return;
    const x = ticker.scrollLeft, n = ((x % W) + W) % W + HOME * W;
    if (Math.abs(n - x) > 0.5) set(n);
  };
  const hold = () => { paused = true; clearTimeout(idleT); };
  const release = (ms = IDLE_MS) => {
    clearTimeout(idleT);
    idleT = setTimeout(() => { home(); pos = ticker.scrollLeft; last = 0; paused = false; }, ms);
  };

  ticker.addEventListener('touchstart', hold, { passive: true });
  ticker.addEventListener('touchend', () => release(), { passive: true });
  ticker.addEventListener('touchcancel', () => release(), { passive: true });
  ticker.addEventListener('wheel', () => { hold(); release(); }, { passive: true });
  ticker.addEventListener('focusin', hold);
  ticker.addEventListener('focusout', () => release(600));
  // Any scroll we did not cause (flick momentum, scrollbar, keys) counts as the visitor.
  ticker.addEventListener('scroll', () => {
    if (Math.abs(ticker.scrollLeft - lastSet) > 2.5) { hold(); release(); }
  }, { passive: true });

  // Mouse drag (touch and trackpad already scroll sideways).
  ticker.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: ticker.scrollLeft, moved: false }; hold();
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; ticker.classList.add('is-drag'); }
    if (drag.moved) ticker.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved; drag = null; ticker.classList.remove('is-drag'); release();
    if (moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); }
  });

  track.addEventListener('click', (e) => {
    if (justDragged) return;
    const b = e.target.closest('[data-q]');
    if (b) navigate({ screen: 'browse', q: b.dataset.q });
  });

  // The idle drift. It does not stop for hovering, only for being touched.
  const frame = (t) => {
    requestAnimationFrame(frame);
    if (!W || paused || document.hidden || reduced()) { last = t; return; }
    const dt = Math.min(64, t - (last || t)); last = t;
    pos += SPEED * dt / 1000;
    if (pos >= (HOME + 1) * W) pos -= W;
    set(pos);
  };
  new ResizeObserver(() => { if (ticker.clientWidth) measure(); }).observe(ticker);
  measure();
  requestAnimationFrame(frame);
}

function init() {
  const hero = document.querySelector('.dhero');
  if (!hero || hero.__wired) return;
  hero.__wired = true;

  const counts = { orgs: ORGS.length, clusters: CATEGORIES.length, teams: TEAMS.length, games: GAMES.length };

  // Count up the first time the strip scrolls into view.
  const stats = hero.querySelector('[data-dhero-stats]');
  const run = () => stats.querySelectorAll('[data-count]').forEach(el => countUp(el, counts[el.dataset.count] ?? 0));
  stats.querySelectorAll('[data-count]').forEach(el => { el.textContent = counts[el.dataset.count] ?? 0; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      if (ents.some(e => e.isIntersecting)) { io.disconnect(); run(); }
    }, { threshold: 0.6 });
    io.observe(stats);
  }

  // Org-logo ticker: scroll it yourself, or leave it and it keeps drifting.
  const ticker = hero.querySelector('[data-dhero-ticker]');
  const track = hero.querySelector('[data-dhero-track]');
  const orgs = ORGS.filter(o => o.logo);
  if (ticker && track && orgs.length) initTicker(ticker, track, orgs);

  // The bridge into the hub: how many games are live right now.
  const pill = hero.querySelector('[data-dhero-live]');
  const paint = () => {
    const now = cupNow();
    const all = GAMES.map(g => resolveGame(g, now));
    const live = all.filter(g => g.status === 'ongoing').length;
    const next = all.filter(g => g.status === 'upcoming').length;
    if (live) pill.innerHTML = `<i class="dhero__pulse"></i>${live} game${live > 1 ? 's' : ''} live now <span aria-hidden="true">→</span>`;
    else if (next) pill.innerHTML = `${next} game${next > 1 ? 's' : ''} coming up <span aria-hidden="true">→</span>`;
    pill.hidden = !(live || next);
  };
  paint();
  setInterval(paint, 60000);
}
init();