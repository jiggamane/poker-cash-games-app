/*
 * THE APP IN SOMEBODY ELSE'S MONEY.
 *
 * Every figure width in this repo was measured against a one-character `$`, and
 * two thirds of the ISO table is wider than that: `Kč` is two glyphs, `CHF` is
 * three. A three-letter currency puts two extra glyphs in front of every amount
 * in the app, which is two digits' worth of column that was never there — and
 * `ui-audit.mjs` and `ui-journeys.mjs` both run on the seeded club, which keeps
 * its book in dollars. Neither can see any of it.
 *
 * So this pass picks the widest symbol the app can draw, the way a host does —
 * the Currency row in the game's own settings — and then walks the screens
 * looking for a figure that no longer fits.
 *
 * A CLIP IS A FAULT AND A WRAP IS NOT, which is the one place this pass is
 * looser than `ui-journeys.mjs`, and deliberately. There the rule is that a
 * SLOT — a run of text that is figures plus twelve characters or fewer — may
 * not wrap, because "$2,352,880 of" over "$2,352,880" is a slot torn in half.
 * Here the symbol itself is two glyphs wider than anything was measured for,
 * and `in CHF500 · out CHF0` on the settle-up row genuinely does not fit 360 at
 * 120% text. Wrapping loses nothing; the alternative is cutting a figure, which
 * is B12 and is never the better answer. What may never happen is a figure
 * going off the side of its box.
 *
 * PROSE IS LEFT ALONE, the same test the journeys use: take the figures out and
 * if more than twelve characters are left it is a sentence, and a sentence is
 * allowed to ellipsise.
 *
 *   node scripts/ui-currency.mjs           # needs `npm run ui` serving
 */

/*
 * PLAYWRIGHT THROUGH `createRequire`, exactly as the other two gate passes take
 * it — `scripts/ui-audit.mjs` has the note. A bare `import` resolves against
 * this repo's own `node_modules` and nothing else, and playwright is
 * deliberately not a dependency here (see the top of `ui-check.mjs`), so on a
 * machine using the global install this pass died with ERR_MODULE_NOT_FOUND
 * while the two passes beside it ran clean. `require` honours NODE_PATH; the
 * ESM loader does not. Same fault the file above was written about: a check
 * that only runs where somebody has already set the machine up is a check that
 * does not run.
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
import { launchOptions } from './chromium.mjs';

const PORT = process.env.UI_CHECK_PORT ?? '4321';
const BASE = `http://127.0.0.1:${PORT}`;

/** Three glyphs, which is the widest the table goes. */
const CODE = 'CHF';
const NAME = 'Swiss';
/** What that code is written as. Three glyphs, which is the whole point. */
const SYMBOL = 'CHF';

/** The screens a figure is drawn on. The rest carry no money. */
const ROUTES = [
  '/', '/session', '/count-up', '/deductions', '/settle-up',
  '/payments', '/log', '/money-rules', '/club-rules', '/house-rules',
  '/new-night', '/rounding', '/bill', '/spend', '/share', '/stats', '/games',
];

const WIDTHS = [360, 393];

/** Applied to the font size only, exactly as `ui-journeys.mjs` does it. */
const STRAIN = 1.2;

const FIND = `(() => {
  /* THE SYMBOL ITSELF, not "anything that looks like money". An earlier draft
     took a letter pair against a digit as a figure and reported "1 of 6 in" on
     Count up — a label with no money in it at all, clipped by the text strain
     and nothing to do with this pass. What is being measured here is the cost
     of the symbol, so the symbol is what it looks for. */
  const SYMBOL = '${SYMBOL}';
  const out = [];
  const strip = (s) => s.replace(/[\\d.,\\s+\\u2212-]/g, '');
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!/\\d/.test(text)) continue;

    if (!text.includes(SYMBOL)) continue;

    /* Prose is allowed to ellipsise. Take the figures out and count what is
       left: "of", "in · out", "cashed out" are slots; a sentence is not. */
    const rest = strip(text).split(SYMBOL).join('');
    if (rest.length > 12) continue;

    if (el.scrollWidth > el.clientWidth + 1) {
      out.push(text + '  — ' + el.scrollWidth + ' in ' + el.clientWidth);
    }
  }
  return out;
})()`;

const browser = await chromium.launch(launchOptions());
let failures = 0;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 852 },
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  /* THE WAY A HOST DOES IT — the Currency row in the game's own settings, which
     is the only door to it and the thing this whole pass is about. */
  await page.evaluate(() => {
    history.pushState({}, '', '/new-night');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(1300);
  await page.getByText('Currency', { exact: false }).last().click({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.getByPlaceholder(/currenc|search|code/i).first().fill(CODE);
  await page.waitForTimeout(700);
  await page.getByText(NAME, { exact: false }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(1200);

  console.log(`\n${CODE} · ${width} × 852 · ${Math.round(STRAIN * 100)}% text`);

  for (const route of ROUTES) {
    await page.evaluate((r) => {
      history.pushState({}, '', r);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, route);
    await page.waitForTimeout(750);

    const restore = await page.evaluate((f) => {
      const was = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (!cs.fontSize) continue;
        const cap = el.dataset && el.dataset.fontcap ? Number(el.dataset.fontcap) : f;
        was.push([el, cs.fontSize]);
        el.style.fontSize = `${parseFloat(cs.fontSize) * Math.min(f, cap)}px`;
      }
      window.__was = was;
      return was.length;
    }, STRAIN);
    void restore;
    await page.waitForTimeout(200);

    const found = await page.evaluate(FIND);
    await page.evaluate(() => {
      for (const [el, size] of window.__was ?? []) el.style.fontSize = size;
    });

    if (found.length === 0) {
      console.log(`  ${route.padEnd(14)} ok`);
    } else {
      failures += found.length;
      console.log(`  ${route.padEnd(14)} ${found.length} cut off`);
      for (const f of found) console.log(`    ${f}`);
    }
  }

  await ctx.close();
}

await browser.close();

console.log(
  failures === 0
    ? `\nevery figure fits in ${CODE} · ${ROUTES.length} routes × ${WIDTHS.length} widths`
    : `\n${failures} figures cut off in ${CODE}`,
);
process.exit(failures === 0 ? 0 : 1);
