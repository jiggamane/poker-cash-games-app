/**
 * The affected screens, drawn in Fresh Deck — the owner's locked direction from
 * "Poker Club Style Round Two" (claude.ai artifact 8V2pTt3a9mNXwrdMZ8TJ3F),
 * with the approved spots in place of that page's placeholder icons.
 *
 * Layout, type, colour and copy are that page's (which took its words from the
 * shipped app); only the pictures are this board's. Its rules carry over:
 * names only, nothing points (no chevrons), Start a session is a solid ink
 * button, red belongs to chips and to hearts and diamonds.
 *
 * Everything is scoped under `.fd` so it cannot touch the board around it.
 */
import { spot } from './art.mjs';
import BB from './bboxes.json' with { type: 'json' };
import INK from './ink.json' with { type: 'json' };
import OPT from './optical.json' with { type: 'json' };
import { PICK as APPROVED_PICK } from './picks.mjs';
import { BOOSTERS } from '../../../packages/core/src/boosters.ts';

export const FD_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Franklin:wght@500;600;700;800&display=swap';

export const FD_CSS = `
.fd{--p-bg:#EEF0F3;--p-surface:#FFFFFF;--p-raised:#F1F3F6;--p-line:#E4E7EC;--p-text:#141A2A;--p-muted:#596171;--p-r:14px;
  --p-body:'Inter',system-ui,sans-serif;--p-head:'Libre Franklin',system-ui,sans-serif;--card-sh:0 1px 1.5px rgba(20,26,42,.07),0 8px 20px -12px rgba(20,26,42,.22)}
.fd-strip{display:flex;gap:22px;overflow-x:auto;padding:6px 2px 18px}
.fd-strip figure{margin:0;flex:none;display:flex;flex-direction:column;gap:10px}
.fd-strip figcaption{font:600 13px/1.3 -apple-system,'Figtree',sans-serif;color:#6C6C70;padding-left:6px;max-width:330px}
.fd .fdphone{width:330px;height:760px;border-radius:46px;padding:9px;background:#050506;box-shadow:0 0 0 1px #2a2a2e inset,0 24px 50px -24px rgba(0,0,0,.6)}
.fd .scr{position:relative;height:100%;border-radius:37px;overflow:hidden;background:var(--p-bg);color:var(--p-text);font:400 14px/1.35 var(--p-body);-webkit-font-smoothing:antialiased}
.fd .sb{display:flex;justify-content:space-between;align-items:center;height:42px;padding:8px 28px 0;font:600 13px/1 var(--p-body)}
.fd .sb svg{height:11px;width:auto}
.fd .pad{padding:4px 18px 0}
.fd .ic{width:20px;height:20px;flex:none;display:block}.fd .ic.xs{width:13px;height:13px}
.fd .rb{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 1px 2px rgba(20,26,42,.12);flex:none}
.fd .hdr{display:flex;align-items:center;gap:12px}
.fd .hdr h1{margin:0;flex:1;font:700 28px/1.05 var(--p-head);letter-spacing:-.025em}
.fd .fdsub{color:var(--p-muted);font-size:13px;margin:4px 0 0 48px}
.fd .fdeyebrow{color:var(--p-muted);font-size:13px;margin:22px 0 4px}
.fd .fdmenu h1{font:700 31px/1.02 var(--p-head);letter-spacing:-.025em;margin:0 0 18px;white-space:nowrap}
.fd .cta{position:relative;border-radius:var(--p-r);padding:13px 18px;display:flex;align-items:center;gap:12px;overflow:hidden;min-height:84px;background:#141A2A;color:#fff;box-shadow:0 1px 2px rgba(20,26,42,.25),0 12px 24px -12px rgba(20,26,42,.55)}
.fd .cta .t{font:700 21px/1.1 var(--p-head);white-space:nowrap}
.fd .cta .s{font-size:13px;margin-top:6px;color:rgba(255,255,255,.72);padding-right:76px}
.fd .cta .art{position:absolute;right:6px;bottom:0;width:76px;height:76px}
.fd .fdtiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.fd .fdtile{position:relative;border-radius:var(--p-r);padding:10px 14px 14px;min-height:128px;display:flex;flex-direction:column;justify-content:space-between;background:#fff;box-shadow:var(--card-sh);overflow:hidden}
.fd .fdtile .art{margin:-6px 0 0 -10px;width:64px;height:64px}
.fd .fdtile .tn{font:700 19px/1.1 var(--p-head);letter-spacing:-.01em}
.fd .fdtile{justify-content:flex-start}
.fd .fdtile>div{position:relative;z-index:1}
.fd .fdtile .tx{font-size:11.5px;line-height:1.35;color:var(--p-muted);margin-top:3px;max-width:118px}
.fd .fdtile .extra{position:absolute;right:12px;top:14px}
.fd .spark{width:64px;height:30px}
.fd .menubar{position:absolute;left:18px;right:18px;bottom:22px;display:flex;gap:10px;align-items:center}
.fd .menubar .fdpill{display:flex;align-items:center;gap:9px;height:44px;padding:0 18px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(20,26,42,.12);font-weight:700;font-size:15px}
.fd .menubar .rb{width:44px;height:44px}.fd .menubar .rb:last-child{margin-left:auto}
.fd .seclbl{display:flex;align-items:center;gap:8px;font:700 11px/1 var(--p-body);letter-spacing:.12em;text-transform:uppercase;color:var(--p-text);margin:16px 0 6px 2px}
.fd .blist{background:#fff;border-radius:var(--p-r);padding:0 12px;box-shadow:var(--card-sh)}
.fd .brow{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--p-line)}
.fd .brow:last-child{border-bottom:0}
.fd .brow .art{width:46px;height:46px;flex:none;margin-left:-4px}.fd .brow .art.slot{margin-left:-6px}
.fd .brow .bt{flex:1;min-width:0}
.fd .brow .bn{font:600 15px/1.2 var(--p-head)}
.fd .brow .bs{font-size:12px;color:var(--p-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fd .dim{position:absolute;inset:0;background:rgba(20,26,42,.38)}
.fd .sheet{position:absolute;left:0;right:0;bottom:0;top:58px;background:#fff;border-radius:24px 24px 0 0;padding:8px 20px 0}
.fd .grab{width:38px;height:5px;border-radius:3px;background:#D5D9E0;margin:0 auto 12px}
.fd .shd{display:flex;align-items:flex-start;gap:10px}
.fd .shd h2{margin:0;flex:1;font:700 26px/1.08 var(--p-head);letter-spacing:-.02em}
.fd .shd .x{width:32px;height:32px;border-radius:50%;background:var(--p-raised);display:grid;place-items:center;flex:none}
.fd .ssub{color:var(--p-muted);font-size:13px;margin:4px 0 0}
.fd .sheet .art{width:96px;height:96px;margin:6px 0 2px -10px}.fd .sheet .art.slot{margin:0}
.fd .what{font:400 16px/1.45 var(--p-body);color:var(--p-text);margin:0 0 14px}
.fd .lbl{font:700 11px/1 var(--p-body);letter-spacing:.12em;text-transform:uppercase;color:var(--p-muted);margin:0 0 8px}
.fd ol{margin:0;padding:0;list-style:none;display:grid;gap:8px;counter-reset:n}
.fd ol li{display:grid;grid-template-columns:18px 1fr;gap:6px;font-size:14px;line-height:1.4;counter-increment:n}
.fd ol li::before{content:counter(n);color:var(--p-muted);font-weight:600}
`;

