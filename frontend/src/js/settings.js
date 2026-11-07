/* ============================================================
   settings.js — the gear button and the panel behind it.

   The panel's markup is static in index.html (same pattern as
   every other screen); this module only decides which rows are
   allowed to show, opens and closes the modal, and leaves the
   actual switching to appearance.js, which owns the state.

   Which rows exist:  data/site.js → settings.show*
   Locking the skin:  data/site.js → skin.allowToggle = false
   ============================================================ */

import { SITE } from './data/site.js';
import { openModal, closeModal } from './components/modal.js';

export function initSettings() {
  const modal = document.getElementById('settings-modal');
  const openers = document.querySelectorAll('[data-open-settings]');
  if (!modal) return;

  // --- Row visibility, straight from the config ---
  const rows = {
    appearance: SITE.settings.showAppearance,
    design: SITE.settings.showDesign && SITE.skin.allowToggle,
    motion: SITE.settings.showMotion,
  };
  let visible = 0;
  for (const [id, on] of Object.entries(rows)) {
    const row = modal.querySelector(`[data-settings-row="${id}"]`);
    if (!row) continue;
    row.hidden = !on;
    if (on) visible += 1;
  }

  // Nothing left to configure — take the gear out of the nav
  // rather than opening an empty panel.
  if (visible === 0) {
    openers.forEach(btn => { btn.hidden = true; });
    return;
  }

  // --- Skin labels come from the config, so renaming a season
  //     in data/site.js renames the buttons too. ---
  modal.querySelectorAll('[data-set-skin]').forEach(btn => {
    const label = SITE.skin.labels?.[btn.dataset.setSkin];
    if (label) btn.textContent = label;
  });

  openers.forEach(btn => {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      // Close the mobile nav sheet first; two overlays at once
      // leaves the page scroll-locked by whichever closes last.
      document.querySelector('[data-nav-sheet][data-open]')
        ?.removeAttribute('data-open');
      document.querySelector('[data-nav-sheet-scrim][data-open]')
        ?.removeAttribute('data-open');
      document.body.classList.remove('nav-sheet-open');
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');

      openModal(modal);
    });
  });

  // Picking an option is not a reason to close — people compare
  // light and dark with the panel open. The Done button closes it.
  modal.querySelector('[data-settings-done]')
    ?.addEventListener('click', () => closeModal(modal));
}
