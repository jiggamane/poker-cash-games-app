/**
 * Poker tools: the calculator, the run-out picture, the rulings library and one
 * ruling, the game boosters and one booster. None of it touches the ledger, so
 * almost none of it has a bar: these are places, not confirmations.
 *
 * /tools, /boosters and /booster reproduce the approved drawing in
 * `../../icon-system/fresh-deck.mjs` with the kit. The calculator's figures are
 * the running app's own, read off it for one hand (A♥ K♥ against 2♣ 2♦ on
 * Q♥ J♥ 3♠ 7♣ K♣), which is also the hand `/run-out`'s reference capture shows.
 *
 * PLAYING CARDS are the one place a literal colour is written in a screens
 * file: a card's face is white (#FFFFFF) in both themes, as the app keeps its
 * card stock the same in both. The ink is tokens: `var(--top)` (near-black in
 * both themes) for spades and clubs, `var(--red)` for hearts and diamonds.
 */
import { push, sheet, bar, label, card, row, note, para, button, field, ico, tile, slotArt, topButton } from '../kit.mjs';
import { BOOSTERS, BOOSTER_SECTIONS } from '../../../../packages/core/src/boosters.ts';

/* ── playing cards ────────────────────────────────────────────────────── */

const FACE = '#FFFFFF'; // the one literal: card stock, the same in both themes
const SUIT = {
  s: '<path d="M12 2.5C8 7 3.5 9.8 3.5 14a4.3 4.3 0 0 0 7.3 3.1L9.6 21.5h4.8l-1.2-4.4A4.3 4.3 0 0 0 20.5 14C20.5 9.8 16 7 12 2.5z"/>',
  h: '<path d="M12 21C5 15.5 2.5 12 2.5 8.2c0-2.9 2.2-5 4.9-5 1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 2.7 0 4.9 2.1 4.9 5 0 3.8-2.5 7.3-9.5 12.8z"/>',
  d: '<path d="M12 2.5l6.8 9.5L12 21.5 5.2 12z"/>',
  c: '<circle cx="12" cy="7.3" r="3.7"/><circle cx="7.2" cy="13.2" r="3.7"/><circle cx="16.8" cy="13.2" r="3.7"/><path d="M12 11.5l-2.2 10h4.4z"/>',
};
const inkOf = (s) => (s === 'h' || s === 'd' ? 'var(--red)' : 'var(--top)');
const pip = (s, size, color = inkOf(s)) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="display:block">${SUIT[s]}</svg>`;
/** A dealt card. `c` is rank + suit ("Ah"). */
const pc = (c, w = 32, h = 44, fs = 15) => {
  const [r, s] = c;
  return `<span style="width:${w}px;height:${h}px;border-radius:${w > 24 ? 6 : 4}px;background:${FACE};box-shadow:inset 0 0 0 1px var(--outline);display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;flex:none;font:800 ${fs}px/1 var(--head);color:${inkOf(s)}">${r}${pip(s, Math.round(fs * 0.8))}</span>`;
};
/** An empty place for a card: dashed with a plus; the next place to be dealt to is a solid outline in the text colour. */
const slot = (active = false, w = 32, h = 44) =>
  `<span style="width:${w}px;height:${h}px;border-radius:6px;${active ? 'box-shadow:inset 0 0 0 2px var(--text);color:var(--text)' : 'border:1.5px dashed var(--outline);color:var(--muted)'};display:inline-grid;place-items:center;flex:none">${ico('plus', 14)}</span>`;
const cards = (items, gap = 6) => `<div style="display:flex;gap:${gap}px;margin:0 2px">${items.join('')}</div>`;

/* ── the calculator's parts ───────────────────────────────────────────── */

const word = (text, cls) => `<span class="${cls}" style="font:700 10.5px/1 var(--body);letter-spacing:.08em;text-transform:uppercase">${text}</span>`;
const figure = (lbl, value, cls = '') => `<span style="display:inline-flex;align-items:baseline;gap:5px"><span class="muted" style="font-size:12.5px">${lbl}</span><b class="num ${cls}" style="font-size:14.5px">${value}</b></span>`;
const roundChevron = (name) => `<span style="width:28px;height:28px;border-radius:50%;background:var(--raised);color:var(--muted);display:grid;place-items:center;flex:none">${ico(name, 16)}</span>`;
/** One seat: its two cards, its name and word, Win and Tie, and whatever sits under them. */
const seat = ({ hand, name, tone = '', toneWord = '', win = '—', tie = '—', chevron = '', under = '' }) =>
  card(`<div style="display:flex;align-items:center;gap:10px"><span style="display:flex;gap:4px">${hand.join('')}</span>
    <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span class="muted" style="font-size:12.5px">${name}</span>${toneWord ? word(toneWord, tone) : ''}</div>
    <div style="display:flex;flex-wrap:wrap;column-gap:10px;margin-top:3px">${figure('Win', win, tone)}${figure('Tie', tie)}</div></div>${chevron ? roundChevron(chevron) : ''}</div>${under}`, { pad: true, style: 'padding:10px 12px' });
const outsNames = (names) => `<div style="display:flex;gap:6px;margin-top:9px">${names.map((n) => `<span class="pill" style="font-weight:600;font-size:11.5px;padding:5px 9px;color:var(--muted)">${n}</span>`).join('')}</div>`;
/** "Add a player": dashed, because in the app a dashed edge means it creates something. */
const addPlayer = `<div class="btn2" style="box-shadow:none;border:1.5px dashed var(--outline);color:var(--muted)">Add a player</div>`;

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
/** The deck as a keyboard at the foot of the sheet: Done on its strip, a row per suit, aces first. `gone` are cards already on the table. */
const deck = (gone = []) => `<div style="margin:0 -8px"><div style="display:flex;justify-content:flex-end;align-items:center;height:32px;padding:0 4px;font:700 14px/1 var(--body);color:var(--text)">Done</div>
  <div style="display:grid;gap:3px">${['s', 'h', 'd', 'c'].map((s) => `<div style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px">${RANKS.map((r) => {
    const out = gone.includes(r + s);
    return `<span style="height:32px;border-radius:4px;${out ? 'background:var(--raised);color:var(--dim)' : `background:${FACE};box-shadow:inset 0 0 0 1px var(--outline);color:${inkOf(s)}`};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:800 11.5px/1 var(--head)">${r}${pip(s, 10, out ? 'var(--dim)' : inkOf(s))}</span>`;
  }).join('')}</div>`).join('')}</div></div>`;

const oddsTop = { title: 'Poker calculator', sub: '<span style="white-space:nowrap;font-size:12px">Texas Hold’em card and chip odds</span>', subRight: topButton('restart') };
const ME = [pc('Ah'), pc('Kh')], OPP = [pc('2c'), pc('2d')];
const meTurn = seat({ hand: ME, name: 'Me', tone: 'loss', toneWord: 'Underdog', win: '40.91%', tie: '0.00%', chevron: 'chevronDown', under: outsNames(['Flush', 'Straight', 'One pair']) });
const oppTurn = seat({ hand: OPP, name: 'Opponent', tone: 'win', toneWord: 'Favourite', win: '59.09%', tie: '0.00%' });

const potRow = (name, value, focus = false) => `<div class="split" style="align-items:center;min-height:34px"><b style="font-size:15px">${name}</b>${
  focus ? `<span class="num" style="font-weight:700;font-size:17px;padding:5px 9px;border-radius:9px;box-shadow:inset 0 0 0 2px var(--text)">${value}</span>` : `<b class="num" style="font-size:17px">${value}</b>`}</div>`;
const potHead = `<div class="split" style="align-items:center"><b style="font:700 15.5px/1.2 var(--head)">Pot odds</b><span class="muted">${ico('chevronUp', 18)}</span></div>`;

/* ── the run-out's parts ──────────────────────────────────────────────── */

const street = (items, name) => `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:5px"><span style="display:flex;gap:4px">${items.join('')}</span><span class="muted" style="font:700 9.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase">${name}</span></span>`;
const pctRow = (who, cells, last = false) => `<div style="display:grid;grid-template-columns:30px repeat(4,1fr);align-items:center;min-height:42px;${last ? '' : 'border-bottom:1px solid var(--line)'}"><span class="muted" style="font:700 11px/1 var(--body)">${who}</span>${cells.map(([v, cls]) => `<b class="num ${cls}" style="font-size:15px;text-align:center">${v}</b>`).join('')}</div>`;

