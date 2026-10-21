/* ============================================================
   data/campus-map.js — the Xavier University main campus, drawn.
   Pure data. No DOM.

   Redrawn FLAT: every building is a straight, true-to-scale
   footprint taken from the university's flat campus plan (the
   "Cautious Return on Campus" layout), not the old tilted
   perspective sketch. The plan is shown turned half a circle from
   that sheet so the map keeps the app's orientation: the soccer
   field on the left, the covered court below it, the gym lower
   right, Corrales Avenue down the right-hand edge. Shapes are
   illustrative, not surveyed — positions are in the drawing's own
   units (one plan pixel = 0.93 units), not GPS.

   Everything here is in FLAT drawing units. lib/campus-view.js turns
   it into the view on screen (flat, or tilted and raised in 3D), and
   the pins in CUP_MAP follow the same way — so a building or pin is
   only ever placed once, here, flat.

   Which buildings are Xavier Cup venues, what is played where and
   the icon spots are NOT in here: they live with the fixtures in
   data/xavier-cup.js → CUP_MAP, so the people editing the schedule
   never need to open this file.

   ============================================================ */

/* How the map may be shown (see lib/campus-view.js).
   default  'flat' or '3d': what a first-time visitor sees
   toggle   true shows the Flat / 3D button on the Map tab; false
            hides it and everyone gets `default`
   slant    CODE ONLY, no button. true tilts the Flat view a little
            (3D is always tilted). Pins follow either way. */
export const CAMPUS_VIEW = { default: 'flat', toggle: true, slant: false };

/* The drawing's viewBox is `0 ${top} ${width} ${height}`. */
export const CAMPUS_DRAWING = { width: 560, height: 310, top: 110 };

/* The campus boundary. */
export const CAMPUS_OUTLINE =
  '506,415 383,413 301,349 258,404 155,323 120,317 39,267 12,233 12,219 16,218 346,118 506,118';

/* Corrales Avenue, straight down the east side (a line, flat). */
export const CAMPUS_ROAD = {
  pts: '518,112 518,420',
  label: { text: 'CORRALES AVENUE', x: 522, y: 236 },
};

/* Roads and pedestrian corridors: the loop road round the field and
   the court, the road in from the Main Gate, the Sec Gate courtyard.
   pts = the line's corners. */
export const CAMPUS_WALKWAYS = [
  { pts: '379.35,181.24 379.35,268.66 366.33,281.68 165.45,281.68 152.43,268.66 152.43,181.24', width: 6 },
  { pts: '370.98,263.08 362.61,272.38 320.76,272.38 312.39,263.08 312.39,221.23 320.76,211.93 362.61,211.93 370.98,221.23 370.98,263.08', width: 5 },
  { pts: '505.83,238.9 379.35,238.9', width: 9 },
  { pts: '466.77,303.07 391.44,303.07', width: 6 },
];

/* ------------------------------------------------------------
   Buildings.
   id      stable — CUP_MAP venues point at these
   lines   the label, one string per line ([] = no label)
   points  the footprint polygon, on the ground
   center  where the label sits, on the ground
   h       how tall the building stands in the 3D view (drawing
           units). 0 = flat. Pins on the building ride up with it
   kind    field | court | gym | church — coloured, not roofed
   small   true → a smaller label, for the tight footprints
   ------------------------------------------------------------ */
