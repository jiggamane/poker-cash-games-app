/*
 * Hold the built screens against the drawn ones.
 *
 * `docs/ui-guide.md` says to read the measurements before writing a screen.
 * This is the other half: read them back off the screen once it is built. It
 * renders the real app — the same components, on react-native-web, at the
 * frames' own 402 × 874 — and dumps every element's computed padding, gap,
 * radius, border and type. The design boards ship as HTML with every value
 * inline, so the same dump runs against a drawn frame and the two diff.
 *
 * What it catches is the class of error the guide was written about: a row
 * two pixels taller than the one drawn, a card's radius on a block that is
 * not a card, a 13 where the board says 12.5. None of it shows up in a
 * screenshot on its own and all of it compounds.
 *
 *   npm run ui        # fonts, build, server — everything below needs it
 *
 *   node scripts/ui-check.mjs shot /session /bill              → PNGs
 *   node scripts/ui-check.mjs dump /session                    → the app's tree
 *   node scripts/ui-check.mjs frames design/handoff-.../x.html → list + PNGs
 *   node scripts/ui-check.mjs frame  <file> "H1 Tonight · resting"
 *
 *   --figtree   paint the app in Figtree, previewing the parity that bundling
 *               it would bring (today the app renders in a fallback stack)
 *
 * Playwright is not a dependency of this repo — it is heavy, and this is a
 * tool rather than a test. Use the one on the machine, or `npm i -g playwright`
 * and run with `NODE_PATH="$(npm root -g)"`. Chromium is found automatically:
 * `PLAYWRIGHT_CHROMIUM` if set, else whatever sits under
 * `PLAYWRIGHT_BROWSERS_PATH`, else Playwright's own.
 *
 * A word on type. The boards ask for SF, then Figtree. On a Mac the first is
 * already there; anywhere else run `bash scripts/ui-fonts.sh` (which `npm run
 * ui` does) to get the second. Without it both sides fall back to the same
 * substitute — layout and colour still compare, but every width is that
 * substitute's, and a wrap it causes reads exactly like a bug. The script
 * warns when this is the case.
 *
 * `--light` switches the colour scheme. Check both: the bright theme has
 * caught bugs the dark one hid, every time.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require_ = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require_('playwright'));
} catch {
  console.error(
    'playwright is not installed. It is deliberately not a dependency of this\n' +
      'repo — it is a tool, not a test, and it is large.\n\n' +
      '  npm i -g playwright && npx playwright install chromium\n' +
      '  NODE_PATH="$(npm root -g)" node scripts/ui-check.mjs ...\n\n' +
      'Or install it locally and drop the NODE_PATH.',
  );
  process.exit(1);
}

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const OUT = process.env.UI_CHECK_OUT ?? path.join(process.cwd(), '.ui-check');
const light = process.argv.includes('--light');
const asFigtree = process.argv.includes('--figtree');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [command, ...rest] = args;

/** Every measurement that makes a screen look built rather than drawn. */
const EXTRACT = (selector) => {
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? v : Math.round(n * 100) / 100;
  };
  const root = selector === null ? document.body : document.querySelector(selector);
  if (root === null) return `no element matches ${selector}`;
  const origin = root.getBoundingClientRect();
  const lines = [];

  const walk = (el, depth) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const box = el.getBoundingClientRect();
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();

    const bits = [];
    if (own) {
      bits.push(
        `font:${cs.fontWeight} ${px(cs.fontSize)}px/${px(cs.lineHeight)}`,
        `ls:${px(cs.letterSpacing)}`,
        `color:${cs.color}`,
      );
      if (cs.textTransform !== 'none') bits.push(`tt:${cs.textTransform}`);
    }
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    if (pad.some((v) => v)) bits.push(`pad:${pad.join(' ')}`);
    const mar = [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].map(px);
    if (mar.some((v) => v && v !== 0)) bits.push(`mar:${mar.join(' ')}`);
    if (cs.gap && cs.gap !== 'normal' && px(cs.gap)) bits.push(`gap:${px(cs.gap)}`);
    if (cs.borderTopWidth !== '0px' || cs.borderBottomWidth !== '0px' || cs.borderLeftWidth !== '0px') {
      bits.push(
        `border:${px(cs.borderTopWidth)}/${px(cs.borderRightWidth)}/` +
          `${px(cs.borderBottomWidth)}/${px(cs.borderLeftWidth)} ${cs.borderTopColor}`,
      );
    }
    if (px(cs.borderTopLeftRadius)) bits.push(`radius:${px(cs.borderTopLeftRadius)}`);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bits.push(`bg:${cs.backgroundColor}`);
    if (cs.opacity !== '1') bits.push(`opacity:${cs.opacity}`);
    bits.push(
      `box:${px(box.width)}x${px(box.height)}@${px(box.left - origin.left)},${px(box.top - origin.top)}`,
    );

    lines.push(`${'  '.repeat(depth)}${el.tagName.toLowerCase()}${own ? ` "${own}"` : ''} — ${bits.join(' · ')}`);
    for (const child of el.children) walk(child, depth + 1);
  };

  walk(root, 0);
  return lines.join('\n');
};

/*
 * Find a Chromium.
 *
 * PLAYWRIGHT_CHROMIUM wins if it is set. Otherwise, if the machine keeps its
 * browsers somewhere central (PLAYWRIGHT_BROWSERS_PATH, which the sandboxes
 * set), look for the binary there — the directory is versioned, so the path
 * cannot be written down. Failing both, let Playwright find its own.
 */
