/* ============================================================
   components/cup-map.js — the Xavier Cup campus map.

   The campus drawing comes from the TXC campus map (txc-map by a
   GDG member), ported from React to the site's plain modules. It
   is the real campus, traced from the university's own map; the
   buildings that host games light up and can be tapped.

   Two ways in:

     mountCupMap(el, handlers)  the big interactive map on the Map
                                tab. Drag (or arrow keys) to move,
                                pinch or + / − to zoom. Returns
                                { update(model) }; screens/cup.js
                                calls update on every render and the
                                map keeps its zoom and position.

     cupMapHtml(stats, opts)    a static picture of the same drawing
                                with one venue lit — the small map in
                                a match's detail view.

   What is a venue and where each sport's icon sits
   come from data/xavier-cup.js → CUP_MAP. The drawing itself is
   data/campus-map.js. Nothing here needs editing to move anything.
   ============================================================ */

import { CUP_MAP, VENUE_BY_ID, SPORT_BY_NAME } from '../data/xavier-cup.js';
import { sportIconFor } from '../data/sport-icons.js';
import {
  CAMPUS_DRAWING, CAMPUS_OUTLINE, CAMPUS_ROAD, CAMPUS_WALKWAYS,
  CAMPUS_FOOTPRINTS, CAMPUS_MARKINGS, CAMPUS_LANDMARKS,
} from '../data/campus-map.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const { width: W, height: H, top: TOP } = CAMPUS_DRAWING;

import { hasCampusPoint } from '../lib/cup-map-locations.js';
import { constrainCamera, initialCamera, zoomAt, panBy, pinchCamera, minScale, MAX_SCALE } from '../lib/cup-map-camera.js';

const footprintOf = (venue) => venue.footprint || venue.id;
const VENUE_BY_FOOTPRINT = Object.fromEntries(CUP_MAP.venues.filter(hasCampusPoint).map(v => [footprintOf(v), v]));

// Pattern ids must be unique per drawing: the tab's map and a detail
// view's mini map can both be in the page, and a pattern referenced
// from inside a hidden view does not paint.
let drawingCount = 0;

/* ============================================================
   Stats — what is booked where
   ============================================================ */

/**
 * venueStats(games) — per venue, how many fixtures and in which
 * state, overall and per sport:
 *   { [venueId]: { total, upcoming, ongoing, finished,
 *                  sports: { [sport]: { total, upcoming, ongoing, finished } } } }
 */
export function venueStats(games) {
  const out = {};
  const bump = (s, status) => { s.total += 1; s[status] = (s[status] || 0) + 1; };
  const blank = () => ({ total: 0, upcoming: 0, ongoing: 0, finished: 0 });
  for (const g of games) {
    const id = g.venueId;
    if (!id) continue;
    const s = out[id] || (out[id] = { ...blank(), sports: {} });
    bump(s, g.status);
    if (g.sport) bump(s.sports[g.sport] || (s.sports[g.sport] = blank()), g.status);
  }
  return out;
}

/**
 * venueIcons(venue, stat) — the sport icons to draw at a venue: one
 * per sport that has a fixture there, at its spot from CUP_MAP. A
 * sport with no spot listed is set in a row above the name tag.
 */
export function venueIcons(venue, stat) {
  const booked = Object.keys(stat?.sports || {});
  const listed = Object.keys(venue.icons || {});
  const sports = [
    ...listed.filter(s => booked.includes(s)),
    ...booked.filter(s => !listed.includes(s)),
  ];
  if (!hasCampusPoint(venue)) return sports.map(sport => ({ sport, stat: stat.sports[sport] }));
  const unplaced = sports.filter(s => !venue.icons?.[s]);
  // Reserve configured spots even without a current game, keeping automatic
  // icons away from them and consistent between the main map and mini map.
  const reserved = Object.values(venue.icons || {}).map(spot => spot.at).filter(Boolean);
  const halfRow = (unplaced.length - 1) * 12;
  let rowY = venue.label[1] - 26;
  while (unplaced.length && reserved.some(([x, y]) =>
    Math.abs(y - rowY) < 24 && Math.abs(x - venue.label[0]) < halfRow + 24)) rowY -= 24;
  return sports.map(sport => {
    const spot = venue.icons?.[sport];
    let at = spot?.at;
    if (!at) {
      const i = unplaced.indexOf(sport);
      at = [venue.label[0] + (i - (unplaced.length - 1) / 2) * 24, rowY];
    }
    return { sport, at, gps: spot?.gps || venue.gps, stat: stat.sports[sport] };
  });
}

