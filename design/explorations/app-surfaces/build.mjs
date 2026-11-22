/**
 * Builds the surfaces page: the ground, the rail and the cards behind every
 * screen, in light and in dark, and what the rail does when a list scrolls.
 *
 *   node design/explorations/app-surfaces/build.mjs [--artifact <path>]   (needs Playwright)
 *
 * Nothing is drawn here. The screens are the ones already approved: Home and
 * Game boosters from the icon board's Fresh Deck renderer, Tonight and the
 * results from the round-two style page, all under the approved header (N on
 * the Rail), with the approved tools button (D, ink). Each option is the same
 * four phones with a handful of colour rules laid over them, set in its own
 * shadow root so the two source stylesheets cannot touch the page or each
 * other's options. `--artifact` also writes the published copy, with the
 * board's Approve / Needs work controls (../icon-system/review.js).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PICK } from '../icon-system/picks.mjs';
import { FD_CSS, FD_FONTS, freshDeckScreens, railN, setSpotPalette } from '../icon-system/fresh-deck.mjs';
import APP from '../icon-system/app-icons.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;

/* ── the screens, lifted once ─────────────────────────────────────────── */

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(here, '../updated-screens/sources/style-round-two.html')).href);
const style = await page.evaluate((APP) => {
  for (const pad of document.querySelectorAll('#d2 .phone .scr > .pad')) {
    const head = [...pad.children].filter((c) => c.matches('.hdr, .role, .hero, .meta-l, .sub'));
    if (!head.length || !pad.querySelector('.hdr')) continue;
    const rail = document.createElement('div'); rail.className = 'railp';
    pad.insertBefore(rail, head[0]); head.forEach((c) => rail.appendChild(c));
  }
  const MAP = { tools: 'questionCard', receipt: 'receipt', cutlery: 'food', piggy: 'piggy' };
  for (const svg of document.querySelectorAll('#d2 .phone svg.ri')) {
    const name = MAP[svg.querySelector('use')?.getAttribute('href')?.replace('#r-', '')];
    if (!name) continue;
    const size = Math.round(parseFloat(getComputedStyle(svg).width) * 0.86);
    const span = document.createElement('span');
    span.className = 'appico'; span.innerHTML = APP[name];
    span.firstElementChild.setAttribute('width', size); span.firstElementChild.setAttribute('height', size);
    svg.replaceWith(span);
  }
  /* The approved tools button: D, the ink round. */
  for (const rb of document.querySelectorAll('#d2 .role .rb')) rb.classList.add('tools-d');
  const phones = [...document.querySelectorAll('#d2 .strip figure .phone')].map((p) => p.outerHTML);
  return {
    css: [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => !t.startsWith(':root{color-scheme:light;box-sizing')).join('\n'),
    sprite: [...document.querySelectorAll('svg')].filter((s) => s.querySelector('symbol')).map((s) => s.outerHTML).join(''),
    tonight: phones[0], results: phones[3],
  };
}, APP);

/* Home and Game boosters, drawn twice: with the light palette for the drawings, and the dark one. */
async function fdPhones(pal) {
  setSpotPalette(pal);
  await page.setContent(freshDeckScreens(PICK, { rail: true, withSheet: false }));
  return page.evaluate(() => [...document.querySelectorAll('.fdphone')].map((p) => p.outerHTML));
}
const fdLight = await fdPhones({ base: 'freshDeck', cta: 'freshDeckOnInk' });
const fdDark = await fdPhones({ base: 'freshDeckOnInk', cta: 'freshDeck' });
await browser.close();

/* ── the options ──────────────────────────────────────────────────────── */

/*
 * Every surface a screen paints, by role. Fresh Deck hard-codes white on most
 * of its cards, so a theme overrides them by selector rather than by variable.
 */
