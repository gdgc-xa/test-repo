/* ============================================================
   data/sport-icons.js — each sport's picture, and the other names a sport goes by.
   The data lives in docs/database/sport-icons.json; how to edit it
   is in docs/database/README.md.
   ============================================================ */

import icons from '../../../database/sport-icons.json' with { type: 'json' };

export const SPORT_ICON_ASSETS = Object.freeze(icons.assets);
const aliases = icons.aliases;
const key = value => String(value ?? '').normalize('NFKC').toLowerCase()
  .replaceAll('×', 'x').replace(/[^a-z0-9]/g, '');
const byName = new Map(Object.entries(SPORT_ICON_ASSETS).flatMap(([id, icon]) =>
  [id, ...(aliases[id] || [])].map(name => [key(name), icon])));

/** Case/spacing tolerant image matching; never changes sport IDs or venue assignments.
 *  Generic COD/ESports COD is intentionally unresolved until its game is confirmed.
 *  Sports without supplied artwork keep the existing glyph/letter fallback.
 */
export function sportIconFor(sport) {
  return byName.get(key(sport)) || null;
}