/** The picture for a sport, or null (the marker falls back to a letter). */
export function sportIcon(sport) {
  return SPORT_BY_NAME[sport]?.icon || sportIconFor(sport);
}

/* ============================================================
   The drawing (shared by the big map and the mini map)
   ============================================================ */

/**
 * drawingSvg({ stats, selected, interactive }) — the campus as one
 * inline SVG. Venue footprints carry data-map-venue so the big map
 * can take clicks on the building itself, not only on its tag.
 */
function drawingSvg({ stats = {}, selected = null, interactive = false, extra = '', view = null } = {}) {
  const uid = `campus-${++drawingCount}`;

  const walkways = CAMPUS_WALKWAYS.map(w =>
    `<path class="campus__walk" d="${escapeAttr(w.d)}" stroke-width="${w.width}"/>`).join('');

  const footprints = CAMPUS_FOOTPRINTS.map(fp => {
    const venue = VENUE_BY_FOOTPRINT[fp.id];
    const classes = ['campus__fp', fp.kind ? `campus__fp--${fp.kind}` : ''];
    let attrs = '';
    if (venue) {
      const total = stats[venue.id]?.total ?? 0;
      classes.push('is-venue');
      if (selected === venue.id) classes.push('is-selected');
      if (interactive) attrs = ` data-map-venue="${escapeAttr(venue.id)}"`;
      if (!total && interactive) classes.push('is-empty');
    }
    const label = fp.lines.length ? `
      <text class="campus__fp-label${fp.small ? ' campus__fp-label--small' : ''}"
            x="${fp.center[0]}" y="${fp.center[1] - (fp.lines.length - 1) * 3.2 + 1.8}">
        ${fp.lines.map((line, i) =>
          `<tspan x="${fp.center[0]}" dy="${i === 0 ? 0 : 6.4}">${escapeHtml(line)}</tspan>`).join('')}
      </text>` : '';
    return `
      <g>
        <title>${escapeHtml(venue?.name || fp.name)}</title>
        <polygon class="${classes.filter(Boolean).join(' ')}" points="${fp.points}"${attrs}/>
        ${fp.kind ? '' : `<polygon class="campus__roof" points="${fp.points}" fill="url(#${uid}-roof)"/>`}
        ${label}
      </g>`;
  }).join('');

  const markings = CAMPUS_MARKINGS.lines.map(m =>
    `<path d="${escapeAttr(m.d)}"${m.transform ? ` transform="${escapeAttr(m.transform)}"` : ''}/>`).join('');

  const landmarks = CAMPUS_LANDMARKS.map(l => `
    ${l.tick ? `<path class="campus__gate" d="${escapeAttr(l.tick)}"/>` : ''}
    <text class="campus__landmark" x="${l.x}" y="${l.y}" font-size="${l.size}">${escapeHtml(l.text)}</text>`).join('');

  const road = CAMPUS_ROAD;
  return `
    <svg class="campus" viewBox="${view ? view.join(' ') : `0 ${TOP} ${W} ${H}`}"${view ? ' preserveAspectRatio="xMidYMid slice"' : ''}
         aria-hidden="true" focusable="false">
      <defs>
        <pattern id="${uid}-stripes" width="24" height="80" patternUnits="userSpaceOnUse">
          <rect class="campus__stripe" width="12" height="80"/>
        </pattern>
        <pattern id="${uid}-roof" width="5" height="5" patternUnits="userSpaceOnUse">
          <path class="campus__roof-line" d="M 0 0 V 5"/>
        </pattern>
      </defs>
      <path class="campus__road" d="${road.d}"/>
      <path class="campus__road-line" d="${road.d}"/>
      <text class="campus__road-label" x="${road.label.x}" y="${road.label.y}"
            transform="rotate(${road.label.rotate} ${road.label.x} ${road.label.y})">${escapeHtml(road.label.text)}</text>
      <polygon class="campus__land" points="${CAMPUS_OUTLINE}"/>
      <g class="campus__walks">${walkways}</g>
      ${footprints}
      <g class="campus__markings">
        <polygon points="${CAMPUS_MARKINGS.stripes}" fill="url(#${uid}-stripes)"/>
        <g class="campus__lines">${markings}</g>
      </g>
      <g class="campus__landmarks">${landmarks}</g>
      ${extra}
    </svg>`;
}

