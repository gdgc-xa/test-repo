/* ============================================================
   components/discover-flow.js — the Program Flow popup on Discover.
   Click "See schedule" -> the shared detail popup with a phase
   stepper and an icon timeline. ALL CONTENT BELOW IS PLACEHOLDER:
   edit PHASES to change it.
   Put in: docs/src/js/components/discover-flow.js
   Load it with one line in main.js:
     import './components/discover-flow.js';
   ============================================================ */
import { openDetail, closeDetail } from './detail-modal.js';
import { escapeHtml } from '../lib/html.js';
import { navigate } from '../router.js';

/* ---------- Placeholder program ---------- */
const PHASES = [
  { id: 'open', label: 'Opening', days: 'Day 1', hue: 'blue', items: [
    { time: '2:30 PM', icon: 'flag',  title: 'Parade of Colleges',  place: 'SBM Steps',       note: 'Contingents assemble in their college colours.' },
    { time: '4:00 PM', icon: 'star',  title: 'Opening Ceremony',    place: 'Main Gym',        note: 'Torch lighting, oath and welcome remarks.' },
    { time: '6:00 PM', icon: 'ball',  title: 'Opening Games',       place: 'Loyola Gym',      note: 'The first fixtures of the season.' },
  ]},
  { id: 'group', label: 'Group Stage', days: 'Days 2–6', hue: 'green', items: [
    { time: '8:00 AM',  icon: 'clock', title: 'Team Check-in',       place: 'Venue entrances', note: 'Rosters confirmed 30 minutes before kickoff.' },
    { time: '9:00 AM',  icon: 'ball',  title: 'Morning Fixtures',    place: 'Various venues',  note: 'Basketball, volleyball and football pools.' },
    { time: '1:00 PM',  icon: 'ball',  title: 'Afternoon Fixtures',  place: 'Various venues',  note: 'Softball, badminton and frisbee.' },
    { time: '5:30 PM',  icon: 'music', title: 'Fan Zone',            place: 'Main Quad',       note: 'Cheer squads, food stalls and live music.' },
  ]},
  { id: 'quarters', label: 'Quarterfinals', days: 'Days 7–8', hue: 'yellow', items: [
    { time: '9:00 AM',  icon: 'ball',  title: 'Quarterfinal Round 1', place: 'Loyola Gym',     note: 'Top two of each pool advance.' },
    { time: '2:00 PM',  icon: 'ball',  title: 'Quarterfinal Round 2', place: 'Engineering Court', note: 'Winners go straight to the semifinals.' },
    { time: '6:00 PM',  icon: 'music', title: 'Cheer Showdown',       place: 'Main Quad',      note: 'Colleges go head to head in cheer.' },
  ]},
  { id: 'semis', label: 'Semifinals', days: 'Days 9–10', hue: 'red', items: [
    { time: '10:00 AM', icon: 'ball',  title: 'Semifinal 1',         place: 'Loyola Gym',      note: 'Winner moves on to the final.' },
    { time: '3:00 PM',  icon: 'ball',  title: 'Semifinal 2',         place: 'Loyola Gym',      note: 'Bronze match follows.' },
  ]},
  { id: 'finals', label: 'Finals', days: 'Day 11', hue: 'blue', items: [
    { time: '1:00 PM',  icon: 'ball',   title: 'Championship Games', place: 'Main Gym',       note: 'Every sport crowns its winner.' },
    { time: '5:00 PM',  icon: 'trophy', title: 'Awarding Ceremony',  place: 'Main Gym',       note: 'The overall Xavier Cup champion is announced.' },
    { time: '7:00 PM',  icon: 'music',  title: 'Closing Party',      place: 'Main Quad',      note: 'Thank-yous, a last cheer and a concert.' },
  ]},
];

const ICON = {
  flag:  '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  star:  '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3l-5.2 2.8 1-5.8L3.5 9.2l5.9-.9z"/>',
  ball:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a3 3 0 0 0 3 3M16 6h4v1a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:   '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const timeline = (ph) => `
  <ol class="pflow__list">
    ${ph.items.map(it => `
      <li class="pflow__item" style="--hue: var(--${ph.hue});">
        <span class="pflow__node">${svg(it.icon)}</span>
        <div class="pflow__card">
          <span class="pflow__time">${escapeHtml(it.time)}</span>
          <h3 class="pflow__name">${escapeHtml(it.title)}</h3>
          <p class="pflow__note">${escapeHtml(it.note)}</p>
          <span class="pflow__place">${svg('pin')}${escapeHtml(it.place)}</span>
        </div>
      </li>`).join('')}
  </ol>`;

const html = () => `
  <article class="pflow">
    <header class="pflow__head">
      <p class="pflow__kicker">Program Flow</p>
      <h1 class="pflow__title" id="detail-title">How the Xavier Cup Unfolds</h1>
      <div class="pflow__stats">
        <span><b>11</b> days</span><span><b>8</b> teams</span><span><b>${PHASES.length}</b> phases</span>
      </div>
      <p class="pflow__ph">Placeholder schedule — the final program will replace this.</p>
    </header>

    <div class="pflow__steps" role="tablist" aria-label="Season phases">
      ${PHASES.map((ph, i) => `
        <button class="pflow__step${i ? '' : ' is-on'}" type="button" role="tab" data-phase="${i}"
                aria-selected="${i ? 'false' : 'true'}" style="--hue: var(--${ph.hue});">
          <span class="pflow__dot">${i + 1}</span>
          <span class="pflow__label">${escapeHtml(ph.label)}</span>
          <span class="pflow__days">${escapeHtml(ph.days)}</span>
        </button>`).join('')}
    </div>

    <div class="pflow__body" data-flow-body role="tabpanel" aria-live="polite">${timeline(PHASES[0])}</div>

    <div class="pflow__foot">
      <a class="btn btn--primary" href="?screen=cup&amp;tab=calendar" data-flow-cal>Open the full calendar →</a>
    </div>
  </article>`;

function open() {
  openDetail(html(), {
    wire: (panel) => {
      const body = panel.querySelector('[data-flow-body]');
      const steps = [...panel.querySelectorAll('[data-phase]')];
      steps.forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.phase);
        steps.forEach(s => { const on = s === b; s.classList.toggle('is-on', on); s.setAttribute('aria-selected', String(on)); });
        body.innerHTML = timeline(PHASES[i]);
        b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }));
      panel.querySelector('[data-flow-cal]')?.addEventListener('click', (e) => {
        e.preventDefault(); closeDetail(); navigate({ screen: 'cup', tab: 'calendar' });
      });
    },
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-flow]')) open();
});