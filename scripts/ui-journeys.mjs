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
 * everyone up wrong, read the difference off the screen that names it, fix the
 * count, apply the rules, settle, mark a payment, nudge the rest, and back out
 * to the history screens the night ends up living on. At every stop it asks the
 * same question — is any figure on this screen cut off, outside the box that
 * holds it, off the phone, or broken across two lines?
 *
 * It is deliberately NOT a substitution of long strings into the DOM. That was
 * tried and it cannot tell a slot guarded by `formatToFit` from one with no
 * guard at all, so it reports states the app will never render, and a check
 * that cries wolf is worse than no check. These are the app's own figures,
 * produced by the app's own engine.
 *
 * TWICE OVER, AT TWO SIZES OF TABLE, because the two faults are opposite ones.
 * A night in the thousands proves nothing is abbreviated that had room to be
 * exact; a night in the millions is what breaks the columns. A third at the
 * keypad's own ceiling — nine digits is all it will take — bounds the rest.
 *
 *   npm run ui                                  # build and serve first
 *   node scripts/ui-journeys.mjs                # then this: every scale
 *   node scripts/ui-journeys.mjs --scale=millions
 *   node scripts/ui-journeys.mjs --shots --light
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
/*
 * THE NARROWEST PHONE IN THE MATRIX, not the reference one.
 *
 * This ran at 393, the phone the boards were drawn at, and every fault it has
 * ever been written for turned out to be invisible there and plain at 360: the
 * count-up card's "$2,352,880 of $2,352,880" fits at 393 to within a few points
 * and wraps at 360, and so did both of the lists under it. The route pass in
 * `ui-audit.mjs` runs at 393 AND 360 for exactly this reason, and its note says
 * why — "a label that fits at 393 can still be cut at 375".
 *
 * It runs at ONE width rather than two because, unlike that pass, this one
 * plays a whole night per run: a minute each, three scales, and a second width
 * would double a check that has to stay short enough to keep being run. Every
 * card in this app is the phone's width less a constant and every type size is
 * fixed, so 393 is strictly the roomier of the two — nothing fits at 360 and
 * fails at 393. UI_AUDIT_WIDTH still pins it wherever you want it.
 */
const WIDTH = Number(process.env.UI_AUDIT_WIDTH ?? 360);
const HEIGHT = Number(process.env.UI_AUDIT_HEIGHT ?? 852);
const OUT = process.env.UI_JOURNEY_OUT ?? '.ui-check/journey';
const light = process.argv.includes('--light');
const shots = process.argv.includes('--shots');

/**
 * The night this plays, at each SIZE OF TABLE the app has to survive.
 *
 * These are what the keypad TYPES, and typing REPLACES the preset rather than
 * appending to it. That is worth stating because the opposite was written here
 * and had gone stale: the note used to say the digits landed on top of the
 * suggested buy-in "and come out in the millions", and on that reading `7000`
 * was a $5,007,000 rebuy. It is a $7,000 rebuy. Every run of this check since
 * that behaviour changed measured a night whose largest figure was $14,900,
 * reported it as "a night in the millions", and passed — while the seven-figure
 * columns it exists to guard were never drawn. See `docs/bugs.md`.
 *
 * So the amounts are explicit now, and there are two sets rather than one:
 *
 *   · THOUSANDS — a real home game, four and five figures. Nothing here should
 *     ever be abbreviated; `$14,900` is exact and fits.
 *   · MILLIONS — the table that broke the columns. Seven figures everywhere,
 *     and the winner's net is eight.
 *
 * Both are played end to end by default, because the faults are opposite: the
 * big one cuts figures off, and a fix for it that abbreviates too eagerly
 * turns $8,500 into $8.5k on a card with room for all of it.
 */
