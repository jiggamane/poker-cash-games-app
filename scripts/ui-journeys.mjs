/*
 * Play a big night through the app and check every screen it produces.
 *
 * `ui-audit` opens each route cold and holds it to the rules. That misses two
 * whole classes of screen, and between them they are where the real faults
 * were found:
 *
 *   · A SCREEN NO URL REACHES. Deductions, Settle up, Who has paid — none of
 *     them exist until a night has been counted and closed. Opened directly
 *     they render their empty state, the audit sees nothing, and the table
 *     that a host actually stares at for ten minutes has never been measured.
 *
 *   · A FIGURE BIGGER THAN THE SEED'S. The sample night buys in at $500 and
 *     every column fits it. A real table played for a hundred times that and
 *     the totals came back cut in half, pushed outside their own cards, or
 *     truncated mid-number — "−4,5…", which reads as an amount nobody owes.
 *
 * So this drives the app the way a person does: three large rebuys, count
 * everyone up, apply the rules, settle, mark a payment, nudge the rest. At
 * every stop it asks the same question — is any figure on this screen cut off,
 * outside the box that holds it, or off the phone?
 *
 * It is deliberately NOT a substitution of long strings into the DOM. That was
 * tried and it cannot tell a slot guarded by `formatToFit` from one with no
 * guard at all, so it reports states the app will never render, and a check
 * that cries wolf is worse than no check. These are the app's own figures,
 * produced by the app's own engine.
 *
 *   npm run ui                        # build and serve first
 *   node scripts/ui-journeys.mjs      # then this
 *   node scripts/ui-journeys.mjs --shots --light
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const WIDTH = Number(process.env.UI_AUDIT_WIDTH ?? 393);
const HEIGHT = Number(process.env.UI_AUDIT_HEIGHT ?? 852);
const OUT = process.env.UI_JOURNEY_OUT ?? '.ui-check/journey';
const light = process.argv.includes('--light');
const shots = process.argv.includes('--shots');

/**
 * The night this plays. Amounts are what the keypad TYPES, and the keypad
 * appends to whatever the preset already holds — so these land on top of the
 * suggested buy-in and come out in the millions, which is the point.
 */
const REBUYS = [
  ['Petr', '7000'],
  ['Ivo', '2500'],
  ['Lena', '900'],
];

/**
 * WHAT EACH STACK IS COUNTED WITH IS READ OFF THE SCREEN, not written here.
 *
 * A night that does not balance never reaches Deductions at all — it stops at
 * E5, "It doesn't add up", which is correct behaviour and the wrong screen to
 * be measuring. And the figure it has to balance to depends on the rebuys
 * above, so a list of amounts typed here goes stale the moment those change.
 *
 * So the figure is read off the screen, and the stacks are dealt to produce
 * the shape the results screens have to survive: ONE PLAYER TAKES THE TABLE
 * and everybody else is left with a hundred. Counting each person with what
 * they are in for balances too, but it makes every net nought — and a
 * deductions table of noughts proves nothing about a column that has to hold
 * a seven-figure win.
 */
const readStacks = (page) =>
  page.evaluate(() => {
    const lines = document.body.innerText.split('\n').map((l) => l.trim());
    const num = (s) => Number((s.match(/[\d,]+/)?.[0] ?? '0').replace(/,/g, ''));
    const target = num(lines.find((l) => /^\$[\d,]+ of \$[\d,]+$/.test(l))?.split(' of ')[1] ?? '0');
    const players = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^in \$[\d,]+$/.test(lines[i])) continue;
      // The name is the line above, and only for someone still to be counted:
      // a player already gone reads "cashed out 23:15 · in $500".
      players.push({ name: lines[i - 1], in: num(lines[i]) });
    }
    return { target, players };
  });

/**
 * Every figure on the page that is not fully visible.
 *
 * The same three questions `ui-audit` asks, asked here of real data. A name
 * may ellipsise; a NUMBER may not, because "−4,5…" is not a shorter way of
 * writing −4,543, it is a different amount.
 */
const CHECK = `
(() => {
  const px = (v) => Math.round(v * 100) / 100;
  const rgb = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n));
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const FIGURE = /^[-+\\u2212]?[^0-9]{0,3}[0-9][0-9.,\\u00a0 ]*(k|M)?[^0-9]{0,3}$/;
  const out = [];

  for (const el of document.querySelectorAll('div, span, p, h1, h2, h3, a, button')) {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    if (own === '' || !FIGURE.test(own) || !/[0-9]/.test(own)) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0' || st.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if (el.scrollWidth > el.clientWidth + 1) {
      out.push({ check: 'clipped', what: own, detail: px(el.scrollWidth) + ' in ' + px(el.clientWidth) });
      continue;
    }
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      out.push({ check: 'off-screen', what: own, detail: px(r.left) + '\\u2026' + px(r.right) });
      continue;
    }
    const box = (() => {
      for (let n = el.parentElement; n !== null; n = n.parentElement) {
        const s2 = getComputedStyle(n);
        const fill = rgb(s2.backgroundColor);
        if ((fill !== null && fill.a > 0.01) || (parseFloat(s2.borderTopLeftRadius) || 0) >= 6) return n;
      }
      return null;
    })();
    if (box === null || box === el) continue;
    const b = box.getBoundingClientRect();
    const s3 = getComputedStyle(box);
    const right = b.right - (parseFloat(s3.paddingRight) || 0);
    const left = b.left + (parseFloat(s3.paddingLeft) || 0);
    if (r.right > right + 1 || r.left < left - 1) {
      out.push({
        check: 'out-of-its-box',
        what: own,
        detail: px(r.left) + '\\u2026' + px(r.right) + ' in ' + px(left) + '\\u2026' + px(right),
      });
    }
  }
  return out;
})()
`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  colorScheme: light ? 'light' : 'dark',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
if (shots) fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const seen = [];

