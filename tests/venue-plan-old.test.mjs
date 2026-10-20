import './old-venues-setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUP_MAP, CUP_LIVE, UNPLACED_SPORTS, planActive } from '../docs/src/js/data/xavier-cup.js';
import { venueIcons } from '../docs/src/js/components/cup-map.js';
import { applyVenuePlan } from '../docs/src/js/lib/venue-plan.js';

test('?venues=old brings back the old map: three campus venues and nothing planned', () => {
  assert.equal(planActive, false);
  assert.deepEqual(CUP_MAP.venues.map(v => v.id), ['soccer-field', 'covered-court', 'xu-gym']);
  assert.deepEqual(UNPLACED_SPORTS, []);
  assert.deepEqual(venueIcons(CUP_MAP.venues[2], undefined), []);   // an icon only where a fixture exists
  assert.equal(Object.keys(CUP_LIVE.venues).length, 3);
});

test('the old version does not override the tracker', () => {
  const game = { sport: 'Megacrew', venue: 'soccer-field', place: 'Field (Pitch 1)' };
  assert.deepEqual(applyVenuePlan(game), game);
  assert.deepEqual(applyVenuePlan({ sport: 'Badminton', venue: null, place: '' }), { sport: 'Badminton', venue: null, place: '' });
});
