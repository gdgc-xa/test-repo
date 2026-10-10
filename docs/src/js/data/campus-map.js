/* ============================================================
   data/campus-map.js — the Xavier University main campus, drawn.
   Pure data. No DOM.

   Ported from the TXC campus map (txc-map, data/campus-layout.ts
   and components/map/SchematicCampusMap.tsx). The drawing follows
   the university's 11282023.Web.Campus_Map.jpg: field on the left,
   covered court below it, gym lower right. Shapes are illustrative,
   not surveyed — positions are in the drawing's own units, not GPS.

   Which buildings are Xavier Cup venues, what is played where and
   the icon spots are NOT in here: they live with the fixtures in
   data/xavier-cup.js → CUP_MAP, so the people editing the schedule
   never need to open this file.

   The 3D view reads CAMPUS_GEO at the bottom (real coordinates).
   ============================================================ */

/* The drawing's viewBox is `0 ${top} ${width} ${height}`. */
export const CAMPUS_DRAWING = { width: 560, height: 310, top: 110 };

/* The campus boundary. */
export const CAMPUS_OUTLINE =
  '16,198 150,173 285,151 359,142 476,143 542,398 450,376 430,354 319,302 258,365 214,346 154,287 137,250 73,295 25,244';

/* Corrales Avenue, down the east side. */
export const CAMPUS_ROAD = {
  d: 'M 492 160 L 551 390',
  label: { text: 'CORRALES AVENUE', x: 532, y: 245, rotate: 75 },
};

/* Pedestrian corridors, following the gaps between buildings. */
export const CAMPUS_WALKWAYS = [
  { d: 'M 490 231 H 382 L 380 247 H 296 L 291 184', width: 9 },
  { d: 'M 293 248 L 153 252 L 145 202 M 151 251 L 202 296', width: 6 },
  { d: 'M 322 249 V 288 L 397 316 L 431 359', width: 7 },
  { d: 'M 387 239 L 389 278 L 500 278 M 77 289 L 145 249', width: 6 },
  { d: 'M 160 283 L 257 283 L 262 295', width: 5 },
];

/* ------------------------------------------------------------
   Buildings.
   id      stable — CUP_MAP venues point at these
   lines   the label, one string per line ([] = no label)
   points  the footprint polygon
   center  where the label sits
   kind    field | court | gym | church — coloured, not roofed
   small   true → a smaller label, for the tight footprints
   ------------------------------------------------------------ */
export const CAMPUS_FOOTPRINTS = [
  { id: 'xu-old-library', name: 'Library Annex', lines: ['LIBRARY', 'ANNEX'], points: '447,183 492,183 496,211 447,211', center: [471, 197] },
  { id: 'xu-new-library', name: 'Main Library', lines: ['MAIN LIBRARY'], points: '380,202 438,202 438,224 380,224', center: [409, 213] },
  { id: 'museo-de-oro', name: 'Museo de Oro', lines: ['MUSEO', 'DE ORO'], points: '430,148 461,148 466,175 430,175', center: [447, 162] },
  { id: 'xavier-hall', name: 'Xavier Hall', lines: ['XAVIER', 'HALL'], points: '388,161 424,161 429,195 388,195', center: [407, 179] },
  { id: 'lucas-hall', name: 'Lucas Hall', lines: ['LUCAS HALL'], points: '345,146 386,146 386,161 345,161', center: [365, 154] },
  { id: 'campion-hall', name: 'Campion Hall', lines: ['CAMPION', 'HALL'], points: '313,166 375,166 375,195 313,195', center: [344, 181] },
  { id: 'university-church', name: 'University Church', lines: ['UNIVERSITY CHURCH'], points: '304,220 363,220 371,227 371,244 304,244', center: [336, 232], kind: 'church' },
  { id: 'loyola-house', name: 'Loyola House', lines: ['LOYOLA HOUSE'], points: '245,160 312,160 312,176 245,176', center: [279, 168] },
  { id: 'haggerty-house', name: 'Haggerty House', lines: ['HAGGERTY'], points: '206,165 237,165 237,178 206,178', center: [222, 172] },
  { id: 'soccer-field', name: 'Soccer Field', lines: [], points: '174,186 282,183 282,252 160,252', center: [224, 218], kind: 'field' },
  { id: 'amphitheater', name: 'Amphitheater', lines: ['AMPHI-', 'THEATER'], points: '129,174 151,174 151,198 129,198', center: [140, 187] },
  { id: 'faber-hall', name: 'Faber Hall', lines: ['FABER'], points: '93,181 127,181 127,199 93,199', center: [110, 190] },
  { id: 'medicine-building', name: 'Medicine Building', lines: ['MEDICINE'], points: '23,199 58,199 58,234 23,234', center: [41, 216] },
  { id: 'engineering-building', name: 'Engineering Building', lines: ['ENGINEERING'], points: '62,219 142,219 142,244 62,244', center: [102, 232] },
  { id: 'religious-of-the-assumption', name: 'Religious of the Assumption', lines: ['R. OF THE', 'ASSUMPTION'], points: '47,249 64,244 73,262 55,272', center: [60, 257], small: true },
  { id: 'engineering-annex', name: 'Engineering Annex', lines: ['ENG. ANNEX'], points: '78,248 106,250 93,279 71,276', center: [87, 264] },
  { id: 'physical-plant-workshop', name: 'Physical Plant Workshop', lines: ['WORKSHOP'], points: '146,282 157,279 175,302 165,311', center: [160, 295], small: true },
  { id: 'physical-plant-offices', name: 'Physical Plant Office', lines: ['PLANT', 'OFFICE'], points: '169,310 178,305 194,325 185,334', center: [180, 320], small: true },
  { id: 'sbm-building', name: 'SBM Building', lines: ['SBM BUILDING'], points: '164,258 251,258 251,277 158,277', center: [207, 268] },
  { id: 'covered-court', name: 'Covered Court', lines: [], points: '207,314 235,286 278,320 248,353', center: [241, 319], kind: 'court' },
  { id: 'social-science-building', name: 'Social Science Building', lines: ['SOCIAL', 'SCIENCE'], points: '263,257 292,257 292,286 263,286', center: [278, 272] },
  { id: 'little-theater', name: 'Little Theater', lines: ['LITTLE', 'THEATER'], points: '296,256 324,256 324,285 296,285', center: [310, 271] },
  { id: 'student-center', name: 'STC Building', lines: ['STC BUILDING'], points: '335,286 389,286 395,311 335,311', center: [363, 299] },
  { id: 'magis-building', name: 'Magis Building (Canteen)', lines: ['MAGIS'], points: '354,264 382,264 384,281 354,281', center: [369, 273] },
  { id: 'sped-lab', name: 'SPED Lab', lines: ['SPED'], points: '414,336 435,336 438,352 416,352', center: [426, 344] },
  { id: 'xu-gym', name: 'University Gym', lines: [], points: '441,311 510,311 529,369 446,369 432,354', center: [481, 342], kind: 'gym' },
  { id: 'agriculture-building', name: 'Agriculture Building', lines: ['AGRICULTURE'], points: '413,282 497,282 502,304 413,304', center: [457, 293] },
  { id: 'science-center', name: 'Science Center Building', lines: ['SCIENCE CENTER'], points: '398,250 478,250 482,271 398,271', center: [440, 261] },
  { id: 'sec-mall', name: 'SEP Mall', lines: ['SEP'], points: '483,251 497,251 502,273 483,273', center: [491, 263] },
];

