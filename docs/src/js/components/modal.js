/* ============================================================
   components/modal.js — modal open/close, focus trap, Esc-to-close.
   URL sync is handled in router.js — this module is purely UI.
   ============================================================ */

let lastFocused = null;

/**
 * openModal(el) — show a hidden .modal element.
 */
export function openModal(el, { onClose } = {}) {
  if (!el || !el.hidden) return;
  lastFocused = document.activeElement;
  el.hidden = false;
  document.body.classList.add('modal-open');

  const panel = el.querySelector('.modal__panel');
  const backdrop = el.querySelector('.modal__backdrop');
  const closeBtn = el.querySelector('.modal__close');

  const handleKey = (e) => {
    if (e.key === 'Escape') close();
    // Simple focus trap: keep tab within the panel
    if (e.key === 'Tab' && panel) {
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  };

  const close = () => closeModal(el, { onClose });

  document.addEventListener('keydown', handleKey);
  backdrop?.addEventListener('click', close, { once: true });
  closeBtn?.addEventListener('click', close, { once: true });

  // Store cleanup so closeModal can undo it
  el.__closeCleanup = () => {
    document.removeEventListener('keydown', handleKey);
  };

  // Focus the close button so Esc-to-close is discoverable
  requestAnimationFrame(() => closeBtn?.focus());
}

export function closeModal(el, { onClose } = {}) {
  if (!el || el.hidden) return;
  el.hidden = true;
  document.body.classList.remove('modal-open');
  el.__closeCleanup?.();
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
  onClose?.();
}
