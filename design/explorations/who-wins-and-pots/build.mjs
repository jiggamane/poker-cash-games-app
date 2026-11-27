/**
 * The Who wins and Side pots board: a live phone to try both tools on, then
 * every state drawn in light and dark, then what the draft decides and what
 * it leaves open.
 *
 *   node design/explorations/who-wins-and-pots/build.mjs
 *
 * Writes `index.html` beside this file. The phones are `screens.mjs`; the
 * live phone calls the same drawing functions (`draw.mjs`, inlined) over the
 * same engine (`engine.ts` over `packages/core`, bundled by esbuild), so it
 * cannot draw or rank anything the board does not. Nothing here is the app.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSS, FONTS, push, bar, ico, topButton } from '../full-board/kit.mjs';
import { engineScript } from './load.mjs';
import SCREENS, { section } from './screens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const NAV = { push: 'pushed screen', sheet: 'sheet' };

/* ── the live phone: two empty frames the script fills ────────────────── */

const frame = (tool, title, sub) =>
  push({ title, sub: `<span style="white-space:nowrap;font-size:12px">${sub}</span>`, subRight: `<button type="button" class="lv-plain" data-restart aria-label="New hand">${topButton('restart')}</button>`,
    extra: '<div data-hero></div>', body: '', bar: '<div data-bar></div>' })
    .replace('<div class="fb">', `<div class="fb lv" data-tool="${tool}"${tool === 'pots' ? ' hidden' : ''}>`);
const livePhones = frame('who', 'Who wins', 'the best hand so far, no odds') + frame('pots', 'Side pots', 'everyone all in, pot by pot');
const ICONS = { 'plus@14': ico('plus', 14), 'backspace@22': ico('backspace', 22) };
const DONE_BAR = `<button type="button" class="lv-bar" data-done>${bar('Done')}</button>`;
const drawSource = readFileSync(join(here, 'draw.mjs'), 'utf8').replace(/^export /gm, '');

/* ── what this draft decides, and what it leaves open ─────────────────── */

const DECIDED = [
  ['Two tools, two tiles', 'Who wins and Side pots sit on Poker tools beside the calculator, so Tonight’s Poker tools sheet (ToolTiles) gets them too. Each is a push, /who-wins and /side-pots: a place you stay in while the hand plays out, with nothing to confirm.'],
  ['The calculator’s table', 'Same board, same seats, same deck as a keyboard at the foot, same Add a player and New hand. A seat counts once both its cards are in. Up to nine seats.'],
  ['Who wins: the answer on the ink', 'Under the title: Ahead, Tied, Winner or Split, the street, the winning hole cards, and the hand. No percentages anywhere. Before the flop it compares the two hole cards; from the flop the best five.'],
  ['The five cards, always', 'From the flop each seat shows its best five so far: the cards that make the hand full, kickers faded. A kicker that decided the hand is not faded, and is named, as the calculator names it.'],
  ['Side pots: stacks in the seat', 'Each seat carries its stack at the right, typed on the calculator’s keypad with Done on the bar. Everybody is taken to be all in for their stack.'],
  ['Hands first, then pots', 'Under the seats, every hand in order of strength: 1st, 2nd, 3rd…, its combo, the pots it takes, the amount and its change (owner, 26 November). Before the river it reads As it stands. Below that, pot by pot as detail: Main pot, Side pot 1…, who can win each, and the Uncalled layer that goes back.'],
  ['Results name hands, not seats', 'Wherever a result is stated (the ink, each pot, a split, the uncalled chips) the hand is shown as its two cards, never as Opponent 1, 2… The seat labels stay on the seats, where the cards are entered.'],
  ['Every figure is the engine’s', 'The pots are packages/core sidePots() as it stands, a split is allocate(), the ranking is evaluate() and the names are nameHand(). Nothing on these phones was typed in by hand.'],
];
const OPEN = [
  ['Two tools, or modes of the calculator?', 'The three take the same cards. They could be one Calculator with a control at the top: Odds, Who wins, Pots, keeping the cards when you switch. Drawn as two tools because the request named two features. Recommendation: try them as tools first; merging later is cheap.'],
  ['Before the flop', 'Is “ahead” the right word with two cards, where ace-king against deuces is near a coin flip? Ranking two cards also needs a small addition to packages/core (evaluate() starts at five).'],
  ['Folded chips', 'Blinds and calls from players who then folded belong in the pots but nobody here is all in for them. Not drawn. Simplest: one “Already in the pot” figure added to the main pot, which is right whenever folded chips are no more than the shortest stack.'],
  ['The odd chip', 'A split that does not divide gives the odd unit to the first seat in order. Tables usually give it to the first player left of the button, which the tool does not know.'],
  ['“Stack”', 'Taken as everything the player has in the hand, blinds included. Or should the field read “All in for”?'],
  ['The two tile drawings', 'Drafts from the icon system’s parts: two cards, and three stacks. They need a pass on the icon board.'],
  ['Every new string', 'Listed under each phone. Only Board, Players, Add a player, Done, Me, Opponent, Winner, Beaten and the hand names come from the app.'],
];
const list = (items) => `<div class="pg-rules">${items.map(([b, t]) => `<div><b>${esc(b)}</b>${esc(t)}</div>`).join('')}</div>`;

