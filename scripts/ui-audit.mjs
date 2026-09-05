/*
 * Hold every screen against the handoff's acceptance checks.
 *
 * `ui-check.mjs` compares one screen to the frame it was drawn from. This asks
 * a different question, of all of them at once: does the built app obey the
 * rules that are stated as rules rather than as pixels — the surface ladder,
 * the contrast floor, what may scroll, what may break mid-word?
 *
 * It renders every route at 393 × 852 in both themes and reports per screen.
 * Nothing here needs a board, which is the point: these checks hold whether or
 * not a frame exists for the state.
 *
 *   npm run ui                     # build and serve first
 *   node scripts/ui-audit.mjs      # then this
 *   node scripts/ui-audit.mjs /session /bill --verbose
 *   node scripts/ui-audit.mjs --sheets-only
 *
 * TWO PASSES. The first is every route in both themes at one size, which is
 * the older question. The second is SHEET GEOMETRY across the device matrix in
 * doc 15 § 4 — how tall each of the 21 sheets ends up on an SE, a mini, the
 * reference phone, a Pro Max and two Androids, and whether the panel stops
 * where the boards stop it. Sheet height is the one measurement that changes
 * with the phone, so measuring it at one size measures almost nothing.
 *
 * WHAT IT CANNOT SEE, and why, so nobody reads a pass as more than it is:
 *
 *   · The safe-area insets are 0 on the web, so the checks that measure
 *     against them — the footer button 28 above the screen bottom, nothing
 *     under the status bar or the home indicator, the indicator's own colour —
 *     cannot be measured here. They are device checks.
 *     THE SHEET PASS IS THE EXCEPTION: it stands a real inset up (see
 *     `FAKE_SAFE_AREA`) because sheet height is measured FROM the inset and a
 *     zero one hides the whole class of bug.
 *   · The NATIVE keypad-up state. A fake `visualViewport` stands in for the
 *     browser's keyboard and the footer is checked against it (A8), which is
 *     the build installed to a home screen — but `KeyboardAvoidingView` on a
 *     phone is a device check still.
 *   · THE ROUTE PASS RUNS AT 393 AND AT 360, because a label that fits at 393
 *     can still be cut at 375 — it used to run at 393 alone and leave the rest
 *     to whoever remembered UI_AUDIT_WIDTH, which is how B3 lived through a
 *     clean pass. A Pro Max width is still a hand run: UI_AUDIT_WIDTH=430.
 *   · IT ONLY SEES THE FIGURES THE SEEDED NIGHT HOLDS, which are small. A
 *     column that fits $500 and not $500,000 passes here and fails at a real
 *     table. `scripts/ui-journeys.mjs` plays a big night through the app and
 *     runs these same checks on what comes out.
 */

import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
import { launchOptions } from './chromium.mjs';

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
/*
 * THE WIDTHS THE ROUTE PASS RUNS AT, and why it is no longer one.
 *
 * It ran at 393 alone, and the note at the top of this file already said what
 * was wrong with that — "a figure that fits at 393 can still be cut at 375" —
 * and left it to whoever remembered to export UI_AUDIT_WIDTH. Nobody did, so
 * in practice the narrow phones were never measured at all. B3 is what that
 * cost: "Custom" on /log fitted its button at 393 by half a point and hung out
 * of both sides of it at 375 and 360, on every phone anyone actually owns, for
 * as long as the screen has existed, under a clean pass.
 *
 * So: the reference phone and the narrowest device in the matrix, every run.
 * 360 is the Android small in DEVICES and is the width everything is tightest
 * at. UI_AUDIT_WIDTH still pins it to one width when you want one.
 */
const WIDTHS =
  process.env.UI_AUDIT_WIDTH === undefined
    ? [393, 360]
    : [Number(process.env.UI_AUDIT_WIDTH)];
const HEIGHT = Number(process.env.UI_AUDIT_HEIGHT ?? 852);
const verbose = process.argv.includes('--verbose');
const sheetsOnly = process.argv.includes('--sheets-only');
const asked = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/**
 * The sheet geometry constants, kept beside `chrome` in the app's tokens and
 * repeated here because this file is plain node. `Sheet.geometry.test.ts`
 * asserts these two numbers against the tokens, so a change in one that is not
 * made in the other fails `npm run check` rather than quietly weakening this
 * pass.
 */
const SHEET_GAP = 21;
const SHEET_FULL_HEIGHT_BELOW = 700;

/** Every route in the app. The layout is not one. */
const ROUTES = [
  '/', '/session', '/pick', '/seat', '/entry', '/log', '/player', '/bill', '/spend',
  '/count-up', '/deductions', '/settle-up', '/settled', '/ledger', '/payments', '/nudge',
  '/games', '/stats', '/players', '/member', '/groups', '/new-group', '/new-night',
  '/settings', '/club-rules', '/money-rules', '/rule', '/bill-rules', '/piggy-bank-rules',
  '/house-rules', '/sign-in', '/claim', '/invite', '/watch', '/hand-over',
  '/rounding', '/share',
];

/*
 * ROUTES THAT ARE NOTHING WITHOUT THEIR PARAMS.
 *
 * A route in the list above is opened at its bare path, and a screen that
 * needs to be told WHICH rule and WHICH person renders its empty fallback
 * instead — a titled sheet with no body. Every check in this file then passes
 * over it, because a sheet holding nothing holds nothing wrong, and the route
 * counts as covered in the tally at the top of `docs/screens.md`.
 *
 * That is how B14 lived: /share has been in ROUTES since B2 added it, and what
 * the pass measured all that time was the fallback. Its preset row — the one
 * carrying "Custom", the exact string B3 was about — was never on screen at
 * any width, in either theme, on any run.
 *
 * So a route may name a query string, and it is opened with it. The values
 * below are the seeded night's own (`apps/mobile/src/data/sampleNight.ts`):
 * the bill, and somebody sitting at it. The seeded night is still being played,
 * so the figures on it are zero — what this pass needs is the ROW, and the
 * widest thing on it is the word "Custom" either way. `ui-journeys.mjs` is
 * where the sheet meets real money. Add a line here for any other screen whose
 * real state needs an argument.
 */
