/**
 * The updated screens, 21 November 2026: one page of every app screen the
 * style rounds and the icon review touched, drawn only with what the owner
 * approved, and with both options side by side where nothing was approved.
 *
 *   node design/explorations/updated-screens/build.mjs [--artifact <path>]
 *
 * It draws nothing itself. Three sources, each the record of its own round:
 *
 *   ../icon-system/        Main menu, Poker tools, Game boosters and the seven
 *                          booster sheets, with the approved drawings (PICK).
 *   sources/style-round-two.html
 *                          Tonight and Post-game results in Fresh Deck: the
 *                          published round-two style page (claude.ai artifact
 *                          8V2pTt3a9mNXwrdMZ8TJ3F) as it stood when the owner
 *                          locked the direction. It was never in the repo.
 *   ../screen-headers/     Rail and Lamp, the two header options, on Fresh
 *                          Deck. No verdict on either.
 *
 * The two older pages are rendered with Playwright and their phones lifted
 * out whole, each set into a shadow root with its own page's stylesheet, so
 * three stylesheets that all say `.scr` and `.hdr` cannot reach each other.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PICK } from '../icon-system/picks.mjs';
import { FD_CSS, FD_FONTS, freshDeckScreens, freshDeckSheets } from '../icon-system/fresh-deck.mjs';
import { BOOSTERS } from '../../../packages/core/src/boosters.ts';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;

const browser = await chromium.launch();
const page = await browser.newPage();
const lift = () => ({
  css: [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => !t.startsWith(':root{color-scheme:light;box-sizing')).join('\n'),
  sprite: [...document.querySelectorAll('svg')].filter((s) => s.querySelector('symbol')).map((s) => s.outerHTML).join(''),
});

await page.goto(pathToFileURL(join(here, 'sources/style-round-two.html')).href);
const two = await page.evaluate(`(${lift})()`);
two.phones = await page.evaluate(() => [...document.querySelectorAll('#d2 .strip figure')].map((f) => [f.querySelector('figcaption').textContent, f.querySelector('.phone').outerHTML]));

await page.goto(pathToFileURL(join(here, '../screen-headers/index.html')).href);
await page.click('.seg[data-k="base"] button[data-v="d2"]');
const head = await page.evaluate(`(${lift})()`);
head.modes = {};
for (const mode of ['rail', 'lamp']) {
  await page.click(`.seg[data-k="mode"] button[data-v="${mode}"]`);
  head.modes[mode] = await page.evaluate(() => ({
    screens: [...document.querySelectorAll('#strip .pair')].map((p) => [p.querySelector('h2').textContent, p.querySelectorAll('figure')[1].firstElementChild.outerHTML]),
    notes: [...document.querySelectorAll('#notes div')].map((d) => d.lastChild.textContent),
  }));
}
await browser.close();

/* A page's stylesheet, made to work inside a shadow root. */
const scoped = (css) => css.replace(/:root/g, ':host').replace(/(^|\})\s*body\s*\{/g, '$1:host{');
const shadow = (src, inner, extra = '') =>
  `<div class="us-shadow"><template shadowrootmode="open"><style>${scoped(src.css)}
:host{display:block;background:none!important;color:inherit}${extra}</style>${src.sprite}${inner}</template></div>`;

const STRIP = `.us-strip{display:flex;gap:22px;overflow-x:auto;padding:6px 2px 18px}
.us-strip figure{margin:0;flex:none;display:flex;flex-direction:column;gap:10px}
.us-strip figcaption{font:600 13px/1.3 'Inter',system-ui,sans-serif;color:var(--us-muted);padding-left:6px}
.us-strip figcaption b{color:var(--us-fg)}`;

const [night, , , results] = two.phones;
const styleScreens = shadow(two, `<div class="us-strip names-only">${[[...night, 'Tonight'], [...results, 'Post-game results']]
  .map(([, html, cap]) => `<figure>${html}<figcaption>${cap}</figcaption></figure>`).join('')}</div>`, STRIP);

