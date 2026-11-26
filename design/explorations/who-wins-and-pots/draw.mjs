/**
 * Who wins and Side pots, drawn: one function per screen that takes the
 * table (seats, board, what is selected) and returns the screen's parts.
 *
 * NO IMPORTS, ON PURPOSE. The board's phones (`screens.mjs`) and the live
 * phone on the page (`build.mjs` inlines this file's source) both call these
 * same functions, so what the live phone draws is what the board draws. The
 * engine and the icons are handed in with `init()`: in node, `load.mjs`'s
 * bundle of `engine.ts` and the kit's `ico()`; on the page, the same bundle as
 * a script and the icons pre-rendered.
 *
 * Tokens and kit classes only, as on the full board. PLAYING CARDS are the one
 * literal colour, as on the calculator (`../full-board/screens/90-poker-tools.mjs`,
 * whose card parts these copy): card stock is white in both themes, the ink is
 * `var(--top)` for spades and clubs and `var(--red)` for hearts and diamonds.
 */

let E = null;
let ICO = () => '';
export function init(engine, ico) {
  E = engine;
  ICO = ico;
}

/* ── playing cards (as the calculator draws them) ─────────────────────── */

const FACE = '#FFFFFF';
const SUIT = {
  s: '<path d="M12 2.5C8 7 3.5 9.8 3.5 14a4.3 4.3 0 0 0 7.3 3.1L9.6 21.5h4.8l-1.2-4.4A4.3 4.3 0 0 0 20.5 14C20.5 9.8 16 7 12 2.5z"/>',
  h: '<path d="M12 21C5 15.5 2.5 12 2.5 8.2c0-2.9 2.2-5 4.9-5 1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 2.7 0 4.9 2.1 4.9 5 0 3.8-2.5 7.3-9.5 12.8z"/>',
  d: '<path d="M12 2.5l6.8 9.5L12 21.5 5.2 12z"/>',
  c: '<circle cx="12" cy="7.3" r="3.7"/><circle cx="7.2" cy="13.2" r="3.7"/><circle cx="16.8" cy="13.2" r="3.7"/><path d="M12 11.5l-2.2 10h4.4z"/>',
};
const inkOf = (s) => (s === 'h' || s === 'd' ? 'var(--red)' : 'var(--top)');
const pip = (s, size, color = inkOf(s)) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="display:block">${SUIT[s]}</svg>`;

/** A dealt card, "Ah". `dim` fades it: a kicker, or a card that plays no part. */
export const pc = (c, w = 32, h = 44, fs = 15, { dim = false, attrs = '' } = {}) => {
  const [r, s] = c;
  return `<span${attrs} style="width:${w}px;height:${h}px;border-radius:${w > 24 ? 6 : 4}px;background:${FACE};box-shadow:inset 0 0 0 1px var(--outline);display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;flex:none;font:800 ${fs}px/1 var(--head);color:${inkOf(s)}${dim ? ';opacity:.42' : ''}">${r}${pip(s, Math.round(fs * 0.8))}</span>`;
};
/** An empty place: dashed with a plus; the place the next card goes is a solid outline. */
export const slot = (active = false, attrs = '') =>
  `<span${attrs} style="width:32px;height:44px;border-radius:6px;${active ? 'box-shadow:inset 0 0 0 2px var(--text);color:var(--text)' : 'border:1.5px dashed var(--outline);color:var(--muted)'};display:inline-grid;place-items:center;flex:none">${ICO('plus', 14)}</span>`;

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
/** The deck as a keyboard at the foot of the sheet, as on the calculator. `gone` are cards already on the table. */
export const deck = (gone = []) => `<div style="margin:0 -8px" data-deck><div data-done style="display:flex;justify-content:flex-end;align-items:center;height:32px;padding:0 4px;font:700 14px/1 var(--body);color:var(--text);cursor:pointer">Done</div>
  <div style="display:grid;gap:3px">${['s', 'h', 'd', 'c'].map((s) => `<div style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px">${RANKS.map((r) => {
    const out = gone.includes(r + s);
    return `<span data-card="${r + s}" style="height:32px;border-radius:4px;${out ? 'background:var(--raised);color:var(--dim)' : `background:${FACE};box-shadow:inset 0 0 0 1px var(--outline);color:${inkOf(s)};cursor:pointer`};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:800 11.5px/1 var(--head)">${r}${pip(s, 10, out ? 'var(--dim)' : inkOf(s))}</span>`;
  }).join('')}</div>`).join('')}</div></div>`;

/** The amount keypad, as the calculator's pot field uses it. */
export const keypad = () => `<div class="kp" data-kp>${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((k) => `<span data-k="${k}" style="height:40px;cursor:pointer">${k}</span>`).join('')}<span data-k="del" style="height:40px;cursor:pointer" aria-label="Delete">${ICO('backspace', 22)}</span></div>`;

/* ── shared pieces ────────────────────────────────────────────────────── */

const lbl = (text, right = '') => `<div class="lbl q">${text}${right ? `<span class="r" style="font:600 12px/1 var(--body);color:var(--muted)">${right}</span>` : ''}</div>`;
/** Add a player as a quiet action at the right of a label, where a screen has no room for the dashed button. */
const addInLabel = () => `<span data-add style="display:inline-flex;align-items:center;gap:4px;font:600 13px/1 var(--body);color:var(--text);cursor:pointer">${ICO('plus', 14)}Add a player</span>`;
const word = (text, cls) => `<span class="${cls}" style="font:700 10.5px/1 var(--body);letter-spacing:.08em;text-transform:uppercase">${text}</span>`;
export const addPlayer = `<div class="btn2" data-add style="box-shadow:none;border:1.5px dashed var(--outline);color:var(--muted);cursor:pointer">Add a player</div>`;

/** The seats' names, as the calculator gives them: Me and Opponent, then Opponent 1, 2 … from three. */
export const seatName = (i, n) => (i === 0 ? 'Me' : n === 2 ? 'Opponent' : `Opponent ${i}`);

/** Every card on the table, for the deck's greyed keys. */
const used = (t) => [...t.seats.flatMap((s) => s.cards), ...t.board].filter(Boolean);

/** The board as dealt so far, cut to a street the engine can read: nothing, the flop, the turn, the river. */
const dealt = (t) => {
  const b = t.board.filter(Boolean);
  return b.length >= 5 ? b.slice(0, 5) : b.length === 4 ? b : b.length >= 3 ? b.slice(0, 3) : [];
};
const STREET = { 0: 'before the flop', 3: 'on the flop', 4: 'on the turn', 5: 'on the river' };

const sel = (t, kind, i, j) => t.sel && t.sel.kind === kind && t.sel.i === i && (j === undefined || t.sel.j === j);
const holeCards = (t, i) => `<span style="display:flex;gap:4px">${t.seats[i].cards.map((c, j) => (c ? pc(c, 32, 44, 15, { attrs: ` data-hole="${i}:${j}"` }) : slot(sel(t, 'hole', i, j), ` data-hole="${i}:${j}"`))).join('')}</span>`;
const boardRow = (t) => `<div style="display:flex;gap:6px;margin:0 2px">${t.board.map((c, j) => (c ? pc(c, 32, 44, 15, { attrs: ` data-board="${j}"` }) : slot(sel(t, 'board', 0, j), ` data-board="${j}"`))).join('')}</div>`;

/** The five that make the hand, small: the cards that make it full, the kickers faded, except a kicker that decided. */
const fiveRow = (st) => `<div style="display:flex;gap:4px;margin-top:7px">${st.five.map((c, k) => pc(c, 24, 34, 11.5, { dim: k >= st.making && k !== st.decider })).join('')}</div>`;

/* ── Who wins ─────────────────────────────────────────────────────────── */

const WORDS = { river: { best: ['Winner', 'win'], shared: ['Split', 'muted'], behind: ['Beaten', 'loss'] }, live: { best: ['Ahead', 'win'], shared: ['Tied', 'muted'], behind: ['Behind', 'loss'] } };

/**
 * The table read for who is best right now. Seats count once both their
 * cards are in; with two such seats there is an answer.
 */
function whoWinsRead(t) {
  const board = dealt(t).map(E.parseCard);
  const ready = t.seats.map((s, i) => (s.cards.every(Boolean) ? i : -1)).filter((i) => i >= 0);
  if (ready.length < 2) return null;
  const st = E.standings(ready.map((i) => t.seats[i].cards.map(E.parseCard)), board);
  const bySeat = {};
  ready.forEach((i, k) => { bySeat[i] = st[k]; });
  return { bySeat, street: board.length, ready };
}

/** The answer, on the ink under the title. */
function whoWinsHero(t, read) {
  if (!read) return '';
  const n = t.seats.length;
  const best = read.ready.filter((i) => read.bySeat[i].place !== 'behind');
  const river = read.street === 5;
  const head = best.length > 1 ? (river ? 'Split ' : 'Tied ') + STREET[read.street] : (river ? 'Winner ' : 'Ahead ') + STREET[read.street];
  const names = best.map((i) => seatName(i, n));
  const who = best.length > 1 ? (names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`) : names[0];
  return `<div class="thero" style="padding-top:12px"><div style="font-size:12.5px;color:rgba(255,255,255,.72);font-weight:500">${head[0].toUpperCase() + head.slice(1)}</div>
    <div style="font:700 ${who.length > 14 ? 24 : 32}px/1.05 var(--head);letter-spacing:-.025em;color:#fff;margin-top:5px">${who}</div>
    <div style="font:600 14.5px/1.3 var(--body);color:rgba(255,255,255,.86);margin-top:5px">${read.bySeat[best[0]].label}</div></div>`;
}

