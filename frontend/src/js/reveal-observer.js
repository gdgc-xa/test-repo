/* ============================================================
   reveal-observer.js — one shared IntersectionObserver.
   Elements marked .reveal fade + rise into view.
   Per-instance stagger comes from --reveal-delay set inline.
   ============================================================ */

let io;

function ensure() {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    }
  }, {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.12,
  });
  return io;
}

/**
 * watchReveals(root) — observe every .reveal inside root.
 * Skips ones already .revealed.
 * Respects prefers-reduced-motion (kills reveal delay via CSS).
 */
export function watchReveals(root = document) {
  const obs = ensure();
  root.querySelectorAll('.reveal:not(.revealed)').forEach(el => obs.observe(el));
}