/** Measure wherever we are, report it, and keep the picture if asked. */
async function stop(name) {
  await page.waitForTimeout(500);
  const found = await page.evaluate(CHECK);
  seen.push(name);
  if (shots) {
    await page.screenshot({ path: path.join(OUT, `${name.replace(/\W+/g, '-')}.png`) });
  }
  if (found.length === 0) {
    console.log(`${name.padEnd(26)} ok`);
    return;
  }
  failures += found.length;
  console.log(`${name.padEnd(26)} ${found.length} cut off`);
  for (const f of found) {
    console.log(`  ${f.check.padEnd(15)} ${f.what}  — ${f.detail}`);
  }
}

/** Tap a control by its exact words, ignoring anything under a sheet. */
const tap = async (words, opts = {}) => {
  const loc = opts.last
    ? page.getByText(words, { exact: typeof words === 'string' }).last()
    : page.getByText(words, { exact: typeof words === 'string' }).first();
  await loc.click({ timeout: 15_000 });
  await page.waitForTimeout(opts.wait ?? 800);
};

/** Type digits on the keypad, which appends them to whatever is there. */
const punch = async (digits) => {
  for (const d of digits) {
    await page.getByText(d, { exact: true }).last().click({ timeout: 10_000 });
    await page.waitForTimeout(60);
  }
};

console.log(`a big night, screen by screen · ${light ? 'light' : 'dark'} · ${WIDTH} × ${HEIGHT}\n`);

await page.goto(BASE + '/session', { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);

// ---- the night, played ------------------------------------------------------
for (const [who, digits] of REBUYS) {
  await tap('Rebuy');
  await tap(who, { last: true });
  await punch(digits);
  await tap(/^Log .*rebuy$/, { last: true, wait: 1200 });
}
await stop('tonight');

await tap('Petr');
await stop('player card');
await page.getByLabel('Close').last().click();
await page.waitForTimeout(900);

// ---- counting up ------------------------------------------------------------
//
// THROUGH THE DOCK, never by URL. The browser build keeps its database in
// memory, so navigating to /count-up reloads the page, drops the night that
// was just played, and quietly counts the seeded one instead — every figure
// below then comes back small and the check passes on the wrong data.
//
// Ending a night is a 1.5s hold and there is no tap path to it anywhere, by
// design. So this holds it, like a person.
await tap('Table admin');
const end = page.getByText('End this poker night', { exact: true }).first();
const box = await end.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(2200);
await page.mouse.up();
await page.waitForTimeout(1400);
const { target, players } = await readStacks(page);
/* A hundred each to the also-rans; whoever is first on the list takes the
   rest. Their buy-in was the table's smallest, so their win is the largest
   figure the night can produce — which is the one worth measuring. */
const RUNNER_UP = 100;
const stacks = players.map((who, i) =>
  i === 0 ? target - RUNNER_UP * (players.length - 1) : RUNNER_UP,
);
for (const [i, who] of players.entries()) {
  await tap(who.name, { last: true });
  await punch(String(stacks[i]));
  await tap(/^Save .*count$/, { last: true, wait: 900 });
}
await stop('count up');

await tap('See where everyone stands');
await stop('where everyone stands');
// Back the way a person goes, for the same reason as above.
await page.getByLabel(/^Back to/).last().click();
await page.waitForTimeout(1000);

await tap('Apply the money rules');
await stop('deductions');

await tap('See who pays whom');
await stop('settle up');

await tap('Close the session', { wait: 1600 });
await stop('night settled');

await tap('Who has paid');
await stop('who has paid');

await tap('Mark paid', { wait: 900 });
await stop('who has paid · one in');

await tap('Nudge the table');
await stop('nudge the table');

console.log('\n' + '─'.repeat(64));
console.log(
  failures === 0
    ? `every figure fits · ${seen.length} screens of a night in the millions`
    : `${failures} figures cut off across ${seen.length} screens`,
);
console.log('the night is the app’s own: three big rebuys, counted and settled through the engine.');
await browser.close();
process.exit(failures === 0 ? 0 : 1);
