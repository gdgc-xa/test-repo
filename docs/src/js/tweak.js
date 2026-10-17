/* ============================================================
   tweak.js — the layout tool: move words and boxes by hand.

   Open it with ?tweak at the end of the address (it then stays on
   for the visit) or Ctrl+Alt+T; × closes it. main.js loads this file
   only then, so visitors never download it.

     Pick        click any word or box on the page (its own links and
                 buttons don't fire while picking). "Box around it"
                 picks what holds it, e.g. the whole button.
     Move        drag the picked thing, press the arrow keys (Shift:
                 10px) or type X / Y.
     Margin, padding, gap, size, letter spacing
                 type a number of px; clear a box to drop that change.
     Applies to  every copy of the element (its own class, on every
                 page), the copies inside one part of the page, or just
                 this one.
     Screens     all sizes, phones only (720px and under) or wider.
     Copy CSS    the whole of src/css/tweaks.css with your changes in
                 it: paste it over that file to keep them for everyone.

   Changes show at once and stay in this browser until you clear them
   (after pasting); tweaks.css is what carries them to the site. The
   panel drags by its title bar and is put back where you left it.
   ============================================================ */

const EDITS_KEY = 'cc-tweak-edits';
const POS_KEY = 'cc-tweak-pos';
const ON_KEY = 'cc-tweak';

