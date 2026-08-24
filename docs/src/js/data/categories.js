/* ============================================================
   data/categories.js — the 11 Xavier Ateneo clusters, their
   puzzle-piece colour, and the display labels.
   Pure data. No DOM.
   ============================================================ */

/**
 * A category is one of the 11 clusters. `color` picks the
 * puzzle-piece hue — mapped to a CSS token by SHORT_LABEL wiring.
 */
export const CATEGORIES = [
  { id: 'governance',      full: 'Governance and Policy-making',                       short: 'Governance',       color: 'blue'   },
  { id: 'media-arts',      full: 'Media and Arts',                                     short: 'Media & Arts',     color: 'red'    },
  { id: 'sci-eng-tech',    full: 'Natural Sciences, Engineering, and Technology',      short: 'Sci · Eng · Tech', color: 'blue'   },
  { id: 'business',        full: 'Business',                                           short: 'Business',         color: 'green'  },
  { id: 'sports',          full: 'Sports and Recreation',                              short: 'Sports',           color: 'green'  },
  { id: 'environment',     full: 'Environment',                                        short: 'Environment',      color: 'green'  },
  { id: 'food-agri',       full: 'Food and Agriculture',                               short: 'Food & Agri',      color: 'yellow' },
  { id: 'socio-cultural',  full: 'Socio-Cultural',                                     short: 'Socio-Cultural',   color: 'yellow' },
  { id: 'service-learning',full: 'Service-Learning',                                   short: 'Service-Learning', color: 'red'    },
  { id: 'program-based',   full: 'Program-Based',                                      short: 'Program-Based',    color: 'blue'   },
  { id: 'religious',       full: 'Religious',                                          short: 'Religious',        color: 'yellow' },
];

/**
 * Convenience maps — cheaper than repeated .find() calls.
 * SHORT_LABEL[id] → short display label
 * FULL_LABEL[id]  → full official name
 * COLOR_OF[id]    → 'blue' | 'red' | 'yellow' | 'green'
 */
export const SHORT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.short]));
export const FULL_LABEL  = Object.fromEntries(CATEGORIES.map(c => [c.id, c.full]));
export const COLOR_OF    = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));