const SCALES = {
  thousands: [
    ['Petr', '7000'],
    ['Ivo', '2500'],
    ['Lena', '900'],
  ],
  millions: [
    ['Petr', '1200000'],
    ['Ivo', '900000'],
    ['Lena', '250000'],
  ],
  ceiling: [
    ['Petr', '99000000'],
    ['Ivo', '80000000'],
    ['Lena', '60000000'],
  ],
};

const only = process.argv.find((a) => a.startsWith('--scale='))?.slice('--scale='.length);
const SCALE_NAMES = only ? [only] : Object.keys(SCALES);
for (const name of SCALE_NAMES) {
  if (!(name in SCALES)) {
    console.error(`no scale called "${name}" — try ${Object.keys(SCALES).join(' or ')}`);
    process.exit(2);
  }
}

/**
 * WHO IS STILL TO BE COUNTED, read off the screen rather than written here.
 *
 * The roster and what each of them is in for both move with the rebuys above,
 * so a list written here goes stale the moment those change.
 */
const readStacks = (page) =>
  page.evaluate(() => {
    const lines = document.body.innerText.split('\n').map((l) => l.trim());
    const num = (s) => Number((s.match(/[\d,]+/)?.[0] ?? '0').replace(/,/g, ''));
    const players = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^in \$[\d,.]+M?k?$/.test(lines[i])) continue;
      // The name is the line above, and only for someone still to be counted:
      // a player already gone reads "cashed out 23:15 · in $500".
      players.push({ name: lines[i - 1], in: num(lines[i]) });
    }
    return { players };
  });

/**
 * WHAT THE TABLE IS SHORT, taken from the app rather than worked out here.
 *
 * The shape the results screens have to survive is ONE PLAYER TAKES THE TABLE
 * and everybody else is left with a hundred: counting each person with what
 * they are in for balances too, but it makes every net nought, and a deductions
 * table of noughts proves nothing about a column that has to hold a seven-
 * figure win. So the winner needs the whole table less a hundred each, and that
 * number has to be exact — a night that does not balance stops at E5 and never
 * reaches Deductions at all.
 *
 * It used to be read off Count up's own "$0 of $2,880". That figure is
 * abbreviated now on a table past six figures, and rightly — see the note on
 * the card — so this asks the screen whose whole job is naming the difference
 * to the unit. Everybody is counted with a hundred first, which lands on E5 by
 * design, and E5 says "Off by $2,352,380".
 *
 * The check gains a screen by it: E5 carries the night's two largest figures in
 * one sentence — what went in and what was counted — and no run had ever
 * measured it.
 */
const readShortfall = (page) =>
  page.evaluate(() => {
    const line = document.body.innerText
      .split('\n')
      .map((l) => l.trim())
      // Upper-cased by the stylesheet, so it reads back "OFF BY $12,780".
      .find((l) => /^off by \$[\d,]+$/i.test(l));
    if (line === undefined) {
      throw new Error(`E5 did not say what the table is off by. It said:\n${document.body.innerText}`);
    }
    return Number(line.replace(/[^\d]/g, ''));
  });

/**
 * Every figure on the page that is not fully visible.
 *
 * The same three questions `ui-audit` asks, asked here of real data. A name
 * may ellipsise; a NUMBER may not, because "−4,5…" is not a shorter way of
 * writing −4,543, it is a different amount.
 *
 * AND A FOURTH, which the other three could not see: a figure that WRAPPED.
 *
 * Nothing is clipped when a slot runs out of room and the text simply falls to
 * a second line — the box grows, `scrollWidth` never exceeds `clientWidth`, and
 * every check above passes. What the host gets is "$2,352,880 of" on one line
 * and "$2,352,880" under it, with the label beside them squeezed into a column
 * two characters wide. That is what Count up did on a 360-wide phone at a
 * seven-figure table, through a clean run of this file. See `docs/bugs.md`.
 *
 * A SLOT, NOT A SENTENCE, is the whole difficulty. Prose is allowed to wrap and
 * most of it mentions money — "$120 back to Andro, $50 to Lena · $11,950,180 to
 * the piggy bank" is a sentence and wrapping is what it is for. So a run of text
 * counts as a slot only when, with its figures taken out, there are twelve
 * characters or fewer left: "of", "in · out", "Rebuy". Anything wordier is prose
 * and is left alone.
 */
