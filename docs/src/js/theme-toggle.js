/* ============================================================
   theme-toggle.js — light/dark toggle, persisted to localStorage.
   Also respects prefers-color-scheme on first load.
   ============================================================ */

const KEY = 'campus-compass:theme';

export function initThemeToggle() {
  const root = document.documentElement;

  // Restore or infer initial theme
  const stored = localStorage.getItem(KEY);
  const initial = stored
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);

  // Wire toggle buttons (there can be more than one)
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const now = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', now);
      localStorage.setItem(KEY, now);
      renderIcon(btn, now);
    });
    renderIcon(btn, initial);
  });
}

function renderIcon(btn, theme) {
  // Simple 2-glyph swap: sun for light, moon for dark
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