function whoWinsSeat(t, i, read) {
  const n = t.seats.length;
  const st = read?.bySeat[i];
  const w = st ? WORDS[read.street === 5 ? 'river' : 'live'][st.place] : null;
  return `<div class="card pad" style="padding:8px 12px"><div style="display:flex;align-items:center;gap:10px">${holeCards(t, i)}
    <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span class="muted" style="font-size:12.5px">${seatName(i, n)}</span>${w ? word(w[0], w[1]) : ''}</div>
    <div style="font-size:14.5px;font-weight:600;line-height:1.25;margin-top:3px;${st ? '' : 'color:var(--dim);font-weight:500'}">${st ? st.label : 'Two cards'}</div></div></div>${st && read.street >= 3 ? fiveRow(st) : ''}</div>`;
}

/** Who wins: the top's parts and the sheet. */
export function whoWins(t) {
  const read = whoWinsRead(t);
  const deckOpen = !!t.sel;
  return {
    hero: deckOpen ? '' : whoWinsHero(t, read),
    body: [
      lbl('Board', read ? STREET[read.street] : ''), boardRow(t),
      lbl('Players'),
      ...t.seats.map((_, i) => whoWinsSeat(t, i, read)),
      ...(deckOpen ? ['<div class="grow"></div>', deck(used(t)), '<div style="height:8px"></div>'] : t.seats.length < 9 ? [addPlayer] : []),
    ],
    bar: '',
  };
}