const CARDS = ['.fdtile', '.blist', '.rows', '.outrow', '.rcard', '.dd', '.menubar .rb', '.menubar .fdpill', '.menubar .pill', '.dock', '.fd .rb', '.d-d2 .hdr .rb'];
const themeCSS = (t) => `
.fd,.d-d2{--p-bg:${t.ground};--p-surface:${t.card};--p-raised:${t.raised};--p-line:${t.line};--p-text:${t.text};--p-muted:${t.muted};--p-win:${t.win};--p-loss:${t.loss}}
.scr{background:${t.groundImage ?? t.ground}!important;color:${t.text}}
${CARDS.map((c) => `${c}`).join(',')}{background:${t.card}!important;box-shadow:${t.cardShadow}!important}
.railp{background:${t.rail}!important;box-shadow:${t.railShadow}!important}
.railp .hero{background:none!important;box-shadow:none!important}
.railp .hdr .rb{background:none!important;box-shadow:none!important;color:${t.muted}}
${t.dark ? `
.fd .cta{background:${t.cta}!important;color:${t.ctaText}!important;box-shadow:none!important}.fd .cta .s{color:${t.ctaSub}!important}
.d-d2 .stackbar i{background:${t.text}!important}.d-d2 .stackbar i:nth-child(even){background:${t.muted}!important}
.btn-pri{background:${t.cta}!important;color:${t.ctaText}!important}
.btn-sec{box-shadow:inset 0 0 0 1.5px ${t.line}!important;color:${t.text}!important}
.appico{color:${t.text}}.terms .appico,.dl .appico{color:${t.muted}}
.d-d2 .live{background:rgba(92,203,147,.14)!important}
.d-d2 .seclbl,.fd .seclbl{color:${t.text}!important}
.rb svg,.fd .ic{color:${t.text}}
.role .rb.tools-d{background:${t.cta}!important}.role .rb.tools-d .appico,.role .rb.tools-d svg{color:${t.ctaText}!important}
.d-d2 .seclbl .ic,.d-d2 .seclbl svg{color:${t.text}!important}
.d-d2 .terms,.d-d2 .rb-pill{background:${t.raised}!important}` : ''}`;

const LIGHT = [
  { key: 'light-a', name: 'A · as approved', note: 'Fresh Deck as the style round left it: a cool grey ground (#EEF0F3), white cards with a soft shadow, the rail white and lit from the top.',
    t: null },
  { key: 'light-b', name: 'B · a lighter ground', note: 'The ground a step paler (#F5F6F8), the cards’ shadow a step firmer to hold their edges. Airier; less contrast between ground and card.',
    t: { ground: '#F5F6F8', card: '#FFFFFF', raised: '#F1F3F6', line: '#E6E9EE', text: '#141A2A', muted: '#596171', win: '#0E7A45', loss: '#4E5768',
      cardShadow: '0 1px 1.5px rgba(20,26,42,.09),0 10px 22px -12px rgba(20,26,42,.28)', rail: '#FFFFFF', railShadow: 'inset 0 -1px 0 #E4E7EC,0 14px 24px -20px rgba(20,26,42,.3)' } },
  { key: 'light-c', name: 'C · white ground, grey cards', note: 'Turned over: the screen is white and the cards are the grey, flat, with no shadow. The rail becomes the grey panel at the top. Quieter and flatter; nothing floats.',
    t: { ground: '#FFFFFF', card: '#F3F4F7', raised: '#E9EBF0', line: '#E4E7EC', text: '#141A2A', muted: '#596171', win: '#0E7A45', loss: '#4E5768',
      cardShadow: 'none', rail: '#F3F4F7', railShadow: 'none' } },
  { key: 'light-d', name: 'D · a wash under the rail', note: 'As A, with the ground a shade darker at the top of the screen, fading to A’s grey by the middle, so the white rail stands off it more and the lower screen stays light.',
    t: { ground: '#EEF0F3', groundImage: 'linear-gradient(180deg,#E2E6EC 0,#EEF0F3 46%)', card: '#FFFFFF', raised: '#F1F3F6', line: '#E4E7EC', text: '#141A2A', muted: '#596171', win: '#0E7A45', loss: '#4E5768',
      cardShadow: '0 1px 1.5px rgba(20,26,42,.07),0 8px 20px -12px rgba(20,26,42,.22)', rail: 'radial-gradient(110% 80% at 50% 0%,rgba(20,26,42,.04),transparent 72%),#fff', railShadow: 'inset 0 -1px 0 #E4E7EC,0 16px 26px -18px rgba(20,26,42,.32)' } },
];

