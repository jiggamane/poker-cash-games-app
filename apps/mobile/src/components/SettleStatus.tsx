import { StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatMoney } from '../lib/money';
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
      <Text style={[styles.label, tabular, { color: ink }]}>{`${formatMoney(owed)} left`}</Text>
    </View>
  );
}

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