/* ── Side pots ────────────────────────────────────────────────────────── */

const fmt = (n) => E.formatMoney(n);
const list = (names) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

function potsRead(t) {
  const board = dealt(t).map(E.parseCard);
  const inHand = t.seats.map((s, i) => (s.stack > 0 ? i : -1)).filter((i) => i >= 0);
  if (inHand.length < 2) return null;
  const hands = inHand.map((i) => (t.seats[i].cards.every(Boolean) ? t.seats[i].cards.map(E.parseCard) : null));
  const r = E.allInPots(hands, board, inHand.map((i) => t.seats[i].stack));
  const at = (k) => inHand[k];
  const ready = inHand.filter((i) => t.seats[i].cards.every(Boolean));
  const st = ready.length === inHand.length ? E.standings(ready.map((i) => t.seats[i].cards.map(E.parseCard)), board) : null;
  const label = {};
  if (st) ready.forEach((i, k) => { label[i] = st[k]; });
  return {
    street: board.length,
    total: r.total,
    pots: r.pots.map((p) => ({ ...p, eligible: p.eligible.map(at), leaders: p.leaders.map(at) })),
    returned: r.returned ? { seat: at(r.returned.seat), amount: r.returned.amount } : null,
    ends: r.ends ? Object.fromEntries(r.ends.map((e, k) => [at(k), e])) : null,
    label,
  };
}