const D = { win: '#5CCB93', loss: '#A3ABBA', text: '#ECEEF2', muted: '#9AA2B1', dark: true };
const DARK = [
  { key: 'dark-a', name: 'A · ink', note: 'Fresh Deck’s ink taken down to a ground (#0E121A); the cards a step up, the rail a step above them. The primary button turns light, so Rebuy and Start a session still lead.',
    t: { ...D, ground: '#0E121A', card: '#1A1F2B', raised: '#242A38', line: 'rgba(255,255,255,.07)', cardShadow: 'none', rail: '#1F2533', railShadow: 'inset 0 -1px 0 rgba(255,255,255,.06)', cta: '#ECEEF2', ctaText: '#141A2A', ctaSub: 'rgba(20,26,42,.68)' } },
  { key: 'dark-b', name: 'B · the app’s near-black', note: 'The dark theme the app ships today (ground #0A0A0B, cards #16161A, raised #26262B), carried into Fresh Deck’s layout. Neutral rather than blue.',
    t: { ...D, text: '#FFFFFF', muted: '#8B8D93', ground: '#0A0A0B', card: '#16161A', raised: '#26262B', line: 'rgba(255,255,255,.08)', cardShadow: 'none', rail: '#1B1B20', railShadow: 'inset 0 -1px 0 rgba(255,255,255,.07)', cta: '#FFFFFF', ctaText: '#0C0D0F', ctaSub: 'rgba(12,13,15,.65)' } },
  { key: 'dark-c', name: 'C · the rail lit, the cards low', note: 'Ink ground, the cards barely above it, the rail clearly lighter: in the dark the header carries the screen and the list sits back.',
    t: { ...D, ground: '#0E121A', card: '#161B25', raised: '#222838', line: 'rgba(255,255,255,.06)', cardShadow: 'none', rail: '#252C3C', railShadow: 'inset 0 -1px 0 rgba(255,255,255,.08),0 16px 26px -18px rgba(0,0,0,.6)', cta: '#ECEEF2', ctaText: '#141A2A', ctaSub: 'rgba(20,26,42,.68)' } },
];

/*
 * Outside the system. Sections 1 to 3 keep the layout (a white rail, cards on a
 * ground, a floating dock) and move its colours. These change the structure:
 * what the header is, what the ground is, what the footer is. Still the same
 * four phones and the same words; each is themeCSS plus a few structural rules.
 */
const L = { text: '#141A2A', muted: '#596171', win: '#0E7A45', loss: '#4E5768', line: '#E4E7EC', raised: '#F1F3F6' };
const INK = '#141A2A';
/* A header set on a dark or coloured band: its own text palette, the pills and the tools button turned over. */
const onBand = (sel = '') => `
${sel} .sb{color:#fff!important}${sel} .sb svg{color:#fff;fill:#fff}
${sel} .railp{--p-text:#fff;--p-muted:rgba(255,255,255,.72);--p-line:rgba(255,255,255,.16);color:#fff}
${sel} .railp h1,${sel} .railp .hero *{color:#fff}
${sel} .railp .fdeyebrow,${sel} .railp .fdsub,${sel} .railp .role,${sel} .railp .meta-l,${sel} .railp .hdr .rb,${sel} .railp .hero .lbl,${sel} .railp .hero-r,${sel} .railp .hero-r *{color:rgba(255,255,255,.72)!important}
${sel} .railp .role b{color:#fff!important}
${sel} .railp .stackbar i{background:#fff!important}${sel} .railp .stackbar i:nth-child(even){background:rgba(255,255,255,.45)!important}
${sel} .railp .live{background:rgba(255,255,255,.16)!important;color:#fff!important}${sel} .railp .live *{color:#fff!important}${sel} .railp .live i,${sel} .railp .live::before{background:#7BE3AE!important}
${sel} .railp .dd{background:rgba(255,255,255,.14)!important;box-shadow:none!important;color:#fff!important}${sel} .railp .dd *{color:#fff!important}
${sel} .railp .role .rb.tools-d{background:#fff!important}${sel} .railp .role .rb.tools-d .appico{color:${INK}!important}`;
const bareRail = `.railp{background:none!important;box-shadow:none!important;border-radius:0!important}`;

