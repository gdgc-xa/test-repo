/* ============================================================
   screens/about.js — hydrates the About screen's team.
   The prose and the GDG card are static markup in index.html;
   only the people come from data, so they stay in one place
   when someone joins.
   ============================================================ */

import { TEAM_GROUPS } from '../data/team.js';
import { SITE, tabEnabled } from '../data/site.js';
import { SHOW_FAIR_MAP } from '../data/venue.js';
import { watchReveals } from '../reveal-observer.js';

/** Four site hues, one per developers' department, in the order they first appear. */
const HUES = ['blue', 'red', 'yellow', 'green'];

export function initAbout(root) {
  dropSwitchedOff(root);
  hydrateContact(root);
  hydrateTeam(root);
}

/* ---------- The team ----------
   A "who we are" list: each group (CEO, founders, developers) under
   its own small heading, three people a row, each a name with a small
   dot (a developer's in their department's hue) over their position.
   Names only, no photos. */
function hydrateTeam(root) {
  const groups = root.querySelector('[data-team-groups]');
  if (!groups || groups.__wired) return;
  groups.__wired = true;

  const depts = [...new Set(TEAM_GROUPS.flatMap(g => g.people.map(p => p.dept).filter(Boolean)))];
  const hueOf = (dept) => HUES[depts.indexOf(dept) % HUES.length];
  groups.innerHTML = TEAM_GROUPS.map(g => groupHtml(g, hueOf)).join('');
  watchReveals(groups);
}

function groupHtml(g, hueOf) {
  const id = `team-group-${g.id}`;
  return `
    <section class="team-group team-group--${escapeAttr(g.id)}" data-team-group="${escapeAttr(g.id)}"
             aria-labelledby="${escapeAttr(id)}">
      <h3 class="team-group__name" id="${escapeAttr(id)}">${escapeHtml(g.name)}</h3>
      <ul class="team-list">${g.people.map((p, i) => personHtml(p, i, hueOf)).join('')}
      </ul>
    </section>`;
}

/** One person: name and dot, then their position (a developer's with
    their department), and a second position if any. */
function personHtml(p, i, hueOf) {
  const hue = p.dept ? hueOf(p.dept) : null;
  const role = [p.role, p.dept].filter(Boolean).join(' · ');
  return `
        <li class="team-person reveal" style="--reveal-delay: ${Math.min(i * 40, 320)}ms;${hue ? ` --dot: var(--${hue}-ink);` : ''}">
          <p class="team-person__name">${escapeHtml(p.name)}<span class="team-person__dot" aria-hidden="true"></span></p>
          <p class="team-person__role">${escapeHtml(role)}</p>
          ${p.title ? `<p class="team-person__title">${escapeHtml(p.title)}</p>` : ''}
        </li>`;
}

/* "What you can do here" lines about a feature that is switched off
   go, so the page never sends anyone to a tab or map that isn't there:
   the Events tab (data/site.js → tabs.events) and the org-fair tent
   map (data/venue.js → SHOW_FAIR_MAP). */
function dropSwitchedOff(root) {
  const on = { events: tabEnabled('events'), 'fair-map': SHOW_FAIR_MAP };
  root.querySelectorAll('[data-about-feature]').forEach(li => {
    if (!on[li.dataset.aboutFeature]) li.remove();
  });
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

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}
