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
import { RB_CSS, RB_OPTIONS } from './options.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;

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

${RB_CSS}
</style>
<main class="wrap">
  <span class="eyebrow">The Poker Club · 22 November 2026 · design only</span>
  <h1>The results breakdown</h1>
  <p class="lede">How a player’s result is made up, on the settled night’s list: chips in, chips out, the kitchen bill and the piggy bank. First the list as it stands, then <b>A</b>, the whole formula on the left as you asked, and six other ways to place and style it.</p>
  <p class="lede">All on Fresh Deck with the app’s own icons, the same six players in each. Three of them only lost at the table and owe nothing else, so their rows are the short case.</p>
  <div class="grid">${RB_OPTIONS.map((o) => `<section class="opt"><h2>${o.letter} <span>· ${o.title}</span></h2>${o.html}<p>${o.note}</p></section>`).join('')}</div>
</main>
`;
writeFileSync(join(here, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">\n${html}</body></html>\n`);
console.log('wrote index.html');
if (artifactAt) { writeFileSync(artifactAt, html); console.log('wrote', artifactAt); }