/* ============================================================
   Markers (HTML over the drawing, so they stay a readable size)
   ============================================================ */

const pct = ([x, y]) => `--x: ${(x / W * 100).toFixed(3)}%; --y: ${((y - TOP) / H * 100).toFixed(3)}%;`;

/* How far a name tag leans away from the nearer edge on a small map,
   so the gym's tag, on the right-hand edge, is not cut off. */
const lean = ([x]) => `--lean: ${(-50 - (x / W - 0.5) * 60).toFixed(1)}%;`;

/** How a venue's or sport's tally reads to a screen reader. */
function tallyLabel(s) {
  if (!s?.total) return 'nothing scheduled';
  const parts = [];
  if (s.ongoing) parts.push(`${s.ongoing} being played now`);
  if (s.upcoming) parts.push(`${s.upcoming} upcoming`);
  if (s.finished) parts.push(`${s.finished} finished`);
  return parts.join(', ');
}

/** The venue's name tag — the keyboard way to pick a venue. */
export function venueTagHtml(venue, stat, { selected = false, style = '' } = {}) {
  const total = stat?.total ?? 0;
  const live = (stat?.ongoing ?? 0) > 0;
  const classes = ['cup-tag', selected ? 'is-selected' : '', live ? 'is-live' : '', total ? '' : 'is-empty']
    .filter(Boolean).join(' ');
  return `
    <button class="${classes}" type="button" data-map-venue="${escapeAttr(venue.id)}"
            aria-pressed="${selected}" ${style ? `style="${style}"` : ''}
            aria-label="${escapeAttr(`${venue.name}: ${tallyLabel(stat)}`)}">
      ${live ? '<span class="cup-tag__live" aria-hidden="true"></span>' : ''}
      <span class="cup-tag__name">${escapeHtml(venue.short || venue.name)}</span>
      ${total ? `<span class="cup-tag__count" aria-hidden="true">${total}</span>` : ''}
    </button>`;
}

/** One sport's icon at one venue. */
export function sportMarkerHtml(venue, icon, { selected = false, style = '' } = {}) {
  const live = (icon.stat?.ongoing ?? 0) > 0;
  const src = sportIcon(icon.sport);
  const classes = ['cup-sport', selected ? 'is-selected' : '', live ? 'is-live' : ''].filter(Boolean).join(' ');
  return `
    <button class="${classes}" type="button"
            data-map-venue="${escapeAttr(venue.id)}" data-map-sport="${escapeAttr(icon.sport)}"
            aria-pressed="${selected}" ${style ? `style="${style}"` : ''}
            aria-label="${escapeAttr(`${icon.sport} at ${venue.name}: ${tallyLabel(icon.stat)}`)}">
      ${live ? '<span class="cup-sport__pulse" aria-hidden="true"></span>' : ''}
      ${src
        ? `<img class="cup-sport__icon" src="${escapeAttr(src)}" alt="" draggable="false" width="96" height="96"/>`
        : `<span class="cup-sport__icon cup-sport__icon--letter" aria-hidden="true">${escapeHtml(icon.sport.charAt(0))}</span>`}
      <span class="cup-sport__name" aria-hidden="true">${escapeHtml(icon.sport)}${live ? ' · Live' : ''}</span>
    </button>`;
}

