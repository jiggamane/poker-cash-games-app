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
import { launchOptions } from './chromium.mjs';

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
    const players = [];
    for (let i = 0; i < lines.length; i++) {
      /*
       * THE ROW THAT IS STILL ASKING — an em dash with a buy-in on the line
       * before it, which is the shape of an active row under *Still to count*:
       * name, `in $1,500`, then the em dash and the pencil at the right edge.
       * The name is two lines back.
       *
       * THIS MARKER HAS NOW MOVED TWICE and both times it failed the same way,
       * so read this before changing the screen. It looked for `in $500` until
       * 30 August, when the rebuilt block gave counted rows a figure too and
       * the pattern started matching everybody. It looked for `not counted yet`
       * until 3 September, when the mixed player list rule took that phrase off
       * the row — the treatment says it now — and the pattern matched NOBODY.
       * Either way this returns a list the loop below walks in nought steps,
       * and the run then sits on a blocked Next until Playwright times out: a
       * timeout on `tap('Next')` is what this looks like from the outside, not
       * a message about the marker.
       *
       * So match on the AFFORDANCE, not on any copy: the em dash and the pencil
       * are what "this one is left" has always drawn, on every revision of the
       * screen, and they are what the group label promises.
       */
      if (lines[i] !== '\u2014' || !/^in /.test(lines[i - 1] ?? '')) continue;
      players.push({ name: lines[i - 2] });
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

  /*
   * A LINE THAT IS MOSTLY WORDS BUT CARRIES MONEY — B37, and the hole B38 fell
   * through.
   *
   * The two passes either side of this one each looked at it and decided it was
   * the other's business. The wrapped pass above skips anything with more than
   * twelve characters of non-money text, because that is prose and prose is
   * allowed to wrap. The clipped pass below only measures elements whose own
   * text is a bare FIGURE — its pattern allows three non-digit characters
   * either side, which is a currency symbol, not a sentence.
   *
   * So "$2,120 cashed out · $2,390 counted" was prose to the first and not a
   * figure to the second, and it sat ellipsised on the flagship screen of the
   * last rebuild, at the app's own design width, in ordinary dollars, under a
   * green gate. Every figure in this app is drawn beside a word somewhere.
   *
   * WHAT IT ASKS is narrow on purpose: only whether a line that HAS money in it
   * fits the box it is in. A name may still ellipsise — names are not money —
   * and a paragraph may still wrap, because this measures width against
   * clientWidth, which a wrapped paragraph does not overflow.
   */
  for (const el of document.querySelectorAll('div, span, p, h1, h2, h3, a, button')) {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (own === '') continue;
    /*
     * STRICTER THAN THE MONEY PATTERN, and it has to be. That one takes any
     * non-word mark before a digit as a currency sign, which is right where the
     * wrapped pass uses it — twelve characters of prose is all it allows.
     * Turned loose on a whole sentence it reads the separators as money:
     * "06:46 → 10:03 · 3h 17m · 6 players" matched on ":4" and on "· 6", and a
     * check that reports a meta line as clipped money is a check nobody reads.
     *
     * So a figure here is a digit behind a mark that is NOT a separator, or a
     * number grouped in thousands. That second branch is what keeps a book kept
     * in CHF — where the symbol is letters and the first branch cannot fire.
     */
    if (!/[-+\\u2212]?[^\\w\\s·:\\u2192][0-9]|[0-9]{1,3}(?:,[0-9]{3})+/.test(own)) continue;
    /* A bare figure is the next pass's, which says more about where it sits. */
    if (FIGURE.test(own)) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0' || st.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      out.push({
        check: 'clipped',
        what: own,
        detail: px(el.scrollWidth) + ' in ' + px(el.clientWidth),
      });
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
  /*
   * THE HEAD AND THE BODY MUST NOT TOUCH.
   *
   * Screen lays 6 under the title row and the meta line adds 2 above itself,
   * and neither of them leaves anything underneath. So the gap between the
   * pinned head and the first thing in the body is whatever that first element
   * asks for — and an element that asks for nothing lands flush against the
   * meta line. Screen.tsx already carries a comment about this happening once
   * to the TITLE, which is what titlePadBottom was added to stop; the floor it
   * lays does not reach the line under it, so the same fault came back one
   * element lower. B58 is that, on the two game-end screens.
   *
   * WHY IT IS HERE AND NOT IN THE AUDIT. /settled and /payments render their
   * empty states cold — no card, no head worth measuring — so the pass that
   * walks routes cannot see the screens this fires on. Only a night played
   * through reaches them, which is this file's whole reason for existing.
   *
   * Only when the head is PINNED and the body is at rest: a screen on
   * headScroll puts its head inside the scroller, where the two are siblings
   * that scroll together and the distance means nothing, and a scrolled body
   * runs under the head by design.
   *
   * (No backticks anywhere in here. This block lives inside a template literal
   * and one of them ends it — which is how it was written the first time.)
   */
  (() => {
    /*
     * THE VISIBLE HEAD, NOT THE FIRST ONE IN THE DOM. A push keeps the screen
     * underneath mounted, so /payments has two elements carrying the meta id —
     * its own and the settled night's behind it — and getElementById answers
     * with whichever is first in the document. That one measures 0 × 0, which
     * put the head's bottom at 0, the gap at 85, and reported the screen clean
     * while the card sat flush against its meta line. The check was written
     * that way and passed /payments for exactly one run.
     */
    const onScreen = (el) => {
      if (el === null) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const pick = (id) =>
      [...document.querySelectorAll('[id="' + id + '"]')].filter(onScreen).pop() ?? null;

    const head = pick('screen-meta') ?? pick('screen-title');
    if (head === null) return;

    /* The scroller on the SAME screen as that head — walking out from the head
       rather than scanning the document, for the same reason. */
    let scroller = null;
    for (let root = head.parentElement; root !== null && scroller === null; root = root.parentElement) {
      scroller =
        [...root.querySelectorAll('div')].find(
          (n) =>
            /(auto|scroll)/.test(getComputedStyle(n).overflowY) &&
            n.clientHeight > 200 &&
            !n.contains(head),
        ) ?? null;
    }
    if (scroller === null || scroller.scrollTop > 1) return;

    const content = scroller.firstElementChild ?? scroller;
    const first = [...content.children].find((el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (first === undefined) return;

    /* 6 is a floor, not a measurement: it is below every gap any board draws —
       the smallest is the totals card's 16 — and above the 0 a missing margin
       produces. A screen that wants to sit closer than this to its own meta
       line is stating something, and it can state it here. */
    const gap = first.getBoundingClientRect().top - head.getBoundingClientRect().bottom;
    if (gap < 6) {
      out.push({
        check: 'touches-the-head',
        what: (first.textContent || '').trim().slice(0, 40) || first.tagName.toLowerCase(),
        detail: px(gap) + ' under the meta line',
      });
    }
  })();

  return out;
})()
`;

const browser = await chromium.launch(launchOptions());
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

/**
 * Something that has to be TRUE on the screen we are standing on.
 *
 * `stop()` measures; this asserts. Both count into the same `failures`, so a
 * behaviour that has quietly stopped working takes the gate red exactly as a
 * cut-off figure does — which is the only reason a behaviour belongs in a
 * check named after layout: these screens are the ones no URL reaches, so this
 * is the only tool that can stand on them at all.
 */
async function holds(what, ok, detail) {
  if (ok) {
    console.log(`  ${what.padEnd(26)} ok`);
    return;
  }
  failures += 1;
  console.log(`  ${what.padEnd(26)} FAILED — ${detail}`);
}

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

    /*
     * AND THE TABLE SAYS SO — B44.
     *
     * A rebuy typed on the amount sheet is confirmed exactly as one tapped on
     * the player card is: the bar above the dock names the person and the
     * figure and holds Undo for two seconds (`RebuyConfirmation.tsx`). It did
     * not — this route wrote the entry and said nothing — and no check could
     * see that, because `ui-audit.mjs` opens `/session` at a URL where nothing
     * has just been rebought and this file logged its rebuys and moved on.
     * `docs/screens.md` names this leg as the one the confirmation wanted.
     *
     * Read at 1200ms after the tap: the sheet is gone by 300 and the bar holds
     * until 2300. The sentence is the handoff's, and the figure is matched
     * loosely because it abbreviates at ten thousand — `$1.2M` at the millions
     * scale — which is the bar's own rule and not this check's business.
     */
    await holds(
      'the rebuy is confirmed',
      (await page.getByText(new RegExp(`^Rebuy .+ added to ${who}$`)).count()) > 0 &&
        (await page.getByText('Undo', { exact: true }).count()) > 0,
      `no bar naming ${who} on Tonight after a rebuy logged on the amount sheet`,
    );
  }
  /* Let the last bar run out before the screen is measured: the stop below is
     the table at rest, and the bar is 2300 + 160 from a tap 1200 ago. */
  await page.waitForTimeout(1500);
  await stop('tonight');

  /*
   * MOST MONEY IN FIRST, and it has to be a check because it has now been
   * decided both ways.
   *
   * The screen sorted the table by buy-in, was changed to seat order on
   * 1 September to obey `05-active-vs-settled.md`, and was changed back on the
   * owner's instruction on 3 September. An ordering is exactly the kind of
   * thing a merge decides by coin toss — nothing breaks, no test goes red, and
   * the list is quietly back in the other order on the phone. So the order is
   * asserted here, where a night with three rebuys in it has just been played
   * and the top of the list is a figure no seed produces.
   *
   * It reads the RENDERED column rather than the store, so it is the same
   * evidence a host has: run a finger down the right edge and the figures never
   * go up. Compacted figures — $1.2M at the millions scale — are read back
   * through their suffix, and two that compact to the same string are equal,
   * which a non-increasing test allows.
   */
  await holds(
    'the table is ordered by what people are in for',
    await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map((l) => l.trim());
      const from = lines.findIndex((l) => /^still playing · /i.test(l));
      const to = lines.findIndex((l) => /^cashed out · /i.test(l));
      if (from === -1 || to <= from) return false;
      const figures = lines
        .slice(from + 1, to)
        .map((l) => /^\D*([\d,.]+)\s*([KkMm])?$/.exec(l))
        .filter((m) => m !== null)
        .map((m) => {
          const n = Number(m[1].replace(/,/g, ''));
          return n * (m[2] === undefined ? 1 : /[Kk]/.test(m[2]) ? 1e3 : 1e6);
        })
        .filter((n) => Number.isFinite(n));
      if (figures.length < 2) return false;
      return figures.every((n, i) => i === 0 || figures[i - 1] >= n);
    }),
    'Tonight lists a bigger buy-in below a smaller one',
  );

  await tap('Petr');
  await stop('player card');

  /*
   * THE CORRECTION SHEET, WITH THE NIGHT'S LARGEST ENTRY IN IT — B20.
   *
   * Nothing had ever pressed a key on /entry. The route pass reaches it, but
   * only its first step: the amount step is behind a tap, so the big figure and
   * the chip row it now draws were never measured, and the chip is the exact
   * object B3 and B14 were about. Petr's newest rebuy is the biggest entry the
   * night has — $1.2m at the millions scale, $99m at the ceiling — so the chip
   * that offers it back is as wide as this screen can ever ask for.
   *
   * The two closes are the flow's own shape: the first goes back a step to the
   * menu, the second leaves the sheet. If either stops working this stop fails
   * on the tap after it rather than passing quietly.
   */
  await tap('Rebuy', { last: true });
  await stop('correct an entry');
  await tap('Change the amount');
  await stop('correct an entry · the amount');
  await page.getByLabel('Close').last().click();
  await page.waitForTimeout(600);
  await stop('correct an entry · back a step');
  await page.getByLabel('Close').last().click();
  await page.waitForTimeout(700);

  /*
   * AND THE SAME CARD THE MOMENT HE IS COUNTED OUT, which is the widest the
   * three-up row can be asked to get on a night this size.
   *
   * Dana's card below is the three-up state at the SEED's figures. This is the
   * same state at the night's own: he is in for whatever this scale rebought,
   * and counting out at $100 — a stack he has lost, which is legal at every
   * scale because it is never more than the table holds — makes the result the
   * whole of what he came in with. That is the widest of the three figures and
   * the one T4 puts last, so the row is as wide as this night can draw it.
   * Nothing else in the app puts three figures at 28/800 in one row, and until
   * B19 the row was spaced so that all the slack went to one gap.
   *
   * Cashing him out here also takes him off the count-up list, which is correct
   * and is what that screen is for: a stack counted during play is never
   * counted again.
   */
  await tap('Cash out');
  await punch('100');
  await tap(/^Cash .* out$/, { last: true, wait: 1400 });
  await stop('player card · counted out');
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
  /* SAY SO HERE RATHER THAN TIMING OUT ON `Next` TWENTY LINES DOWN. Twice now
     the marker above has stopped matching and the run's only symptom was a
     30-second Playwright timeout naming a button. This night always has stacks
     left to count at this point: nobody has been counted yet. */
  if (players.length === 0) {
    throw new Error(
      'readStacks found nobody still to count on /count-up — the marker it ' +
        'matches on has moved again. See the note above readStacks.',
    );
  }
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
  await tap('Next', { wait: 1200 });
  await stop('it doesn’t add up');
  const off = await readShortfall(page);

  /*
   * AND THE SENTENCE NAMES THE SAME GAP THE TAG DOES — B40.
   *
   * The block states the difference twice on purpose: a tag, so a host knows
   * there is a problem, and a sentence naming both figures, so they know which
   * money to go looking for. That only works if the two agree. They did not:
   * the sentence paired everything bought in against the final counts alone,
   * leaving whatever was cashed out during play on neither side, so on this
   * night it described a hole the size of Dana's stack under a tag reading $20.
   *
   * Nothing else in the repo can see this. `settlement.test.ts` asserts the
   * difference off the engine, which was always right; the fault was entirely
   * in which two of the engine's figures the screen chose to print.
   */
  await holds(
    'and the sentence names the same gap the tag does',
    await page.evaluate((tag) => {
      const line = document.body.innerText
        .split('\n')
        .map((l) => l.trim())
        .find((l) => / went in, .* accounted for\./.test(l));
      if (line === undefined) return false;
      const figures = [...line.matchAll(/[\d,]{2,}/g)].map((m) => Number(m[0].replace(/,/g, '')));
      if (figures.length !== 2) return false;
      return Math.abs(figures[0] - figures[1]) === tag;
    }, off),
    'E5 states a gap in words that is not the gap in its own tag',
  );

  await tap('Fix', { wait: 1400 });

  /* The rest of the table goes to whoever is first on the list. Their buy-in
     was the smallest of the night, so their win is the largest figure it can
     produce — which is the one worth measuring. */
  await tap(players[0].name, { last: true });
  await punch(String(RUNNER_UP + off));
  await tap(/^Save .*count$/, { last: true, wait: 900 });
  await stop('count up · balanced');

  /*
   * AND THE COMPARISON FOLDS ITSELF AWAY — `CountUpEnd.dc.html`, cut
   * 6 September: 1,100ms after the sums agree, the card keeps one line.
   *
   * WORTH A CHECK BECAUSE BOTH FAILURES ARE SILENT. A collapse that never fires
   * leaves 90 points of arithmetic over the list for the rest of the night and
   * looks exactly like the screen always did; one that cannot be reopened takes
   * the balance check away for good and looks like a tidy screen. So: wait past
   * the timer, assert the sums have gone, tap the line, assert they are back.
   */
  await page.waitForTimeout(1500);
  await holds(
    'the balance comparison folds away once the night adds up',
    (await page.locator(':text-is("Balanced"):visible').count()) === 1 &&
      (await page.locator(':text-matches("^Accounted for"):visible').count()) === 0,
    'the balance card did not fold after the last stack went in',
  );
  await tap('Balanced');
  await holds(
    'and tapping the line brings it back',
    (await page.locator(':text-matches("^Accounted for"):visible').count()) === 1,
    'the folded balance card does not reopen',
  );
  await stop('count up · folded');
  /*
   * AND IT STAYS OPEN FROM HERE, which is the screen behaving. A hand on the
   * line takes the timer out of it — re-arming would fold the card back up
   * under a reader who had just opened it — so there is no `Balanced` left to
   * tap, and the rest of this night is played with the comparison showing.
   */

  /*
   * THE ROUNDING STEP, SET WHERE THE STACKS ARE ENTERED —
   * `design/handoff-E2/docs/E2-rounding.md`, cut 31 August.
   *
   * E2 owns the setting, and this is the only check in the repo that can reach
   * it with real stacks behind it: the route pass opens /rounding cold, where
   * nothing has been counted and every sub-line reads "No stacks counted yet",
   * so the figure the sheet exists to show — the worst single distortion — is
   * never computed there. Here there is a counted night in the millions.
   *
   * IT IS LEFT ON for the rest of the run on purpose. Everything after this
   * point — the deductions, the transfers, the receipts, who has paid — is
   * then measured on a night that actually rounded, which is the only way to
   * find out whether a rounded figure fits where an unrounded one did.
   */
  await holds(
    'the step is on the count screen',
    (await page.locator('[aria-label^="Rounding · off"]:visible').count()) === 1,
    'E2 does not carry the rounding row, which it owns',
  );

  await page.locator('[aria-label^="Rounding · "]:visible').first().click({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await stop('rounding');
  await holds(
    'and the sheet says what each step would cost',
    (await page.getByText(/^No net moves by more than /).count()) > 0,
    'the rounding sheet offers steps without saying what they would do',
  );

  await tap('Nearest $50');
  await tap('Apply', { wait: 1200 });
  await holds(
    'and the row says what the night is set to',
    (await page.locator('[aria-label^="Rounding · nearest $50"]:visible').count()) === 1,
    'the step was applied and the row on E2 did not follow it',
  );

  /*
   * AND SAYS IT IN FULL, which nothing else here can see.
   *
   * `Rounding · nearest $50` reads as prose to the cut-off pass — take the
   * figure out and nineteen characters are left, well past the twelve that
   * makes a run of text a slot — so an ellipsis in the middle of it passes
   * every check in this file. It happened: at 360 the two halves of the row are
   * about five points too long together, and the label was the half giving way,
   * leaving `Rounding · neares…` beside a value that only restated it.
   */
  await holds(
    'and says it in full at 360',
    await page.locator('#rounding-label:visible').first().evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1,
    ),
    'the rounding row truncates its own label',
  );
  await stop('count up · rounded');

  await tap('Next');
  await stop('deductions');

  /*
   * E3'S PREVIEW IS ROWS, NOT A TABLE — 4 September, and it is the same change
   * the settled night made on the 2nd, one screen earlier in the flow.
   *
   * It used to be five columns under heads reading `GROSS BILL PIGGY NET`, each
   * cell a figure the rule block above it had already printed in full. What the
   * grid alone could say is the transpose — one person, every rule — and the
   * formula line says that in words: `game +$1,620 · food −$54 · piggy −$23`.
   *
   * ONLY THIS FILE CAN SEE IT. `/deductions` opened bare is E3's *Not yet*
   * state, which has no preview on it at all, so the route pass measures a
   * screen where neither the heads nor the lines exist. Both halves are
   * asserted: the heads are gone AND the lines are there, because a preview
   * that had quietly stopped rendering would pass the first on its own.
   *
   * VISIBLE ONLY — expo-router keeps the stack mounted, and the screens
   * underneath this one have their own labels.
   */
  await holds(
    'the preview is rows, not a table',
    (await page.locator(':text-matches("^(GROSS|BILL|PIGGY|NET)$"):visible').count()) === 0,
    'E3 draws column heads again — the preview has gone back to being a table',
  );
  /* READ AS TEXT, NOT AS A SELECTOR, and that is not a style choice: Playwright
     does not unescape `\uXXXX` inside `:text-matches`, so a pattern written that
     way compiles to something that matches nothing and the check passes for the
     wrong reason. The terms are joined by a non-breaking space, which `\s`
     covers, and the sign is a U+2212 minus rather than a hyphen. */
  await holds(
    'and every row says its working',
    await page.evaluate(() => /game\s[+\u2212]/.test(document.body.innerText)),
    'no formula line under any name on E3 — the preview says nothing about the rules',
  );

  /*
   * THE PEOPLE HEAD THE SCREEN, THE RULES ARE UNDER THEM — 6 September, and
   * the arrangement is the whole of the change: the preview was the last block
   * on E3 and above every rule sat a card totalling what leaves the table.
   *
   * MEASURED, NOT MATCHED. Order is the thing being asserted, so a text check
   * cannot see it — a screen that drew the same strings in the old order would
   * pass every other line in this file. The three fixed points are the first
   * preview row, the rounding step under it, and the bill at the foot; the
   * rule blocks sit between the last two, so pinning these three pins the lot.
   */
  /* VISIBLE ONLY, and here it is load-bearing rather than tidy: expo-router
     keeps the whole stack mounted, and Count up underneath draws a rounding row
     of its own with the same `#rounding-label` on it. An unscoped read would
     measure that one — a screen away, above everything — and report an order
     nobody is looking at. */
  const topOf = async (selector) => {
    const loc = page.locator(selector).first();
    if ((await loc.count()) === 0) return null;
    const box = await loc.boundingBox();
    return box === null ? null : Math.round(box.y);
  };
  const order = {
    person: await topOf('[data-testid="e3-preview-row"]:visible'),
    step: await topOf('#rounding-label:visible'),
    bill: await topOf(':text-is("The bill"):visible'),
  };
  await holds(
    'the people head the screen',
    order.person !== null &&
      order.step !== null &&
      order.bill !== null &&
      order.person < order.step &&
      order.step < order.bill,
    `E3 is in the wrong order — preview ${order.person}, step ${order.step}, bill ${order.bill}`,
  );

  /*
   * AND NO TOTAL HEADS IT. `LEAVES THE TABLE` over `$296` was the first thing
   * on this screen and is the one figure on it that nobody is owed: it is in no
   * transfer, on no receipt and on no later screen. The handoff bans the phrase
   * from the rest of the flow and E3's header card was the last place saying
   * it, which is why the settled-night leg above could not assert the copy rule
   * — it can now, from here, where the screen is actually on top.
   */
  await holds(
    'and no total heads it',
    (await page.locator(':text-matches("leaves the table", "i"):visible').count()) === 0,
    'E3 totals the rules again — the header card is back',
  );

  /*
   * AND EVERY RULE ON IT IS A DOOR TO THE RULE ITSELF. A charge row opens one
   * person's share; the head of a block opens the rule — the percentage, the
   * split, who it charges — which before this was reachable only by way of the
   * whole list at the foot of the screen. The step under the people is the same
   * row E2 and E4 draw, opening the same sheet.
   */
  await holds(
    'and the rules can be changed from here',
    (await page.locator('[aria-label$="change the rule"]:visible').count()) > 0 &&
      (await page.locator('[aria-label^="Rounding · "]:visible').count()) === 1,
    'E3 draws a rule with no way into it, or no rounding row',
  );

  /*
   * A SPEND ADDED AFTER THE COUNT, from the screen the room is standing on.
   *
   * `11-bill-and-piggy-bank.md`, "After the count": *"A spend added during
   * settle-up is allowed and recalculates every winner's share and every
   * transfer."* The engine always allowed it. Until 30 August no screen in the
   * ending flow could reach it — the bill hung off the table's own drawer — so
   * a bar tab arriving at 1am meant leaving the flow, going back to the table,
   * opening the drawer and the bill, adding it, and walking forward through the
   * count a second time.
   *
   * Only this file can check it. The route pass opens /spend bare, with nothing
   * behind it and no way in; this is the path a host actually takes, with a
   * real night's figures on the screen it returns to.
   *
   * THE KEYPAD IS ASSERTED FIRST because the sheet used to draw one only when
   * adding, and the state this journey reaches next — the same sheet reopened
   * on a logged spend — had a figure on it and nothing to change it with. B24.
   */
  await tap('Add a spend', { wait: 900 });
  await stop('a spend, after the count');
  await holds(
    'the spend keypad',
    (await page.getByLabel('Delete').count()) > 0,
    'no keypad on the spend sheet — the amount cannot be typed',
  );
  await page.getByPlaceholder('What it was').fill('Late pizza');
  await punch('60');
  /*
   * The person who paid it, which is half of what a spend is — and since
   * 6 September it is a step of its own rather than a row of chips under the
   * figure. B45: the chips were what pushed the pad 343 points below the
   * amount it types. The row states who before it is opened, so this walks it
   * the way a host does — open, name them, come back — and measures the step
   * on the way through.
   */
  await tap('Nobody yet', { last: true });
  await stop('a spend · covered by');
  await tap(players[0].name, { last: true });
  await tap('Done', { last: true });
  await tap(/^Add .* to the bill$/, { last: true, wait: 1400 });
  await stop('deductions · a spend added after the count');
  await holds(
    'the spend reaches the bill',
    (await page.evaluate(() => document.body.innerText)).includes('Late pizza'),
    'a spend added from Deductions is not on the bill it was added to',
  );

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
  /* The charge ROW, and `.first()` is what makes it that: the same name is
     printed again in the preview at the foot of the screen, on a row that opens
     nothing, and a last-match would land there. */
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

  /*
   * E4 SAYS WHERE THE FLOAT WENT, IN WORDS — frame `4a`'s own sentence, and the
   * reader's only clue that part of what they are about to hand over is the
   * group's money rather than somebody's winnings.
   *
   * TWO WAYS IT HAS ALREADY GONE WRONG. It read "The kitty is set aside for the
   * group", which is the STORED value of the destination and a word no reader is
   * ever meant to see; and it was driven off the collectors who are NOT at the
   * table, so a night where a player holds the piggy bank said nothing about it
   * at all. Both are B35. The sentence is asserted rather than the mechanism
   * because the sentence is what a room reads.
   */
  /* VISIBLE ONLY, and this is the fault the first run of it found: expo-router
     keeps the whole stack mounted, so an unscoped count reads the screen
     UNDERNEATH — at the time, E3's preview grid, whose piggy-bank column head
     said `KITTY` until 1 September. That grid is rows now and heads nothing,
     but the mechanism is unchanged and so is the scoping: `:text()` matches the
     smallest element holding the string, and `:visible` drops everything the
     pushed screen is covering. */
  await holds(
    'settle up says the piggy bank is set aside',
    (await page.locator(':text("is set aside for the group"):visible').count()) === 1 &&
      (await page.locator(':text-matches("\\bkitty\\b", "i"):visible').count()) === 0,
    'E4 does not name the piggy bank, or calls it the kitty',
  );

  const largest = await biggest();

  await tap('Close the session', { wait: 1600 });
  await stop('night settled');

  /*
   * ONE RANKED LIST BEHIND A TOGGLE — `1a · Settled night`, from
   * `design/handoff-game-end/`, cut 6 September.
   *
   * ⚠ THIS LEG ASKED FOR R1'S THREE BLOCKS UNTIL TODAY, and before that for
   * `design/handoff-four-screens/`'s rule that deductions are never folded into
   * a player's balance. Each change is the pass following a decision rather
   * than being weakened. R1 folded the deductions back in and printed the
   * working under the name; this cut keeps the fold and makes the two figures
   * ONE list a person switches between, so the ranking itself says what the
   * deductions did.
   *
   * WHAT IS HELD IS THE SWITCH, not the presence of two headings at once. Both
   * modes are always on screen as the toggle's two halves — the thing that can
   * break is the list under them not following, which is why the qualifier is
   * asserted in both positions rather than once.
   *
   * INVISIBLE TO EVERY OTHER CHECK IN THE REPO: no URL reaches a settled night
   * with money on it, so the route pass measures the seeded mid-count book and
   * sees none of this.
   */
  /* VISIBLE ONLY, for the reason the legs above give: expo-router keeps the
     whole stack mounted, so an unscoped count reads the screens UNDERNEATH —
     E3's own title is the word `Deductions`, one push down. */
  const onScreen = (text) => page.locator(`:text-is("${text}"):visible`).count();

  await holds(
    'the settled night opens on Final, with the deductions above the list',
    (await onScreen('At the table')) >= 1 &&
      (await onScreen('Final')) >= 1 &&
      (await onScreen('Deductions')) === 1 &&
      (await onScreen('after deductions and compensations')) === 1 &&
      (await onScreen('before deductions')) === 0,
    'the settled night does not open on Final with its own qualifier under it',
  );

  /*
   * AND THE LIST FOLLOWS THE TOGGLE, WHICH IS THE WHOLE OF THE INTERACTION.
   *
   * A toggle whose halves both draw the same list is the one failure this
   * screen can have that looks completely normal — the figures are all real,
   * they are simply the wrong mode's. So the qualifier is read on both sides of
   * the tap, and the nets are summed on the side where the answer is known.
   */
  await tap('At the table');
  await page.waitForTimeout(600);
  await holds(
    'and the toggle actually swaps the list under it',
    (await onScreen('before deductions')) === 1 &&
      (await onScreen('after deductions and compensations')) === 0,
    'tapping At the table left the Final list on screen',
  );

  /*
   * AND THE ONE SUM THE SCREEN EXISTS TO LET A ROOM MAKE.
   *
   * Money is neither made nor destroyed at a poker table, and At the table is
   * the mode with no deductions in it, so the column says so on its face:
   * `Σ atTheTable = 0`, which is the cut's own first check of its worked night.
   * `settled.test.ts` asserts it of the engine; this asserts it of what is
   * actually on the phone, which is where a row can be dropped, drawn in the
   * wrong sign, or ranked off a figure it is not showing.
   */
  const results = await page.evaluate(() => {
    const money = (s) => {
      const t = (s || '').trim().replace(/[,$]/g, '').replace(/\u2212/g, '-');
      if (/[KMB]$/i.test(t)) return null; // an abbreviated figure cannot be summed
      const n = Number(t.replace(/^[+]/, '').replace(/^[^0-9+-]+/, ''));
      return Number.isFinite(n) ? n : null;
    };
    return [...document.querySelectorAll('[data-testid="settled-net"]')].map((el) =>
      money(el.textContent),
    );
  });

  await holds(
    'and the table results add up to nothing, as a balanced night must',
    results.length > 0 &&
      (results.some((r) => r === null) || results.reduce((a, b) => a + b, 0) === 0),
    `the At the table column sums to ${results.reduce((a, b) => a + (b ?? 0), 0)}, not zero`,
  );

  /*
   * AND `in` AND `out` STAY ON ONE LINE WHILE THE ROW HAS ROOM FOR THEM — B59.
   *
   * Two terms fit any phone in the matrix: `in 1,500 out 2,000` is about 133
   * points and the narrowest row here is 316 with the net beside it. They were
   * on two lines anyway, on a real phone, with a third of the row empty to the
   * right of them, because the box the line wraps inside was sized to the line
   * rather than to the row — an exact fit that the pixel grid then rounded a
   * fraction under, on some rows and not others.
   *
   * SO IT IS THE BOX THAT IS ASSERTED AND NOT ONLY THE WRAP. The wrap itself
   * cannot be caught here: react-native-web sizes that box off CSS max-content
   * and never rounds it down, so the browser draws one line either way and a
   * check that watched the line would have passed the phone's fault every time.
   * What is checkable, and what the fix actually is, is that the text block
   * reaches the net — the line wraps against the room the ROW has left, which
   * is a question with the same answer on every renderer.
   */
  const spendBoxes = await page.evaluate(() => {
    const GAP = 12; // `styles.row`, and the only thing between the two halves
    return [...document.querySelectorAll('[data-testid="settled-row"]')].map((row) => {
      const net = row.querySelector('[data-testid="settled-net"]');
      const text = [...row.children].find((c) => c !== net) ?? null;
      if (net === null || text === null) return null;
      const t = text.getBoundingClientRect();
      const n = net.getBoundingClientRect();
      /* The spend line is the second half of the text block — the name is the
         first. A row whose player has no terms at all draws only the name. */
      const spend = text.children.length > 1 ? text.children[text.children.length - 1] : null;
      const terms = spend === null ? [] : [...spend.children].map((el) => el.getBoundingClientRect());
      /* `columnGap` on `styles.spend`. What the terms need on one line, against
         what the line has — a night in the millions can genuinely run out of
         room, and a check that called that a bug would be crying wolf. */
      const need = terms.reduce((sum, r) => sum + r.width, 0) + 9 * Math.max(0, terms.length - 1);
      return {
        name: (text.textContent || '').slice(0, 24),
        short: Math.round((n.left - GAP - t.right) * 100) / 100,
        lines: new Set(terms.map((r) => Math.round(r.top))).size,
        terms: terms.length,
        fits: spend !== null && need <= spend.getBoundingClientRect().width + 0.5,
      };
    });
  });

  await holds(
    'and the spend line wraps against the row rather than against itself',
    spendBoxes.length > 0 &&
      spendBoxes.every((r) => r !== null && r.short <= 1 && r.short >= -1),
    `a settled row's text block stops short of the net: ${JSON.stringify(spendBoxes)}`,
  );
  await holds(
    'so in and out share a line on a row that has the room',
    spendBoxes.every((r) => r !== null && (r.terms === 0 || !r.fits || r.lines === 1)),
    `in and out are on separate lines at ${WIDTH}: ${JSON.stringify(spendBoxes)}`,
  );

  await stop('night settled · at the table');

  /* Back to Final, which is where the screen opens and what the legs below
     are written against. */
  await tap('Final');
  await page.waitForTimeout(600);

  /*
   * AND THE DEDUCTIONS ARE A BLOCK WITH A TOTAL OF ITS OWN.
   *
   * The block has to add up on its own terms rather than lean on the figure at
   * the top of the screen — that is what makes it the other half of the record
   * rather than a footnote to it.
   *
   * THE COPY RULE IS NOT ASSERTED HERE. The handoff bans "leaves the table" from
   * the whole flow and `/deductions` still says it in its header card; that
   * screen is a batch of its own and the words are its to change. Asserting it
   * from this stop would only report the screen behind this one, because a
   * pushed route stays mounted underneath.
   */
  await holds(
    'and the deductions block totals itself',
    /*
     * ⚠ THE TOTAL MOVED, and this line moved with it. It was a `Total` row at
     * the foot of a card; R1 puts the figure on the section label — `DEDUCTIONS
     * … $616 total` — which is `docs/game-outcomes-cjm.md` finding 3 answered
     * by a newer board rather than by an argument. Matched on the word after
     * the figure so a slab's own amount cannot satisfy it.
     */
    (await page.locator(':text-matches("^[^ ]+ total$"):visible').count()) === 1,
    'the deductions block has no total of its own',
  );

  /*
   * AND EVERY BILL IS OPEN ON THE FACE OF ITS SLAB.
   *
   * R1's rule for this block: *"who paid which bill and for how much is on the
   * face of the slab, not behind a tap"*. It is what the note under the slabs
   * promises — whoever paid a bill gets it back in full — and it is the half a
   * room actually argues about at the end of a night.
   */
  await holds(
    'and every bill says who fronted it',
    /*
     * `[^ ]+` AND NOT `\S+`: the selector's own parser eats the backslash
     * before Playwright ever sees a regex, so `\S` arrives as a literal `S`
     * and the whole thing matches nothing. Same shape as the `total` matcher
     * above, which is why that one worked and this one did not.
     *
     * AND NOT ANCHORED AT THE FRONT ANY MORE. The 6 September cut draws one row
     * per DEDUCTION rather than one per fronter, so a bill two people covered
     * reads `Marek and Lena paid` — which is the honest row and does not start
     * with a single token. What is being held is that the bill says who paid
     * it, not how many words that takes.
     */
    (await page.locator(':text-matches(" paid$"):visible').count()) > 0 &&
      (await onScreen('Whoever paid a bill gets it back in full below.')) === 1,
    'the deduction slabs do not name who fronted a bill',
  );

  await stop('night settled · game results');

  /*
   * AND THE FOUR TERMS ARE ON THE ROW — `design/handoff-game-end/`, cut
   * 6 September, which drops `Full ledger` in as many words: *"do not build it,
   * do not link to it... everything it carried now reads on one line under each
   * player's name on Final, so there is no second place to go for the same four
   * terms."*
   *
   * THIS IS THE CHECK THAT GOES RED IF THE LINE EVER GOES QUIET. `7e` was a
   * whole screen and its absence was obvious; a line of terms under a name can
   * lose its last term to a wrap, a filter or a zero test and look completely
   * normal. So the terms are counted here, on a night that charged all of them,
   * with the bill's two halves asserted separately — the repayment is the one
   * the old columns could not draw at all.
   */
  await holds(
    'the Final row carries the four terms it replaced the ledger with',
    (await page.locator(':text-matches("^in [0-9,]+$"):visible').count()) > 0 &&
      (await page.locator(':text-matches("^out [0-9,]+$"):visible').count()) > 0 &&
      (await page.locator(':text-matches("^bill [0-9,]+"):visible').count()) > 0 &&
      (await page.locator(':text-matches("^piggy bank [0-9,]+$"):visible').count()) > 0,
    'the Final spend line is missing one of in / out / bill / piggy bank',
  );
  await holds(
    'and the bill a player fronted is its own term, never netted',
    /* `[+]` AND NOT `\+`, for the reason the deduction matcher above gives: the
       selector's parser eats the backslash, Playwright is handed `/+[0-9,]+/`,
       and a regex that starts with a bare quantifier throws rather than
       failing quietly. A character class needs no escape at all. */
    (await page.locator(':text-matches("[+][0-9,]+ back"):visible').count()) > 0,
    'nobody on this night is shown the bill they paid coming back',
  );
  await stop('night settled · the spend line');

  /*
   * B27 — THE FLOAT IS NAMED, NOT BANKED.
   *
   * The piggy bank's money is no longer any player's result, so the one place
   * it is now attributed is the line under its own deduction. If that line goes
   * missing, the seeded club's money leaves the screen entirely: nothing else
   * on E6 says who is holding it, and nobody would notice until the night the
   * collector was asked for it.
   */
  await holds(
    'and the float says who is holding it',
    /* The holder is the second line of its own row since 2 September, so it no
       longer trails a middot after the rule's name — it stands alone under it. */
    (await page.getByText(/^held by /).count()) > 0,
    'the block took money off the table and named nobody as holding it',
  );

  /*
   * AND THE STEP IS ON THE RECORD, read-only.
   *
   * `E2-rounding.md` rule 8: locked once the night is closed. The row states
   * what the night settled at — every figure above it was derived at that step
   * — and opens nothing, so a settled record cannot be re-rounded.
   */
  /* VISIBLE ONLY. The screen this one was pushed on top of is still in the
     document — expo-router keeps a stack mounted — so an unscoped count finds
     E4's copy of the same row and reports both of these backwards. */
  await holds(
    'the settled night says what it rounded to',
    (await page.locator(':text-is("Rounding · nearest $50"):visible').count()) === 1,
    'a night settled at a step does not say so',
  );
  await holds(
    'and does not offer to change it',
    (await page.locator('[aria-label^="Rounding · nearest $50"]:visible').count()) === 0,
    'the rounding row on a closed night is still a door',
  );

  /*
   * ⚠ `Who has paid` IS `Who pays whom` — `R2 · Who pays whom`, the second half
   * of the results handoff, cut 5 September. The route is the same, the screen
   * is redrawn, and the copy this leg walks changed with it. Updated rather
   * than loosened: every assertion below still asserts the same behaviour, on
   * the words the new board actually draws.
   */
  await tap('Who pays whom');
  await stop('who pays whom');

  /*
   * THE WHOLE ROW IS THE TICK, AND IT GOES BOTH WAYS —
   * `design/handoff-game-end/`, cut 6 September, which supersedes R2 here.
   *
   * The affordance is a 22px marker on the right of the row; the tap lands
   * anywhere on it, which is what a host clearing four transfers in a doorway
   * actually needs.
   */
  /* VISIBLE ONLY, and by attribute rather than by role, for the reason every
     other leg on this screen gives: the pushed stack stays mounted underneath.
     Every transfer row is a checkbox now, paid or not, so the two states are
     told apart by the row's own test id rather than by being two different
     objects. `accessibilityState` is what a screen reader gets and does not
     reach the DOM as an attribute this can select on. */
  const rows = () =>
    page.locator('[data-testid="transfer-open"]:visible, [data-testid="transfer-paid"]:visible').count();
  const ticked = () => page.locator('[data-testid="transfer-paid"]:visible').count();

  const before = await rows();
  await holds('the transfers are drawn', before > 0, 'the transfer list drew no rows');
  await holds(
    'and none of them starts out paid',
    (await ticked()) === 0,
    'a transfer was already ticked before anything was tapped',
  );

  await page.locator('[data-testid="transfer-open"]:visible').first().click({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await stop('who pays whom · one paid');

  /*
   * ONE TOUCH ON, ONE TOUCH OFF — and the second half is the one that rots.
   *
   * Ticking a payment used to be a one-way door: a mis-tap left the host
   * looking at a night that said Petr had paid when Petr had not (B21). R2's
   * answer was an `Undo` word inside a settled slab; **this cut's answer is
   * that the row never stops being a row.** A payment marked off is a claim
   * about the world rather than a finished thing, so it dims in place and the
   * same tap takes it back.
   *
   * THE ROW COUNT MUST NOT MOVE, which is the half that catches a regression to
   * the slab treatment: if a tick ever takes a row out of the list again, this
   * goes red on the count rather than on the tick.
   */
  await holds(
    'a tick marks the row paid and leaves it in the list',
    (await ticked()) === 1 && (await rows()) === before,
    `${await ticked()} rows read as paid out of ${await rows()}, not 1 of ${before}`,
  );

  await page.locator('[data-testid="transfer-paid"]:visible').first().click({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await holds(
    'and tapping it again puts it back',
    (await ticked()) === 0 && (await rows()) === before,
    'the row stayed paid — a mis-tap is one-way again',
  );
  await stop('who pays whom · undone');

  // And on again, so the screens after this one see the night mid-payment.
  await page.locator('[data-testid="transfer-open"]:visible').first().click({ timeout: 15_000 });
  await page.waitForTimeout(900);

  /*
   * AND THE LIST HEADER COUNTS WHAT HAS MOVED.
   *
   * `1 of 3 paid`, off `paymentProgress` in core — the same call that drives
   * the totals card's figure and the status pill on both game-end screens. It
   * is the one line here that has to move when a row does, and it is the sum
   * this screen used to do inline, which is the second implementation
   * `CLAUDE.md` is about.
   */
  await holds(
    'and the list header counts what has been handed over',
    (await page.locator(':text-matches("^1 of [0-9]+ paid$"):visible').count()) === 1,
    'the transfers header does not count the payments made',
  );

  /*
   * AND THE PILL AGREES WITH THE CARD, WHICH IS THE CUT'S ONE HARD RULE:
   * *"the amount is the sum of unpaid transfers, so the pill and 2a's Left to
   * move figure are the same number by construction. Never let them be computed
   * in two places."* Two places is exactly what it was before core owned it, so
   * this asserts the figure appears twice on the screen and reads the same
   * both times.
   */
  const agree = await page.evaluate(() => {
    /* `innerText` is the RENDERED text, so the eyebrow arrives uppercased by
       the stylesheet — matched case-insensitively rather than by guessing
       which. */
    const text = document.body.innerText;
    const card = /left to move\s*\n\s*([^\n]+)/i.exec(text);
    const pill = /(\S+) left(?:\n|$)/.exec(text);
    return {
      card: card === null ? null : card[1].trim(),
      pill: pill === null ? null : pill[1].trim(),
      settled: /\bSettled\b/.test(text),
    };
  });

  await holds(
    'and the pill states the same figure the card does',
    /* A night with nothing left to move wears `Settled` instead of a figure,
       and then the two agreeing means the card reads zero. */
    agree.card !== null &&
      (agree.pill === null
        ? agree.settled && /^\D*0$/.test(agree.card)
        : agree.card === agree.pill),
    `the card says ${agree.card ?? 'nothing'} and the pill says ${
      agree.pill ?? (agree.settled ? 'Settled' : 'nothing')
    }`,
  );

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
