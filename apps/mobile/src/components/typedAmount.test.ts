import { describe, expect, it } from 'vitest';
import {
  amountOf,
  appendDigits,
  nothingTyped,
  offer,
  typedFigureSize,
  withBackspace,
  withDigits,
  type Typed,
} from './typedAmount';
import { moneyMaxFontScale } from '../design/tokens';

/**
 * B20. The keypad's rule is that a SUGGESTED figure is replaced by the first
 * key and a TYPED one is appended to, and it had one implementation on /log and
 * a different one on /entry — where a mistyped buy-in is put right, and where
 * appending is at its worst: the host is nearly always making the figure
 * SMALLER, and every digit of the amount they are correcting is in the way.
 *
 * These are the assertions that go red if a screen goes back to its own version
 * of it. They run in `npm run check`, which is the one that runs constantly.
 */

/** Tap a run of keys, one at a time, the way a thumb does. */
const punch = (start: Typed, keys: string[]): Typed => keys.reduce(withDigits, start);

describe('a suggested figure', () => {
  it('is replaced whole by the first digit, not appended to', () => {
    expect(amountOf(punch(offer(500), ['7']))).toBe(7);
  });

  it('keeps appending once the host has started typing', () => {
    expect(amountOf(punch(offer(500), ['7', '5']))).toBe(75);
    expect(amountOf(punch(offer(500), ['1', '2', '00']))).toBe(1200);
  });

  it('correcting a $500 rebuy to $50 takes two keys and no clearing', () => {
    expect(amountOf(punch(offer(500), ['5', '0']))).toBe(50);
  });

  it('is wiped by delete rather than losing one digit of itself', () => {
    expect(amountOf(withBackspace(offer(500)))).toBe(0);
    expect(withBackspace(offer(500)).digits).toBe('');
  });

  it('comes back as a suggestion when a preset is tapped again', () => {
    const typed = punch(offer(500), ['7', '5']);
    expect(amountOf(punch(offer(1000), ['2']))).toBe(2);
    expect(amountOf(offer(1000))).toBe(1000);
    expect(typed.touched).toBe(true);
    expect(offer(1000).touched).toBe(false);
  });

  it('empties the field when the offer is Custom', () => {
    expect(amountOf(offer(null))).toBe(0);
    expect(amountOf(punch(offer(null), ['4', '0', '0']))).toBe(400);
  });

  it('holds zero as a real answer — a busted stack counts out at nothing', () => {
    expect(amountOf(punch(offer(500), ['0']))).toBe(0);
    expect(amountOf(offer(0))).toBe(0);
  });
});

describe('nothing offered yet', () => {
  it('shows the caller’s own live figure until a key is pressed', () => {
    expect(amountOf(nothingTyped, 150)).toBe(150);
    expect(amountOf(punch(nothingTyped, ['7']), 150)).toBe(7);
    expect(amountOf(withBackspace(nothingTyped), 150)).toBe(0);
  });
});

describe('appendDigits', () => {
  it('refuses a leading zero and stops at nine digits', () => {
    expect(appendDigits('0', '5')).toBe('5');
    expect(appendDigits('', '00')).toBe('0');
    expect(appendDigits('123456789', '1')).toBe('123456789');
  });
});

/**
 * AND THAT THE FIGURE STAYS ON THE GLASS while it is being typed.
 *
 * The typed figure is the widest single string the app draws and the only one
 * that grows with the TABLE rather than with the phone, so the board's 68 is
 * right for the $500 it was drawn with and 60 points too wide for a nine-digit
 * night. `ui-journeys.mjs` caught it on the correction sheet at the millions
 * scale — `$1,200,000` from −7 to 367 on a 360-wide phone — and /log draws the
 * same figure at the same size, so it was two screens and a check away from
 * being three.
 */

/**
 * How wide a point of this figure is, measured rather than guessed:
 * `ui-journeys.mjs` reported `$99,000,000` at 68/800 as 347.1 points across at
 * 100% text. Eleven characters, so 31.55 each, so .464 of the font size —
 * tabular numerals, which are all one width, and `$` and `,` near enough.
 */
const PER_CHAR = 31.55 / 68;
/** The narrowest device in the matrix, which is what the journey runs at. */
const NARROWEST = 360;
/** What `ui-journeys.mjs` turns the reader's text up to on its second pass. */
const STRAIN = 1.2;

/** What the phone will actually draw it at, cap and all. */
const drawnWidth = (shown: string, board: number): number => {
  const size = typedFigureSize(shown, board)?.fontSize ?? board;
  return shown.length * PER_CHAR * size * moneyMaxFontScale;
};

describe('the figure being typed', () => {
  it('keeps the board’s size for every figure the board was drawn with', () => {
    expect(typedFigureSize('$500', 68)).toBe(null);
    expect(typedFigureSize('$14,900', 68)).toBe(null);
    expect(typedFigureSize('$999,999', 68)).toBe(null);
  });

  it('steps down past that, and keeps the boards’ −.05em', () => {
    expect(typedFigureSize('$1,200,000', 68)).toEqual({ fontSize: 58, letterSpacing: -2.9 });
    expect(typedFigureSize('$99,000,000', 68)).toEqual({ fontSize: 48, letterSpacing: -2.4 });
    // /share draws the same figure at 60, and steps in its own proportion.
    expect(typedFigureSize('$1,200,000', 60)).toEqual({ fontSize: 51, letterSpacing: -2.55 });
  });

  it('fits the narrowest phone at every amount the keypad will take', () => {
    // Nine digits is the pad's ceiling — `appendDigits` refuses a tenth.
    const tooWide = [];
    for (const n of [0, 5, 500, 14_900, 999_999, 1_200_000, 99_000_000, 999_999_999]) {
      const shown = '$' + n.toLocaleString('en-US');
      for (const board of [68, 60]) {
        const w = drawnWidth(shown, board);
        if (w >= NARROWEST) tooWide.push(`${shown} at ${board} → ${Math.round(w)}`);
      }
    }
    expect(tooWide).toEqual([]);
  });

  it('was off the phone before — both halves of the fix are load-bearing', () => {
    // What the journey measured: no cap, so the strained pass drew the figure
    // at the full 120% and it ran off both edges. 374 points, and it reported
    // −7.19…367.19 on the correction sheet at the millions scale.
    expect('$1,200,000'.length * PER_CHAR * 68 * STRAIN).toBeGreaterThan(NARROWEST);
    // And the cap alone would not have been enough. Nine digits at the board's
    // size is over the edge at 110% too — the step is what fits those.
    expect('$99,000,000'.length * PER_CHAR * 68 * moneyMaxFontScale).toBeGreaterThan(NARROWEST);
  });
});
