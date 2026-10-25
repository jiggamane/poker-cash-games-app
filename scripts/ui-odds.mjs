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
const potCases = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/odds-pot-cases.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
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


/*
 * POT ODDS (decided 24 October, permanent from 25 October: no setting). Two halves.
 *
 * WHERE IT SHOWS. The card, and the *You* tag on Player 1 that goes with it, are
 * on the screen on the flop and the turn when there is a result and Player 1 is
 * in the hand — and nowhere else: not before the flop, not on the river, not
 * with Player 1 out, not with no result. Settings has no switch for it any more.
 *
 * WHAT IT SAYS. Each scenario in `odds-pot-cases.ts` is dealt with taps, the pot
 * and the call are typed on the amount keypad, and what the card prints — Needs,
 * You have, the money line and the formula under it — is held to `potOdds()` in
 * core, which is where the arithmetic is. Where the table says the card must not
 * be there it is held to not being there. And every line of it is held inside
 * the screen, at two phones, with the keypad up and with it away: a figure cut
 * off is the fault this whole gate is for.
 */
const dealTable = async (page, c) => {
  const tap = (label) => page.getByRole('button', { name: label, exact: true }).click({ timeout: 10_000 });
  for (let s = 3; s < c.seats; s++) await tap('Add a player');
  for (const p of c.placements) {
    await tap(`${p.slot}, empty`);
    await tap(p.card);
  }
  await page
    .waitForFunction((want) => document.getElementById('screen-meta')?.textContent === want, c.meta, { timeout: 90_000 })
    .catch(() => {});
  return tap;
};
/** Every line of text inside `#pot-odds` (and the keypad, when it is up) must sit inside its own box and inside the screen. */
const cutOff = (page) =>
  page.evaluate(() => {
    const out = [];
    const W = window.innerWidth;
    const roots = [document.getElementById('pot-odds')].filter(Boolean);
    for (const root of roots) {
      for (const el of root.querySelectorAll('*')) {
        if (el.children.length > 0 && el.tagName !== 'DIV') continue;
        const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        if (text === '') continue;
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        /* A line that wraps keeps the space it wrapped at hanging off its end (pre-wrap), a third of an
           em past the box and invisible. That is not a figure cut off; a single line wider than its box is. */
        const lines = range.getClientRects().length;
        const slack = lines > 1 ? parseFloat(getComputedStyle(el).fontSize) * 0.35 : 1.5;
        if (r.width > b.width + slack) out.push(`"${text.slice(0, 30)}" is ${Math.round(r.width)} wide in a box of ${Math.round(b.width)}`);
        if (r.right > W + 0.5 || r.left < -0.5) out.push(`"${text.slice(0, 30)}" leaves the screen (${Math.round(r.left)}–${Math.round(r.right)} of ${W})`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push(`"${text.slice(0, 30)}" is clipped`);
      }
    }
    return out;
  });

{
  const fail = [];
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
  page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
  try {
    /* Every scenario says whether the card is there; the You tag goes exactly with it, and neither is there otherwise. */
    for (const c of potCases) {
      await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
      await page.waitForSelector('#screen-title');
      await dealTable(page, c);
      const card = (await page.locator('#pot-odds').count()) > 0;
      const you = (await page.getByText('You', { exact: true }).count()) > 0;
      if (card !== c.visible) fail.push(`${c.title}: the card is ${card ? 'on' : 'off'} the screen, wanted ${c.visible ? 'on' : 'off'}`);
      if (you !== c.visible) fail.push(`${c.title}: the You tag is ${you ? 'on' : 'off'} the screen, wanted ${c.visible ? 'on' : 'off'}`);
    }
    /* And Settings no longer has a switch for it. */
    await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Odds calculator' }).first().waitFor({ state: 'visible', timeout: 10_000 });
    if ((await page.getByRole('switch', { name: /pot odds/i }).count()) > 0) fail.push('Settings still has a Pot odds switch');
  } catch (e) {
    fail.push(String(e.message ?? e).split('\n')[0]);
  }
  await page.close();
  console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  --  pot odds: the card and the You tag on the flop and the turn only; no switch in Settings`);
  for (const f of fail) console.log(`        ${f}`);
  if (fail.length) failed++;
}

for (const [n, c] of potCases.entries()) {
  for (const [w, h, scheme] of [[393, 852, 'dark'], [320, 568, 'light']]) {
    /* The small light phone only for the scenarios that print the most. */
    if (w === 320 && ![0, 1, 3, 6].includes(n)) continue;
    const fail = [];
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
    try {
      await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
      await page.waitForSelector('#screen-title');
      const tap = await dealTable(page, c);
      const card = page.locator('#pot-odds');
      if (!c.visible) {
        if ((await card.count()) > 0) fail.push('the card is on the screen where it must not be');
      } else {
        await card.waitFor({ state: 'visible', timeout: 5000 }).catch(() => fail.push('the card is not on the screen'));
        /* Closed: one row. Open: the fields. */
        if ((await page.getByRole('button', { name: 'Pot odds, closed', exact: true }).count()) === 0) fail.push('the card does not start closed');
        const closedCut = await cutOff(page);
        for (const f of closedCut) fail.push(`closed: ${f}`);
        await tap('Pot odds, closed');
        const type = async (field, digits) => {
          await page.getByRole('button', { name: new RegExp(`^${field}, `) }).click({ timeout: 10_000 });
          for (const d of digits) await tap(d);
          /* With the keypad up, the card still fits and so does the pad. */
          for (const f of await cutOff(page)) fail.push(`typing ${field}: ${f}`);
          const done = await page.getByRole('button', { name: 'Done', exact: true }).boundingBox();
          if (!done || done.y + done.height > h + 0.5) fail.push(`typing ${field}: Done is off the bottom of the screen`);
          await tap('Done');
        };
        if (c.pot !== null) await type('Pot', c.pot);
        if (c.call !== null) await type('To call', c.call);
        if ((await page.getByRole('button', { name: `Pot, ${c.potShown}`, exact: true }).count()) === 0) fail.push(`the Pot field does not read ${c.potShown}`);
        if ((await page.getByRole('button', { name: `To call, ${c.callShown}`, exact: true }).count()) === 0) fail.push(`the To call field does not read ${c.callShown}`);
        const text = await card.innerText();
        const needs = /Needs\s+(\S+)/.exec(text)?.[1];
        const has = /You have\s+(\S+)/.exec(text)?.[1];
        if (needs !== c.needs) fail.push(`Needs reads ${needs}, wanted ${c.needs}`);
        if (has !== c.has) fail.push(`You have reads ${has}, wanted ${c.has}`);
        const returns = (await page.locator('#pot-odds-returns').count()) ? (await page.locator('#pot-odds-returns').innerText()).replace(/\s+/g, ' ').trim() : null;
        if ((c.returns ?? null) !== returns) fail.push(`the money line reads ${JSON.stringify(returns)}, wanted ${JSON.stringify(c.returns ?? null)}`);
        const formula = (await page.locator('#pot-odds-formula').count()) ? (await page.locator('#pot-odds-formula').innerText()).replace(/\s+/g, ' ').trim() : null;
        if ((c.formula ?? null) !== formula) fail.push(`the formula reads ${JSON.stringify(formula)}, wanted ${JSON.stringify(c.formula ?? null)}`);
        /* The marker is on the bar exactly when there is a call, and the words never tell anyone what to do. */
        if ((c.needs !== '—') !== ((await page.locator('#pot-odds-marker').count()) > 0)) fail.push('the break-even marker is wrong for whether a call is typed');
        if (/\b(call it|should|fold|you must fold)\b/i.test(text.replace(/this call returns/, ''))) fail.push('the card tells the reader what to do');
        for (const f of await cutOff(page)) fail.push(`open: ${f}`);
      }
    } catch (e) {
      fail.push(String(e.message ?? e).split('\n')[0]);
    }
    await page.close();
    console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  pot ${String(n + 1).padStart(2)}  ${c.title}  ·  ${w}${scheme === 'light' ? ' light' : ''}`);
    for (const f of fail) console.log(`        ${f}`);
    if (fail.length) failed++;
  }
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
    ? `\nthe odds screen shows exactly what the engine says, ${cases.length} tables played through, and the pot odds card what potOdds() says, ${potCases.length} more.`
    : `\n${failed} check${failed === 1 ? '' : 's'} failed: a table that shows something other than what the engine says, or the press callout.`,
);
process.exit(failed === 0 ? 0 : 1);