const BEYOND = [
  { key: 'beyond-sheet', name: 'A · Ink top, white sheet', note: 'The header is not a panel: it is the top of an ink screen, in white type, and Tonight’s pot sits on it. Everything else is one white sheet that rises over it. Cards are flat grey on the sheet. The footer is not a floating dock: it is the foot of the sheet, behind a hairline.',
    t: { ...L, ground: '#FFFFFF', card: '#F3F4F7', raised: '#E9EBF0', cardShadow: 'none', rail: INK, railShadow: 'none' },
    css: `${onBand()}
.railp{border-radius:0!important;padding-bottom:42px!important;margin-bottom:0!important}
.railp::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:27px;background:#fff;border-radius:26px 26px 0 0}
.railp.home{padding-bottom:50px!important}.railp.home + .cta{margin-top:-12px!important}
.dock{left:0!important;right:0!important;bottom:0!important;border-radius:0!important;background:#fff!important;box-shadow:inset 0 1px 0 #E4E7EC!important;padding:10px 18px 24px!important}
.foot{left:0!important;right:0!important;bottom:0!important;padding:12px 18px 24px;background:#fff;box-shadow:inset 0 1px 0 #E4E7EC}
.menubar{left:0!important;right:0!important;bottom:0!important;padding:12px 18px 24px;background:#fff;box-shadow:inset 0 1px 0 #E4E7EC}
.menubar .rb,.menubar .fdpill,.menubar .pill{background:#F3F4F7!important}` },

  { key: 'beyond-felt', name: 'B · Felt', note: 'The ground is the table: a deep green, lit from the top. No header panel at all; the title and the pot sit straight on the felt in white. Cards stay white, like cards. The footer is an ink bar floating on the felt, with the primary button turned white.',
    t: { ...L, ground: '#0E5239', groundImage: 'radial-gradient(130% 62% at 50% 0%,#1E7F59 0,#0F5A3E 58%,#0A4530 100%)', card: '#FFFFFF', cardShadow: '0 1px 2px rgba(0,0,0,.25),0 10px 22px -12px rgba(0,0,0,.5)', rail: 'none', railShadow: 'none' },
    css: `${onBand()}${bareRail}
.railp{margin-bottom:4px!important}
.seclbl,.seclbl *{color:#fff!important}.seclbl{opacity:.92}
.ded,.ded *,.ended,.ended *{color:#fff!important}.ded .appico{color:rgba(255,255,255,.8)!important}.ded{border-color:rgba(255,255,255,.2)!important}
.dock{background:${INK}!important;box-shadow:0 12px 26px -10px rgba(0,0,0,.6)!important;border-radius:26px!important;left:10px!important;right:10px!important;bottom:12px!important}
.dock-h,.dock-h *{color:rgba(255,255,255,.75)!important}
.dock .btn-pri{background:#fff!important;color:${INK}!important}.dock .btn-pri *{color:${INK}!important}
.dock .btn-sec{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)!important;color:#fff!important}.dock .btn-sec *{color:#fff!important}
.foot .btn-pri{background:#fff!important;color:${INK}!important;box-shadow:0 12px 26px -10px rgba(0,0,0,.6)}
.fd .cta{box-shadow:0 12px 26px -10px rgba(0,0,0,.65)!important}
.menubar .rb,.menubar .fdpill,.menubar .pill{background:rgba(255,255,255,.14)!important;box-shadow:none!important;color:#fff!important}.menubar svg{color:#fff!important}` },

  { key: 'beyond-paper', name: 'C · Paper', note: 'No panels and no cards anywhere. A white page: the title large over one ink rule, lists as plain rows between hairlines, section labels doing the grouping. The footer is the only solid thing on the screen: an ink bar across the bottom edge.',
    t: { ...L, ground: '#FFFFFF', card: 'transparent', cardShadow: 'none', rail: 'none', railShadow: 'none' },
    css: `${bareRail}
.railp{box-shadow:inset 0 -2px 0 ${INK}!important;margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;padding-bottom:14px!important}
.railp .hdr h1{font-size:27px!important;letter-spacing:-.025em!important}.railp.home h1{font-size:30px!important}
.railp.home{padding-bottom:16px!important;margin-bottom:14px!important}.railp.home + .cta{margin-top:0!important}
.blist,.rows,.outrow,.rcard{padding-left:0!important;padding-right:0!important;border-radius:0!important}
.rows,.blist,.rcard,.outrow{box-shadow:inset 0 1px 0 #E4E7EC,inset 0 -1px 0 #E4E7EC!important}
.fdtile{box-shadow:inset 0 0 0 1.5px #DDE1E7!important}
.railp .role .rb{background:#F1F3F6}
.railp .dd{box-shadow:inset 0 0 0 1.5px #DDE1E7!important}
.dock{left:0!important;right:0!important;bottom:0!important;border-radius:0!important;background:${INK}!important;box-shadow:none!important;padding:12px 18px 26px!important}
.dock-h,.dock-h *{color:rgba(255,255,255,.75)!important}
.dock .btn-pri{background:#fff!important;color:${INK}!important}.dock .btn-pri *{color:${INK}!important}
.dock .btn-sec{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)!important;color:#fff!important}.dock .btn-sec *{color:#fff!important}
.foot{left:0!important;right:0!important;bottom:0!important;background:${INK};padding:8px 18px 22px}
.menubar{left:0!important;right:0!important;bottom:0!important;padding:12px 18px 24px;background:${INK}}
.menubar .rb,.menubar .fdpill,.menubar .pill{background:rgba(255,255,255,.12)!important;box-shadow:none!important;color:#fff!important}.menubar svg{color:#fff!important}` },

  { key: 'beyond-glass', name: 'D · Frosted bars', note: 'The ground carries colour: a slow drift from cool blue to a warm blush. The header and the footer are frosted glass bars, square to the screen edges, and the list passes under both. Cards are a soft white that lets the ground through.',
    t: { ...L, ground: '#EEF0F3', groundImage: 'radial-gradient(90% 46% at 8% 4%,#C9DBF6 0,transparent 70%),radial-gradient(80% 42% at 100% 58%,#F6D9D2 0,transparent 72%),radial-gradient(90% 40% at 10% 100%,#D5E6DC 0,transparent 70%),#EEF1F5', card: 'rgba(255,255,255,.72)', cardShadow: 'inset 0 0 0 1px rgba(255,255,255,.7),0 8px 22px -14px rgba(20,26,42,.3)', rail: 'rgba(255,255,255,.5)', railShadow: 'inset 0 -1px 0 rgba(255,255,255,.8),0 1px 0 rgba(20,26,42,.06)' },
    css: `.scr{clip-path:inset(0 round 37px)}
.railp{border-radius:0!important;-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5)}
.dock{left:0!important;right:0!important;bottom:0!important;border-radius:0!important;background:rgba(255,255,255,.55)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 -1px 0 rgba(20,26,42,.06)!important;padding:10px 18px 24px!important;-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5)}
.foot,.menubar{left:0!important;right:0!important;bottom:0!important;padding:12px 18px 24px;background:rgba(255,255,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 -1px 0 rgba(20,26,42,.06);-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5)}
.railp .role .rb:not(.tools-d){background:rgba(255,255,255,.7)}` },

  { key: 'beyond-state', name: 'E · The header says the state', note: 'The header is a full band of colour, and the colour means something: green while a game is live, ink once it is settled, white on the menus where nothing is happening. The primary button in the footer takes the band’s colour, so top and bottom of the screen agree about where you are.',
    t: { ...L, ground: '#EEF0F3', card: '#FFFFFF', cardShadow: '0 1px 1.5px rgba(20,26,42,.07),0 8px 20px -12px rgba(20,26,42,.22)', rail: '#FFFFFF', railShadow: 'inset 0 -1px 0 #E4E7EC' },
    css: `.railp{border-radius:0!important}
${onBand('figure:nth-child(2)')}${onBand('figure:nth-child(4)')}
figure:nth-child(2) .railp{background:linear-gradient(180deg,#0C6B3D,#0E7A45)!important;box-shadow:none!important}
figure:nth-child(2) .btn-pri{background:#0E7A45!important}
figure:nth-child(4) .railp{background:${INK}!important;box-shadow:none!important}` },
];