/**
 * THE PHONE'S TEXT SIZE, which is not the browser's and is not 100%.
 *
 * Every `Text` in react-native scales with the reader's system text setting
 * unless it is told not to, and this app tells it nothing anywhere: there is no
 * `allowFontScaling` and no `maxFontSizeMultiplier` in any of the thirty-seven
 * screens. Meanwhile every card, gap and padding is a fixed number of points off
 * a board. So the figures grow and the boxes do not.
 *
 * That is how "$28,500" came back off a real phone as "$28,5…" while this file
 * reported the same screen clean: the browser renders at 100%, the phone was on
 * one of the larger text settings, and the thresholds had been measured to the
 * point with no margin at all — nine points of slack on Tonight's card and six
 * on the player card's three figures. Anything above 100% spends both.
 *
 * So every screen is measured TWICE, at 100% and at STRAIN, and the second one
 * is the one that finds things. It is done at the measurement rather than by
 * replaying the whole night: the multiplier is applied to what is on screen,
 * the screen is measured, and it is put back — a few hundred milliseconds a
 * stop rather than another minute a scale.
 *
 * It multiplies FONT SIZE ONLY, which is what the phone does. Padding, gaps and
 * card widths stay where the board put them, because that is the whole problem.
 */
const STRAIN = Number(
  process.argv.find((a) => a.startsWith('--strain='))?.slice('--strain='.length) ?? 1.2,
);

/**
 * Multiply every font size on the page by `f`, remembering the original.
 *
 * A FIGURE THAT SAYS IT IS CAPPED IS CAPPED. `maxFontSizeMultiplier` is the prop
 * that stops a figure growing on a phone, and react-native-web drops it — it is
 * native-only — so nothing about it survives into the DOM on its own. The app
 * spreads `cappedFigure` from the tokens instead, which carries the prop AND a
 * `data-fontcap` beside it for exactly this: without it, this pass reports every
 * capped figure as broken at a size the device will never draw it at.
 */
const strain = (f) => `
(() => {
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (el.dataset.baseFont === undefined) {
      el.dataset.baseFont = parseFloat(cs.fontSize) || 0;
      el.dataset.baseLine = cs.lineHeight === 'normal' ? '' : parseFloat(cs.lineHeight) || '';
    }
    /* The cap is inherited: a figure's own span carries it, and so does the
       nested one inside it, which is a child of the element that declared it. */
    const capped = el.closest('[data-fontcap]');
    const factor = capped === null ? ${f} : Math.min(${f}, Number(capped.dataset.fontcap));
    const base = Number(el.dataset.baseFont);
    if (base > 0) el.style.fontSize = base * factor + 'px';
    if (el.dataset.baseLine !== '') el.style.lineHeight = Number(el.dataset.baseLine) * factor + 'px';
  }
})()
`;

