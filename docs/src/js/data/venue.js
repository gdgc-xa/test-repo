/* ============================================================
   data/venue.js — the org-fair venue: the quad, its tents, and
   which organisation stands where.
   Pure data. No DOM. Coordinates are in the map's own viewBox
   units (see VENUE.viewBox), not pixels.

   Two kinds of placement, because the printed map gives two:
     · TENT — a numbered tent (1A…9A, 1B…4B). An exact spot.
     · ZONE — a colour block with no tent number (the college
              groupings). We can point at the block, not a tent.

   Orgs in neither are simply not placed yet; the booth says so
   rather than guessing.
   ============================================================ */

export const VENUE = {
  viewBox: '0 0 960 720',
  field: { x: 120, y: 90, w: 720, h: 520 },
  stage: { x: 430, y: 108, w: 130, h: 56 },

  /* The three marquee tents in the middle of the quad. */
  circles: [
    { cx: 300, cy: 300, r: 84 },
    { cx: 600, cy: 300, r: 84 },
    { cx: 440, cy: 462, r: 84 },
  ],

  /* Buildings ringing the quad — the orientation anchors. */
  buildings: [
    { label: 'SBM Building',        x: 300, y: 32,  w: 340, h: 40, dir: 'h' },
    { label: 'Loyola and Haggerty', x: 280, y: 640, w: 380, h: 40, dir: 'h' },
    { label: 'Chapel',              x: 44,  y: 200, w: 40,  h: 340, dir: 'v' },
    { label: 'Eng Building',        x: 876, y: 180, w: 40,  h: 200, dir: 'v' },
    { label: 'Faber',               x: 876, y: 420, w: 40,  h: 190, dir: 'v' },
  ],

  /* Every square on the map. `id` is set only where the printed
     map numbers the tent; the rest are zone blocks. */
  squares: [
    // north edge, west of the stage
    { id: '1A', zone: 'media',        x: 172, y: 108 },
    { id: '2A', zone: 'media',        x: 206, y: 108 },
    { zone: 'tech',                   x: 276, y: 108 },
    { zone: 'tech',                   x: 330, y: 108 },
    // north edge, east of the stage
    { zone: 'tech',                   x: 588, y: 108 },
    { id: '3A', zone: 'csg-aeco',     x: 640, y: 108 },
    { zone: 'engineering',            x: 716, y: 108 },
    { zone: 'engineering',            x: 750, y: 108 },
    { zone: 'engineering',            x: 784, y: 108 },

    // west edge (Chapel side)
    { id: '4B', zone: 'sports',       x: 130, y: 248 },
    { id: '8A', zone: 'faith',        x: 130, y: 318 },
    { id: '3B', zone: 'service',      x: 130, y: 388 },
    { id: '2B', zone: 'service',      x: 130, y: 422 },
    { id: '1B', zone: 'service',      x: 130, y: 456 },
    { zone: 'environment',            x: 130, y: 490 },
    { id: '9A', zone: 'socio',        x: 130, y: 524 },
    { id: '7A', zone: 'sci-eng-tech', x: 130, y: 578 },

    // east edge (Eng Building / Faber side)
    { zone: 'cas',      x: 798, y: 228 },
    { zone: 'cas',      x: 798, y: 262 },
    { zone: 'cas',      x: 798, y: 296 },
    { zone: 'aggies',   x: 798, y: 368 },
    { zone: 'aggies',   x: 798, y: 402 },
    { zone: 'aggies',   x: 798, y: 436 },
    { zone: 'sbm',      x: 798, y: 500 },
    { zone: 'sbm',      x: 798, y: 534 },

    // south edge (Loyola and Haggerty side)
    { id: '6A', zone: 'media', x: 186, y: 566 },
    { id: '5A', zone: 'media', x: 220, y: 566 },
    { id: '4A', zone: 'media', x: 254, y: 566 },
    { zone: 'soe',      x: 556, y: 566 },
    { zone: 'soe',      x: 590, y: 566 },
    { zone: 'compstud', x: 646, y: 566 },
    { zone: 'compstud', x: 680, y: 566 },
    { zone: 'nursing',  x: 736, y: 566 },
  ],

  /* Legend label + plain-language position for each colour block. */
  zones: {
    'tech':         { label: 'Tech booth & carts',      where: 'flanking the stage' },
    'csg-aeco':     { label: 'CSG & AECO',              where: 'north edge, just east of the stage' },
    'media':        { label: 'Media and Arts',          where: 'north-west corner and along the south edge' },
    'engineering':  { label: 'Engineering',             where: 'north-east corner, by the Eng Building' },
    'cas':          { label: 'CAS',                     where: 'east edge, upper half by the Eng Building' },
    'aggies':       { label: 'Aggies',                  where: 'east edge, middle of the quad' },
    'sbm':          { label: 'SBM',                     where: 'east edge, lower half by Faber' },
    'nursing':      { label: 'Nursing',                 where: 'south edge, east end' },
    'compstud':     { label: 'CompStud',                where: 'south edge, east of centre' },
    'soe':          { label: 'SOE',                     where: 'south edge, centre' },
    'sports':       { label: 'Sports & Recreation',     where: 'west edge, top — nearest the Chapel' },
    'service':      { label: 'Service-Learning',        where: 'west edge, middle — Chapel side' },
    'faith':        { label: 'Faith Formation',         where: 'west edge, upper — Chapel side' },
    'socio':        { label: 'Socio-Cultural Relations',where: 'west edge, lower — Chapel side' },
    'environment':  { label: 'Environment',             where: 'west edge, mid-lower — Chapel side' },
    'sci-eng-tech': { label: 'Natural Sciences, Engineering & Technology', where: 'west edge, bottom — Chapel side' },
  },
};

