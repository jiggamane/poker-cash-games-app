/*
 * Hold each built screen against the frame it was drawn as.
 *
 * `ui-audit.mjs` asks whether a screen obeys the rules. This asks the older
 * question — does it look like the drawing — for every pair at once, and it
 * answers in numbers rather than in an opinion about a screenshot.
 *
 *   npm run ui                       # build and serve first
 *   node scripts/ui-frames.mjs               # every pair, dark
 *   node scripts/ui-frames.mjs --light
 *   node scripts/ui-frames.mjs /session      # one pair
 *   node scripts/ui-frames.mjs --shots       # also write board|app PNGs
 *
 * WHAT IT COMPARES, and why these four. A board frame and a React Native tree
 * do not share a DOM, so element-for-element diffing is noise. These are the
 * measurements that carry a screen's identity and that a person notices when
 * they drift:
 *
 *   ground   the colour behind everything — the surface ladder starts here
 *   title    size, weight and tracking of the screen's own name
 *   footer   how tall the pinned block at the foot is
 *
 * A pair is "off" when a number differs by more than a point (or any colour
 * differs at all). Everything else — copy, seat counts, the sample night's
 * figures — is deliberately not compared: the board draws one night and the
 * app renders another.
 *
 * TWO THINGS TO KNOW BEFORE READING A RESULT AS DRIFT:
 *
 *   · A ROUTE OPENED COLD IS NOT THE SCREEN. Half these screens need a night
 *     or a club, and the web build has neither — SQLite does not run there —
 *     so they render their empty state and measure as one. `title top` in the
 *     hundreds on a sheet route means exactly that, not a title in the wrong
 *     place. Those pairs are checked on the device.
 *   · THE BROWSER HAS NO SAFE AREA. A board's footer includes the home
 *     indicator band; here nothing stands in for it, so footers read short by
 *     up to the inset. Differences inside 25 are not reported for that reason.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
import { launchOptions } from './chromium.mjs';

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
/*
 * Rev 18's boards, which is where all but one frame lives.
 *
 * A pair may name `boards:` of its own when a later partial cut has redrawn
 * that screen — `design/handoff-E2/` is the first, and holding E2 against the
 * block it replaced would report the new screen as drift from a drawing that
 * has been superseded.
 */
const BOARDS = 'design/handoff-rev18/boards';
const OUT = process.env.UI_FRAMES_OUT ?? '.ui-check/frames';
const light = process.argv.includes('--light');
const shots = process.argv.includes('--shots');
const asked = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/**
 * Route → the frame it is drawn as, and what not to compare on it.
 *
 * Where a route covers more than one frame — /pick is both the buy-in and the
 * cash-out picker — the frame named is the one the route opens in by default.
 *
 * `skip: ['footer']` is for a screen that has no pinned footer in either the
 * drawing or the build. The measurement then lands on whatever content happens
 * to sit at the bottom — a settings section, the last row of a list — and
 * reports a difference between two things that are not the same object.
 *
 * `at` is the URL to open when the bare route is not the state the frame
 * draws. A screen that is always pushed with a parameter — the player card,
 * one entry — renders its empty case when it is opened cold, and comparing an
 * empty sheet to a drawn full one reports a difference that is the check's own
 * fault. The ids are the sample night's, which are named for this.
 *
 * `unreachable` marks a pair whose state cannot be opened by URL at all — a
 * screen that only exists after a night has been counted and settled. The app
 * renders its empty case, and comparing that to a full drawing measures
 * nothing. It reports as not measurable rather than as drift, because a check
 * that cannot see something must say so rather than guess.
 *
 * `known` names a check whose difference has been decided — `{ footer: 'why' }`.
 * It prints the reason instead of the delta, because a check that keeps
 * reporting a settled question teaches people to skim the report. Unlike
 * `skip` it still measures: if the drawn side changes, the reason is there to
 * be re-read against it.
 */