export const CAMPUS_FOOTPRINTS = [
  { id: 'xu-gym', name: 'University Gym', lines: [], points: '484,404 441,404 429,392 429,361 441,349 484,349 497,361 497,392', center: [463, 377], h: 8, kind: 'gym' },
  { id: 'sped-lab', name: 'SPED Lab', lines: ['SPED'], points: '417,397 393,397 393,377 417,377', center: [405, 387], h: 5 },
  // The small building beside the STC Building, above the SPED Lab, is
  // Peace Park (the campus map's no. 30); the Little Theater is part of
  // the Social Science Building (no. 27, at its Magis end), drawn there below.
  { id: 'peace-park', name: 'Peace Park / Satellite Canteen', lines: ['PEACE', 'PARK'], points: '417,371 390,371 390,347 417,347', center: [404, 359], h: 4, small: true },
  { id: 'agriculture-building', name: 'Agriculture Building', lines: ['AGRICULTURE'], points: '497,332 393,332 393,313 497,313', center: [445, 323], h: 8 },
  { id: 'sec-mall', name: 'SEP Mall', lines: ['SEP'], points: '497,313 467,313 467,293 497,293', center: [482, 303], h: 8 },
  { id: 'science-center', name: 'Science Center Building', lines: ['SCIENCE CENTER'], points: '497,293 393,293 393,274 497,274', center: [445, 284], h: 8 },
  // The church is the building beside the soccer field, in the ring
  // road (it was drawn where the Magis Building is, beside Agriculture).
  { id: 'university-church', name: 'University Church', lines: ['UNIVERSITY', 'CHURCH'], points: '365,259 318,259 318,225 365,225', center: [342, 242], h: 9, kind: 'church' },
  { id: 'social-science-building', name: 'Social Science Building', lines: ['SOCIAL', 'SCIENCE'], points: '304,324 276,324 276,297 304,297', center: [290, 310], h: 8 },
  { id: 'little-theater', name: 'Little Theater', lines: ['LITTLE', 'THEATER'], points: '326,324 304,324 304,297 326,297', center: [315, 310], h: 7, small: true },
  { id: 'sbm-building', name: 'SBM Building', lines: ['SBM BUILDING'], points: '271,305 167,305 167,287 271,287', center: [219, 296], h: 8 },
  { id: 'covered-court', name: 'Covered Court', lines: [], points: '294,342 261,384 224,356 255,312', center: [259, 348], h: 5, kind: 'court' },
  // The Workshop is the one nearer the SBM Building, the Office the one past it (they were swapped).
  { id: 'physical-plant-workshop', name: 'Physical Plant Workshop', lines: ['WORKSHOP'], points: '188,344 183,348 161,328 165,315', center: [174, 331], h: 4, small: true },
  { id: 'physical-plant-offices', name: 'Physical Plant Office', lines: ['PLANT', 'OFFICE'], points: '220,363 216,366 192,349 197,345', center: [206, 356], h: 4, small: true },
  { id: 'religious-of-the-assumption', name: 'Religious of the Assumption', lines: ['R. OF THE', 'ASSUMPTION'], points: '121,307 105,318 81,297 98,277', center: [101, 297], h: 6, small: true },
  { id: 'medicine-building', name: 'Medicine Building', lines: ['MEDICINE'], points: '64,266 41,266 41,239 16,239 16,218 64,218', center: [40, 229], h: 10 },
  { id: 'engineering-building', name: 'Engineering Building', lines: ['ENGINEERING'], points: '134,261 68,261 68,250 134,250', center: [101, 256], h: 7 },
  // Between Faber Hall and the Engineering Building: the Satellite Canteen (the campus map's no. 15).
  { id: 'satellite-canteen', name: 'Satellite Canteen', lines: ['SATELLITE CANTEEN'], points: '131,244 77,244 77,231 131,231', center: [104, 237], h: 5 },
  { id: 'amphitheater', name: 'Amphitheater', lines: ['AMPHI-', 'THEATER'], points: '148,225 125,225 125,194 148,194', center: [136, 210], h: 4, small: true },
  { id: 'faber-hall', name: 'Faber Hall', lines: ['FABER'], points: '125,221 68,221 68,202 125,202', center: [96, 211], h: 8 },
  { id: 'soccer-field', name: 'Soccer Field', lines: [], points: '300,270 165,270 165,177 300,177', center: [232, 223], h: 0, kind: 'field' },
  // The small building under the Magis Building (Canteen), which is the large one beside Agriculture.
  { id: 'student-center', name: 'STC Building', lines: ['STC'], points: '384,366 336,366 336,343 384,343', center: [360, 355], h: 6 },
  { id: 'loyola-house', name: 'Loyola House', lines: ['LOYOLA HOUSE'], points: '313,164 247,164 247,153 313,153', center: [280, 159], h: 7 },
  { id: 'haggerty-house', name: 'Haggerty House', lines: ['HAGGERTY'], points: '315,151 289,151 289,140 315,140', center: [302, 145], h: 5, small: true },
  { id: 'xu-old-library', name: 'Library Annex', lines: ['LIBRARY', 'ANNEX'], points: '497,218 459,218 459,190 497,190', center: [478, 204], h: 8 },
  { id: 'xu-new-library', name: 'Main Library', lines: ['MAIN LIBRARY'], points: '442,219 385,219 385,201 442,201', center: [413, 210], h: 8 },
  { id: 'xavier-hall', name: 'Xavier Hall', lines: ['XAVIER', 'HALL'], points: '442,196 396,196 396,140 442,140', center: [419, 168], h: 10 },
  { id: 'campion-hall', name: 'Campion Hall', lines: ['CAMPION', 'HALL'], points: '370,196 324,196 324,140 370,140', center: [347, 168], h: 10 },
  { id: 'lucas-hall', name: 'Lucas Hall', lines: ['LUCAS', 'HALL'], points: '410,140 355,140 355,121 410,121', center: [383, 131], h: 10 },
  { id: 'museo-de-oro', name: 'Museo de Oro', lines: ['MUSEO', 'DE ORO'], points: '486,136 450,136 450,122 486,122', center: [468, 129], h: 6 },
  // The large building beside Agriculture, with the STC Building under it (it was drawn up by
  // Museo de Oro, where the campus has none).
  { id: 'magis-building', name: 'Magis Building (Canteen)', lines: ['MAGIS'], points: '388,339 329,339 329,300 338,290 379,290 388,298', center: [358, 315], h: 6 },
];

