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
 *
 * WHAT IT CANNOT SEE, and why, so nobody reads a pass as more than it is:
 *
 *   · The safe-area insets are 0 on the web, so the checks that measure
 *     against them — the footer button 28 above the screen bottom, nothing
 *     under the status bar or the home indicator, the indicator's own colour —
 *     cannot be measured here. They are device checks.
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
const asked = process.argv.slice(2).filter((a) => !a.startsWith('--'));

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

const browser = await chromium.launch();
const routes = asked.length > 0 ? asked : ROUTES;
let failures = 0;
const tally = new Map();

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
await browser.close();
