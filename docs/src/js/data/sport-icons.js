// Artwork lookup only. SPORTS and the tracker still decide the official sports list.
// Filenames are lowercase kebab-case; source SVGs stay in the read-only TXC project.
export const SPORT_ICON_ASSETS = Object.freeze({
  athletics: 'assets/sports/athletics.webp',
  badminton: 'assets/sports/badminton.webp',
  basketball: 'assets/sports/basketball.webp',
  'basketball-3x3': 'assets/sports/basketball-3x3.webp',
  cheerdance: 'assets/sports/cheerdance.webp',
  chess: 'assets/sports/chess.webp',
  darts: 'assets/sports/darts.webp',
  debate: 'assets/sports/debate.webp',
  'call-of-duty-mobile': 'assets/sports/call-of-duty-mobile.webp',
  'dota-2': 'assets/sports/dota-2.webp',
  'mobile-legends': 'assets/sports/mobile-legends.webp',
  valorant: 'assets/sports/valorant.webp',
  frisbee: 'assets/sports/frisbee.webp',
  karatedo: 'assets/sports/karatedo.webp',
  'lawn-tennis': 'assets/sports/lawn-tennis.webp',
  megacrew: 'assets/sports/megacrew.webp',
  pickleball: 'assets/sports/pickleball.webp',
  'sepak-takraw': 'assets/sports/sepak-takraw.webp',
  soccer: 'assets/sports/soccer.webp',
  softball: 'assets/sports/softball.webp',
  swimming: 'assets/sports/swimming.webp',
  'table-tennis': 'assets/sports/table-tennis.webp',
  volleyball: 'assets/sports/volleyball.webp',
});

const aliases = {
  athletics: ['Track and Field'],
  'basketball-3x3': ['Basketball3x3', '3x3 Basketball'],
  cheerdance: ['Cheer Dance'],
  'call-of-duty-mobile': ['Call of Duty: Mobile', 'CODM', 'COD Mobile', 'E-Sports CODM'],
  'dota-2': ['Dota', 'E-Sports Dota', 'E-Sports Dota 2'],
  'mobile-legends': ['Mobile Legends: Bang Bang', 'ML', 'MLBB', 'E-Sports ML', 'E-Sports MLBB'],
  valorant: ['E-Sports Valorant'],
  frisbee: ['Ultimate', 'Ultimate Frisbee'],
  karatedo: ['Karate', 'Karate-do'],
  'lawn-tennis': ['Tennis'],
  megacrew: ['Mega Crew', 'Megacreww'],
  soccer: ['Football'],
  'table-tennis': ['Ping Pong'],
};
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
