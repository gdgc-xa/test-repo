/* ============================================================
   data/site.js — ONE switchboard for the whole site.
   Pure data. No DOM.

   Everything that can be turned on or off lives here: which
   tabs exist, what they are called in the nav, which sections
   inside them render, and which visual design the site opens
   with. Flip a flag, reload — nothing else to touch.

   Nothing in here is load-bearing for the original three
   screens (Discover / Browse / About); they are always on.
   ============================================================ */

export const SITE = {

  /* ---------- Contact ----------
     Shown on the About screen. Set `email` to null to drop the
     whole contact block from About.                            */
  contact: {
    email: 'gdsc@my.xu.edu.ph',
    label: 'Contact our email',
    note: 'Partnerships, org listings, corrections, or anything about this site.',
    /* Optional second address (e.g. a project head). null = hidden. */
    altEmail: null,
    altLabel: 'Project inquiries',
  },

  /* ---------- Formatting ----------
     locale: null  → use whatever locale the visitor's device is set to.
                     Put a tag like 'en-PH' here to force one.
     Event and game times are written as plain local strings
     ("2026-09-25T15:00") and are READ as the visitor's local time.
     If you need a fixed zone regardless of where the reader is,
     write the offset into the data instead: "2026-09-25T15:00+08:00".  */
  locale: null,
  hour12: true,

  /* ---------- Tabs ----------
     `enabled: false` removes the tab from the nav AND from the
     router — a stale ?screen=events link falls back to Discover
     instead of showing an empty page.                            */
  tabs: {
    events: {
      enabled: true,
      navLabel: 'Events',            // desktop nav
      sheetLabel: 'Events',          // mobile sheet
    },
    cup: {
      enabled: true,
      navLabel: 'Xavier Cup',
      sheetLabel: 'The Xavier Cup',
    },
  },

  /* ---------- Design / skin ----------
     'worldcup' — the current season's look (pitch, stadium, trophy).
     'sands'    — the original Sands of Time beach design, kept intact.

     defaultSkin  what a first-time visitor sees.
     allowToggle  false hides the Design row in Settings and locks
                  everyone to defaultSkin (the saved choice is ignored).  */
  skin: {
    defaultSkin: 'worldcup',
    allowToggle: true,
    labels: {
      worldcup: 'World Cup',
      sands: 'Sands of Time',
    },
  },

  /* ---------- Season wording ----------
     The short season line printed under the brand and in the footer.
     One per skin, so switching the design switches the words too.   */
  season: {
    worldcup: {
      brandSub: 'Xavier Ateneo · The Xavier Cup',
      heroTagline: 'The Xavier Cup',
      heroAnchor: 'Every org is a team. Every cluster a side of the draw.',
      footerTagline: 'Built for The Xavier Cup · University-wide Season',
      footerSeason: 'Xavier Cup',
    },
    sands: {
      brandSub: 'Xavier Ateneo · Sands of Time',
      heroTagline: 'Sands of Time',
      heroAnchor: 'Every org is a grain in the sand. Every cluster a piece of the puzzle.',
      footerTagline: 'Built for Sands of Time · General Assembly Organizational Trip',
      footerSeason: 'Sands of Time',
    },
  },

  /* ---------- Settings panel ----------
     Which rows the gear icon opens with. Turning them all off
     hides the gear button entirely.                                */
  settings: {
    showAppearance: true,   // Light / Dark
    showDesign: true,       // World Cup / Sands of Time
    showMotion: true,       // Full / Reduced animation
  },
};

/** True when a tab id is switched on. Unknown ids are "off". */
export function tabEnabled(id) {
  return Boolean(SITE.tabs?.[id]?.enabled);
}

/** The season wording for the skin currently applied. */
export function seasonWords(skin) {
  return SITE.season[skin] || SITE.season.sands;
}
