/**
 * The results breakdown — ways to show how a player's result is made up, on
 * the Final, detailed list of a settled night. An exploration, 22 November.
 *
 *   node design/explorations/results-breakdown/build.mjs [--artifact <path>]
 *
 * The owner, on the icon board's results row: "lets work on the display of
 * result breakdown, try putting the entire formula to the left. research other
 * options for positioning and styling."
 *
 * Every figure is the seeded night as the round-two style page has it; the buy-ins
 * are Tonight's. No sum is worked out here: each row's terms and its net are
 * written down as that page gives them. Icons are the app's own, from
 * `../icon-system/app-icons.json`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import APP from '../icon-system/app-icons.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;

/* name, chips in, chips out, the game's result, kitchen terms, piggy term, net */
const R = [
  ['Dana', '500', '2,120', '+1,620', ['−110'], '−81', '+$1,429'],
  ['Andro', '500', '960', '+460', ['−31', '+120'], '−23', '+$526'],
  ['Lena', '1,000', '1,430', '+430', ['−29', '+50'], '−22', '+$429'],
  ['Tomáš', '500', '0', '−500', null, null, '−$500'],
  ['Ivo', '1,000', '220', '−780', null, null, '−$780'],
  ['Petr', '1,500', '270', '−1,230', null, null, '−$1,230'],
];
const ic = (n, size = 13) => `<span class="ic" style="--s:${size}px">${APP[n]}</span>`;
const net = (v) => `<b class="net ${v[0] === '+' ? 'win' : 'loss'}">${v}</b>`;
const chips = (i, o) => `<span class="t">${ic('chipsIn')}${i}</span><span class="t">${ic('chipsOut')}${o}</span>`;
const kitchen = (k) => (k ? `<span class="t">${ic('food')}${k.join(' ')}</span>` : '');
const piggy = (p) => (p ? `<span class="t">${ic('piggy')}${p}</span>` : '');
const row = (cls, left, right) => `<div class="row ${cls}"><div class="l">${left}</div><div class="r">${right}</div></div>`;
const name = (n) => `<div class="nm">${n}</div>`;

