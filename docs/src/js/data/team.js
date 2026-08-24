/* ============================================================
   data/team.js — the people behind Campus Compass.
   Pure data. No DOM.

   `photo` is null for everyone right now, so each tile falls
   back to initials the same way a logo-less org card does.
   Drop a file into assets/team/ and set the path here to swap
   one in — no markup or CSS changes needed.
   ============================================================ */

export const TEAM = [
  {
    role: 'Chief Executive Officer',
    name: 'Serge Jossiah N. Calasara',
    photo: null,
    featured: true,
  },
  {
    role: 'Chief Technology Officer',
    name: 'Ethan K. Canos',
    photo: null,
  },
  {
    role: 'Cloud Dev Officer',
    name: 'Tyrone Jay D. Castillo',
    photo: null,
  },
  {
    role: 'Technology Department',
    name: 'Auztin Keefer F. Echem',
    photo: null,
  },
  {
    role: 'Technology Department',
    name: 'Girlyver C. Jandayan',
    photo: null,
  },
  {
    role: 'Project Head',
    name: 'Sean S. Salapantan',
    title: 'Chief Community Development Officer',
    photo: null,
    featured: true,
  },
  {
    role: 'Tech Lead',
    name: 'John Mark D. Hingpit',
    title: 'Software Developer',
    photo: null,
    featured: true,
  },
];

/**
 * initialsOf(name) — two letters for the placeholder avatar.
 * Middle initials are skipped: "John Mark D. Hingpit" → JH.
 */
export function initialsOf(name) {
  const words = String(name)
    .split(/\s+/)
    .filter(w => w && !/^[A-Z]\.$/.test(w));
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