/* Court and pitch markings, drawn over the three sports footprints.
   `stripes` marks the polygon that gets the mown-grass pattern. */
export const CAMPUS_MARKINGS = {
  stripes: '174,186 282,183 282,252 160,252',
  lines: [
    // Soccer Field: touchlines, halfway line, centre circle, boxes
    { d: 'M 179 191 L 276 189 L 276 246 L 168 246 Z M 222 190 V 246' },
    { d: 'M 211 218 a 11 11 0 1 0 22 0 a 11 11 0 1 0 -22 0' },
    { d: 'M 174 207 H 190 V 232 H 171 M 276 205 H 258 V 232 H 276' },
    { d: 'M 177 212 H 183 V 226 H 174 M 276 211 H 267 V 226 H 276' },
    // Covered Court: a volleyball court turned with the building
    { d: 'M -23 -18 H 23 V 18 H -23 Z M 0 -18 V 18 M -8 -18 V 18 M 8 -18 V 18', transform: 'translate(241 319) rotate(39)' },
    // University Gym: a basketball court
    { d: 'M 449 317 H 504 L 518 362 H 449 Z M 480 317 V 362' },
    { d: 'M 474 340 a 8 9 0 1 0 16 0 a 8 9 0 1 0 -16 0' },
    { d: 'M 449 329 H 460 V 350 H 449 M 507 329 H 496 V 350 H 514' },
  ],
};

/* Gates and other things you navigate by that are not buildings.
   `tick` is the short bar drawn at the gate itself. */
export const CAMPUS_LANDMARKS = [
  { text: 'MAIN GATE', x: 493, y: 244, size: 4, tick: 'M 481 227 L 493 227 M 481 235 L 495 235' },
  { text: 'COVERED WALK', x: 464, y: 231, size: 3 },
  { text: 'MORTOLA GATE 2', x: 35, y: 190, size: 3.5, tick: 'M 20 227 L 24 236' },
  { text: 'MORTOLA GATE 1', x: 73, y: 302, size: 3.5, tick: 'M 66 286 L 72 293' },
];

/* ------------------------------------------------------------
   The real campus, for the 3D view (Mapbox).
   Coordinates are [longitude, latitude].
   ------------------------------------------------------------ */
export const CAMPUS_GEO = {
  center: [124.6469, 8.4766],
  // Campus box with ~80 m of slack so edge buildings fit on a phone
  bounds: [[124.6437, 8.4738], [124.6503, 8.4795]],
  minZoom: 16.2,
  maxZoom: 19.5,
  view: { zoom: 17.5, pitch: 55, bearing: -22 },
  // Below this zoom the sport labels hide so markers don't collide
  labelZoom: 17,

  // Campus boundary from OpenStreetMap way 141597395 (closed ring)
  boundary: [
    [124.647338, 8.477064], [124.646781, 8.477657], [124.646734, 8.477691],
    [124.646699, 8.477721], [124.646561, 8.477763], [124.646404, 8.477812],
    [124.646243, 8.477821], [124.645973, 8.476674], [124.645808, 8.475791],
    [124.646540, 8.475596], [124.646626, 8.475574], [124.646801, 8.475537],
    [124.647102, 8.475523], [124.647894, 8.475495], [124.648275, 8.475511],
    [124.649372, 8.475571], [124.649397, 8.475596], [124.649412, 8.475662],
    [124.649402, 8.475718], [124.648948, 8.476548], [124.648680, 8.476328],
    [124.648293, 8.477053], [124.648143, 8.476957], [124.647945, 8.477216],
    [124.647679, 8.477446], [124.647338, 8.477064],
  ],
};