/* Plain-language position for each numbered tent. */
export const TENT_WHERE = {
  '1A': 'north edge, west of the stage',
  '2A': 'north edge, west of the stage',
  '3A': 'north edge, just east of the stage',
  '4A': 'south edge, toward Loyola and Haggerty',
  '5A': 'south edge, toward Loyola and Haggerty',
  '6A': 'south edge, toward Loyola and Haggerty',
  '7A': 'west edge, bottom — Chapel side',
  '8A': 'west edge, upper — Chapel side',
  '9A': 'west edge, lower — Chapel side',
  '1B': 'west edge, middle — Chapel side',
  '2B': 'west edge, middle — Chapel side',
  '3B': 'west edge, middle — Chapel side',
  '4B': 'west edge, top — nearest the Chapel',
};

/* Who shares each numbered tent, in the order the printed map
   lists them. Entries that are not roster ids are kept as plain
   names so a student still sees who else is at that tent. */
export const TENT_ORGS = {
  '1A': ['xu-band', 'cda'],
  '2A': ['xuadcpdc', 'crupub'],
  '3A': ['aeco', 'csg'],
  '4A': ['xp', 'st'],
  '5A': ['txs', 'xugc'],
  '6A': ['xafs', 'xucdt'],
  '7A': ['xu-xceed', 'gdgoc-xa'],
  '8A': ['siraj-mro', 'xu-rcy'],
  '9A': ['AECO Kazoku', 'ATTG', 'Forerunners'],
  '1B': ['xu-ams', 'arc'],
  '2B': ['axuos', 'scholars-guild'],
  '3B': ['xadso', 'da'],
  '4B': ['bullriders', 'xu-jka'],
};

/* Orgs with no tent number, placed by their college colour block. */
const ZONED = {
  engineering: ['aces', 'jpsme', 'jiecep', 'iiee', 'jpiche', 'pice', 'piie'],
  cas:         ['unitass', 'biophilic', 'chemsoc', 'ecosoc', 'apc', 'adc', 'xups', 'osas', 'devcomsoc'],
  aggies:      ['asc', 'aac', 'across', 'jpsas', 'paft', 'psae', 'paa-jrs'],
  sbm:         ['sbmsc', 'jpia', 'jma', 'jfinex', 'xu-jpama'],
  soe:         ['tg', 'xased', 'xuselics', 'spedsoc', 'xu-huge'],
  compstud:    ['cssc', 'xcel', 'aissa', 'xu-xcites', 'gems'],
  nursing:     ['conus'],
  environment: ['nc'],
  faith:       ['chapel-aides', 'cya'],
  sports:      ['rodeo'],
};

/* org id -> placement. Built once, at module load. */
export const ORG_LOCATION = {};
for (const [tent, ids] of Object.entries(TENT_ORGS)) {
  for (const id of ids) {
    if (/^[a-z0-9-]+$/.test(id)) ORG_LOCATION[id] = { tent };
  }
}
for (const [zone, ids] of Object.entries(ZONED)) {
  for (const id of ids) ORG_LOCATION[id] = { zone };
}

/**
 * locationOf(orgId) → placement descriptor.
 *   { kind: 'tent', tent, zone, label, where, sharedWith[] }
 *   { kind: 'zone', zone, label, where, sharedWith: [] }
 *   { kind: 'none' }
 */
export function locationOf(orgId) {
  const loc = ORG_LOCATION[orgId];
  if (!loc) return { kind: 'none' };

  if (loc.tent) {
    const square = VENUE.squares.find(s => s.id === loc.tent);
    return {
      kind: 'tent',
      tent: loc.tent,
      zone: square ? square.zone : null,
      label: 'Tent ' + loc.tent,
      where: TENT_WHERE[loc.tent] || '',
      sharedWith: (TENT_ORGS[loc.tent] || []).filter(x => x !== orgId),
    };
  }

  const z = VENUE.zones[loc.zone] || {};
  return {
    kind: 'zone',
    zone: loc.zone,
    label: z.label || loc.zone,
    where: z.where || '',
    sharedWith: [],
  };
}