const PARAMS = {
  '/share': '?rule=kitchen&player=seed-lena',
  // Dana is the one the seeded night has already cashed out, so this is the
  // summary card with all THREE figures on it. Bare, the route renders one
  // line — "Nobody by that name tonight" — which is what the pass measured
  // until B15.
  '/player': '?id=seed-dana',
};

/** The URL a route is actually opened at. */
const urlOf = (route) => BASE + route + (PARAMS[route] ?? '');

/*
 * ROWS THE BOARD DRAWS THAT THE SCREEN MUST STILL SHOW.
 *
 * Every other check in this file asks whether what is on the screen obeys the
 * rules. None of them can see something that is NOT on the screen, and that is
 * a whole class of fault on its own: O1 shipped without its first drawn row —
 * *Stakes*, "$5 / $5" — for weeks, and no tool in the repo could say so. The
 * frame check measures the panel, the sheet pass measures its height, the room
 * pass measures contrast and overflow, and a screen missing a row passes all
 * three, because everything still on it is perfectly correct.
 *
 * So: the literal words the board puts on a screen, per route. A row deleted,
 * renamed, or flagged back out of existence takes this red.
 *
 * KEEP IT TO WHAT THE BOARD ACTUALLY DRAWS. This is not a place to pin copy
 * that seemed nice — every string below is on an artboard in
 * `design/handoff-rev18/boards/`, and the point is broken by the first one
 * that is not. A screen may hold MORE than its board (O1 states the currency,
 * which is drawn nowhere); it may not hold less.
 *
 * A row leaves this map ONLY when a decision has removed the row itself — not
 * because a screen stopped showing one. Exactly one has, and the entry below
 * names it.
 */
const DRAWN = {
  /*
   * Journey Map 1 · "O1 New session" — the rows of *The game*, and the dashed
   * chip that seats somebody.
   *
   * *Start time* is drawn there and is deliberately NOT here. The row was
   * removed on 29 August: a night is stamped with the clock at the moment its
   * table is opened, so there is nothing left to set. This is the one place in
   * this map where the screen holds less than its board, and it is a decision
   * rather than the fault B4 exists to catch — `docs/screens.md` says so
   * beside the note that lists the board's rows.
   */
  '/new-night': ['Stakes', 'Default buy-in', 'Money rules', 'Find a player'],

  /*
   * `design/handoff-E2/boards/Settled Status.dc.html`, layout 2a — the balance
   * block, which is the whole of that handoff.
   *
   * BOTH SUMS ARE HERE ON PURPOSE. The block it replaced showed one figure
   * against the chips still on the table, which is the same arithmetic with
   * half of it off screen: a night missing a cash-out reads DONE, because the
   * money nobody entered was subtracted out of both sides before they were
   * compared. "A screen that only says BALANCED is not checkable" is the
   * handoff's own sentence, and this is what holds it — a later pass that
   * drops a column to buy width takes this red rather than shipping.
   *
   * The seeded night is mid-count, so the strip reads the countdown and the
   * two groups below are both drawn. Its verdict states are covered by
   * `balance.test.ts` and played through in `ui-journeys.mjs`.
   */
  '/count-up': [
    /*
     * `IN PLAY` WHERE THE BOARD DRAWS `BOUGHT IN` — 5 September, on the owner's
     * instruction, and this line is the one that went red for it, which is the
     * pass working rather than the pass being wrong.
     *
     * The same $5,000 was `total in` on Tonight, `BOUGHT IN` here and
     * `PRIZEPOOL` on E6: one figure under three nouns, on three screens a host
     * sees inside ten minutes. `/watch` already said `IN PLAY`, so that is the
     * word everywhere. The half of the equation this row is here to hold is
     * unchanged — it is still both sides, and still named.
     *
     * `docs/screens.md` carries the decision and what it costs. Do not put
     * `BOUGHT IN` back by reading the board.
     */
    'IN PLAY',
    'ACCOUNTED FOR',
    'LEFT TO ACCOUNT FOR',
    /*
     * THE THREE GROUPS — `design/handoff-count-up-to-settled/boards/Cashed Out
     * States.dc.html`, frame `1a`, and `docs/05-active-vs-settled.md`.
     *
     * They replace *Still seated* and *Already confirmed*, which were the two
     * this list had until 1 September. The middle header's qualifier is here
     * with them because it is the load-bearing part: the right-hand column
     * means a stack above it and a signed result below it, and nothing else on
     * the row says which. The doc's own sentence — "do not shorten it to
     * *result*" — is a string this can hold to.
     *
     * A HEADER IS DRAWN AT ZERO TOO, so none of these three can go missing on
     * a night at any stage of its count. That is what makes them worth asking
     * for here rather than only on the seeded mid-count night.
     */
    'STILL TO COUNT',
    'COUNTED',
    'CASHED OUT EARLIER',
    /* `not counted yet` went with the same decision that took the qualifier off
       the labels — `design/handoff-player-list/`, 3 September. An active row's
       fact is what they have IN, and what says they are not counted is the
       group they are in and the em dash where a result would be. The words were
       the row apologising for having no figure. */
    'Count',
    'Next',
  ],

  /*
   * `Cashed Out States.dc.html`, frame `2a` — the game screen with treatment
   * `1a` applied, which is the reference for Tonight. Nothing else on this
   * screen changed and nothing else is asked for here.
   *
   * The seeded night has somebody already cashed out, so both groups are
   * drawn. Were it a fresh table, CASHED OUT would still be on screen at `· 0`
   * — which is the rule these two strings exist to hold.
   */
  /* `RESULT BEFORE DEDUCTIONS` came off both labels on 3 September —
     `design/handoff-player-list/`. The qualifier existed because the row did
     not say "finished" on its own; the slab says it, so the label is a name and
     a count. A screen that puts the words back is drawing a row that has
     stopped carrying its own meaning. */
  '/session': ['STILL PLAYING', 'CASHED OUT'],

  /*
   * ⚠ NO `/settled` ENTRY, still, and it is not an oversight — see the
   * paragraph in `docs/screens.md`. `/settled` reads the night the app holds,
   * the seeded night is still being played, so the route pass opens the *Not
   * settled* fallback and would go red on a screen that is behaving perfectly.
   * The kicker and the formula line are held by `ui-journeys.mjs`, which plays
   * a night through to settled and stops on it.
   */
};