/* What the rail does once a long list scrolls: Game boosters, scrolled two rows down. */
const SCROLL = [
  { key: 'scroll-away', name: 'A · it scrolls away', note: 'The rail is part of the page and goes up with it; the list has the whole screen. The title is gone until you scroll back.',
    css: `.railp{display:none}.pad>:not(.railp){transform:translateY(-38px)}` },
  { key: 'scroll-slim', name: 'B · it slims to a bar', note: 'The rail stays, shrunk to the chevron and the title at 17 on a slim white bar with its hairline; the line under the title goes. The list passes under it.',
    css: `.railp{padding-top:44px;padding-bottom:10px;border-radius:0 0 18px 18px}.railp h1{font-size:17px!important}.railp .fdsub{display:none}.pad>:not(.railp){transform:translateY(-92px)}` },
  { key: 'scroll-stay', name: 'C · it stays whole', note: 'The rail does not move at all; the list scrolls beneath it. The title and its line are always there, at the cost of the rail’s height on every scroll.',
    css: `.pad>:not(.railp){transform:translateY(-92px)}` },
];

/* ── the page ─────────────────────────────────────────────────────────── */

const scoped = (css) => css.replace(/:root/g, ':host').replace(/(^|\})\s*body\s*\{/g, '$1:host{');
const BASE_CSS = `${scoped(style.css)}
${FD_CSS}${railN('.fd')}${railN('.d-d2')}
:host{display:block;background:none!important;color:inherit}
.strip{display:flex;gap:18px;overflow-x:auto;padding:4px 2px 14px}
.strip figure{margin:0;flex:none;display:flex;flex-direction:column;gap:8px}
.strip figcaption{font:600 12.5px/1.3 'Inter',system-ui,sans-serif;color:#596171;padding-left:6px}
.appico{display:inline-flex;flex:none;line-height:0}.terms .appico,.dl .appico{color:var(--p-muted)}.terms .appico{vertical-align:-2px;margin-right:2px}
.role .rb.tools-d{background:#141A2A!important;box-shadow:none!important}.role .rb.tools-d .appico{color:#FFFFFF}
.fd .fdphone{transform-origin:top left}`;

