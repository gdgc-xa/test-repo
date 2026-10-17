/* ============================================================
   tweak.js — the layout tool: move words and boxes by hand.

   HOW TO USE IT (all a teammate needs)
     Open      add ?tweak to the address (or press Ctrl+Alt+T) while
               the site runs on your computer. × closes it.
     ① Pick    press Pick, then click the word or box to change.
     ② Change  drag it, press the arrow keys (Shift: 10px), or type
               numbers (px): position, margins, padding, size, letter
               spacing, gap. "Every copy" changes it on every page.
     ③ Save    writes it into src/css/tweaks.css. Refresh and it is
               there; commit and push to share it. The first Save asks
               for the project's docs folder (Chrome or Edge); after
               that it just saves.
     Undo / Redo   step through what is not saved yet.
     History   every Save, newest first. "Go back" makes an older one
               current again; that is saved as a new entry, so nothing
               is lost and you can always come forward again.

   Files: src/css/tweaks.css (the rules, loaded last so they win) and
   src/css/tweaks-history.json (the saves). main.js loads this file
   only when the tool is opened, so visitors never download it.
   ============================================================ */

const STATE_KEY = 'cc-tweak-state';      // unsaved changes and their steps
const OLD_EDITS_KEY = 'cc-tweak-edits';  // the first version kept only the changes
const POS_KEY = 'cc-tweak-pos';
const ON_KEY = 'cc-tweak';
const MAX_VERSIONS = 60;

const SCOPES = [
  { id: 'all', label: 'All screens', media: null },
  { id: 'phone', label: 'Phones', media: '(max-width: 720px)' },
  { id: 'wide', label: 'Bigger screens', media: '(min-width: 721px)' },
];

// What the panel changes, in its order. x and y are written as one
// `translate`, which moves a thing without moving what is around it.
const FIELDS = [
  { group: 'Move', items: [['x', 'X'], ['y', 'Y']] },
  { group: 'Margin', items: [['margin-top', 'Top'], ['margin-right', 'Right'], ['margin-bottom', 'Bottom'], ['margin-left', 'Left']] },
  { group: 'Padding', items: [['padding-top', 'Top'], ['padding-right', 'Right'], ['padding-bottom', 'Bottom'], ['padding-left', 'Left']] },
  { group: 'Text and spacing', items: [['font-size', 'Size'], ['letter-spacing', 'Letters'], ['gap', 'Gap']] },
];
const PROPS = FIELDS.flatMap(f => f.items.map(([p]) => p));
const PLAIN = PROPS.filter(p => p !== 'x' && p !== 'y');
const WORDS = {
  'margin-top': 'margin top', 'margin-right': 'margin right', 'margin-bottom': 'margin bottom', 'margin-left': 'margin left',
  'padding-top': 'padding top', 'padding-right': 'padding right', 'padding-bottom': 'padding bottom', 'padding-left': 'padding left',
  'font-size': 'size', 'letter-spacing': 'letter spacing', gap: 'gap',
};

// The top of tweaks.css, as Save writes it.
const FILE_HEAD = `/* ============================================================
   tweaks.css — hand adjustments, loaded last so they win.

   Written by the layout tool (src/js/tweak.js): add ?tweak to the
   site's address while it runs on your computer, pick a word or a
   box, change it and press Save. Every Save is also listed in
   tweaks-history.json, and the tool can go back to any of them.

   A rule names the element's own class, so it changes every copy of
   it (every sport page's "Next"), on the screens its @media says.
   ============================================================ */
`;

