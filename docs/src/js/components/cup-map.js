/* ============================================================
   components/cup-map.js — the consolidated Xavier Cup map.

   One drawing of the campus with a pin on every venue that has a
   fixture. The pin carries the number of games there; its ring
   turns live when something is being played right now. Clicking
   (or Enter/Space on) a pin selects that venue — screens/cup.js
   then lists what is happening there.

   It is inline SVG rather than an image for the same reason the
   org-fair map is: it themes with the site, stays sharp on a
   phone, and each pin can be a real focusable control.

   Coordinates come from data/xavier-cup.js → CUP_MAP, in viewBox
   units. Nothing here needs editing to move a venue.
   ============================================================ */

import { CUP_MAP } from '../data/xavier-cup.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

/**
 * cupMapHtml(stats, opts)
 * @param {Record<string, {total:number, upcoming:number, ongoing:number, finished:number}>} stats
 *        per-venue tallies, keyed by venue id. Venues missing from
 *        this object are drawn dimmed — the venue exists, nothing
 *        is booked there.
 * @param {{selected?: string|null, mini?: boolean}} opts
 *        mini → the small read-only version used in a match's
 *        detail view: one venue lit, no counts, not clickable.
 */
export function cupMapHtml(stats = {}, { selected = null, mini = false } = {}) {
  const areas = CUP_MAP.areas.map(a => `
    <g>
      <rect class="cup-map__area" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="${a.rx ?? 12}"/>
      ${a.label && !mini ? `<text class="cup-map__area-label" x="${a.x + a.w / 2}" y="${a.y + 18}">${escapeHtml(a.label.toUpperCase())}</text>` : ''}
    </g>`).join('');

  const paths = (CUP_MAP.paths || []).map(d =>
    `<path class="cup-map__path" d="${escapeAttr(d)}"/>`).join('');

  const landmarks = CUP_MAP.landmarks.map(b => `
    <g>
      <rect class="cup-map__building" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/>
      <text class="cup-map__building-label" x="${b.x + b.w / 2}" y="${b.y + b.h / 2}">${escapeHtml(b.label)}</text>
    </g>`).join('');

  const pins = CUP_MAP.venues.map(v => pinHtml(v, stats[v.id], selected, mini)).join('');

  const label = mini
    ? `Campus map showing ${CUP_MAP.venues.find(v => v.id === selected)?.name || 'the venue'}`
    : 'Campus map of every Xavier Cup venue. Select a venue to see its fixtures.';

  return `
    <svg class="cup-map${mini ? ' cup-map--mini' : ''}" viewBox="${escapeAttr(CUP_MAP.viewBox)}"
         role="${mini ? 'img' : 'group'}" aria-label="${escapeAttr(label)}">
      <rect class="cup-map__ground" x="0" y="0" width="960" height="640" rx="0"/>
      ${areas}
      ${paths}
      ${landmarks}
      ${pins}
    </svg>`;
}

function pinHtml(v, stat, selected, mini) {
  const total = stat?.total ?? 0;
  const live = (stat?.ongoing ?? 0) > 0;
  const isSelected = selected === v.id;
  const empty = total === 0;

  const classes = [
    'cup-pin',
    live ? 'is-live' : '',
    isSelected ? 'is-selected' : '',
    empty ? 'is-empty' : '',
    mini ? 'is-static' : '',
  ].filter(Boolean).join(' ');

  const r = mini ? 14 : 21;

  // In mini mode only the focused venue is labelled — the rest are
  // there for orientation, not for reading.
  const showLabel = !mini || isSelected;
  const labelText = v.short || v.name;
  const labelW = Math.max(56, labelText.length * 9 + 22);

  const countText = (!mini && !empty)
    ? `<text class="cup-pin__count" x="${v.x}" y="${v.y}">${total}</text>`
    : '';

  const aria = mini
    ? ''
    : `role="button" tabindex="0" aria-pressed="${isSelected}" ` +
      `aria-label="${escapeAttr(`${v.name} — ${total} ${total === 1 ? 'fixture' : 'fixtures'}${live ? ', one being played now' : ''}`)}"`;

  return `
    <g class="${classes}" data-venue-id="${escapeAttr(v.id)}" ${aria}>
      ${live ? `<circle class="cup-pin__pulse" cx="${v.x}" cy="${v.y}" r="${r + 10}"/>` : ''}
      ${isSelected ? `<circle class="cup-pin__halo" cx="${v.x}" cy="${v.y}" r="${r + 8}"/>` : ''}
      <circle class="cup-pin__hit" cx="${v.x}" cy="${v.y}" r="${r + 16}"/>
      <circle class="cup-pin__dot" cx="${v.x}" cy="${v.y}" r="${r}"/>
      ${v.indoor ? `<path class="cup-pin__roof" d="M ${v.x - 8} ${v.y - r - 5} L ${v.x} ${v.y - r - 12} L ${v.x + 8} ${v.y - r - 5}"/>` : ''}
      ${countText}
      ${showLabel ? `
        <g class="cup-pin__labelgroup">
          <rect class="cup-pin__labelbg" x="${v.x - labelW / 2}" y="${v.y + r + 8}" width="${labelW}" height="26" rx="13"/>
          <text class="cup-pin__label" x="${v.x}" y="${v.y + r + 21}">${escapeHtml(labelText)}</text>
        </g>` : ''}
    </g>`;
}

/** The colour key under the map. */
export function cupLegendHtml() {
  return `
    <ul class="cup-legend" aria-label="Map key">
      <li class="cup-legend__item"><span class="cup-legend__swatch cup-legend__swatch--live"></span>Being played now</li>
      <li class="cup-legend__item"><span class="cup-legend__swatch cup-legend__swatch--has"></span>Has fixtures</li>
      <li class="cup-legend__item"><span class="cup-legend__swatch cup-legend__swatch--empty"></span>Nothing scheduled</li>
      <li class="cup-legend__item cup-legend__item--hint">Tap a pin to see that venue’s games.</li>
    </ul>`;
}

/**
 * venueStats(games) — how many fixtures sit at each venue, and how
 * many of those are live. Drives both the pin sizes and the panel.
 */
export function venueStats(games) {
  const out = {};
  for (const g of games) {
    const id = g.venueId;
    if (!id) continue;
    const s = out[id] || (out[id] = { total: 0, upcoming: 0, ongoing: 0, finished: 0 });
    s.total += 1;
    s[g.status] = (s[g.status] || 0) + 1;
  }
  return out;
}
