/* ============================================================
   components/team-strip.js — the eight teams as one row of
   pickable tiles. Used on Discover and on the Xavier Cup tab.

   Each tile is a real toggle button (aria-pressed): tap to follow
   a team, tap again to stop. Any number can be followed. The row
   itself holds no state: it reads lib/my-team.js and repaints when
   that changes, so two strips on the page never disagree.
   ============================================================ */

import { TEAMS } from '../data/teams.js';
import { myTeams, toggleMyTeam, onMyTeamChange } from '../lib/my-team.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

export function teamStripHtml(selected = myTeams()) {
  return TEAMS.map(t => `
    <button class="team-tile${selected.includes(t.id) ? ' is-selected' : ''}" type="button"
            data-team-id="${escapeAttr(t.id)}" aria-pressed="${selected.includes(t.id)}"
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
 * saved teams. `onPick(id)` runs after a tap, for callers that
 * want to do more than highlight.
 */
export function mountTeamStrip(el, { onPick } = {}) {
  if (!el || el.__teamStrip) return;
  el.__teamStrip = true;
  el.classList.add('team-strip');
  el.setAttribute('role', 'group');
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Pick your teams');

  el.innerHTML = teamStripHtml(myTeams());

  // Update in place rather than re-render, so keyboard focus stays
  // on the tile that was just pressed.
  const paint = () => {
    const selected = myTeams();
    el.querySelectorAll('[data-team-id]').forEach(btn => {
      const on = selected.includes(btn.dataset.teamId);
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  };

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-team-id]');
    if (!btn) return;
    toggleMyTeam(btn.dataset.teamId);
    onPick?.(btn.dataset.teamId);
  });

  onMyTeamChange(paint);
}
