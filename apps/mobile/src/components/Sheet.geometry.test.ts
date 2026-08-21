import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { chrome } from '../design/tokens';

/**
 * HOW TALL A SHEET IS, held to the drawings and to the tool that checks them.
 *
 * `scripts/ui-audit.mjs` measures the built sheets on six devices, but it needs
 * a browser, a web export and a server — it is not part of `npm run check` and
 * it never will be. So the numbers it measures against are pinned here, where
 * they cost nothing to run, and this file is what makes them one number rather
 * than three: the token the app renders from, the constant the audit compares
 * to, and the pixel the boards were drawn at.
 *
 * The rule, from `design/handoff-rev18/docs/15-screen-geometry.md` § 3 and
 * § 4.7 and from the boards themselves:
 *
 *   A sheet HUGS ITS CONTENT and is anchored to the bottom of the phone. It
 *   grows until its top edge reaches `safe-area top + chrome.sheetGap`, and
 *   there it stops and the body scrolls inside it. Below 700 points of usable
 *   height there is no peek: every sheet is full-height.
 *
 * There is no second number for Android. The cap is written against the inset
 * the OS reports, so a 24dp status bar puts the same strip of the screen behind
 * above the panel that a 59pt Dynamic Island does.
 */

/** doc 15 § 1 — the reference frame, and the insets assumed on it. */
const REFERENCE = { width: 393, height: 852, top: 59, bottom: 34 };

/**
 * What the boards draw. Measured off all six `.dc.html` files: 70 sheet panels,
 * 35 states in two themes, and fifteen of them — every sheet with more in it
 * than fits — sit at exactly this top edge on the reference frame. The frame
 * builds it as `38 status row + 30 of the screen behind at .32 + 12 of gap`.
 */
const DRAWN_CAP = 80;

describe('the sheet cap', () => {
  it('puts the reference phone exactly where the boards draw it', () => {
    expect(REFERENCE.top + chrome.sheetGap).toBe(DRAWN_CAP);
  });

  it('clears the status bar on every device in the worked examples', () => {
    // doc 15 § 4, plus the two Androids `ui-audit` also runs. The cap is a gap
    // BELOW the inset, so on all of them there is room for the clock and for a
    // strip of the screen behind it — which is what says the thing underneath
    // is still there.
    const devices = [
      ['iPhone SE 3', 375, 667, 20, 0],
      ['iPhone 13 mini', 375, 812, 50, 34],
      ['iPhone 16 / 15 / 14', 393, 852, 59, 34],
      ['iPhone 16 Pro Max', 430, 932, 62, 34],
      ['Android · Pixel-class', 412, 915, 24, 24],
      ['Android · small', 360, 640, 24, 24],
    ] as const;

    for (const [name, , height, top, bottom] of devices) {
      const cap = top + chrome.sheetGap;
      expect(cap, `${name} rises into the status bar`).toBeGreaterThan(top);
      // And a sheet at the cap still has most of the phone to work in.
      expect(height - cap, `${name} has no room left`).toBeGreaterThan(400);
      expect(bottom).toBeGreaterThanOrEqual(0);
    }
  });

  it('is a gap from the inset, never a distance from the glass', () => {
    // THE PROPERTY THE OLD CODE LACKED. It capped the panel at a flat 18 from
    // the top of the window — the same top edge on every phone, which on a
    // Dynamic Island is 41 points behind it. A cap written against the inset
    // moves with the inset, point for point, and that is the whole fix.
    const cap = (insetTop: number) => insetTop + chrome.sheetGap;
    expect(cap(59) - cap(20)).toBe(39);
    expect(cap(24) - cap(20)).toBe(4);
    // And it is a gap, not a position: small, and the same one everywhere.
    expect(chrome.sheetGap).toBeGreaterThan(0);
    expect(chrome.sheetGap).toBeLessThan(60);
  });
});

describe('full-height promotion', () => {
  const usable = (height: number, top: number, bottom: number) => height - top - bottom;

  it('promotes the SE and leaves the mini its peek', () => {
    // doc 15 § 4's worked examples decide this, not § 4.7's parenthetical —
    // which names the mini as well and disagrees with its own table. The table
    // is the more specific statement: SE "all full-height", mini "peek
    // allowed". docs/sheet-heights.md records the discrepancy.
    expect(usable(667, 20, 0)).toBe(647);
    expect(usable(667, 20, 0)).toBeLessThan(chrome.sheetFullHeightBelow);

    expect(usable(812, 50, 34)).toBe(728);
    expect(usable(812, 50, 34)).toBeGreaterThan(chrome.sheetFullHeightBelow);
  });

  it('leaves every phone the reference size or larger alone', () => {
    expect(usable(852, 59, 34)).toBe(759);
    expect(usable(874, 62, 34)).toBe(778);
    expect(usable(932, 62, 34)).toBe(836);
    for (const u of [759, 778, 836]) expect(u).toBeGreaterThan(chrome.sheetFullHeightBelow);
  });

  it('promotes a small Android and not a Pixel-class one', () => {
    expect(usable(640, 24, 24)).toBeLessThan(chrome.sheetFullHeightBelow);
    expect(usable(915, 24, 24)).toBeGreaterThan(chrome.sheetFullHeightBelow);
  });
});

describe('the audit measures against these same numbers', () => {
  /*
   * `ui-audit.mjs` is plain node and cannot import a TypeScript token, so it
   * repeats the two constants. Repeated numbers drift, and a drifted one here
   * means the tool quietly stops checking what the app does. Reading them back
   * out of the file is ugly and it is the whole point: the two can only differ
   * for as long as it takes this to run.
   */
  const audit = fs.readFileSync(
    path.resolve(__dirname, '../../../../scripts/ui-audit.mjs'),
    'utf8',
  );
  const constant = (name: string): number => {
    const m = new RegExp(`const ${name} = (\\d+);`).exec(audit);
    expect(m, `${name} is not declared in scripts/ui-audit.mjs`).not.toBeNull();
    return Number(m?.[1]);
  };

  it('uses the same gap', () => {
    expect(constant('SHEET_GAP')).toBe(chrome.sheetGap);
  });

  it('uses the same floor', () => {
    expect(constant('SHEET_FULL_HEIGHT_BELOW')).toBe(chrome.sheetFullHeightBelow);
  });
});
