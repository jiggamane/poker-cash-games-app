/*
 * Photograph the end-of-night flow, screen by screen, on the seeded night.
 *
 *   npm run ui                       # build and serve first
 *   node scripts/ui-shots.mjs        # dark
 *   node scripts/ui-shots.mjs --light
 *
 * WHY IT PLAYS THE NIGHT RATHER THAN OPENING ROUTES. The browser build keeps
 * its database in memory, so a `goto` reloads the page and re-seeds it — and
 * the seed has no final counts, so /deductions, /settle-up, /settled and
 * /payments render their empty states when they are opened cold. Every figure
 * in these frames comes from walking the flow the way a host walks it: end the
 * night on the dock, count each stack, and go forward.
 *
 * The counts entered are the canonical night's, so what the frames show is
 * what `rev15-night.test.ts` asserts to the dollar — $5,000 in, $296 off the
 * table, six transfers.
 *
 * Writes PNGs to .ui-check/shots. It measures nothing; `ui-journeys.mjs` is
 * the check, this is the picture.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
import { launchOptions } from './chromium.mjs';

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const OUT = process.env.UI_SHOTS_OUT ?? '.ui-check/shots';
const light = process.argv.includes('--light');

/* 393, which is the width every board is drawn at. */
const WIDTH = 393;
const HEIGHT = 852;

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(launchOptions());
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  colorScheme: light ? 'light' : 'dark',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const suffix = light ? '-light' : '';

async function shot(name) {
  await page.waitForTimeout(600);
  const file = path.join(OUT, `${name}${suffix}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

/** Scroll the screen's own list to the bottom and photograph that too. */
async function shotTail(name) {
  const moved = await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll('div')].filter(
      (el) => el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200,
    );
    const el = scrollers[scrollers.length - 1];
    if (!el) return false;
    el.scrollTop = el.scrollHeight;
    return true;
  });
  if (!moved) return;
  await shot(`${name}-tail`);
  await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll('div')].filter(
      (el) => el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200,
    );
    const el = scrollers[scrollers.length - 1];
    if (el) el.scrollTop = 0;
  });
  await page.waitForTimeout(300);
}

const tap = async (words, opts = {}) => {
  const loc = opts.last
    ? page.getByText(words, { exact: typeof words === 'string' }).last()
    : page.getByText(words, { exact: typeof words === 'string' }).first();
  await loc.click({ timeout: 15_000 });
  await page.waitForTimeout(opts.wait ?? 800);
};

const punch = async (digits) => {
  for (const d of digits) {
    await page.getByText(d, { exact: true }).last().click({ timeout: 10_000 });
    await page.waitForTimeout(60);
  }
};

/** Count one person's stack: open their row, type it, save. */
async function count(name, amount) {
  await tap(name, { last: true });
  await punch(String(amount));
  await tap(/^Save .*count$/, { last: true, wait: 900 });
}

// ---------------------------------------------------------------------------

// In at the club, then across to Tonight without a reload — a second `goto`
// would restart the in-memory database and lose the night.
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
await shot('00-club');

await page.evaluate(() => {
  history.pushState({}, '', '/session');
  window.dispatchEvent(new PopStateEvent('popstate'));
});
await page.waitForTimeout(1800);
await shot('01-tonight');

// The dock, open, with the way out of the night on it.
await tap('Table admin');
await shot('02-tonight-dock');

// Ending is a hold, not a tap. There is no tap path to it anywhere.
const end = page.getByText('End this poker night', { exact: true }).first();
const box = await end.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(2200);
await page.mouse.up();
await page.waitForTimeout(1600);
await shot('03-count-up-empty');

// Two stacks in, so all three groups are on screen at once: still seated,
// done, and Dana who cashed out during play and is never re-counted.
await count('Andro', 960);
await count('Lena', 1430);
await shot('04-count-up');
await shotTail('04-count-up');

// The rest, with Petr $20 light, which is how a host actually reaches E5.
await count('Tomáš', 0);
await count('Ivo', 220);
await count('Petr', 250);
await tap('Next', { wait: 1400 });
await shot('06-out-of-balance');

await tap('Fix', { wait: 1400 });
await count('Petr', 270);
await shot('07-count-up-balanced');

await tap('Next', { wait: 1400 });
await shot('08-deductions');
await shotTail('08-deductions');

await tap('See who pays whom', { wait: 1400 });
await shot('09-settle-up');
await shotTail('09-settle-up');

await tap('Close the session', { wait: 2000 });
await shot('10-settled');
await shotTail('10-settled');

/* Format `7e` — the four columns, which E6 stopped listing on 1 September and
   which `Full ledger` is now the way to. See `02-E6-results-row.md`. */
await tap('Full ledger', { wait: 1400 });
await shot('11-ledger');

await tap('Back to the night', { wait: 1400 });
/* `Who has paid` until 5 September; R2 titles the same route `Who pays whom`,
   and the door off R1 is its footer button of the same name. */
await tap('Who pays whom', { wait: 1400 });
await shot('12-payments');

await browser.close();
console.log('\ndone.');
