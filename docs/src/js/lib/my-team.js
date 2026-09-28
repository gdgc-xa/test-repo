/* ============================================================
   lib/my-team.js — the team a visitor follows.

   One value, saved on this device only. Discover, the Xavier Cup
   tab and the calendar all read it, and they all repaint on the
   'myteam:change' event, so picking a team anywhere updates it
   everywhere.
   ============================================================ */

import { TEAM_BY_ID } from '../data/teams.js';

const KEY = 'campus-compass:team';

/** The saved team id, or '' when none is picked (or it no longer exists). */
export function getMyTeam() {
  try {
    const id = localStorage.getItem(KEY) || '';
    return TEAM_BY_ID[id] ? id : '';
  } catch {
    return '';
  }
}

/** Save a team id, or '' to clear it. Tells every listener. */
export function setMyTeam(id) {
  const next = TEAM_BY_ID[id] ? id : '';
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch { /* private mode: the choice lasts for this page only */ }
  memory = next;
  document.dispatchEvent(new CustomEvent('myteam:change', { detail: { id: next } }));
}

/* Fallback for browsers that refuse localStorage: the choice still
   works until the page is closed. */
let memory = '';
export function currentTeam() {
  return getMyTeam() || memory;
}

export function onMyTeamChange(fn) {
  document.addEventListener('myteam:change', (e) => fn(e.detail.id));
}
