/**
 * The kit every screen on the full board is drawn with: the look the owner
 * approved on 22 November (`../app-surfaces/README.md`), as parts.
 *
 *   - the header is the top of an ink screen, in white type;
 *   - the content is one white sheet that rises over it;
 *   - groups are white cards held off the sheet by one soft shadow: L2 as approved, with its
 *     downward fall shortened on 22 November so it stops short of flat content under a card;
 *   - the footer is the action: an ink bar across the bottom edge with its
 *     words set straight on it (F3). No button inside it.
 *   - dark: the top near-black, the sheet ink, cards one step lighter.
 *
 * Every colour is a token on `.fb`, redefined under `.dark .fb`, so one DOM
 * serves both themes. A screen file must not write a literal colour: use
 * `var(--text)` and friends, or a class from here.
 *
 * Nothing here is the app. `README.md` beside this file is the API.
 */
import { spot } from '../icon-system/art.mjs';
import BB from '../icon-system/bboxes.json' with { type: 'json' };
import APP from '../icon-system/app-icons.json' with { type: 'json' };
import { PICK } from '../icon-system/picks.mjs';
import { sizeFor } from '../icon-system/fresh-deck.mjs';

export { PICK };

export const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Franklin:wght@500;600;700;800&display=swap';

export const CSS = `
.fb{--top:#141A2A;--sheet:#FFFFFF;--card:#FFFFFF;--text:#141A2A;--muted:#596171;--dim:#9AA2B1;--line:#E4E7EC;--raised:#F1F3F6;
  --win:#0E7A45;--loss:#4E5768;--red:#C8283A;--bar:#141A2A;--pri:#141A2A;--onpri:#FFFFFF;--outline:#C5CAD4;
  --lift:0 0 0 1px rgba(20,26,42,.06),0 1px 3px rgba(20,26,42,.07),0 7px 14px -11px rgba(20,26,42,.2);
  --scrim:rgba(20,26,42,.42);--grab:#D5D9E0;
  --head:'Libre Franklin',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
.dark .fb{--top:#0A0D14;--sheet:#171C27;--card:#212836;--text:#ECEEF2;--muted:#9AA2B1;--dim:#6B7384;--line:rgba(255,255,255,.09);--raised:#2C3445;
  --win:#5CCB93;--loss:#A3ABBA;--red:#F0606E;--bar:#171C27;--pri:#ECEEF2;--onpri:#141A2A;--outline:rgba(255,255,255,.22);
  --lift:none;--scrim:rgba(0,0,0,.6);--grab:#3A4354}
.fb{width:330px;height:760px;border-radius:46px;padding:9px;background:#050506;box-shadow:0 0 0 1px #2a2a2e inset,0 24px 50px -24px rgba(0,0,0,.6);flex:none;box-sizing:border-box}
.fb *{box-sizing:border-box}
.fb .scr{position:relative;height:100%;border-radius:37px;overflow:hidden;background:var(--top);color:var(--text);font:400 14px/1.35 var(--body);-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
.fb .num{font-family:var(--head);font-variant-numeric:tabular-nums}
/* Every money figure is set in the figure face, whatever the text around it (owner, 22 November): moneyFont in build.mjs wraps each one in .m. Size and weight come from the line it sits in. */
.fb .m{font-family:var(--head);font-variant-numeric:tabular-nums;letter-spacing:-.005em}
.fb .win{color:var(--win)}.fb .loss{color:var(--loss)}.fb .muted{color:var(--muted)}.fb .dimt{color:var(--dim)}.fb .red{color:var(--red)}
.fb .ico{display:inline-flex;flex:none;line-height:0}.fb .ico svg{display:block}

/* The top: status bar, title, and whatever a screen keeps on the ink. Always white type, in both themes. */
.fb .top{flex:none;color:#fff;padding:0 18px 42px;position:relative}
.fb .top.flat{padding-bottom:16px}
.fb .sb{display:flex;justify-content:space-between;align-items:center;height:42px;padding:8px 10px 0;font:600 13px/1 var(--body)}
.fb .sb svg{height:11px;width:auto}
.fb .hdr{display:flex;align-items:center;gap:10px;min-height:36px}
.fb .hdr .bk{width:18px;height:36px;margin-left:-5px;display:grid;place-items:center;color:rgba(255,255,255,.72);flex:none}
.fb .hdr h1{margin:0;flex:1;min-width:0;font:700 22px/1.1 var(--head);letter-spacing:-.015em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb .hdr .trail{flex:none;display:flex;align-items:center;gap:8px;font:600 13px/1 var(--body);color:rgba(255,255,255,.72)}
.fb .tsub{margin:8px 0 0 23px;font-size:13px;color:rgba(255,255,255,.72);display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:20px}
.fb .tsub.nob{margin-left:0}
.fb .tsub:last-child{margin-bottom:-8px}
.fb .tsub b{color:#fff;font-weight:600}
.fb .tpill{display:inline-flex;align-items:center;gap:7px;font:700 13px/1 var(--head);padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;white-space:nowrap}
.fb .tpill i{width:7px;height:7px;border-radius:50%;background:#7BE3AE}
.fb .tbtn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;flex:none}
.fb .tdd{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:10px;background:rgba(255,255,255,.14);color:#fff;font-weight:600;font-size:12.5px;white-space:nowrap}
.fb .thero{padding:14px 2px 2px;margin-top:4px}
.fb .thero .row{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.fb .thero .lbl{font-size:12.5px;color:rgba(255,255,255,.72);font-weight:500}
.fb .thero .big{font:700 40px/1 var(--head);letter-spacing:-.03em;margin-top:4px;color:#fff}
.fb .thero .side{text-align:right;color:rgba(255,255,255,.72);font-size:12px;line-height:1.5;white-space:nowrap}
.fb .tbar{display:flex;gap:3px;height:3px;margin-top:12px}.fb .tbar i{display:block;border-radius:1.5px;background:#fff}.fb .tbar i:nth-child(even){background:rgba(255,255,255,.45)}
.fb .eyebrow{color:rgba(255,255,255,.72);font-size:13px;margin:22px 0 4px}
.fb .top h1.home{font:700 26px/1.04 var(--head);letter-spacing:-.02em;margin:0;color:#fff}

/* The sheet: the white ground everything else sits on. */
.fb .body{flex:1;min-height:0;margin-top:-26px;border-radius:26px 26px 0 0;background:var(--sheet);padding:18px 18px 0;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:12px}
.fb .body>*{flex:none}
.fb .body .grow{flex:1;min-height:0}

/* Section labels, cards and rows. */
.fb .lbl{display:flex;align-items:center;gap:8px;font:700 11px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--text);margin:4px 2px -4px}
.fb .lbl .r{margin-left:auto;letter-spacing:0;text-transform:none;font:700 13px/1 var(--head);color:var(--text)}
.fb .lbl.q{color:var(--muted)}
.fb .card{background:var(--card);border-radius:14px;box-shadow:var(--lift);padding:0 12px}
.fb .card.pad{padding:12px}
.fb .row{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 0;border-bottom:1px solid var(--line)}
.fb .row:last-child{border-bottom:0}
.fb .row .n{flex:1;min-width:0;font-weight:600;font-size:15.5px;line-height:1.2}
.fb .row .n small{display:block;font-weight:400;font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb .row .n small.wrap{white-space:normal}
.fb .row .a{font:700 16.5px/1.1 var(--head);font-variant-numeric:tabular-nums;text-align:right;flex:none}
.fb .row .a small{display:block;font:500 11.5px/1.2 var(--body);color:var(--muted);margin-top:3px}
.fb .row .v{color:var(--muted);font-size:13.5px;text-align:right;flex:none;max-width:56%}
.fb .row.dimr .n,.fb .row.dimr .a{color:var(--dim)}
.fb .row .lead{width:20px;color:var(--text);display:grid;place-items:center;flex:none}
.fb .terms{display:inline-flex;align-items:center;gap:5px;font:500 11px/1 var(--head);color:var(--muted);padding:4px 7px;border-radius:7px;background:var(--raised);white-space:nowrap}
.fb .pill{display:inline-flex;align-items:center;gap:6px;font:700 12px/1 var(--body);padding:6px 10px;border-radius:999px;background:var(--raised);color:var(--text);white-space:nowrap}
.fb .pill.win{color:var(--win)}.fb .pill.on{background:var(--pri);color:var(--onpri)}
.fb .note{font-size:13px;line-height:1.45;color:var(--muted);margin:0}
.fb .lead-p{font-size:15px;line-height:1.45;color:var(--text);margin:0}
.fb .h2{font:700 19px/1.15 var(--head);letter-spacing:-.01em;margin:0}
.fb .fig{font:700 38px/1 var(--head);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.fb .fig.s{font-size:26px}
.fb .stat3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fb .stat3>div{min-width:0}.fb .stat3 b{display:block;font:700 18px/1.1 var(--head);font-variant-numeric:tabular-nums}.fb .stat3 span{font-size:11.5px;color:var(--muted)}
.fb .hr{height:1px;background:var(--line);margin:2px 0}
.fb .split{display:flex;justify-content:space-between;align-items:baseline;gap:10px}

/* Controls that live in the content. The primary action never does: it is the bar. */
.fb .btn2{height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font:700 15px/1 var(--head);color:var(--text);box-shadow:inset 0 0 0 1.5px var(--outline)}
.fb .btn2.dead{color:var(--dim);box-shadow:inset 0 0 0 1.5px var(--line)}
.fb .btnq{display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;font:600 14px/1 var(--body);color:var(--muted)}
.fb .btnq.red{color:var(--red)}
.fb .fl{font:600 12.5px/1 var(--body);color:var(--muted);margin:0 0 6px 2px;display:block}
.fb .fi{min-height:48px;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--outline);padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;font:600 16px/1.2 var(--body);color:var(--text);background:var(--card)}
.fb .fi.ph{color:var(--dim);font-weight:400}.fb .fi.focus{box-shadow:inset 0 0 0 2px var(--text)}
.fb .fi .sfx{color:var(--muted);font-weight:500;font-size:13.5px}
.fb .chips{display:flex;flex-wrap:wrap;gap:8px}
/* Chips: lifted like the cards (owner, 22 November, option C): white on the soft shadow, squarer, and an add in an ink circle. Dark: one step lighter, no shadow. */
.fb .chip{height:40px;padding:0 12px 0 14px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;font:600 14.5px/1 var(--body);color:var(--text);background:var(--card);box-shadow:0 0 0 1px rgba(20,26,42,.06),0 1px 2px rgba(20,26,42,.08),0 5px 10px -7px rgba(20,26,42,.3);white-space:nowrap}
.dark .fb .chip{box-shadow:none}
.fb .chip>.muted:last-child{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--pri);color:var(--onpri)}
.fb .chip.on{background:var(--pri);color:var(--onpri);box-shadow:none}
.fb .chip.dash{box-shadow:none;background:none;border:1.5px dashed var(--outline)}
.fb .seg{display:flex;background:var(--raised);border-radius:12px;padding:3px}
.fb .seg span{flex:1;text-align:center;font:600 13.5px/1 var(--body);padding:10px 6px;border-radius:9px;color:var(--muted);white-space:nowrap}
.fb .seg span.on{background:var(--card);color:var(--text);box-shadow:0 1px 2px rgba(20,26,42,.14)}
.fb .tog{width:46px;height:28px;border-radius:999px;background:var(--outline);position:relative;flex:none}
.fb .tog::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff}
.fb .tog.on{background:var(--pri)}.fb .tog.on::after{left:21px;background:var(--onpri)}
.fb .kp{display:grid;grid-template-columns:repeat(3,1fr);margin:0 -18px;border-top:1px solid var(--line)}
.fb .kp>span{height:50px;display:grid;place-items:center;font:600 22px/1 var(--head);color:var(--text);border-bottom:1px solid var(--line);border-right:1px solid var(--line)}
.fb .kp>span:nth-child(3n){border-right:0}
.fb .tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fb .tile{position:relative;border-radius:14px;padding:10px 14px 14px;min-height:128px;background:var(--card);box-shadow:var(--lift);overflow:hidden}
.fb .tile>div{position:relative;z-index:1}
.fb .tile .tn{font:700 19px/1.1 var(--head);letter-spacing:-.01em}
.fb .tile .tx{font-size:11.5px;line-height:1.35;color:var(--muted);margin-top:3px;max-width:118px}
.fb .cta{position:relative;border-radius:14px;padding:13px 18px;display:flex;align-items:center;overflow:hidden;min-height:84px;background:var(--pri);color:var(--onpri);box-shadow:0 1px 2px rgba(20,26,42,.25),0 12px 24px -12px rgba(20,26,42,.55)}
.fb .cta .t{font:700 21px/1.1 var(--head);white-space:nowrap}
.fb .cta .s{font-size:13px;margin-top:6px;opacity:.72;padding-right:76px}
.fb .cta .art{position:absolute;right:6px;bottom:0;width:76px;height:76px}
.fb .art{display:block;line-height:0}
.fb .art-d{display:none}.dark .fb .art-d{display:block}.dark .fb .art-l{display:none}
.fb .inkd{display:none}.dark .fb .inkd{display:block}.dark .fb .inkl{display:none}

/* The bar: the footer is the action. Words straight on the ink; the whole bar is the target. */
.fb .bar{flex:none;background:var(--bar);color:#fff;padding-bottom:12px;position:relative;z-index:3}
.dark .fb .bar{box-shadow:0 -12px 24px -10px rgba(0,0,0,.65)}
.fb .bar .act{height:62px;display:flex;align-items:center;justify-content:center;gap:8px;font:700 18px/1 var(--head);color:#fff;flex:1;min-width:0;padding:0 14px;white-space:nowrap}
.fb .bar .act small{display:block;font:500 12px/1 var(--body);color:rgba(255,255,255,.62);margin-top:5px}
.fb .bar .act.col{flex-direction:column;gap:0}
.fb .bar.blocked .act,.fb .bar .act.dead{color:rgba(255,255,255,.38)}
.fb .bar .acts{display:flex}
.fb .bar .act.sec{flex:none;width:104px;flex-direction:column;gap:3px;font:700 13px/1 var(--head);box-shadow:inset 1px 0 0 rgba(255,255,255,.14)}
.fb .bar .act.half{box-shadow:inset 1px 0 0 rgba(255,255,255,.14)}
.fb .bar .act.half:first-child{box-shadow:none}
.fb .bar .disc{display:flex;align-items:center;gap:8px;padding:11px 22px 9px;font-size:14px;color:rgba(255,255,255,.75);box-shadow:inset 0 -1px 0 rgba(255,255,255,.14)}
.fb .bar .disc b{font-weight:600;flex:1}.fb .bar .disc span{font-size:12px}
.fb .bar .drow{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 22px;font:600 15px/1.2 var(--body);color:#fff;box-shadow:inset 0 -1px 0 rgba(255,255,255,.1)}
.fb .bar .drow small{display:block;font:400 12px/1.2 var(--body);color:rgba(255,255,255,.62);margin-top:3px}
.fb .bar .drow.hold{min-height:58px}.fb .bar .drow.hold b{color:#FF9AA2;font-weight:700}
.fb .bar .line{padding:9px 22px;font-size:12.5px;color:rgba(255,255,255,.72);text-align:center;box-shadow:inset 0 -1px 0 rgba(255,255,255,.14)}
.fb .bar.menu{display:flex;gap:10px;align-items:center;padding:12px 18px 24px}
.fb .bar.menu .mp{display:flex;align-items:center;gap:9px;height:44px;padding:0 18px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:700;font-size:15px;color:#fff}
.fb .bar.menu .mr{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;color:#fff}
.fb .bar.menu .mr:last-child{margin-left:auto}

/* A modal sheet (Chrome B): grabber, close, swipe down. It ends in the same bar. */
.fb .scrim{position:absolute;inset:0;background:var(--scrim);z-index:4}
.fb .modal{position:absolute;left:0;right:0;bottom:0;z-index:5;background:var(--sheet);border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden;max-height:calc(100% - 58px)}
.fb .modal.tall{top:58px}
.fb .scr:has(.modal.tall) .top .hdr,.fb .scr:has(.modal.tall) .top .tsub,.fb .scr.cover .top .hdr,.fb .scr.cover .top .tsub{visibility:hidden}
.fb .modal .grab{width:38px;height:5px;border-radius:3px;background:var(--grab);margin:8px auto 12px;flex:none}
.fb .modal .shd{display:flex;align-items:flex-start;gap:10px;padding:0 20px;flex:none}
.fb .modal .shd h2{margin:0;flex:1;font:700 24px/1.1 var(--head);letter-spacing:-.02em;color:var(--text)}
.fb .modal .shd .x{width:32px;height:32px;border-radius:50%;background:var(--raised);display:grid;place-items:center;flex:none;color:var(--text)}
.fb .modal .shd .bkx{width:32px;height:32px;border-radius:50%;background:var(--raised);display:grid;place-items:center;flex:none;color:var(--text)}
.fb .modal .shd-nav{align-items:center;margin-bottom:10px}
.fb .modal .sht{margin:0 20px;font:700 26px/1.1 var(--head);letter-spacing:-.02em;color:var(--text);flex:none}
.fb .modal .ssub{color:var(--muted);font-size:13px;line-height:1.4;margin:4px 20px 0;flex:none}
.fb .modal .mbody{flex:1;min-height:0;padding:14px 20px 18px;overflow:hidden;display:flex;flex-direction:column;gap:12px}
.fb .modal .mbody>*{flex:none}
.fb .modal .kp{margin:0 -20px}
`;