function markersHtml(stats, selectedVenue, selectedSport) {
  const tags = [];
  const sports = [];
  for (const venue of CUP_MAP.venues.filter(hasCampusPoint)) {
    const stat = stats[venue.id];
    tags.push(venueTagHtml(venue, stat, {
      selected: selectedVenue === venue.id && !selectedSport,
      style: pct(venue.label) + lean(venue.label),
    }));
    for (const icon of venueIcons(venue, stat)) {
      sports.push(sportMarkerHtml(venue, icon, {
        selected: selectedVenue === venue.id && selectedSport === icon.sport,
        style: pct(icon.at),
      }));
    }
  }
  // Tags first so the icons, which sit above them, win any overlap.
  return tags.join('') + sports.join('');
}

/* ============================================================
   The mini map (a match's detail view)
   ============================================================ */

/**
 * cupMapHtml(stats, { selected, sport, mini })
 * Only the mini form is still built from a string: one venue lit,
 * its name tag, and — when given — the icon of the sport being
 * played, so the picture shows the exact corner of the field.
 */
export function cupMapHtml(stats = {}, { selected = null, sport = null } = {}) {
  const venue = VENUE_BY_ID[selected];
  let extra = '';
  if (hasCampusPoint(venue)) {
    const icon = sport ? venueIcons(venue, { sports: { [sport]: { total: 1 } } })[0] : null;
    const src = sportIcon(sport);
    const [lx, ly] = venue.label;
    const name = venue.short || venue.name;
    const w = Math.max(40, name.length * 5.4 + 14);
    extra = `
      <g class="campus__mini-tag">
        <rect x="${lx - w / 2}" y="${ly - 7}" width="${w}" height="14" rx="7"/>
        <text x="${lx}" y="${ly + 0.4}">${escapeHtml(name)}</text>
      </g>
      ${icon && src ? `<image href="${escapeAttr(src)}" x="${icon.at[0] - 21}" y="${icon.at[1] - 21}" width="42" height="42"/>` : ''}`;
  }
  const label = venue ? `Campus map showing ${venue.name}` : 'Campus map';
  return `
    <div class="cup-map-mini" role="img" aria-label="${escapeAttr(label)}">
      ${drawingSvg({ stats, selected, extra })}
    </div>`;
}

/* ============================================================
   The preview (the Map Hub tile on Discover)
   ============================================================ */

/* The part of the campus the preview frames ([x, y, width, height] in
   drawing units): the three venues in the middle band, room above for
   the tile's heading and below for its button. It fills the tile and
   crops at the edges, never at a venue. */
const PREVIEW_VIEW = [102, 88, 506, 344];

/**
 * cupMapPreviewHtml(stats) — a still of the campus around the Cup's
 * venues: their buildings lit, each one named, the icons of the sports
 * played there, and the name in red with a pulsing dot while a game is
 * on there. Decorative: the tile around it is the link to the map.
 */
