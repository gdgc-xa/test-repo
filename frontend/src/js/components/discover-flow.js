export const PROGRAM_FLOW_URL = 'https://www.facebook.com/share/p/1Dg5DZZAzc/';   // Program Flow post

function init() {
  const a = document.querySelector('[data-program-flow]');
  if (!a || a.__wired) return;
  a.__wired = true;

  if (/^https:\/\//i.test(PROGRAM_FLOW_URL)) {
    a.href = PROGRAM_FLOW_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return;
  }
  // Placeholder: look like a link, go nowhere.
  a.title = 'Link coming soon';
  a.setAttribute('aria-disabled', 'true');
  a.addEventListener('click', (e) => e.preventDefault());
}
init();