const ic = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  userplus: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.4 0 2.6.3 3.6.9M18 14v6M15 17h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  close: '<path d="M7 7l10 10M17 7L7 17"/>',
};
const icon = (n, c = '') =>
  `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[n]}</svg>`;
const suit = {
  club: '<svg class="ic xs" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.3" r="3.7"/><circle cx="7.2" cy="13.2" r="3.7"/><circle cx="16.8" cy="13.2" r="3.7"/><path d="M12 11.5l-2.2 10h4.4z"/></svg>',
  diamond: '<svg class="ic xs" viewBox="0 0 24 24" fill="#C8283A"><path d="M12 2.5l6.8 9.5L12 21.5 5.2 12z"/></svg>',
};
const SB = `<div class="sb"><span>9:41</span><svg viewBox="0 0 62 11" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/><rect x="36" y=".5" width="22" height="10" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="38" y="2.5" width="16" height="6" rx="1.5"/><rect x="59" y="3.5" width="2" height="4" rx="1" opacity=".45"/></g></svg></div>`;

/** A spot in Fresh Deck colours, sized by its box. */
/*
 * Which palette the drawings take: Fresh Deck's light one by default. A page
 * drawing these screens in a dark theme sets it to the dark one, and names the
 * palette for the start button separately, since that button can be ink on a
 * light screen or light on a dark one.
 */
