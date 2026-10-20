import './old-venues-setup.mjs';   // these tests describe the old map; venue-plan.test.mjs covers the new one
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SPORT_ICON_ASSETS, sportIconFor } from '../docs/src/js/data/sport-icons.js';
import { GAMES, SPORTS, allSports, cupNow } from '../docs/src/js/data/xavier-cup.js';
import { sportIcon, venueIcons, venueStats, sportMarkerHtml, cupMapHtml } from '../docs/src/js/components/cup-map.js';
import { resolveGame } from '../docs/src/js/components/game-card.js';
import { matchCardHtml } from '../docs/src/js/components/match-card.js';
import { offCampusHtml } from '../docs/src/js/components/cup-off-campus.js';
import { CUP_MAP, VENUE_BY_ID } from '../docs/src/js/data/xavier-cup.js';

test('every prepared WebP asset is mapped and points at an actual WebP image', () => {
  const mapped = Object.values(SPORT_ICON_ASSETS);
  const files = readdirSync(new URL('../docs/assets/sports/', import.meta.url)).filter(n=>n.endsWith('.webp'));
  assert.deepEqual(mapped.map(p=>p.split('/').at(-1)).sort(),files.sort());
  for (const [id,path] of Object.entries(SPORT_ICON_ASSETS)) {
    assert.equal(sportIconFor(id),path);
    const data=readFileSync(new URL(`../docs/${path}`,import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF'); assert.equal(data.toString('ascii',8,12),'WEBP');
  }
});
test('tracker and source spelling variations use the correct distinct sport artwork', () => {
  for(const name of ['Basketball3x3','Basketball 3x3','Basketball 3×3','3x3 Basketball'])
    assert.equal(sportIcon(name),SPORT_ICON_ASSETS['basketball-3x3']);
  assert.notEqual(sportIcon('Basketball'),sportIcon('Basketball3x3'));
  for(const [name,id] of [['ESports Dota','dota-2'],['E-Sports DOTA','dota-2'],['Dota 2','dota-2'],
    ['ESports MLBB','mobile-legends'],['Mobile Legends','mobile-legends'],['ESports Valorant','valorant'],
    ['E-Sports CODM','call-of-duty-mobile'],['Lawn Tennis','lawn-tennis'],['Table Tennis','table-tennis'],
    ['Sepak Takraw','sepak-takraw'],['MEGACREWW','megacrew'],['  vOlLeYbAlL  ','volleyball']])
    assert.equal(sportIcon(name),SPORT_ICON_ASSETS[id],name);
  for(const name of ['ESports COD','COD','Taekwondo','Banner Raising',null,'Unknown sport']) assert.equal(sportIcon(name),null);
});
test('new images reach markers, cards, mini maps and automatic sport entries without changing venue data', () => {
  const originalGames=GAMES.length,originalSports=SPORTS.length;
  const source={id:'test-3x3',sport:'Basketball3x3',venue:'xu-gym',teams:['ccs','eng'],start:'2026-10-12T16:00',status:'upcoming'};
  GAMES.push(source);
  try {
    const game=resolveGame(source,cupNow());
    assert.equal(allSports().filter(s=>s.name==='Basketball3x3').length,1);
    assert.equal(allSports().find(s=>s.name==='Basketball3x3').icon,SPORT_ICON_ASSETS['basketball-3x3']);
    assert.equal(SPORTS.length,originalSports);
    assert.equal(game.venueId,'xu-gym'); assert.ok(!VENUE_BY_ID['xu-gym'].icons.Basketball3x3);
    const marker=venueIcons(game.venue,venueStats([game])['xu-gym'])[0];
    assert.match(sportMarkerHtml(game.venue,marker),/basketball-3x3.webp/);
    assert.match(matchCardHtml(game),/basketball-3x3.webp/);
    assert.match(cupMapHtml({}, {selected:'xu-gym',sport:'Basketball3x3'}),/basketball-3x3.webp/);
  } finally { GAMES.splice(originalGames); }
});
test('outside games use sport artwork independently of their venue', () => {
  const venue={id:'test-esports',name:'Test external venue',venueType:'off-campus'};
  CUP_MAP.venues.push(venue); VENUE_BY_ID[venue.id]=venue;
  try {
    const game=resolveGame({id:'test-dota',sport:'ESports Dota',venue:venue.id,teams:['ccs','eng'],
      start:'2026-10-12T15:00',status:'ongoing'},cupNow());
    assert.match(offCampusHtml([game],{now:cupNow()}),/dota-2.webp/);
    assert.equal(game.venueId,venue.id);
  } finally { CUP_MAP.venues.pop(); delete VENUE_BY_ID[venue.id]; }
});

test('automatic Basketball 3x3 marker stays clear of Basketball and matches the mini map position', () => {
  const venue=VENUE_BY_ID['xu-gym'];
  const both=venueIcons(venue,{sports:{Basketball:{total:1},Basketball3x3:{total:1}}});
  const basketball=both.find(i=>i.sport==='Basketball'),three=both.find(i=>i.sport==='Basketball3x3');
  assert.ok(Math.hypot(three.at[0]-basketball.at[0],three.at[1]-basketball.at[1])>=24);
  assert.deepEqual(venueIcons(venue,{sports:{Basketball3x3:{total:1}}})[0].at,three.at);
  const mini=cupMapHtml({}, {selected:venue.id,sport:'Basketball3x3'});
  assert.ok(mini.includes(`x="${three.at[0]-21}" y="${three.at[1]-21}"`));
});