/*
 * ROWS A DECISION PUT ON A SCREEN THAT NO BOARD DRAWS.
 *
 * `DRAWN` above is the board's own words and is kept pure — every string in it
 * is on an artboard, which is what makes it worth anything. This is the other
 * half of the same fault: a row the design never drew, added because a decision
 * was taken, is exactly as invisible to every other check in this file and
 * exactly as easy for a later pass to delete by accident. O1 shipped for weeks
 * without *Stakes* and nothing could say so; the rows below would go the same
 * way.
 *
 * Each entry names the decision, because a row nobody can trace back to one
 * does not belong on a screen at all.
 */
const DECIDED = {
  /*
   * 30 Aug · rounding is set when the game is opened, not only after it.
   *
   * How coarsely the table settles is a money rule — it changes what people
   * pay — and it was reachable only from tonight's money rules or the club's,
   * both of which are places you go once the table is already open. A group
   * playing for thousands played the first hand on whole dollars.
   */
  '/new-night': ['Rounding'],

  /*
   * 30 Aug · the bill, and who paid it, on the two screens where the deductions
   * are actually argued about.
   *
   * `11-bill-and-piggy-bank.md` under "After the count" has always allowed a
   * spend added during settle-up. The engine allowed it; no screen in the
   * ending flow could reach it, so the host left the flow, found the table,
   * opened the drawer and the bill, and walked forward through the count again.
   */
  '/money-rules': ['The bill', 'Add a spend'],

  /*
   * /deductions is NOT here, and the reason is the one PARAMS is about.
   *
   * The seeded night is mid-count, so opening the route bare renders E3's
   * "Not yet" state — no stack counted, no figures, and correctly no bill. A
   * row asked for here would be red on a screen that is behaving perfectly, and
   * the fix for that would be to stop asking, which is how a check quietly
   * stops checking. The bill on E3 is real only once a night has been counted,
   * so `ui-journeys.mjs` owns it: mid-run, with the count in, it taps *Add a
   * spend* on that screen, types a figure on the pad, names who paid it, and
   * asserts the spend lands on the bill it was added to.
   */
};

/*
 * WORDS A DECISION HAS REMOVED, which must be on NO screen.
 *
 * The mirror of the two maps above, and it exists because removing a control
 * from an app is not one edit. "Taken from" was a segmented control in the rule
 * editor, and the setting behind it was then explained in words on the house
 * rules and on the piggy-bank rules — three screens, one of which had the
 * sentence the wrong way round. Deleting the control leaves the sentences, and
 * nothing in this file could see them: a screen explaining a setting that no
 * longer exists is perfectly laid out.
 *
 * Checked on EVERY route rather than per screen, because "wherever it appears"
 * is the actual requirement. Keep this list to strings specific enough that an
 * unrelated screen cannot say them by accident.
 */
const GONE = [
  // 30 Aug · every rule is taken off the gross win. `MoneyRule.basis` survives
  // in core so a night already stored as `net_after_others` still settles as it
  // did — see the header of `src/components/RuleFields.tsx` — but nothing in
  // the interface offers the choice or describes it any more.
  'Taken from',
  'after the other rules',
  'win after the bill',
  'What is left after the others',
];

/*
 * SCREENS WHERE AN AMOUNT IS TYPED ON THE APP'S OWN PAD.
 *
 * A keypad rather than the system keyboard, for the reason `Keypad.tsx` gives:
 * the amount is the whole point of the screen and a keyboard sliding up covers
 * both the running figure and the button that commits it. A screen in this list
 * with no pad on it is a figure that cannot be changed — which is what L3 was,
 * for as long as the spend sheet drew its pad only when adding. See B24.
 *
 * The backspace key is what is looked for: every pad has exactly one, it is
 * labelled rather than drawn with a glyph the DOM can match, and unlike the
 * digits it cannot be a figure that happens to be on the screen.
 */
const KEYPAD = ['/log', '/spend', '/share'];

/*
 * SCREENS WHOSE HEAD MOVES WITH THE BODY, and how much of it.
 *
 * Check 1 in doc 15 § 5 — "no screen scrolls as a whole; only lists scroll" —
 * is a rule against an ACCIDENT: the head used to sit inside the scroll view
 * on every screen, so a long body carried the title and the back button off
 * the top and left the reader with no way to say where they were. That is
 * still the default and still what goes red below.
 *
 * A screen may now opt out, per screen, by passing `headScroll` to `Screen`:
 *
 *   'meta'  the title row is pinned and the line under it scrolls away
 *   'all'   the whole head goes, back button included — a screen that is one
 *           long list and nothing else
 *
 * This map is the list of screens that have, and it is a two-way check rather
 * than a mute. A route on it must actually scroll what it says it scrolls; a
 * route off it may scroll nothing. So the fault this file was written to catch
 * comes back red the moment a screen picks the behaviour up by accident, and
 * a screen that was given it on purpose says so here, in the place somebody
 * resolving a conflict in `Screen.tsx` will look.
 */
const HEAD_SCROLLS = {
  // 30 Aug. My stats is read for a while — a month can be a dozen nights — and
  // the club name is part of what is being read.
  '/stats': 'meta',
  // 30 Aug. The roster reaches thirty-odd rows and there is nothing else on
  // the screen; 90 points of pinned chrome cost a row and a half on every
  // phone and say nothing the list does not.
  '/players': 'all',
};

/** Which side of the scroller each half of the head ended up on. */
const HEAD_PROBE = `
(() => {
  const inScroller = (id) => {
    const el = document.getElementById(id);
    if (el === null) return null;
    for (let n = el.parentElement; n !== null; n = n.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) return true;
    }
    return false;
  };
  return { title: inScroller('screen-title'), meta: inScroller('screen-meta') };
})()
`;

