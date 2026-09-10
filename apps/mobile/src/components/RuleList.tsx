import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MoneyRule } from '@poker-club/core';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { space, type } from '../design/tokens';

/**
 * The money-rules list — O4, and GR8 in the same idiom (rev 18 § 3).
 *
 * ONE HAIRLINE LIST, not a stack of cards: a caption, then one row per rule —
 * its name with a chevron, one line describing it, and the switch at the right
 * — and "Add a rule" as the last row rather than a button somewhere else, so
 * the list ends where a reader is already looking.
 *
 * It lives in a component because the same list is now drawn at three moments
 * and had been built twice: the club's defaults (GR8), tonight's snapshot
 * (O4 from the night), and the game's own rules before it opens (O4 from O1).
 * Only the level being edited differs, which is exactly what rev 18 closed.
 *
 * `onToggle` is optional because a switch means "off for tonight". The club's
 * defaults have no tonight to be off for, so GR8 passes nothing and the rows
 * carry no switch.
 *
 * `boxed` is the fourth moment, added by `design/handoff-game-settings/`: on
 * O1d the list sits inside the same surface card as the money settings above
 * it, hairlines between the rows rather than under them, because the two
 * blocks are read as one screen and a flat list beside a card reads as two
 * ranks of setting. It is OFF by default and the three older screens do not
 * pass it — a sheet whose whole body is one list has nothing to be boxed
 * against.
 */
export function RuleList({
  caption,
  rules,
  describe,
  onOpen,
  onToggle,
  onAdd,
  extraRows,
  boxed = false,
}: {
  caption: string;
  rules: readonly MoneyRule[];
  /** "$170 fixed · split by winners · Marek collects" — how much, who pays, who holds it. */
  describe: (rule: MoneyRule) => string;
  onOpen: (rule: MoneyRule) => void;
  /** Off without deleting. Omitted where "off tonight" has no meaning. */
  onToggle?: (rule: MoneyRule, active: boolean) => void;
  onAdd: () => void;
  /** Rows that belong inside the same hairline list — GR8's unset destinations. */
  extraRows?: React.ReactNode;
  /** O1d: the list inside a surface card, as the card of settings above it. */
  boxed?: boolean;
}) {
  const t = useTheme();

  return (
    <>
      <Text style={[styles.caption, { color: t.muted }]}>{caption}</Text>

      <View
        style={[
          styles.list,
          boxed && [styles.box, { backgroundColor: t.surface, borderColor: t.hairline }],
        ]}
      >
        {rules.map((rule, i) => (
          <View
            key={rule.id}
            style={[
              styles.row,
              boxed && styles.boxRow,
              /* Boxed, the line goes BETWEEN rows and never under the last one:
                 a hairline against the card's own border is two lines a point
                 apart. Flat, every row carries its own, which is what the
                 three older screens draw. */
              boxed
                ? i > 0 && { borderTopColor: t.hairline, borderTopWidth: StyleSheet.hairlineWidth }
                : { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen(rule)}
              style={({ pressed }) => [styles.rowText, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={styles.nameLine}>
                <Text
                  style={[
                    styles.name,
                    boxed && styles.boxName,
                    { color: onToggle !== undefined && !rule.active ? t.muted : t.text },
                  ]}
                  numberOfLines={1}
                >
                  {rule.name}
                </Text>
                <Icon name="chevron" color={t.muted} size={15} />
              </View>
              <Text
                style={[styles.detail, boxed && styles.boxDetail, { color: t.muted }]}
                numberOfLines={1}
              >
                {describe(rule)}
              </Text>
            </Pressable>

            {onToggle !== undefined && (
              <Switch on={rule.active} onPress={() => onToggle(rule, !rule.active)} />
            )}
          </View>
        ))}

        {extraRows}

        {/* Last row, and the only way in from here. The three dashed cards it
            replaces asked the reader to choose a destination before they had
            seen the editor that explains what one is. */}
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => [
            styles.row,
            styles.addRow,
            boxed && [
              styles.boxRow,
              rules.length > 0 && {
                borderTopColor: t.hairline,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ],
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="plus" color={t.text} size={15} />
          <Text style={[styles.addLabel, boxed && styles.boxAddLabel, { color: t.text }]}>
            Add a rule
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/** 44 × 26, knob 20. Filled when on — no colour, because colour is money. */
function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.track,
        on ? { backgroundColor: t.text } : { backgroundColor: t.raised },
        { justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={[styles.knob, { backgroundColor: on ? t.onFill : t.muted }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caption: { ...type.sectionLabel, marginHorizontal: space.page, marginBottom: 2 },
  list: { marginHorizontal: space.page },
  // O1d's card: 13 radius, one hairline border, and the rows clipped inside it.
  box: { marginHorizontal: space.card, borderRadius: 13, borderWidth: 1, overflow: 'hidden' },
  // Tighter than the flat row, because the card's own padding is around it.
  boxRow: { paddingVertical: 11, paddingHorizontal: 15 },
  // doc 15 § 3: a sheet's body rows are 15 / 4 with a hairline between them.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  detail: { fontSize: 13.5, fontWeight: '400' },
  addRow: { gap: 11, borderBottomWidth: 0 },
  addLabel: { fontSize: 15, fontWeight: '700' },
  /* Inside the card the rule sets as the settings above it do — 500 16 over a
     12.5 line — rather than as the loudest thing on a sheet of its own. */
  boxName: { fontSize: 16, fontWeight: '500' },
  boxDetail: { fontSize: 12.5 },
  boxAddLabel: { fontSize: 15, fontWeight: '600' },

  track: {
    marginLeft: 'auto',
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: { width: 20, height: 20, borderRadius: 10 },
});