/* ── rulings ──────────────────────────────────────────────────────────── */

const draftLine = (area) => `<div style="display:flex;align-items:center;gap:10px"><span class="pill" style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Draft</span><span class="muted" style="font-size:13px">${area} · edition 2026.1</span></div>`;
const rulesTop = { title: 'Rules', sub: 'cash game first · edition 2026.1' };
const search = (value, on = false) => field('', value, { placeholder: !on, focus: on });
const YOUR_RULES = [['Buy-in', 'Standard $500', true], ['Short buy'], ['Rebuy cap'], ['Going south'], ['Notice before leaving'], ['Coming back'], ['Run it twice'], ['Chopping'], ['Straddle'], ['The button'], ['Rabbit hunting'], ['Check-raise'], ['Short bank'], ['Credit']];
const ruleRow = ([name, value = 'Not set', set = false], i, all) => `<div class="split" style="align-items:center;min-height:35px;${i === all.length - 1 ? '' : 'border-bottom:1px solid var(--line)'}"><b style="font-size:14.5px;font-weight:600">${name}</b><span class="${set ? 'num' : 'muted'}" style="font-size:12.5px;${set ? 'font-weight:600' : ''}">${value}</span></div>`;

/* ── boosters ─────────────────────────────────────────────────────────── */

const byId = Object.fromEntries(BOOSTERS.map((b) => [b.id, b]));
/* The approved drawing's order and its two marks: a club for Side games, a diamond for Bigger pots. */
const BOOSTER_ROWS = { side: ['stand-up', 'button-game', 'seven-deuce'], pots: ['bomb-pot', 'double-board', 'straddle', 'table-ante'] };
const MARK = { side: pip('c', 13, 'currentColor'), pots: pip('d', 13, 'var(--red)') };
const boosterLabel = (s) => `<div class="lbl">${MARK[s.id]}${s.label}</div>`;
const standUp = byId['stand-up'];
const sectionOf = (b) => BOOSTER_SECTIONS.find((s) => s.id === b.section)?.label ?? '';

