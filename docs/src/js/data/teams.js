/* ============================================================
   data/teams.js — the eight Xavier Cup teams.
   Pure data. No DOM.

   A fixture in data/xavier-cup.js names its sides by `id`
   (teams: ['ccs', 'eng']). Everything the site prints about a
   team — its name, its college, its sprite — comes from here,
   so a rename is a one-line change.

     id       short, url-safe; what GAMES refers to
     name     the team as students say it ("CCS Wizards")
     short    what fits on a small badge ("CCS")
     mascot   the mascot on its own ("Wizards")
     college  the full college name, printed under the team name
     logo     sprite in assets/teams/, transparent background
   ============================================================ */

const logo = (file) => `assets/teams/${file}`;

export const TEAMS = [
  { id: 'ccs',   name: 'CCS Wizards',           short: 'CCS',     mascot: 'Wizards',       college: 'College of Computer Studies',                 logo: logo('ccs.png') },
  { id: 'nsg',   name: 'NSG Pythons',           short: 'NSG',     mascot: 'Pythons',       college: 'College of Nursing',                          logo: logo('nsg.png') },
  { id: 'sbm',   name: 'SBM Eagles',            short: 'SBM',     mascot: 'Eagles',        college: 'School of Business and Management',           logo: logo('sbm.png') },
  { id: 'eng',   name: 'ENG’G Warriors',   short: 'ENG’G', mascot: 'Warriors',   college: 'College of Engineering',                      logo: logo('eng.png') },
  { id: 'cas',   name: 'ARTSCIES Tigers',       short: 'ARTSCIES', mascot: 'Tigers',       college: 'College of Arts and Sciences',                logo: logo('cas.png') },
  { id: 'law',   name: 'LAW Lady Justices',     short: 'LAW',     mascot: 'Lady Justices', college: 'College of Law',                              logo: logo('law.png') },
  { id: 'med',   name: 'MED Wolves',            short: 'MED',     mascot: 'Wolves',        college: 'Dr. Jose P. Rizal School of Medicine',        logo: logo('med.png') },
  { id: 'agsoe', name: 'AGGIES & SOE Colossus', short: 'AGG·SOE', mascot: 'Colossus', college: 'College of Agriculture · School of Education', logo: logo('agsoe.png') },
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));

/**
 * teamFor(value) — the team record for an id, or a bare stand-in
 * for anything else ("All colleges", a guest side), so a fixture
 * never fails to render because a side is not one of the eight.
 */
export function teamFor(value) {
  if (!value) return null;
  const hit = TEAM_BY_ID[value];
  if (hit) return hit;
  const name = String(value);
  return { id: null, name, short: name, mascot: '', college: '', logo: null };
}