/** Put the page back the way the stylesheet had it. */
const unstrain = `
(() => {
  for (const el of document.querySelectorAll('*')) {
    if (el.dataset.baseFont === undefined) continue;
    el.style.fontSize = '';
    el.style.lineHeight = '';
    delete el.dataset.baseFont;
    delete el.dataset.baseLine;
  }
})()
`;

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
  /* A figure carrying a symbol — "$8,500", "−12M", "+$1.5k". The symbol is what
     keeps a date ("Sun, 30 Aug") and a duration ("3 h 16") out of this. */
  const MONEY = /[-+\\u2212]?[^\\w\\s][0-9][0-9.,\\u00a0]*(k|M)?/g;
  const out = [];

  /*
   * How many lines a run of text actually occupied.
   *
   * Counted over a RANGE, not over the element's own box: a block element is
   * one rectangle however many lines are inside it, and the wrap that started
   * all this happens BETWEEN two text nodes — react-native-web renders a nested
   * <Text> as its own inline span, so "$2,352,880" and " of $2,352,880" are
   * separate nodes and neither of them wraps. The line boxes are what the two
   * of them share, and only a range over the parent's contents sees those.
   */
  const lines = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    /*
     * BY OVERLAP, NOT BY TOP. "$500" at 30 points and " of $13,280" at 17 sit
     * on one baseline and their rectangles start at different heights, so
     * counting distinct tops calls a line that is perfectly fine two lines.
     * Two runs are on the same line when their rectangles overlap vertically.
     */
    const rows = [];
    for (const r of range.getClientRects()) {
      if (r.width <= 0 || r.height <= 0) continue;
      const hit = rows.find((o) => r.top < o.bottom - 1 && o.top < r.bottom - 1);
      if (hit === undefined) rows.push({ top: r.top, bottom: r.bottom });
      else {
        hit.top = Math.min(hit.top, r.top);
        hit.bottom = Math.max(hit.bottom, r.bottom);
      }
    }
    return rows.length;
  };

  /* A row of cells is not a run of text: its children sit on their own lines by
     design and a range over it reports one per cell. Only a box whose children
     all flow inline is answering the question this asks. */
  const flows = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '') &&
    [...el.childNodes].every(
      (n) =>
        n.nodeType === 3 ||
        (n.nodeType === 1 && getComputedStyle(n).display.startsWith('inline')),
    );

  const wrapped = new Set();
  for (const el of document.querySelectorAll('div, span, p, h1, h2, h3, a, button')) {
    const text = el.textContent.replace(/\\s+/g, ' ').trim();
    if (text === '' || wrapped.has(text)) continue;
    MONEY.lastIndex = 0;
    if (!MONEY.test(text)) continue;
    MONEY.lastIndex = 0;
    if (text.replace(MONEY, '').replace(/\\s+/g, ' ').trim().length > 12) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0' || st.display === 'none') continue;
    if (!flows(el)) continue;
    const n = lines(el);
    if (n > 1) {
      wrapped.add(text);
      out.push({ check: 'wrapped', what: text, detail: n + ' lines' });
    }
  }

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
/** Which scale is being played, so a finding says which night produced it. */
let scale = '';

