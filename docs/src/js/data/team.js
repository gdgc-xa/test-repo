/* ============================================================
   data/team.js — the people behind Campus Compass.
   Pure data. No DOM.

   The About page shows the team in three groups (screens/about.js),
   with a filter to see one at a time: the CEO, the founders, and
   the developers. Each card is names only, no photo:
     name    as written in the GDGC 26'27 directory
     role    their position
     title   optional second line (a founder's other position)
     dept    developers only: the part of the project they work on
   People show in the order listed here.
   ============================================================ */

export const TEAM_GROUPS = [
  {
    id: 'ceo',
    name: 'CEO',
    people: [
      { name: 'Serge Jossiah N. Calasara', role: 'Chief Executive Officer' },
    ],
  },
  {
    id: 'founders',
    name: 'Founders',
    people: [
      { name: 'Sean S. Salapantan', role: 'Project Head', title: 'Chief Community Development Officer' },
      { name: 'John Mark D. Hingpit', role: 'Tech Lead', title: 'Technology Department Undersecretary' },
      { name: 'Ethan K. Caños', role: 'Chief Technology Officer' },
      { name: 'Girlyver C. Jandayan', role: 'Technology Department' },
      { name: 'Tyrone Jay D. Castillo', role: 'Cloud Development Lead' },
    ],
  },
  {
    id: 'developers',
    name: 'Developers',
    // By department, its lead first. Positions are their Technology
    // Department ones in the directory.
    people: [
      { name: 'Karla Denice H. Adecer', role: 'Project Manager', dept: 'Front End' },
      { name: 'Jevric Lou C. Bacunawa', role: 'Web Development Officer', dept: 'Front End' },
      { name: 'Laurence Jacob D. Eran', role: 'Front-end Developer', dept: 'Front End' },
      { name: 'Macky Jay B. Bolor', role: 'Front-end Engineer', dept: 'Front End' },
      { name: 'Franz Matthew I. Estopia', role: 'Front-end Engineer', dept: 'Front End' },
      { name: 'Kyle Chris M. Llauder', role: 'Web Development Officer', dept: 'Back End' },
      { name: 'Louie Eienstine R. Emnace', role: 'Software Engineering Officer', dept: 'Back End' },
      { name: 'Seth Oliver P. Hona', role: 'Back-end Developer', dept: 'Back End' },
      { name: 'Eris Ronel E. Meñoza', role: 'Backup Web Developer', dept: 'Back End' },
      { name: 'Auztin Keefer F. Echem', role: 'Cybersecurity Lead', dept: 'Cybersecurity' },
      { name: 'Fave Uriel C. Baring', role: 'Cybersecurity Officer', dept: 'Cybersecurity' },
      { name: 'Zander Kirk G. Batayola', role: 'Web Development Officer', dept: 'Cybersecurity' },
      { name: 'Jihad M. Paudac', role: 'Cloud Development Officer', dept: 'Database' },
    ],
  },
];