export const section = { title: 'Poker tools', blurb: 'The calculator and its run-out picture, the rulings library and one ruling, and the game boosters: tools beside the game, none of which touch the ledger.' };

export default [
  { id: 'tools', route: '/tools', name: 'Poker tools', nav: 'push',
    html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: `<div class="tiles">${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Rulings<span style="display:inline-block;vertical-align:3px;margin-left:6px;font:700 9.5px/1 var(--body);letter-spacing:.08em;padding:3px 6px;border-radius:999px;background:var(--raised);color:var(--muted)">BETA</span>', 'look up a ruling', 'rulings', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}</div>` }) },

  { id: 'odds', route: '/odds', name: 'Poker calculator', nav: 'push',
    note: 'No bar: the calculator is a place, and the deck at its foot is a keyboard, not an action. New hand is the round button on the ink.',
    flags: ['Playing cards are drawn white in both themes, the one literal colour (#FFFFFF) in this file; their ink is tokens (--top for spades and clubs, --red for hearts and diamonds).',
      'The deck sits on the sheet above the bottom edge with only its Done strip. Should it instead be an ink panel like the bar, so it reads as a keyboard?'],
    html: push({ ...oddsTop,
      body: [
        label('Board', { quiet: true }), cards([slot(), slot(), slot(), slot(), slot()]),
        label('Players', { quiet: true }),
        seat({ hand: [slot(true), slot()], name: 'Me' }),
        seat({ hand: [slot(), slot()], name: 'Opponent' }),
        addPlayer,
        label('Dead cards', { quiet: true }), cards([slot()]),
        '<div class="grow"></div>', deck(), '<div style="height:8px"></div>',
      ] }) },

  { id: 'odds-turn', route: '/odds', name: 'Poker calculator · the turn, pot odds open', nav: 'push',
    note: 'The deck is away. Add a player and Dead cards follow below the fold.',
    flags: ['The app colours Favourite green and Underdog red, and the break-even mark amber. Here red is kept for chips, hearts and diamonds, so Underdog takes the grey loss tone and the mark is the text colour: confirm.',
      'No amber token in the kit: Too close (a near-even hand, not drawn here) and break-even are amber in the app.'],
    html: push({ ...oddsTop,
      body: [
        label('Board', { quiet: true }), cards([pc('Qh'), pc('Jh'), pc('3s'), pc('7c'), slot()]),
        label('Players', { quiet: true }), meTurn, oppTurn,
        label('Pot odds', { quiet: true }),
        card([potHead, `<div style="margin-top:4px;border-bottom:1px solid var(--line)">${potRow('Pot', '$400')}</div>`, potRow('To call', '$100'),
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px"><div><span class="muted" style="font-size:12px">Needs</span><div class="fig s">20.00<span style="font-size:14px">%</span></div></div><div><span class="muted" style="font-size:12px">You have</span><div class="fig s">40.91<span style="font-size:14px">%</span></div></div></div>`,
          `<div style="position:relative;height:8px;border-radius:4px;background:var(--raised);margin-top:8px"><i style="position:absolute;left:0;top:0;bottom:0;width:40.91%;border-radius:4px;background:var(--text)"></i><i style="position:absolute;left:20%;top:-4px;bottom:-4px;width:2px;background:var(--muted)"></i></div>`,
          `<div class="split muted" style="font-size:11px;margin-top:6px"><span>0</span><b>break-even 20.00%</b><span>100</span></div>`,
          `<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px;font-size:13.5px;font-weight:500">Over many runs this call returns <b class="num win">+$105</b></div>`,
          `<p class="note" style="font-size:11.5px;margin-top:4px">40.91% × ($400 + $100) − $100. Side pots are not counted.</p>`], { pad: true }),
      ] }) },

  { id: 'odds-amount', route: '/odds', name: 'Poker calculator · typing the pot', nav: 'push',
    note: 'The only state of the calculator with a bar: the keypad takes the deck’s place and Done, the app’s primary button under it, becomes the bar.',
    html: push({ ...oddsTop,
      body: [
        meTurn, oppTurn,
        label('Pot odds', { quiet: true }),
        card([potHead, `<div style="margin-top:4px;border-bottom:1px solid var(--line)">${potRow('Pot', '$400', true)}</div>`, potRow('To call', '$0')], { pad: true }),
        '<div class="grow"></div>',
        `<div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((k) => `<span${k === '00' ? ' class="dimt"' : ''} style="height:36px">${k}</span>`).join('')}<span style="height:36px">${ico('backspace', 22).replace('class="ico"', 'class="ico" style="height:auto;border:0"')}</span></div>`,
      ],
      bar: bar('Done') }) },

  { id: 'odds-river', route: '/odds', name: 'Poker calculator · the river', nav: 'push',
    note: 'The board is complete: whole figures, each hand named, and Me’s chevron open on the five cards that make it.',
    flags: ['Winner is green and Beaten red in the app; Beaten takes the grey loss tone here, as Underdog does.'],
    html: push({ ...oddsTop,
      body: [
        label('Board', { quiet: true }), cards([pc('Qh'), pc('Jh'), pc('3s'), pc('7c'), pc('Kc')]),
        label('Players', { quiet: true }),
        seat({ hand: ME, name: 'Me', tone: 'win', toneWord: 'Winner', win: '100%', tie: '0%', chevron: 'chevronUp',
          under: `<div style="font-size:14.5px;font-weight:500;margin-top:9px">Pair of kings</div><div style="display:flex;gap:4px;margin-top:8px">${['Kc', 'Kh', 'Ah', 'Qh', 'Jh'].map((c) => pc(c, 24, 34, 11.5)).join('')}</div>` }),
        seat({ hand: OPP, name: 'Opponent', tone: 'loss', toneWord: 'Beaten', win: '0%', tie: '0%', chevron: 'chevronDown',
          under: `<div style="font-size:14.5px;font-weight:500;margin-top:9px">Pair of deuces</div>` }),
        addPlayer,
        label('Dead cards', { quiet: true }), cards([slot()]),
      ] }) },

  { id: 'run-out', route: '/run-out', name: 'How it ran out', nav: 'push',
    flags: ['The app colours each figure by where the hand stands (green ahead, red behind, amber too close). Drawn with the kit’s tones: win, the grey loss, and muted for the two near-even pre-flop figures: confirm.'],
    html: push({ title: 'How it ran out', sub: 'All in before the flop',
      body: [
        `<div style="display:flex;align-items:flex-end;gap:14px;margin:0 2px"><div><div class="muted" style="font-size:12.5px;margin-bottom:6px">Player 1</div><span style="display:flex;gap:4px">${ME.join('')}</span></div>
          <span class="muted" style="font-size:14px;padding-bottom:12px">against</span>
          <div><div class="muted" style="font-size:12.5px;margin-bottom:6px">Player 2</div><span style="display:flex;gap:4px">${OPP.join('')}</span></div></div>`,
        label('Board', { quiet: true }),
        `<div style="display:flex;gap:12px;margin:0 2px">${street([pc('Qh'), pc('Jh'), pc('3s')], 'Flop')}${street([pc('7c')], 'Turn')}${street([pc('Kc')], 'River')}</div>`,
        card([
          `<div style="display:grid;grid-template-columns:30px repeat(4,1fr);padding:11px 0 7px;border-bottom:1px solid var(--line)"><span></span>${['Pre-flop', 'Flop', 'Turn', 'River'].map((s) => `<span class="muted" style="font:700 9.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;text-align:center">${s}</span>`).join('')}</div>`,
          pctRow('P1', [['49.8%', 'muted'], ['64.7%', 'win'], ['40.9%', 'loss'], ['100%', 'win']]),
          pctRow('P2', [['49.6%', 'muted'], ['35.3%', 'loss'], ['59.1%', 'win'], ['0%', 'loss']], true),
        ]),
        card(`<b style="font:700 16px/1.2 var(--head)">Player 1 won on the river</b><div class="muted" style="font-size:13px;margin-top:3px">A pair of kings beats a pair of deuces</div>`, { pad: true }),
        `<div class="split muted" style="font-size:12px;margin:2px 2px 0;padding-top:10px;border-top:1px solid var(--line)"><span>Every street counted exactly</span><span>Texas hold’em</span></div>`,
      ] }) },

  { id: 'rules', route: '/rules', name: 'Rules', nav: 'push', allowOverflow: true,
    note: 'A long library, drawn from its top and clipped where it scrolls: six areas (Betting, Showdown, Hands, Dealing, Money, Behaviour), then Your rules. Each area is one lifted card; the rows lose their chevrons.',
    html: push({ ...rulesTop,
      body: [
        search('What happened?'),
        label('Betting', { quiet: true }),
        card(['Said "raise", put in one chip', 'Bet in two motions', '"I\'ll see your bet… and raise"', 'Acted before their turn', 'Said "all in", chips still in the stack', 'All-in for less than a full raise', 'How much is a minimum raise?', 'Can you check and then raise?', 'Who can straddle?', 'Someone called the pot wrong'].map((name) => row({ name }))),
        label('Showdown', { quiet: true }),
        card(['Winning hand hit the muck', 'Dealer mucked a hand by mistake', 'Who shows first?'].map((name) => row({ name }))),
      ] }) },

  { id: 'rules-search', route: '/rules', name: 'Rules · searching', nav: 'push',
    note: 'Typing replaces the areas with one flat list of matches.',
    flags: ['The query “muck” is an example typed into the field, not app copy.',
      'Not drawn: a search with no match, which reads “Nothing in the library matches. Try the word a player would use.” in place of the list.'],
    html: push({ ...rulesTop,
      body: [
        search('muck', true),
        card(['Winning hand hit the muck', 'Dealer mucked a hand by mistake', 'Showed one card and mucked the other', 'Can I see the hand they mucked?'].map((name) => row({ name }))),
      ] }) },

  { id: 'rules-yours', route: '/rules', name: 'Rules · Your rules, at the foot', nav: 'push',
    note: 'The end of the same scroll. Share the rules sheet is the last row of the list in the app; here it is an outlined button under the card, a secondary action, so the screen still has no bar.',
    flags: ['“Not set” is amber in the app; the kit has no amber token, so it is muted here.',
      'Should Share the rules sheet stay a row inside the card, as the app has it, rather than a button?'],
    html: push({ ...rulesTop,
      body: [
        label('Your rules', { quiet: true }),
        card(YOUR_RULES.map(ruleRow)),
        button('Share the rules sheet', { icon: 'share' }),
      ] }) },

  { id: 'situation', route: '/situation', name: 'A ruling', nav: 'sheet',
    note: 'No bar: a ruling is read, not confirmed. The title wraps to two lines rather than being cut as it is in the app today.',
    html: sheet({ behind: 'Rules', title: 'Winning hand hit the muck',
      body: [
        draftLine('Showdown'),
        para('If the cards are face up on the table, they play. Cards speak: the dealer reads them, and a hand the player misread still wins.'),
        para('If they went face down into the muck and can be pulled out with no doubt which they were, they are live. If there is any doubt, the hand is dead and the pot goes to the best hand still showing.'),
        label('Source', { quiet: true }),
        note('Robert\'s Rules of Poker, Showdown · TDA 2026 r.15 · TDA 2026 r.17'),
        label('See also', { quiet: true }),
        card(['Dealer mucked a hand by mistake', 'Who shows first?', 'Misread their hand'].map((name) => row({ name }))),
      ] }) },

  { id: 'situation-group', route: '/situation', name: 'A ruling that reads the group’s own rule', nav: 'sheet',
    note: 'Where the answer depends on the group, its rule sits in a card with Change, which leaves for the table rules. Different in a tournament is a disclosure that opens in place, so it keeps its down chevron.',
    flags: ['“Not set” is amber in the app; muted here (no amber token).',
      'The chevron on Different in a tournament: the look says nothing points, but this one opens the line in place rather than leading somewhere. Keep, or mark it another way?'],
    html: sheet({ behind: 'Rules', title: 'Who can straddle?',
      body: [
        draftLine('Betting'),
        para('A straddle is a blind raise posted before the cards, and the player who posted it acts last before the flop. Where it sits depends on the group. Your group has not said whether a straddle is allowed.'),
        card([`<div class="lbl q" style="margin:0 0 8px">Your group</div>`,
          `<div style="display:flex;align-items:center;gap:12px"><b style="flex:1;font-size:15.5px;font-weight:600">Straddle</b><span class="muted" style="font-size:14.5px;font-weight:500">Not set</span><b style="font-size:14.5px">Change</b></div>`], { pad: true }),
        label('Source', { quiet: true }),
        note('Robert\'s Rules of Poker, Blinds · Your group\'s rules'),
        `<div class="split muted" style="align-items:center;min-height:46px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:14.5px;font-weight:600"><span>Different in a tournament</span>${ico('chevronDown', 18)}</div>`,
        label('See also', { quiet: true }),
        card(row({ name: 'How much is a minimum raise?' })),
      ] }) },

  { id: 'boosters', route: '/boosters', name: 'Game boosters', nav: 'push',
    html: push({ title: 'Game boosters', sub: 'house rules for more action',
      body: BOOSTER_SECTIONS.flatMap((s) => [
        boosterLabel(s),
        card(BOOSTER_ROWS[s.id].map((id) => row({ lead: slotArt(id, 'rows', 56, 48), name: byId[id].name, meta: byId[id].summary, wrapMeta: true })), { style: 'padding-left:6px' }),
      ]) }) },

  { id: 'booster', route: '/booster', name: 'A booster’s sheet', nav: 'sheet',
    note: 'The top of the sheet, as the approved drawing has it. It scrolls on in the app’s own order: Choose your version, Agree before you start, Variations, Worth knowing, and the line that nothing needs recording. No bar: nothing here is confirmed.',
    html: sheet({ behind: 'Game boosters', title: standUp.name, sub: sectionOf(standUp), tall: true,
      body: [
        slotArt('stand-up', 'sheet', 150, 84, 'left'),
        para(standUp.what),
        label('How it works', { quiet: true }),
        `<div style="display:grid;gap:8px">${standUp.how.map((h, i) => `<div style="display:grid;grid-template-columns:18px 1fr;gap:6px;font-size:14px;line-height:1.4"><b class="muted" style="font-weight:600">${i + 1}</b><span>${h}</span></div>`).join('')}</div>`,
      ] }) },
];
