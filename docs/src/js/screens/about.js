/* ============================================================
   screens/about.js — hydrates the About screen's team grid.
   The prose and the GDG card are static markup in index.html;
   only the people come from data, so they stay in one place
   when someone joins or a photo arrives.
   ============================================================ */

import { TEAM, initialsOf } from '../data/team.js';
import { watchReveals } from '../reveal-observer.js';

/** Four site hues, cycled so the tiles do not read as one block. */
const HUES = ['blue', 'red', 'yellow', 'green'];

export function initAbout(root) {
  const grid = root.querySelector('[data-team-grid]');
  if (!grid || grid.__wired) return;
  grid.__wired = true;

  grid.innerHTML = TEAM.map((p, i) => personHtml(p, i)).join('');
  watchReveals(grid);
}

function personHtml(p, i) {
  const hue = HUES[i % HUES.length];
  const avatar = p.photo
    ? `<img class="person__photo" src="${escapeAttr(p.photo)}" alt=""/>`
    : escapeHtml(initialsOf(p.name));

  return `
    <article class="person reveal" style="--reveal-delay: ${i * 60}ms;">
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