let SPOT_PAL = { base: 'freshDeck', cta: 'freshDeckOnInk' };
export const setSpotPalette = (p) => { SPOT_PAL = { ...SPOT_PAL, ...p }; };

const art = (key, size, onInk = false, pal) =>
  `<span class="art">${spot(key, pal ?? (onInk ? SPOT_PAL.cta : SPOT_PAL.base), { size })}</span>`;

/*
 * HOW A DRAWING'S SIZE IS PICKED (21 November). Not by its square, and not by
 * its outline: by its INK, the area it actually paints (ink.json, measured
 * with the shadow left out). A single chip paints most of its outline; a group
 * of chips with gaps paints much less; so at one outline size the chip looks
 * heavier. Each drawing is scaled so the area it paints equals a fixed share
 * of its tile:
 *
 *   ink side = rho x sqrt(tile area)    (ink side: the side of a square with
 *                                         the painted area)
 *   drawing size = ink side / sqrt(ink share of its own window)
 *
 * rho is the level of the screen: 0.35 on Home, where the tiles are the
 * places you go, and 0.27 one level down, on Poker tools, where the tiles are
 * tools on a page you are already on. The rule reproduces the owner's hand
 * corrections on Home (the group and the calendar a little smaller than the
 * stacks) without naming them, and it is why Poker tools came down.
 *
 * The ladder, 22 November: each level down paints 0.77 of the one above.
 * Home 0.35, Poker tools 0.27, the Game boosters rows 0.208; a booster's sheet
 * is that game's own page, so its drawing paints what Home's tiles do (0.35).
 *
 * Optical size, 22 November. Equal ink still let the Bomb pot read larger than
 * the Stand-up game in the boosters list, by two things ink ignores: a pale
 * pixel weighs less than a dark one (the near-white 7-2 cards against the
 * near-black bomb), and a tall compact outline reads larger than a flat wide
 * one at the same paint. So the share held constant is now the geometric mean
 * of the tone-weighted ink and the outline (optical.json, from ink.mjs).
 * In a row the drawing is centred on its slot by its outline and never drawn
 * wider than the slot, so a wide drawing (the Table ante) gives up a little
 * weight rather than run into its name.
 */
export const RHO = { home: 0.35, tools: 0.27, rows: 0.208, sheet: 0.35 };
const TILE = { w: 133, h: 128 };
export const inkSide = (level) => RHO[level] * Math.sqrt(TILE.w * TILE.h);
/* The optical share replaces the bare ink share; CAL keeps the fifteen picks'
   average size where the ink rule put it, so the levels above still hold. */
const PICKED = Object.values(APPROVED_PICK);
const CAL = Math.exp(PICKED.reduce((s, k) => s + Math.log(Math.sqrt(OPT[k] / INK[k])), 0) / PICKED.length);
export const sizeFor = (key, level) => (inkSide(level) * CAL) / Math.sqrt(OPT[key]);

/*
 * A drawing sized by the ink rule and set in a fixed slot: centred on it by
 * its measured outline, or (align: 'left') with its outline's left edge on
 * the slot's. Capped so the outline is never wider than the slot.
 */
/* Always the full drawing, never the simplified small one: a row and the sheet
   it opens show the same picture at two sizes (the owner, 22 November, on the
   7-2 cards losing their ranks in the row). */
function artSlot(key, level, slotW, slotH, align = 'centre') {
  const [x, y, w, h] = BB[key];
  let S = sizeFor(key, level);
  S = Math.min(S, (slotW * 88) / w);
  const k = S / 88;
  const left = align === 'left' ? -(x - 4) * k : slotW / 2 - (x - 4 + w / 2) * k;
  const top = slotH / 2 - (y - 12 + h / 2) * k;
  return `<span class="art slot" style="position:relative;display:block;flex:none;width:${slotW}px;height:${slotH}px;margin:0"><span style="position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;line-height:0">${spot(key, SPOT_PAL.base, { size: Math.round(S), small: false })}</span></span>`;
}