function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;

  const store = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!store || !fs.existsSync(store)) return undefined;

  const candidates = fs
    .readdirSync(store)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse()
    .map((d) => path.join(store, d, 'chrome-linux', 'chrome'));

  return candidates.find((c) => fs.existsSync(c));
}

/*
 * Is Figtree on this machine at all?
 *
 * Without it the boards cannot render the typeface they name, and every width
 * they report is a substitute's.
 */
function figtreeInstalled() {
  try {
    return /\bFigtree\b/.test(execFileSync('fc-match', ['Figtree'], { encoding: 'utf8' }));
  } catch {
    return true; // no fontconfig (macOS): assume the stack's SF entry covers it
  }
}

/*
 * Say what type the app actually rendered in — which is not what you would
 * guess.
 *
 * The boards name the typeface: `-apple-system, 'SF Pro Text', Figtree`. The
 * app names nothing, because `fontFamily` is left undefined everywhere on
 * purpose (see apps/mobile/src/design/tokens.ts), so react-native-web falls
 * back to its own stack — Segoe, Roboto, Helvetica, Arial — which has no
 * Figtree in it.
 *
 * On iOS both sides land on SF and this does not matter. Anywhere else the two
 * sides render in DIFFERENT faces, so a width that differs by a pixel may be
 * the font rather than the layout. Installing Figtree makes the board more
 * truthful and the gap wider, not narrower; only bundling Figtree into the app
 * closes it. That is the outstanding follow-up in tokens.ts.
 *
 * `--figtree` paints the app in Figtree to preview the parity that follow-up
 * would bring. It is a lie about today's build, so it announces itself.
 */
let noticed = false;
async function noticeFonts(page) {
  if (noticed) return;
  noticed = true;

  if (!figtreeInstalled()) {
    console.error(
      'note: Figtree is not on this machine, so even the boards render in a\n' +
        '      substitute.  Fix:  bash scripts/ui-fonts.sh\n',
    );
    return;
  }
  if (asFigtree) {
    console.error('note: --figtree — the app is painted in Figtree, which today it is not.\n');
    return;
  }
  const usesFigtree = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily.includes('Figtree'),
  );
  if (!usesFigtree) {
    console.error(
      'note: the app renders in react-native-web\'s fallback stack, not Figtree —\n' +
        '      it sets no fontFamily. Against a board this shows up as small width\n' +
        '      differences that are type, not layout. Use --figtree to preview parity.\n',
    );
  }
}

async function open() {
  const executablePath = chromiumPath();
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** The app, at the size the frames are drawn at. */
async function appPage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    colorScheme: light ? 'light' : 'dark',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  return page;
}

const FIGTREE_CSS = '*, *::before, *::after { font-family: Figtree, sans-serif !important; }';

async function settle(page) {
  if (asFigtree) await page.addStyleTag({ content: FIGTREE_CSS });
  await page.waitForTimeout(1200);
  await noticeFonts(page);
}

async function shot(routes) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await open();
  const page = await appPage(browser);
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await settle(page);
    const name =
      (route === '/' ? 'home' : route.replace(/[/?=&]/g, '_').replace(/^_/, '')) +
      (light ? '.light' : '.dark');
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(path.join(OUT, `${name}.png`));
  }
  await browser.close();
}

async function dump(route) {
  const browser = await open();
  const page = await appPage(browser);
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await settle(page);
  console.log(await page.evaluate(EXTRACT, null));
  await browser.close();
}

/** Every drawn frame in a board file, listed and screenshotted. */
async function frames(file) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await open();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(600);
  const labels = await page.$$eval('[data-screen-label]', (els) =>
    els.map((e) => e.getAttribute('data-screen-label')),
  );
  for (const label of labels) {
    const el = await page.$(`[data-screen-label="${label.replace(/"/g, '\\"')}"]`);
    const name = label.replace(/[^A-Za-z0-9]+/g, '_');
    await el.screenshot({ path: path.join(OUT, `board-${name}.png`) });
    console.log(`${label}  →  board-${name}.png`);
  }
  await browser.close();
}

/** One drawn frame's measurements, in the same shape as `dump`. */
async function frame(file, label) {
  const browser = await open();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(600);
  console.log(await page.evaluate(EXTRACT, `[data-screen-label="${label.replace(/"/g, '\\"')}"]`));
  await browser.close();
}

const usage = `usage:
  node scripts/ui-check.mjs shot   <route...>        screenshot app routes
  node scripts/ui-check.mjs dump   <route>           app route measurements
  node scripts/ui-check.mjs frames <board.html>      list + screenshot frames
  node scripts/ui-check.mjs frame  <board.html> <label>   one frame's measurements
  --light                                            the bright theme
  --figtree                                          paint the app in Figtree`;

switch (command) {
  case 'shot':
    if (rest.length === 0) throw new Error(usage);
    await shot(rest);
    break;
  case 'dump':
    if (rest.length !== 1) throw new Error(usage);
    await dump(rest[0]);
    break;
  case 'frames':
    if (rest.length !== 1) throw new Error(usage);
    await frames(rest[0]);
    break;
  case 'frame':
    if (rest.length !== 2) throw new Error(usage);
    await frame(rest[0], rest[1]);
    break;
  default:
    console.log(usage);
    process.exit(command === undefined ? 0 : 1);
}
