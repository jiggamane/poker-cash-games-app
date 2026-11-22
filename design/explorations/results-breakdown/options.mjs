/**
 * The results breakdown's options and their styles, shared by this folder's
 * own page and by the icon board, which shows them with approve / needs-work
 * controls. Every class is `rb-` prefixed so that neither page's own styles
 * can reach in.
 */
import APP from '../icon-system/app-icons.json' with { type: 'json' };

export const RB_CSS = `
/* The results card, in Fresh Deck: fixed colours, the same in either theme of the page around it. */
.rb-scr{width:100%;max-width:330px;background:#EEF0F3;border-radius:22px;padding:14px 14px 16px;color:#141A2A;font:400 14px/1.35 Inter,system-ui,sans-serif;--m:#596171}
.rb-card{background:#fff;border-radius:14px;padding:0 12px;box-shadow:0 1px 1.5px rgba(20,26,42,.07),0 8px 20px -12px rgba(20,26,42,.22)}
.rb-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #E4E7EC}
.rb-row:last-child,.rb-cols:last-child{border-bottom:0}
.rb-row.rb-mid{align-items:center}
.rb-row .rb-l{min-width:0}.rb-row .rb-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.rb-nm{font:600 15px/1.2 'Libre Franklin',system-ui,sans-serif}
.rb-net{font:700 17px/1.1 'Libre Franklin',system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
.rb-win{color:#0E7A45}.rb-loss{color:#4E5768}
.rb-f{display:flex;flex-wrap:wrap;align-items:center;gap:2px 9px;margin-top:4px;font-size:12px;color:var(--m);font-variant-numeric:tabular-nums}
.rb-t{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.rb-t.rb-g{font-weight:600;color:#141A2A}
.rb-ic{display:inline-flex;flex:none;line-height:0;color:var(--m)}.rb-ic svg{width:var(--s);height:var(--s)}
.rb-pill{display:inline-flex;align-items:center;gap:8px;background:#F1F3F6;border-radius:7px;padding:3px 7px;font-size:11.5px;color:var(--m);font-variant-numeric:tabular-nums}
.rb-f.rb-pills{gap:4px}
.rb-f.rb-eq{gap:2px 5px}.rb-f.rb-eq i{font-style:normal;color:#9AA1AE}
.rb-row.rb-stack{display:block}.rb-row.rb-stack .rb-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.rb-row.rb-stack .rb-f{margin-top:5px}
.rb-cols{display:grid;grid-template-columns:minmax(0,1fr) 32px 34px 52px 24px 62px;align-items:center;gap:3px;padding:10px 0;border-bottom:1px solid #E4E7EC;font-size:11.5px;color:var(--m);font-variant-numeric:tabular-nums;text-align:right}
.rb-cols .rb-nm{text-align:left;font-size:13.5px;color:#141A2A;overflow:hidden;text-overflow:ellipsis}.rb-cols .rb-net{font-size:14px}
.rb-cols.rb-head{padding:8px 0 6px}.rb-cols.rb-head span{display:flex;justify-content:flex-end}
.rb-open{display:inline-flex;align-items:center;gap:6px}
.rb-rcpt{display:grid;gap:7px;margin:10px 0 2px;padding:10px 12px;background:#F1F3F6;border-radius:10px;font-size:13px}
.rb-rcpt div{display:flex;align-items:center;gap:8px}.rb-rcpt b{margin-left:auto;font:600 13px 'Libre Franklin',system-ui,sans-serif;font-variant-numeric:tabular-nums}
`;

/* name, chips in, chips out, the game's result, kitchen terms, piggy term, net */
const R = [
  ['Dana', '500', '2,120', '+1,620', ['−110'], '−81', '+$1,429'],
  ['Andro', '500', '960', '+460', ['−31', '+120'], '−23', '+$526'],
  ['Lena', '1,000', '1,430', '+430', ['−29', '+50'], '−22', '+$429'],
  ['Tomáš', '500', '0', '−500', null, null, '−$500'],
  ['Ivo', '1,000', '220', '−780', null, null, '−$780'],
  ['Petr', '1,500', '270', '−1,230', null, null, '−$1,230'],
];
const ic = (n, size = 13) => `<span class="rb-ic" style="--s:${size}px">${APP[n]}</span>`;
const net = (v) => `<b class="rb-net ${v[0] === '+' ? 'rb-win' : 'rb-loss'}">${v}</b>`;
const chips = (i, o) => `<span class="rb-t">${ic('chipsIn')}${i}</span><span class="rb-t">${ic('chipsOut')}${o}</span>`;
const kitchen = (k) => (k ? `<span class="rb-t">${ic('food')}${k.join(' ')}</span>` : '');
const piggy = (p) => (p ? `<span class="rb-t">${ic('piggy')}${p}</span>` : '');
const row = (cls, left, right) => `<div class="rb-row ${cls ? 'rb-' + cls : ''}"><div class="rb-l">${left}</div><div class="rb-r">${right}</div></div>`;
const name = (n) => `<div class="rb-nm">${n}</div>`;