const ROOM = `
(() => {
  const px = (v) => Math.round(v * 100) / 100;

  const rgb = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n));
    return { r, g, b, a: a === undefined ? 1 : a };
  };

  /** The colour actually behind an element, after every transparent ancestor. */
  const painted = (el) => {
    for (let n = el; n !== null; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c !== null && c.a > 0.99) return { el: n, c };
    }
    const c = rgb(getComputedStyle(document.body).backgroundColor);
    return c === null ? null : { el: document.body, c };
  };

  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
  };

  const hex = ({ r, g, b }) =>
    '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  const label = (el) => {
    const t = (el.textContent || '').trim().replace(/\\s+/g, ' ');
    return t.length > 34 ? t.slice(0, 34) + '…' : t;
  };

  const all = [...document.querySelectorAll('div, span, p, h1, h2, h3, a, button')];
  const findings = [];

  // ---- 8 · no surface sits on a surface of its own colour -----------------
  for (const el of all) {
    const own = rgb(getComputedStyle(el).backgroundColor);
    if (own === null || own.a < 0.99) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    // A screen root painting the app's ground over the app's ground is not a
    // surface on a surface — it is the same single level, stated twice. The
    // rule is about a CARD that repeats the panel under it, so only inset
    // blocks count.
    if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) continue;
    const under = painted(el.parentElement);
    if (under === null) continue;
    if (hex(own) === hex(under.c)) {
      // A block that only paints what is already there is invisible: either it
      // wants a different level of the ladder or it does not want a fill.
      findings.push({
        check: 'surface-on-itself',
        detail: hex(own),
        where: label(el),
        box: { w: px(r.width), h: px(r.height) },
      });
    }
  }

  // ---- 9 · text clears 4.5:1 against what is behind it --------------------
  const seen = new Set();
  for (const el of all) {
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
    if (!text) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0') continue;
    const fg = rgb(s.color);
    const bg = painted(el);
    if (fg === null || bg === null) continue;

    // Opacity on the element mixes it toward its ground before it is read.
    const o = parseFloat(s.opacity);
    const mixed =
      o >= 0.999
        ? fg
        : {
            r: fg.r * o + bg.c.r * (1 - o),
            g: fg.g * o + bg.c.g * (1 - o),
            b: fg.b * o + bg.c.b * (1 - o),
          };

    const ratio = contrast(mixed, bg.c);
    const size = parseFloat(s.fontSize);
    const weight = Number(s.fontWeight) || 400;
    // WCAG large text: 18.66px bold, or 24px. Everything else needs 4.5.
    const floor = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    if (ratio < floor) {
      const key = label(el) + hex(mixed) + hex(bg.c);
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        check: 'contrast',
        detail: ratio + ':1 needs ' + floor + ' · ' + hex(mixed) + ' on ' + hex(bg.c),
        where: label(el),
        box: { size: px(size), weight },
      });
    }
  }

  // ---- 6 · nothing breaks inside a word -----------------------------------
  //
  // Measured off the text node itself: a word that fits on one line has one
  // client rect, and a word broken across lines has two. Box height cannot
  // answer this — padding makes a one-line label look like three.
  for (const el of all) {
    for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue;
      const t = node.textContent.trim();
      if (t === '' || /\\s/.test(t)) continue; // one word only
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length > 1) {
        findings.push({
          check: 'mid-word-break',
          detail: t + ' broken across ' + rects.length + ' lines',
          where: label(el),
          box: { w: px(rects[0].width) },
        });
      }
    }
  }

  // ---- A8 · money raises a digits keypad ----------------------------------
  //
  // Every amount field is marked with testID "amount" at the source, so this
  // is the whole set rather than a guess at which boxes hold money. A decimal
  // keyboard is a finding too: amounts are integers in minor units and Money
  // refuses anything fractional, so a keypad offering a dot offers a value the
  // engine will throw on.
  for (const el of document.querySelectorAll('[data-testid="amount"]')) {
    const mode = el.getAttribute('inputmode') ?? el.inputMode ?? '';
    if (mode !== 'numeric') {
      findings.push({
        check: 'amount-keyboard',
        detail: mode === '' ? 'no inputmode — raises the full keyboard' : 'inputmode ' + mode,
        where: el.getAttribute('placeholder') || el.value || 'an amount field',
      });
    }
  }

  // ---- A FIGURE IS NEVER CUT OFF ------------------------------------------
  //
  // A truncated word is a nuisance; a truncated NUMBER is a lie. "−4,5…" reads
  // as a different amount from −4,543, and on a screen whose whole job is
  // money that is the one thing that must never happen. Names may ellipsise.
  //
  // Two ways it goes wrong and both are checked: the text is wider than the
  // box that holds it (clipped, with or without an ellipsis), or the box
  // itself has been pushed past the edge of the phone.
  const FIGURE = /^[-+\u2212]?[^0-9]{0,3}[0-9][0-9.,\u00a0 ]*(k|M)?[^0-9]{0,3}$/;

  for (const el of all) {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    if (own === '' || !FIGURE.test(own) || !/[0-9]/.test(own)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0' || s.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    // Clipped: the text needs more room than the box gives it. One pixel of
    // slack for the sub-pixel widths a browser rounds to.
    if (el.scrollWidth > el.clientWidth + 1) {
      findings.push({
        check: 'figure-clipped',
        detail: own + ' needs ' + px(el.scrollWidth) + ' in ' + px(el.clientWidth),
        where: own,
      });
      continue;
    }

    // Off the phone. The right edge is the one that goes; the left is checked
    // too because a row that overflows can push its first cell out instead.
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      findings.push({
        check: 'figure-off-screen',
        detail: px(r.left) + '\u2026' + px(r.right) + ' in ' + window.innerWidth,
        where: own,
      });
      continue;
    }

    // OUT OF THE CARD THAT HOLDS IT, which is how this actually goes wrong:
    // nothing clips, nothing leaves the screen, and a figure simply sits
    // outside the box it belongs to with a border ruled through it. The box is
    // the nearest ancestor that draws itself — a fill or a rounded edge.
    const box = (() => {
      for (let n = el.parentElement; n !== null; n = n.parentElement) {
        const st = getComputedStyle(n);
        const filled = rgb(st.backgroundColor);
        const rounded = (parseFloat(st.borderTopLeftRadius) || 0) >= 6;
        if ((filled !== null && filled.a > 0.01) || rounded) return n;
      }
      return null;
    })();
    if (box !== null && box !== el) {
      const b = box.getBoundingClientRect();
      const pad = getComputedStyle(box);
      const right = b.right - (parseFloat(pad.paddingRight) || 0);
      const left = b.left + (parseFloat(pad.paddingLeft) || 0);
      if (r.right > right + 1 || r.left < left - 1) {
        findings.push({
          check: 'figure-out-of-its-box',
          detail: px(r.left) + '\u2026' + px(r.right) + ' in ' + px(left) + '\u2026' + px(right),
          where: own,
        });
      }
    }
  }

  // ---- A LABEL STAYS INSIDE THE CONTROL THAT HOLDS IT ---------------------
  //
  // The figure checks above are about numbers, because a truncated number is a
  // lie. This one is about the CONTROL, and it catches the thing that keeps
  // going wrong on a row of chips: a word that is wider than the padding box
  // of the button drawn around it, so it sits on — or through — its own edge.
  //
  // Nothing else here could see it. It does not clip (a Pressable draws no
  // overflow rule, so the label simply hangs out of both sides), it does not
  // leave the phone, and figure-out-of-its-box skips it the moment the label
  // is a word rather than an amount. "Custom" on /log came out through both
  // sides of its button on every phone narrower than 393, from the day the
  // screen was built, and the audit printed a clean pass over it — B3. B2 was
  // the same fault on /rounding, caught only because that label was a figure.
  //
  // Measured off the label's own BOX, never off a range rect: a label with
  // numberOfLines is clipped and ellipsised, so its box is the clipped box and
  // says the truth, while a range still reports the full untruncated width and
  // would report every ellipsised row in the app as a finding.
  for (const control of document.querySelectorAll('[role="button"]')) {
    // Only the innermost control: a row that is itself pressable and holds
    // pressable children measures its children's labels against its own
    // padding, which is not what either box is for.
    if (control.querySelector('[role="button"]') !== null) continue;
    const cs = getComputedStyle(control);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    const cb = control.getBoundingClientRect();
    if (cb.width < 8 || cb.height < 8) continue;

    const padLeft = cb.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
    const padRight = cb.right - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderRightWidth) || 0);

    for (const el of control.querySelectorAll('*')) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join('');
      if (own === '') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Half a point of slack for the sub-pixel widths a browser rounds to.
      if (r.left < padLeft - 0.5 || r.right > padRight + 0.5) {
        findings.push({
          check: 'label-out-of-its-control',
          detail:
            own + ' at ' + px(r.left) + '…' + px(r.right) +
            ' in a padding box of ' + px(padLeft) + '…' + px(padRight),
          where: label(control),
          box: { w: px(r.width), control: px(padRight - padLeft) },
        });
      }
    }
  }

  // ---- 1 · only lists scroll ----------------------------------------------
  const doc = document.scrollingElement;
  if (doc && doc.scrollHeight > doc.clientHeight + 1) {
    findings.push({
      check: 'screen-scrolls',
      detail: doc.scrollHeight + ' in ' + doc.clientHeight,
      where: 'the document',
    });
  }
  for (const el of all) {
    const s = getComputedStyle(el);
    if (!/(auto|scroll)/.test(s.overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    // A scroller that carries the screen's own title is the screen scrolling.
    // The title says so itself — the two chrome components mark theirs — so a
    // big figure inside a body (an amount, a count) is not mistaken for one.
    const carriesTitle = el.querySelector('#screen-title, #sheet-title') !== null;
    if (carriesTitle) {
      findings.push({
        check: 'screen-scrolls',
        detail: 'a scroller holds the title — ' + el.scrollHeight + ' in ' + el.clientHeight,
        where: label(el),
      });
    }
  }

  // ---- E6 · a result never sits on a fill of its own colour ---------------
  //
  // design/handoff-E6: the green and the red sit ONLY on the figures. A washed
  // row says a second time, in a colour that has to survive a phone at arm's
  // length in bad light, what the sign in front of the number said first — and
  // it makes the row an object, when E6's whole point is that no row on a
  // settled night is emphasised over another. Seven rows in two colours are a
  // ranking the column of signed figures had already given.
  //
  // ANCHORED ON THE FIGURE, not on a colour name, so it holds whatever the
  // next wash gets called: find every signed amount in the app, walk up the
  // row that holds it, and fail if anything on the way there is painted a
  // tint. A tint is a background with an alpha strictly between 0 and 1 — an
  // opaque fill is a level of the surface ladder, and check 8 above already
  // has an opinion about those.
  //
  // It is deliberately not scoped to the results screens. The fill was on four
  // of them and the rule is about what a signed figure may sit on, wherever
  // one is drawn.
  //
  // ONE EXCEPTION, BY NAME AND BY THEME. E6-row-formula.md, cut 31 August,
  // puts the fill back on an E6 player row IN THE DARK THEME ONLY: at 13% on
  // #0A0A0B the wash reads as a band rather than as emphasis, which is the
  // thing B23 was about. The bright theme has no such alpha and keeps the
  // hairlines, so the rule still holds there — and it holds in dark for every
  // signed figure that is not one of these rows.
  //
  // Anchored on the row's own testID and on prefers-color-scheme, so a fill
  // that leaks into the bright theme is still a finding, and so is a tint on
  // anything that is not this row.
  //
  // NO BACKTICKS ANYWHERE IN HERE. This whole block is a template literal
  // handed to page.evaluate, and one backtick in a comment ends the string
  // several hundred lines early — which is a syntax error in a file the gate
  // runs before it runs anything else.
  const darkRowAllowed = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const SIGNED = /^[+\\u2212]\\$[\\d,]/;
  for (const el of all) {
    if (!SIGNED.test((el.textContent || '').trim())) continue;
    // The leaf holding the figure, not every ancestor that contains it.
    if ([...el.children].some((c) => SIGNED.test((c.textContent || '').trim()))) continue;
    for (let n = el.parentElement; n !== null; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      // Past the width of the list this is no longer the row, it is the screen.
      if (r.width >= window.innerWidth - 8) break;
      if (darkRowAllowed && n.getAttribute('data-testid') === 'e6-row') break;
      const paint = getComputedStyle(n).backgroundColor;
      const c = rgb(paint);
      if (c === null || c.a <= 0 || c.a > 0.99) continue;
      findings.push({
        check: 'tinted-result-row',
        detail: paint + ' behind ' + label(el),
        where: label(n),
        box: { w: px(r.width), h: px(r.height) },
      });
      break;
    }
  }

  return findings;
})()
`;

