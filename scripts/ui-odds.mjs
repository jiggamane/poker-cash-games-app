/**
 * The odds calculator's screen, played through with real taps, and every
 * figure it prints held against the engine's.
 *
 *   node scripts/ui-odds.mjs            against UI_CHECK_BASE, default :4321
 *   node scripts/ui-odds.mjs --bail     stop at the first table that is wrong
 *
 * `npm run odds:verify` holds the ENGINE to the facts about poker. This holds
 * the screen to the engine: that a card tapped for Player 5 lands in Player 5's
 * seat and in no other, that an empty seat between two full ones does not shift
 * the results up, that a card taken back leaves nothing behind, that dead cards
 * are counted and a seat short of a card says so. The scenarios and their
 * answers are `odds-ui-cases.ts`; nothing here knows poker.
 *
 * Needs the built app served — `npm run check:ui` does that, or `npm run ui`.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

/* NOT `import 'playwright'`: an ES import ignores NODE_PATH, which is how a
   machine's global install is found. `ui-journeys.mjs` does the same. */
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const cases = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/odds-ui-cases.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
);

const browser = await chromium.launch();
let failed = 0;

/*
 * THE PRESS CALLOUT (option D, 24 October). A card pressed in the deck shows an
 * enlarged copy above the finger; letting go deals it and the copy goes; sliding
 * off the cell cancels it and nothing is dealt. The deck's cells are 25 pt wide,
 * so what a press shows is the only confirmation a thumb has.
 *
 * Held here: it appears on press-in and carries the card's rank; it sits above
 * the pressed cell; it stays inside the screen on the A and 2 columns; it takes
 * no touches; release removes it AND deals the card; a slide off removes it and
 * deals nothing.
 */
{
  const fail = [];
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
  page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
  try {
    await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
    await page.waitForSelector('#screen-title');
    const callout = page.locator('#deck-callout');
    const centre = async (label) => {
      const b = await page.getByRole('button', { name: label, exact: true }).boundingBox();
      return { b, x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };

    /* In the middle of the deck: appears with its rank, above the cell, takes no touches; release deals it. */
    const q = await centre('Q♦');
    await page.mouse.move(q.x, q.y);
    await page.mouse.down();
    await callout.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail.push('no callout on press'));
    if (await callout.count()) {
      const text = (await callout.textContent()) ?? '';
      if (!text.includes('Q')) fail.push(`callout reads "${text}", wanted the Q`);
      const cb = await callout.boundingBox();
      if (cb && cb.y + cb.height > q.b.y + 1) fail.push('the callout is not above the pressed cell');
      const events = await callout.evaluate((el) => getComputedStyle(el).pointerEvents);
      if (events !== 'none') fail.push(`the callout takes touches (pointer-events: ${events})`);
    }
    await page.mouse.up();
    await callout.waitFor({ state: 'detached', timeout: 3000 }).catch(() => fail.push('the callout stayed after release'));
    await page
      .getByRole('button', { name: 'Player 1, card 1, Q♦', exact: true })
      .waitFor({ state: 'visible', timeout: 3000 })
      .catch(() => fail.push('releasing on the card did not deal it'));

    /* The two edge columns keep the copy inside the screen. */
    for (const label of ['A♣', '2♠']) {
      const e = await centre(label);
      await page.mouse.move(e.x, e.y);
      await page.mouse.down();
      await callout.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail.push(`no callout on ${label}`));
      const cb = await callout.boundingBox();
      if (cb && (cb.x < 8 - 0.5 || cb.x + cb.width > 393 - 8 + 0.5))
        fail.push(`the callout for ${label} leaves the screen: ${Math.round(cb.x)}–${Math.round(cb.x + cb.width)}`);
      await page.mouse.up();
    }

    /*
     * Slide off the cell and let go: the copy is gone and the card is NOT dealt.
     * On a phone React Native hides the copy the moment the finger leaves the
     * cell (`pressRetentionOffset`); react-native-web has no such offset, so in
     * this browser it goes on release instead. Both are asserted here as one
     * thing — after letting go, no copy and no card — because that is the part
     * a person can lose a hand to.
     */
    const k = await centre('K♥');
    await page.mouse.move(k.x, k.y);
    await page.mouse.down();
    await callout.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail.push('no callout on K♥'));
    await page.mouse.move(k.x, k.y - 260, { steps: 8 });
    await page.mouse.up();
    await callout.waitFor({ state: 'detached', timeout: 3000 }).catch(() => fail.push('the callout stayed after a slide off and release'));
    if ((await page.getByRole('button', { name: 'K♥, dealt', exact: true }).count()) > 0)
      fail.push('sliding off the cell still dealt it');
  } catch (e) {
    fail.push(String(e.message ?? e).split('\n')[0]);
  }
  await page.close();
  console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  --  press callout: appears, deals on release, stays on screen, a slide off deals nothing`);
  for (const f of fail) console.log(`        ${f}`);
  if (fail.length) failed++;
}

for (const [n, c] of cases.entries()) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
  const fail = [];
  /* A crash is a failure in its own right and says so. Until this was here one
     read as a 90-second wait for a line that never came: B101. */
  page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
  try {
    await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
    await page.waitForSelector('#screen-title');
    const tap = (label) => page.getByRole('button', { name: label, exact: true }).click({ timeout: 10_000 });
    for (let s = 3; s < c.seats; s++) await tap('Add a player');

    for (const p of c.placements) {
      if (p.decoy) {
        /* The wrong card, then take it back by tapping where it landed. */
        await tap(`${p.slot}, empty`);
        await tap(p.decoy);
        await tap(`${p.slot}, ${p.decoy}`);
      }
      await tap(p.slot.startsWith('Next dead') ? `${p.slot}, empty` : `${p.slot}, empty`);
      await tap(p.card);
    }

    /* Settled: the line under the title says what this table has to say. */
    await page
      .waitForFunction(
        (want) => document.getElementById('screen-meta')?.textContent === want,
        c.meta,
        { timeout: 90_000 },
      )
      .catch(() => {});
    const meta = await page.locator('#screen-meta').textContent();
    if (meta !== c.meta) fail.push(`meta: "${meta}", wanted "${c.meta}"`);

    for (let seat = 0; seat < c.seats; seat++) {
      const text = await page.evaluate((s) => {
        const b = document.querySelector(`[aria-label^="Player ${s}, card 1"]`);
        return b?.parentElement?.parentElement?.innerText ?? null;
      }, seat + 1);
      if (text === null) {
        fail.push(`Player ${seat + 1}: no row`);
        continue;
      }
      const shown = [...text.matchAll(/(\d+\.\d\d%)/g)].map((m) => m[1]);
      const want = c.figures[seat];
      if (want === null) {
        if (shown.length !== 0) fail.push(`Player ${seat + 1} is not in the hand but shows ${shown.join(' ')}`);
      } else if (shown.join(' ') !== want.join(' ')) {
        fail.push(`Player ${seat + 1}: ${shown.join(' ') || 'nothing'}, wanted ${want.join(' ')}`);
      }
    }
  } catch (e) {
    fail.push(String(e.message ?? e).split('\n')[0]);
  }
  await page.close();
  console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  ${String(n + 1).padStart(2)}  ${c.title}`);
  for (const f of fail) console.log(`        ${f}`);
  if (fail.length) {
    failed++;
    if (process.argv.includes('--bail')) break;
  }
}
await browser.close();

console.log(
  failed === 0
    ? `\nthe odds screen shows exactly what the engine says, ${cases.length} tables played through.`
    : `\n${failed} check${failed === 1 ? '' : 's'} failed: a table that shows something other than what the engine says, or the press callout.`,
);
process.exit(failed === 0 ? 0 : 1);