export function cupMapPreviewHtml(stats = {}) {
  const venues = CUP_MAP.venues.filter(hasCampusPoint);
  const icons = venues.flatMap(v => Object.entries(v.icons || {}))
    .filter(([sport, spot]) => spot.at && sportIcon(sport))
    .map(([sport, { at: [x, y] }]) =>
      `<image href="${escapeAttr(sportIcon(sport))}" x="${x - 12}" y="${y - 12}" width="24" height="24"/>`).join('');
  const tags = venues.map(v => {
    const [lx, ly] = v.label;
    const name = v.short || v.name;
    const w = name.length * 6.4 + 18;
    const live = (stats[v.id]?.ongoing ?? 0) > 0;
    return `
      <g class="campus__mini-tag campus__mini-tag--preview${live ? ' is-live' : ''}">
        <rect x="${lx - w / 2}" y="${ly - 8.5}" width="${w}" height="17" rx="8.5"/>
        <text x="${lx}" y="${ly + 0.5}">${escapeHtml(name)}</text>
        ${live ? `<circle class="campus__pulse" cx="${lx - w / 2 + 3}" cy="${ly - 6}" r="4"/>` : ''}
      </g>`;
  }).join('');
  return drawingSvg({ stats, view: PREVIEW_VIEW, extra: icons + tags });
}

/** The key under the big map. */
export function cupLegendHtml() {
  return `
    <ul class="cup-legend" aria-label="Map key">
      <li class="cup-legend__item"><span class="cup-legend__swatch cup-legend__swatch--live"></span>Being played now</li>
      <li class="cup-legend__item cup-legend__item--hint">Tap a venue or a sport to see its games. Drag to explore. Pinch, scroll or use + / − to zoom. Recenter to return.</li>
    </ul>`;
}

/* ============================================================
   The big map
   ============================================================ */

/**
 * mountCupMap(el, { onVenue, onSport, onClear })
 *   onVenue(id)          a venue's building or name tag was tapped
 *   onSport(id, sport)   a sport icon was tapped
 *   onClear()            empty ground was tapped
 * Returns { update({ stats, venue, sport }) }.
 */