/* ── drawing ──────────────────────────────────────────────────────────── */

const STATUS = `<div class="sb"><span>9:41</span><svg viewBox="0 0 62 11" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/><rect x="38" y="0.5" width="21" height="10" rx="3" fill="none" stroke="currentColor"/><rect x="40" y="2.5" width="15" height="6" rx="1.5"/><rect x="60" y="3.5" width="1.5" height="4" rx=".75"/></g></svg></div>`;

/** One of the app's own icons (`../icon-system/app-icons.json`), in the current text colour. */
export function ico(name, size = 20) {
  if (!APP[name]) throw new Error(`no app icon "${name}". Have: ${Object.keys(APP).join(' ')}`);
  return `<span class="ico">${APP[name].replace('width="20"', `width="${size}"`).replace('height="20"', `height="${size}"`)}</span>`;
}

/** An approved drawing by its place (a PICK key: session, group, sessions, stats, tools, calculator, rulings, boosters, and the seven booster ids). Both palettes; CSS shows one. */
export function art(place, size = 76, { onInk = false } = {}) {
  const key = PICK[place] ?? place;
  const l = spot(key, onInk ? 'freshDeckOnInk' : 'freshDeck', { size, small: false });
  const d = spot(key, onInk ? 'freshDeck' : 'freshDeckOnInk', { size, small: false });
  return `<span class="art"><span class="art-l">${l}</span><span class="art-d">${d}</span></span>`;
}

