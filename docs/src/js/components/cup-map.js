/* ============================================================
   components/cup-map.js — the Xavier Cup campus map.

   The campus drawing comes from the TXC campus map (txc-map by a
   GDG member), ported from React to the site's plain modules. It
   is the real campus, traced from the university's own map; the
   buildings that host games light up and can be tapped.

   Two ways in:

     mountCupMap(el, handlers)  the big interactive map on the Map
                                tab. Drag (or arrow keys) to move,
                                + / − to zoom, and 2D / 3D when a
                                Mapbox token is set. Returns
                                { update(model) }; screens/cup.js
                                calls update on every render and the
                                map keeps its zoom and position.

     cupMapHtml(stats, opts)    a static picture of the same drawing
                                with one venue lit — the small map in
                                a match's detail view.

   What is a venue, where each sport's icon sits, and the 3D token
   all come from data/xavier-cup.js → CUP_MAP. The drawing itself is
   data/campus-map.js. Nothing here needs editing to move anything.
   ============================================================ */

import { CUP_MAP, VENUE_BY_ID } from '../data/xavier-cup.js';
import {
  CAMPUS_DRAWING, CAMPUS_OUTLINE, CAMPUS_ROAD, CAMPUS_WALKWAYS,
  CAMPUS_FOOTPRINTS, CAMPUS_MARKINGS, CAMPUS_LANDMARKS,
} from '../data/campus-map.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

const { width: W, height: H, top: TOP } = CAMPUS_DRAWING;

const ZOOM = { min: 1, max: 2.25, step: 0.25 };

const footprintOf = (venue) => venue.footprint || venue.id;
const VENUE_BY_FOOTPRINT = Object.fromEntries(CUP_MAP.venues.map(v => [footprintOf(v), v]));

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
  const unplaced = sports.filter(s => !venue.icons?.[s]);
  return sports.map(sport => {
    const spot = venue.icons?.[sport];
    let at = spot?.at;
    if (!at) {
      const i = unplaced.indexOf(sport);
      at = [venue.label[0] + (i - (unplaced.length - 1) / 2) * 24, venue.label[1] - 26];
    }
    return { sport, at, gps: spot?.gps || venue.gps, stat: stat.sports[sport] };
  });
}

/** The picture for a sport, or null (the marker falls back to a letter). */
export function sportIcon(sport) {
  return CUP_MAP.sportIcons?.[sport] || null;
}

/* ============================================================
   The drawing (shared by the big map and the mini map)
   ============================================================ */

/**
 * drawingSvg({ stats, selected, interactive }) — the campus as one
 * inline SVG. Venue footprints carry data-map-venue so the big map
 * can take clicks on the building itself, not only on its tag.
 */
