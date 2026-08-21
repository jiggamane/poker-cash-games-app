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
 *   · Row heights across SE and Pro Max need those widths; pass them with
 *     UI_AUDIT_WIDTH. A figure that fits at 393 can still be cut at 375, so
 *     the clipping check is worth running at both.
 *   · IT ONLY SEES THE FIGURES THE SEEDED NIGHT HOLDS, which are small. A
 *     column that fits $500 and not $500,000 passes here and fails at a real
 *     table. `scripts/ui-journeys.mjs` plays a big night through the app and
 *     runs these same checks on what comes out.
 */

import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const WIDTH = Number(process.env.UI_AUDIT_WIDTH ?? 393);
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
  '/count-up', '/stands', '/deductions', '/settle-up', '/settled', '/payments', '/nudge',
  '/games', '/stats', '/players', '/member', '/groups', '/new-group', '/new-night',
  '/settings', '/club-rules', '/money-rules', '/rule', '/bill-rules', '/piggy-bank-rules',
  '/house-rules', '/sign-in', '/claim', '/invite', '/watch', '/hand-over',
];

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

const browser = await chromium.launch();
const routes = asked.length > 0 ? asked : ROUTES;
let failures = 0;
const tally = new Map();

for (const route of sheetsOnly ? [] : routes) {
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
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(450);
      findings = await page.evaluate(ROOM);

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
      console.log(`\n${route} · ${scheme}`);
      for (const f of findings) {
        tally.set(f.check, (tally.get(f.check) ?? 0) + 1);
        const box = f.box === undefined ? '' : ` ${JSON.stringify(f.box)}`;
        console.log(`  ${f.check.padEnd(18)} ${f.detail}${verbose ? box : ''}  — “${f.where}”`);
      }
    } else if (verbose) {
      console.log(`${route} · ${scheme}  ok`);
    }
    await ctx.close();
  }
}

if (!sheetsOnly) {
  console.log('\n' + '─'.repeat(64));
  if (failures === 0) {
    console.log(`clean · ${routes.length} routes × 2 themes at ${WIDTH} × ${HEIGHT}`);
  } else {
    console.log(`${failures} findings at ${WIDTH} × ${HEIGHT}`);
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
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
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