const PAIRS = [
  ['/', 'Journey Map 1 - Club and people', 'H3 Home · live'],
  ['/groups', 'Journey Map 1 - Club and people', 'GR2 Your groups', { skip: ['footer'] }],
  ['/new-group', 'Journey Map 1 - Club and people', 'GR3 New group · step 1'],
  ['/players', 'Journey Map 1 - Club and people', 'GR4 Players', { skip: ['footer'] }],
  ['/member', 'Journey Map 1 - Club and people', 'GR5 Player · edit'],
  ['/hand-over', 'Journey Map 1 - Club and people', 'GR9 Hand over admin'],
  ['/settings', 'Journey Map 1 - Club and people', 'GR7 Settings', { skip: ['footer'] }],
  ['/club-rules', 'Journey Map 1 - Club and people', 'GR8 Money rules', { skip: ['footer'] }],
  ['/bill-rules', 'Journey Map 1 - Club and people', 'L5 Bill rules', {
      known: {
        panel:
          'drawn as a pushed screen, built as a sheet — 09-navigation: a screen ' +
          'that ends with a Save is a sheet, and the two vocabularies must not mix',
      },
    }],
  ['/piggy-bank-rules', 'Journey Map 1 - Club and people', 'L6 Piggy bank rules', {
      known: {
        panel:
          'drawn as a pushed screen, built as a sheet — 09-navigation: a screen ' +
          'that ends with a Save is a sheet, and the two vocabularies must not mix',
      },
    }],
  ['/new-night', 'Journey Map 1 - Club and people', 'O1 New session'],
  ['/money-rules', 'Journey Map 1 - Club and people', 'O4 Money rules'],
  ['/rule', 'Journey Map 1 - Club and people', 'O5 Rule editor'],

  ['/session', 'Journey Map 2 - The night', 'T1 Tonight · resting'],
  ['/player', 'Journey Map 2 - The night', 'T2 Player card · at the table', { at: '/player?id=seed-petr' }],
  ['/pick', 'Journey Map 2 - The night', 'N4 Buy-in · pick a player'],
  ['/entry', 'Journey Map 2 - The night', 'N10 Correct an entry', { at: '/entry?id=seed-entry-6' }],
  ['/seat', 'Journey Map 2 - The night', 'N7 Seat a new player'],
  // N3 is retired (rev 17): the player card is T2, the sheet. /log is the
  // amount keypad an entry is made on.
  ['/log', 'Journey Map 2 - The night', 'N5 First buy-in · amount'],
  ['/bill', 'Journey Map 2 - The night', 'L1 The bill', {
      known: {
        panel:
          'drawn as a pushed screen, built as a sheet — 09-navigation: a screen ' +
          'that ends with a Save is a sheet, and the two vocabularies must not mix',
      },
    }],
  ['/spend', 'Journey Map 2 - The night', 'L2 Add a spend', {
      known: {
        panel:
          'drawn as a pushed screen, built as a sheet — 09-navigation: a screen ' +
          'that ends with a Save is a sheet, and the two vocabularies must not mix',
      },
    }],
  ['/watch', 'Journey Map 2 - The night', 'X1a Watching a live night', { skip: ['footer'] }],

  /*
   * E2 is drawn in `design/handoff-E2/`, not on Journey Map 3 — that cut
   * supersedes the status block rev 18 drew, and only that block. The frame is
   * the whole screen at layout 2a, mid-count.
   *
   * NO LIGHT TWIN EXISTS YET, which the handoff says outright under *Still to
   * draw*, so `--light` finds no frame for this pair and says so.
   */
  [
    '/count-up',
    'Settled Status',
    'E2 Count up · combined',
    { boards: 'design/handoff-E2/boards' },
  ],
  ['/deductions', 'Journey Map 3 - Settle and the book', 'E3 Deductions'],
  [
    '/settle-up',
    'Journey Map 3 - Settle and the book',
    'E4 Settle up',
    {
      known: {
        footer:
          'the drawn footer carries Share and Export; both are absent by decision — ' +
          'they had no destination, and a dead control on the last screen of the ' +
          'night is worse than none',
      },
    },
  ],
  ['/settled', 'Journey Map 3 - Settle and the book', 'E6 Night settled'],
  [
    '/payments',
    'Journey Map 3 - Settle and the book',
    'E7 Payments',
    { unreachable: 'only exists once a night has been counted and settled' },
  ],
  [
    '/nudge',
    'Journey Map 2 - The night',
    'E8 Nudge the table',
    { unreachable: 'only exists once a night has been counted and settled' },
  ],
  ['/games', 'Journey Map 3 - Settle and the book', '1A My games · Regular', { skip: ['footer'] }],
  ['/stats', 'Journey Map 3 - Settle and the book', 'G4 My stats', { skip: ['footer'] }],
];

