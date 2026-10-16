/* ============================================================
   compass-orientation.js — delight #2
   The compass rose in the nav idles with a soft wobble and points
   toward the current screen: N for Discover, E for Browse, SE for
   Events, SW for the Cup, W for About. Changing screen swings it
   round to its new heading like a needle, the shorter way, with a
   small overshoot (the `rotate` transition in nav.css), instead of
   snapping there. It is done by setting --compass-rot on
   document.documentElement; the wobble (compassWobble) is separate.
   ============================================================ */

const ANGLES = {
  landing:  0,    // north
  browse:  90,    // east
  events: 135,    // south-east
  booth:  180,    // south (when the booth modal is open)
  cup:    225,    // south-west
  about:  270,    // west
};

// The heading shown now, unwrapped (it can pass 360 or go below 0), so
// each swing can take the shorter way round.
let current = null;

export function setCompassTarget(screen) {
  const target = ANGLES[screen] ?? 0;
  const root = document.documentElement;
  if (current === null) {
    // The first heading, as the page opens: set it still, no swing.
    current = target;
    root.classList.add('compass-still');
    root.style.setProperty('--compass-rot', `${current}deg`);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('compass-still')));
    return;
  }
  current += ((((target - current) % 360) + 540) % 360) - 180;   // -180..180: the shorter way
  root.style.setProperty('--compass-rot', `${current}deg`);
}