/**
 * A keyboard, stood in for.
 *
 * The browser raises none, so the one thing that goes wrong when it does —
 * the footer button ending up behind the keys, with no way to reach it but
 * scrolling the whole document — could not be seen here at all. It was found
 * at a table instead, on the sheet that seats a player, where Seat and buy in
 * simply could not be tapped.
 *
 * `visualViewport` is what a real browser shrinks when the keyboard opens, so
 * a fake one that can be shrunk on demand is a faithful stand-in for it. This
 * is NOT the native path — that is `KeyboardAvoidingView` and still a device
 * check — but the app is installed to a home screen and used as a web app,
 * and this is that build.
 */
const KEYBOARD = 336;

const FAKE_VIEWPORT = `({ height, keyboard }) => {
  let h = height;
  const target = new EventTarget();
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    get: () => ({
      get height() { return h; },
      offsetTop: 0,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    }),
  });
  window.__raiseKeyboard = () => {
    h = height - keyboard;
    target.dispatchEvent(new Event('resize'));
  };
}`;


/**
 * A SAFE AREA, STOOD UP.
 *
 * The browser reports none, and a sheet's height is measured FROM the inset —
 * so with a zero one the panel's cap lands at 21 instead of 80 and the whole
 * class of bug this pass exists for is invisible. Faking it is not a liberty:
 * it is the only way to ask the question at all outside a phone.
 *
 * `react-native-safe-area-context` on the web appends a hidden, fixed 0 × 0
 * div to the body whose padding is `env(safe-area-inset-*)`, reads its
 * computed padding, and re-reads it on `transitionend`. So: watch for that div
 * going in, paint real padding onto it, and fire the event. Inline padding
 * beats `env()`, and the observer's callback is a microtask — it runs after
 * the provider's synchronous append-listen-read, so the listener is already
 * attached by the time the event is dispatched.
 */