function drawingSvg({ stats = {}, selected = null, interactive = false, extra = '' } = {}) {
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
    <svg class="campus" viewBox="0 ${TOP} ${W} ${H}" aria-hidden="true" focusable="false">
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
  for (const venue of CUP_MAP.venues) {
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
  if (venue) {
    const icon = venue.icons?.[sport];
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

/** The key under the big map. */
export function cupLegendHtml() {
  return `
    <ul class="cup-legend" aria-label="Map key">
      <li class="cup-legend__item"><span class="cup-legend__swatch cup-legend__swatch--live"></span>Being played now</li>
      <li class="cup-legend__item cup-legend__item--hint">Tap a venue or a sport to see its games. Zoom with + / −, then drag to move around.</li>
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
  const has3d = Boolean(CUP_MAP.mapbox?.token);

  el.innerHTML = `
    <div class="cup-map" data-mode="2d">
      <div class="cup-map__viewport" tabindex="0" role="region"
           aria-label="Campus map. Use the arrow keys to move around when zoomed in.">
        <div class="cup-map__canvas" data-map-canvas></div>
      </div>
      <div class="cup-map__3d" data-map-3d hidden></div>
      <div class="cup-map__dock">
        ${has3d ? `
          <div class="cup-map__modes" role="group" aria-label="Map view">
            <button class="cup-map__btn cup-map__btn--mode" type="button" data-map-mode="2d" aria-pressed="true">2D</button>
            <button class="cup-map__btn cup-map__btn--mode" type="button" data-map-mode="3d" aria-pressed="false">3D</button>
          </div>` : ''}
        <div class="cup-map__zoom">
          <button class="cup-map__btn" type="button" data-map-zoom="1" aria-label="Zoom in">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>
          </button>
          <button class="cup-map__btn" type="button" data-map-zoom="-1" aria-label="Zoom out">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4.5 10h11"/></svg>
          </button>
        </div>
      </div>
    </div>`;

  const root = el.querySelector('.cup-map');
  const viewport = root.querySelector('.cup-map__viewport');
  const canvas = root.querySelector('[data-map-canvas]');
  const box3d = root.querySelector('[data-map-3d]');
  const zoomIn = root.querySelector('[data-map-zoom="1"]');
  const zoomOut = root.querySelector('[data-map-zoom="-1"]');

  let zoom = ZOOM.min;
  let mode = '2d';
  let model = { stats: {}, venue: null, sport: null };
  let view3d = null;          // the Mapbox view, once 3D has been opened
  let lastFocus = '';         // what the viewport last scrolled to

  /* --- Size: the canvas is the viewport's width times the zoom --- */
  function layout({ keepCentre = true } = {}) {
    const fit = viewport.clientWidth;
    if (!fit) return;
    const cx = keepCentre && canvas.offsetWidth
      ? (viewport.scrollLeft + viewport.clientWidth / 2) / canvas.offsetWidth : 0.5;
    const cy = keepCentre && canvas.offsetHeight
      ? (viewport.scrollTop + viewport.clientHeight / 2) / canvas.offsetHeight : 0.5;
    const w = Math.floor(fit * zoom);
    const h = Math.floor(w * H / W);
    canvas.style.setProperty('--canvas-w', `${w}px`);
    canvas.style.setProperty('--canvas-h', `${h}px`);
    viewport.classList.toggle('is-zoomed', zoom > ZOOM.min);
    viewport.scrollLeft = cx * w - viewport.clientWidth / 2;
    viewport.scrollTop = cy * h - viewport.clientHeight / 2;
    syncZoomButtons();
  }

  function syncZoomButtons() {
    if (mode === '3d' && view3d) {
      zoomIn.disabled = !view3d.canZoom(1);
      zoomOut.disabled = !view3d.canZoom(-1);
      return;
    }
    zoomIn.disabled = zoom >= ZOOM.max;
    zoomOut.disabled = zoom <= ZOOM.min;
  }

  function setZoom(next) {
    const z = Math.min(ZOOM.max, Math.max(ZOOM.min, next));
    if (z === zoom) return;
    zoom = z;
    layout();
  }

  /* --- Bring the selection into view when zoomed in --- */
  function focusSelection() {
    const key = `${model.venue}|${model.sport}`;
    if (key === lastFocus) return;
    lastFocus = key;
    const venue = VENUE_BY_ID[model.venue];
    if (!venue || zoom === ZOOM.min) return;
    const at = (model.sport && venue.icons?.[model.sport]?.at) || venue.label;
    viewport.scrollTo({
      left: (at[0] / W) * canvas.offsetWidth - viewport.clientWidth / 2,
      top: ((at[1] - TOP) / H) * canvas.offsetHeight - viewport.clientHeight / 2,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  /* --- Paint (the canvas keeps its size, so zoom and scroll stay) --- */
  function paint() {
    canvas.innerHTML = drawingSvg({ stats: model.stats, selected: model.venue, interactive: true })
      + `<div class="cup-map__markers">${markersHtml(model.stats, model.venue, model.sport)}</div>`;
  }

  /* --- Taps: markers and venue footprints, in both views. Caught on
         the way down so a marker tap never reaches Mapbox (which
         would read it as a tap on empty ground) or the screen. --- */
  let suppressClick = false;
  root.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.stopPropagation(); return; }
    const modeBtn = e.target.closest('[data-map-mode]');
    if (modeBtn) { setMode(modeBtn.dataset.mapMode); return; }
    const zoomBtn = e.target.closest('[data-map-zoom]');
    if (zoomBtn) {
      const dir = Number(zoomBtn.dataset.mapZoom);
      if (mode === '3d' && view3d) { view3d.zoom(dir); } else { setZoom(zoom + dir * ZOOM.step); }
      return;
    }
    const sport = e.target.closest('[data-map-sport]');
    const venue = e.target.closest('[data-map-venue]');
    if (sport || venue) {
      e.stopPropagation();
      if (sport) handlers.onSport?.(sport.dataset.mapVenue, sport.dataset.mapSport);
      else handlers.onVenue?.(venue.dataset.mapVenue);
      return;
    }
    // Empty ground in 2D; in 3D, Mapbox reports its own empty taps.
    if (e.target.closest('.cup-map__viewport')) handlers.onClear?.();
  }, true);

  /* --- Mouse drag to pan. Touch scrolls the viewport natively,
         which also lets a swipe carry on into the page. --- */
  let drag = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || zoom === ZOOM.min) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) {
      drag.moved = true;
      // Keeps the drag going if the pointer leaves the map; harmless
      // to lose if the pointer is already gone.
      try { viewport.setPointerCapture(e.pointerId); } catch { /* no active pointer */ }
      viewport.classList.add('is-dragging');
    }
    if (drag.moved) {
      viewport.scrollLeft = drag.left - dx;
      viewport.scrollTop = drag.top - dy;
    }
  });
  const endDrag = (e) => {
    if (!drag) return;
    if (drag.moved) suppressClick = true;
    if (viewport.hasPointerCapture?.(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    viewport.classList.remove('is-dragging');
    drag = null;
    // A drag that ends off any control fires no click to swallow.
    setTimeout(() => { suppressClick = false; }, 0);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  /* --- Arrow keys pan when the map itself has focus --- */
  viewport.addEventListener('keydown', (e) => {
    if (e.target !== viewport) return;
    const step = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] }[e.key];
    if (!step) return;
    e.preventDefault();
    viewport.scrollBy({ left: step[0], top: step[1] });
  });

  new ResizeObserver(() => layout()).observe(viewport);

  /* --- 2D / 3D --- */
  async function setMode(next) {
    if (next === mode || (next === '3d' && !has3d)) return;
    mode = next;
    root.dataset.mode = mode;
    root.querySelectorAll('[data-map-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mapMode === mode)));
    viewport.hidden = mode !== '2d';
    box3d.hidden = mode !== '3d';
    if (mode === '3d') {
      if (!view3d) {
        const { mount3d } = await import('./cup-map-3d.js');
        view3d = await mount3d(box3d, { ...handlers, onZoom: syncZoomButtons });
      }
      view3d?.update(model);
      view3d?.resize();
    } else {
      layout();
    }
    syncZoomButtons();
  }

  layout({ keepCentre: false });

  return {
    update(next) {
      model = { stats: next.stats || {}, venue: next.venue || null, sport: next.sport || null };
      paint();
      if (mode === '3d') view3d?.update(model);
      else focusSelection();
    },
  };
}
