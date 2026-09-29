/* ============================================================
   components/team-strip.js — the eight teams as one row of
   pickable tiles. Used on Discover and on the Xavier Cup tab.

   Each tile is a real toggle button (aria-pressed). Picking the
   team that is already picked clears the choice. The row itself
   holds no state: it reads lib/my-team.js and repaints when that
   changes, so two strips on the page never disagree.
   ============================================================ */

import { TEAMS } from '../data/teams.js';
import { currentTeam, setMyTeam, onMyTeamChange } from '../lib/my-team.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

export function teamStripHtml(selected = currentTeam()) {
  return TEAMS.map(t => `
    <button class="team-tile${t.id === selected ? ' is-selected' : ''}" type="button"
            data-team-id="${escapeAttr(t.id)}" aria-pressed="${t.id === selected}"
            title="${escapeAttr(`${t.name} · ${t.college}`)}">
      <span class="team-tile__crest">
        <img src="${escapeAttr(t.logo)}" alt="" loading="lazy" decoding="async">
      </span>
      <span class="team-tile__name">${escapeHtml(t.mascot)}</span>
      <span class="team-tile__short">${escapeHtml(t.short)}</span>
    </button>`).join('');
}

/**
 * mountTeamStrip(el, { onPick })
 * Fills `el`, wires the clicks, and keeps it in sync with the
 * saved team. `onPick(id)` runs after a pick, for callers that
 * want to do more than highlight (Discover jumps to the Cup).
 */
export function mountTeamStrip(el, { onPick } = {}) {
  if (!el || el.__teamStrip) return;
  el.__teamStrip = true;
  el.classList.add('team-strip');
  el.setAttribute('role', 'group');
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Pick your team');

  el.innerHTML = teamStripHtml(currentTeam());

  // Update in place rather than re-render, so keyboard focus stays
  // on the tile that was just pressed.
  const paint = () => {
    const selected = currentTeam();
    el.querySelectorAll('[data-team-id]').forEach(btn => {
      const on = btn.dataset.teamId === selected;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  };

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-team-id]');
    if (!btn) return;
    const id = btn.dataset.teamId;
    const next = currentTeam() === id ? '' : id;
    setMyTeam(next);
    onPick?.(next);
  });

  onMyTeamChange(paint);
}