/**
 * The header the owner approved on 21 November: version N of
 * `../screen-headers/titles.html` on the Rail. The head of a screen is one
 * raised panel running up under the status bar; the title is small, bold and on
 * the left beside a bare grey chevron, and on Tonight the figure sits on the
 * panel without a card of its own. Sizes are that page's 300-point crop scaled
 * to these 330-point phones. `S` is the scope: `.fd` here, and the round-two
 * style page's `.d-d2` where `../updated-screens/` applies it to that page's
 * Tonight and results.
 */
export const railN = (S) => `
${S} .sb{position:relative;z-index:2}
${S} .railp{position:relative;z-index:1;margin:-46px -18px 16px;padding:46px 18px 16px;border-radius:0 0 30px 30px;
  background:radial-gradient(110% 80% at 50% 0%,rgba(20,26,42,.04),transparent 72%),#fff;
  box-shadow:inset 0 -1px 0 #E4E7EC,0 14px 24px -20px rgba(20,26,42,.28)}
${S} .railp .hdr{gap:10px;min-height:36px}
${S} .railp .hdr .rb{width:18px;height:36px;margin-left:-5px;background:none;box-shadow:none;border-radius:0;color:var(--p-muted)}
${S} .railp .hdr .rb svg{width:22px;height:22px}
${S} .railp .hdr h1{font:700 22px/1.1 'Libre Franklin',system-ui,sans-serif;letter-spacing:-.015em}
${S} .railp .sub,${S} .railp .fdsub,${S} .railp .role,${S} .railp .meta-l{margin-left:23px;margin-bottom:0}
${S} .railp .fdsub,${S} .railp .sub{margin-top:0}
${S} .railp .role .rb{background:var(--p-bg);box-shadow:none}
${S} .railp .hero{background:none;box-shadow:none;border-radius:0;padding:14px 2px 2px;margin-top:4px}
${S} .railp.home{padding-bottom:62px;margin-bottom:0}
${S} .railp.home h1{font:700 26px/1.04 'Libre Franklin',system-ui,sans-serif;letter-spacing:-.02em;margin:0}
${S} .railp.home + .cta{margin-top:-48px;z-index:2}
`;

