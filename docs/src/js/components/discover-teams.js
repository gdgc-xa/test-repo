/* ============================================================
   components/discover-teams.js — the Teams tile on Discover.
   The same logo tiles as the Cup tab's "Follow your teams" strip
   (team-strip.js / team-strip.css). Clicking a team follows it
   and jumps to Matches, where its games are at the top. Clicking
   a team you already follow still goes to Matches (it does not
   un-follow here; that is done on the Cup tab).
   Put in: docs/src/js/components/discover-teams.js
   Load it with one line in main.js:
     import './components/discover-teams.js';
   ============================================================ */
import { teamStripHtml } from './team-strip.js';
import { myTeams, followTeam, onMyTeamChange } from '../lib/my-team.js';
import { navigate } from '../router.js';

function init() {
  const el = document.querySelector('[data-discover-teams]');
  if (!el || el.__wired) return;
  el.__wired = true;

  el.classList.add('team-strip');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Pick a team to see its matches');
  el.innerHTML = teamStripHtml(myTeams());

  const paint = () => {
    const selected = myTeams();
    el.querySelectorAll('[data-team-id]').forEach((btn) => {
      const on = selected.includes(btn.dataset.teamId);
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  };

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-team-id]');
    if (!btn) return;
    followTeam(btn.dataset.teamId);             // always follow, never toggle off
    navigate({ screen: 'cup', tab: 'matches' });
  });

  onMyTeamChange(paint);
}

/* Every Discover link that opens one tab of the Xavier Cup
   (View more, Go to matches, ...) carries data-go-tab="<tab>".
   Handled here, so it does not depend on the router's data-nav. */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go-tab]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let new-tab clicks through
  e.preventDefault();
  navigate({ screen: 'cup', tab: a.dataset.goTab });
});

init();