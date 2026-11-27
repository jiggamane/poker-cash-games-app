import { type RoundingMode } from '@poker-club/core';
import { roundingRowLabel, roundingRowValue } from '../lib/money';
import { TermBar } from './TermBar';

/**
 * The rounding bar — `design/handoff-E2/docs/E2-rounding.md`, cut 31 August.
 *
 * NOT `RoundingRow`, which is the money-rules screen's entry for the same
 * setting: a captioned rule row with a sentence under it, sitting in a list of
 * other rules. This is the control bar the addendum draws — one line carrying
 * the step and what it costs. Two presentations of one
 * value, and the value and its words come from core so they cannot drift.
 *
 *     Rounding · nearest $10                         stacks snap to $10
 *
 * ONE ROW, THREE SCREENS, ONE OWNER. E2 owns the setting, because rounding
 * changes what a stack is worth and so has to be decided where stacks are
 * entered. E4 and E6 draw the identical row and open the identical sheet —
 * they display it, they do not own it — and having one component rather than
 * three copies is what stops the three screens ever disagreeing about what the
 * night is set to. The words are `ruleText.ts`'s for the same reason.
 *
 * IT IS PRESENT IN EVERY STATE, including before the first stack is counted:
 * the doc says so, and the reason is that a host who wants to settle in tens
 * wants to know it before they start rather than after. Off is a state of the
 * row, not its absence — `Rounding · off`, `stacks as counted`.
 *
 * NOT TAPPABLE IS A STATE TOO. Leave `onPress` out and the row is not a
 * target: a settled night is locked (rule 8), and a row that still opened
 * would be offering to re-round a record of what people actually paid.
 *
 * THE FULL BOARD draws it as a row in a lifted card with nothing pointing, and
 * since 27 November it IS `TermBar` with the rounding words — see there for the
 * look, `bare` and `last`. The label keeps `nativeID="rounding-label"`, which
 * `ui-journeys.mjs` reads.
 */
export function RoundingBar({
  mode,
  onPress,
  style,
  bare,
  last,
}: {
  mode: RoundingMode | null | undefined;
  onPress?: () => void;
  style?: object;
  /** The row alone, inside a card the screen draws — see `TermBar`. */
  bare?: boolean;
  /** With `bare`: the bottom row of that card. */
  last?: boolean;
}) {
  return (
    <TermBar
      label={roundingRowLabel(mode)}
      value={roundingRowValue(mode)}
      nativeID="rounding-label"
      {...(onPress === undefined ? {} : { onPress })}
      {...(style === undefined ? {} : { style })}
      {...(bare === undefined ? {} : { bare })}
      {...(last === undefined ? {} : { last })}
    />
  );
}
