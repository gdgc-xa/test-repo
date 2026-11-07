/* ============================================================
   screens/booth.js — open the booth modal for one org id.
   Populates the modal panel with boothHtml(org). If the org is
   pending, tries to hydrate from Facebook via the stubbed
   fetchOrgFromFacebook() and re-renders on success.
   ============================================================ */

import { ORGS, fetchOrgFromFacebook } from '../data/organizations.js';
import { boothHtml } from '../components/booth.js';
import { openModal, closeModal } from '../components/modal.js';
import { watchReveals } from '../reveal-observer.js';
import { navigate } from '../router.js';

/**
 * renderBooth(orgId) — open the modal for a given org id.
 * If orgId is falsy, close the modal.
 */
export async function renderBooth(orgId) {
  const modal = document.getElementById('booth-modal');
  if (!modal) return;

  if (!orgId) {
    closeModal(modal);
    return;
  }

  const org = ORGS.find(o => o.id === orgId);
  if (!org) {
    console.warn(`[Campus Compass] Unknown org: ${orgId}`);
    closeModal(modal);
    return;
  }

  const panel = modal.querySelector('.modal__panel-content');
  if (!panel) return;
  panel.innerHTML = boothHtml(org);
  wireBoothInternalNav(panel);
  watchReveals(panel);

  openModal(modal, {
    onClose: () => {
      // Drop ?org=… from the URL when the user closes the modal
      const q = new URLSearchParams(location.search);
      q.delete('org');
      history.replaceState(null, '', `?${q.toString()}`);
    },
  });

  // If pending, try to hydrate from FB API in the background
  if (org.pending) {
    const fresh = await fetchOrgFromFacebook(org.fbHandle);
    if (fresh && modal && !modal.hidden) {
      Object.assign(org, fresh, { pending: false });
      panel.innerHTML = boothHtml(org);
      wireBoothInternalNav(panel);
      watchReveals(panel);
    }
  }
}

function wireBoothInternalNav(panel) {
  panel.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    e.preventDefault();
    const screen = nav.dataset.nav;
    // Close modal and go
    const modal = document.getElementById('booth-modal');
    closeModal(modal);
    navigate({ screen });
  });
}