const phoneFig = (html, cap, fd) => `<figure>${fd ? `<div class="fd">${html}</div>` : html}<figcaption>${cap}</figcaption></figure>`;
const shadowStrip = (inner, extra = '') =>
  `<div class="as-shadow"><template shadowrootmode="open"><style>${BASE_CSS}${extra}</style>${style.sprite}<div class="strip names-only">${inner}</div></template></div>`;

const four = (fd) =>
  phoneFig(fd[0], 'Main menu', true) + phoneFig(style.tonight, 'Tonight', false) + phoneFig(fd[2], 'Game boosters', true) + phoneFig(style.results, 'Post-game results', false);

let REVIEW = false;
const reviewBlock = (key, label) => `<div class="rv" data-key="${key}">
      <div class="rvb">
        <button type="button" class="rvbtn ok" data-v="approved" aria-pressed="false" disabled>Approve</button>
        <button type="button" class="rvbtn no" data-v="changes" aria-pressed="false" disabled>Needs work</button>
      </div>
      <label class="sr" for="c-${key}">Comment on ${label}</label>
      <textarea id="c-${key}" rows="2" placeholder="Comment (optional)" disabled></textarea>
      <span class="rvs" aria-live="polite"></span>
    </div>`;
const option = ({ key, name, note }, strip) => `<figure class="cell opt" data-key="${key}">
  <figcaption><b>${name}</b><span>${note}</span></figcaption>${strip}${REVIEW ? reviewBlock(key, name) : ''}</figure>`;