const headers = shadow(head, `<div class="us-strip">${head.modes.rail.screens.map(([name, rail], i) => `
  <div class="us-pair"><h3>${name}</h3><div class="us-two">
    <figure>${rail}<figcaption><b>Rail</b></figcaption></figure>
    <figure>${head.modes.lamp.screens[i][1]}<figcaption><b>Lamp</b></figcaption></figure>
  </div></div>`).join('')}</div>`, STRIP + `
.us-pair{flex:none;display:grid;gap:10px}
.us-pair h3{font:700 15px/1.2 'Inter',system-ui,sans-serif;margin:0;padding-left:4px;color:var(--us-fg);letter-spacing:0}
.us-two{display:flex;gap:12px}
/* The header page was drawn before three of the approvals. Bring what shows under the head into line with them:
   no chevrons, the ink start button, and no line icons on the tiles (their drawings are on the full screens above). */
.chev,.cta .go,.tico{display:none!important}
.k-d2 .cta{background:#141A2A!important;color:#fff!important}
.k-d2 .tile{justify-content:flex-start}`);

const headerNotes = head.modes.rail.screens.map(([name], i) =>
  `<tr><th scope="row">${name}</th><td>${head.modes.rail.notes[i]}</td><td>${head.modes.lamp.notes[i]}</td></tr>`).join('');

const fonts = [...new Set([`<link rel="stylesheet" href="${FD_FONTS}">`, ...[readFileSync(join(here, 'sources/style-round-two.html'), 'utf8'), readFileSync(join(here, '../screen-headers/index.html'), 'utf8')]
  .flatMap((t) => t.match(/<link rel="stylesheet"[^>]+fonts\.googleapis\.com[^>]+>/g) ?? [])])].join('\n');