/**
 * The four measurements, taken the same way on both sides.
 *
 * `root` is the frame element on a board and the document on the app. Sizes
 * are rounded to a tenth: a board states whole points and the app computes in
 * floats, and a difference of .04 is arithmetic, not drift.
 */
const MEASURE = `(arg) => {
  const { side } = arg;
  const root = side === 'board' ? arg.el : document.querySelector('#app-root') ?? document.body;
  const px = (v) => Math.round(v * 10) / 10;
  const box = (el) => el.getBoundingClientRect();
  const origin = box(root);

  const hex = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map(Number);
    if (a !== undefined && a < 0.99) return null;
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const inside = [...root.querySelectorAll('*')];

  /*
   * WHERE ZERO IS. A board frame draws the system status bar — doc 15 says so,
   * and says not to build it — so its content starts below a row the app does
   * not have. Measuring both from the top of the frame compares a drawing of
   * iOS with the absence of one, and reports 40 points of drift that are not
   * there. Zero is the bottom of the drawn status row on a board, and the top
   * of the app's own root in the build (the safe-area inset is 0 in a browser,
   * which is the same place).
   */
  let zero = origin.top;
  if (side === 'board') {
    for (const el of inside) {
      const t = (el.textContent || '').trim();
      if (!/^\\d{1,2}:\\d{2}$/.test(t)) continue;
      // ONLY AT THE VERY TOP. A clock face is not the only 9:41 on a board —
      // a ledger draws the time of every entry, a settled night draws when it
      // ended — and taking the first one found put zero halfway down the
      // frame and reported the title as sitting fifty points above the screen.
      if (box(el).top - origin.top > 60) continue;
      const row = el.parentElement ?? el;
      zero = Math.max(zero, box(row).bottom);
      break;
    }
  }

  // GROUND — what the screen is painted on. The board frame paints its own;
  // in the app it is the outermost full-bleed painted box, never the page's
  // own body colour, which belongs to the browser and not to the design.
  let ground = hex(getComputedStyle(root).backgroundColor);
  for (const el of inside) {
    const b = box(el);
    if (b.width >= origin.width - 2 && b.height >= origin.height - 2) {
      const c = hex(getComputedStyle(el).backgroundColor);
      if (c !== null) { ground = c; break; }
    }
  }

  // TITLE — asked for by name rather than guessed at. The boards write the
  // screen's name as an h1/h2; the app marks its own. Guessing "the biggest
  // text near the top" finds the money instead, every time.
  // A sheet hugs its content and sits at the foot of the phone, so its title's
  // distance from the top of the SCREEN says nothing. Zero for a sheet is the
  // top of its own panel, on both sides.
  const panelEl = [...inside].find((el) => {
    const st = getComputedStyle(el);
    const b = box(el);
    return (
      (parseFloat(st.borderTopLeftRadius) || 0) >= 20 &&
      b.width >= origin.width - 6 &&
      origin.bottom - b.bottom <= 30 &&
      b.height > 120
    );
  }) ?? null;
  if (panelEl !== null) zero = box(panelEl).top;

  // A BOARD DRAWS THE SCREEN BEHIND THE SHEET. Its own h1 is that screen's
  // name — "Your groups" under the New group sheet — and taking it compares
  // our sheet's title against the title of something else entirely. When
  // there is a panel, the title is the heading inside it.
  const titleEl =
    side === 'board'
      ? (panelEl?.querySelector('h1, h2, h3') ?? root.querySelector('h1, h2'))
      : document.querySelector('#screen-title, #sheet-title');
  const title =
    titleEl === null
      ? null
      : (() => {
          const s = getComputedStyle(titleEl);
          const b = box(titleEl);
          return {
            text: (titleEl.textContent || '').trim().slice(0, 24),
            size: px(parseFloat(s.fontSize)),
            weight: Number(s.fontWeight) || 400,
            tracking: px(parseFloat(s.letterSpacing) || 0),
            top: px(b.top - zero),
          };
        })();

  // FOOTER — the pinned block at the foot. Bounded: a full-height container
  // also ends at the bottom, and counting it makes every screen 852 tall.
  let footer = null;
  for (const el of inside) {
    const b = box(el);
    if (b.width < origin.width * 0.5 || b.height < 24 || b.height > 220) continue;
    if (origin.bottom - b.bottom > 60) continue;
    const h = px(origin.bottom - b.top);
    if (footer === null || h > footer) footer = h;
  }

  // A SHEET IS MEASURED AT ITS PANEL. The ground behind it belongs to the
  // screen it covers; what has to match the drawing is the panel itself.
  const panel =
    panelEl === null
      ? null
      : {
          colour: hex(getComputedStyle(panelEl).backgroundColor),
          radius: px(parseFloat(getComputedStyle(panelEl).borderTopLeftRadius) || 0),
        };

  return { ground, title, footer, panel };
}`;

