/**
 * The arithmetic behind Count up's header block — `design/handoff-count-up-header/`,
 * cut 6 September.
 *
 * IT IS OUT HERE SO IT CAN BE HELD TO. B43 is a block that truncated the one
 * figure the screen exists to state, and what stops that coming back is two
 * rules: a headline that STEPS DOWN in size rather than shortening, and a
 * threshold past which a sum abbreviates honestly rather than losing a digit.
 * Both are pure functions of a glyph count and an amount, so both are a test
 * in `npm run check` rather than something a browser has to be standing up to
 * notice. `countUpBlock.test.ts` is that test.
 *
 * The screen keeps everything that needs a theme or a token — the colours, the
 * bar's segments, the type. This is only the arithmetic.
 */

import type { BalanceCheck } from '@poker-club/core';

/**
 * THREE STATES, AND THE THIRD ONE IS OURS.
 *
 * The cut drives colour off a single subtraction: coral when the table is over
 * or short, green when the gap is nought. That is right for every night it
 * describes, and it has one hole this app already had a name for — a host
 * halfway through the count whose two figures happen to meet. `balanceCheck`
 * holds the state at *counting* until every seated player is in, including the
 * busted one whose $0 is a count, because a card that went green on a
 * coincidence would be congratulating somebody on a sum they have not
 * finished.
 *
 * So: coral whenever the gap is not nought, green when it is nought AND the
 * count is done, and amber — this app's "in progress", and the colour the
 * superseded block wore for the whole count — for the accident in between. One
 * state, on one arithmetic coincidence, recorded in `docs/screens.md`.
 */
export type Tone = 'off' | 'balanced' | 'counting';

export const toneOf = (b: BalanceCheck): Tone =>
  b.left !== 0 ? 'off' : b.state === 'balanced' ? 'balanced' : 'counting';

/**
 * HOW MUCH OF WHAT WENT IN HAS BEEN ACCOUNTED FOR, as a whole number.
 *
 * 100% IS RESERVED FOR A NIGHT THAT IS ACTUALLY LEVEL. Rounded, per the cut —
 * but `99.6%` reading as `100%` beside a headline saying $20 is missing is the
 * card disagreeing with itself in the same line of type, and rounding does
 * that from both sides now that the block states an over as well as a short.
 * So a rounded 100 that is not a real 100 gives one point back, in the
 * direction it came from.
 *
 * A night with nothing bought in is 0 rather than a division by zero.
 */
export const percent = (b: BalanceCheck): number => {
  if (b.boughtIn === 0) return 0;
  const raw = Math.round((b.accountedFor / b.boughtIn) * 100);
  if (raw !== 100 || b.left === 0) return raw;
  return b.left > 0 ? 99 : 101;
};

/**
 * THE HEADLINE IS FLUID, NOT FIXED — 38 points normally, stepping down to a 24
 * floor as the figure gets longer, rather than truncating or wrapping.
 *
 * The cut draws it as `clamp(24px, 9.5cqi, 38px)` against the card's inner
 * width and states the fallback for an environment with no container queries,
 * which react-native is: 38 up to 8 glyphs, 24 at 13, and the ramp between.
 * That is what this is, and the two agree at both ends and to within a point
 * in the middle.
 *
 * GLYPHS, NOT DIGITS, because the currency symbol is part of the figure and it
 * is three characters wide in a third of the ISO table. `+CHF12,345` is the
 * same width problem as `+₾12,345,678` and the count is what sees both.
 */
export const headlineSize = (glyphs: number): number =>
  glyphs <= 8 ? 38 : glyphs >= 13 ? 24 : Math.round((38 - (glyphs - 8) * 2.8) * 10) / 10;

/**
 * WHERE A FIGURE IN THE BLOCK STOPS BEING WRITTEN OUT IN FULL.
 *
 * A billion, which is to say: on any night anybody plays, never. That is the
 * point of the rebuilt block and it is what the old one could not do — the
 * headline scales down to fit instead of shortening, and the two sums sit at
 * 18 points on rows of their own, where `$123,456,789` is about 132 of the 317
 * the card has inside it. The cut verifies nine digits at 393 × 852 and this
 * is that bound, with the tenth decade left as somewhere to fall rather than a
 * place anything is expected to land.
 *
 * IT MOVES ON ITS OWN FOR A WIDER CURRENCY. `fitFor` in the app's money module
 * drops the threshold a decade per glyph of symbol, so a book kept in CHF
 * abbreviates at ten million and one kept in koruna at a hundred — three
 * glyphs in front of nine digits is a different measurement, and this is the
 * one place that would otherwise have to remember it.
 *
 * No precision is lost either way. The exact difference is what the night
 * turns on and it is stated to the unit one screen along, on E5.
 */
export const BLOCK_FITS = 1_000_000_000;