/** A drawing in the bottom-right corner of a tile, sized by the board's ink rule. level: 'home' | 'tools'. */
export function tileArt(place, level = 'home', inset = level === 'tools' ? -10 : -6) {
  const key = PICK[place] ?? place;
  const [x, y, w, h] = BB[key];
  const S = sizeFor(key, level), k = S / 88;
  const right = -inset + (x - 4 + w) * k - S, bottom = -inset + (y - 12 + h) * k - S;
  const one = (pal, cls) => `<span class="${cls}">${spot(key, pal, { size: Math.round(S), small: false })}</span>`;
  return `<span class="art" style="position:absolute;right:${right.toFixed(1)}px;bottom:${bottom.toFixed(1)}px">${one('freshDeck', 'art-l')}${one('freshDeckOnInk', 'art-d')}</span>`;
}

/** A drawing at the head of a list row or a sheet, centred in a fixed slot. level: 'rows' | 'sheet'. */
export function slotArt(place, level = 'rows', slotW = 56, slotH = 46, align = 'centre') {
  const key = PICK[place] ?? place;
  const [x, y, w, h] = BB[key];
  let S = Math.min(sizeFor(key, level), (slotW * 88) / w);
  const k = S / 88;
  const left = align === 'left' ? -(x - 4) * k : slotW / 2 - (x - 4 + w / 2) * k;
  const top = slotH / 2 - (y - 12 + h / 2) * k;
  const one = (pal, cls) => `<span class="${cls}" style="position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;line-height:0">${spot(key, pal, { size: Math.round(S), small: false })}</span>`;
  return `<span class="art" style="position:relative;flex:none;width:${slotW}px;height:${slotH}px">${one('freshDeck', 'art-l')}${one('freshDeckOnInk', 'art-d')}</span>`;
}