const fonts = [...new Set([`<link rel="stylesheet" href="${FD_FONTS}">`, ...[readFileSync(join(here, '../updated-screens/sources/style-round-two.html'), 'utf8')]
  .flatMap((x) => x.match(/<link rel="stylesheet"[^>]+fonts\.googleapis\.com[^>]+>/g) ?? [])])].join('\n');

const page_ = () => `<title>Poker Club Surfaces</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
/* Layout: a reading column of short notes; each option is a card holding its caption, a sideways strip of four phones, and its review controls. */
:root{--bg:#F4F5F7;--panel:#FFFFFF;--fg:#141A2A;--muted:#596171;--line:#DDE1E7;--ok:#0E7A45;--warn:#A3282E;--accent:#2B6CDF;
  --head:'Libre Franklin',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--ok:#5CCB93;--warn:#F08A82;--accent:#7FA8F5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--ok:#5CCB93;--warn:#F08A82;--accent:#7FA8F5;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:400 15px/1.55 var(--body);margin:0}
.wrap{max-width:1500px;margin:0 auto;padding-block:36px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.eyebrow{font:600 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
h1{font:800 clamp(28px,4vw,40px)/1.05 var(--head);letter-spacing:-.025em;margin:10px 0 12px;text-wrap:balance}
h2{font:800 24px/1.15 var(--head);letter-spacing:-.02em;margin:0 0 6px;text-wrap:balance}
p{margin:0;max-width:74ch;color:var(--muted)}p b{color:var(--fg)}
section{margin-top:44px;display:flex;flex-direction:column;gap:14px}
.decided{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:16px}
.decided div{background:var(--panel);border-radius:12px;padding:12px 14px;font-size:13.5px;color:var(--muted)}.decided b{display:block;color:var(--fg);font-size:14px}
.opt{margin:0;background:var(--panel);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.opt figcaption{display:flex;flex-direction:column;gap:3px}.opt figcaption b{font:700 16px var(--head)}.opt figcaption span{font-size:13.5px;color:var(--muted);max-width:80ch}
.as-shadow{min-width:0;overflow:hidden;border-radius:12px;background:var(--bg)}
.rv{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:12px}
.rvb{display:flex;gap:6px}
.rvbtn{font:700 13px var(--body);padding:8px 14px;border-radius:10px;border:1.5px solid var(--line);background:var(--panel);color:var(--fg);cursor:pointer}
.rvbtn:disabled{cursor:default;opacity:.45}
.rvbtn:focus-visible,.rv textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.rvbtn.ok[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}
.rvbtn.no[aria-pressed="true"]{background:var(--warn);border-color:var(--warn);color:#fff}
.rv textarea{flex:1;min-width:200px;font:400 13px/1.4 var(--body);color:var(--fg);border:1.5px solid var(--line);border-radius:10px;padding:7px 9px;background:var(--bg);resize:vertical}
.rvs{font:500 12px var(--body);color:var(--muted);flex-basis:100%}.rvs.err{color:var(--warn)}
.cell.is-approved{box-shadow:inset 0 0 0 2px var(--ok)}.cell.is-changes{box-shadow:inset 0 0 0 2px var(--warn)}
.rvbar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;background:var(--fg);color:var(--bg);border-radius:14px;padding:10px 14px;margin-top:18px}
.rvbar b{font:800 14px var(--body)}.rvbar .cnt{display:flex;gap:6px;flex-wrap:wrap}.rvbar .cnt span{font:700 12px var(--body);padding:4px 9px;border-radius:999px;background:rgba(127,127,127,.25)}
.rvnote{font:500 12px var(--body);flex-basis:100%;opacity:.85}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>
<main class="wrap">
<header>
  <span class="eyebrow">Exploration · 22 November 2026 · not a handoff</span>
  <h1>Headers and backgrounds, across the app</h1>
  <p>The header is decided: <b>N on the Rail</b>, the title at 20 and bold beside a bare grey chevron on a raised panel. What is left is what sits behind it on every screen: the ground, the cards, the rail’s own colour, all of it again in the dark theme, and what the rail does when a list scrolls. Each option is the same four approved screens with only those things changed. Approve one in each group, or say what to change.</p>
  <div class="decided">
    <div><b>Kept on every option</b>Fresh Deck’s type and ink, the approved drawings, the 4d tiles, the ink tools button, every word.</div>
    <div><b>Sheets</b>Keep their own chrome (grabber, close, swipe down). They take the card colour of whichever theme you pick.</div>
    <div><b>Not yet seen on a phone</b>These are the style page’s 330-point phones, not the app.</div>
  </div>
  ${REVIEW ? `<div class="rvbar" role="status"><b>Review</b><div class="cnt"><span id="cA">0 approved</span><span id="cC">0 need work</span><span id="cO">to review</span></div><span id="rvnote" class="rvnote" hidden></span></div>` : ''}
</header>

<section>
  <h2>Outside the system: five other approaches</h2>
  <p>Groups 1 to 3 below keep one layout (a white rail, cards on a ground, a floating dock) and only move its colours. These five change the structure instead: what the header is, what the ground is, and what the footer is. Same four screens, same words. Approve any you want taken further, or say which parts to combine.</p>
  ${BEYOND.map((o) => option(o, shadowStrip(four(fdLight), themeCSS(o.t) + o.css))).join('')}
</section>

<section>
  <h2>1 · Light: the ground, the cards, the rail</h2>
  <p>Approve one. A is what the screens have now.</p>
  ${LIGHT.map((o) => option(o, shadowStrip(four(fdLight), o.t ? themeCSS(o.t) : ''))).join('')}
</section>

<section>
  <h2>2 · Dark: the same screens at night</h2>
  <p>Fresh Deck was only ever drawn light; the app has a dark theme, so it needs one. In each, the drawings take their dark palette (the ink chips lifted so they hold on a dark card), and the primary buttons turn light so they still lead. Approve one.</p>
  ${DARK.map((o) => option(o, shadowStrip(four(fdDark), themeCSS(o.t)))).join('')}
</section>

<section>
  <h2>3 · When a long list scrolls</h2>
  <p>Game boosters at the top, then scrolled two rows down, once per behaviour. Approve one; it would apply to every pushed screen with a list.</p>
  ${SCROLL.map((o) => option(o, shadowStrip(phoneFig(fdLight[2], 'At the top', true) + phoneFig(fdLight[2], 'Scrolled', true).replace('<div class="fd">', `<div class="fd scrolled">`), `.scrolled ${o.css.replace(/\}(?=.)/g, '} .scrolled ')}`))).join('')}
</section>
</main>
<script>document.querySelectorAll('template[shadowrootmode]').forEach((t) => { const r = t.parentNode.attachShadow({ mode: 'open' }); r.appendChild(t.content); t.remove(); });</script>
${REVIEW ? `<script>\n${readFileSync(join(here, '../icon-system/review.js'), 'utf8')}</script>` : ''}`;

const html = page_();
writeFileSync(join(here, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${html.replace('</style>', '</style></head><body>')}</body></html>`);
console.log('wrote index.html', (html.length / 1024).toFixed(0) + ' KB');
if (artifactAt) {
  REVIEW = true;
  const out = page_();
  writeFileSync(artifactAt, out);
  console.log('wrote', artifactAt, (out.length / 1024).toFixed(0) + ' KB');
}