function potSeat(t, i, read) {
  const n = t.seats.length;
  const s = t.seats[i];
  const st = read?.label[i];
  const end = read?.ends && read.street === 5 ? read.ends[i] : null;
  const focus = sel(t, 'stack', i);
  const stackText = s.stack > 0 || focus ? fmt(s.stack || 0) : '$0';
  const figure = end
    ? `<span class="muted" style="font-size:11.5px">Stack ${fmt(s.stack)}</span><b class="num m ${end.change > 0 ? 'win' : end.change < 0 ? 'loss' : ''}" style="font-size:17px;margin-top:3px">${E.formatSigned(end.change)}</b>`
    : `<span class="muted" style="font-size:11.5px">Stack</span><b class="num m${s.stack > 0 || focus ? '' : ' dimt'}" style="font-size:17px;margin-top:2px;cursor:pointer;${focus ? 'padding:4px 8px;margin-right:-8px;border-radius:9px;box-shadow:inset 0 0 0 2px var(--text)' : ''}">${stackText}</b>`;
  return `<div class="card pad" style="padding:8px 12px"><div style="display:flex;align-items:center;gap:10px">${holeCards(t, i)}
    <div style="flex:1;min-width:0"><span class="muted" style="font-size:12.5px">${seatName(i, n)}</span>
    <div style="font-size:13.5px;font-weight:600;line-height:1.25;margin-top:3px;${st ? '' : 'color:var(--dim);font-weight:500'}">${st ? st.label : 'Two cards'}</div></div>
    <div data-stack="${i}" style="display:flex;flex-direction:column;align-items:flex-end;flex:none;cursor:pointer">${figure}</div></div></div>`;
}

function potRow(t, p, read, last) {
  const n = t.seats.length;
  const names = p.eligible.map((i) => seatName(i, n));
  const river = read.street === 5;
  let outcome = '';
  if (p.leaders.length === 1) {
    const w = p.leaders[0];
    outcome = `<b class="${river ? 'win' : ''}" style="font-weight:700">${seatName(w, n)}</b> ${river ? 'wins it' : 'ahead'}`;
  } else if (p.leaders.length > 1) {
    const each = p.shares.every((x) => x === p.shares[0]);
    const who = list(p.leaders.map((i) => seatName(i, n)));
    outcome = `<b style="font-weight:700">${river ? 'Split' : 'Tied'}</b> <span class="muted">·</span> ${who}${river ? ` <span class="muted">·</span> <span class="m">${each ? `${fmt(p.shares[0])} each` : p.shares.map((x, k) => `${fmt(x)} ${seatName(p.leaders[k], n)}`).join(', ')}</span>` : ''}`;
  }
  return `<div style="padding:9px 0;${last ? '' : 'border-bottom:1px solid var(--line)'}">
    <div class="split" style="align-items:baseline"><b style="font-size:15px">${p.name}</b><b class="num m" style="font-size:16.5px">${fmt(p.amount)}</b></div>
    <div class="muted" style="font-size:12px;margin-top:2px">Between ${list(names)}</div>${outcome ? `<div style="font-size:13px;margin-top:4px;line-height:1.35">${outcome}</div>` : ''}</div>`;
}

/** Side pots: the top's parts, the sheet and the bar. */
export function sidePots(t) {
  const read = potsRead(t);
  const typing = t.sel?.kind === 'stack';
  const deckOpen = !!t.sel && !typing;
  const potsCard = read && !t.sel
    ? [lbl('Pots', `${fmt(read.total)} in the middle`),
      `<div class="card" style="padding:0 12px">${read.pots.map((p, k) => potRow(t, p, read, k === read.pots.length - 1 && !read.returned)).join('')}${read.returned
        ? `<div class="split" style="align-items:baseline;padding:9px 0"><span class="muted" style="font-size:13px"><b style="font-size:14px;color:var(--muted)">Uncalled</b> · back to ${seatName(read.returned.seat, t.seats.length)}</span><b class="num m muted" style="font-size:15px">${fmt(read.returned.amount)}</b></div>` : ''}</div>`]
    : [];
  return {
    hero: '',
    body: [
      lbl('Board', read && read.pots[0]?.leaders.length ? STREET[read.street] : ''), boardRow(t),
      lbl('All in', !t.sel && t.seats.length < 9 ? addInLabel() : ''),
      ...t.seats.map((_, i) => potSeat(t, i, read)),
      ...(deckOpen ? ['<div class="grow"></div>', deck(used(t)), '<div style="height:8px"></div>']
        : typing ? ['<div class="grow"></div>', keypad()]
        : potsCard),
    ],
    bar: typing ? 'done' : '',
  };
}