/* ── the frame ────────────────────────────────────────────────────────── */

const join = (x) => (Array.isArray(x) ? x.filter(Boolean).join('') : x ?? '');

/**
 * The ink top of a pushed screen.
 *   title     the screen's title
 *   back      a back chevron (default true). Home has none.
 *   trailing  HTML at the right of the title: a step ("1 of 3"), a `tpill`, a `tdd`
 *   sub       the line under the title (HTML). `subRight` sits at its right end.
 *   extra     more HTML kept on the ink (Tonight's pot). Keep it short: the top is not a place for lists.
 */
export function top({ title, back = true, trailing = '', sub = '', subRight = '', extra = '' }) {
  return `<div class="top">${STATUS}<div class="hdr">${back ? `<span class="bk">${ico('chevron', 22).replace('<svg', '<svg style="transform:scaleX(-1)"')}</span>` : ''}<h1>${title}</h1>${trailing ? `<span class="trail">${trailing}</span>` : ''}</div>${
    sub || subRight ? `<div class="tsub${back ? '' : ' nob'}"><span>${sub}</span>${subRight}</div>` : ''}${extra}</div>`;
}

/** A pushed screen (Chrome A): ink top, white sheet, and a bar if the screen ends in an action. `body` is HTML or an array of HTML. */
export function push({ title, back, trailing, sub, subRight, extra, body, bar: foot = '' }) {
  return `<div class="fb"><div class="scr">${top({ title, back, trailing, sub, subRight, extra })}<div class="body">${join(body)}</div>${foot}</div></div>`;
}

