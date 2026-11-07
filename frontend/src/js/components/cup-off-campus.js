// Reuses resolved games and Campus Compass's clock; no second timer or schedule.
import { CUP_MAP } from '../data/xavier-cup.js';
import { isOffCampus, venueLocationHtml } from '../lib/cup-map-locations.js';
import { planAt, planText } from '../lib/venue-plan.js';
import { sameDay, formatTime } from '../lib/dates.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';
import { sportIcon } from './cup-map.js';
import { statusPillHtml, GAME_STATUS_LABEL } from './status.js';

export function offCampusHtml(games, { now, selected = null, expanded = false } = {}) {
  const venues = CUP_MAP.venues.filter(isOffCampus);
  const ids = new Set(venues.map(v => v.id));
  const active = games.filter(g => ids.has(g.venueId)
    && (g.status === 'ongoing' || (g.status === 'upcoming' && sameDay(g.start, now))));
  active.sort((a, b) => (a.status === 'ongoing' ? 0 : 1) - (b.status === 'ongoing' ? 0 : 1)
    || (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
  const live = active.filter(g => g.status === 'ongoing').length;
  const card = g => {
    const icon = sportIcon(g.sport);
    return `<button class="outside-game${selected === g.venueId ? ' is-selected' : ''}" type="button"
      data-game-id="${escapeAttr(g.id)}" aria-label="${escapeAttr(`${g.sport}: ${g.title} at ${g.venueName}`)}">
      ${icon ? `<img src="${escapeAttr(icon)}" alt="" width="48" height="48" loading="lazy">`
        : `<span class="outside-game__initial" aria-hidden="true">${escapeHtml((g.sport || '?')[0])}</span>`}
      <span class="outside-game__body"><strong>${escapeHtml(g.sport)}</strong>
        <span>${escapeHtml(g.title)}</span><span>${escapeHtml(g.venueName)} · ${escapeHtml(formatTime(g.start) || 'Time TBC')}</span></span>
      ${statusPillHtml(g.status, { labels: GAME_STATUS_LABEL, size: 'sm' })}
    </button>`;
  };
  return `<details class="outside-venues"${expanded ? ' open' : ''}>
    <summary><span><strong>Outside campus</strong><span class="outside-venues__count">${live} ongoing · ${active.length - live} upcoming today</span></span><span aria-hidden="true">⌄</span></summary>
    <div class="outside-venues__body">
      ${active.length ? `<div class="outside-games">${active.map(card).join('')}</div>`
        : '<p class="venue-panel__hint">No ongoing games or upcoming games today at outside venues.</p>'}
      ${venues.length ? `<div class="outside-venues__locations">${venues.map(v => `<article>
        <button class="btn btn--ghost btn--sm" type="button" data-venue-id="${escapeAttr(v.id)}" aria-pressed="${selected === v.id}">${escapeHtml(v.name)} →</button>
        ${v.note ? `<p class="venue-panel__hint">${escapeHtml(v.note)}</p>` : ''}${planAt(v).length ? `<p class="venue-panel__hint"><strong>Planned:</strong> ${planAt(v).map(p => escapeHtml(planText(p))).join(' · ')}</p>` : ''}${venueLocationHtml(v)}</article>`).join('')}</div>`
        : '<p class="venue-panel__hint">Outside venue details will appear once locations are confirmed.</p>'}
    </div></details>`;
}