export function mountCupMap(el, handlers) {
  el.innerHTML = `<div class="cup-map">
    <div class="cup-map__viewport" tabindex="0" role="region"
      aria-label="Campus map. Drag to move, pinch or plus and minus to zoom, Home to recenter.">
      <div class="cup-map__canvas" data-map-canvas></div>
    </div>
    <div class="cup-map__dock"><div class="cup-map__zoom">
      <button class="cup-map__btn" type="button" data-map-zoom="1" aria-label="Zoom in">+</button>
      <button class="cup-map__btn" type="button" data-map-zoom="-1" aria-label="Zoom out">−</button>
      <button class="cup-map__btn" type="button" data-map-home aria-label="Recenter campus map" title="Recenter">⌖</button>
    </div></div>
  </div>`;
  const root = el.querySelector('.cup-map');
  const viewport = root.querySelector('.cup-map__viewport');
  const canvas = root.querySelector('[data-map-canvas]');
  const zoomIn = root.querySelector('[data-map-zoom="1"]');
  const zoomOut = root.querySelector('[data-map-zoom="-1"]');
  const abort = new AbortController();
  const listen = (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: abort.signal });
  let size = { width: 0, height: 0 }, camera = null;
  let model = { stats: {}, venue: null, sport: null }, lastFocus = '', painted = '';
  let gesture = null, suppressClick = false, lastTap = null, lastTouch = -Infinity, inertia = null;
  const pointers = new Map();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.dataset.motion === 'reduced';
  function stop() { if (inertia !== null) cancelAnimationFrame(inertia); inertia = null; }
  function commit(next) {
    camera = next;
    canvas.style.transform = `translate(${size.width / 2 - camera.x * camera.scale}px, ${size.height / 2 - camera.y * camera.scale}px) scale(${camera.scale})`;
    canvas.style.setProperty('--marker-scale', 1 / camera.scale);
    zoomIn.disabled = camera.scale >= MAX_SCALE - 0.001;
    zoomOut.disabled = camera.scale <= minScale(size) + 0.001;
  }
  function zoom(factor, point = { x: size.width / 2, y: size.height / 2 }) {
    stop();
    if (camera) commit(zoomAt(camera, size, camera.scale * factor, point));
  }
  function recenter() { stop(); if (size.width && size.height) commit(initialCamera(size)); }
  function focusSelection(force = false) {
    if (!camera) return;
    const key = `${model.venue}|${model.sport}`;
    if (!force && key === lastFocus) return;
    lastFocus = key;
    const venue = VENUE_BY_ID[model.venue];
    if (!hasCampusPoint(venue)) return;
    const at = venueIcons(venue, model.stats[venue.id]).find(icon => icon.sport === model.sport)?.at || venue.label;
    const scale = Math.max(camera.scale, 2.4);
    const list = el.closest('.cup-map-grid')?.querySelector('[data-cup-map-list]');
    const mobile = matchMedia('(max-width: 1000px)').matches;
    const right = !mobile && list ? list.offsetWidth + 40 : 0;
    const bottom = mobile && list ? list.offsetHeight + 16 : 0;
    const targetX = (size.width - right) / 2;
    const targetY = (size.height - bottom) / 2;
    stop();
    commit(constrainCamera({ scale, x: at[0] - (targetX - size.width / 2) / scale,
      y: at[1] - TOP - (targetY - size.height / 2) / scale }, size));
  }
  function paint() {
    const signature = JSON.stringify(model);
    if (signature === painted) return;
    painted = signature;
    const focused = canvas.contains(document.activeElement) ? document.activeElement : null;
    const focusedVenue = focused?.dataset.mapVenue, focusedSport = focused?.dataset.mapSport;
    canvas.innerHTML = drawingSvg({ stats: model.stats, selected: model.venue, interactive: true })
      + `<div class="cup-map__markers">${markersHtml(model.stats, model.venue, model.sport)}</div>`;
    if (focusedVenue) [...canvas.querySelectorAll('button[data-map-venue]')]
      .find(b => b.dataset.mapVenue === focusedVenue && b.dataset.mapSport === focusedSport)?.focus({ preventScroll: true });
  }
  listen(root, 'click', e => {
    if (suppressClick && viewport.contains(e.target) && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); return; }
    const zoomBtn = e.target.closest('[data-map-zoom]');
    if (zoomBtn) { zoom(Number(zoomBtn.dataset.mapZoom) > 0 ? 1.3 : 1 / 1.3); return; }
    if (e.target.closest('[data-map-home]')) { recenter(); return; }
    const venue = e.target.closest('[data-map-venue]');
    if (venue) {
      e.stopPropagation();
      if (venue.dataset.mapSport) handlers.onSport?.(venue.dataset.mapVenue, venue.dataset.mapSport);
      else handlers.onVenue?.(venue.dataset.mapVenue);
    } else if (viewport.contains(e.target)) handlers.onClear?.();
  }, { capture: true });
  const pointFor = e => {
    const rect = viewport.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  function restartGesture() {
    const points = [...pointers.values()].slice(0, 2);
    if (!points.length || !camera) { gesture = null; return; }
    const midpoint = points.length === 2 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
    gesture = { camera, midpoint, distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
      moved: suppressClick, last: midpoint, time: performance.now(), vx: 0, vy: 0 };
  }
  listen(viewport, 'pointerdown', e => {
    if (e.button !== 0 || !camera) return;
    stop();
    if (e.pointerType === 'touch') lastTouch = performance.now();
    if (!pointers.size) suppressClick = false;
    pointers.set(e.pointerId, pointFor(e));
    if (pointers.size > 1) {
      suppressClick = true; lastTap = null;
      for (const id of pointers.keys()) viewport.setPointerCapture(id);
    }
    restartGesture();
  });
  listen(viewport, 'pointermove', e => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, pointFor(e));
    const points = [...pointers.values()].slice(0, 2), start = gesture;
    const midpoint = points.length === 2 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
    const dx = midpoint.x - start.midpoint.x, dy = midpoint.y - start.midpoint.y;
    if (points.length === 2 || Math.hypot(dx, dy) > 5) start.moved = true;
    if (!start.moved) return;
    suppressClick = true; viewport.classList.add('is-dragging'); viewport.setPointerCapture(e.pointerId);
    const time = performance.now(), elapsed = Math.max(1, time - start.time);
    start.vx = (midpoint.x - start.last.x) / elapsed; start.vy = (midpoint.y - start.last.y) / elapsed;
    start.time = time; start.last = midpoint;
    if (points.length === 2 && start.distance > 0) {
      commit(pinchCamera(start.camera, size, start.midpoint, midpoint,
        Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / start.distance));
    } else commit(panBy(start.camera, size, dx, dy));
  });
  function finish(e, cancelled = false) {
    if (!pointers.has(e.pointerId)) return;
    const start = gesture;
    pointers.delete(e.pointerId);
    if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    if (pointers.size) { restartGesture(); return; }
    gesture = null; viewport.classList.remove('is-dragging');
    if (!start || cancelled) { suppressClick = true; lastTap = null; return; }
    const point = pointFor(e);
    if (!start.moved && e.pointerType === 'touch' && !e.target.closest('button, [data-map-venue]')) {
      const time = performance.now();
      if (lastTap && time - lastTap.time < 300 && Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < 24) {
        zoom(1.5, point); suppressClick = true; lastTap = null;
      } else lastTap = { time, point };
    }
    if (!start.moved || start.distance || performance.now() - start.time > 80 || reduced()) return;
    let vx = Math.max(-2, Math.min(2, start.vx)), vy = Math.max(-2, Math.min(2, start.vy)), previous = performance.now();
    const glide = time => {
      const elapsed = Math.min(32, time - previous); previous = time;
      vx *= Math.exp(-elapsed / 140); vy *= Math.exp(-elapsed / 140);
      if (Math.hypot(vx, vy) < 0.02) { inertia = null; return; }
      commit(panBy(camera, size, vx * elapsed, vy * elapsed));
      inertia = requestAnimationFrame(glide);
    };
    inertia = requestAnimationFrame(glide);
  }
  listen(viewport, 'pointerup', e => finish(e));
  listen(viewport, 'pointercancel', e => finish(e, true));
  listen(viewport, 'lostpointercapture', e => {
    // A touch starts captured by its SVG/button target. Moving capture to
    // the viewport emits a loss event from that child, which bubbles here.
    // Only losing the viewport's own capture should cancel the drag.
    if (e.target === viewport) finish(e, true);
  });
  listen(viewport, 'pointerleave', e => { if (!viewport.hasPointerCapture(e.pointerId)) finish(e, true); });
  listen(viewport, 'wheel', e => {
    e.preventDefault();
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.height : 1);
    zoom(Math.exp(-Math.max(-160, Math.min(160, pixels)) * (e.ctrlKey ? 0.01 : 0.002)), pointFor(e));
  }, { passive: false });
  listen(viewport, 'dblclick', e => {
    if (performance.now() - lastTouch < 600 || e.target.closest('[data-map-venue]')) return;
    e.preventDefault(); zoom(1.5, pointFor(e));
  });
  listen(viewport, 'keydown', e => {
    if (e.target !== viewport || !camera) return;
    const delta = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key];
    if (delta) { e.preventDefault(); stop(); commit(panBy(camera, size, ...delta)); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(1.3); }
    if (e.key === '-') { e.preventDefault(); zoom(1 / 1.3); }
    if (e.key === 'Home') { e.preventDefault(); recenter(); }
    if (e.key === 'Escape') handlers.onClear?.();
  });
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const first = !camera;
    size = { width, height }; stop();
    commit(camera ? constrainCamera(camera, size) : initialCamera(size));
    if (first || model.venue) focusSelection(true);
  });
  observer.observe(viewport);
  return {
    update(next) {
      model = { stats: next.stats || {}, venue: next.venue || null, sport: next.sport || null };
      paint(); focusSelection();
    },
    refocus() { focusSelection(true); },
    destroy() { stop(); observer.disconnect(); abort.abort(); },
  };
}
