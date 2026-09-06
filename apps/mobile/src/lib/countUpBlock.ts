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
 * NOTHING IS COLOURED UNTIL EVERY STACK IS IN — 6 September, on the owner's
 * instruction, and it is this app's one departure from the cut's colour rule.
 *
 * The cut drives colour off a single subtraction: coral when the table is over
 * or short, green when the gap is nought. That reads right at the END of a
 * count and it is wrong for the whole of the middle of one. A host who has
 * counted two of six stacks is short by four stacks — of course they are — and
 * the block spent that entire stretch in the colour this app reserves for money
 * that has gone missing, at its largest type, over a night where nothing at all
 * has gone wrong yet. `−$2,880 · 42%` in coral is an alarm about arithmetic
 * that has not finished happening.
 *
 * So the gap is plain text while any seated player is still to count, and the
 * block takes a verdict's colour only once there is a verdict to take: green
 * when the night comes out level, coral when it does not.
 *
 * IT IS THE SAME RULE B22 IS ABOUT, read the other way. That entry is a block
 * that said DONE while a cash-out was missing; the gate `balanceCheck` grew for
 * it — *counting* holds until every seated player is in, including the busted
 * one whose $0 is a count — is exactly the gate this reads. A card may not
 * congratulate a host on a sum they have not finished, and it may not accuse
 * them over one either.
 *
 * AND IT IS WHAT REV 18 SAID BEFORE THE CUT: "the card stays neutral — no
 * green, no red — until counted equals what is on the table"
 * (`13-after-the-night.md`). The instruction restores that sentence over a
 * newer block.
 */
export type Tone = 'off' | 'balanced' | 'counting';

export const toneOf = (b: BalanceCheck): Tone =>
  b.state === 'counting' ? 'counting' : b.left === 0 ? 'balanced' : 'off';

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