/* ---------- Small helpers ---------- */
const load = (store, key, fallback) => {
  try { return JSON.parse(window[store].getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (store, key, value) => {
  try { value == null ? window[store].removeItem(key) : window[store].setItem(key, JSON.stringify(value)); } catch { /* not kept */ }
};
const norm = (m) => String(m).replace(/\s+/g, '').toLowerCase();
const num = (v) => String(Math.round(v * 100) / 100);
const crlf = (t) => t.replace(/\r?\n/g, '\r\n');
const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost');

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? `Today ${time}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

/* ---------- What is saved, and what is not yet ---------- */
let fileSheet = null;
let fileRules = {};   // tweaks.css: { scope: { selector: { prop: px } } }
let versions = [];    // tweaks-history.json, newest first: { at, summary, css }

// Unsaved: `edits` lays over the file (null drops a value of the file's);
// `steps` are the changes in order, the first `at` of them applied.
let { edits, steps, at } = loadState();

function loadState() {
  const s = load('localStorage', STATE_KEY, null);
  if (s && typeof s === 'object' && s.edits) {
    const list = Array.isArray(s.steps) ? s.steps : [];
    return { edits: s.edits, steps: list, at: Math.min(s.at ?? list.length, list.length) };
  }
  return { edits: load('localStorage', OLD_EDITS_KEY, {}) || {}, steps: [], at: 0 };
}
function persist() {
  const empty = !Object.keys(edits).length && !steps.length;
  save('localStorage', STATE_KEY, empty ? null : { edits, steps, at });
  save('localStorage', OLD_EDITS_KEY, null);
}

/** The tool's rules from a style sheet's rules. */
function rulesFrom(list) {
  const out = {};
  const take = (rule, scope) => {
    if (!(rule instanceof CSSStyleRule)) return;
    const v = {};
    const t = rule.style.getPropertyValue('translate').trim();
    if (t && t !== 'none') {
      const [x, y = '0'] = t.split(/\s+/);
      v.x = parseFloat(x) || 0;
      v.y = parseFloat(y) || 0;
    }
    for (const p of PLAIN) {
      const value = rule.style.getPropertyValue(p);
      if (value) v[p] = parseFloat(value) || 0;
    }
    if (Object.keys(v).length) {
      const bucket = (out[scope] ||= {});
      bucket[rule.selectorText] = { ...bucket[rule.selectorText], ...v };
    }
  };
  for (const r of list) {
    if (r instanceof CSSMediaRule) {
      const scope = SCOPES.find(s => s.media && norm(s.media) === norm(r.conditionText || r.media.mediaText));
      if (scope) [...r.cssRules].forEach(inner => take(inner, scope.id));
    } else {
      take(r, 'all');
    }
  }
  return out;
}

const sheetLink = () => document.querySelector('link[rel="stylesheet"][href*="tweaks.css"]');
const urlOf = (name) => new URL(name, sheetLink()?.href || new URL('src/css/', location.href)).href;

function readFile() {
  fileSheet = sheetLink()?.sheet || null;
  let list = [];
  try { list = fileSheet ? [...fileSheet.cssRules] : []; } catch { list = []; }
  fileRules = rulesFrom(list);
}

function parseCss(text) {
  const sheet = new CSSStyleSheet();
  try { sheet.replaceSync(text); } catch { return {}; }
  return rulesFrom([...sheet.cssRules]);
}

async function loadVersions() {
  try {
    const res = await fetch(urlOf('tweaks-history.json'), { cache: 'no-store' });
    const list = res.ok ? await res.json() : [];
    versions = Array.isArray(list) ? list.filter(v => v && typeof v.css === 'string') : [];
  } catch {
    versions = [];
  }
  if (host) render();
}

/** tweaks.css with the unsaved changes laid over it. */
function merged() {
  const out = {};
  for (const s of SCOPES) {
    const rules = {};
    for (const [sel, v] of Object.entries(fileRules[s.id] || {})) rules[sel] = { ...v };
    for (const [sel, v] of Object.entries(edits[s.id] || {})) {
      const r = (rules[sel] ||= {});
      for (const [p, value] of Object.entries(v)) {
        if (value === null) delete r[p];
        else r[p] = value;
      }
      if (!Object.keys(r).length) delete rules[sel];
    }
    out[s.id] = rules;
  }
  return out;
}

function cssOf(model) {
  const lines = (rules) => Object.entries(rules).map(([sel, v]) => {
    const d = [];
    if (v.x != null || v.y != null) d.push(`translate: ${num(v.x ?? 0)}px ${num(v.y ?? 0)}px !important;`);
    for (const p of PLAIN) if (v[p] != null) d.push(`${p}: ${num(v[p])}px !important;`);
    return d.length ? `${sel} { ${d.join(' ')} }` : '';
  }).filter(Boolean);
  return SCOPES.map(s => {
    const l = lines(model[s.id] || {});
    if (!l.length) return '';
    return s.media ? `@media ${s.media} {\n${l.map(x => `  ${x}`).join('\n')}\n}` : l.join('\n');
  }).filter(Boolean).join('\n\n');
}

const unsaved = () => Object.values(edits).reduce((n, rules) =>
  n + Object.values(rules).reduce((m, v) => m + Object.keys(v).length, 0), 0);

/* ---------- Changes, one step at a time ---------- */

/** One change in words: “Next”: moved 12px right, margin right 6px (Phones). */
function describe(step) {
  const base = fileRules[step.scope]?.[step.sel] || {};
  const over = (snap) => {
    const v = { ...base };
    for (const [p, value] of Object.entries(snap || {})) {
      if (value === null) delete v[p];
      else v[p] = value;
    }
    return v;
  };
  const a = over(step.before);
  const b = over(step.after);
  const parts = [];
  const dx = (b.x ?? 0) - (a.x ?? 0);
  const dy = (b.y ?? 0) - (a.y ?? 0);
  if (dx || dy) {
    parts.push(`moved ${[
      dx ? `${num(Math.abs(dx))}px ${dx > 0 ? 'right' : 'left'}` : '',
      dy ? `${num(Math.abs(dy))}px ${dy > 0 ? 'down' : 'up'}` : '',
    ].filter(Boolean).join(', ')}`);
  }
  for (const p of PLAIN) {
    if (a[p] === b[p]) continue;
    parts.push(b[p] == null ? `${WORDS[p]} back to normal` : `${WORDS[p]} ${num(b[p])}px`);
  }
  const where = step.scope === 'all' ? '' : ` (${SCOPES.find(s => s.id === step.scope)?.label})`;
  return `${step.name}: ${parts.join(', ') || 'no change'}${where}`;
}

/** What a picked thing is called in the lists: its words, or its tag. */
function nameOf(el) {
  if (!el) return 'Something';
  const words = el.textContent.trim().replace(/\s+/g, ' ');
  if (!words) return `<${el.tagName.toLowerCase()}>`;
  return `“${words.length > 28 ? `${words.slice(0, 27)}…` : words}”`;
}

function put(sc, sel, snap) {
  const rules = (edits[sc] ||= {});
  if (snap === undefined || !Object.keys(snap).length) delete rules[sel];
  else rules[sel] = copy(snap);
  if (!Object.keys(rules).length) delete edits[sc];
}

/** Changes values of the picked thing ({ prop: px, or null to drop it }) as one step. */
function change(values) {
  if (!selector) return;
  const before = copy(edits[scope]?.[selector]);
  const v = { ...(before || {}) };
  for (const [prop, value] of Object.entries(values)) {
    const inFile = fileRules[scope]?.[selector]?.[prop] != null;
    if (value === null) {
      if (inFile) v[prop] = null;
      else delete v[prop];
    } else {
      v[prop] = value;
    }
  }
  put(scope, selector, v);
  const after = copy(edits[scope]?.[selector]);
  message = '';
  if (same(before, after)) { render(); return; }

  // A change drops what was undone. Quick changes to the same thing
  // (a drag, typing a number, a run of arrow presses) are one step.
  steps = steps.slice(0, at);
  const last = steps[steps.length - 1];
  const now = Date.now();
  if (last && last.scope === scope && last.sel === selector && now - last.t < 1200) {
    last.after = after;
    last.t = now;
    if (same(last.before, last.after)) steps.pop();
  } else {
    steps.push({ scope, sel: selector, name: nameOf(picked), before, after, t: now });
  }
  at = steps.length;
  persist();
  render();
}

function undo() {
  if (!at) return;
  const s = steps[at - 1];
  put(s.scope, s.sel, s.before);
  at -= 1;
  message = '';
  persist();
  render();
}

function redo() {
  if (at >= steps.length) return;
  const s = steps[at];
  put(s.scope, s.sel, s.after);
  at += 1;
  message = '';
  persist();
  render();
}

/* ---------- Saving into the files ---------- */

// The folder the files are saved in, remembered by the browser between
// visits (IndexedDB keeps the permission handle, not the files).
function idb(mode, act) {
  return new Promise((resolve) => {
    let open;
    try { open = indexedDB.open('cc-tweak', 1); } catch { resolve(null); return; }
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      let req;
      try { req = act(db.transaction('handles', mode).objectStore('handles')); } catch { db.close(); resolve(null); return; }
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); resolve(null); };
    };
  });
}
const savedFolder = () => idb('readonly', s => s.get('css-folder'));
const keepFolder = (dir) => idb('readwrite', s => s.put(dir, 'css-folder'));

/** In a chosen folder, the one that holds tweaks.css (docs/src/css). */
async function findCss(dir) {
  for (const path of [['src', 'css'], ['docs', 'src', 'css'], ['css'], []]) {
    try {
      let d = dir;
      for (const part of path) d = await d.getDirectoryHandle(part);
      await d.getFileHandle('tweaks.css');
      return d;
    } catch { /* not in this one */ }
  }
  return null;
}

async function cssFolder() {
  const kept = await savedFolder();
  if (kept) {
    try {
      let state = await kept.queryPermission({ mode: 'readwrite' });
      if (state !== 'granted') state = await kept.requestPermission({ mode: 'readwrite' });
      if (state === 'granted' && await findCss(kept)) return kept;
    } catch { /* ask again below */ }
  }
  let dir;
  try {
    dir = await window.showDirectoryPicker({ id: 'campus-compass', mode: 'readwrite' });
  } catch {
    message = 'Not saved: no folder was chosen.';
    return null;
  }
  const css = await findCss(dir);
  if (!css) {
    message = 'That folder has no src/css/tweaks.css. Choose the project’s “docs” folder.';
    return null;
  }
  await keepFolder(css);
  return css;
}

async function writeFile(dir, name, text) {
  const file = await dir.getFileHandle(name, { create: true });
  const out = await file.createWritable();
  await out.write(text);
  await out.close();
}

/** After a save: the page (and the browser's copy of the file) use the new tweaks.css. */
async function freshSheet() {
  await Promise.all(['tweaks.css', 'tweaks-history.json']
    .map(name => fetch(urlOf(name), { cache: 'reload' }).catch(() => null)));
  const old = sheetLink();
  if (!old) return;
  const fresh = old.cloneNode();
  fresh.href = `${old.href.split('?')[0]}?v=${Date.now()}`;
  fresh.addEventListener('load', () => {
    old.remove();
    fileSheet = fresh.sheet;
    if (host && fileSheet) fileSheet.disabled = true;
  }, { once: true });
  old.after(fresh);
}

/**
 * Writes `rules` as tweaks.css and adds a History entry. Where the
 * browser can't write files, shows the text to copy instead.
 */
async function writeRules(rules, summary) {
  const text = crlf(`${FILE_HEAD}${rules ? `\n${rules}\n` : ''}`);
  if (!isLocal || typeof window.showDirectoryPicker !== 'function') {
    showCopy(text, isLocal
      ? 'This browser can’t save files. Use Chrome or Edge, or copy this over src/css/tweaks.css:'
      : 'Saving works while the site runs on your computer. Here, copy this over src/css/tweaks.css:');
    return false;
  }
  const dir = await cssFolder();
  if (!dir) { render(); return false; }
  const history = [{ at: new Date().toISOString(), summary, css: rules }, ...versions].slice(0, MAX_VERSIONS);
  try {
    await writeFile(dir, 'tweaks.css', text);
    await writeFile(dir, 'tweaks-history.json', crlf(`${JSON.stringify(history, null, 2)}\n`));
  } catch {
    message = 'Not saved: the browser could not write to that folder.';
    render();
    return false;
  }
  versions = history;
  fileRules = parseCss(rules);
  edits = {};
  steps = [];
  at = 0;
  persist();
  message = `Saved ${when(history[0].at).replace('Today ', 'at ')}. Refresh and it is there; commit and push to share it.`;
  render();
  await freshSheet();
  return true;
}

async function saveNow() {
  if (!unsaved()) return;
  const words = [...new Set(steps.slice(0, at).map(describe))].join('; ');
  const summary = words ? (words.length > 240 ? `${words.slice(0, 239)}…` : words) : 'Changes';
  await writeRules(cssOf(merged()), summary);
}

async function goBack(i) {
  const v = versions[i];
  if (!v) return;
  if (unsaved() && !confirm('Your changes that are not saved will be dropped. Go back anyway?')) return;
  edits = {};
  steps = [];
  at = 0;
  persist();
  await writeRules(v.css, `Went back to the save from ${when(v.at)}${v.summary ? `: ${v.summary.length > 80 ? `${v.summary.slice(0, 79)}…` : v.summary}` : ''}`);
}

function showCopy(text, why) {
  message = why;
  render();
  const out = $('[data-out]');
  out.innerHTML = '<textarea readonly></textarea>';
  const area = out.querySelector('textarea');
  area.value = text;
  area.select();
  navigator.clipboard?.writeText(text).then(() => {
    message = `${why.replace(/:$/, '.')} It is copied already.`;
    $('[data-message]').textContent = message;
  }).catch(() => {});
}

/* ---------- Naming what was picked ---------- */
const skipClass = (c) => /^(is-|has-|cc-tw)/.test(c) || c === 'reveal';
const countOf = (sel) => { try { return document.querySelectorAll(sel).length; } catch { return 0; } };

/** The element's most telling class: the one the fewest elements share. */
function bestClass(el) {
  const cls = [...el.classList].filter(c => !skipClass(c));
  if (!cls.length) return null;
  return cls.map(c => ({ c, n: countOf(`.${CSS.escape(c)}`) }))
    .sort((a, b) => a.n - b.n || b.c.length - a.c.length)[0].c;
}

/** A path of child steps to just this element, from the nearest id or one-of-a-kind class. */
function pathTo(el) {
  const parts = [];
  let node = el;
  while (node && node !== document.body && node.parentElement) {
    if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); return parts.join(' > '); }
    const c = bestClass(node);
    if (c && countOf(`.${CSS.escape(c)}`) === 1) { parts.unshift(`.${CSS.escape(c)}`); return parts.join(' > '); }
    const tag = node.tagName.toLowerCase();
    const i = [...node.parentElement.children].filter(s => s.tagName === node.tagName).indexOf(node) + 1;
    parts.unshift(`${tag}${c ? `.${CSS.escape(c)}` : ''}:nth-of-type(${i})`);
    node = node.parentElement;
  }
  parts.unshift('body');
  return parts.join(' > ');
}

/** The ways to name an element, widest first: { sel, n, label }. */
function candidates(el) {
  const out = [];
  const own = bestClass(el);
  let up = el.parentElement;
  while (up && up !== document.body && !bestClass(up)) up = up.parentElement;
  const around = up && up !== document.body ? `.${CSS.escape(bestClass(up))}` : null;
  if (own) out.push({ sel: `.${CSS.escape(own)}`, label: 'Every copy of it' });
  if (own && around) out.push({ sel: `${around} .${CSS.escape(own)}`, label: 'Only the ones in this part of the page' });
  out.push({ sel: pathTo(el), label: 'Only this one' });
  const seen = new Set();
  return out.filter(c => !seen.has(c.sel) && seen.add(c.sel))
    .map(c => ({ ...c, n: countOf(c.sel) })).filter(c => c.n > 0);
}

/** A value as the page has it now, in px. */
function current(el, prop) {
  const cs = getComputedStyle(el);
  if (prop === 'x' || prop === 'y') {
    const t = cs.translate;
    if (!t || t === 'none') return 0;
    const [x, y = '0'] = t.split(/\s+/);
    return parseFloat(prop === 'x' ? x : y) || 0;
  }
  if (prop === 'letter-spacing') return cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
  if (prop === 'gap') return cs.columnGap === 'normal' ? 0 : parseFloat(cs.columnGap) || 0;
  return parseFloat(cs.getPropertyValue(prop)) || 0;
}

/* ---------- The panel ---------- */
const PANEL_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .box { position: fixed; pointer-events: none; border-radius: 3px; display: none; }
  .box--hover { outline: 1px dashed #B0EA00; background: rgba(176, 234, 0, 0.08); }
  .box--picked { outline: 2px solid #B0EA00; box-shadow: 0 0 0 4px rgba(176, 234, 0, 0.25); }
  .panel {
    position: fixed; width: min(320px, calc(100vw - 16px)); max-height: min(82vh, 700px);
    display: flex; flex-direction: column; pointer-events: auto;
    background: #0E1F38; color: #EEEBE3; border: 1px solid #2A4268; border-radius: 14px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .head {
    display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px;
    cursor: grab; user-select: none; touch-action: none; border-bottom: 1px solid #2A4268;
  }
  .head:active { cursor: grabbing; }
  .title { flex: 1; font-weight: 700; }
  .body { padding: 10px 12px 12px; overflow: auto; display: grid; gap: 12px; }
  .panel.is-min .body { display: none; }
  .panel.is-min .head { border-bottom: 0; }
  section { display: grid; gap: 8px; }
  h3 { margin: 0; font-size: 13px; font-weight: 700; color: #B0EA00; }
  button {
    font: inherit; color: inherit; background: #1B3253; border: 1px solid #2A4268;
    border-radius: 999px; padding: 5px 11px; cursor: pointer;
  }
  button:hover { background: #24406A; }
  button:disabled { opacity: 0.4; cursor: default; background: #1B3253; }
  button.on, button.go { background: #B0EA00; color: #0B1B33; border-color: #B0EA00; font-weight: 700; }
  button.go:disabled { background: #2C4A2A; border-color: #2C4A2A; color: #93A88F; opacity: 1; }
  button.icon { width: 28px; height: 28px; padding: 0; border-radius: 50%; }
  button.small { padding: 2px 9px; font-size: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .hint { margin: 0; color: #A9B6C9; font-size: 12px; }
  .what { margin: 0; font-weight: 600; word-break: break-word; }
  label.pick { display: grid; gap: 3px; font-size: 12px; color: #A9B6C9; }
  select {
    width: 100%; font: inherit; color: #EEEBE3; background: #132A48;
    border: 1px solid #2A4268; border-radius: 8px; padding: 5px 6px;
  }
  fieldset { margin: 0; padding: 0; border: 0; display: grid; gap: 4px; }
  legend { padding: 0; margin-bottom: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A9B6C9; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .grid label { display: grid; gap: 2px; font-size: 11px; color: #A9B6C9; }
  input {
    width: 100%; font: inherit; color: inherit; background: #132A48;
    border: 1px solid #2A4268; border-radius: 8px; padding: 4px 6px;
  }
  input.set { border-color: #B0EA00; background: #1E3A1F; }
  .message { margin: 0; font-size: 12px; color: #D9F99D; }
  .message:empty { display: none; }
  ol, ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
  .steps li { font-size: 12px; padding: 4px 8px; border-radius: 8px; background: #132A48; }
  .steps li.undone { opacity: 0.45; text-decoration: line-through; }
  .versions li { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center;
    padding: 6px 8px; border-radius: 8px; background: #132A48; font-size: 12px; }
  .versions .when { font-weight: 700; }
  .versions .sum { grid-column: 1; color: #C9D3E1; word-break: break-word; }
  .versions .act { grid-column: 2; grid-row: 1 / span 2; }
  .now { font-size: 11px; font-weight: 700; color: #0B1B33; background: #B0EA00; border-radius: 999px; padding: 2px 8px; }
  details { border-top: 1px solid #2A4268; padding-top: 8px; }
  summary { cursor: pointer; font-weight: 700; color: #EEEBE3; }
  details > :not(summary) { margin-top: 8px; }
  code { font: 11px/1.4 ui-monospace, monospace; color: #C9D3E1; word-break: break-all; }
  textarea { width: 100%; height: 120px; font: 11px/1.4 ui-monospace, monospace; color: inherit; background: #132A48; border: 1px solid #2A4268; border-radius: 8px; }
  .is-disabled { opacity: 0.45; pointer-events: none; }
`;

let host = null;
let root = null;
let live = null;
let ac = null;
let picking = false;
let picked = null;
let pickedIndex = 0;
let selector = '';
let scope = 'all';
let drag = null;
let swallowClick = false;
let message = '';

const $ = (sel) => root.querySelector(sel);
const inTool = (e) => host && e.composedPath().includes(host);
const typing = (e) => /^(input|select|textarea)$/i.test(e.composedPath()[0]?.tagName || '');

function render() {
  if (!host) return;
  live.textContent = cssOf(merged());
  if (fileSheet) fileSheet.disabled = true;   // the tool shows the file's rules itself, changes and all

  // ① Pick
  $('[data-pick]').classList.toggle('on', picking);
  $('[data-pick]').textContent = picking ? 'Picking… (Esc to stop)' : 'Pick';
  $('[data-up]').disabled = !picked;
  root.querySelectorAll('[data-scope]').forEach(b => b.classList.toggle('on', b.dataset.scope === scope));
  if (picked) {
    const tag = picked.tagName.toLowerCase();
    $('[data-what]').textContent = `Picked: ${nameOf(picked)}${nameOf(picked).startsWith('<') ? '' : ` (${tag})`}`;
    const opts = candidates(picked);
    if (!opts.some(o => o.sel === selector)) selector = opts[0]?.sel || '';
    $('[data-applies]').innerHTML = opts.map(o =>
      `<option value="${esc(o.sel)}"${o.sel === selector ? ' selected' : ''}>${esc(o.label)} (${o.n} on this page)</option>`).join('');
    $('[data-rule]').textContent = selector;
  } else {
    $('[data-what]').textContent = 'Nothing picked yet: press Pick, then click something on the page.';
    $('[data-applies]').innerHTML = '';
    $('[data-rule]').textContent = '—';
  }
  $('[data-applies-row]').classList.toggle('is-disabled', !picked);

  // ② Change it
  $('[data-fields]').classList.toggle('is-disabled', !picked);
  if (picked) {
    const mine = merged()[scope]?.[selector] || {};
    root.querySelectorAll('input[data-prop]').forEach(input => {
      const p = input.dataset.prop;
      if (root.activeElement !== input) input.value = num(current(picked, p));
      input.classList.toggle('set', mine[p] != null);
    });
  }

  // ③ Save
  const n = unsaved();
  $('[data-undo]').disabled = !at;
  $('[data-redo]').disabled = at >= steps.length;
  $('[data-save]').disabled = !n;
  $('[data-save]').textContent = n ? `Save (${n})` : 'Saved';
  $('[data-message]').textContent = message;
  $('[data-steps]').innerHTML = steps.length
    ? steps.map((s, i) => `<li class="${i >= at ? 'undone' : ''}">${esc(describe(s))}</li>`).reverse().join('')
    : '<li>No changes yet.</li>';
  $('[data-steps-head]').textContent = steps.length ? 'Not saved yet (newest first)' : '';

  // History
  const nowCss = norm(cssOf(fileRules));
  $('[data-history-count]').textContent = versions.length ? `History (${versions.length})` : 'History';
  $('[data-versions]').innerHTML = versions.length
    ? versions.map((v, i) => `
        <li>
          <span class="when">${esc(when(v.at))}</span>
          <span class="act">${i === 0 && norm(v.css) === nowCss && !n
            ? '<span class="now">Now</span>'
            : `<button class="small" type="button" data-back="${i}">Go back</button>`}</span>
          <span class="sum">${esc(v.summary || 'Changes')}</span>
        </li>`).join('')
    : '<li><span class="sum">Nothing saved yet. Each Save shows up here.</span></li>';
  $('[data-discard]').disabled = !n && !steps.length;
}

function placeBox(box, el) {
  if (!el || !el.isConnected) { box.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

function pick(el) {
  picked = el;
  selector = '';
  message = '';
  render();
  pickedIndex = Math.max(0, [...document.querySelectorAll(selector)].indexOf(el));
}

function follow() {
  if (!host) return;
  // A redraw of the page replaces the element: find it again by its selector.
  if (picked && !picked.isConnected && selector) {
    picked = document.querySelectorAll(selector)[pickedIndex] || document.querySelector(selector);
    if (picked) render();
  }
  placeBox($('.box--picked'), picked);
  requestAnimationFrame(follow);
}

function placePanel(panel, pos) {
  const w = panel.offsetWidth || 320;
  const h = panel.offsetHeight || 200;
  const left = Math.min(Math.max(8, pos?.left ?? innerWidth - w - 16), innerWidth - w - 8);
  const top = Math.min(Math.max(8, pos?.top ?? innerHeight - h - 16), innerHeight - 48);
  Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
  return { left, top };
}

function build() {
  host = document.createElement('div');
  host.id = 'cc-tweak';
  host.style.cssText = 'position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;';
  root = host.attachShadow({ mode: 'open' });
  const field = (p, label) => `<label>${label}<input type="number" step="1" inputmode="decimal" data-prop="${p}"></label>`;
  root.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="box box--hover"></div>
    <div class="box box--picked"></div>
    <div class="panel" role="dialog" aria-label="Layout tweaks">
      <div class="head" data-drag>
        <span class="title">Layout tweaks</span>
        <button class="icon" type="button" data-min aria-label="Fold the panel">–</button>
        <button class="icon" type="button" data-close aria-label="Close the layout tool">×</button>
      </div>
      <div class="body">
        <p class="hint">Pick something, change it, Save. Refresh and it is there. Drag this panel by its title.</p>

        <section>
          <h3>① Pick something</h3>
          <div class="row">
            <button type="button" data-pick>Pick</button>
            <button type="button" data-up>The box around it</button>
          </div>
          <p class="what" data-what></p>
          <div data-applies-row>
            <label class="pick">Change<select data-applies></select></label>
          </div>
          <div class="row" role="group" aria-label="On which screens">
            ${SCOPES.map(s => `<button type="button" data-scope="${s.id}">${s.label}</button>`).join('')}
          </div>
        </section>

        <section data-fields>
          <h3>② Change it</h3>
          ${FIELDS.map(f => `
            <fieldset>
              <legend>${f.group}</legend>
              <div class="grid">${f.items.map(([p, l]) => field(p, l)).join('')}</div>
            </fieldset>`).join('')}
          <p class="hint">Or drag it, or use the arrow keys (Shift: 10px). Numbers are px; empty a box to undo just that.</p>
          <div class="row"><button type="button" class="small" data-reset>Put this one back to normal</button></div>
        </section>

        <section>
          <h3>③ Save</h3>
          <div class="row">
            <button type="button" data-undo aria-label="Undo (Ctrl+Z)">↶ Undo</button>
            <button type="button" data-redo aria-label="Redo (Ctrl+Y)">↷ Redo</button>
            <button type="button" class="go" data-save>Save</button>
          </div>
          <p class="message" data-message></p>
          <div data-out></div>
          <p class="hint" data-steps-head></p>
          <ol class="steps" data-steps></ol>
        </section>

        <details data-history>
          <summary data-history-count>History</summary>
          <p class="hint">Every Save, newest first. Go back makes that one current again.</p>
          <ul class="versions" data-versions></ul>
        </details>

        <details>
          <summary>More</summary>
          <div class="row">
            <button type="button" class="small" data-copy>Copy CSS</button>
            <button type="button" class="small" data-discard>Drop unsaved changes</button>
          </div>
          <p class="hint">The rule for what is picked: <code data-rule></code></p>
        </details>
      </div>
    </div>`;
  document.body.append(host);

  live = document.createElement('style');
  live.id = 'cc-tweaks-live';
  document.head.append(live);

  const panel = $('.panel');
  let pos = placePanel(panel, load('localStorage', POS_KEY, null));
  const sig = { signal: ac.signal };

  // The panel moves by its title bar and stays where it is left.
  $('[data-drag]').addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const start = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top };
    const move = (ev) => { pos = placePanel(panel, { left: start.left + ev.clientX - start.x, top: start.top + ev.clientY - start.y }); };
    const up = () => { removeEventListener('pointermove', move); save('localStorage', POS_KEY, pos); };
    addEventListener('pointermove', move, sig);
    addEventListener('pointerup', up, { once: true, signal: ac.signal });
  }, sig);
  addEventListener('resize', () => { pos = placePanel(panel, pos); }, sig);

  $('[data-min]').addEventListener('click', () => panel.classList.toggle('is-min'), sig);
  $('[data-close]').addEventListener('click', closeTweak, sig);
  $('[data-pick]').addEventListener('click', () => { picking = !picking; $('.box--hover').style.display = 'none'; render(); }, sig);
  $('[data-up]').addEventListener('click', () => {
    const up = picked?.parentElement;
    if (up && up !== document.body && up !== document.documentElement) pick(up);
  }, sig);
  $('[data-applies]').addEventListener('change', (e) => { selector = e.target.value; render(); }, sig);
  root.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => { scope = b.dataset.scope; render(); }, sig));
  root.querySelectorAll('input[data-prop]').forEach(input => {
    input.addEventListener('input', () => {
      const v = input.value.trim();
      if (v === '') return;
      const n = parseFloat(v);
      if (Number.isFinite(n)) change({ [input.dataset.prop]: n });
    }, sig);
    input.addEventListener('change', () => { if (input.value.trim() === '') change({ [input.dataset.prop]: null }); }, sig);
  });
  $('[data-reset]').addEventListener('click', () => {
    const mine = merged()[scope]?.[selector] || {};
    change(Object.fromEntries(Object.keys(mine).map(p => [p, null])));
  }, sig);
  $('[data-undo]').addEventListener('click', undo, sig);
  $('[data-redo]').addEventListener('click', redo, sig);
  $('[data-save]').addEventListener('click', saveNow, sig);
  $('[data-versions]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-back]');
    if (b) goBack(Number(b.dataset.back));
  }, sig);
  $('[data-copy]').addEventListener('click', () => {
    const rules = cssOf(merged());
    showCopy(crlf(`${FILE_HEAD}${rules ? `\n${rules}\n` : ''}`), 'Copy this over src/css/tweaks.css:');
  }, sig);
  $('[data-discard]').addEventListener('click', () => {
    if (!confirm('Drop the changes that are not saved?')) return;
    edits = {};
    steps = [];
    at = 0;
    message = '';
    persist();
    render();
  }, sig);

  // Picking and dragging, before the page's own handlers see the pointer.
  const opts = { capture: true, signal: ac.signal };
  addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      change({ x: Math.round(drag.tx + dx), y: Math.round(drag.ty + dy) });
      return;
    }
    if (picking && !inTool(e)) placeBox($('.box--hover'), e.target);
  }, opts);
  addEventListener('pointerdown', (e) => {
    if (!picking || inTool(e)) return;
    e.stopPropagation();
    if (picked && picked.contains(e.target) && e.button === 0) {
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, tx: current(picked, 'x'), ty: current(picked, 'y'), moved: false };
    }
  }, opts);
  addEventListener('pointerup', () => {
    if (drag?.moved) swallowClick = true;
    drag = null;
  }, opts);
  addEventListener('click', (e) => {
    if (!picking || inTool(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (swallowClick) { swallowClick = false; return; }
    pick(e.target);
  }, opts);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && picking) { picking = false; $('.box--hover').style.display = 'none'; render(); return; }
    if (typing(e)) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'y')) {
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redo();
      else undo();
      return;
    }
    if (!picking || !picked) return;
    const step = e.shiftKey ? 10 : 1;
    const by = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!by) return;
    e.preventDefault();
    change({ x: current(picked, 'x') + by[0], y: current(picked, 'y') + by[1] });
  }, opts);

  render();
  pos = placePanel(panel, pos);
  requestAnimationFrame(follow);
}

/* ---------- Open and close ---------- */
export function openTweak() {
  if (host) return;
  save('sessionStorage', ON_KEY, 'on');
  ac = new AbortController();
  readFile();
  build();
  loadVersions();
}

export function closeTweak() {
  if (!host) return;
  save('sessionStorage', ON_KEY, null);
  ac.abort();
  host.remove();
  live.remove();
  if (fileSheet) fileSheet.disabled = false;
  host = root = live = null;
  picking = false;
  picked = null;
  drag = null;
}

export function toggleTweak() {
  if (host) closeTweak();
  else openTweak();
}