/** Measure wherever we are, report it, and keep the picture if asked. */
async function stop(name) {
  await page.waitForTimeout(500);
  const found = (await page.evaluate(CHECK)).map((f) => ({ ...f, at: '100%' }));
  seen.push(`${scale} · ${name}`);
  if (shots) {
    await page.screenshot({
      path: path.join(OUT, `${WIDTH}-${scale}-${name}`.replace(/\W+/g, '-') + '.png'),
    });
  }

  // And again with the reader's text turned up — see the note on `strain`.
  await page.evaluate(strain(STRAIN));
  await page.waitForTimeout(350);
  const strained = await page.evaluate(CHECK);
  if (shots && strained.length > 0) {
    await page.screenshot({
      path: path.join(OUT, `${WIDTH}-${scale}-${name}-large-text`.replace(/\W+/g, '-') + '.png'),
    });
  }
  await page.evaluate(unstrain);
  await page.waitForTimeout(150);

  /* Only what the strained pass found ON TOP of the plain one: a figure that is
     already cut off at 100% is one fault, not two, and reporting it twice buries
     the ones that only large text produces. */
  const plain = new Set(found.map((f) => f.check + ' ' + f.what));
  for (const f of strained) {
    if (!plain.has(f.check + ' ' + f.what)) {
      found.push({ ...f, at: `${Math.round(STRAIN * 100)}% text` });
    }
  }

  if (found.length === 0) {
    console.log(`  ${name.padEnd(26)} ok`);
    return;
  }
  failures += found.length;
  console.log(`  ${name.padEnd(26)} ${found.length} cut off`);
  for (const f of found) {
    console.log(`    ${f.check.padEnd(15)} ${f.what}  — ${f.detail}  · ${f.at}`);
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

/** Type digits on the keypad, which replaces whatever the preset held. */
const punch = async (digits) => {
  for (const d of digits) {
    await page.getByText(d, { exact: true }).last().click({ timeout: 10_000 });
    await page.waitForTimeout(60);
  }
};

/** The largest figure the night is currently showing, for the run's log line. */
const biggest = async () =>
  page.evaluate(() =>
    Math.max(
      0,
      ...document.body.innerText
        .split(/\s+/)
        .map((w) => Number((w.match(/[\d,]{2,}/)?.[0] ?? '').replace(/,/g, '')))
        .filter((n) => Number.isFinite(n)),
    ),
  );

/** Play one whole night at one scale, measuring at every stop. */
async function playANight(name, rebuys) {
  scale = name;
  console.log(`\n${name} · rebuys of ${rebuys.map(([, d]) => '$' + Number(d).toLocaleString('en-US')).join(', ')}`);

  // A fresh page each time: the browser build keeps its database in memory, so
  // a reload is what puts the seeded night back and lets the second scale be
  // played from the same start as the first.
  //
  // IN AT THE CLUB, THEN ACROSS TO TONIGHT WITHOUT A RELOAD.
  //
  // The screens at the end of this run — My stats, Sessions — are reached the
  // way a person reaches them, by backing out of the night to the club. That
  // needs the club UNDER the night in history, and a run that lands on
  // /session directly has nothing under it: `goBack` walks off the app, and
  // those two screens went unmeasured for exactly that reason.
  //
  // A second `goto` would put it there and cost the night: every load starts
  // the in-memory database from the seed again. So the club is loaded, and the
  // move to Tonight is a history entry the app picks up as a route change —
  // which is what a `router.push` is on the web, without the document reload.
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    history.pushState({}, '', '/session');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(1600);

  // ---- the night, played ----------------------------------------------------
  for (const [who, digits] of rebuys) {
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

  /*
   * AND THE CARD OF SOMEBODY WHO HAS ALREADY GONE, which is a different card.
   *
   * Petr is seated, so his card carries TWO figures and an em dash: what he is
   * in for, and nothing counted yet. Dana cashed out during play, so hers
   * carries THREE — in for, counted, and the night's result beside them — and
   * three figures in a card drawn for that width is the tightest money on the
   * phone. It had never been measured: every run opened a seated player.
   *
   * It is the card a host looks at most, too. Everybody's ends up in this state
   * by the end of the night.
   */
  await tap('Dana', { last: true });
  await stop('player card · cashed out');
  await page.getByLabel('Close').last().click();
  await page.waitForTimeout(900);

  // ---- counting up ----------------------------------------------------------
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
  const { players } = await readStacks(page);
  /* A hundred each to begin with, everybody, which is deliberately wrong: it
     leaves the table short by exactly what the winner is owed, and the app is
     the thing that knows that figure to the unit. */
  const RUNNER_UP = 100;
  for (const who of players) {
    await tap(who.name, { last: true });
    await punch(String(RUNNER_UP));
    await tap(/^Save .*count$/, { last: true, wait: 900 });
  }
  await stop('count up');

  /* Every stack counted and the money still not adding up goes straight to E5
     rather than to the deductions — count-up.tsx says so — which is how a host
     who has miscounted actually gets here. */
  await tap('Apply the money rules', { wait: 1200 });
  await stop('it doesn’t add up');
  const off = await readShortfall(page);
  await tap('Fix', { wait: 1400 });

  /* The rest of the table goes to whoever is first on the list. Their buy-in
     was the smallest of the night, so their win is the largest figure it can
     produce — which is the one worth measuring. */
  await tap(players[0].name, { last: true });
  await punch(String(RUNNER_UP + off));
  await tap(/^Save .*count$/, { last: true, wait: 900 });
  await stop('count up · balanced');

  await tap('See where everyone stands');
  await stop('where everyone stands');
  // Back the way a person goes, for the same reason as above.
  await page.getByLabel(/^Back to/).last().click();
  await page.waitForTimeout(1000);

  await tap('Apply the money rules');
  await stop('deductions');

  /*
   * ONE SHARE, SET BY HAND — the only way to reach /share with a night on it.
   *
   * The sheet takes a rule and a person as arguments, so the route pass in
   * `ui-audit.mjs` opens it with the seeded night's own (see PARAMS there) and
   * gets figures in the hundreds. This is the other half: the biggest winner of
   * a night in the millions, whose share of the bill is the widest figure the
   * chip row will ever hold. Tapping a charge is how a host gets here — E3's
   * "Tap any figure above to change it."
   */
  /* The charge ROW, not the name: the same name is printed in the preview grid
     below, where only the money cells are pressable and the last match is a row
     that does nothing. */
  await page
    .locator('[role="button"]:visible')
    .filter({ hasText: players[0].name })
    .first()
    .click({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await stop('a share, by hand');
  await page.getByLabel('Close').last().click();
  await page.waitForTimeout(900);

  await tap('See who pays whom');
  await stop('settle up');

  const largest = await biggest();

  await tap('Close the session', { wait: 1600 });
  await stop('night settled');

  await tap('Who has paid');
  await stop('who has paid');

  await tap('Mark paid', { wait: 900 });
  await stop('who has paid · one in');

  await tap('Nudge the table');
  await stop('nudge the table');

  /*
   * AND THEN THE HISTORY SCREENS, which is where the night ends up living.
   *
   * Tonight is a screen a host looks at for one evening. My stats and Sessions
   * are the ones the same figures sit on for good, and both draw a 40-point
   * headline — the widest type in the app — off a total that grows with every
   * night played. They were outside this check entirely: `ui-audit.mjs` opens
   * them cold against the seeded book, where the totals are small.
   *
   * Back through history rather than `goto`: the browser build keeps its
   * database in memory and a reload would drop the night just settled, which
   * is the whole reason there is anything on these screens to measure.
   */
  for (let i = 0; i < 24 && new URL(page.url()).pathname !== '/'; i++) {
    await page.goBack();
    await page.waitForTimeout(600);
  }
  if (new URL(page.url()).pathname === '/') {
    await tap('My stats');
    await stop('my stats');
    await tap('See all');
    await stop('sessions');
  } else {
    console.log(`  ${'the club'.padEnd(26)} not reached — history ended at ${page.url()}`);
  }

  /* What the stacks had to add up to: a hundred each, plus what E5 said the
     table was short by. The app's figure, not one worked out here. */
  const target = RUNNER_UP * players.length + off;
  console.log(
    `  ${'—'.repeat(26)} on the table $${target.toLocaleString('en-US')}, ` +
      `biggest figure drawn $${largest.toLocaleString('en-US')}`,
  );
  return { target, largest };
}

console.log(`a big night, screen by screen · ${light ? 'light' : 'dark'} · ${WIDTH} × ${HEIGHT}`);

const played = [];
for (const name of SCALE_NAMES) {
  played.push([name, await playANight(name, SCALES[name])]);
}

console.log('\n' + '─'.repeat(64));
console.log(
  failures === 0
    ? `every figure fits · ${seen.length} screens across ${played.length} nights`
    : `${failures} figures cut off across ${seen.length} screens`,
);
for (const [name, { target, largest }] of played) {
  console.log(
    `  ${name.padEnd(10)} $${target.toLocaleString('en-US')} on the table · ` +
      `widest figure $${largest.toLocaleString('en-US')}`,
  );
}
console.log('the nights are the app’s own: three big rebuys, counted and settled through the engine.');
await browser.close();
process.exit(failures === 0 ? 0 : 1);
