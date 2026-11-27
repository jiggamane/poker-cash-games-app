import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import type { MoneyRule } from '@poker-club/core';
import { Card, CardRow, SectionLabel } from './Card';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

/**
 * The money-rules list — O4, and GR8 in the same idiom (rev 18 § 3).
 *
 * A caption, then one row per rule — its name, one line describing it, and
 * the switch at the right — and "Add a rule" directly under the list, so the
 * list ends where a reader is already looking.
 *
 * THE FULL BOARD (`money-rules`, approved): the rows are one lifted card, the
 * caption is the quiet section label, the description wraps rather than
 * truncating, nothing points (no chevron — the row is still the target that
 * opens the rule), and Add a rule is the quiet line with a plus under the card
 * rather than a row inside it.
 *
 * It lives in a component because the same list is drawn at three moments
 * and had been built twice: the club's defaults (GR8), tonight's snapshot
 * (O4 from the night), and the game's own rules before it opens (O4 from O1).
 * Only the level being edited differs, which is exactly what rev 18 closed.
 *
 * `onToggle` is optional because a switch means "off for tonight". The club's
 * defaults have no tonight to be off for, so GR8 passes nothing and the rows
 * carry no switch.
 *
 * `boxed` was the fourth moment, added by `design/handoff-game-settings/`: on
 * O1d the list sat inside a surface card while the other three drew a flat
 * hairline list. In the full board's look EVERY list is a card, so the two
 * variants draw the same and the prop is kept only so O1d's call still reads
 * as it did.
 *
 * IT CARRIES ITS OWN SIDE INSET (the sheet's 20) and stacks its parts 12
 * apart, so a host drops it into an unpadded column — which is what every host
 * that uses it is today. A host whose body is already the padded 20 column
 * puts it outside that padding, or the inset doubles.
 */
export function RuleList({
  caption,
  rules,
  describe,
  onOpen,
  onToggle,
  onAdd,
  extraRows,
  boxed: _boxed = false,
}: {
  caption: string;
  rules: readonly MoneyRule[];
  /** "$170 fixed · split by winners · Marek collects" — how much, who pays, who holds it. */
  describe: (rule: MoneyRule) => string;
  onOpen: (rule: MoneyRule) => void;
  /** Off without deleting. Omitted where "off tonight" has no meaning. */
  onToggle?: (rule: MoneyRule, active: boolean) => void;
  onAdd: () => void;
  /** Rows that belong inside the same list — GR8's unset destinations. */
  extraRows?: React.ReactNode;
  /** O1d: the list inside a card. Every list is a card now; see above. */
  boxed?: boolean;
}) {
  const t = useTheme();

  return (
    <View style={styles.block}>
      <SectionLabel text={caption} quiet />

      {(rules.length > 0 || extraRows !== undefined) && (
        <Card>
          {rules.map((rule, i) => {
            /* Off for tonight reads muted, as it always has: the rule is still
               there, and the switch beside it says why it is quiet. */
            const off = onToggle !== undefined && !rule.active;
            return (
              <CardRow
                key={rule.id}
                last={i === rules.length - 1 && extraRows === undefined}
                onPress={() => onOpen(rule)}
                name={off ? <Text style={{ color: t.muted }}>{rule.name}</Text> : rule.name}
                meta={describe(rule)}
                wrapMeta
                trail={
                  onToggle === undefined ? undefined : (
                    <Switch on={rule.active} onPress={() => onToggle(rule, !rule.active)} />
                  )
                }
              />
            );
          })}
          {extraRows}
        </Card>
      )}

      {/* The only way in from here. The three dashed cards it replaced asked
          the reader to choose a destination before they had seen the editor
          that explains what one is. The kit's `quiet('Add a rule', { icon: 'plus' })`. */}
      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [styles.add, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="plus" color={t.muted} size={z(16)} />
        <Text style={[styles.addLabel, { color: t.muted }]}>Add a rule</Text>
      </Pressable>
    </View>
  );
}

/**
 * The kit's `toggle()`: 46 × 28, a 22 knob. On is the ink fill with the knob
 * in its opposite colour; off is the outline with a white knob. No colour,
 * because colour is money.
 */
export function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.track,
        { backgroundColor: on ? t.text : t.outline, justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}
    >
      {/* `onTop` is the white of the ink top in both themes — the knob of an
          off switch is white on either sheet. */}
      <View style={[styles.knob, { backgroundColor: on ? t.onFill : t.onTop }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { marginHorizontal: z(20), gap: z(12) },
  // The kit's `.btnq`: 600 14 in the muted colour, 40 tall, centred, the icon 16.
  add: { minHeight: z(40), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(6) },
  addLabel: { fontSize: z(14), fontWeight: '600' },

  track: {
    flexShrink: 0,
    width: z(46),
    height: z(28),
    borderRadius: z(14),
    padding: z(3),
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: { width: z(22), height: z(22), borderRadius: z(11) },
});