const OPTIONS = [
  ['now', 'Now', 'the formula split in two', 'Chips in and out under the name on the left; the deductions in a grey chip under the result on the right. The eye has to cross the row to read one sum.',
    R.map(([n, i, o, , k, p, v]) => row('', name(n) + `<div class="rb-f">${chips(i, o)}</div>`, net(v) + (k ? `<span class="rb-pill">${kitchen(k)}${piggy(p)}</span>` : ''))).join('')],
  ['now2', 'Now, one shape', 'the formula split in two, every term in the same grey shape', 'As Now, with chips in and out set in the same grey shape the kitchen and the piggy bank sit in (the owner, 22 November): one kind of object for every term, left and right.',
    R.map(([n, i, o, , k, p, v]) => row('', name(n) + `<div class="rb-f"><span class="rb-pill">${chips(i, o)}</span></div>`, net(v) + (k ? `<span class="rb-pill">${kitchen(k)}${piggy(p)}</span>` : ''))).join('')],
  ['a', 'A', 'the whole formula on the left', 'What you asked for. Everything that makes the result sits under the name, in the order it happens: chips in, chips out, kitchen, piggy bank. The result stands alone on the right. At phone width a player with every term runs to a second line; B and E are two ways round that.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="rb-f">${chips(i, o)}${kitchen(k)}${piggy(p)}</div>`, net(v))).join('')],
  ['b', 'B', 'on the left, with the game’s result in place of in and out', 'Shorter: the two chip figures become one, what the player won or lost at the table. Three terms at most, and every row has room. Chips in and out stay on the On table view.',
    R.map(([n, , , g, k, p, v]) => row('mid', name(n) + `<div class="rb-f"><span class="rb-t rb-g">${g}</span>${kitchen(k)}${piggy(p)}</div>`, net(v))).join('')],
  ['c', 'C', 'on the left, as a sum that ends in the result', 'The same terms written as arithmetic, with the operators shown and the row’s result as its answer. Reads as a calculation; the longest rows run close to the result.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="rb-f rb-eq"><span class="rb-t">${ic('chipsOut')}${o}</span><i>−</i><span class="rb-t">${ic('chipsIn')}${i}</span>${k ? `<i>·</i>${kitchen(k)}<i>·</i>${piggy(p)}` : ''}</div>`, net(v))).join('')],
  ['d', 'D', 'on the left, each term a small chip', 'A’s content with today’s grey chip kept, one per term, so each figure is a separate object. Heavier than plain text; the terms cannot run into each other.',
    R.map(([n, i, o, , k, p, v]) => row('mid', name(n) + `<div class="rb-f rb-pills"><span class="rb-pill">${chips(i, o)}</span>${k ? `<span class="rb-pill">${kitchen(k)}</span><span class="rb-pill">${piggy(p)}</span>` : ''}</div>`, net(v))).join('')],
  ['e', 'E', 'a full line of its own, under name and result', 'The name and the result share the top line; the formula takes the whole width beneath them. The most room for long terms, and the result sits level with the name.',
    R.map(([n, i, o, , k, p, v]) => `<div class="rb-row rb-stack"><div class="rb-top">${name(n)}${net(v)}</div><div class="rb-f">${chips(i, o)}${kitchen(k)}${piggy(p)}</div></div>`).join('')],
  ['f', 'F', 'columns, the icons as headings', 'Each term gets a column, headed once by its icon, so figures line up down the list and can be compared between players. The name is squeezed to the narrowest it can be, and a player who both owes the kitchen and is owed by it (Andro) needs two lines in that column. The game-end cut of 6 September dropped a four-column table by name, so this would reopen that.',
    `<div class="rb-cols rb-head"><span></span><span>${ic('chipsIn')}</span><span>${ic('chipsOut')}</span><span>${ic('food')}</span><span>${ic('piggy')}</span><span></span></div>` +
    R.map(([n, i, o, , k, p, v]) => `<div class="rb-cols"><span class="rb-nm">${n}</span><span>${i}</span><span>${o}</span><span>${k ? k.join(' ') : ''}</span><span>${p ?? ''}</span>${net(v)}</div>`).join('')],
  ['g', 'G', 'hidden until asked for', 'The list shows only names and results. A row opens downward into its breakdown, one term per line, as the receipt row already does on the player card. The calmest list; the formula costs a tap. Dana’s row is open here. The two chip labels are new wording, not confirmed.',
    R.map(([n, i, o, , k, p, v], x) => `<div class="rb-row rb-stack"><div class="rb-top">${name(n)}<span class="rb-open">${net(v)}${ic(x === 0 ? 'chevronUp' : 'chevronDown', 14)}</span></div>${x === 0 ? `<div class="rb-rcpt">
      <div>${ic('chipsIn', 15)}<span>Chips in</span><b>${i}</b></div><div>${ic('chipsOut', 15)}<span>Chips out</span><b>${o}</b></div>
      <div>${ic('food', 15)}<span>Kitchen &amp; drinks</span><b>${k.join(' ')}</b></div><div>${ic('piggy', 15)}<span>Group piggy bank</span><b>${p}</b></div></div>` : ''}</div>`).join('')],
];


export const RB_OPTIONS = OPTIONS.map(([key, letter, title, note, rows]) => ({ key, letter, title, note, html: `<div class="rb-scr"><div class="rb-card">${rows}</div></div>` }));
