/* ============================================================
   components/detail-modal.js — the one modal shell that the
   Events tab and the Xavier Cup tab both render into.

   The org booth has its own modal (#booth-modal) and keeps it;
   this is a second, identical shell so a booth and an event can
   never fight over the same panel mid-transition.

   Opening while it is already open swaps the contents instead of
   re-running the enter animation — which is what happens when one
   detail view links across to another.

   The close handler is read through a module-level indirection on
   purpose: components/modal.js captures its `onClose` when the
   modal is opened, so a handler swapped in later would otherwise
   never run.
   ============================================================ */

import { openModal, closeModal } from './modal.js';

const ID = 'detail-modal';
let currentOnClose = null;

/* Stable reference handed to modal.js; always calls the latest. */
const runOnClose = () => { currentOnClose?.(); };

export function detailModalEl() {
  return document.getElementById(ID);
}

export function isDetailOpen() {
  const modal = detailModalEl();
  return !!modal && !modal.hidden;
}

/**
 * openDetail(html, opts)
 * @param {string} html
 * @param {{onClose?: Function, wire?: (panel: HTMLElement) => void}} opts
 *        wire() runs against the freshly painted panel — for the
 *        buttons inside a detail view (open this org's booth,
 *        jump to this venue…).
 */
export function openDetail(html, { onClose = null, wire } = {}) {
  const modal = detailModalEl();
  if (!modal) return;

  const panel = modal.querySelector('.modal__panel-content');
  if (!panel) return;

  currentOnClose = onClose;
  panel.innerHTML = html;
  wire?.(panel);

  if (modal.hidden) {
    openModal(modal, { onClose: runOnClose });
  }

  // Land at the top whether this is a fresh open or a swap.
  panel.scrollTop = 0;
  modal.scrollTop = 0;
  const shell = modal.querySelector('.modal__panel');
  if (shell) shell.scrollTop = 0;
}

/** Close and run the current handler (drops ?event= / ?game=). */
export function closeDetail({ silent = false } = {}) {
  const modal = detailModalEl();
  if (!modal || modal.hidden) return;
  if (silent) currentOnClose = null;
  closeModal(modal, { onClose: runOnClose });
  currentOnClose = null;
}
