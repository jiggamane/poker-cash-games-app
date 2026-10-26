/**
 * The odds calculator's screen, played through with real taps, and every
 * figure it prints held against the engine's.
 *
 *   node scripts/ui-odds.mjs            against UI_CHECK_BASE, default :4321
 *   node scripts/ui-odds.mjs --bail     stop at the first table that is wrong
 *   node scripts/ui-odds.mjs --outs     only the player cards and their outs
 *   node scripts/ui-odds.mjs --run-out  only the run-out: the button and the picture
 *   node scripts/ui-odds.mjs --river    only the river: the hands named, the five cards, whole numbers
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
const outsCases = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/odds-outs-cases.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
);
const runOutCases = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/odds-runout-cases.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
);
const riverCases = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/odds-river-cases.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
);

const browser = await chromium.launch();
let failed = 0;
/** `--outs`: only the player cards and their outs, which is the part a change to them needs. */
const onlyOuts = process.argv.includes('--outs') || process.argv.includes('--run-out');
/** `--run-out`: only the run-out — the button on the odds screen and the picture behind it. */
const onlyRunOut = process.argv.includes('--run-out');
/** `--river`: only the river state of the player cards. */
const onlyRiver = process.argv.includes('--river');
if (onlyRiver) {
  /* The river is its own part; nothing else runs with it. */
}

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
if (!onlyOuts && !onlyRiver) {
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
const cutOff = (page, selectors = ['#pot-odds']) =>
  page.evaluate((sel) => {
    const out = [];
    const W = window.innerWidth;
    const roots = sel.flatMap((q) => [...document.querySelectorAll(q)]);
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
  }, selectors);

if (!onlyOuts && !onlyRiver) {
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

for (const [n, c] of (onlyOuts || onlyRiver ? [] : potCases).entries()) {
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


/*
 * THE PLAYER CARDS AND THEIR OUTS (layout G, decided 25 October). Every hand is
 * a card with a word beside its name — Favourite, Underdog, Too close; Winner and
 * Beaten on the river — and, for a hand that is not ahead with exactly one card
 * to come and at least one card that wins it, a round chevron at the end of the
 * card. Closed it names the kinds of out and says no number; open it is a table
 * of kind, count and the cards in order. The answers are `odds-outs-cases.ts`,
 * which asks core; nothing here knows poker.
 *
 * Held: the word on every seat in the hand and on none outside it; the control
 * on exactly the hands that should have it and on no other (not the favourite,
 * not on the flop, not before it, not on the river, not with one hand alone, not
 * for a hand that no card wins); closed shows the kinds and not one digit; open
 * shows each kind's count and its cards in core's order; the chevron's own label
 * and its expanded state follow the card; and every line of every seat card sits
 * inside it and inside the screen, closed and open, at two phones.
 */
const SEATS = ['[id^="seat-"]'];
for (const [n, c] of (onlyRunOut || onlyRiver ? [] : outsCases).entries()) {
  for (const [w, h, scheme] of [[393, 852, 'dark'], [320, 568, 'light']]) {
    const fail = [];
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
    try {
      await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
      await page.waitForSelector('#screen-title');
      const tap = await dealTable(page, c);
      const meta = await page.locator('#screen-meta').textContent();
      if (meta !== c.meta) fail.push(`meta: "${meta}", wanted "${c.meta}"`);
      for (const f of await cutOff(page, SEATS)) fail.push(`closed: ${f}`);
      for (const [i, want] of c.want.entries()) {
        const seat = i + 1;
        const tag = `Player ${seat}`;
        const word = (await page.locator(`#seat-${seat}-word`).count()) ? (await page.locator(`#seat-${seat}-word`).innerText()).trim() : null;
        /* CSS uppercases the word; what is held is the letters. */
        if ((word === null ? null : word.toLowerCase()) !== (want.word === null ? null : want.word.toLowerCase()))
          fail.push(`${tag}: the word reads ${JSON.stringify(word)}, wanted ${JSON.stringify(want.word)}`);
        const control = page.getByRole('button', { name: `Outs for ${tag}`, exact: true });
        const has = (await control.count()) > 0;
        if (has !== want.control) fail.push(`${tag}: the outs control is ${has ? 'on' : 'off'} the card, wanted ${want.control ? 'on' : 'off'}`);
        const names = (await page.locator(`#outs-names-${seat}`).count()) > 0;
        const table = (await page.locator(`#outs-table-${seat}`).count()) > 0;
        if (!want.control) {
          if (names || table) fail.push(`${tag}: shows outs where it has none`);
          continue;
        }
        if (!names || table) fail.push(`${tag}: does not start closed with the kinds named`);
        if (names) {
          const text = (await page.locator(`#outs-names-${seat}`).innerText()).replace(/\s+/g, ' ').trim();
          if (/\d/.test(text)) fail.push(`${tag}: the closed card shows a number: "${text}"`);
          if (text.toLowerCase() !== want.names.join(' ').toLowerCase()) fail.push(`${tag}: the closed card names "${text}", wanted "${want.names.join(' ')}"`);
        }
        if ((await control.getAttribute('aria-expanded')) !== 'false') fail.push(`${tag}: the control does not say it is closed`);
        await control.click();
        if ((await control.getAttribute('aria-expanded')) !== 'true') fail.push(`${tag}: the control does not say it is open`);
        if ((await page.locator(`#outs-table-${seat}`).count()) === 0) fail.push(`${tag}: opening did not show the table`);
        if ((await page.locator(`#outs-names-${seat}`).count()) > 0) fail.push(`${tag}: the names stay once it is open`);
        for (const row of want.rows) {
          const r = page.locator(`#outs-row-${seat}-${row.category.replace(/\s+/g, '-').toLowerCase()}`);
          if ((await r.count()) === 0) {
            fail.push(`${tag}: no row for ${row.kind}`);
            continue;
          }
          const label = await r.getAttribute('aria-label');
          const wantLabel = `${row.kind}, ${row.count} ${row.count === 1 ? 'card' : 'cards'}`;
          if (label !== wantLabel) fail.push(`${tag}: the ${row.kind} row is "${label}", wanted "${wantLabel}"`);
          /* The label is what is announced; what is SEEN is held too — a count on the screen is not read off the label. */
          const seen = (await r.innerText()).split('\n').map((x) => x.trim());
          const wantCount = `${row.count} ${row.count === 1 ? 'card' : 'cards'}`;
          if (!seen.includes(row.kind)) fail.push(`${tag}: the ${row.kind} row does not name its kind on the screen: ${JSON.stringify(seen.slice(0, 2))}`);
          if (!seen.includes(wantCount)) fail.push(`${tag}: the ${row.kind} row's count reads ${JSON.stringify(seen[1] ?? null)}, wanted ${JSON.stringify(wantCount)}`);
          const shown = await r.locator('[role="img"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
          if (shown.join(' ') !== row.cards.join(' ')) fail.push(`${tag}: ${row.kind} cards ${shown.join(' ')}, wanted ${row.cards.join(' ')}`);
        }
        const rows = await page.locator(`[id^="outs-row-${seat}-"]`).count();
        if (rows !== want.rows.length) fail.push(`${tag}: ${rows} rows, wanted ${want.rows.length}`);
        for (const f of await cutOff(page, SEATS)) fail.push(`${tag} open: ${f}`);
        await control.click();
        if ((await page.locator(`#outs-names-${seat}`).count()) === 0) fail.push(`${tag}: closing did not bring the names back`);
      }
    } catch (e) {
      fail.push(String(e.message ?? e).split('\n')[0]);
    }
    await page.close();
    console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  outs ${String(n + 1).padStart(2)}  ${c.title}  ·  ${w}${scheme === 'light' ? ' light' : ''}`);
    for (const f of fail) console.log(`        ${f}`);
    if (fail.length) failed++;
  }
}


/*
 * THE RIVER (decided 26 October, board 21). Once the board is complete the
 * player cards change three ways, and `odds-river-cases.ts` — which asks core —
 * says what each seat has to show: the figures are WHOLE NUMBERS (100%, 0%, 50%
 * on a chop; two decimals on the turn, held on the same tables for contrast);
 * the hand's NAME sits under them, with `· king kicker` appended only when the
 * kicker decided; and the chevron is on EVERY hand in the hand — labelled
 * `Hand for Player N`, never `Outs for` — opening the FIVE cards that make it,
 * the making cards first, as images named `K♣`. No outs chips on the river.
 * Every line of every seat card sits inside it and the screen, closed and open,
 * at two phones.
 */
for (const [n, c] of (onlyOuts && !onlyRiver ? [] : riverCases).entries()) {
  for (const [w, h, scheme] of [[393, 852, 'dark'], [320, 568, 'light']]) {
    const fail = [];
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
    try {
      await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
      await page.waitForSelector('#screen-title');
      await dealTable(page, c);
      const meta = await page.locator('#screen-meta').textContent();
      if (meta !== c.meta) fail.push(`meta: "${meta}", wanted "${c.meta}"`);
      for (const f of await cutOff(page, SEATS)) fail.push(`closed: ${f}`);
      for (const [i, want] of c.want.entries()) {
        const seat = i + 1;
        const tag = `Player ${seat}`;
        const text = (await page.locator(`#seat-${seat}`).innerText()).replace(/\s+/g, ' ');
        const win = /Win (\S+)/.exec(text)?.[1] ?? null;
        const tie = /Tie (\S+)/.exec(text)?.[1] ?? null;
        if (win !== want.win || tie !== want.tie) fail.push(`${tag}: reads Win ${win} Tie ${tie}, wanted Win ${want.win} Tie ${want.tie}`);
        const word = (await page.locator(`#seat-${seat}-word`).count()) ? (await page.locator(`#seat-${seat}-word`).innerText()).trim().toLowerCase() : null;
        if (word !== (want.word === null ? null : want.word.toLowerCase())) fail.push(`${tag}: the word reads ${JSON.stringify(word)}, wanted ${JSON.stringify(want.word)}`);
        const handControl = page.getByRole('button', { name: `Hand for ${tag}`, exact: true });
        const outsControl = page.getByRole('button', { name: `Outs for ${tag}`, exact: true });
        const hasHand = (await handControl.count()) > 0;
        const hasOuts = (await outsControl.count()) > 0;
        if (hasHand !== want.hand) fail.push(`${tag}: the hand control is ${hasHand ? 'on' : 'off'} the card, wanted ${want.hand ? 'on' : 'off'}`);
        if (hasOuts !== want.outs) fail.push(`${tag}: the outs control is ${hasOuts ? 'on' : 'off'} the card, wanted ${want.outs ? 'on' : 'off'}`);
        if (c.river && (await page.locator(`#outs-names-${seat}`).count()) > 0) fail.push(`${tag}: outs chips on the river`);
        const name = (await page.locator(`#hand-name-${seat}`).count()) ? (await page.locator(`#hand-name-${seat}`).innerText()).replace(/\s+/g, ' ').trim() : null;
        if (name !== want.label) fail.push(`${tag}: the hand reads ${JSON.stringify(name)}, wanted ${JSON.stringify(want.label)}`);
        if (!want.hand) continue;
        if ((await page.locator(`#hand-five-${seat}`).count()) > 0) fail.push(`${tag}: the five cards show before the chevron is pressed`);
        if ((await handControl.getAttribute('aria-expanded')) !== 'false') fail.push(`${tag}: the control does not say it is closed`);
        await handControl.click();
        if ((await handControl.getAttribute('aria-expanded')) !== 'true') fail.push(`${tag}: the control does not say it is open`);
        const five = page.locator(`#hand-five-${seat}`);
        if ((await five.count()) === 0) {
          fail.push(`${tag}: opening did not show the five cards`);
        } else {
          const shown = await five.locator('[role="img"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
          if (shown.join(' ') !== want.five.join(' ')) fail.push(`${tag}: the five read ${shown.join(' ')}, wanted ${want.five.join(' ')}`);
        }
        for (const f of await cutOff(page, SEATS)) fail.push(`${tag} open: ${f}`);
        await handControl.click();
        if ((await five.count()) > 0) fail.push(`${tag}: closing did not hide the five cards`);
      }
    } catch (e) {
      fail.push(String(e.message ?? e).split('\n')[0]);
    }
    await page.close();
    console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  river ${String(n + 1).padStart(2)}  ${c.title}  ·  ${w}${scheme === 'light' ? ' light' : ''}`);
    for (const f of fail) console.log(`        ${f}`);
    if (fail.length) failed++;
  }
}
for (const [n, c] of (onlyOuts || onlyRiver ? [] : cases).entries()) {
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
      /* Two decimals, or a whole number on a completed board. */
      const shown = [...text.matchAll(/(\d+(?:\.\d\d)?%)/g)].map((m) => m[1]);
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
/*
 * THE RUN-OUT (board 19, "How it ran out"). Each scenario in
 * `odds-runout-cases.ts` is dealt on the odds screen with taps; *Run it out* is
 * held to being there exactly when the board has a flop; it is tapped, and what
 * `/run-out` prints — the headline and the small figures on every street, the
 * spoken label that carries the word the picture leaves off, and the box at the
 * foot — is held to what core says for THAT street's table. And every line of
 * it sits inside the screen at two phones, once the pre-flop column has
 * counted: a figure cut off is the fault this whole gate is for.
 *
 * Also: the bare route draws no picture and says to deal a hand first.
 */
const STREETS = ['preflop', 'flop', 'turn', 'river'];
const squash = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
for (const [n, c] of (onlyRiver ? [] : runOutCases).entries()) {
  for (const [w, h, scheme] of [[393, 852, 'dark'], [320, 568, 'light']]) {
    /* The small light phone for the scenarios that print the most. */
    if (w === 320 && ![0, 3, 5].includes(n)) continue;
    const fail = [];
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
    try {
      await page.goto(BASE + '/odds', { waitUntil: 'networkidle' });
      await page.waitForSelector('#screen-title');
      const tap = (label) => page.getByRole('button', { name: label, exact: true }).click({ timeout: 10_000 });
      for (let s = 3; s < c.seats; s++) await tap('Add a player');
      for (const p of c.placements) {
        await tap(`${p.slot}, empty`);
        await tap(p.card);
      }
      const button = page.getByRole('button', { name: 'Run it out', exact: true });
      const has = (await button.count()) > 0;
      if (has !== c.button) fail.push(`Run it out is ${has ? 'on' : 'off'} the odds screen, wanted ${c.button ? 'on' : 'off'}`);
      if (!c.button) {
        /* Nothing to run; the picture is still reachable by its link, and says the same table. */
        await page.goto(BASE + '/run-out?h=AhKh,2c2d&b=', { waitUntil: 'networkidle' });
      } else {
        await button.click();
      }
      await page.waitForSelector('#run-out', { timeout: 10_000 }).catch(() => fail.push('no picture'));
      /* Settled once every street is counted. */
      await page
        .waitForFunction(() => /Every street counted exactly/.test(document.body.innerText), null, { timeout: 120_000 })
        .catch(() => fail.push('the pre-flop count did not settle'));
      /* The calculator stays mounted under the push, so there are two titles; the picture's is the last. */
      const title = await page.locator('#screen-title').last().textContent();
      if (title !== 'How it ran out') fail.push(`the title reads "${title}"`);
      for (const s of STREETS) {
        const want = c.streets[s];
        const col = page.locator(`#street-${s}`);
        if ((await col.count()) === 0) {
          fail.push(`${s}: no column`);
          continue;
        }
        const figure = squash(await page.locator(`#street-${s}-figure`).innerText().catch(() => '')).replace(/\s/g, '');
        if (figure !== want.figure) fail.push(`${s}: the headline reads "${figure}", wanted "${want.figure}"`);
        const others = (await page.locator(`#street-${s}-others`).count()) ? squash(await page.locator(`#street-${s}-others`).innerText()) : '';
        if (others !== want.others.join(' ')) fail.push(`${s}: under it "${others}", wanted "${want.others.join(' ')}"`);
        const label = await col.getAttribute('aria-label');
        if (label !== want.label) fail.push(`${s}: the spoken label is "${label}", wanted "${want.label}"`);
        /* A street the board reached shows its cards, and one it has not shows the dashed places. */
        const faces = await col.locator('[aria-label]').count();
        const wantFaces = Math.min(c.placements.filter((p) => p.slot.startsWith('Board')).length, { preflop: 0, flop: 3, turn: 4, river: 5 }[s]);
        if (faces !== wantFaces) fail.push(`${s}: ${faces} board cards drawn, wanted ${wantFaces}`);
      }
      const footTitle = (await page.locator('#run-out-foot-title').count()) ? squash(await page.locator('#run-out-foot-title').innerText()) : null;
      const footDetail = (await page.locator('#run-out-foot-detail').count()) ? squash(await page.locator('#run-out-foot-detail').innerText()) : null;
      if (footTitle !== c.foot.title) fail.push(`the foot reads "${footTitle}", wanted "${c.foot.title}"`);
      if (footDetail !== c.foot.detail) fail.push(`the foot's detail reads ${JSON.stringify(footDetail)}, wanted ${JSON.stringify(c.foot.detail)}`);
      for (const f of await cutOff(page, ['#run-out'])) fail.push(f);
      /* And back is a push's back, to the calculator. */
      if ((await page.getByRole('button', { name: 'Back to Odds calculator', exact: true }).count()) === 0) fail.push('no back button to the calculator');
    } catch (e) {
      fail.push(String(e.message ?? e).split('\n')[0]);
    }
    await page.close();
    console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  run-out ${String(n + 1).padStart(2)}  ${c.title}  ·  ${w}${scheme === 'light' ? ' light' : ''}`);
    for (const f of fail) console.log(`        ${f}`);
    if (fail.length) failed++;
  }
}
if (!onlyRiver) {
  const fail = [];
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
  page.on('pageerror', (e) => fail.push(`page error: ${e.message}`));
  try {
    await page.goto(BASE + '/run-out', { waitUntil: 'networkidle' });
    await page.waitForSelector('#screen-title');
    if ((await page.locator('#run-out').count()) > 0) fail.push('the bare route draws a picture of nothing');
    if (!/Deal two hands on the odds calculator first\./.test(await page.innerText('body'))) fail.push('the bare route does not say to deal a hand first');
  } catch (e) {
    fail.push(String(e.message ?? e).split('\n')[0]);
  }
  await page.close();
  console.log(`${fail.length === 0 ? '  ok ' : ' FAIL'}  --  run-out: the bare route draws nothing and says so`);
  for (const f of fail) console.log(`        ${f}`);
  if (fail.length) failed++;
}
await browser.close();

console.log(
  failed === 0
    ? `\nthe odds screen shows exactly what the engine says, ${cases.length} tables played through, and the pot odds card what potOdds() says, ${potCases.length} more, and the player cards and their outs what core says, ${outsCases.length} more, and the river its hands, ${riverCases.length} more, and the run-out every street's figures, ${runOutCases.length} more.`
    : `\n${failed} check${failed === 1 ? '' : 's'} failed: a table that shows something other than what the engine says, the press callout, a player card, the river, or the run-out.`,
);
process.exit(failed === 0 ? 0 : 1);
