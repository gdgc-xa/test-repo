/* ============================================================
   nav-sheet.js — the mobile nav sheet behind the ≤820px
   hamburger. Below that width .nav-links and .nav-actions are
   display:none, so without this the two nav items AND the theme
   toggle are unreachable on a phone.

   Deliberately thin. The sheet's contents are declarative and
   other modules already own them:
     · router.js delegates clicks on any [data-nav] to navigate(),
       and stamps aria-current onto every [data-nav-item].
     · theme-toggle.js wires every [data-theme-toggle] it finds,
       so the sheet's toggle works with no extra code here.
   This module only opens, closes, and manages focus.
   ============================================================ */

const DESKTOP_MQ = '(min-width: 821px)';

export function initNavSheet() {
  const toggle = document.querySelector('.nav-toggle');
  const sheet  = document.querySelector('[data-nav-sheet]');
  const scrim  = document.querySelector('[data-nav-sheet-scrim]');
  if (!toggle || !sheet) return;

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', sheet.id);

  const isOpen = () => sheet.hasAttribute('data-open');

  function open() {
    if (isOpen()) return;
    sheet.setAttribute('data-open', '');
    scrim?.setAttribute('data-open', '');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-sheet-open');
    // Focus the first row so the sheet is keyboard-operable at once.
    sheet.querySelector('.nav-sheet__item')?.focus();
  }

  function close({ restoreFocus = false } = {}) {
    if (!isOpen()) return;
    sheet.removeAttribute('data-open');
    scrim?.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-sheet-open');
    // Only pull focus back for keyboard dismissals (Esc). Doing it
    // after a tap would yank focus onto the hamburger mid-navigation.
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));

  scrim?.addEventListener('click', () => close());

  // Any nav row closes the sheet; router.js does the navigating.
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-nav]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close({ restoreFocus: true });
  });

  // Crossing back to desktop width leaves the sheet orphaned —
  // its own media query hides it, but the body lock and the
  // aria state would survive. Close it properly instead.
  // Reads desktop.matches rather than the event's own .matches so the
  // handler behaves identically however it is triggered.
  const desktop = matchMedia(DESKTOP_MQ);
  desktop.addEventListener('change', () => { if (desktop.matches) close(); });
}
