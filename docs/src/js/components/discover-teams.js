/* ============================================================
   components/discover-teams.js — the Teams tile on Discover.
   The same logo tiles as the Fixtures "Follow your team" strip
   (team-strip.js / team-strip.css). Clicking a team saves it as
   the followed team and jumps to Fixtures, where that team is
   already highlighted. Clicking the team you already follow
   still goes to Fixtures (it does not un-pick here).
   Put in: docs/src/js/components/discover-teams.js
   Load it with one line in main.js:
     import './components/discover-teams.js';
   ============================================================ */
import { teamStripHtml } from './team-strip.js';
import { currentTeam, setMyTeam, onMyTeamChange } from '../lib/my-team.js';
import { navigate } from '../router.js';

function init() {
  const el = document.querySelector('[data-discover-teams]');
  if (!el || el.__wired) return;
  el.__wired = true;

  el.classList.add('team-strip');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Pick a team to see its fixtures');
  el.innerHTML = teamStripHtml(currentTeam());

  const paint = () => {
    const selected = currentTeam();
    el.querySelectorAll('[data-team-id]').forEach((btn) => {
      const on = btn.dataset.teamId === selected;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  };

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-team-id]');
    if (!btn) return;
    setMyTeam(btn.dataset.teamId);              // always follow, never toggle off
    navigate({ screen: 'cup', tab: 'fixtures' });
  });

  onMyTeamChange(paint);
}

/* Every Discover link that opens one tab of the Xavier Cup
   (View more, Go to fixtures, ...) carries data-go-tab="<tab>".
   Handled here, so it does not depend on the router's data-nav. */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go-tab]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let new-tab clicks through
  e.preventDefault();
  navigate({ screen: 'cup', tab: a.dataset.goTab });
});

init();