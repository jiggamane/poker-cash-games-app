import { StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatToFit } from '../lib/money';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { radius, tabular } from '../design/tokens';

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
 * THREE STATES, AND THE MIDDLE ONE IS NOT A HALFWAY COLOUR. Bone is the app's
 * off-the-table hue — money in motion, neither won nor lost — and it is the
 * right one here because a night part way through settling is not a night
 * going wrong. Coral is for nothing having moved at all.
 */
export function SettleStatus({ owed, anyPaid }: { owed: Money; anyPaid: boolean }) {
  const t = useTheme();

  if (owed === 0) {
    return (
      <View style={[styles.pill, styles.withCheck, { backgroundColor: t.winTint, borderColor: t.winEdge }]}>
        <Icon name="check" color={t.win} size={14} />
        <Text style={[styles.label, { color: t.win }]}>Settled</Text>
      </View>
    );
  }

  /* Something has moved, or nothing has. The figure is the same either way —
     what changes is whether the room is under way or has not started. */
  const fill = anyPaid ? t.offTableTint : t.dangerWash;
  const edge = anyPaid ? t.offTableEdge : t.dangerEdge;
  const ink = anyPaid ? t.offTable : t.loss;

  return (
    <View style={[styles.pill, { backgroundColor: fill, borderColor: edge }]}>
      <Text style={[styles.label, tabular, { color: ink }]} numberOfLines={1}>
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
 * card imports it. 1,000,000 is where the card's 34/800 stops fitting its half;
 * `$999,999` at the pill's 14/700 is about 70 points and fits with room to
 * spare, so the pill can afford the card's limit and the card cannot afford a
 * looser one.
 */
export const SETTLE_FITS = 1_000_000;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  /* The check eats into the leading padding rather than sitting beside it. */
  withCheck: { paddingLeft: 9 },
  label: { fontSize: 14, fontWeight: '700' },
});