const near = (a, b, tol = 1.2) =>
  a === null || b === null || a === undefined || b === undefined
    ? a === b
    : Math.abs(a - b) <= tol;

/**
 * The boards fetch React and Babel from unpkg at run time, and a sandboxed
 * machine cannot reach it — the board then boots into nothing and every frame
 * measures 0 × 0, which reads as "the whole app is wrong" rather than "the
 * page never loaded". The three bundles are vendored beside this script and
 * served to the page from disk, so a board renders the same offline as on a
 * laptop with a network.
 */
const VENDOR = {
  'react.production.min.js': 'scripts/vendor/react.production.min.js',
  'react-dom.production.min.js': 'scripts/vendor/react-dom.production.min.js',
  'babel.min.js': 'scripts/vendor/babel.min.js',
};

async function serveVendored(page) {
  await page.route('**unpkg.com/**', async (route) => {
    const file = VENDOR[route.request().url().split('/').pop()];
    if (file === undefined || !fs.existsSync(file)) return route.abort();
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: fs.readFileSync(file),
    });
  });
}

const browser = await chromium.launch(launchOptions());
const pairs = asked.length > 0 ? PAIRS.filter((p) => asked.includes(p[0])) : PAIRS;
if (shots) fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const [route, board, label, opts = {}] of pairs) {
  const file = path.resolve(opts.boards ?? BOARDS, board + '.dc.html');
  const frameLabel = light ? `${label} · light` : label;

  // ---- the drawing ---------------------------------------------------------
  const sel = `[data-screen-label="${frameLabel.replace(/"/g, '\\"')}"]`;
  const boardCtx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const boardPage = await boardCtx.newPage();
  await serveVendored(boardPage);
  await boardPage.goto('file://' + file);
  // The board compiles itself in the browser; a frame is not laid out until
  // it has. Waiting for the element to have a size is the only honest signal.
  await boardPage
    .waitForFunction(
      (s) => {
        const el = document.querySelector(s);
        return el !== null && el.getBoundingClientRect().height > 100;
      },
      sel,
      { timeout: 20000 },
    )
    .catch(() => {});
  const el = await boardPage.$(sel);
  let drawn = null;
  if (el !== null) {
    drawn = await boardPage.evaluate(eval(`(${MEASURE})`), { side: 'board', el });
    if (shots) {
      await el.screenshot({
        path: path.join(OUT, `${route.replace(/\W+/g, '_') || 'home'}.board.png`),
      });
    }
  }
  await boardCtx.close();

  // ---- the build -----------------------------------------------------------
  const appCtx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    colorScheme: light ? 'light' : 'dark',
  });
  const appPage = await appCtx.newPage();
  let built = null;
  try {
    await appPage.goto(BASE + (opts.at ?? route), { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(500);
    built = await appPage.evaluate(eval(`(${MEASURE})`), { side: 'app' });
    if (shots) {
      await appPage.screenshot({
        path: path.join(OUT, `${route.replace(/\W+/g, '_') || 'home'}.app.png`),
      });
    }
  } catch (e) {
    built = { error: String(e).split('\n')[0] };
  }
  await appCtx.close();

  rows.push({ route, label, drawn, built, opts });
}
await browser.close();

// ---- the report ------------------------------------------------------------
const pad = (s, n) => String(s ?? '—').padEnd(n);
let off = 0;
let unmeasured = 0;
console.log(`frame by frame · ${light ? 'light' : 'dark'} · app at 393 × 852\n`);
for (const { route, label, drawn, built, opts } of rows) {
  if (drawn === null) {
    console.log(`${pad(route, 20)} no frame called “${label}”`);
    continue;
  }
  if (built === null || built.error !== undefined) {
    console.log(`${pad(route, 20)} the app did not render — ${built?.error ?? '?'}`);
    off += 1;
    continue;
  }
  if (opts.unreachable !== undefined) {
    console.log(`${pad(route, 20)} ${pad(label, 34)} not measurable — ${opts.unreachable}`);
    unmeasured += 1;
    continue;
  }
  const notes = [];
  const decided = [];
  const known = opts.known ?? {};
  /** A difference on `check`, filed as drift unless that check is settled. */
  const differs = (check, text) => {
    if (known[check] === undefined) notes.push(text);
    else if (!decided.includes(known[check])) decided.push(known[check]);
  };

  if (built.ground !== null && drawn.ground !== built.ground)
    differs('ground', `ground ${drawn.ground} → ${built.ground}`);
  if (drawn.title !== null && built.title !== null) {
    if (!near(drawn.title.size, built.title.size))
      differs('title', `title ${drawn.title.size} → ${built.title.size}`);
    if (drawn.title.weight !== built.title.weight)
      differs('title', `weight ${drawn.title.weight} → ${built.title.weight}`);
    if (!near(drawn.title.tracking, built.title.tracking, 0.3))
      differs('title', `tracking ${drawn.title.tracking} → ${built.title.tracking}`);
    if (!near(drawn.title.top, built.title.top, 4))
      differs('title', `title top ${drawn.title.top} → ${built.title.top}`);
  } else if (drawn.title !== null) {
    differs('title', 'no title found in the build');
  }
  // The drawn footer includes the home-indicator band; the browser has no
  // safe-area inset to stand in for it, so anything inside 25 is that gap.
  if (!(opts.skip ?? []).includes('footer') && !near(drawn.footer, built.footer, 25))
    differs('footer', `footer ${drawn.footer} → ${built.footer}`);
  if (drawn.panel !== null || built.panel !== null) {
    if (drawn.panel === null || built.panel === null) {
      differs(
        'panel',
        `panel ${drawn.panel === null ? 'none' : 'drawn'} → ${built.panel === null ? 'none' : 'built'}`,
      );
    } else {
      if (drawn.panel.colour !== built.panel.colour)
        differs('panel', `panel ${drawn.panel.colour} → ${built.panel.colour}`);
      if (!near(drawn.panel.radius, built.panel.radius, 1))
        differs('panel', `radius ${drawn.panel.radius} → ${built.panel.radius}`);
    }
  }

  const settled = decided.map((why) => `decided: ${why}`);
  if (notes.length === 0) {
    console.log(`${pad(route, 20)} ${pad(label, 34)} ${['ok', ...settled].join(' · ')}`);
  } else {
    off += 1;
    console.log(`${pad(route, 20)} ${pad(label, 34)} ${[...notes, ...settled].join(' · ')}`);
  }
}
console.log('\n' + '─'.repeat(72));
const measured = rows.length - unmeasured;
console.log(
  (off === 0
    ? `every pair matches · ${measured} screens`
    : `${off} of ${measured} differ · drawn → built`) +
    (unmeasured === 0 ? '' : ` · ${unmeasured} not measurable here`),
);
console.log('copy, figures and seat counts are not compared: the board draws one night, the app renders another.');
