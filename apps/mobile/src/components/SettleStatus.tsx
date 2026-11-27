import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { type Money } from '@poker-club/core';
import { formatToFit } from '../lib/money';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';
import { tabular } from '../design/tokens';

/**
 * The status pill — `design/handoff-game-end/`, cut 6 September.
 *
 * ONE COMPONENT ON PURPOSE, and the cut says why: *"the amount is the sum of
 * unpaid transfers, so the pill and 2a's 'Left to move' figure are the same
 * number by construction. Never let them be computed in two places."* Both
 * screens are handed the figure `paymentProgress` already worked out, and
 * neither of them adds a column up to get it.
 *
 * IT IS NOT ABOUT THE RESULT. A settled night is settled whether or not a
 * single lari has moved — that separation is older than this cut and nothing
 * here touches it. What the pill states is how much cash is still to change
 * hands, which is the one fact about a closed night that keeps changing over
 * the following week, and it is why `/settled` can carry both this and a meta
 * line ending `settled` without the two disagreeing.
 *
 * ⚠ `to move`, WHERE THE CUT WROTE `left`, AND THE WORD IS THE WHOLE POINT OF
 * THE CHANGE. On `/settled` this pill sits in the same card as `MONEY IN PLAY`,
 * a foot under a screen the host has just spent ten minutes counting stacks on
 * — and `₾4,550 left`, in coral, beside the money that was on the table, reads
 * as *₾4,550 of it is still unaccounted for*. It is not: the count balanced, and
 * this is the cash that has yet to change hands over the following week. The
 * host who reported it had counted the night to zero and read the pill as the
 * count having failed, which is the worst thing a status can do — send somebody
 * back to re-count a night that was right.
 *
 * `to move` is 2a's own word for the same figure — the card it sits in over
 * there is headed `Left to move` — so this is the cut's vocabulary rather than
 * a new one, and the two screens now say the same thing about the same number.
 * Owner's call, 8 September; recorded in `docs/screens.md`.
 *
 * THREE STATES UNTIL THE FULL BOARD, which draws two: an amount to move, and
 * `Settled`. See the note in the body.
 */
export function SettleStatus({ owed }: { owed: Money; anyPaid: boolean }) {
  const t = useTheme();

  /*
   * ⚠ THE FULL BOARD DRAWS THE PILL PLAIN (`payments`, `payments-settled`,
   * approved): the kit's `pill` — `raised`, the text ink — and `Settled` in the
   * win colour. No coral wash for nothing moved and no bone for part of it:
   * the look keeps red for chips and has no bone token. The figure in the pill
   * says how much is left either way. `anyPaid` stays in the props, so the two
   * callers keep stating it, for the day the board draws the middle state.
   */
  if (owed === 0) {
    return (
      <View style={[styles.pill, { backgroundColor: t.raised }]}>
        <Text style={[styles.label, { color: t.win }]}>Settled</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: t.raised }]}>
      <Text style={[styles.label, tabular, { color: t.text }]} numberOfLines={1}>
        {`${formatToFit(owed, SETTLE_FITS)} to move`}
      </Text>
    </View>
  );
}

/**
 * WHERE BOTH THIS AND THE CARD BESIDE IT STOP PRINTING A FIGURE IN FULL, and it
 * has to be one number for both.
 *
 * The cut's rule is that the pill and `Left to move` are *"the same number by
 * construction"*. Core makes them the same VALUE — one `paymentProgress` call —
 * and that is only half of it: a card abbreviating at one threshold beside a
 * pill that never abbreviates states `$1.2M` next to `$1,152,150`, which is one
 * value and two numbers as far as anybody reading the screen is concerned. A
 * big night found exactly that.
 *
 * So the threshold lives here, with the tighter of the two figures, and the
 * card imports it. 1,000,000 is where the card's figure stops fitting its half;
 * `$999,999` at the pill's 12/700 is about 70 points and fits with room to
 * spare, so the pill can afford the card's limit and the card cannot afford a
 * looser one.
 */
export const SETTLE_FITS = 1_000_000;

const styles = StyleSheet.create({
  /* The kit's `pill`: `6px 10px`, fully round, 700 12. */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(6),
    paddingVertical: z(6),
    paddingHorizontal: z(10),
    borderRadius: 999,
  },
  label: { fontSize: z(12), fontWeight: '700' },
});