/** A screen with a custom top (Home). `topHtml` goes inside `.top` after the status bar. */
export function pushRaw({ topHtml, body, bar: foot = '' }) {
  return `<div class="fb"><div class="scr"><div class="top">${STATUS}${topHtml}</div><div class="body">${join(body)}</div>${foot}</div></div>`;
}

/**
 * A modal sheet (Chrome B) over the screen it came from.
 *   behind  the title of the pushed screen underneath (drawn dimmed), or full HTML from `push()` without the outer phone via `behindHtml`
 *   title   the sheet's title;  sub: the line under it
 *   stepBack  true when the sheet is on a later step of a flow: a back circle sits left of the title (one close, always)
 *   tall    the sheet runs to the top (use when the content needs the height)
 */
export function sheet({ behind = '', title, sub = '', body, bar: foot = '', tall = false, stepBack = false }) {
  return `<div class="fb"><div class="scr">${top({ title: behind })}<div class="body"></div><div class="scrim"></div>
  <div class="modal${tall ? ' tall' : ''}"><div class="grab"></div>${stepBack
    /* A later step (owner, 26 November: the title level with the back and close looked unfinished): the two
       circles get their own row, the title its own line under them, full width. */
    ? `<div class="shd shd-nav"><span class="bkx">${ico('chevron', 18).replace('<svg', '<svg style="transform:scaleX(-1)"')}</span><span style="flex:1"></span><span class="x">${ico('close', 16)}</span></div><h2 class="sht">${title}</h2>`
    : `<div class="shd"><h2>${title}</h2><span class="x">${ico('close', 16)}</span></div>`}${
    sub ? `<p class="ssub">${sub}</p>` : ''}<div class="mbody">${join(body)}</div>${foot}</div></div></div>`;
}

