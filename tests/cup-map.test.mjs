import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCamera, minScale, MAX_SCALE, constrainCamera, worldAt, zoomAt, pinchCamera, panBy } from '../docs/src/js/lib/cup-map-camera.js';
import { isOffCampus, hasCampusPoint, validGps, googleMapsUrl } from '../docs/src/js/lib/cup-map-locations.js';
import { CUP_MAP, VENUE_BY_ID, cupNow } from '../docs/src/js/data/xavier-cup.js';
import { venueStats, venueIcons } from '../docs/src/js/components/cup-map.js';
import { offCampusHtml } from '../docs/src/js/components/cup-off-campus.js';
import { resolveGame } from '../docs/src/js/components/game-card.js';
import { gameDetailHtml } from '../docs/src/js/components/game-detail.js';
const size = { width: 390, height: 560 };
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);

test('mobile starts readable; overview recenters and zoom remains bounded', () => {
  const camera = initialCamera(size);
  assert.ok(camera.scale >= 2.4);
  assert.ok(560 * camera.scale > size.width);
  const overview = constrainCamera({ x: 10, y: 10, scale: 0 }, size);
  assert.deepEqual(overview, { x: 280, y: 155, scale: minScale(size) });
  assert.equal(constrainCamera({ x: -1000, y: 900, scale: 900 }, size).scale, MAX_SCALE);
  assert.deepEqual(panBy(camera, size, 1e6, -1e6), { x: 0, y: 310, scale: camera.scale });
});
test('wheel/pinch keep the touched world point beneath the moving midpoint', () => {
  const camera = initialCamera(size), anchor = { x: 100, y: 160 };
  const before = worldAt(camera,size,anchor);
  const after = worldAt(zoomAt(camera,size,3.7,anchor),size,anchor);
  near(before.x,after.x); near(before.y,after.y);
  const nextMid = { x: 145, y: 210 };
  const pinched = worldAt(pinchCamera(camera,size,anchor,nextMid,1.4),size,nextMid);
  near(before.x,pinched.x); near(before.y,pinched.y);
});
test('outside venues need no schematic coordinates; Google links use latitude first', () => {
  const venue = { venueType: 'off-campus', gps: [124.65, 8.48] };
  assert.ok(isOffCampus(venue)); assert.ok(!hasCampusPoint(venue));
  assert.equal(new URL(googleMapsUrl(venue)).searchParams.get('query'), '8.48,124.65');
  for (const gps of [null, [], ['124.65',8.48], [181,8], [124,91], [NaN,0], [0,Infinity]]) {
    assert.ok(!validGps(gps)); assert.equal(googleMapsUrl({gps}), '');
  }
});
test('outside panel uses existing statuses, shows ongoing and today upcoming, and avoids false campus mini maps', () => {
  const venue = { id: 'test-outside', name: 'Test venue <script>', venueType: 'off-campus', address: 'A & B' };
  CUP_MAP.venues.push(venue); VENUE_BY_ID[venue.id] = venue;
  try {
    const game = (id,status,start) => ({ id, sport:'Soccer', venue:venue.id, teams:['ccs','eng'], start, status });
    const now = new Date(2026,9,12,15,30);
    const games = [game('live','ongoing','2026-10-11T10:00'), game('today','upcoming','2026-10-12T16:00'),
      game('tomorrow','upcoming','2026-10-13T10:00'), game('result','finished','2026-10-12T12:00')].map(g=>resolveGame(g,now));
    const html = offCampusHtml(games,{now});
    assert.match(html,/data-game-id="live"/); assert.match(html,/data-game-id="today"/);
    assert.doesNotMatch(html,/data-game-id="tomorrow"|data-game-id="result"/);
    assert.match(html,/Test venue &lt;script&gt;/);
    assert.doesNotMatch(html,/google.com/);
    const stats = venueStats(games);
    assert.equal(venueIcons(venue,stats[venue.id])[0].sport,'Soccer');
    assert.doesNotMatch(gameDetailHtml(games[0]),/cup-map-mini/);
    assert.match(gameDetailHtml(games[0]),/Outside campus/);
  } finally { CUP_MAP.venues.pop(); delete VENUE_BY_ID[venue.id]; }
});
test('existing campus interactions and explicit status precedence remain', () => {
  assert.equal(CUP_MAP.venues.length,3);
  assert.ok(CUP_MAP.venues.every(hasCampusPoint));
  const g=resolveGame({id:'campus',venue:'soccer-field',sport:'Soccer',teams:['ccs','eng'],
    start:'2026-10-10T09:00',end:'2026-10-10T10:00',status:'ongoing'},cupNow());
  assert.equal(g.status,'ongoing');
  assert.match(gameDetailHtml(g),/cup-map-mini/);
  assert.equal(venueStats([g])['soccer-field'].ongoing,1);
});