export function freshDeckScreens(PICK, { withSheet = true, rail = false } = {}) {
  const R = (html, cls = '') => (rail ? `<div class="railp ${cls}">${html}</div>` : html);
  const spark = `<svg class="spark" viewBox="0 0 64 30" aria-hidden="true"><polyline points="2,22 12,18 22,24 32,12 42,15 52,6 62,9" fill="none" stroke="#141A2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="62" cy="9" r="2.6" fill="#141A2A"/></svg>`;
  const tiles = [
    /*
     * The group's line is the players screen's own meta line ("{n} on the
     * roster", app/players.tsx) for the seeded night's six — shorter, at the
     * owner's word, and a fact like Sessions' date. My stats' line is the
     * app's own, word for word, from before home dropped its sub-lines on
     * 27 October. Poker tools' old line
     * ("poker calculator, rules & rulings") predates Boosters, so this one is
     * the three tool names as the app writes them — ⚠ NEW COPY, unconfirmed.
     */
    [PICK.group, 'The group', '<div class="tx">6 on the roster</div>'],
    [PICK.sessions, 'Sessions', '<div class="tx">Fri 20 Nov</div>'],
    [PICK.stats, 'My stats', '<div class="tx">across every group you play in</div>'],
    [PICK.tools, 'Poker tools', '<div class="tx">calculator, rulings, boosters</div>'],
  ];
  const menu = `<div class="scr">${SB}<div class="pad fdmenu">
    ${R('<div class="fdeyebrow">Your group</div><h1>The Thursday game</h1>', 'home')}
    <div class="cta">${art(PICK.session, 76, true)}<div><div class="t">Start a session</div><div class="s">$500 buy-in · same rules as last time</div></div></div>
    <div class="fdtiles">${tiles.map(([k, n, x]) => `<div class="fdtile">${anchoredAt(k, sizeFor(k, 'home'), -6, -6)}<div><div class="tn">${n}</div>${x}</div></div>`).join('')}</div></div>
    <div class="menubar"><span class="fdpill">${icon('gear')}Settings</span><span class="rb">${icon('userplus')}</span><span class="rb">${icon('sun')}</span></div></div>`;

  const tools = `<div class="scr">${SB}<div class="pad">
    ${R(`<div class="hdr"><span class="rb">${icon('back')}</span><h1>Poker tools</h1></div>
    <div class="fdsub">nothing here touches the ledger</div>`)}
    <div class="fdtiles" style="margin-top:16px">${[
      [PICK.calculator, 'Calculator', 'hand and pot odds'],
      [PICK.rulings, 'Rulings', 'look up a ruling'],
      [PICK.boosters, 'Boosters', 'bomb pots and more'],
    ].map(([k, n, x]) => `<div class="fdtile">${anchoredAt(k, sizeFor(k, 'tools'), -10, -10)}<div><div class="tn">${n}</div><div class="tx">${x}</div></div></div>`).join('')}</div></div></div>`;

  const sections = [
    ['Side games', suit.club, ['stand-up', 'button-game', 'seven-deuce']],
    ['Bigger pots', suit.diamond, ['bomb-pot', 'double-board', 'straddle', 'table-ante']],
  ];
  const byId = Object.fromEntries(BOOSTERS.map((b) => [b.id, b]));
  const boosters = `<div class="scr">${SB}<div class="pad">
    ${R(`<div class="hdr"><span class="rb">${icon('back')}</span><h1>Game boosters</h1></div>
    <div class="fdsub">house rules for more action</div>`)}
    ${sections.map(([label, mark, ids]) => `<div class="seclbl">${mark}${label}</div><div class="blist">${ids
      .map((id) => `<div class="brow">${artSlot(PICK[id], 'rows', 52, 46)}<div class="bt"><div class="bn">${byId[id].name}</div><div class="bs">${byId[id].summary}</div></div></div>`)
      .join('')}</div>`).join('')}
  </div></div>`;

  const b = byId['stand-up'];
  const sheet = `<div class="scr">${SB}<div class="pad" style="opacity:.5">
    ${R(`<div class="hdr"><span class="rb">${icon('back')}</span><h1>Game boosters</h1></div>`)}</div>
    <div class="dim"></div>
    <div class="sheet"><div class="grab"></div>
      <div class="shd"><h2>${b.name}</h2><span class="x">${icon('close')}</span></div>
      <div class="ssub">Side games</div>
      <div style="margin:10px 0 8px">${artSlot(PICK['stand-up'], 'sheet', 150, 84, 'left')}</div>
      <p class="what">${b.what}</p>
      <div class="lbl">How it works</div>
      <ol>${b.how.map((h) => `<li>${h}</li>`).join('')}</ol>
    </div></div>`;

  return `<div class="fd fd-strip">${[
    ['Main menu', menu, 'The start button carries the chip stack. Each tile: the name on top at 19, the drawing in the bottom-right corner, placed by its outline and sized by its optical weight, ink and outline together (Home level, 0.35). My stats drops the style page’s sparkline: the drawing is already a chart.'],
    ['Poker tools', tools, 'Not drawn on the style page: the menu’s tiles (4d, name at 19) with the app’s sub-lines under each name. Drawings sized by the same rule at one level down (0.27), so they sit a step under Home’s.'],
    ['Game boosters', boosters, 'One spot per game at the head of its row. No chevrons, as Fresh Deck has it.'],
    ['A booster’s sheet', sheet, 'The game’s spot heads its description. The same seven drawings, larger.'],
  ].slice(0, withSheet ? 4 : 3).map(([cap, html, note]) => `<figure><div class="fdphone">${html}</div><figcaption>${cap}<br><span style="font-weight:400">${note}</span></figcaption></figure>`).join('')}</div>`;
}