const FAKE_SAFE_AREA = `({ top, bottom }) => {
  const isProbe = (el) =>
    el instanceof HTMLElement &&
    el.style.position === 'fixed' &&
    el.style.visibility === 'hidden' &&
    el.style.transitionProperty === 'padding';

  const paint = (el) => {
    el.style.setProperty('padding-top', top + 'px', 'important');
    el.style.setProperty('padding-bottom', bottom + 'px', 'important');
    // Chromium answers 'webkitTransitionEnd' to the library's feature test;
    // both are dispatched so the stand-in does not rest on that detail.
    for (const name of ['webkitTransitionEnd', 'transitionend'])
      el.dispatchEvent(new Event(name));
  };

  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (isProbe(n)) paint(n);
  }).observe(document, { childList: true, subtree: true });
}`;

/**
 * doc 15 § 4 · the worked examples, and two Androids.
 *
 * The four iPhones and their insets are the handoff's own table. THE HANDOFF
 * NAMES NO ANDROID DEVICE — these two are the platform's numbers, not the
 * design's, and they are here because the rule under test is written against
 * the inset rather than against a screen size, so it should hold at any inset.
 * A Pixel-class phone reports a 24dp status bar and a 24dp gesture bar; the
 * small one is the shortest Android worth drawing for and lands under the
 * 700-point floor, the same as an SE.
 *
 *   [ name, width, height, inset top, inset bottom ]
 */
const DEVICES = [
  ['iPhone SE 3', 375, 667, 20, 0],
  ['iPhone 13 mini', 375, 812, 50, 34],
  ['iPhone 16 / 15 / 14', 393, 852, 59, 34],
  ['iPhone 16 Pro Max', 430, 932, 62, 34],
  ['Android · Pixel-class', 412, 915, 24, 24],
  ['Android · small', 360, 640, 24, 24],
];

/** The sheets, from the `SHEET` list in `app/_layout.tsx`. */
const SHEET_ROUTES = [
  '/player', '/pick', '/log', '/entry', '/seat', '/bill', '/spend', '/bill-rules',
  '/piggy-bank-rules', '/house-rules', '/money-rules', '/rule', '/rounding', '/share',
  '/sign-in', '/member', '/hand-over', '/nudge', '/new-group', '/new-night', '/invite',
];

/**
 * What a sheet's height has to be, and the four ways it goes wrong.
 *
 * The rule, from doc 15 § 3 and § 4.7 and from the boards: a sheet HUGS ITS
 * CONTENT and is anchored to the bottom of the phone, until it reaches a cap
 * at `inset.top + 21` — the 80 that fifteen of the thirty-five drawn sheet
 * states sit at on the 393 × 852 frame. At the cap it stops growing and the
 * body scrolls inside it. Below 700 points of usable height there is no peek
 * at all and every sheet is full-height.
 *
 * `gap` and `floor` are passed in rather than imported: this file is plain
 * node and the tokens are TypeScript. They are asserted against the tokens by
 * `Sheet.geometry.test.ts`, so the two cannot drift apart in silence.
 */