const cell = (s) => `<figure class="cell" id="s-${s.id}"><div class="pg-ph">${s.html}</div>
  <figcaption><b>${esc(s.name)}</b><span class="pg-meta"><code>${esc(s.route)}</code> · ${NAV[s.nav] ?? s.nav}</span>${
    s.note ? `<span class="pg-nt">${esc(s.note)}</span>` : ''}${(s.flags ?? []).map((f) => `<span class="pg-flag">${esc(f)}</span>`).join('')}</figcaption></figure>`;

const WHO = SCREENS.filter((s) => s.route === '/who-wins' || s.route === '/tools');
const POTS = SCREENS.filter((s) => s.route === '/side-pots');

const page = `<title>Who Wins and Side Pots</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
/* Layout: brief, then a live phone beside how it works, then each tool's states as a wrapping grid of phones, then decided and open. */
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
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.pg-strip b{font:800 14px var(--body)}
.pg-strip a{color:inherit;font-weight:600;font-size:13.5px;opacity:.8}
.pg-mode{display:inline-flex;background:rgba(127,127,127,.28);border-radius:999px;padding:3px;margin-left:auto}
.pg-mode button,.pg-tool button{font:700 12.5px var(--body);color:inherit;background:none;border:0;border-radius:999px;padding:6px 12px;cursor:pointer}
.pg-mode button[aria-pressed="true"]{background:var(--bg);color:var(--fg)}
.pg-tool{display:inline-flex;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px;align-self:flex-start}
.pg-tool button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.pg-mode button:focus-visible,.pg-tool button:focus-visible,.lv-plain:focus-visible,.lv-bar:focus-visible{outline:2px solid #2B6CDF;outline-offset:2px}
.pg-try{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.pg-try .pg-how{display:flex;flex-direction:column;gap:14px;max-width:52ch;min-width:0}
.pg-try ol{margin:0;padding-left:20px;color:var(--muted);display:grid;gap:8px}.pg-try ol b{color:var(--fg)}
.pg-grid{display:flex;flex-wrap:wrap;gap:22px}
.cell{margin:0;width:330px;max-width:100%;display:flex;flex-direction:column;gap:10px}
.cell figcaption{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
.cell figcaption b{color:var(--fg);font-size:14.5px}
.pg-meta code{font-size:12px}
.pg-flag{background:var(--flagbg);color:var(--flag);border-radius:8px;padding:6px 9px;font-size:12.5px}
.pg-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.pg-rules div{background:var(--panel);border-radius:12px;padding:12px 14px;font-size:13.5px;color:var(--muted)}.pg-rules b{display:block;color:var(--fg);font-size:14px;margin-bottom:2px}
@media (max-width:380px){.pg-ph{transform:scale(.9);transform-origin:top left;margin-bottom:-76px}}
${CSS}
/* The live phone: its sheet scrolls, as the app's does, and its targets are real buttons. */
.lv .body{overflow-y:auto;padding-bottom:18px}
.lv-plain{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.lv-bar{display:block;width:100%;border:0;padding:0;background:none;cursor:pointer;text-align:inherit;font:inherit}
.lv [data-hole],.lv [data-board]{cursor:pointer}
</style>
<div class="pg-wrap">
<header>
  <div class="pg-eyebrow">Design exploration · 26 November 2026 · not a handoff</div>
  <h1>Who wins, and Side pots</h1>
  <p>${esc(section.blurb)} Drawn in the look approved on 22 November (the full board’s kit). <b>No app code has changed.</b> Approve or redirect here first.</p>
</header>
<nav class="pg-strip" aria-label="Board">
  <b>Who wins · Side pots</b><a href="#try">Try it</a><a href="#who">Who wins</a><a href="#pots">Side pots</a><a href="#decided">Decided</a><a href="#open">Open</a>
  <span class="pg-mode" role="group" aria-label="Phone theme"><button type="button" data-ph="light" aria-pressed="true">Light</button><button type="button" data-ph="dark" aria-pressed="false">Dark</button></span>
</nav>

<section id="try">
  <h2>Try it</h2>
  <p>A working phone running the app’s own poker engine. It opens on a sample hand; New hand (the round button) clears it.</p>
  <div class="pg-try">
    <div class="pg-ph phones">${livePhones}</div>
    <div class="pg-how">
      <span class="pg-tool" role="group" aria-label="Tool"><button type="button" data-tool-btn="who" aria-pressed="true">Who wins</button><button type="button" data-tool-btn="pots" aria-pressed="false">Side pots</button></span>
      <ol>
        <li><b>Tap a place</b> for a card, on a seat or the board. The deck comes up at the foot; tap a card and the next empty place is outlined. Done puts the deck away.</li>
        <li><b>Tap a dealt card</b> to take it back.</li>
        <li><b>Who wins</b> answers on the ink as soon as two seats have both cards, and again on every street you deal.</li>
        <li><b>Side pots: tap a stack</b> to type it on the keypad, then Done. The result, hand by hand, appears under the seats once the stacks and cards are in.</li>
        <li><b>Add a player</b> goes up to nine.</li>
      </ol>
    </div>
  </div>
</section>

<section id="who">
  <h2>Who wins</h2>
  <p>Light and dark follow the switch above. Each phone says what it decides; the yellow notes are strings or choices that are not settled.</p>
  <div class="pg-grid phones">${WHO.map(cell).join('')}</div>
</section>

<section id="pots">
  <h2>Side pots</h2>
  <p>One three-way all in followed street by street (a short stack with aces, a middle stack with kings, a deep one with queen-jack suited), then a four-way hand where two straights split both pots.</p>
  <div class="pg-grid phones">${POTS.map(cell).join('')}</div>
</section>

<section id="decided"><h2>What this draft decides</h2>${list(DECIDED)}</section>
<section id="open"><h2>Open questions</h2><p>Answers to these change the build. The first changes where the tools live; the second and third change packages/core.</p>${list(OPEN)}</section>
</div>
<script>${engineScript()}</script>
<script>
(() => {
${drawSource}
  const ICONS = ${JSON.stringify(ICONS)};
  init(ENGINE, (n, s) => ICONS[n + '@' + s] || '');
  const DONE_BAR = ${JSON.stringify(DONE_BAR)};
  const seatsOf = (...hs) => hs.map(([c, stack = 0]) => ({ cards: c ? c.split(' ') : [null, null], stack }));
  const boardOf = (t = '') => { const b = t ? t.split(' ') : []; return [...b, ...Array(5 - b.length).fill(null)]; };
  const SAMPLE = {
    who: () => ({ seats: seatsOf(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: boardOf('Qh Jh 3s'), sel: null }),
    pots: () => ({ seats: seatsOf(['Qh Jh', 1200], ['As Ac', 300], ['Kd Ks', 800]), board: boardOf('Kc 7d 2s'), sel: null }),
  };
  const EMPTY = () => ({ seats: seatsOf([], []), board: boardOf(), sel: null });
  const tables = { who: SAMPLE.who(), pots: SAMPLE.pots() };
  let tool = 'who', fresh = false;
  const phone = (k) => document.querySelector('.lv[data-tool="' + k + '"]');

  document.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-ph]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll('.phones').forEach((p) => p.classList.toggle('dark', b.dataset.ph === 'dark'));
  }));
  document.querySelectorAll('[data-tool-btn]').forEach((b) => b.addEventListener('click', () => {
    tool = b.dataset.toolBtn;
    document.querySelectorAll('[data-tool-btn]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    ['who', 'pots'].forEach((k) => { phone(k).hidden = k !== tool; });
    render();
  }));

  function render() {
    const t = tables[tool], el = phone(tool);
    const s = (tool === 'who' ? whoWins : sidePots)(t);
    el.querySelector('[data-hero]').innerHTML = s.hero;
    const body = el.querySelector('.body'), keep = body.scrollTop;
    body.innerHTML = s.body.join('');
    body.scrollTop = keep;
    el.querySelector('[data-bar]').innerHTML = s.bar === 'done' ? DONE_BAR : '';
  }

  /** Every place a card can go, in the order the deck fills them: each seat's two, then the board. */
  const places = (t) => [...t.seats.flatMap((s, i) => [0, 1].map((j) => ({ kind: 'hole', i, j }))), ...[0, 1, 2, 3, 4].map((j) => ({ kind: 'board', i: 0, j }))];
  const at = (t, p) => (p.kind === 'hole' ? t.seats[p.i].cards[p.j] : t.board[p.j]);
  const put = (t, p, c) => { if (p.kind === 'hole') t.seats[p.i].cards[p.j] = c; else t.board[p.j] = c; };
  const nextEmpty = (t, from) => { const all = places(t), k = all.findIndex((p) => p.kind === from.kind && p.i === from.i && p.j === from.j); return [...all.slice(k + 1), ...all.slice(0, k + 1)].find((p) => !at(t, p)) || null; };
  const firstEmptyBoard = (t) => t.board.findIndex((c) => !c);

  function onTap(e) {
    const t = tables[tool];
    const q = (a) => e.target.closest('[' + a + ']');
    let n;
    if (q('data-restart')) { tables[tool] = EMPTY(); tables[tool].sel = tool === 'who' ? { kind: 'hole', i: 0, j: 0 } : { kind: 'stack', i: 0 }; fresh = true; }
    else if ((n = q('data-card'))) {
      const c = n.dataset.card;
      if (!t.sel || t.sel.kind === 'stack') return;
      if ([...t.seats.flatMap((s) => s.cards), ...t.board].includes(c)) return;
      put(t, t.sel, c);
      t.sel = nextEmpty(t, t.sel);
    }
    else if (q('data-done')) t.sel = null;
    else if (q('data-add')) { if (t.seats.length < 9) t.seats.push({ cards: [null, null], stack: 0 }); }
    else if ((n = q('data-hole'))) {
      const [i, j] = n.dataset.hole.split(':').map(Number);
      t.seats[i].cards[j] = null; t.sel = { kind: 'hole', i, j };
    }
    else if ((n = q('data-board'))) {
      const j = Number(n.dataset.board);
      if (t.board[j]) { t.board.splice(j, 1); t.board.push(null); }
      t.sel = { kind: 'board', i: 0, j: firstEmptyBoard(t) };
    }
    else if ((n = q('data-stack'))) { t.sel = { kind: 'stack', i: Number(n.dataset.stack) }; fresh = true; }
    else if ((n = q('data-k'))) {
      if (!t.sel || t.sel.kind !== 'stack') return;
      const seat = t.seats[t.sel.i], k = n.dataset.k;
      let v = fresh ? '' : String(seat.stack || '');
      fresh = false;
      v = k === 'del' ? v.slice(0, -1) : (v + k).replace(/^0+/, '').slice(0, 7);
      seat.stack = Number(v || 0);
    }
    else return;
    render();
  }
  ['who', 'pots'].forEach((k) => phone(k).addEventListener('click', onTap));
  render();
})();
</script>`;

writeFileSync(join(here, 'index.html'), page);
console.log('wrote index.html,', SCREENS.length, 'phones');
