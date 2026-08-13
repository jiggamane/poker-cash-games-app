import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { saveRule, useNight } from '../src/lib/nightStore';

/**
 * Bill rules — L5. 11-bill-and-kitty.md.
 *
 * Three options and nothing else, because the bill has exactly one question:
 * who carries it. Only the third charges losers; the other two are
 * winners-only, which is what makes a bill a cut of winnings rather than a
 * cover charge.
 *
 * DEFAULT IS BY SIZE OF WIN (S62), and that contradicts the worked night in
 * 04-money-math.md, which splits the sample $170 evenly between three winners
 * (57 / 57 / 56) and derives six transfers from it. By size of win the same
 * night gives 110 / 31 / 29 and three different nets. No drawn screen is wrong
 * — none of them shows a share any more — but the money-math document and the
 * canonical night in the tests are, until they are re-derived. Nothing here
 * changes an existing rule; this is only what a new one starts as.
 */
type Split = 'by_win' | 'evenly_winners' | 'evenly_everyone';

const OPTIONS: Array<{ key: Split; label: string; caption: string }> = [
  { key: 'by_win', label: 'By size of win', caption: 'the biggest winner carries the most' },
  {
    key: 'evenly_winners',
    label: 'Evenly between the winners',
    caption: 'same share each, whatever they won',
  },
  {
    key: 'evenly_everyone',
    label: 'Evenly between everyone',
    caption: 'losers pay a share too',
  },
];

export default function BillRules() {
  const t = useTheme();
  const night = useNight();

  const rule = night?.rules.find((r) => r.destination === 'bill');
  const [pick, setPick] = useState<Split>(rule === undefined ? 'by_win' : splitOf(rule));
  const [busy, setBusy] = useState(false);

  if (night === null) return <Sheet title="Bill rules">{null}</Sheet>;

  async function save() {
    if (rule === undefined || busy) return;
    setBusy(true);
    try {
      await saveRule({ ...rule, ...shapeOf(pick) });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Bill rules"
      sub="what happens to the bill when the night is counted"
      footer={
        rule === undefined ? (
          <Button label="Back to the bill" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            label="Save"
            variant="primary"
            disabled={busy || pick === splitOf(rule)}
            onPress={() => void save()}
          />
        )
      }
    >
      <Text style={[styles.sectionLabel, { color: t.muted }]}>How it is split</Text>

      <View style={styles.options}>
        {OPTIONS.map((o) => {
          const on = o.key === pick;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              disabled={rule === undefined}
              onPress={() => setPick(o.key)}
              style={({ pressed }) => [styles.option, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={[styles.circle, { borderColor: on ? t.text : t.dashed }]}>
                {on && <View style={[styles.dot, { backgroundColor: t.text }]} />}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: t.text }]}>{o.label}</Text>
                <Text style={[styles.optionCaption, { color: t.muted }]}>{o.caption}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: t.text }]}>Rounding</Text>
        <Text style={[styles.rowValue, { color: t.muted }]}>Whole dollars</Text>
      </View>

      <View style={[styles.block, { borderColor: t.hairline }]}>
        <Text style={[styles.blockTitle, { color: t.text }]}>When it is charged</Text>
        <Text style={[styles.blockBody, { color: t.muted }]}>
          At settle-up, against the counted table — never during the game. Changing the rule
          part-way through a night changes nothing that has already been charged, because nothing
          has been. Where a split leaves a remainder, it goes to the largest share.
        </Text>
      </View>

      {rule === undefined && (
        <Text style={[styles.none, { color: t.muted }]}>
          No rule shares the bill out tonight, so whoever paid, paid. Add one in the money rules
          to change that.
        </Text>
      )}
    </Sheet>
  );
}

/**
 * The three options, in the two fields that actually carry them.
 *
 * "Evenly between everyone" is not a third split value — it is `evenly` with
 * the charge widened to the whole table. Keeping them as two fields is what
 * stops a percentage from ever being charged to a loser (M3).
 */
const splitOf = (rule: MoneyRule): Split =>
  rule.charge === 'everyone_flat'
    ? 'evenly_everyone'
    : rule.split === 'by_percent'
      ? 'by_win'
      : 'evenly_winners';

const shapeOf = (pick: Split): Pick<MoneyRule, 'split' | 'charge'> =>
  pick === 'evenly_everyone'
    ? { split: 'evenly', charge: 'everyone_flat' }
    : pick === 'by_win'
      ? { split: 'by_percent', charge: 'winners_only' }
      : { split: 'evenly', charge: 'winners_only' };

const styles = StyleSheet.create({
  sectionLabel: { ...type.sectionLabel, marginHorizontal: space.page, paddingHorizontal: 4 },
  options: { marginHorizontal: space.page, marginTop: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 4 },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { gap: 3, flexShrink: 1 },
  optionLabel: type.rowName,
  optionCaption: type.rowDetail,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.page,
    marginTop: 10,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  rowLabel: type.rowName,
  rowValue: { ...type.meta, marginLeft: 'auto' },

  block: {
    marginTop: 18,
    marginHorizontal: space.card,
    padding: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    gap: 7,
  },
  blockTitle: { fontSize: 16.5, fontWeight: '600' },
  blockBody: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  none: { ...type.footnote, marginTop: 16, marginHorizontal: space.page },
});
