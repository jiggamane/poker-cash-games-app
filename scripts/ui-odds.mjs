/**
 * The odds calculator's screen, played through with real taps, and every
 * figure it prints held against the engine's.
 *
 *   node scripts/ui-odds.mjs            against UI_CHECK_BASE, default :4321
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
for (const [n, c] of cases.entries()) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
  const fail = [];
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
  if (fail.length) failed++;
}
await browser.close();

console.log(
  failed === 0
    ? `\nthe odds screen shows exactly what the engine says, ${cases.length} tables played through.`
    : `\n${failed} of ${cases.length} tables show something other than what the engine says.`,
);
process.exit(failed === 0 ? 0 : 1);
