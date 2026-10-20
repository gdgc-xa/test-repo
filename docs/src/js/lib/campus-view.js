/* ============================================================
   lib/campus-view.js — which way the campus map is drawn.

   The drawing (data/campus-map.js) and every pin (data/xavier-cup.js
   → CUP_MAP) are stored ONCE, flat. This file turns a flat point into
   a point on screen for the view in use, so the buildings, the court
   lines, the gate labels and the pins all move together:

     'flat'  the plain plan (default). With CAMPUS_VIEW.slant on, the
             same plan tilted a little. Code only: no button for it.
     '3d'    tilted and raised: each building stands `h` units tall.
             The visitor's button on the Map tab switches to it.

   A pin on a raised building rides up with its roof, so it needs the
   building's height: pass `h` (see heightAt in components/cup-map.js).
   ============================================================ */
import { CAMPUS_VIEW } from '../data/campus-map.js';

export const CAMPUS_VIEWS = ['flat', '3d'];
const KEY = 'xu-campus-view';
let current = null;

const valid = v => CAMPUS_VIEWS.includes(v);

/** The view in use: the visitor's last choice, else the configured default. */
export function getCampusView() {
  if (current) return current;
  let saved = null;
  try { saved = globalThis.localStorage?.getItem(KEY); } catch { /* private mode */ }
  current = CAMPUS_VIEW.toggle && valid(saved) ? saved : (valid(CAMPUS_VIEW.default) ? CAMPUS_VIEW.default : 'flat');
  return current;
}

/** Switch view; everything that draws the campus listens for 'campus:view'. */
export function setCampusView(view) {
  if (!valid(view) || view === getCampusView()) return;
  current = view;
  try { globalThis.localStorage?.setItem(KEY, view); } catch { /* private mode */ }
  globalThis.dispatchEvent?.(new CustomEvent('campus:view', { detail: view }));
}

export const isRaised = (view = getCampusView()) => view === '3d';
export const isTilted = (view = getCampusView()) => view === '3d' || Boolean(CAMPUS_VIEW.slant);

/**
 * project(x, y, h = 0, view) — a flat drawing point as it lands on the
 * canvas. `h` lifts the point (only the 3D view raises anything).
 * The tilt leans the vertical edges a little and squashes the plan's
 * height a touch, keeping the campus centred in the 560 × 310 canvas.
 */
export function project(x, y, h = 0, view = getCampusView()) {
  const lift = isRaised(view) ? h : 0;
  if (!isTilted(view)) return [x, y - lift];
  const u = x - 265, v = y - 266;
  return [270 + 0.97 * u + 0.14 * v, 270 + 0.90 * v - lift];
}

/** The angle (degrees) a label has to turn to run along the east road. */
export function roadAngle(road, view = getCampusView()) {
  const [a, b] = [road[0], road[road.length - 1]].map(p => project(p[0], p[1], 0, view));
  return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
}

/** The part of the canvas the Discover tile frames, per view. */
export function previewView(view = getCampusView()) {
  return isTilted(view) ? [17, 98, 506, 344] : [5, 94, 506, 344];
}
