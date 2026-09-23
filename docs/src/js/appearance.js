/* ============================================================
   appearance.js — the three things a visitor can change about
   how the site looks, in one place:

     data-theme   light | dark          (the original toggle)
     data-skin    worldcup | sands      (which design is painted)
     data-motion  full | reduced        (ambient animation)

   All three are written onto <html> as attributes, saved to
   localStorage, and re-applied by the inline boot script in
   index.html BEFORE first paint — otherwise the page would flash
   the wrong design for a frame on every load.

   This module replaces the old theme-toggle.js. It still wires
   every [data-theme-toggle] button it finds, so the nav and the
   mobile sheet keep working with no extra code.
   ============================================================ */

import { SITE, seasonWords } from './data/site.js';

const KEY = {
  theme:  'campus-compass:theme',
  skin:   'campus-compass:skin',
  motion: 'campus-compass:motion',
};

const THEMES  = ['light', 'dark'];
const SKINS   = ['worldcup', 'sands'];
const MOTIONS = ['full', 'reduced'];

/* localStorage throws in some privacy modes — never let that
   take the whole page down with it. */
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ---------- Current values ---------- */

export function getTheme() {
  const stored = read(KEY.theme);
  if (THEMES.includes(stored)) return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getSkin() {
  // A locked skin ignores whatever is saved: the config wins.
  if (!SITE.skin.allowToggle) return SITE.skin.defaultSkin;
  const stored = read(KEY.skin);
  if (SKINS.includes(stored)) return stored;
  return SKINS.includes(SITE.skin.defaultSkin) ? SITE.skin.defaultSkin : 'worldcup';
}

export function getMotion() {
  const stored = read(KEY.motion);
  if (MOTIONS.includes(stored)) return stored;
  // First-time visitors inherit the OS setting; base.css already
  // honours the media query, this just keeps the UI in sync.
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}

/* ---------- Applying ---------- */

const root = () => document.documentElement;

export function setTheme(value, { persist = true } = {}) {
  const v = THEMES.includes(value) ? value : 'light';
  root().setAttribute('data-theme', v);
  if (persist) write(KEY.theme, v);
  syncControls();
  emit();
}

export function setSkin(value, { persist = true } = {}) {
  const v = SKINS.includes(value) ? value : 'worldcup';
  root().setAttribute('data-skin', v);
  if (persist) write(KEY.skin, v);
  applySeasonWords(v);
  syncControls();
  emit();
}

export function setMotion(value, { persist = true } = {}) {
  const v = MOTIONS.includes(value) ? value : 'full';
  root().setAttribute('data-motion', v);
  if (persist) write(KEY.motion, v);
  syncControls();
  emit();
}

export function toggleTheme() {
  setTheme(getAppliedTheme() === 'dark' ? 'light' : 'dark');
}

export function getAppliedTheme() {
  return root().getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
export function getAppliedSkin() {
  return root().getAttribute('data-skin') === 'sands' ? 'sands' : 'worldcup';
}
export function getAppliedMotion() {
  return root().getAttribute('data-motion') === 'reduced' ? 'reduced' : 'full';
}

/* ---------- Season wording ----------
   The words that change with the design (the brand subtitle, the
   hero tagline, the footer line) are stamped from data/site.js
   rather than duplicated in the markup, so there is one place to
   rename a season. Any element carrying data-season="<key>" gets
   the matching string for the active skin. */
export function applySeasonWords(skin = getAppliedSkin()) {
  const words = seasonWords(skin);
  document.querySelectorAll('[data-season]').forEach(el => {
    const key = el.dataset.season;
    if (words[key] !== undefined) el.textContent = words[key];
  });
}

/* ---------- Change events ---------- */

function emit() {
  document.dispatchEvent(new CustomEvent('appearance:change', {
    detail: {
      theme: getAppliedTheme(),
      skin: getAppliedSkin(),
      motion: getAppliedMotion(),
    },
  }));
}

/** Convenience subscription used by the screens that repaint. */
export function onAppearanceChange(fn) {
  document.addEventListener('appearance:change', (e) => fn(e.detail));
}

/* ---------- Controls ---------- */

/**
 * Keeps every control in the document showing the live value:
 *   [data-theme-toggle]      round sun/moon button (nav + sheet)
 *   [data-set-theme="…"]     segmented button in Settings
 *   [data-set-skin="…"]      "
 *   [data-set-motion="…"]    "
 */
function syncControls() {
  const theme = getAppliedTheme();
  const skin = getAppliedSkin();
  const motion = getAppliedMotion();

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => renderThemeIcon(btn, theme));

  const mark = (selector, current) => {
    document.querySelectorAll(selector).forEach(btn => {
      const value = btn.dataset.setTheme || btn.dataset.setSkin || btn.dataset.setMotion;
      btn.setAttribute('aria-pressed', String(value === current));
    });
  };
  mark('[data-set-theme]', theme);
  mark('[data-set-skin]', skin);
  mark('[data-set-motion]', motion);
}

function renderThemeIcon(btn, theme) {
  btn.innerHTML = theme === 'dark'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
         <circle cx="12" cy="12" r="4"/>
         <line x1="12" y1="2" x2="12" y2="4"/>
         <line x1="12" y1="20" x2="12" y2="22"/>
         <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
         <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
         <line x1="2" y1="12" x2="4" y2="12"/>
         <line x1="20" y1="12" x2="22" y2="12"/>
         <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>
         <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
       </svg>`;
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

/* ---------- Boot ---------- */

export function initAppearance() {
  // The inline script in <head> has usually applied these already;
  // re-applying is cheap and covers the case where it did not run.
  setTheme(getTheme(), { persist: false });
  setSkin(getSkin(), { persist: false });
  setMotion(getMotion(), { persist: false });

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Segmented controls anywhere in the document (Settings panel).
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-set-theme], [data-set-skin], [data-set-motion]');
    if (!el) return;
    if (el.dataset.setTheme)  setTheme(el.dataset.setTheme);
    if (el.dataset.setSkin)   setSkin(el.dataset.setSkin);
    if (el.dataset.setMotion) setMotion(el.dataset.setMotion);
  });
}
