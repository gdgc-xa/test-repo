import test from 'node:test';
import assert from 'node:assert/strict';
import { CUP_MAP, CUP_LIVE, CUP_VENUE_PLAN, UNPLACED_SPORTS, planActive } from '../docs/src/js/data/xavier-cup.js';
import { venueIcons } from '../docs/src/js/components/cup-map.js';
import { applyVenuePlan, plannedVenueFor } from '../docs/src/js/lib/venue-plan.js';
import { isOffCampus, hasCampusPoint } from '../docs/src/js/lib/cup-map-locations.js';
import { project } from '../docs/src/js/lib/campus-view.js';

const venue = id => CUP_MAP.venues.find(v => v.id === id);

test('the new plan is the version that shows', () => {
  assert.equal(CUP_VENUE_PLAN.version, 'new');
  assert.ok(planActive);
});

test('every sport on the list sits at its venue on the map with no games booked', () => {
  const expected = {
    'covered-court': ['Badminton', 'Sepak Takraw', 'Table Tennis', 'Volleyball'],
    'xu-gym': ['Basketball', 'Karatedo', 'Taekwondo', 'Darts', 'Cheerdance', 'Megacrew'],
    'soccer-field': ['Football', 'Softball', 'Ultimate Frisbee'],
    'library-annex': ['Chess'],
    'xu-uptown-sports-centre': ['Athletics', 'Swimming'],
    homecourt: ['Pickleball'],
    'virtual-grounds': ['Esports'],
  };
  for (const [id, sports] of Object.entries(expected)) {
    const shown = venueIcons(venue(id), undefined).map(i => i.sport).sort();
    assert.deepEqual(shown, [...sports].sort(), id);
  }
  assert.deepEqual(UNPLACED_SPORTS, ['Lawn Tennis', 'Debate']);
});

test('outside and online venues carry no map spot, campus ones do', () => {
  for (const id of ['xu-uptown-sports-centre', 'homecourt', 'virtual-grounds']) {
    assert.ok(isOffCampus(venue(id)) && !hasCampusPoint(venue(id)), id);
  }
  for (const id of ['soccer-field', 'covered-court', 'xu-gym', 'library-annex']) assert.ok(hasCampusPoint(venue(id)), id);
});

test('automatic icons stay apart, inside the drawing, in the flat and 3D views', () => {
  for (const id of ['covered-court', 'xu-gym', 'soccer-field', 'library-annex']) {
    const icons = venueIcons(venue(id), undefined);
    for (const view of ['flat', '3d']) {
      const pts = icons.map(i => project(i.at[0], i.at[1], 0, view));
      for (const [x, y] of pts) assert.ok(x > 10 && x < 550 && y > 112 && y < 420, `${id} ${view} icon out of frame`);
      for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
        assert.ok(Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) >= 20, `${id}: icons ${a}/${b} overlap`);
      }
    }
  }
});

test('Taekwondo is marked to be confirmed and Esports names its finals', () => {
  assert.equal(venue('xu-gym').plan.find(p => p.sport === 'Taekwondo').tentative, true);
  assert.match(venue('virtual-grounds').plan[0].note, /ML and CODM finals/);
});

test('the tracker: Mega Crew is overridden to the Gym, whatever the sheet says', () => {
  for (const [venueId, place] of [['soccer-field', 'Field (Pitch 1)'], [null, 'Somewhere else'], [null, '']]) {
    const g = applyVenuePlan({ sport: 'Megacrew', venue: venueId, place });
    assert.equal(g.venue, 'xu-gym');
    assert.equal(g.place, 'Gym');
    assert.equal(g.note, 'Sat · Gym');
  }
});

test('the tracker: a row with no venue goes to its sport\'s planned venue; a written venue is left alone', () => {
  assert.equal(applyVenuePlan({ sport: 'Badminton', venue: null, place: '' }).venue, 'covered-court');
  assert.equal(applyVenuePlan({ sport: 'Badminton', venue: null, place: 'Cebu Coliseum' }).venue, null);
  assert.equal(applyVenuePlan({ sport: 'Basketball', venue: 'covered-court', place: 'Covered Court' }).venue, 'covered-court');
  assert.equal(applyVenuePlan({ sport: 'Debate', venue: null, place: '' }).venue, null);
  assert.equal(plannedVenueFor('Pickleball'), 'homecourt');
});

test('the sheet\'s spellings of the new venues reach the tracker', () => {
  const all = Object.entries(CUP_LIVE.venues).flatMap(([id, names]) => names.map(n => [n.toLowerCase(), id]));
  const idOf = name => all.find(([n]) => n === name.toLowerCase())?.[1];
  assert.equal(idOf('Coverd Courts'), 'covered-court');
  assert.equal(idOf('XU Field'), 'soccer-field');
  assert.equal(idOf('XU Uptown Sports Centre'), 'xu-uptown-sports-centre');
  assert.equal(idOf('Virtual Grounds'), 'virtual-grounds');
  assert.equal(idOf('Homecourt'), 'homecourt');
  assert.equal(CUP_LIVE.sports['Mega Crew'].sport, 'Megacrew');
});
