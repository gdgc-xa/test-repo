/* ============================================================
   components/discover-updates.js — the Latest Updates slideshow
   on Discover. Same posts as the Xavier Cup > News tab
   (data/cup-posts.json, falling back to CUP_NEWS.posts), same
   look (.news-hero__* in cup.css), plus arrows and a counter.
   Put in: docs/src/js/components/discover-updates.js
   Load it with one line in main.js:
     import './components/discover-updates.js';
   ============================================================ */
import { CUP_NEWS } from '../data/xavier-cup.js';
import { parseDate, formatRange } from '../lib/dates.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const COUNT = 4;       // slides shown
const MS = 7000;       // time per slide
const plain = (s) => String(s ?? '').normalize('NFKC');
const okUrl = (u) => (/^https:\/\//i.test(String(u || '')) ? u : null);
const okImg = (s) => {
  s = String(s ?? '').trim();
  return (/^assets\/[\w\-./]+$/.test(s) && !s.includes('..')) || /^https:\/\//i.test(s) ? s : null;
};
const norm = (p, i) => ({
  tag: plain(p.tag || ''), title: plain(p.title), body: plain(p.body ?? ''),
  date: p.date || null, link: okUrl(p.link ?? p.url), image: okImg(p.image ?? p.picture), i,
});

async function loadPosts() {
    const fallback = (CUP_NEWS.posts || []).map(norm);
    if (!CUP_NEWS.feed) return fallback;
    try {
        const res = await fetch(new URL(`../data/${CUP_NEWS.feed}`, import.meta.url), { cache: 'no-cache' });
        const data = res.ok ? await res.json() : null;
        return Array.isArray(data) && data.length ? data.map(norm) : fallback;
    } catch { return fallback; }
}

const ph = (p) => `<span class="news-ph news-ph--${p.i % 4} news-ph--hero" aria-hidden="true">
  <span class="news-ph__mark">${escapeHtml(p.tag || 'News')}</span></span>`;

function slide(p, n, total) {
  const when = parseDate(p.date) ? formatRange(p.date) : '';
  const link = p.link || okUrl(CUP_NEWS.pageUrl);
  return `<article class="news-hero__slide${n ? '' : ' is-active'}" data-hero-slide="${n}"
      aria-roledescription="slide" aria-label="${n + 1} of ${total}"${n ? ' aria-hidden="true"' : ''}>
    <div class="news-hero__media">${p.image
      ? `<img src="${escapeAttr(p.image)}" alt="" decoding="async"${n ? ' loading="lazy"' : ''}>` : ph(p)}</div>
    <div class="news-hero__panel">
      <p class="news-hero__kicker">
        ${p.tag ? `<span>${escapeHtml(p.tag)}</span>` : ''}
        <span class="news-hero__date">${escapeHtml(when)}</span>
        ${n === 0 ? '<span class="news-hero__flag">Latest</span>' : ''}
      </p>
      <h2 class="news-hero__title">${escapeHtml(p.title)}</h2>
      ${p.body ? `<p class="news-hero__body">${escapeHtml(p.body)}</p>` : ''}
      ${link ? `<a class="news-hero__cta" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer"${n ? ' tabindex="-1"' : ''}>Read more</a>` : ''}
    </div>
  </article>`;
}

function wire(el, total) {
  const slides = [...el.querySelectorAll('[data-hero-slide]')];
  const bars = [...el.querySelectorAll('[data-hero-go]')];
  const count = el.querySelector('[data-du-count]');
  el.style.setProperty('--hero-ms', `${MS}ms`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-motion') === 'reduced';
  el.classList.toggle('is-static', reduced);
  let index = 0;

  const show = (next) => {
    index = (next + total) % total;
    slides.forEach((s, i) => {
      const on = i === index;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('aria-hidden', !on);
      s.querySelectorAll('a').forEach(a => { a.tabIndex = on ? 0 : -1; });
    });
    bars.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.classList.toggle('is-done', i < index);
      const f = b.querySelector('.news-hero__fill');
      if (f) { f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; }
    });
    if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  };

  bars.forEach(b => {
    b.addEventListener('click', () => show(Number(b.dataset.heroGo)));
    b.querySelector('.news-hero__fill')?.addEventListener('animationend',
      () => { if (b.classList.contains('is-active')) show(index + 1); });
  });
  el.querySelector('[data-du-prev]')?.addEventListener('click', () => show(index - 1));
  el.querySelector('[data-du-next]')?.addEventListener('click', () => show(index + 1));

  const pause = (on) => el.classList.toggle('is-paused', on);
  el.addEventListener('mouseenter', () => pause(true));
  el.addEventListener('mouseleave', () => pause(el.contains(document.activeElement)));
  el.addEventListener('focusin', () => pause(true));
  el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) pause(false); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

async function init() {
  const el = document.querySelector('[data-discover-updates]');
  if (!el || el.__wired || !CUP_NEWS.enabled) return;
  el.__wired = true;
  const posts = (await loadPosts()).slice(0, COUNT);
  if (!posts.length) return;                      // keep the static slide
  const total = posts.length;
  el.querySelector('[data-du-viewport]').innerHTML = posts.map((p, n) => slide(p, n, total)).join('');
  el.querySelector('[data-du-bars]').innerHTML = total > 1
    ? posts.map((p, n) => `<button class="news-hero__bar${n ? '' : ' is-active'}" type="button"
        data-hero-go="${n}" aria-label="Show update ${n + 1}"><span class="news-hero__fill"></span></button>`).join('')
    : '';
  el.classList.toggle('is-single', total < 2);
  if (total > 1) wire(el, total);
}
init();