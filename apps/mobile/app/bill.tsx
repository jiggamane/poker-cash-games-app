import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, resolveLedger, type Money, type MoneyRule } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { PushHeader } from '../src/components/PushHeader';
import { useTheme } from '../src/design/useTheme';
import { nameOf, spendsOf, useNight, type Spend } from '../src/lib/nightStore';

/**
 * The bill — L1, and L4 when nothing is on it. `11-bill-and-kitty.md`.
 *
 * NOTHING ON THIS SCREEN CALCULATES A SHARE. While the game is running nobody
 * has a result, so no winner is known and no per-person amount can exist. The
 * screen carries two things and only two: the spends, and the formula. All the
 * arithmetic runs once, at settle-up, against the counted table.
 *
 * That is why the right side of the card names the rule rather than a figure,
 * and why the block under the list says in words what will happen later
 * instead of showing a preview that would disagree with the real settlement.
 */
export default function Bill() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const spends = useMemo(
    () => (night === null || ledger === null ? [] : spendsOf(night, ledger)),
    [night, ledger],
  );

  if (night === null || ledger === null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="The bill" />
      </SafeAreaView>
    );
  }

  const total = ledger.totalExpenses;
  const empty = spends.length === 0;
  const rule = night.rules.find((r) => r.destination === 'bill' && r.active);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title="The bill"
        trailing={<Text style={[styles.meta, { color: t.muted }]}>admin only</Text>}
      />

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardFigures}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>On the bill</Text>
          <Text style={[styles.figure, { color: empty ? t.muted : t.text }]}>
            {formatMoney(total)}
          </Text>
        </View>

        {empty ? (
          <Text style={[styles.cardRight, styles.count, { color: t.dim }]}>nothing added yet</Text>
        ) : (
          <View style={[styles.cardRight, styles.cardRightCol]}>
            <Text style={[styles.ruleLine, { color: t.muted }]}>{splitPhrase(rule)}</Text>
            <Text style={[styles.count, { color: t.dim }]}>
              {spends.length} {spends.length === 1 ? 'spend' : 'spends'}
            </Text>
          </View>
        )}
      </View>

      {empty ? (
        <View style={styles.emptyState}>
          <Icon name="bill" color={t.name === 'dark' ? '#3A3B40' : '#D2D5DA'} size={34} stroke={1.6} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>No food or drinks yet</Text>
          <Text style={[styles.emptyBody, { color: t.muted }]}>
            Add what someone paid for and it comes off the winners at settle-up. Nothing here means
            nothing is charged.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Spends</Text>

          {spends.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/spend', params: { id: s.id } })}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>{clock(s.at)}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.note, { color: t.text }]}>
                  {s.note === undefined ? formatMoney(s.amount) : s.note}
                </Text>
                <Text style={[styles.who, { color: t.muted }]}>{frontedBy(night, s)}</Text>
              </View>
              {s.cover === 'unpaid' && (
                <View style={[styles.unpaid, { backgroundColor: t.dangerWash }]}>
                  <Text style={[styles.unpaidText, { color: t.danger }]}>UNPAID</Text>
                </View>
              )}
              <Text style={[styles.amount, { color: t.text }]}>{formatMoney(s.amount)}</Text>
              <Icon name="chevron" color={t.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!empty && (
        <View style={[styles.split, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.splitLabel, { color: t.muted }]}>How it will be split</Text>
          <Text style={[styles.splitRule, { color: t.text }]}>{splitHeadline(rule)}</Text>
          <Text style={[styles.splitBody, { color: t.dim }]}>
            Nobody’s result is known while the game is running, so no shares are worked out here. The
            split happens at settle-up, off the counted table. Whoever fronted a spend is paid back
            exactly what they fronted.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/spend')}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="plus" color={t.onFill} size={18} stroke={2.6} />
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>Add a spend</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/bill-rules')}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: t.outline, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: t.text }]}>Bill rules</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/** "split by size of win" — the rule in force, on the card's right. */
function splitPhrase(rule: MoneyRule | undefined): string {
  if (rule === undefined) return 'not charged to anyone';
  if (rule.charge === 'everyone_flat') return 'split evenly, everyone';
  return rule.split === 'by_percent' ? 'split by size of win' : 'split evenly, winners';
}

/** The same rule spelled out, under the list. */
function splitHeadline(rule: MoneyRule | undefined): string {
  if (rule === undefined) return 'Not charged to anyone';
  if (rule.charge === 'everyone_flat') return 'Evenly between everyone';
  return rule.split === 'by_percent'
    ? 'By size of win · winners only'
    : 'Evenly between the winners';
}

/** "Marek fronted it", "Marek and Lena fronted it", "the kitty paid". */
function frontedBy(night: NonNullable<ReturnType<typeof useNight>>, s: Spend): string {
  if (s.cover === 'kitty') return 'the kitty paid for it';
  if (s.cover === 'unpaid') return 'nobody named yet';
  const names = s.fronters.map((f) => nameOf(night, f.playerId));
  if (names.length === 1) return `${names[0]} fronted it`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} fronted it`;
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1 },
  meta: { fontSize: 13, fontWeight: '400' },

  card: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardFigures: { gap: 8 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  figure: { fontSize: 44, fontWeight: '800', letterSpacing: -1.76, lineHeight: 44, fontVariant: ['tabular-nums'] },
  cardRight: { marginLeft: 'auto', textAlign: 'right' },
  cardRightCol: { gap: 3, alignItems: 'flex-end' },
  ruleLine: { fontSize: 13, fontWeight: '500' },
  count: { fontSize: 13, fontWeight: '400' },

  list: { flex: 1, marginHorizontal: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  time: { fontSize: 13, fontWeight: '600', width: 44, fontVariant: ['tabular-nums'] },
  rowText: { gap: 2, flexShrink: 1 },
  note: { fontSize: 16, fontWeight: '600' },
  who: { fontSize: 12.5, fontWeight: '400' },
  amount: { fontSize: 17, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  /* Undrawn as pixels, specified in words: "an amber unpaid tag until someone
     is named". The app has no amber, and this is a warning, so it borrows the
     warning wash rather than inventing a hue. */
  unpaid: { marginLeft: 'auto', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  unpaidText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  emptyState: { flex: 1, marginHorizontal: 22, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.38 },
  emptyBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, maxWidth: 260, textAlign: 'center' },

  split: {
    marginTop: 14,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  splitLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  splitRule: { fontSize: 16.5, fontWeight: '600' },
  splitBody: { fontSize: 12.5, fontWeight: '400', lineHeight: 19.375 },

  actions: { marginTop: 14, marginHorizontal: 20, gap: 8 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 19,
    borderRadius: 8,
  },
  primaryLabel: { fontSize: 18, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 15, borderRadius: 8, borderWidth: 2 },
  secondaryLabel: { fontSize: 16, fontWeight: '700' },
});
