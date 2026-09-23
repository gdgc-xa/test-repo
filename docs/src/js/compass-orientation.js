/* ============================================================
   compass-orientation.js — delight #2
   The compass rose in the nav idles with a soft wobble, and
   slowly rotates to point toward the current screen: N for
   Discover, E for Browse, SE for Events, SW for the Cup, W for
   About. This is done by setting --compass-rot on
   document.documentElement, which the compassIdle keyframe reads.
   ============================================================ */

const ANGLES = {
  landing:  0,    // north
  browse:  90,    // east
  events: 135,    // south-east
  booth:  180,    // south (when the booth modal is open)
  cup:    225,    // south-west
  about:  270,    // west
};

export function setCompassTarget(screen) {
  const angle = ANGLES[screen] ?? 0;
  document.documentElement.style.setProperty('--compass-rot', `${angle}deg`);
}
