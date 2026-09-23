/* ============================================================
   screens/about.js — hydrates the About screen's team grid.
   The prose and the GDG card are static markup in index.html;
   only the people come from data, so they stay in one place
   when someone joins or a photo arrives.
   ============================================================ */

import { TEAM, initialsOf } from '../data/team.js';
import { SITE } from '../data/site.js';
import { watchReveals } from '../reveal-observer.js';

/** Four site hues, cycled so the tiles do not read as one block. */
const HUES = ['blue', 'red', 'yellow', 'green'];

export function initAbout(root) {
  hydrateContact(root);

  const grid = root.querySelector('[data-team-grid]');
  if (!grid || grid.__wired) return;
  grid.__wired = true;

  // Leads (CEO, Project Head, Tech Lead) surface first and get the
  // bigger treatment; everyone else follows in their normal order.
  const ordered = [...TEAM].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  grid.innerHTML = ordered.map((p, i) => personHtml(p, i)).join('');
  watchReveals(grid);
}

/* ---------- Contact ----------
   Address, wording and the optional second address all come from
   data/site.js → contact. Setting contact.email to null there
   removes the whole block rather than leaving an empty card. */
function hydrateContact(root) {
  const section = root.querySelector('[data-about-contact]');
  if (!section || section.__wired) return;
  section.__wired = true;

  const c = SITE.contact || {};
  if (!c.email) { section.hidden = true; return; }

  const alt = c.altEmail ? `
    <div class="about-contact__alt">
      <span class="about-contact__alt-label">${escapeHtml(c.altLabel || 'Also')}</span>
      <a class="about-contact__alt-mail" href="mailto:${escapeAttr(c.altEmail)}">${escapeHtml(c.altEmail)}</a>
    </div>` : '';

  section.hidden = false;
  section.innerHTML = `
    <div class="about-card about-card--contact reveal">
      <div class="about-contact__text">
        <h2 class="about-card__title">${escapeHtml(c.label || 'Contact our email')}</h2>
        ${c.note ? `<p class="about-card__body">${escapeHtml(c.note)}</p>` : ''}
        <a class="about-contact__mail" href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.email)}</a>
        ${alt}
      </div>
      <a class="btn btn--primary about-contact__btn" href="mailto:${escapeAttr(c.email)}">
        Email us
        <svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="1" y="3" width="14" height="10" rx="2"/><polyline points="1,4 8,9 15,4"/>
        </svg>
      </a>
    </div>`;
  watchReveals(section);
}

function personHtml(p, i) {
  const hue = HUES[i % HUES.length];
  const avatar = p.photo
    ? `<img class="person__photo" src="${escapeAttr(p.photo)}" alt=""/>`
    : escapeHtml(initialsOf(p.name));
  const featuredClass = p.featured ? ' person--featured' : '';

  return `
    <article class="person${featuredClass} reveal" style="--reveal-delay: ${i * 60}ms;">
      <div class="person__avatar"
           style="background: var(--${hue}-soft); color: var(--${hue}-ink);"
           aria-hidden="true">${avatar}</div>
      <div class="person__text">
        <p class="person__role">${escapeHtml(p.role)}</p>
        <h3 class="person__name">${escapeHtml(p.name)}</h3>
        ${p.title ? `<p class="person__title">${escapeHtml(p.title)}</p>` : ''}
      </div>
    </article>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}