/* ── the bar ──────────────────────────────────────────────────────────── */

/**
 * The footer bar with one action.
 *   label    the action's words (the app's own)
 *   sub      a small line under the words, inside the target
 *   blocked  the action is not available yet: the words go faint
 *   line     a quiet line above the action (a total, a status)
 *   icon     an app icon name before the words
 */
export function bar(label, { sub = '', blocked = false, line = '', icon = '' } = {}) {
  return `<div class="bar${blocked ? ' blocked' : ''}">${line ? `<div class="line">${line}</div>` : ''}<div class="act${sub ? ' col' : ''}">${icon ? ico(icon, 20) : ''}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span></div></div>`;
}

/** Two actions side by side: the primary wide on the left, a named secondary (with an icon) on the right. Tonight's Rebuy and Bill. */
export function barSplit(primary, secondary, { disc = null, drawer = '', primaryIcon = '', secondaryDead = false } = {}) {
  return `<div class="bar">${disc ? `<div class="disc">${ico(disc.open ? 'chevronDown' : 'chevronUp', 16)}<b>${disc.label}</b><span>${disc.hint ?? ''}</span></div>` : ''}${drawer}<div class="acts"><div class="act">${primaryIcon ? ico(primaryIcon, 20) : ''}<span>${primary}</span></div><div class="act sec${secondaryDead ? ' dead' : ''}">${secondary.icon ? ico(secondary.icon, 20) : ''}<span>${secondary.label}</span></div></div></div>`;
}