const SCOPES = [
  { id: 'all', label: 'All sizes', media: null },
  { id: 'phone', label: 'Phones', media: '(max-width: 720px)' },
  { id: 'wide', label: 'Wider', media: '(min-width: 721px)' },
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

// The top of tweaks.css, as Copy CSS writes it.
const FILE_HEAD = `/* ============================================================
   tweaks.css — hand adjustments, loaded last so they win.

   Made with the layout tool (src/js/tweak.js): add ?tweak to the
   site's address (or press Ctrl+Alt+T), pick a word or a box, move
   it or change its margins, then "Copy CSS" and paste the result
   over this whole file. A rule names the element's own class, so it
   moves every copy of that element (every sport page's "Next"), on
   the screen sizes its @media says.

   To undo one change: delete its line. To undo all: keep only this
   comment.
   ============================================================ */
`;

/* ---------- Storage (a private window may refuse it, even to look) ---------- */
const load = (store, key, fallback) => {
  try { return JSON.parse(window[store].getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (store, key, value) => {
  try { value == null ? window[store].removeItem(key) : window[store].setItem(key, JSON.stringify(value)); } catch { /* not kept */ }
};

/* ---------- The changes: tweaks.css, then this browser's edits ---------- */
let fileSheet = null;
let fileRules = {};                              // { scope: { selector: { prop: px } } }
let edits = load('localStorage', EDITS_KEY, {}); // the same; null drops the file's value

const norm = (m) => String(m).replace(/\s+/g, '').toLowerCase();
const num = (v) => String(Math.round(v * 100) / 100);

function readFile() {
  fileSheet = [...document.styleSheets].find(s => /tweaks\.css(\?|$)/.test(s.href || '')) || null;
  fileRules = {};
  let rules = [];
  try { rules = fileSheet ? [...fileSheet.cssRules] : []; } catch { rules = []; }
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
      const bucket = (fileRules[scope] ||= {});
      bucket[rule.selectorText] = { ...bucket[rule.selectorText], ...v };
    }
  };
  for (const r of rules) {
    if (r instanceof CSSMediaRule) {
      const scope = SCOPES.find(s => s.media && norm(s.media) === norm(r.conditionText || r.media.mediaText));
      if (scope) [...r.cssRules].forEach(inner => take(inner, scope.id));
    } else {
      take(r, 'all');
    }
  }
}

/** tweaks.css with this browser's edits laid over it. */
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

const editCount = () => Object.values(edits).reduce((n, rules) =>
  n + Object.values(rules).reduce((m, v) => m + Object.keys(v).length, 0), 0);

/* ---------- Picking a selector for an element ---------- */
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
  const steps = [];
  let node = el;
  while (node && node !== document.body && node.parentElement) {
    if (node.id) { steps.unshift(`#${CSS.escape(node.id)}`); return steps.join(' > '); }
    const c = bestClass(node);
    if (c && countOf(`.${CSS.escape(c)}`) === 1) { steps.unshift(`.${CSS.escape(c)}`); return steps.join(' > '); }
    const tag = node.tagName.toLowerCase();
    const i = [...node.parentElement.children].filter(s => s.tagName === node.tagName).indexOf(node) + 1;
    steps.unshift(`${tag}${c ? `.${CSS.escape(c)}` : ''}:nth-of-type(${i})`);
    node = node.parentElement;
  }
  steps.unshift('body');
  return steps.join(' > ');
}

/** The ways to name an element, widest first: { sel, n, label }. */
function candidates(el) {
  const out = [];
  const own = bestClass(el);
  let up = el.parentElement;
  while (up && up !== document.body && !bestClass(up)) up = up.parentElement;
  const around = up && up !== document.body ? `.${CSS.escape(bestClass(up))}` : null;
  if (own) out.push({ sel: `.${CSS.escape(own)}`, label: 'Every copy' });
  if (own && around) out.push({ sel: `${around} .${CSS.escape(own)}`, label: `Inside ${around}` });
  out.push({ sel: pathTo(el), label: 'Just this one' });
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
    position: fixed; width: min(312px, calc(100vw - 16px)); max-height: min(78vh, 640px);
    display: flex; flex-direction: column; pointer-events: auto;
    background: #0E1F38; color: #EEEBE3; border: 1px solid #2A4268; border-radius: 14px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .head {
    display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px;
    cursor: grab; user-select: none; touch-action: none; border-bottom: 1px solid #2A4268;
  }
  .head:active { cursor: grabbing; }
  .title { flex: 1; font-weight: 700; letter-spacing: 0.02em; }
  .body { padding: 10px 12px 12px; overflow: auto; display: grid; gap: 10px; }
  .panel.is-min .body { display: none; }
  .panel.is-min .head { border-bottom: 0; }
  button {
    font: inherit; color: inherit; background: #1B3253; border: 1px solid #2A4268;
    border-radius: 999px; padding: 5px 11px; cursor: pointer;
  }
  button:hover { background: #24406A; }
  button.on { background: #B0EA00; color: #0B1B33; border-color: #B0EA00; font-weight: 700; }
  button.icon { width: 28px; height: 28px; padding: 0; border-radius: 50%; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .hint { margin: 0; color: #A9B6C9; font-size: 12px; }
  .what { margin: 0; font-weight: 600; word-break: break-all; }
  select {
    width: 100%; font: inherit; color: inherit; background: #132A48;
    border: 1px solid #2A4268; border-radius: 8px; padding: 5px 6px;
  }
  fieldset { margin: 0; padding: 0; border: 0; display: grid; gap: 4px; }
  legend { padding: 0; margin-bottom: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #B0EA00; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  label { display: grid; gap: 2px; font-size: 11px; color: #A9B6C9; }
  input {
    width: 100%; font: inherit; color: inherit; background: #132A48;
    border: 1px solid #2A4268; border-radius: 8px; padding: 4px 6px;
  }
  input.set { border-color: #B0EA00; background: #1E3A1F; }
  .status { margin: 0; font-size: 12px; color: #A9B6C9; }
  textarea { width: 100%; height: 140px; font: 11px/1.4 ui-monospace, monospace; color: inherit; background: #132A48; border: 1px solid #2A4268; border-radius: 8px; }
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

const $ = (sel) => root.querySelector(sel);
const inTool = (e) => host && e.composedPath().includes(host);
const typing = (e) => /^(input|select|textarea)$/i.test(e.composedPath()[0]?.tagName || '');

function render() {
  live.textContent = cssOf(merged());
  if (fileSheet) fileSheet.disabled = true;   // the tool shows the file's rules itself, edits and all
  const n = editCount();
  $('[data-status]').textContent = n
    ? `${n} change${n === 1 ? '' : 's'} not in tweaks.css yet: Copy CSS and paste it over src/css/tweaks.css, then Clear.`
    : 'Everything here is in tweaks.css.';
  $('[data-clear]').classList.toggle('is-disabled', !n);
  $('[data-pick]').classList.toggle('on', picking);
  $('[data-pick]').textContent = picking ? 'Picking… (Esc)' : 'Pick';
  root.querySelectorAll('[data-scope]').forEach(b => b.classList.toggle('on', b.dataset.scope === scope));

  const fields = $('[data-fields]');
  fields.classList.toggle('is-disabled', !picked);
  $('[data-up]').classList.toggle('is-disabled', !picked);
  $('[data-reset]').classList.toggle('is-disabled', !picked);
  if (!picked) {
    $('[data-what]').textContent = 'Nothing picked yet.';
    $('[data-applies]').innerHTML = '';
    return;
  }
  const tag = picked.tagName.toLowerCase();
  const words = picked.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
  $('[data-what]').textContent = `<${tag}>${words ? ` “${words}”` : ''}`;
  const opts = candidates(picked);
  if (!opts.some(o => o.sel === selector)) selector = opts[0]?.sel || '';
  $('[data-applies]').innerHTML = opts.map(o =>
    `<option value="${o.sel.replace(/"/g, '&quot;')}"${o.sel === selector ? ' selected' : ''}>${o.label} · ${o.n} here · ${o.sel.replace(/</g, '&lt;')}</option>`).join('');
  const mine = merged()[scope]?.[selector] || {};
  root.querySelectorAll('input[data-prop]').forEach(input => {
    const p = input.dataset.prop;
    if (root.activeElement !== input) input.value = num(current(picked, p));
    input.classList.toggle('set', mine[p] != null);
  });
}

function setValue(prop, value) {
  if (!selector) return;
  const rules = (edits[scope] ||= {});
  const v = (rules[selector] ||= {});
  const inFile = fileRules[scope]?.[selector]?.[prop] != null;
  if (value === null) {
    if (inFile) v[prop] = null;
    else delete v[prop];
  } else {
    v[prop] = value;
  }
  if (!Object.keys(v).length) delete rules[selector];
  if (!Object.keys(rules).length) delete edits[scope];
  save('localStorage', EDITS_KEY, Object.keys(edits).length ? edits : null);
  render();
}

function pick(el) {
  picked = el;
  selector = '';
  render();
  pickedIndex = Math.max(0, [...document.querySelectorAll(selector)].indexOf(el));
}

function placeBox(box, el) {
  if (!el || !el.isConnected) { box.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
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
  const w = panel.offsetWidth || 312;
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
    <section class="panel" role="dialog" aria-label="Layout tweaks">
      <div class="head" data-drag>
        <span class="title">Layout tweaks</span>
        <button class="icon" type="button" data-min aria-label="Fold the panel">–</button>
        <button class="icon" type="button" data-close aria-label="Close the layout tool">×</button>
      </div>
      <div class="body">
        <div class="row">
          <button type="button" data-pick>Pick</button>
          <button type="button" data-up>Box around it</button>
        </div>
        <p class="what" data-what></p>
        <label>Applies to<select data-applies></select></label>
        <div class="row" role="group" aria-label="Screens">
          ${SCOPES.map(s => `<button type="button" data-scope="${s.id}">${s.label}</button>`).join('')}
        </div>
        <div data-fields>
          ${FIELDS.map(f => `
            <fieldset>
              <legend>${f.group}</legend>
              <div class="grid">${f.items.map(([p, l]) => field(p, l)).join('')}</div>
            </fieldset>`).join('')}
        </div>
        <p class="hint">Drag the picked thing, or the arrow keys (Shift: 10px). Numbers are px; clear a box to drop that change.</p>
        <div class="row">
          <button type="button" data-reset>Reset this</button>
          <button type="button" data-copy>Copy CSS</button>
          <button type="button" data-clear>Clear</button>
        </div>
        <p class="status" data-status></p>
        <div data-out></div>
      </div>
    </section>`;
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
      if (Number.isFinite(n)) setValue(input.dataset.prop, n);
    }, sig);
    input.addEventListener('change', () => { if (input.value.trim() === '') setValue(input.dataset.prop, null); }, sig);
  });
  $('[data-reset]').addEventListener('click', () => {
    const mine = merged()[scope]?.[selector] || {};
    Object.keys(mine).forEach(p => setValue(p, null));
  }, sig);
  $('[data-clear]').addEventListener('click', () => {
    if (!confirm('Clear the changes kept in this browser? Copy CSS first if they are not in tweaks.css yet.')) return;
    edits = {};
    save('localStorage', EDITS_KEY, null);
    render();
  }, sig);
  $('[data-copy]').addEventListener('click', async () => {
    const text = `${FILE_HEAD}\n${cssOf(merged())}\n`;
    const out = $('[data-out]');
    try {
      await navigator.clipboard.writeText(text);
      out.innerHTML = '<p class="hint">Copied. Paste it over src/css/tweaks.css.</p>';
    } catch {
      out.innerHTML = '<p class="hint">Copy this and paste it over src/css/tweaks.css:</p><textarea readonly></textarea>';
      const area = out.querySelector('textarea');
      area.value = text;
      area.select();
    }
  }, sig);

  // Picking and dragging, before the page's own handlers see the pointer.
  const opts = { capture: true, signal: ac.signal };
  addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      setValue('x', Math.round(drag.tx + dx));
      setValue('y', Math.round(drag.ty + dy));
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
    if (!picking || !picked || typing(e)) return;
    const step = e.shiftKey ? 10 : 1;
    const by = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!by) return;
    e.preventDefault();
    setValue('x', current(picked, 'x') + by[0]);
    setValue('y', current(picked, 'y') + by[1]);
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
