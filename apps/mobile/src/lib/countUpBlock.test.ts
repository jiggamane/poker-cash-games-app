import { describe, expect, it } from 'vitest';
import { formatSigned, money, type BalanceCheck, type Money } from '@poker-club/core';
import { BLOCK_FITS, headlineSize, percent, toneOf } from './countUpBlock';

/**
 * Count up's header block — `design/handoff-count-up-header/`, and B43.
 *
 * The block's job is to state two sums and the gap between them without any of
 * the three being cut short. Everything below is a rule that keeps that true,
 * asked of the arithmetic rather than of a browser.
 */

const check = (over: Partial<BalanceCheck> = {}): BalanceCheck => ({
  boughtIn: money(5_000),
  cashedOut: money(2_120),
  counted: money(1_450),
  accountedFor: money(3_570),
  left: money(1_430),
  entries: 11,
  playersTotal: 6,
  playersIn: 4,
  countedPlayers: 2,
  cashedOutPlayers: 2,
  uncounted: ['petr' as BalanceCheck['uncounted'][number]],
  state: 'counting',
  ...over,
});

const level = (over: Partial<BalanceCheck> = {}): BalanceCheck =>
  check({
    accountedFor: money(5_000),
    counted: money(2_880),
    left: money(0),
    playersIn: 6,
    countedPlayers: 4,
    uncounted: [],
    state: 'balanced',
    ...over,
  });

describe('which colour the block is painted in', () => {
  it('is off — coral — whenever the two sums do not meet', () => {
    expect(toneOf(check())).toBe('off');
    expect(toneOf(check({ left: money(-1_000), state: 'over', uncounted: [] }))).toBe('off');
    expect(toneOf(check({ left: money(20), state: 'short', uncounted: [] }))).toBe('off');
  });

  it('is green only when the night is level AND the count is finished', () => {
    expect(toneOf(level())).toBe('balanced');
  });

  /*
   * THE ONE STATE THIS APP ADDS, and B22 is why. A host halfway through can
   * have the two sums meet by coincidence — the stacks still to come cancel
   * out — and green there is the card calling a night level over a stack
   * nobody has counted.
   */
  it('is amber when the figures meet by coincidence and stacks are still out', () => {
    expect(toneOf(check({ left: money(0), accountedFor: money(5_000) }))).toBe('counting');
  });
});

describe('the percentage accounted for', () => {
  it('rounds, per the cut', () => {
    expect(percent(check({ boughtIn: money(5_000), accountedFor: money(5_100) }))).toBe(102);
    expect(percent(check({ boughtIn: money(5_000), accountedFor: money(4_900) }))).toBe(98);
  });

  /*
   * 100% BESIDE A HEADLINE NAMING A GAP is the card disagreeing with itself in
   * one line of type, and rounding does it from both sides now that the block
   * states an over as well as a short.
   */
  it('never reads 100 on a night that is not level', () => {
    const short = check({ boughtIn: money(5_000), accountedFor: money(4_990), left: money(10) });
    expect(percent(short)).toBe(99);
    const over = check({ boughtIn: money(5_000), accountedFor: money(5_010), left: money(-10) });
    expect(percent(over)).toBe(101);
    expect(percent(level())).toBe(100);
  });

  it('is 0 on a night with nothing bought in, not a division by zero', () => {
    expect(percent(check({ boughtIn: money(0), accountedFor: money(0), left: money(0) }))).toBe(0);
  });
});

describe('the headline steps down rather than shortening — B43', () => {
  it('is 38 at the sizes a night is actually played in', () => {
    // `+$1,000`, `−$2,400`, `$0` — seven glyphs and under.
    expect(headlineSize('+$1,000'.length)).toBe(38);
    expect(headlineSize('−$24,000'.length)).toBe(38);
  });

  it('floors at 24 and never goes under it', () => {
    expect(headlineSize(13)).toBe(24);
    expect(headlineSize(20)).toBe(24);
    expect(headlineSize(120)).toBe(24);
  });

  it('is monotonic between the two ends', () => {
    const sizes = [...Array(14).keys()].map((n) => headlineSize(n + 1));
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]!);
  });

  /*
   * THE NUMBER THE CUT VERIFIES. Nine digits, signed, with a symbol in front of
   * them, is the widest thing the block promises to draw in full — and it has
   * to land on the floor rather than under it, because under it is a size
   * nobody measured.
   */
  it('puts the nine-digit stress case the cut verifies on the floor', () => {
    expect(formatSigned(money(123_456_789) as Money, '₾')).toBe('+₾123,456,789');
    expect(headlineSize('+₾123,456,789'.length)).toBe(24);
  });
});

describe('where a figure in the block gives up and abbreviates', () => {
  /*
   * A DECADE PAST THE NINE DIGITS THE CUT VERIFIES, so on any night anybody
   * plays, never. The old block abbreviated from $100,000 — half a card each
   * for two figures at 30/800 — and that is the threshold B43 is about.
   */
  it('is a billion, not a hundred thousand', () => {
    expect(BLOCK_FITS).toBe(1_000_000_000);
  });
});
