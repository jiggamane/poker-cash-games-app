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
 *   npm --workspace @poker-club/mobile run export:web   # build once
 *   npx serve -s <that dir> -l 4321                     # serve it
 *
 *   node scripts/ui-check.mjs shot /session /bill              → PNGs
 *   node scripts/ui-check.mjs dump /session                    → the app's tree
 *   node scripts/ui-check.mjs frames design/handoff-.../x.html → list + PNGs
 *   node scripts/ui-check.mjs frame  <file> "H1 Tonight · resting"
 *
 * Playwright is not a dependency of this repo — it is heavy, and this is a
 * tool rather than a test. Use the one on the machine (`npx playwright`), or
 * `npm i -g playwright`. Chromium is whatever `PLAYWRIGHT_CHROMIUM` points at,
 * else Playwright's own.
 *
 * `--light` switches the colour scheme. Check both: the bright theme has
 * caught bugs the dark one hid, every time.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

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

async function open() {
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  );
  return browser;
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

const settle = (page) => page.waitForTimeout(1200);

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
  --light                                            the bright theme`;

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