const SHEET = `({ insetTop, insetBottom, gap, floor }) => {
  const px = (v) => Math.round(v * 10) / 10;
  const panel = document.querySelector('#sheet-root');
  if (panel === null) return { none: true };

  const b = panel.getBoundingClientRect();
  const vh = window.innerHeight;
  const cap = insetTop + gap;
  const usable = vh - insetTop - insetBottom;
  const findings = [];
  const at = 'top ' + px(b.top) + ', ' + px(b.height) + ' tall';

  // ---- the cap · nothing rises into the status bar or the island ---------
  if (b.top < cap - 1) {
    findings.push({
      check: 'sheet-above-its-cap',
      detail:
        px(b.top) + ' is ' + px(cap - b.top) + ' above the cap of ' + cap +
        (b.top < insetTop
          ? ' — and ' + px(insetTop - b.top) + ' of it is under the status bar'
          : ''),
    });
  }

  // ---- § 4.7 · a short phone gives up the peek ---------------------------
  if (usable < floor && b.top > cap + 1) {
    findings.push({
      check: 'sheet-not-full-height',
      detail:
        'usable ' + usable + ' is under ' + floor + ', so this should sit at ' +
        cap + ' — it sits at ' + px(b.top),
    });
  }

  // ---- anchored to the foot of the phone ---------------------------------
  if (Math.abs(vh - b.bottom) > 1) {
    findings.push({
      check: 'sheet-not-anchored',
      detail: 'ends at ' + px(b.bottom) + ', the screen ends at ' + vh,
    });
  }

  // ---- the primary action stays inside the panel -------------------------
  //
  // The footer is the point of a sheet. When the panel is capped and the body
  // does not yield, this is where it shows: the button is drawn past the
  // panel's own bottom edge, off the glass, with nothing to scroll to reach
  // it. That is the bug flexShrink was added for and this is its regression.
  const foot = document.querySelector('#sheet-footer');
  if (foot !== null) {
    const f = foot.getBoundingClientRect();
    if (f.bottom > b.bottom + 1 || f.top < b.top - 1) {
      findings.push({
        check: 'sheet-footer-outside-the-panel',
        detail: px(f.top) + '…' + px(f.bottom) + ' in a panel of ' + px(b.top) + '…' + px(b.bottom),
      });
    }
  }

  // ---- at the cap, the body scrolls --------------------------------------
  //
  // "A sheet never scrolls as a whole; only the body scrolls." A capped panel
  // with content taller than it and no scroller is content nobody can read.
  const bodies = [...panel.querySelectorAll('*')].filter((el) =>
    /(auto|scroll)/.test(getComputedStyle(el).overflowY),
  );
  const overflowing = [...panel.querySelectorAll('*')].some((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && (r.bottom > b.bottom + 1 || r.top < b.top - 1);
  });
  if (overflowing && !bodies.some((el) => el.scrollHeight > el.clientHeight + 1)) {
    findings.push({
      check: 'sheet-content-unreachable',
      detail: 'something is drawn outside the panel and nothing inside it scrolls',
    });
  }

  return { none: false, at, cap, usable, top: px(b.top), height: px(b.height), findings };
}`;

const browser = await chromium.launch(launchOptions());
const routes = asked.length > 0 ? asked : ROUTES;
let failures = 0;
const tally = new Map();

for (const WIDTH of sheetsOnly ? [] : WIDTHS) {
  for (const route of routes) {
    for (const scheme of ['dark', 'light']) {
      const ctx = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      // One argument only — Playwright passes a single value through.
      await page.addInitScript(eval(`(${FAKE_VIEWPORT})`), { height: HEIGHT, keyboard: KEYBOARD });
      let findings = [];
      try {
        await page.goto(urlOf(route), { waitUntil: 'networkidle' });
        await page.waitForTimeout(450);
        findings = await page.evaluate(ROOM);

        /*
         * The head, for the screens that have asked for a moving one — see
         * HEAD_SCROLLS. The room pass flags any scroller carrying the title;
         * here that finding is dropped for a route that asked for it, and the
         * opposite is asserted in its place, so the behaviour cannot quietly
         * stop working either.
         */
        const wanted = HEAD_SCROLLS[route];
        if (wanted !== undefined) {
          findings = findings.filter(
            (f) =>
              f.check !== 'screen-scrolls' ||
              !String(f.detail).startsWith('a scroller holds the title'),
          );
        }
        {
          const head = await page.evaluate(HEAD_PROBE);
          const titleShould = wanted === 'all';
          if (head.title !== null && head.title !== titleShould) {
            findings.push({
              check: 'head-scroll',
              detail: titleShould
                ? 'this screen asks for a scrolling title and its title is pinned'
                : 'the title is inside a scroller and this screen never asked for that',
              where: route,
            });
          }
          // A screen with no meta line has nothing to say here.
          const metaShould = wanted !== undefined;
          if (head.meta !== null && head.meta !== metaShould) {
            findings.push({
              check: 'head-scroll',
              detail: metaShould
                ? 'the line under the title is pinned and this screen asks for it to scroll'
                : 'the line under the title scrolls and this screen never asked for that',
              where: route,
            });
          }
        }

        /*
         * The rows the board draws, still on the screen — see DRAWN.
         *
         * CASE-INSENSITIVE, because `innerText` is what the reader sees and a
         * section label is uppercased by the stylesheet rather than by the
         * string. The map is written in the board's own casing — "Still
         * seated" is what the artboard says — and matching literally made the
         * first two entries after O1 red on a screen that was drawing them
         * perfectly. This check asks whether a row is THERE; whether it is
         * cased and weighted as drawn is what `ui-check.mjs` measures.
         */
        for (const word of DRAWN[route] ?? []) {
          const seen = await page.evaluate(
            (w) => (document.body.innerText || '').toLowerCase().includes(w.toLowerCase()),
            word,
          );
          if (!seen) {
            findings.push({
              check: 'drawn-row-missing',
              detail: `the board draws “${word}” and the screen does not`,
              where: route,
            });
          }
        }

        /* Rows a decision put there that no board draws — see DECIDED. */
        for (const word of DECIDED[route] ?? []) {
          const seen = await page.evaluate(
            (w) => (document.body.innerText || '').toLowerCase().includes(w.toLowerCase()),
            word,
          );
          if (!seen) {
            findings.push({
              check: 'decided-row-missing',
              detail: `a decision put “${word}” on this screen and it is not there`,
              where: route,
            });
          }
        }

        /* Words a decision has removed — see GONE. Every route, every time. */
        for (const word of GONE) {
          const seen = await page.evaluate(
            (w) => (document.body.innerText || '').toLowerCase().includes(w.toLowerCase()),
            word,
          );
          if (seen) {
            findings.push({
              check: 'removed-copy-still-here',
              detail: `“${word}” was taken out of the app and this screen still says it`,
              where: route,
            });
          }
        }

        /* An amount screen with no pad is a figure nobody can change — KEYPAD. */
        if (KEYPAD.includes(route)) {
          const pads = await page.getByLabel('Delete').count();
          if (pads === 0) {
            findings.push({
              check: 'keypad-missing',
              detail: 'an amount is typed here and there is no keypad to type it on',
              where: route,
            });
          }
        }

        // A8 · the footer rises with the keyboard and is never covered.
        const hasField = (await page.locator('input, textarea').count()) > 0;
        if (hasField) {
          await page.evaluate(() => window.__raiseKeyboard());
          await page.waitForTimeout(350);
          const covered = await page.evaluate((keys) => {
            const foot = document.querySelector('#sheet-footer');
            if (foot === null) return null;
            const r = foot.getBoundingClientRect();
            const top = window.innerHeight - keys;
            return r.bottom > top + 1 ? { bottom: Math.round(r.bottom), top } : null;
          }, KEYBOARD);
          if (covered !== null) {
            findings.push({
              check: 'footer-under-keyboard',
              detail: `ends at ${covered.bottom}, the keyboard starts at ${covered.top}`,
              where: route,
            });
          }
        }
      } catch (e) {
        findings = [{ check: 'did-not-render', detail: String(e).split('\n')[0], where: route }];
      }

      if (findings.length > 0) {
        failures += findings.length;
        console.log(`\n${route} · ${scheme} · ${WIDTH} wide`);
        for (const f of findings) {
          tally.set(f.check, (tally.get(f.check) ?? 0) + 1);
          const box = f.box === undefined ? '' : ` ${JSON.stringify(f.box)}`;
          console.log(`  ${f.check.padEnd(24)} ${f.detail}${verbose ? box : ''}  — “${f.where}”`);
        }
      } else if (verbose) {
        console.log(`${route} · ${scheme} · ${WIDTH} wide  ok`);
      }
      await ctx.close();
    }
  }
}

