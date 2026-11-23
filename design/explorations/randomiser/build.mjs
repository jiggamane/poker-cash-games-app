/**
 * The Randomiser board: a live phone to try it on, then every state drawn in
 * light and dark, then what this draft decides and what it leaves open.
 *
 *   node design/explorations/randomiser/build.mjs
 *
 * Writes `index.html` beside this file. The phones are `screens.mjs`, drawn
 * with the full board's kit; the live phone is the same parts wired up with a
 * little script. Nothing here is the app.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSS, FONTS, push, bar, label, seg, ico } from '../full-board/kit.mjs';
import SCREENS, { section, faceUp, faceDown, ANSWERS } from './screens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const NAV = { push: 'pushed screen', sheet: 'sheet' };

/* ── the live phone ───────────────────────────────────────────────────── */

const MODES = ['Call or fold', 'My move', 'Bomb pot'];
const live = push({
  title: 'Randomiser', sub: 'a fair draw, nothing recorded',
  body: [
    `<div id="rz-seg">${seg(MODES, 0)}</div>`,
    `<div id="rz-table" style="display:flex;justify-content:center;padding:16px 0 8px;perspective:900px"><div id="rz-card" style="transition:transform .16s ease-in"></div></div>`,
    `<div id="rz-label"></div>`,
    `<div id="rz-chips"></div>`,
    `<p id="rz-live" class="sr" aria-live="polite"></p>`,
  ],
  bar: `<button type="button" id="rz-deal" class="rz-bar">${bar('Deal').replace('<div class="bar">', '<div class="bar" style="padding-bottom:12px">')}</button>`,
}).replace('<div class="scr">', '<div class="scr" id="rz-scr">');

const sizesSheet = `<div id="rz-sheet" hidden><div class="scrim"></div>
  <div class="modal" style="top:58px" role="dialog" aria-label="Bomb pot sizes"><div class="grab"></div>
    <div class="shd"><h2>Bomb pot sizes</h2><button type="button" class="x rz-plain" id="rz-close" aria-label="Close">${ico('close', 16)}</button></div>
    <p class="ssub">Saved on this phone. All equally likely.</p>
    <div class="mbody">
      <div class="card" id="rz-rows"></div>
      <div style="display:flex;gap:10px;align-items:flex-end"><div style="flex:1"><span class="fl">Add a size</span><div class="fi focus" id="rz-field"><span id="rz-typed"></span><span class="sfx">big blinds</span></div></div><button type="button" class="btn2 rz-plain" id="rz-add" style="width:96px">Add</button></div>
      <div style="flex:1"></div>
      <div class="kp" id="rz-kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'].map((k) => (k ? `<button type="button" class="rz-plain" data-k="${k}">${k}</button>` : '<span></span>')).join('')}<button type="button" class="rz-plain" data-k="del" aria-label="Delete">${ico('backspace', 22)}</button></div>
    </div>
    <button type="button" id="rz-save" class="rz-bar">${bar('Save')}</button>
  </div></div>`;
const livePhone = live.replace(/<\/div><\/div>$/, `${sizesSheet}</div></div>`);

/* Card faces, rendered once here so the live phone draws exactly what the board draws. */
const FACES = {
  back: faceDown(),
  ...Object.fromEntries(Object.entries(ANSWERS).map(([k, a]) => [k, faceUp(a)])),
  size: faceUp({ word: '×__N__', suit: 'd', size: 64, under: 'big blinds each' }),
};

/* ── what this draft decides, and what it leaves open ─────────────────── */

