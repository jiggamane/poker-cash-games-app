import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { roundingLabel, type MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Radio } from '../src/components/RoundTick';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
import { saveRule, useNight } from '../src/lib/nightStore';

/**
 * Bill rules — L5. 11-bill-and-piggy-bank.md.
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
  /*
   * The choice OVERLAYS the rule rather than copying it at mount. A sheet can
   * be built before the night has come off the device, and a copy taken then
   * is a copy of nothing: the screen would show `by_win` whatever the group
   * actually agreed, with Save live to write it over.
   */
  const [picked, setPicked] = useState<Split | null>(null);
  const [busy, setBusy] = useState(false);
  const pick: Split = picked ?? (rule === undefined ? 'by_win' : splitOf(rule));

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

  /*
   * THE FULL BOARD (`bill-rules`, `bill-rules-changed`, approved): Save the
   * rule is the bar, and it opens blocked — it wakes only when a different
   * split is picked. The options are one card of radio rows, Rounding a
   * one-row card, When it is charged a padded card. With no bill rule there is
   * nothing to save, so there is no bar and the way back stays the outlined
   * secondary it was.
   */
  return (
    <Sheet
      title="Bill rules"
      badge="admin only"
      sub="what happens to the bill when the night is counted"
      bar={
        rule === undefined
          ? undefined
          : [
              {
                label: 'Save the rule',
                disabled: busy || pick === splitOf(rule),
                onPress: () => void save(),
              },
            ]
      }
    >
      <View style={styles.body}>
        <SectionLabel text="How it is split" quiet />

        {/* Hairlines between the options, as L5 draws them. Without them three
            two-line rows run together into one block of text and the thing you
            are choosing between stops being visible as three things. */}
        <Card>
          {OPTIONS.map((o, i) => {
            const on = o.key === pick;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                disabled={rule === undefined}
                onPress={() => setPicked(o.key)}
                style={({ pressed }) => [
                  styles.option,
                  i < OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.hairline },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Radio on={on} size={20} ring={2} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: t.text }]}>{o.label}</Text>
                  <Text style={[styles.optionCaption, { color: t.muted }]}>{o.caption}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        {/*
          * L5 draws this row and gives it a value. It was that value, hard-coded,
          * for as long as rounding was not a setting — which made it a label
          * describing behaviour rather than a row stating a rule. It now reads
          * tonight's own setting and opens it, which is what a row with a value
          * on the right has always looked like it does.
          */}
        <Card>
          <CardRow
            last
            name="Rounding"
            value={roundingLabel(night.roundingMode)}
            onPress={() => router.push({ pathname: '/rounding', params: { scope: 'night' } })}
          />
        </Card>

        <Card pad>
          <Text style={[styles.blockTitle, { color: t.text }]}>When it is charged</Text>
          <Text style={[styles.note, { color: t.muted }]}>
            At settle-up, against the counted table — never during the game. Changing the rule
            part-way through a night changes nothing that has already been charged, because nothing
            has been. Where a split leaves a remainder, it goes to the largest share.
          </Text>
        </Card>

        {rule === undefined && (
          <>
            <Text style={[styles.note, { color: t.muted }]}>
              No rule shares the bill out tonight, so whoever paid, paid. Add one in the money rules
              to change that.
            </Text>
            <Button label="Back to the bill" variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </View>
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
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },
  // The board's radio row: the ring, then the option over its caption.
  option: { flexDirection: 'row', alignItems: 'center', gap: z(10), minHeight: z(44), paddingVertical: z(8) },
  optionText: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6) },
  optionCaption: { fontSize: z(12), lineHeight: z(15), marginTop: z(2) },

  blockTitle: { fontFamily: 'head', fontSize: z(16), fontWeight: '700', lineHeight: z(18.4), marginBottom: z(6) },
  // The kit's `note()`: 13 / 1.45, muted.
  note: { fontSize: z(13), lineHeight: z(18.85) },
});