/** A sheet per booster, each headed by its approved drawing: the phones for `../updated-screens/`. */
export function freshDeckSheets(PICK, ids, { rail = false } = {}) {
  const byId = Object.fromEntries(BOOSTERS.map((b) => [b.id, b]));
  const SECTION = { side: 'Side games', pots: 'Bigger pots' };
  return `<div class="fd fd-strip">${ids.map((id) => {
    const b = byId[id];
    return `<figure><div class="fdphone"><div class="scr">${SB}<div class="pad" style="opacity:.5">
    ${rail ? '<div class="railp">' : ''}<div class="hdr"><span class="rb">${icon('back')}</span><h1>Game boosters</h1></div>${rail ? '<div class="fdsub">house rules for more action</div></div>' : ''}</div>
    <div class="dim"></div>
    <div class="sheet"><div class="grab"></div>
      <div class="shd"><h2>${b.name}</h2><span class="x">${icon('close')}</span></div>
      <div class="ssub">${SECTION[b.section]}</div>
      <div style="margin:10px 0 8px">${artSlot(PICK[id], 'sheet', 150, 84, 'left')}</div>
      <p class="what">${b.what}</p>
      <div class="lbl">How it works</div>
      <ol>${b.how.map((h) => `<li>${h}</li>`).join('')}</ol>
    </div></div></div><figcaption>${b.name}</figcaption></figure>`;
  }).join('')}</div>`;
}

/* ── round 17: shapes under the icons, and where they sit in a tile ─────── */

export const OPT_CSS = `
.fd .mini{background:var(--p-bg);border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px}
.fd .mini .fdtiles{margin-top:0}
.fd .mini .fdtile{min-height:118px}
.fd .mini .fdtile .tn{font-size:var(--tn,16.5px);line-height:1.1}
.fd .mini .fdtile>div{position:relative;z-index:1}
.fd .mini .fdtile>.art{width:auto;height:auto;line-height:0}
.fd .mini .fdtile>.art svg{display:block}
.fd .shape{display:grid;place-items:center;flex:none;overflow:visible}
.fd .shape svg{display:block}
.fd .shape.sh-box{width:64px;height:64px;border-radius:16px;background:var(--p-raised)}
.fd .shape.sh-circle{width:64px;height:64px;border-radius:50%;background:var(--p-raised)}
.fd .shape.sh-stage{width:64px;height:64px;border-radius:16px;background:var(--p-raised);position:relative;overflow:hidden!important}
.fd .shape.sh-stage::before{content:"";position:absolute;left:-6px;right:-6px;bottom:-14px;height:30px;border-radius:50%;background:#E3E7EE}
.fd .shape.sh-stage .art{position:relative}
.fd .shape.sh-ring{width:64px;height:64px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--p-line)}
.fd .shape .art{margin:0!important;width:auto!important;height:auto!important}
.fd .fdtile>.shape{margin:-2px 0 0 -4px}
.fd .brow .shape.sh-box,.fd .brow .shape.sh-circle,.fd .brow .shape.sh-ring{width:44px;height:44px;border-radius:12px}
.fd .brow .shape.sh-circle,.fd .brow .shape.sh-ring{border-radius:50%}
.fd .brow .shape.sh-stage{width:46px;height:46px;border-radius:12px}
.fd .brow .shape.sh-stage::before{bottom:-12px;height:24px}
/* positions */
.fd .pos-tr .fdtile>.art{position:absolute;right:2px;top:0;margin:0}
.fd .pos-tr .fdtile{justify-content:flex-end}
.fd .pos-br .fdtile>.art{position:absolute;right:-18px;bottom:-12px;margin:0}
.fd .pos-br .fdtile{justify-content:flex-start}
.fd .pos-brin .fdtile>.art{position:absolute;right:2px;bottom:0;margin:0}
.fd .pos-brin .fdtile{justify-content:flex-start}
.fd .pos-c .fdtile{align-items:center;text-align:center}
.fd .pos-c .fdtile>.art{margin:-2px 0 0}
.fd .pos-anch .fdtile{justify-content:flex-start}
.fd .pos-row .fdtiles{grid-template-columns:1fr}
.fd .pos-row .fdtile{min-height:68px;flex-direction:row;align-items:center;justify-content:flex-start;gap:8px;padding:6px 14px 6px 8px}
.fd .pos-row .fdtile>.art{margin:0}
.fd .pos-top .fdtile{padding-top:0}
.fd .pos-top .fdtile>.art{margin:-8px 0 0 -12px}
`;

const HOME = (PICK) => [[PICK.group, 'The group'], [PICK.sessions, 'Sessions'], [PICK.stats, 'My stats'], [PICK.tools, 'Poker tools']];