/** Two actions of equal weight (a choice, not a primary and a helper). */
export function barHalves(a, b) {
  return `<div class="bar"><div class="acts"><div class="act half">${a}</div><div class="act half">${b}</div></div></div>`;
}

/** A row in the bar's open drawer (Table admin). `hold` marks the one that must be held: its words go red-tinted, with the hold line under it. */
export function drawerRow(icon, label, { sub = '', hold = false } = {}) {
  return `<div class="drow${hold ? ' hold' : ''}">${ico(icon, 18)}<span>${hold ? `<b>${label}</b>` : label}${sub ? `<small>${sub}</small>` : ''}</span></div>`;
}

/** Home's bar: Settings, invite, theme. Not an action, so it keeps its three controls on the ink. */
export function barMenu() {
  return `<div class="bar menu"><span class="mp">${ico('settings', 20)}Settings</span><span class="mr">${ico('invite', 20)}</span><span class="mr"><span class="inkl">${ico('sun', 20)}</span><span class="inkd">${ico('moon', 20)}</span></span></div>`;
}

/* ── content ──────────────────────────────────────────────────────────── */

/** A section label. `right` is a figure at its right end; `icon` an app icon name; `quiet` makes it muted. */
export const label = (text, { right = '', icon = '', quiet = false } = {}) =>
  `<div class="lbl${quiet ? ' q' : ''}">${icon ? ico(icon, 13) : ''}${text}${right ? `<span class="r">${right}</span>` : ''}</div>`;

/** A lifted card holding rows (or any HTML). `pad: true` for free content rather than rows. */
export const card = (inner, { pad = false, style = '' } = {}) => `<div class="card${pad ? ' pad' : ''}"${style ? ` style="${style}"` : ''}>${join(inner)}</div>`;

/**
 * A row.
 *   name   the left words;  meta: a small line under them
 *   amount the right figure (already formatted);  tone: 'win' | 'loss' | '';  under: a small line under the figure (HTML)
 *   value  right-hand words instead of a figure (a setting's current value)
 *   lead   HTML at the left (an `ico()` or `slotArt()`);  trail: HTML at the far right (a `tog`, a `pill`)
 *   dim    the row is settled / inactive
 * Rows carry no chevrons: nothing points (Fresh Deck).
 */
export function row({ name, meta = '', amount = '', tone = '', under = '', value = '', lead = '', trail = '', dim = false, wrapMeta = false }) {
  return `<div class="row${dim ? ' dimr' : ''}">${lead ? (lead.includes('class="art"') ? lead : `<span class="lead">${lead}</span>`) : ''}<span class="n">${name}${meta ? `<small${wrapMeta ? ' class="wrap"' : ''}>${meta}</small>` : ''}</span>${
    value ? `<span class="v">${value}</span>` : ''}${amount ? `<span class="a ${tone}">${amount}${under ? `<small>${under}</small>` : ''}</span>` : ''}${trail}</div>`;
}

