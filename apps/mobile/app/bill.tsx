import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, type Money, type MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, spendsOf, useNight, type Spend } from '../src/lib/nightStore';

/**
 * The bill — L1, and L4 when nothing is on it. 11-bill-and-kitty.md.
 *
 * NOTHING ON THIS SCREEN CALCULATES A SHARE. While the game is running nobody
 * has a result, so no winner is known, no per-player amount can exist and the
 * kitty's take is unknowable. The screen carries two things: the spends, and
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

  return (
    <Sheet
      title="The bill"
      sub="food, drinks and whatever else the night bought"
      footer={
        <>
          <Button
            label="Add a spend"
            variant="primary"
            onPress={() => router.push('/spend')}
          />
          <Button
            label="Bill rules"
            variant="secondary"
            onPress={() => router.push('/bill-rules')}
          />
        </>
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardLeft}>
          <Text style={[styles.label, { color: t.muted }]}>On the bill</Text>
          <Text style={[styles.figure, { color: empty ? t.muted : t.text }]}>
            {formatMoney(total)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {empty ? (
            <Text style={[styles.spendCount, { color: t.dim }]}>nothing added yet</Text>
          ) : (
            <>
              <Text style={[styles.rule, { color: t.muted }]}>{splitPhrase(rule)}</Text>
              <Text style={[styles.spendCount, { color: t.dim }]}>
                {spends.length} {spends.length === 1 ? 'spend' : 'spends'}
              </Text>
            </>
          )}
        </View>
      </View>

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
        <View style={styles.list}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Spends</Text>

          {spends.map((s, i) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/spend', params: { id: s.id } })}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === spends.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>{s.at}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.note, { color: t.text }]} numberOfLines={1}>
                  {/* An empty note is valid: the row is then the amount alone. */}
                  {s.note === '' ? formatMoney(s.amount) : s.note}
                </Text>
                <Text style={[styles.fronted, { color: t.muted }]} numberOfLines={1}>
                  {fronted(s, night)}
                </Text>
              </View>
              {s.coveredBy === 'unpaid' && <Pill label="unpaid" tone="amber" />}
              <Text style={[styles.amount, { color: t.text }]}>{formatMoney(s.amount)}</Text>
              <Icon name="chevron" color={t.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {!empty && (
        <View style={[styles.split, { borderColor: t.hairline }]}>
          <Text style={[styles.splitTitle, { color: t.text }]}>How it will be split</Text>
          <Text style={[styles.splitBody, { color: t.muted }]}>
            {splitSentence(rule)} Nothing is worked out until settle-up, and whoever fronted a
            spend is repaid exactly what they fronted — and still pays their own share.
          </Text>
        </View>
      )}
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

/** "Marek fronted it", "Marek and Dana fronted it", "the kitty paid". */
function fronted(spend: Spend, night: NonNullable<ReturnType<typeof useNight>>): string {
  if (spend.coveredBy === 'kitty') return 'the kitty paid';
  if (spend.coveredBy === 'unpaid') return 'nobody has paid for it yet';

  const names = spend.fronters.map((f) => nameOf(night, f.playerId));
  const list =
    names.length === 1
      ? names[0]!
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`;
  return `${list} fronted it`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  cardLeft: { gap: 8 },
  label: type.tableLabel,
  figure: type.tableFigure,
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3 },
  rule: type.tableTotal,
  spendCount: type.tableSeats,

  list: { marginHorizontal: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  time: { ...type.time, width: 44 },
  rowText: { gap: 2, flexShrink: 1 },
  note: type.entryType,
  fronted: type.entryProvenance,
  amount: { ...type.entryAmount, marginLeft: 'auto' },

  split: {
    marginTop: 18,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    gap: 7,
  },
  splitTitle: { fontSize: 16.5, fontWeight: '600' },
  splitBody: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  blank: { alignItems: 'center', gap: 14, paddingVertical: 40, paddingHorizontal: space.page },
  blankTitle: { fontSize: 19, fontWeight: '700' },
  blankBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, textAlign: 'center', maxWidth: 260 },
});
