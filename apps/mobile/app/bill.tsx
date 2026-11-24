import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { resolveLedger, type Money, type MoneyRule } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Sheet } from '../src/components/Sheet';
import { frontedSentence } from '../src/components/SpendList';
import { useTheme } from '../src/design/useTheme';
import { nameOf, spendsOf, useNight, type Spend } from '../src/lib/nightStore';

/**
 * The bill — L1, and L4 when nothing is on it. 11-bill-and-piggy-bank.md.
 *
 * NOTHING ON THIS SCREEN CALCULATES A SHARE. While the game is running nobody
 * has a result, so no winner is known, no per-player amount can exist and the
 * piggy bank's take is unknowable. The screen carries two things: the spends, and
 * the formula. All of the arithmetic happens once, at settle-up, against the
 * counted table — which is also why the right side of the card has no money on
 * it at all.
 */
export default function Bill() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="The bill">{null}</Sheet>;

  const spends = spendsOf(night, ledger);
  const total = ledger.totalExpenses;
  const empty = spends.length === 0;
  const rule = night.rules.find((r) => r.destination === 'bill' && r.active);

  /*
   * THE FULL BOARD (`bill`, `bill-empty`, both approved 22 November): Add a
   * spend is the bar; Bill rules, the second button under it, stays in the
   * content as the outlined secondary. The figure, the spends and the split
   * are three cards on the sheet, and the spends carry no chevrons.
   */
  return (
    <Sheet
      title="The bill"
      sub="food, drinks and whatever else the night bought"
      bar={[{ label: 'Add a spend', onPress: () => router.push('/spend') }]}
    >
      <View style={styles.body}>
        <Card pad>
          <View style={styles.onBill}>
            <View>
              <Text style={[styles.label, { color: t.muted }]}>On the bill</Text>
              <Text style={[styles.figure, { color: empty ? t.muted : t.text }]}>{formatMoney(total)}</Text>
            </View>
            <View style={styles.cardRight}>
              {empty ? (
                <Text style={[styles.rightLine, { color: t.dim }]}>nothing added yet</Text>
              ) : (
                <>
                  <Text style={[styles.rightLine, styles.rule, { color: t.muted }]}>{splitPhrase(rule)}</Text>
                  <Text style={[styles.rightLine, { color: t.dim }]}>
                    {spends.length} {spends.length === 1 ? 'spend' : 'spends'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </Card>

        {empty ? (
          <View style={styles.blank}>
            <Icon name="receipt" color={t.dim} size={34} />
            <Text style={[styles.blankTitle, { color: t.text }]}>Nothing on the bill yet</Text>
            <Text style={[styles.blankBody, { color: t.muted }]}>
              Add what the night spends as it is spent. Who pays it back is worked out at
              settle-up, never now.
            </Text>
          </View>
        ) : (
          <>
            <SectionLabel text="Spends" quiet />
            <Card>
              {spends.map((s, i) => (
                <CardRow
                  key={s.id}
                  last={i === spends.length - 1}
                  onPress={() => router.push({ pathname: '/spend', params: { id: s.id } })}
                  lead={<Text style={[styles.time, { color: t.muted }]}>{s.at}</Text>}
                  /* An empty note is valid: the row is then the amount alone. */
                  name={s.note === '' ? formatMoney(s.amount) : s.note}
                  meta={fronted(s, night)}
                  trail={s.coveredBy === 'unpaid' ? <Pill label="unpaid" tone="amber" /> : undefined}
                  amount={formatMoney(s.amount)}
                />
              ))}
            </Card>
            <Card pad>
              <Text style={[styles.splitTitle, { color: t.text }]}>How it will be split</Text>
              <Text style={[styles.splitBody, { color: t.muted }]}>
                {splitSentence(rule)} Nothing is worked out until settle-up, and whoever fronted a
                spend is repaid exactly what they fronted — and still pays their own share.
              </Text>
            </Card>
          </>
        )}

        <Button label="Bill rules" variant="secondary" onPress={() => router.push('/bill-rules')} />
      </View>
    </Sheet>
  );
}

/** "split by size of win" — the rule in force, in six words. */
function splitPhrase(rule: MoneyRule | undefined): string {
  if (rule === undefined) return 'no rule set';
  if (rule.charge === 'everyone_flat') return 'split between everyone';
  return rule.split === 'by_percent' ? 'split by size of win' : 'split evenly between winners';
}

function splitSentence(rule: MoneyRule | undefined): string {
  if (rule === undefined) {
    return 'No rule shares this out yet, so whoever paid, paid.';
  }
  if (rule.charge === 'everyone_flat') {
    return 'Everyone at the table pays an equal share, losers included.';
  }
  return rule.split === 'by_percent'
    ? 'The winners pay it in proportion to the size of each win, so the biggest winner carries the most.'
    : 'The winners pay the same share each, whatever they won.';
}

/**
 * "Marek fronted it", "Marek and Dana fronted it", "the piggy bank paid".
 *
 * The sentence itself is `frontedSentence` in `src/components/SpendList.tsx`,
 * because the same list of spends is now read on tonight's money rules and on
 * the deductions step as well as here.
 */
const fronted = (spend: Spend, night: NonNullable<ReturnType<typeof useNight>>): string =>
  frontedSentence(spend, (id) => nameOf(night, id));

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 2, gap: 12 },
  onBill: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  label: { fontSize: 12.5, fontWeight: '500', marginBottom: 6 },
  figure: { fontFamily: 'head', fontSize: 38, fontWeight: '700', letterSpacing: -1.14, lineHeight: 40, fontVariant: ['tabular-nums'] },
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  rightLine: { fontSize: 12.5, lineHeight: 18.75, textAlign: 'right' },
  rule: { fontWeight: '600' },
  time: { width: 38, fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  splitTitle: { fontFamily: 'head', fontSize: 15, fontWeight: '700', lineHeight: 18, marginBottom: 5 },
  splitBody: { fontSize: 12.5, lineHeight: 17.5 },
  blank: { alignItems: 'center', gap: 12, paddingTop: 26, paddingBottom: 22, paddingHorizontal: 14 },
  blankTitle: { fontFamily: 'head', fontSize: 19, fontWeight: '700' },
  blankBody: { fontSize: 14, fontWeight: '400', lineHeight: 19, textAlign: 'center', maxWidth: 250 },
});