export const note = (text) => `<p class="note">${text}</p>`;
export const para = (text) => `<p class="lead-p">${text}</p>`;
export const pill = (text, cls = '') => `<span class="pill ${cls}">${text}</span>`;
export const terms = (html) => `<span class="terms">${html}</span>`;
/** A secondary button in the content (outlined). `dead` when unavailable. */
export const button = (text, { dead = false, icon = '' } = {}) => `<div class="btn2${dead ? ' dead' : ''}">${icon ? ico(icon, 18) : ''}${text}</div>`;
/** A quiet text button in the content. `red` for a destructive one. */
export const quiet = (text, { red = false, icon = '' } = {}) => `<div class="btnq${red ? ' red' : ''}">${icon ? ico(icon, 16) : ''}${text}</div>`;
/** A labelled input. `placeholder` when empty; `suffix` at its right; `focus` draws the caret state. */
export const field = (lbl, value, { placeholder = false, suffix = '', focus = false } = {}) =>
  `<div>${lbl ? `<span class="fl">${lbl}</span>` : ''}<div class="fi${placeholder ? ' ph' : ''}${focus ? ' focus' : ''}"><span>${value}</span>${suffix ? `<span class="sfx">${suffix}</span>` : ''}</div></div>`;
/** Preset chips. items: strings or {text, on, dash}. */
export const chips = (items) => `<div class="chips">${items.map((i) => (typeof i === 'string' ? { text: i } : i)).map((i) => `<span class="chip${i.on ? ' on' : ''}${i.dash ? ' dash' : ''}">${i.text}</span>`).join('')}</div>`;
/** A segmented control. `on` is the index selected. */
export const seg = (items, on = 0) => `<div class="seg">${items.map((t, i) => `<span class="${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
export const toggle = (on = false) => `<span class="tog${on ? ' on' : ''}"></span>`;
/** The amount keypad. */
export const keypad = ({ zeros = true } = {}) => `<div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', zeros ? '00' : '', '0'].map((k) => `<span>${k}</span>`).join('')}<span>${ico('backspace', 22)}</span></div>`;
/** Three figures in a line: [[figure, caption], ...]. */
export const stat3 = (items) => `<div class="stat3">${items.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>`;
export const fig = (text, { small = false, tone = '' } = {}) => `<div class="fig${small ? ' s' : ''} ${tone}">${text}</div>`;
export const hr = () => `<div class="hr"></div>`;
/** A home-style tile with a drawing in its corner. */
export const tile = (name, sub, place, level = 'home') => `<div class="tile">${tileArt(place, level)}<div><div class="tn">${name}</div>${sub ? `<div class="tx">${sub}</div>` : ''}</div></div>`;
/** Pieces for the top: the live pill, a round white button, the dropdown, Tonight's pot. */
export const topPill = (text, { dot = true } = {}) => `<span class="tpill">${dot ? '<i></i>' : ''}${text}</span>`;
/* The tools button's own drawing (owner, 25 November: two cards, K, with the red value, J, and bigger): two cards fanned, the front one white with a red question mark, 24 points in the 34-point round. */
export const TOOLS_ICON = `<svg width="24" height="24" viewBox="0 0 22 20" aria-hidden="true" style="display:block"><rect x="3" y="3.5" width="10" height="14.5" rx="2" transform="rotate(-14 8 10.75)" fill="#fff" opacity=".5"/><g transform="rotate(10 13 10)"><rect x="8" y="2.5" width="10.5" height="15" rx="2.1" fill="#fff"/><text x="13.25" y="13.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="9.5" fill="#E5484D">?</text></g></svg>`;
/* Owner, 25 November: D, the cards at 32 with no round behind them. */
export const topButton = (iconName) => iconName === 'questionCard' ? `<span style="display:grid;place-items:center;width:36px;height:36px;flex:none">${TOOLS_ICON.replace('width="24" height="24"', 'width="32" height="32"')}</span>` : `<span class="tbtn">${ico(iconName, 18)}</span>`;
export const topDropdown = (text) => `<span class="tdd">${text}${ico('chevronDown', 14)}</span>`;
export const topHero = ({ label: l, big, side = '', shares = [] }) =>
  `<div class="thero"><div class="lbl" style="all:unset;font-size:12.5px;color:rgba(255,255,255,.72);font-weight:500">${l}</div><div class="row" style="border:0;padding:0;min-height:0;align-items:flex-end"><div class="big">${big}</div><div class="side">${side}</div></div>${
    shares.length ? `<div class="tbar">${shares.map((s) => `<i style="flex:${s}"></i>`).join('')}</div>` : ''}</div>`;