const html = `<title>Poker Club Updated Screens</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
/* Layout: a plain reading column of short notes; each set of phones is a strip that scrolls sideways on its own. */
:root{--us-bg:#F4F5F7;--us-panel:#FFFFFF;--us-fg:#141A2A;--us-muted:#596171;--us-line:#DDE1E7;--us-ok:#0E7A45;--us-open:#9A5B00;
  --us-head:'Libre Franklin',system-ui,sans-serif;--us-body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--us-bg:#10131A;--us-panel:#191D27;--us-fg:#ECEEF2;--us-muted:#A0A7B4;--us-line:#2A303C;--us-ok:#5CCB93;--us-open:#E8B45C;color-scheme:dark}}
:root[data-theme="dark"]{--us-bg:#10131A;--us-panel:#191D27;--us-fg:#ECEEF2;--us-muted:#A0A7B4;--us-line:#2A303C;--us-ok:#5CCB93;--us-open:#E8B45C;color-scheme:dark}
body{background:var(--us-bg);color:var(--us-fg);font:400 15px/1.55 var(--us-body);-webkit-font-smoothing:antialiased}
.us{max-width:1480px;margin:0 auto;padding-block:40px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:44px}
.us *{box-sizing:border-box}
.us-eyebrow{font:700 11px/1 var(--us-body);letter-spacing:.14em;text-transform:uppercase;color:var(--us-muted)}
.us h1{font:800 clamp(28px,4.4vw,42px)/1.06 var(--us-head);letter-spacing:-.025em;margin:10px 0 12px;text-wrap:balance}
.us h2{font:800 22px/1.15 var(--us-head);letter-spacing:-.02em;margin:0 0 6px;text-wrap:balance}
.us p{margin:0;max-width:70ch;color:var(--us-muted)}
.us p b,.us li b{color:var(--us-fg);font-weight:600}
.us-sec{display:flex;flex-direction:column;gap:16px;min-width:0}
.us-tag{display:inline-block;font:700 11px/1 var(--us-body);letter-spacing:.08em;text-transform:uppercase;padding:5px 8px;border-radius:6px;margin-bottom:8px}
.us-tag.ok{color:var(--us-ok);box-shadow:inset 0 0 0 1.5px var(--us-ok)}
.us-tag.open{color:var(--us-open);box-shadow:inset 0 0 0 1.5px var(--us-open)}
.us-status{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px 40px;margin-top:22px}
.us-status ul{margin:0;padding:0 0 0 18px;display:grid;gap:6px;color:var(--us-muted)}
.us-status h3{font:700 14px/1.2 var(--us-body);margin:0 0 8px}
.us-scroll{overflow-x:auto;min-width:0}
.us-notes{border-collapse:collapse;font-size:14px;line-height:1.5;min-width:640px;max-width:1100px}
.us-notes th,.us-notes td{text-align:left;vertical-align:top;padding:10px 16px 10px 0;border-top:1px solid var(--us-line);color:var(--us-muted)}
.us-notes thead th,.us-notes tbody th{color:var(--us-fg);font-weight:600;white-space:nowrap}
.us .fd-strip figcaption{color:var(--us-muted)}
${FD_CSS}
</style>
<main class="us">
<header>
  <span class="us-eyebrow">The Poker Club · 20–21 November 2026 · design only</span>
  <h1>The updated screens</h1>
  <p>Every screen the style rounds and the icon review touched, drawn with what you approved. Where nothing was approved, both options are shown. None of this is in the app yet.</p>
  <div class="us-status">
    <div><h3>Approved</h3><ul>
      <li><b>Fresh Deck</b> as the look: card stock and ink on a light table, players by name only.</li>
      <li><b>Fifteen drawings</b>, one for each place and game.</li>
      <li><b>Menu tiles</b>: the name on top, the drawing in the bottom-right corner.</li>
      <li><b>Nothing points</b>: no chevrons on rows, and <i>Start a session</i> is a solid ink button.</li>
    </ul></div>
    <div><h3>Still open</h3><ul>
      <li><b>The header</b>: Rail or Lamp. Neither has a verdict.</li>
      <li><b>Tonight and Post-game results</b> were not part of the icon review. Their small icons (tools, kitchen, piggy bank) are the style round’s own.</li>
      <li><b>“calculator, rulings, boosters”</b> under Poker tools on the menu is new wording, not yet confirmed.</li>
    </ul></div>
  </div>
</header>

<section class="us-sec">
  <div><span class="us-tag ok">Approved</span><h2>Main menu, Poker tools, Game boosters</h2>
  <p>The three screens the drawings land on. Poker tools carries the two framed cards, the Straddle is the mirrored curve and the Button game is the star button on its stack, as approved today.</p></div>
  <div class="us-scroll">${freshDeckScreens(PICK, { withSheet: false })}</div>
</section>

<section class="us-sec">
  <div><span class="us-tag ok">Approved</span><h2>The seven booster sheets</h2>
  <p>Each game’s drawing heads its description, larger. The words are the app’s own.</p></div>
  <div class="us-scroll">${freshDeckSheets(PICK, [...BOOSTERS.filter((b) => b.section === 'side'), ...BOOSTERS.filter((b) => b.section === 'pots')].map((b) => b.id))}</div>
</section>

<section class="us-sec">
  <div><span class="us-tag ok">Approved look</span><h2>Tonight and Post-game results</h2>
  <p>Fresh Deck as the style round left it: names only, no chevrons, the thin bar under <i>On the table</i>, losses in slate. The header on both is today’s; the options for it follow.</p></div>
  <div class="us-scroll">${styleScreens}</div>
</section>

<section class="us-sec">
  <div><span class="us-tag open">No verdict · two options</span><h2>The header</h2>
  <p>Only the top of each screen changes; everything under the fade stays. <b>Rail</b> turns the head into one raised panel. <b>Lamp</b> moves nothing and lights the ground behind the title. These are crops: the rows and tiles under each head are simplified, and the full screens are above.</p></div>
  <div class="us-scroll">${headers}</div>
  <div class="us-scroll"><table class="us-notes"><thead><tr><th scope="col">Screen</th><th scope="col">Rail</th><th scope="col">Lamp</th></tr></thead><tbody>${headerNotes}</tbody></table></div>
</section>
</main>
<script>
/* Where the page arrives through innerHTML, a declarative shadow root is left as a template: attach it by hand. */
document.querySelectorAll('template[shadowrootmode]').forEach((t) => { const r = t.parentNode.attachShadow({ mode: 'open' }); r.appendChild(t.content); t.remove(); });
</script>
`;

writeFileSync(join(here, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">\n${html}</body></html>\n`);
console.log('wrote index.html', Math.round(html.length / 1024), 'KB');
if (artifactAt) { writeFileSync(artifactAt, html); console.log('wrote', artifactAt); }
