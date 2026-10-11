/* ============================================================
   components/discover-games.js — the Ongoing Games tile on Discover.
   One chip at a time, scrolls sideways forever (the chips are laid
   out three times and the scroll position jumps by one set at
   either end). Click a chip -> the shared detail popup, with a
   "See More Games" button that goes to Fixtures.
   Put in: docs/src/js/components/discover-games.js
   Load it with one line in main.js:
     import './components/discover-games.js';
   ============================================================ */
import { GAMES, CUP_CONFIG, cupNow } from '../data/xavier-cup.js';
import { resolveGame, sportGlyph } from './game-card.js';
import { gameDetailHtml } from './game-detail.js';
import { openDetail, closeDetail } from './detail-modal.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';
import { navigate } from '../router.js';

const MAX = 6;                       // most chips shown

const crest = (t) => (t && t.logo
  ? `<img class="dchip__crest" src="${escapeAttr(t.logo)}" alt="" onerror="this.remove()">`
  : `<span class="dchip__crest dchip__crest--blank" aria-hidden="true"></span>`);

function chipHtml(g, clone) {
  const live = g.status === 'ongoing';
  const scored = CUP_CONFIG.showScores && g.score && g.score.home !== undefined && g.score.away !== undefined;
  const [a, b] = g.sides || [];
  const match = g.sides && g.sides.length >= 2
    ? `<span class="dchip__side">${crest(a)}<span>${escapeHtml(a.short || a.name)}</span></span>
       <b class="dchip__vs">${scored ? `${escapeHtml(String(g.score.home))} – ${escapeHtml(String(g.score.away))}` : 'vs'}</b>
       <span class="dchip__side">${crest(b)}<span>${escapeHtml(b.short || b.name)}</span></span>`
    : `<span class="dchip__solo">${escapeHtml(g.title)}</span>`;
  return `<button class="dchip" type="button" data-game="${escapeAttr(g.id)}"
      ${clone ? 'aria-hidden="true" tabindex="-1"' : ''}>
    <span class="dchip__top">
      <span class="dchip__status${live ? ' is-live' : ''}">${live ? 'Live now' : 'Up next'}</span>
      <span class="dchip__sport">${sportGlyph(g.sport) || ''}${escapeHtml(g.sport || '')}</span>
    </span>
    <span class="dchip__match">${match}</span>
    <span class="dchip__info">
      <span>${escapeHtml(g.dayLabel)}${g.timeLabel ? ` · ${escapeHtml(g.timeLabel)}` : ''}</span>
      ${g.venueName ? `<span>${escapeHtml(g.venueName)}</span>` : ''}
    </span>
    <span class="dchip__cta">Know more →</span>
  </button>`;
}

function pick() {
  const now = cupNow();
  const all = GAMES.map(g => resolveGame(g, now));
  const live = all.filter(g => g.status === 'ongoing').sort((x, y) => x.start - y.start);
  const next = all.filter(g => g.status === 'upcoming').sort((x, y) => x.start - y.start);
  return (live.length ? live : next).slice(0, MAX);
}

function openGame(g) {
  const more = `<div class="dgame-more">
      <a class="btn btn--primary" href="?screen=cup&amp;tab=fixtures" data-see-more>See More Games →</a>
    </div>`;
  openDetail(gameDetailHtml(g) + more, {
    wire: (panel) => {
      panel.querySelector('[data-see-more]')?.addEventListener('click', (e) => {
        e.preventDefault(); closeDetail(); navigate({ screen: 'cup', tab: 'fixtures' });
      });
      panel.querySelector('[data-show-venue]')?.addEventListener('click', (e) => {
        const venue = e.currentTarget.dataset.showVenue;
        closeDetail(); navigate({ screen: 'cup', tab: 'map', venue });
      });
    },
  });
}

function init() {
  const tile = document.querySelector('[data-discover-games]');
  if (!tile || tile.__wired) return;
  tile.__wired = true;

  const track = tile.querySelector('[data-dg-track]');
  const title = tile.querySelector('[data-dg-title]');
  const count = tile.querySelector('[data-dg-count]');
  const dots = tile.querySelector('[data-dg-dots]');
  let games = [], sig = '', n = 0, w = 0, ready = false;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-motion') === 'reduced';
  const jump = (left) => { track.style.scrollBehavior = 'auto'; track.scrollLeft = left; track.style.scrollBehavior = ''; };

  const paint = () => {
    const next = pick();
    const s = next.map(g => `${g.id}:${g.status}`).join('|');
    if (s === sig) return;                       // nothing changed: keep scroll position
    sig = s; games = next; n = games.length; ready = false;
    const live = games.some(g => g.status === 'ongoing');
    title.textContent = live ? 'Ongoing Games' : 'Up Next';
    count.textContent = n ? `${n} ${live ? 'live' : 'coming up'}` : '';
    tile.classList.toggle('is-live', live);
    tile.classList.toggle('is-single', n < 2);

    if (!n) {
      track.innerHTML = `<a class="dchip dchip--empty" href="?screen=cup&amp;tab=fixtures" data-nav="cup">
        <span class="dchip__solo">No games right now</span><span class="dchip__cta">See fixtures →</span></a>`;
      dots.innerHTML = ''; return;
    }
    // One real set, with a copy of it on each side when there is more than one chip.
    const set = (clone) => games.map(g => chipHtml(g, clone)).join('');
    track.innerHTML = n > 1 ? set(true) + set(false) + set(true) : set(false);
    dots.innerHTML = n > 1 ? games.map((g, i) => `<i data-i="${i}"></i>`).join('') : '';
    settle();
  };

  // Centre on the real set once the tile has a width (it may be hidden at first).
  const settle = () => {
    w = track.clientWidth;
    if (!w || n < 2) { ready = n < 2 && !!w; return; }
    jump(n * w); ready = true; mark();
  };

  const index = () => Math.round(track.scrollLeft / w);
  const mark = () => {
    if (!ready) return;
    const cur = (((index() - n) % n) + n) % n;
    dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('is-on', i === cur));
  };
  let t;
  const loop = () => {                           // after a scroll: hop back to the middle set
    if (!ready || !w) return;
    const i = index();
    if (i < n) jump(track.scrollLeft + n * w);
    else if (i >= 2 * n) jump(track.scrollLeft - n * w);
    mark();
  };
  track.addEventListener('scroll', () => { mark(); clearTimeout(t); t = setTimeout(loop, 120); }, { passive: true });
  if ('onscrollend' in track) track.addEventListener('scrollend', loop);

  const step = (dir) => { if (w) track.scrollBy({ left: dir * w, behavior: reduced() ? 'auto' : 'smooth' }); };
  tile.querySelector('[data-dg-prev]').addEventListener('click', () => step(-1));
  tile.querySelector('[data-dg-next]').addEventListener('click', () => step(1));
  dots.addEventListener('click', (e) => {
    const i = e.target.dataset?.i; if (i === undefined || !w) return;
    track.scrollTo({ left: (n + Number(i)) * w, behavior: reduced() ? 'auto' : 'smooth' });
  });
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
  });

  track.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-game]');
    const g = chip && games.find(x => x.id === chip.dataset.game);
    if (g) openGame(g);
  });

  new ResizeObserver(() => { const nw = track.clientWidth; if (nw && nw !== w) settle(); }).observe(track);
  paint();
  setInterval(paint, 60000);
}
init();