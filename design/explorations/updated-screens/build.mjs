/**
 * The updated screens, 21 November 2026: one page of every app screen the
 * style rounds and the icon review touched, drawn only with what the owner
 * approved, the header included.
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
 *   ../screen-headers/     where the header was chosen: version N of titles.html
 *                          on the Rail. Its rules are `railN` in fresh-deck.mjs.
 *
 * The style page is rendered with Playwright and its two phones lifted out
 * whole into a shadow root with that page's own stylesheet, so two stylesheets
 * that both say `.scr` and `.hdr` cannot reach each other.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PICK } from '../icon-system/picks.mjs';
import { FD_CSS, FD_FONTS, freshDeckScreens, freshDeckSheets, railN } from '../icon-system/fresh-deck.mjs';
import { BOOSTERS } from '../../../packages/core/src/boosters.ts';
import APP from '../icon-system/app-icons.json' with { type: 'json' };

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
/* The approved header (N on the Rail): move each screen's head onto one panel. What counts as the head is the header page's own split. */
await page.evaluate(() => {
  for (const pad of document.querySelectorAll('#d2 .phone .scr > .pad')) {
    const head = [...pad.children].filter((c) => c.matches('.hdr, .role, .hero, .meta-l, .sub'));
    if (!head.length || !pad.querySelector('.hdr')) continue;
    const rail = document.createElement('div'); rail.className = 'railp';
    pad.insertBefore(rail, head[0]); head.forEach((c) => rail.appendChild(c));
  }
});
/* The owner, 22 November: the app's own icons feel good and stay. The style page drew its own small ones
   (tools, receipt, cutlery, piggy bank); put the app's glyphs, from Icon.tsx, in their place at the same size. */
await page.evaluate((APP) => {
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
}, APP);
two.phones = await page.evaluate(() => [...document.querySelectorAll('#d2 .strip figure')].map((f) => [f.querySelector('figcaption').textContent, f.querySelector('.phone').outerHTML]));

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
  .map(([, html, cap]) => `<figure>${html}<figcaption>${cap}</figcaption></figure>`).join('')}</div>`, STRIP + railN('.d-d2') + `
.appico{display:inline-flex;flex:none;line-height:0}.terms .appico,.dl .appico{color:var(--p-muted)}.terms .appico{vertical-align:-2px;margin-right:2px}`);

const fonts = [...new Set([`<link rel="stylesheet" href="${FD_FONTS}">`, ...[readFileSync(join(here, 'sources/style-round-two.html'), 'utf8')]
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
${railN('.fd')}
</style>
<main class="us">
<header>
  <span class="us-eyebrow">The Poker Club · 20–21 November 2026 · design only</span>
  <h1>The updated screens</h1>
  <p>Every screen the style rounds and the icon review touched, drawn with what you approved, now with the approved header on all of them. None of this is in the app yet.</p>
  <div class="us-status">
    <div><h3>Approved</h3><ul>
      <li><b>Fresh Deck</b> as the look: card stock and ink on a light table, players by name only.</li>
      <li><b>Fifteen drawings</b>, one for each place and game.</li>
      <li><b>Menu tiles</b>: the name on top, the drawing in the bottom-right corner.</li>
      <li><b>Nothing points</b>: no chevrons on rows, and <i>Start a session</i> is a solid ink button.</li>
      <li><b>The small icons</b>: the app’s own line icons stay as they are, in Fresh Deck’s ink and grey.</li>
      <li><b>The header</b>: the Rail, with the title small and bold on the left beside a bare grey chevron (version N).</li>
      <li><b>“calculator, rulings, boosters”</b> under Poker tools on the menu, confirmed 22 November.</li>
      <li><b>Icon sizes</b>: each drawing sized by how much it paints, one step down per level. Home 0.35, Poker tools 0.27, the Game boosters rows 0.208; a booster’s sheet paints what Home does (22 November).</li>
    </ul></div>
    <div><h3>Still open</h3><ul>
      <li><b>The surfaces</b> behind every screen, in light and dark, and the rail on scroll: on the surfaces page.</li>
    </ul></div>
  </div>
</header>

<section class="us-sec">
  <div><span class="us-tag ok">Approved</span><h2>Main menu, Poker tools, Game boosters</h2>
  <p>The three screens the drawings land on, each with its head on the rail. On the menu the start button sits across the rail’s edge.</p></div>
  <div class="us-scroll">${freshDeckScreens(PICK, { withSheet: false, rail: true })}</div>
</section>

<section class="us-sec">
  <div><span class="us-tag ok">Approved</span><h2>The seven booster sheets</h2>
  <p>Each game’s drawing heads its description, larger. A sheet keeps its own grabber and close; the header change is only on the screen behind it.</p></div>
  <div class="us-scroll">${freshDeckSheets(PICK, [...BOOSTERS.filter((b) => b.section === 'side'), ...BOOSTERS.filter((b) => b.section === 'pots')].map((b) => b.id), { rail: true })}</div>
</section>

<section class="us-sec">
  <div><span class="us-tag ok">Approved</span><h2>Tonight and Post-game results</h2>
  <p>Fresh Deck as the style round left it, with the new header. On Tonight the title row, the role line and the <i>On the table</i> figure share the rail, and the figure loses its own card. On the results the date, the time span and the view control share it. The small icons (tools, Bill, kitchen, piggy bank) are the app’s own.</p></div>
  <div class="us-scroll">${styleScreens}</div>
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
