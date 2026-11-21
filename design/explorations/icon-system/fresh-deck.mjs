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
.fd .cta{position:relative;border-radius:var(--p-r);padding:20px 18px;display:flex;align-items:center;gap:12px;overflow:hidden;min-height:104px;background:#141A2A;color:#fff;box-shadow:0 1px 2px rgba(20,26,42,.25),0 12px 24px -12px rgba(20,26,42,.55)}
.fd .cta .t{font:700 21px/1.1 var(--p-head);white-space:nowrap}
.fd .cta .s{font-size:13px;margin-top:6px;color:rgba(255,255,255,.72);padding-right:76px}
.fd .cta .art{position:absolute;right:4px;bottom:2px;width:84px;height:84px}
.fd .fdtiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.fd .fdtile{position:relative;border-radius:var(--p-r);padding:10px 14px 14px;min-height:128px;display:flex;flex-direction:column;justify-content:space-between;background:#fff;box-shadow:var(--card-sh);overflow:hidden}
.fd .fdtile .art{margin:-6px 0 0 -10px;width:64px;height:64px}
.fd .fdtile .tn{font:700 16.5px/1.1 var(--p-head);letter-spacing:-.01em}
.fd .fdtile .tx{font-size:11.5px;color:var(--p-muted);margin-top:3px}
.fd .fdtile .extra{position:absolute;right:12px;top:14px}
.fd .spark{width:64px;height:30px}
.fd .menubar{position:absolute;left:18px;right:18px;bottom:22px;display:flex;gap:10px;align-items:center}
.fd .menubar .fdpill{display:flex;align-items:center;gap:9px;height:44px;padding:0 18px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(20,26,42,.12);font-weight:700;font-size:15px}
.fd .menubar .rb{width:44px;height:44px}.fd .menubar .rb:last-child{margin-left:auto}
.fd .seclbl{display:flex;align-items:center;gap:8px;font:700 11px/1 var(--p-body);letter-spacing:.12em;text-transform:uppercase;color:var(--p-text);margin:16px 0 6px 2px}
.fd .blist{background:#fff;border-radius:var(--p-r);padding:0 12px;box-shadow:var(--card-sh)}
.fd .brow{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--p-line)}
.fd .brow:last-child{border-bottom:0}
.fd .brow .art{width:46px;height:46px;flex:none;margin-left:-4px}
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
.fd .sheet .art{width:96px;height:96px;margin:6px 0 2px -10px}
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
const art = (key, size, onInk = false) =>
  `<span class="art">${spot(key, onInk ? 'freshDeckOnInk' : 'freshDeck', { size })}</span>`;

export function freshDeckScreens(PICK) {
  const spark = `<svg class="spark" viewBox="0 0 64 30" aria-hidden="true"><polyline points="2,22 12,18 22,24 32,12 42,15 52,6 62,9" fill="none" stroke="#141A2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="62" cy="9" r="2.6" fill="#141A2A"/></svg>`;
  const tiles = [
    [PICK.group, 'The group', ''],
    [PICK.sessions, 'Sessions', '<div class="tx">Fri 20 Nov</div>'],
    [PICK.stats, 'My stats', ''],
    [PICK.tools, 'Poker tools', ''],
  ];
  const menu = `<div class="scr">${SB}<div class="pad fdmenu">
    <div class="fdeyebrow">Your group</div><h1>The Thursday game</h1>
    <div class="cta">${art(PICK.session, 84, true)}<div><div class="t">Start a session</div><div class="s">$500 buy-in · same rules as last time</div></div></div>
    <div class="fdtiles">${tiles.map(([k, n, x], i) => `<div class="fdtile">${art(k, 64)}<div><div class="tn">${n}</div>${x}</div></div>`).join('')}</div></div>
    <div class="menubar"><span class="fdpill">${icon('gear')}Settings</span><span class="rb">${icon('userplus')}</span><span class="rb">${icon('sun')}</span></div></div>`;

  const tools = `<div class="scr">${SB}<div class="pad">
    <div class="hdr"><span class="rb">${icon('back')}</span><h1>Poker tools</h1></div>
    <div class="fdsub">nothing here touches the ledger</div>
    <div class="fdtiles" style="margin-top:16px">${[
      [PICK.calculator, 'Calculator', 'hand and pot odds'],
      [PICK.rulings, 'Rulings', 'look up a ruling'],
      [PICK.boosters, 'Boosters', 'bomb pots and more'],
    ].map(([k, n, x]) => `<div class="fdtile">${art(k, 64)}<div><div class="tn">${n}</div><div class="tx">${x}</div></div></div>`).join('')}</div></div></div>`;

  const sections = [
    ['Side games', suit.club, ['stand-up', 'button-game', 'seven-deuce']],
    ['Bigger pots', suit.diamond, ['bomb-pot', 'double-board', 'straddle', 'table-ante']],
  ];
  const byId = Object.fromEntries(BOOSTERS.map((b) => [b.id, b]));
  const boosters = `<div class="scr">${SB}<div class="pad">
    <div class="hdr"><span class="rb">${icon('back')}</span><h1>Game boosters</h1></div>
    <div class="fdsub">house rules for more action</div>
    ${sections.map(([label, mark, ids]) => `<div class="seclbl">${mark}${label}</div><div class="blist">${ids
      .map((id) => `<div class="brow">${art(PICK[id], 46)}<div class="bt"><div class="bn">${byId[id].name}</div><div class="bs">${byId[id].summary}</div></div></div>`)
      .join('')}</div>`).join('')}
  </div></div>`;

  const b = byId['stand-up'];
  const sheet = `<div class="scr">${SB}<div class="pad" style="opacity:.5">
    <div class="hdr"><span class="rb">${icon('back')}</span><h1>Game boosters</h1></div></div>
    <div class="dim"></div>
    <div class="sheet"><div class="grab"></div>
      <div class="shd"><h2>${b.name}</h2><span class="x">${icon('close')}</span></div>
      <div class="ssub">Side games</div>
      ${art(PICK['stand-up'], 96)}
      <p class="what">${b.what}</p>
      <div class="lbl">How it works</div>
      <ol>${b.how.map((h) => `<li>${h}</li>`).join('')}</ol>
    </div></div>`;

  return `<div class="fd fd-strip">${[
    ['Main menu', menu, 'The start button carries the chip stack; the four tiles carry their spots in place of the icon box. My stats drops the style page’s sparkline: the drawing is already a chart.'],
    ['Poker tools', tools, 'Not drawn on the style page: laid out like its menu tiles, with the app’s names and sub-lines.'],
    ['Game boosters', boosters, 'One spot per game at the head of its row. No chevrons, as Fresh Deck has it.'],
    ['A booster’s sheet', sheet, 'The game’s spot heads its description. The same seven drawings, larger.'],
  ].map(([cap, html, note]) => `<figure><div class="fdphone">${html}</div><figcaption>${cap}<br><span style="font-weight:400">${note}</span></figcaption></figure>`).join('')}</div>`;
}