const DECIDED = [
  ['Where it lives', 'Poker tools, the fourth tile, in the half of the second row that was empty. Tonight’s Poker tools sheet draws the same tiles, so it is one tap from a live game.'],
  ['What it is', 'One pushed screen, /randomiser (Chrome A: back, nothing top-right). It is a place you stay in while the hand plays, not something you confirm, so it is not a sheet.'],
  ['Three decks', 'A segmented control: Call or fold (two answers), My move (Call, Fold, Raise, All in), Bomb pot (your sizes). It opens on the last deck used.'],
  ['The answer is a card', 'Face down until you deal. Deal turns it over on the answer and lights its chip below, so you see both the answer and what it was drawn from. Each answer has its own suit; the two that put chips in are red.'],
  ['Fair, and says so', '“1 in 2 each” / “1 in 4 each” over the chips. Every deal is independent and drawn from the phone’s secure random source, so the same answer can come twice running.'],
  ['Bomb pot sizes are yours', 'Multiples of the big blind (the Bomb pot booster states the ante that way). Added and removed on their own sheet, which ends in Save. At least two before Deal is live.'],
  ['Nothing is recorded', 'Like every poker tool, it never reads or writes the ledger. One option below would let it read tonight’s blinds.'],
];
const OPEN = [
  ['Where the sizes are saved', 'This draft keeps them on the phone. Saving them with the group instead means every phone at the table deals from the same list, and they could sit beside the group’s table rules, but it needs a server change. Recommendation: phone first, group later if asked for.'],
  ['Should Call or fold and My move be editable too?', 'Drawn as fixed, since the request asked for user variants on the bomb pot only.'],
  ['Weights', 'All answers are equally likely. A table might want All in rarer, or ×5 rarer than ×2. Not drawn; adding the same size twice is not allowed.'],
  ['Show the amount at tonight’s blinds', 'From Tonight, the bomb pot card could add “$30 each at $5 / $10”. That would make this the one tool that reads the night (blinds only, through packages/core). Drawn as an option.'],
  ['Half sizes and named sizes', '×1.5, or “double board ×2”. This draft takes whole numbers from 1 to 20.'],
  ['The tile’s drawing', 'A draft: a tossed red chip. It needs a pass on the icon board to sit with the other three.'],
  ['Every string', 'All of it is new and none of it is from a handoff. Listed under each phone.'],
];
const list = (items) => `<div class="pg-rules">${items.map(([b, t]) => `<div><b>${esc(b)}</b>${esc(t)}</div>`).join('')}</div>`;

const cell = (s) => `<figure class="cell" id="s-${s.id}"><div class="pg-ph">${s.html}</div>
  <figcaption><b>${esc(s.name)}</b><span class="pg-meta"><code>${esc(s.route)}</code> · ${NAV[s.nav] ?? s.nav}</span>${
    s.note ? `<span class="pg-nt">${esc(s.note)}</span>` : ''}${(s.flags ?? []).map((f) => `<span class="pg-flag">${esc(f)}</span>`).join('')}</figcaption></figure>`;

