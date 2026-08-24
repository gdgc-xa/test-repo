/* ============================================================
   components/search-shell.js — attach submit + input listeners.
   Renders live results as the user types (debounced).
   ============================================================ */

export function attachSearchShell(shellEl, onQuery, { debounceMs = 120 } = {}) {
  const input  = shellEl.querySelector('.search-shell__input');
  const submit = shellEl.querySelector('.search-shell__submit');
  if (!input) return;

  let timer = 0;
  const emit = () => onQuery(input.value.trim());

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(emit, debounceMs);
  });

  // Enter key or explicit submit button click
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); emit(); }
  });
  submit?.addEventListener('click', (e) => { e.preventDefault(); emit(); });
}

/**
 * setSearchValue(shellEl, v) — programmatic setter (used when
 * clearing filters from browse.js).
 */
export function setSearchValue(shellEl, v) {
  const input = shellEl.querySelector('.search-shell__input');
  if (input) input.value = v;
}
