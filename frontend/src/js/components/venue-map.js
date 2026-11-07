/* ============================================================
   components/venue-map.js — the org-fair quad, drawn as inline
   SVG so it themes with the site and stays sharp on a phone.

   One org at a time: its tent (or its colour block, where the
   printed map gives no tent number) is lit and every other
   square drops back. Everything else on the map is orientation
   — the buildings, the stage, the three marquee tents — because
   that is what a student actually navigates by.

   Colours come from the --vz-* tokens, which mirror the printed
   map's key rather than the site's four cluster hues: a student
   holding the paper version should see the same colours.
   ============================================================ */

import { VENUE, locationOf } from '../data/venue.js';
import { ORGS } from '../data/organizations.js';

const SQ = 26;   // square edge, in viewBox units

/**
 * venueMapHtml(org) → the "Find them at the fair" panel, or ''
 * when the org has no placement at all.
 */
export function venueMapHtml(org) {
  const loc = locationOf(org.id);

  const badge = loc.kind === 'tent'
    ? loc.label
    : loc.kind === 'zone' ? loc.label + ' block' : 'Not assigned yet';

  const hint = loc.kind === 'none'
    ? 'This org has no tent on the fair map yet. Check with them on the day.'
    : loc.where;

  const shared = (loc.sharedWith && loc.sharedWith.length)
    ? `<p class="venue__shared">Sharing this tent with ${escapeHtml(nameList(loc.sharedWith))}.</p>`
    : '';

  return `
    <section class="panel venue${loc.kind === 'none' ? ' venue--unplaced' : ''}">
      <div class="panel__kicker">Find them at the fair</div>

      <div class="venue__where">
        <span class="venue__badge venue__badge--${loc.kind === 'none' ? 'none' : escapeAttr(loc.zone || 'tech')}">
          ${escapeHtml(badge)}
        </span>
        <span class="venue__hint">${escapeHtml(hint)}</span>
      </div>

      ${mapSvg(loc)}
      ${shared}
    </section>`;
}

/* ---------- the map itself ---------- */

function mapSvg(loc) {
  const lit = (s) => loc.kind === 'tent'
    ? s.id === loc.tent
    : loc.kind === 'zone' ? s.zone === loc.zone : false;

  const buildings = VENUE.buildings.map(b => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rot = b.dir === 'v' ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
    return `
      <g>
        <rect class="venue-map__building" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.h / 2}"/>
        <text class="venue-map__building-label" x="${cx}" y="${cy}"${rot}>${escapeHtml(b.label.toUpperCase())}</text>
      </g>`;
  }).join('');

  const circles = VENUE.circles.map(c => `
    <g>
      <circle class="venue-map__marquee" cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>
      <text class="venue-map__marquee-label" x="${c.cx}" y="${c.cy}">tents</text>
    </g>`).join('');

  const squares = VENUE.squares.map(s => {
    const on = lit(s);
    return `
      <g class="venue-map__slot${on ? ' is-lit' : ''}">
        ${on ? `<rect class="venue-map__halo" x="${s.x - 7}" y="${s.y - 7}" width="${SQ + 14}" height="${SQ + 14}" rx="8"/>` : ''}
        <rect class="venue-map__square" x="${s.x}" y="${s.y}" width="${SQ}" height="${SQ}" rx="3"
              style="fill: var(--vz-${s.zone});"/>
        ${s.id ? `<text class="venue-map__square-label" x="${s.x + SQ / 2}" y="${s.y + SQ / 2}">${s.id}</text>` : ''}
      </g>`;
  }).join('');

  return `
    <div class="venue__map">
      <svg viewBox="${VENUE.viewBox}" role="img"
           aria-label="Map of the org fair quad${loc.kind === 'none' ? '' : ', showing ' + escapeAttr(loc.label)}">
        <rect class="venue-map__field" x="${VENUE.field.x}" y="${VENUE.field.y}"
              width="${VENUE.field.w}" height="${VENUE.field.h}" rx="6"/>
        ${circles}
        <rect class="venue-map__stage" x="${VENUE.stage.x}" y="${VENUE.stage.y}"
              width="${VENUE.stage.w}" height="${VENUE.stage.h}" rx="4"/>
        <text class="venue-map__stage-label" x="${VENUE.stage.x + VENUE.stage.w / 2}"
              y="${VENUE.stage.y + VENUE.stage.h / 2}">STAGE</text>
        ${squares}
        ${buildings}
      </svg>
    </div>`;
}

/* ---------- helpers ---------- */

/* Tent-mates are stored as roster ids where we know them and as
   plain names where the map lists an org we do not carry. */
function nameList(ids) {
  const pretty = ids.map(x => /^[a-z0-9-]+$/.test(x) ? shortOf(x) : x);
  if (pretty.length === 1) return pretty[0];
  return pretty.slice(0, -1).join(', ') + ' and ' + pretty[pretty.length - 1];
}

const SHORTS = Object.fromEntries(ORGS.map(o => [o.id, o.short]));
function shortOf(id) {
  return SHORTS[id] || id;
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
