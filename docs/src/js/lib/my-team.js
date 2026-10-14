/* ============================================================
   lib/my-team.js — the teams a visitor follows.

   One or more team ids, in the order they were picked, saved on
   this device only. Discover and the Xavier Cup tab both read it,
   and they all repaint on the 'myteam:change' event, so picking a
   team anywhere updates it everywhere.
   ============================================================ */

import { TEAM_BY_ID } from '../data/teams.js';

// Saved as "ccs,sbm". A value saved when only one team could be
// followed ("ccs") reads as a list of one.
const KEY = 'campus-compass:team';

const clean = (ids) => [...new Set(ids.map(String).filter(id => TEAM_BY_ID[id]))];

/* Fallback for browsers that refuse localStorage: the choice still
   works until the page is closed. */
let memory = [];

/** The followed team ids, in the order they were picked ([] for none). */
export function myTeams() {
  try {
    const saved = clean(String(localStorage.getItem(KEY) || '').split(','));
    return saved.length ? saved : [...memory];
  } catch {
    return [...memory];
  }
}

/** Save the whole list ([] to clear it). Tells every listener. */
export function setMyTeams(ids) {
  const next = clean([].concat(ids || []));
  try {
    if (next.length) localStorage.setItem(KEY, next.join(','));
    else localStorage.removeItem(KEY);
  } catch { /* private mode: the choice lasts for this page only */ }
  memory = next;
  document.dispatchEvent(new CustomEvent('myteam:change', { detail: { ids: next } }));
}

/** Follow a team, or stop following it. */
export function toggleMyTeam(id) {
  const now = myTeams();
  setMyTeams(now.includes(id) ? now.filter(x => x !== id) : [...now, id]);
}

/** Follow a team (already following it changes nothing). */
export function followTeam(id) {
  const now = myTeams();
  if (!now.includes(id)) setMyTeams([...now, id]);
}

export function onMyTeamChange(fn) {
  document.addEventListener('myteam:change', (e) => fn(e.detail.ids));
}