/** The icon inside an optional shape. `size` is the drawing's size; a shape is a fixed box around it. */
function shaped(key, shape, size) {
  if (shape === 'none') return art(key, size);
  if (shape === 'flat') return art(key, size, false, 'freshDeckFlat');
  if (shape === 'floor') return art(key, size, false, 'freshDeckFloor');
  return `<span class="shape ${shape}">${art(key, size)}</span>`;
}

function homeTiles(PICK, shape, size, cls = '', tn) {
  return `<div class="fdtiles ${cls}"${tn ? ` style="--tn:${tn}px"` : ''}>${HOME(PICK).map(([k, n]) => `<div class="fdtile">${shaped(k, shape, size)}<div><div class="tn">${n}</div></div></div>`).join('')}</div>`;
}

function rows(PICK, shape, size) {
  const R = [[PICK['stand-up'], 'Stand-up game', 'Win a pot or pay up'], [PICK['bomb-pot'], 'Bomb pot', 'Everyone antes, straight to the flop']];
  return `<div class="blist">${R.map(([k, n, x]) => `<div class="brow">${shaped(k, shape, size)}<div class="bt"><div class="bn">${n}</div><div class="bs">${x}</div></div></div>`).join('')}</div>`;
}

export function shapeOptions(PICK) {
  const S = [
    ['shapeNone', 'A · no shape, ground shadow', 'What the screens above have: the drawing and its own soft shadow, nothing behind it.', 'none', 64, 46],
    ['shapeBox', 'B · Fresh Deck’s rounded box', 'The style page’s icon box brought back, with the drawing inside it. Its shadow stays.', 'sh-box', 58, 48],
    ['shapeCircle', 'C · a round', 'The shipped app’s 40 round, grown to 64. Reads as a token or a coin.', 'sh-circle', 58, 48],
    ['shapeStage', 'D · a stage', 'The box with a floor: a lighter ellipse at its foot that the object stands on, so the shadow has somewhere to land.', 'sh-stage', 58, 48],
    ['shapeRing', 'E · an outline round', 'A hairline circle instead of a fill: the shape is there, but it adds no grey.', 'sh-ring', 58, 48],
    ['shapeFloor', 'F · a solid floor', 'No box: the drawing’s own shadow turned into a flat grey floor under it.', 'floor', 64, 46],
    ['shapeFlat', 'G · nothing at all', 'No shape and no shadow: the object alone on the white.', 'flat', 64, 46],
  ];
  return S.map(([key, title, note, shape, tileSize, rowSize]) => ({
    key, title, note,
    html: `<div class="fd"><div class="mini">${homeTiles(PICK, shape, tileSize)}</div></div>`,
  }));
}

export function positionOptions(PICK) {
  const P = [
    ['posTL', '1 · top left, name at the foot', 'Where it sits now.', '', 64],
    ['posTop', '2 · top left, bigger and tucked into the corner', 'The same corner, the drawing larger and pulled up to the edge so it leads the tile.', 'pos-top', 76],
    ['posTR', '3 · top right, name at the foot', 'Icon and name on opposite corners: the name keeps the left edge the eye reads from.', 'pos-tr', 64],
    ['posBRin', '4 · name on top, icon bottom right', 'Name first, the drawing standing in the bottom corner like an object on the tile.', 'pos-brin', 72],
    ['posBR', '5 · name on top, icon bleeding off the corner', 'Larger and cropped by the tile’s edge, so the tile reads as a window onto the table.', 'pos-br', 96],
    ['posC', '6 · centred over the name', 'Symmetrical, like an app icon with its label. Calmest, least like a list.', 'pos-c', 70],
    ['posRow', '7 · beside the name, one per row', 'The tiles become wide rows: the drawing left, the name beside it. Home reads as a menu, not a grid.', 'pos-row', 56],
  ];
  return P.map(([key, title, note, cls, size]) => ({
    key, title, note,
    html: `<div class="fd"><div class="mini ${cls}">${homeTiles(PICK, 'none', size)}</div></div>`,
  }));
}

/* ── round 18: the same placements, larger, and title sizes ─────────────── */

/** One home-tile variant: a placement class, a drawing size, a shape, a title size. */
export function variantOption({ key, title, note, cls = '', size, shape = 'none', tn }, PICK) {
  return { key, title, note, html: `<div class="fd"><div class="mini ${cls}">${homeTiles(PICK, shape, size, '', tn)}</div></div>` };
}