const OPTIONS = [
  ['now', 'Now', 'the formula split in two', 'Chips in and out under the name on the left; the deductions in a grey chip under the result on the right. The eye has to cross the row to read one sum.',
    R.map(([n, i, o, , k, p, v]) => row('', name(n) + `<div class="f">${chips(i, o)}</div>`, net(v) + (k ? `<span class="pill">${kitchen(k)}${piggy(p)}</span>` : ''))).join('')],
  ['a', 'A', 'the whole formula on the left', 'What you asked for. Everything that makes the result sits under the name, in the order it happens: chips in, chips out, kitchen, piggy bank. The result stands alone on the right. At phone width a player with every term runs to a second line; B and E are two ways round that.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="f">${chips(i, o)}${kitchen(k)}${piggy(p)}</div>`, net(v))).join('')],
  ['b', 'B', 'on the left, with the game’s result in place of in and out', 'Shorter: the two chip figures become one, what the player won or lost at the table. Three terms at most, and every row has room. Chips in and out stay on the On table view.',
    R.map(([n, , , g, k, p, v]) => row('mid', name(n) + `<div class="f"><span class="t g">${g}</span>${kitchen(k)}${piggy(p)}</div>`, net(v))).join('')],
  ['c', 'C', 'on the left, as a sum that ends in the result', 'The same terms written as arithmetic, with the operators shown and the row’s result as its answer. Reads as a calculation; the longest rows run close to the result.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="f eq"><span class="t">${ic('chipsOut')}${o}</span><i>−</i><span class="t">${ic('chipsIn')}${i}</span>${k ? `<i>·</i>${kitchen(k)}<i>·</i>${piggy(p)}` : ''}</div>`, net(v))).join('')],
  ['d', 'D', 'on the left, each term a small chip', 'A’s content with today’s grey chip kept, one per term, so each figure is a separate object. Heavier than plain text; the terms cannot run into each other.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="f pills"><span class="pill">${chips(i, o)}</span>${k ? `<span class="pill">${kitchen(k)}</span><span class="pill">${piggy(p)}</span>` : ''}</div>`, net(v))).join('')],
  ['e', 'E', 'a full line of its own, under name and result', 'The name and the result share the top line; the formula takes the whole width beneath them. The most room for long terms, and the result sits level with the name.',
    R.map(([n, i, o, , k, p, v]) => `<div class="row stack"><div class="top">${name(n)}${net(v)}</div><div class="f">${chips(i, o)}${kitchen(k)}${piggy(p)}</div></div>`).join('')],
  ['f', 'F', 'columns, the icons as headings', 'Each term gets a column, headed once by its icon, so figures line up down the list and can be compared between players. The name is squeezed to the narrowest it can be, and a player who both owes the kitchen and is owed by it (Andro) needs two lines in that column. The game-end cut of 6 September dropped a four-column table by name, so this would reopen that.',
    `<div class="cols head"><span></span><span>${ic('chipsIn')}</span><span>${ic('chipsOut')}</span><span>${ic('food')}</span><span>${ic('piggy')}</span><span></span></div>` +
    R.map(([n, i, o, , k, p, v]) => `<div class="cols"><span class="nm">${n}</span><span>${i}</span><span>${o}</span><span>${k ? k.join(' ') : ''}</span><span>${p ?? ''}</span>${net(v)}</div>`).join('')],
  ['g', 'G', 'hidden until asked for', 'The list shows only names and results. A row opens downward into its breakdown, one term per line, as the receipt row already does on the player card. The calmest list; the formula costs a tap. Dana’s row is open here. The two chip labels are new wording, not confirmed.',
    R.map(([n, i, o, , k, p, v], x) => `<div class="row stack"><div class="top">${name(n)}<span class="open">${net(v)}${ic(x === 0 ? 'chevronUp' : 'chevronDown', 14)}</span></div>${x === 0 ? `<div class="rcpt">
      <div>${ic('chipsIn', 15)}<span>Chips in</span><b>${i}</b></div><div>${ic('chipsOut', 15)}<span>Chips out</span><b>${o}</b></div>
      <div>${ic('food', 15)}<span>Kitchen &amp; drinks</span><b>${k.join(' ')}</b></div><div>${ic('piggy', 15)}<span>Group piggy bank</span><b>${p}</b></div></div>` : ''}</div>`).join('')],
];

const html = `<title>Poker Club Results Breakdown</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Franklin:wght@500;600;700;800&display=swap">
<style>
/* Layout: a reading column of notes over a grid of phone-width result lists, one per option. */
:root{--bg:#F4F5F7;--fg:#141A2A;--muted:#596171;--line:#DDE1E7;--panel:#FFFFFF;
  --f-head:'Libre Franklin',system-ui,sans-serif;--f-body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#10131A;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--panel:#191D27;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10131A;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--panel:#191D27;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:400 15px/1.55 var(--f-body);-webkit-font-smoothing:antialiased}
.wrap{max-width:1400px;margin:0 auto;padding-block:40px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.eyebrow{font:700 11px/1 var(--f-body);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
h1{font:800 clamp(28px,4.4vw,42px)/1.06 var(--f-head);letter-spacing:-.025em;margin:10px 0 12px;text-wrap:balance}
.lede{max-width:70ch;margin:0 0 8px;color:var(--muted)}.lede b{color:var(--fg);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:34px 26px;margin-top:30px}
.opt{display:flex;flex-direction:column;gap:12px;min-width:0}
.opt h2{font:800 19px/1.2 var(--f-head);letter-spacing:-.015em;margin:0}.opt h2 span{color:var(--muted);font-weight:700}
.opt p{margin:0;color:var(--muted);font-size:14px;line-height:1.5}

/* The results card, in Fresh Deck: fixed colours, the same in either theme of the page around it. */
.scr{width:100%;max-width:330px;background:#EEF0F3;border-radius:22px;padding:14px 14px 16px;color:#141A2A;font:400 14px/1.35 Inter,system-ui,sans-serif;--m:#596171}
.card{background:#fff;border-radius:14px;padding:0 12px;box-shadow:0 1px 1.5px rgba(20,26,42,.07),0 8px 20px -12px rgba(20,26,42,.22)}
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #E4E7EC}
.row:last-child,.cols:last-child{border-bottom:0}
.row.mid{align-items:center}
.row .l{min-width:0}.row .r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.nm{font:600 15px/1.2 'Libre Franklin',system-ui,sans-serif}
.net{font:700 17px/1.1 'Libre Franklin',system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
.win{color:#0E7A45}.loss{color:#4E5768}
.f{display:flex;flex-wrap:wrap;align-items:center;gap:2px 9px;margin-top:4px;font-size:12px;color:var(--m);font-variant-numeric:tabular-nums}
.t{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.t.g{font-weight:600;color:#141A2A}
.ic{display:inline-flex;flex:none;line-height:0;color:var(--m)}.ic svg{width:var(--s);height:var(--s)}
.pill{display:inline-flex;align-items:center;gap:8px;background:#F1F3F6;border-radius:7px;padding:3px 7px;font-size:11.5px;color:var(--m);font-variant-numeric:tabular-nums}
.f.pills{gap:4px}
.f.eq{gap:2px 5px}.f.eq i{font-style:normal;color:#9AA1AE}
.row.stack{display:block}.row.stack .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.row.stack .f{margin-top:5px}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 32px 34px 52px 24px 62px;align-items:center;gap:3px;padding:10px 0;border-bottom:1px solid #E4E7EC;font-size:11.5px;color:var(--m);font-variant-numeric:tabular-nums;text-align:right}
.cols .nm{text-align:left;font-size:13.5px;color:#141A2A;overflow:hidden;text-overflow:ellipsis}.cols .net{font-size:14px}
.cols.head{padding:8px 0 6px}.cols.head span{display:flex;justify-content:flex-end}
.open{display:inline-flex;align-items:center;gap:6px}
.rcpt{display:grid;gap:7px;margin:10px 0 2px;padding:10px 12px;background:#F1F3F6;border-radius:10px;font-size:13px}
.rcpt div{display:flex;align-items:center;gap:8px}.rcpt b{margin-left:auto;font:600 13px 'Libre Franklin',system-ui,sans-serif;font-variant-numeric:tabular-nums}
</style>
<main class="wrap">
  <span class="eyebrow">The Poker Club · 22 November 2026 · design only</span>
  <h1>The results breakdown</h1>
  <p class="lede">How a player’s result is made up, on the settled night’s list: chips in, chips out, the kitchen bill and the piggy bank. First the list as it stands, then <b>A</b>, the whole formula on the left as you asked, and six other ways to place and style it.</p>
  <p class="lede">All on Fresh Deck with the app’s own icons, the same six players in each. Three of them only lost at the table and owe nothing else, so their rows are the short case.</p>
  <div class="grid">${OPTIONS.map(([, k, title, note, rows]) => `<section class="opt"><h2>${k} <span>· ${title}</span></h2><div class="scr"><div class="card">${rows}</div></div><p>${note}</p></section>`).join('')}</div>
</main>
`;
writeFileSync(join(here, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">\n${html}</body></html>\n`);
console.log('wrote index.html');
if (artifactAt) { writeFileSync(artifactAt, html); console.log('wrote', artifactAt); }