/* Court and pitch markings, flat. `on` is the footprint they sit on,
   so they ride up with its roof in 3D. A line is a list of corners;
   a circle is [centre x, centre y, radius]. `stripes` is the polygon
   that gets the mown-grass pattern. */
export const CAMPUS_MARKINGS = {
  stripes: { on: 'soccer-field', pts: '300,270 165,270 165,177 300,177' },
  lines: [
    { on: 'soccer-field', pts: '171,183 294,183 294,264 171,264 171,183' },
    { on: 'soccer-field', pts: '232.5,183 232.5,264' },
    { on: 'soccer-field', circle: [232.5, 223.5, 10] },
    { on: 'soccer-field', pts: '171,203 190,203 190,244 171,244' },
    { on: 'soccer-field', pts: '294,203 275,203 275,244 294,244' },
    { on: 'soccer-field', pts: '171,214 179,214 179,233 171,233' },
    { on: 'soccer-field', pts: '294,214 286,214 286,233 294,233' },
    { on: 'covered-court', pts: '286.1,342.5 260.3,375.6 231.9,353.5 257.7,320.4 286.1,342.5' },
    { on: 'covered-court', pts: '273.2,359.1 244.8,336.9' },
    { on: 'covered-court', pts: '277.5,353.6 249.1,331.4' },
    { on: 'covered-court', pts: '268.9,364.6 240.5,342.4' },
    { on: 'xu-gym', pts: '437,358 489,358 489,396 437,396 437,358' },
    { on: 'xu-gym', pts: '463,358 463,396' },
    { on: 'xu-gym', circle: [463, 377, 7] },
    { on: 'xu-gym', pts: '437,367 447,367 447,387 437,387' },
    { on: 'xu-gym', pts: '489,367 479,367 479,387 489,387' },
  ],
};

/* Gates and other things you navigate by that are not buildings.
   ticks   the short bars drawn at the gate: [x1, y1, x2, y2]
   along   true → the label runs along Corrales Avenue */
export const CAMPUS_LANDMARKS = [
  { text: 'MAIN GATE', x: 501, y: 239, size: 3.6, along: true, ticks: [[505, 225, 517, 225], [505, 253, 517, 253]] },
  { text: 'SEC GATE', x: 501, y: 303, size: 3.6, along: true, ticks: [[505, 295, 517, 295], [505, 311, 517, 311]] },
  { text: 'MORTOLA GATE 1', x: 96, y: 326, size: 3.5, ticks: [[112, 314, 120, 304]] },
  { text: 'MORTOLA GATE 2', x: 56, y: 288, size: 3.5, ticks: [[45, 268, 53, 258]] },
];