/* ── round 19: placed by the drawing's outline, not its square ──────────── */

/*
 * Each drawing has a different footprint in its 96 box — the group is wide
 * and low, the calendar tall, the tools spread out — so one size and one
 * offset put them at different weights and crops. This sizes each so its
 * measured outline (bboxes.json) has the same area, `T` points on a side, and
 * places it so that outline runs `cx`/`cy` points past the tile's right and
 * bottom edges (negative: inset from them). Same weight, same crop, all four.
 */
function anchored(key, T, cx, cy) {
  const [, , w, h] = BB[key];
  return anchoredAt(key, (88 * T) / Math.sqrt(w * h), cx, cy);
}
/** A drawing at size S, its measured outline run cx/cy past the tile's right and bottom edges. */
function anchoredAt(key, S, cx, cy) {
  const [x, y, w, h] = BB[key];
  const k = S / 88;
  const right = -cx + (x - 4) * k + w * k - S;
  const bottom = -cy + (y - 12) * k + h * k - S;
  return `<span class="art" style="position:absolute;right:${right.toFixed(1)}px;bottom:${bottom.toFixed(1)}px;margin:0;width:auto;height:auto;line-height:0">${spot(key, SPOT_PAL.base, { size: Math.round(S) })}</span>`;
}

export function anchoredOption({ key, title, note, T, cx, cy, tn }, PICK) {
  const tiles = HOME(PICK).map(([k, n]) => `<div class="fdtile">${anchored(k, T, cx, cy)}<div><div class="tn">${n}</div></div></div>`).join('');
  return { key, title, note, html: `<div class="fd"><div class="mini pos-anch"><div class="fdtiles"${tn ? ` style="--tn:${tn}px"` : ''}>${tiles}</div></div></div>` };
}

/* ── round 20: a Poker tools drawing, shown in the menu's tile at 4d ────── */
export function toolsTileOption(key, title, note, { name = 'Poker tools', sub = 'calculator, rulings, boosters', level = 'home', c = -6 } = {}) {
  return {
    key, title, note,
    html: `<div class="fd"><div class="mini pos-anch" style="max-width:200px"><div class="fdtiles" style="grid-template-columns:1fr;--tn:19px"><div class="fdtile" style="min-height:128px">${anchoredAt(key, sizeFor(key, level), c, c)}<div><div class="tn">${name}</div><div class="tx">${sub}</div></div></div></div></div></div>`,
  };
}

/* ── round 23: a booster's drawing, in its list row and at its sheet's head ─ */
export function boosterOption(key, title, note, id = 'button-game') {
  const b = Object.fromEntries(BOOSTERS.map((x) => [x.id, x]))[id];
  return {
    key, title, note,
    html: `<div class="fd"><div class="mini"><div class="blist"><div class="brow">${art(key, 46)}<div class="bt"><div class="bn">${b.name}</div><div class="bs">${b.summary}</div></div></div></div>
      <div style="background:#fff;border-radius:14px;padding:6px 10px;line-height:0">${art(key, 96)}</div></div></div>`,
  };
}

/** The sizing rule as a table: each drawing on a tile, its ink share, and the size the rule gives it. */
export function sizingTable(PICK) {
  const rows = [
    [PICK.group, 'The group', 'home'], [PICK.sessions, 'Sessions', 'home'], [PICK.stats, 'My stats', 'home'], [PICK.tools, 'Poker tools', 'home'],
    [PICK.calculator, 'Calculator', 'tools'], [PICK.rulings, 'Rulings', 'tools'], [PICK.boosters, 'Boosters', 'tools'],
  ];
  return `<table class="sizing"><tr><th>Tile</th><th>Screen</th><th>Paints of its square</th><th>Size given</th><th></th></tr>${rows
    .map(([k, n, lv]) => `<tr><td>${n}</td><td>${lv === 'home' ? 'Home · 0.35' : 'Poker tools · 0.27'}</td><td>${Math.round(INK[k] * 100)}%</td><td>${Math.round(sizeFor(k, lv))} pt</td><td>${spot(k, 'freshDeck', { size: 44 })}</td></tr>`)
    .join('')}</table>`;
}