if (!sheetsOnly) {
  console.log('\n' + '─'.repeat(64));
  const sizes = WIDTHS.map((w) => `${w} × ${HEIGHT}`).join(' and ');
  if (failures === 0) {
    console.log(`clean · ${routes.length} routes × 2 themes at ${sizes}`);
  } else {
    console.log(`${failures} findings at ${sizes}`);
    for (const [check, n] of [...tally].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${check}`);
    }
  }
  console.log(
    'not measurable here: safe-area checks (2, 5, 10), where the footer sits with the keyboard up (7), the boards (3).',
  );
}

// ---- pass two · sheet geometry across the device matrix -------------------
const sheetRoutes = asked.length > 0 ? asked.filter((r) => SHEET_ROUTES.includes(r)) : SHEET_ROUTES;
let sheetFailures = 0;
const sheetTally = new Map();

if (sheetRoutes.length > 0) {
  console.log('\n' + '═'.repeat(64));
  console.log('sheet geometry · doc 15 § 3 and § 4.7');
  console.log(
    `a sheet hugs its content and stops at inset.top + ${SHEET_GAP}; under ` +
      `${SHEET_FULL_HEIGHT_BELOW} points of usable height it is full-height.`,
  );

  for (const [name, w, h, top, bottom] of DEVICES) {
    const usable = h - top - bottom;
    console.log(
      `\n${name} · ${w} × ${h} · insets ${top}/${bottom} · usable ${usable} · ` +
        `cap ${top + SHEET_GAP}${usable < SHEET_FULL_HEIGHT_BELOW ? ' · all full-height' : ''}`,
    );
    for (const route of sheetRoutes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' });
      const page = await ctx.newPage();
      await page.addInitScript(eval(`(${FAKE_SAFE_AREA})`), { top, bottom });
      let m = null;
      try {
        await page.goto(urlOf(route), { waitUntil: 'networkidle' });
        await page.waitForTimeout(450);
        m = await page.evaluate(eval(`(${SHEET})`), {
          insetTop: top,
          insetBottom: bottom,
          gap: SHEET_GAP,
          floor: SHEET_FULL_HEIGHT_BELOW,
        });
      } catch (e) {
        m = { error: String(e).split('\n')[0] };
      }
      await ctx.close();

      if (m === null || m.error !== undefined) {
        console.log(`  ${route.padEnd(20)} did not render — ${m?.error ?? '?'}`);
        continue;
      }
      if (m.none) {
        // Not every route in the list draws a sheet cold: some need a night the
        // web build has no database for and render an empty push instead.
        if (verbose) console.log(`  ${route.padEnd(20)} no sheet on this route`);
        continue;
      }
      if (m.findings.length === 0) {
        if (verbose) console.log(`  ${route.padEnd(20)} ${m.at}  ok`);
        continue;
      }
      sheetFailures += m.findings.length;
      console.log(`  ${route.padEnd(20)} ${m.at}`);
      for (const f of m.findings) {
        sheetTally.set(f.check, (sheetTally.get(f.check) ?? 0) + 1);
        console.log(`      ${f.check.padEnd(30)} ${f.detail}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(64));
  if (sheetFailures === 0) {
    console.log(
      `sheets clean · ${sheetRoutes.length} routes × ${DEVICES.length} devices`,
    );
  } else {
    console.log(`${sheetFailures} sheet findings across ${DEVICES.length} devices`);
    for (const [check, n] of [...sheetTally].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${check}`);
    }
  }
}

await browser.close();
process.exit(failures + sheetFailures > 0 ? 1 : 0);
