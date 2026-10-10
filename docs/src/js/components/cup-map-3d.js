/* ============================================================
   components/cup-map-3d.js — the campus in 3D (Mapbox).

   Loaded only when someone presses 3D, so nobody else downloads
   Mapbox (about 1.9 MB). Ported from the TXC campus map's
   CampusMap.tsx: the same camera, campus outline, venue name tags
   and sport icons — and the same markup as the 2D markers, so a
   tag or icon looks the same in either view.

   Needs CUP_MAP.mapbox.token (data/xavier-cup.js); without it the
   2D / 3D switch never appears and this file is never loaded.
   ============================================================ */

import { CUP_MAP } from '../data/xavier-cup.js';
import { CAMPUS_GEO } from '../data/campus-map.js';
import { venueIcons, venueTagHtml, sportMarkerHtml } from './cup-map.js';

let mapboxReady = null;

/** Add Mapbox's stylesheet and script once; resolves to mapboxgl. */
function loadMapbox(version) {
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if (mapboxReady) return mapboxReady;
  const base = `https://api.mapbox.com/mapbox-gl-js/v${version}`;
  mapboxReady = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${base}/mapbox-gl.css`;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = `${base}/mapbox-gl.js`;
    js.onload = () => (window.mapboxgl ? resolve(window.mapboxgl) : reject(new Error('Mapbox did not start')));
    js.onerror = () => reject(new Error('Mapbox could not be downloaded'));
    document.head.appendChild(js);
  }).catch((err) => { mapboxReady = null; throw err; });
  return mapboxReady;
}

/** A token's resolved colour: map layers can't read CSS variables,
    and color-mix() has to be worked out by the browser first. */
function tokenColour(name) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.hidden = true;
  document.body.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

const isNight = () => document.documentElement.getAttribute('data-theme') === 'dark';

function fromHtml(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function failHtml(message) {
  return `
    <div class="cup-map__3d-note" role="status">
      <p><strong>The 3D view couldn’t load.</strong> ${message}</p>
      <p>The 2D map has everything the 3D one does.</p>
    </div>`;
}

/**
 * mount3d(el, { onVenue, onSport, onClear, onZoom })
 * Returns { update(model), zoom(dir), canZoom(dir), resize() },
 * or a stand-in that only shows why 3D is unavailable.
 */
export async function mount3d(el, handlers) {
  const cfg = CUP_MAP.mapbox;
  const standIn = { update() {}, zoom() {}, canZoom: () => false, resize() {} };

  el.innerHTML = '<p class="cup-map__3d-note">Loading the 3D campus…</p>';

  let mapboxgl;
  try {
    mapboxgl = await loadMapbox(cfg.version);
  } catch {
    el.innerHTML = failHtml('Check your connection and try again.');
    return standIn;
  }

  el.innerHTML = '';
  let map;
  try {
    map = new mapboxgl.Map({
      container: el,
      accessToken: cfg.token,
      style: cfg.style,
      config: {
        basemap: {
          show3dObjects: true,
          show3dTrees: false,
          // Our own markers name the venues; keep roads and places
          // for orientation, drop points of interest.
          showPointOfInterestLabels: false,
          showLandmarkIconLabels: false,
          showRoadLabels: true,
          showPlaceLabels: true,
          showTransitLabels: false,
          lightPreset: isNight() ? 'night' : 'day',
        },
      },
      center: CAMPUS_GEO.center,
      ...CAMPUS_GEO.view,
      maxBounds: CAMPUS_GEO.bounds,
      minZoom: CAMPUS_GEO.minZoom,
      maxZoom: CAMPUS_GEO.maxZoom,
      attributionControl: true,
    });
  } catch {
    el.innerHTML = failHtml('This browser can’t draw 3D maps.');
    return standIn;
  }

  map.on('error', (e) => {
    // A bad or restricted token answers 401/403 on the first tile.
    const status = e?.error?.status;
    if (status === 401 || status === 403) {
      el.innerHTML = failHtml('The map key was refused — it may be missing, mistyped or restricted to another address.');
    }
  });

  /* --- The campus outline, coloured from the site's tokens --- */
  const paintBoundary = () => {
    if (!map.getSource('campus')) {
      map.addSource('campus', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [CAMPUS_GEO.boundary] } },
      });
      map.addLayer({ id: 'campus-fill', type: 'fill', source: 'campus', slot: 'bottom',
        paint: { 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 16, 0.12, 18.5, 0.04] } });
      map.addLayer({ id: 'campus-casing', type: 'line', source: 'campus', slot: 'middle',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 4, 19.5, 9] } });
      map.addLayer({ id: 'campus-line', type: 'line', source: 'campus', slot: 'middle',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1.75, 19.5, 4] } });
    }
    map.setPaintProperty('campus-fill', 'fill-color', tokenColour('--campus-select'));
    map.setPaintProperty('campus-casing', 'line-color', tokenColour('--surface'));
    map.setPaintProperty('campus-line', 'line-color', tokenColour('--campus-select'));
  };

  const applyTheme = () => {
    try { map.setConfigProperty('basemap', 'lightPreset', isNight() ? 'night' : 'day'); } catch { /* style not ready */ }
    if (map.isStyleLoaded()) paintBoundary();
  };
  map.on('load', paintBoundary);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin'] });

  /* --- Markers: rebuilt on every update; there are only a handful --- */
  let markers = [];
  let model = { stats: {}, venue: null, sport: null };
  let lastFocus = '';

  const syncLabels = () => el.classList.toggle('is-far', map.getZoom() < CAMPUS_GEO.labelZoom);
  map.on('zoom', () => { syncLabels(); handlers.onZoom?.(); });
  syncLabels();

  function drawMarkers() {
    markers.forEach(m => m.remove());
    markers = [];
    for (const venue of CUP_MAP.venues) {
      const stat = model.stats[venue.id];
      const tag = fromHtml(venueTagHtml(venue, stat, { selected: model.venue === venue.id && !model.sport }));
      markers.push(new mapboxgl.Marker({ element: tag, anchor: 'top', offset: [0, 8] }).setLngLat(venue.gps).addTo(map));
      for (const icon of venueIcons(venue, stat)) {
        const btn = fromHtml(sportMarkerHtml(venue, icon, { selected: model.venue === venue.id && model.sport === icon.sport }));
        btn.classList.add('cup-sport--3d');
        markers.push(new mapboxgl.Marker({ element: btn, anchor: 'bottom' }).setLngLat(icon.gps).addTo(map));
      }
    }
  }

  // Marker taps are handled (and stopped) by cup-map.js before they
  // get here, so a click Mapbox sees is always on empty ground.
  map.on('click', () => handlers.onClear?.());

  function flyToSelection() {
    const key = `${model.venue}|${model.sport}`;
    if (key === lastFocus) return;
    lastFocus = key;
    const venue = CUP_MAP.venues.find(v => v.id === model.venue);
    if (!venue) return;
    const target = (model.sport && venue.icons?.[model.sport]?.gps) || venue.gps;
    map.easeTo({ center: target, zoom: Math.max(map.getZoom(), 17.6), duration: 600, essential: true });
  }

  return {
    update(next) {
      model = next;
      drawMarkers();
      flyToSelection();
    },
    zoom(dir) { dir > 0 ? map.zoomIn({ duration: 300 }) : map.zoomOut({ duration: 300 }); },
    canZoom(dir) { return dir > 0 ? map.getZoom() < CAMPUS_GEO.maxZoom : map.getZoom() > CAMPUS_GEO.minZoom; },
    resize() { map.resize(); },
  };
}