const page = `<title>Randomiser Design Board</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
/* Layout: brief, then a live phone beside how it works, then every state as a wrapping grid of phones, then decided and open. */
:root{--bg:#F4F5F7;--panel:#FFFFFF;--fg:#141A2A;--muted:#596171;--line:#DDE1E7;--flag:#8A5A00;--flagbg:#FFF4D6;
  --head:'Libre Franklin',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--flag:#F2CD7A;--flagbg:#3A2F12;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--flag:#F2CD7A;--flagbg:#3A2F12;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:400 15px/1.55 var(--body);margin:0}
.pg-wrap{max-width:1500px;margin:0 auto;padding-block:36px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.pg-eyebrow{font:600 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pg-wrap>header>h1{font:800 clamp(30px,4vw,42px)/1.05 var(--head);letter-spacing:-.025em;margin:10px 0 12px;text-wrap:balance}
.pg-wrap>section>h2{font:800 24px/1.15 var(--head);letter-spacing:-.02em;margin:0;text-wrap:balance}
.pg-wrap>header>p,.pg-wrap>section>p{margin:0;max-width:74ch;color:var(--muted)}
.pg-wrap>section{margin-top:48px;display:flex;flex-direction:column;gap:14px}
.pg-strip{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;background:var(--fg);color:var(--bg);border-radius:14px;padding:10px 14px;margin-top:18px}
.pg-strip b{font:800 14px var(--body)}
.pg-strip a{color:inherit;font-weight:600;font-size:13.5px;opacity:.8}
.pg-mode{display:inline-flex;background:rgba(127,127,127,.28);border-radius:999px;padding:3px;margin-left:auto}
.pg-mode button{font:700 12.5px var(--body);color:inherit;background:none;border:0;border-radius:999px;padding:6px 12px;cursor:pointer}
.pg-mode button[aria-pressed="true"]{background:var(--bg);color:var(--fg)}
.pg-mode button:focus-visible,.rz-plain:focus-visible,.rz-bar:focus-visible{outline:2px solid #2B6CDF;outline-offset:2px}
.pg-try{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.pg-try ol{margin:0;padding-left:20px;max-width:52ch;color:var(--muted);display:grid;gap:8px}.pg-try ol b{color:var(--fg)}
.pg-grid{display:flex;flex-wrap:wrap;gap:22px}
.cell{margin:0;width:330px;max-width:100%;display:flex;flex-direction:column;gap:10px}
.cell figcaption{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
.cell figcaption b{color:var(--fg);font-size:14.5px}
.pg-meta code{font-size:12px}
.pg-flag{background:var(--flagbg);color:var(--flag);border-radius:8px;padding:6px 9px;font-size:12.5px}
.pg-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.pg-rules div{background:var(--panel);border-radius:12px;padding:12px 14px;font-size:13.5px;color:var(--muted)}.pg-rules b{display:block;color:var(--fg);font-size:14px;margin-bottom:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:380px){.pg-ph{transform:scale(.9);transform-origin:top left;margin-bottom:-76px}}
${CSS}
/* The live phone: real buttons, drawn as the kit's parts. */
.rz-plain{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.rz-bar{display:block;width:100%;border:0;padding:0;background:none;cursor:pointer;text-align:inherit;font:inherit}
.rz-bar:disabled{cursor:default}
#rz-scr .seg span{cursor:pointer}
#rz-scr .chip{transition:background .08s,color .08s}
#rz-scr .kp>*{height:46px;display:grid;place-items:center;font:600 22px/1 var(--head);color:var(--text);border-bottom:1px solid var(--line);border-right:1px solid var(--line)}
#rz-scr .kp>*:nth-child(3n){border-right:0}
#rz-sheet .modal .shd .x{width:32px;height:32px;border-radius:50%;background:var(--raised);display:grid;place-items:center;color:var(--text)}
#rz-sheet .row .bin{color:var(--muted);width:32px;height:32px;display:grid;place-items:center}
#rz-sheet .btn2.dead{color:var(--dim);box-shadow:inset 0 0 0 1.5px var(--line);cursor:default}
@media (prefers-reduced-motion: reduce){#rz-card{transition:none!important}}
</style>
<div class="pg-wrap">
<header>
  <div class="pg-eyebrow">Design exploration · 23 November 2026 · not a handoff</div>
  <h1>Randomiser</h1>
  <p>${esc(section.blurb)} Drawn in the look approved on 22 November (the full board’s kit). <b>No app code has changed.</b> Approve or redirect here first.</p>
</header>
<nav class="pg-strip" aria-label="Board">
  <b>Randomiser</b><a href="#try">Try it</a><a href="#states">Every state</a><a href="#decided">Decided</a><a href="#open">Open</a>
  <span class="pg-mode" role="group" aria-label="Phone theme"><button type="button" data-ph="light" aria-pressed="true">Light</button><button type="button" data-ph="dark" aria-pressed="false">Dark</button></span>
</nav>

<section id="try">
  <h2>Try it</h2>
  <p>A working phone. Sizes you add are kept in this browser only, standing in for the phone’s own storage.</p>
  <div class="pg-try">
    <div class="pg-ph phones">${livePhone}</div>
    <ol>
      <li><b>Pick a deck</b> on the control: Call or fold, My move, or Bomb pot.</li>
      <li><b>Deal.</b> The card turns face down, the light runs along the chips and slows, and the card turns over on the answer. About a second, with a tap of the haptics on each step and a firmer one on the answer. With reduced motion it simply turns over.</li>
      <li><b>Deal again</b> draws afresh. Nothing is kept between deals and nothing is recorded.</li>
      <li><b>Bomb pot · Edit</b> opens your sizes. Type a number on the keypad, Add, remove with the bin, and Save. The close throws the changes away.</li>
    </ol>
  </div>
</section>

<section id="states">
  <h2>Every state</h2>
  <p>Light and dark follow the switch above. Each phone says what it decides; the yellow notes are strings or choices that are not settled.</p>
  <div class="pg-grid phones">${SCREENS.map(cell).join('')}</div>
</section>

<section id="decided"><h2>What this draft decides</h2>${list(DECIDED)}</section>
<section id="open"><h2>Open questions</h2><p>Answers to these change the build; the first one changes the server.</p>${list(OPEN)}</section>
</div>
<script>
(() => {
  const FACES = ${JSON.stringify(FACES)};
  const DECKS = [
    { ids: ['call', 'fold'] },
    { ids: ['call', 'fold', 'raise', 'allin'] },
    { sizes: true },
  ];
  const WORD = { call: 'Call', fold: 'Fold', raise: 'Raise', allin: 'All in' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  let mode = store.get('rz-mode', 0), sizes = store.get('rz-sizes', [2, 3, 4, 5]), result = null, dealing = false;
  let draft = [], typed = '';

  /* Phone theme switch. */
  document.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-ph]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll('.phones').forEach((p) => p.classList.toggle('dark', b.dataset.ph === 'dark'));
  }));

  /* A fair draw: rejection sampling on the secure source, so no answer is favoured. */
  const draw = (n) => { const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; };
  const options = () => (DECKS[mode].sizes ? sizes.map((n) => ({ key: n, word: '×' + n })) : DECKS[mode].ids.map((id) => ({ key: id, word: WORD[id] })));
  const faceFor = (key) => (typeof key === 'number' ? FACES.size.replace('__N__', key) : FACES[key]);

  function setBar(label, blocked) {
    const b = $('rz-deal'); b.disabled = blocked;
    b.querySelector('.bar').classList.toggle('blocked', blocked);
    b.querySelector('.act span').textContent = label;
  }
  function chipsHtml(opts, lit) { return '<div class="chips">' + opts.map((o) => '<span class="chip' + (o.key === lit ? ' on' : '') + '">' + o.word + '</span>').join('') + '</div>'; }
  function render() {
    document.querySelectorAll('#rz-seg .seg span').forEach((s, i) => { s.className = i === mode ? 'on' : ''; s.setAttribute('role', 'button'); s.tabIndex = 0; s.setAttribute('aria-pressed', String(i === mode)); });
    const opts = options();
    const sizeDeck = !!DECKS[mode].sizes;
    if (sizeDeck && sizes.length === 0) {
      $('rz-card').innerHTML = '<div style="width:196px;height:268px;border-radius:14px;border:1.5px dashed var(--outline);display:grid;place-items:center;font:600 15px/1.3 var(--body);color:var(--muted)">No sizes yet</div>';
      $('rz-label').innerHTML = '<p class="lead-p">Add the bomb pot sizes your table plays, in big blinds. One to five is usual.</p>';
      $('rz-chips').innerHTML = '<button type="button" class="btn2 rz-plain" id="rz-first" style="width:100%;box-shadow:none;border:1.5px dashed var(--outline)">${ico('plus', 18).replace(/"/g, '\\"')}Add a size</button>';
      $('rz-first').onclick = openSheet;
      setBar('Deal', true); return;
    }
    $('rz-card').innerHTML = result == null ? FACES.back : faceFor(result);
    const right = sizeDeck ? '<button type="button" class="rz-plain" id="rz-edit" style="font:600 13px/1 var(--body);color:var(--text)">Edit</button>'
      : '<span class="muted" style="font:600 12px/1 var(--body)">1 in ' + opts.length + ' each</span>';
    $('rz-label').innerHTML = '<div class="lbl q"><span>' + (sizeDeck ? 'Your sizes' : 'In the deck') + '</span><span class="r">' + right + '</span></div>';
    $('rz-chips').innerHTML = chipsHtml(opts, result);
    if (sizeDeck) $('rz-edit').onclick = openSheet;
    setBar(result == null ? 'Deal' : 'Deal again', opts.length < 2);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function turn(html) {
    const c = $('rz-card');
    if (reduce) { c.innerHTML = html; return; }
    c.style.transform = 'rotateY(90deg)'; await wait(160);
    c.innerHTML = html; c.style.transform = 'rotateY(0deg)'; await wait(170);
  }
  async function deal() {
    if (dealing) return;
    const opts = options(); if (opts.length < 2) return;
    dealing = true; setBar('Dealing', true);
    const pick = draw(opts.length);
    if (result != null) await turn(FACES.back);
    if (!reduce) {
      /* The light runs along the chips and slows, landing on the answer as the card turns. */
      const chipEls = [...document.querySelectorAll('#rz-chips .chip')];
      const start = draw(opts.length), steps = opts.length * (opts.length > 2 ? 2 : 4) + ((pick - start + opts.length) % opts.length);
      for (let i = 0; i <= steps; i++) {
        chipEls.forEach((el, j) => el.classList.toggle('on', j === (start + i) % opts.length));
        try { navigator.vibrate?.(8); } catch {}
        await wait(45 + 260 * Math.pow(i / steps, 2.4));
      }
    }
    result = opts[pick].key;
    await turn(faceFor(result));
    try { navigator.vibrate?.(30); } catch {}
    $('rz-live').textContent = opts[pick].word;
    dealing = false; render();
  }
  $('rz-deal').addEventListener('click', deal);
  $('rz-seg').addEventListener('click', (e) => {
    const i = [...document.querySelectorAll('#rz-seg .seg span')].indexOf(e.target.closest('span'));
    if (i < 0 || dealing || i === mode) return;
    mode = i; result = null; store.set('rz-mode', mode); render();
  });
  $('rz-seg').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } });

  /* The sizes sheet. */
  function renderSheet() {
    $('rz-rows').innerHTML = draft.length ? draft.map((n) => '<div class="row"><div class="n">×' + n + '<small>' + n + ' big blind' + (n === 1 ? '' : 's') + ' each</small></div><button type="button" class="rz-plain bin" data-rm="' + n + '" aria-label="Remove ×' + n + '">${ico('trash', 18).replace(/"/g, '\\"')}</button></div>').join('')
      : '<div class="row"><div class="n muted" style="font-weight:500;font-size:14px">No sizes yet</div></div>';
    $('rz-typed').textContent = typed; $('rz-typed').className = typed ? '' : 'dimt';
    if (!typed) $('rz-typed').textContent = 'e.g. 3';
    const n = Number(typed), ok = typed !== '' && n >= 1 && n <= 20 && !draft.includes(n);
    $('rz-add').textContent = ok ? 'Add ×' + n : 'Add'; $('rz-add').classList.toggle('dead', !ok); $('rz-add').disabled = !ok;
  }
  function openSheet() { if (dealing) return; draft = sizes.slice(); typed = ''; renderSheet(); $('rz-sheet').hidden = false; $('rz-scr').classList.add('cover'); $('rz-close').focus(); }
  function closeSheet() { $('rz-sheet').hidden = true; $('rz-scr').classList.remove('cover'); render(); }
  $('rz-close').onclick = closeSheet;
  $('rz-save').onclick = () => { sizes = draft.slice().sort((a, b) => a - b); store.set('rz-sizes', sizes); if (!sizes.includes(result)) result = null; closeSheet(); };
  $('rz-add').onclick = () => { const n = Number(typed); if (n >= 1 && n <= 20 && !draft.includes(n)) { draft.push(n); draft.sort((a, b) => a - b); typed = ''; renderSheet(); } };
  $('rz-rows').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { draft = draft.filter((n) => n !== Number(b.dataset.rm)); renderSheet(); } });
  $('rz-kp').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; typed = b.dataset.k === 'del' ? typed.slice(0, -1) : (typed + b.dataset.k).replace(/^0+/, '').slice(0, 2); renderSheet(); });
  render();
})();
</script>`;

writeFileSync(join(here, 'index.html'), page);
console.log('wrote index.html,', SCREENS.length, 'phones');
