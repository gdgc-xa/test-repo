import test from 'node:test';
import assert from 'node:assert/strict';
import { project, getCampusView, setCampusView, roadAngle, isRaised } from '../docs/src/js/lib/campus-view.js';
import { CAMPUS_FOOTPRINTS, CAMPUS_ROAD, CAMPUS_VIEW } from '../docs/src/js/data/campus-map.js';
import { CUP_MAP } from '../docs/src/js/data/xavier-cup.js';

test('the flat view leaves every point where it was drawn', () => {
  assert.equal(getCampusView(), CAMPUS_VIEW.default);
  assert.deepEqual(project(120, 200, 8), CAMPUS_VIEW.slant ? project(120, 200, 8, 'flat') : [120, 200]);
});

test('3D lifts a point by its building height and flat does not', () => {
  const [, flatY] = project(463, 366, 8, 'flat');
  const [, upY] = project(463, 366, 8, '3d');
  const [, groundY] = project(463, 366, 0, '3d');
  assert.equal(groundY - upY, 8);
  assert.ok(isRaised('3d') && !isRaised('flat'));
  assert.ok(Number.isFinite(flatY));
});

test('every pin of a campus venue stays inside the drawing in both views', () => {
  const heights = Object.fromEntries(CAMPUS_FOOTPRINTS.map(f => [f.id, f.h || 0]));
  for (const venue of CUP_MAP.venues.filter(v => v.label)) {
    const h = heights[venue.footprint || venue.id] || 0;
    const spots = [venue.label, ...Object.values(venue.icons || {}).map(i => i.at).filter(Boolean)];
    for (const view of ['flat', '3d']) for (const [x, y] of spots) {
      const [px, py] = project(x, y, h, view);
      assert.ok(px > 0 && px < 560 && py > 110 && py < 420, `${venue.id} ${view} pin out of frame`);
    }
  }
});

test('the road label runs along the road in each view', () => {
  const pts = CAMPUS_ROAD.pts.split(' ').map(p => p.split(',').map(Number));
  assert.equal(Math.round(roadAngle(pts, 'flat') * 10) / 10, CAMPUS_VIEW.slant ? roadAngle(pts, 'flat') : 90);
  assert.ok(roadAngle(pts, '3d') < 90 && roadAngle(pts, '3d') > 70);
});

test('setCampusView ignores unknown views and tells listeners about a change', () => {
  const seen = [];
  globalThis.addEventListener = globalThis.addEventListener || (() => {});
  globalThis.dispatchEvent = e => seen.push(e.detail);
  setCampusView('sideways');
  assert.equal(getCampusView(), CAMPUS_VIEW.default);
  setCampusView('3d');
  assert.equal(getCampusView(), '3d');
  assert.deepEqual(seen, ['3d']);
});
