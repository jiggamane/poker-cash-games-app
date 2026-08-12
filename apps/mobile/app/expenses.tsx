import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, settle, type Money } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * Food & drinks — B2 when nothing has been bought, B4 once something has.
 *
 * A night at a table produces a tab: sometimes one bill, sometimes several,
 * paid by different people at different times. Each is an entry naming who
 * actually paid, and the bill rule shares the real total out at settle-up —
 * so adding one here changes what everybody owes without editing a rule.
 *
 * "How it lands" is a PREVIEW, not a result. It runs the real engine against
 * the night as it stands, which is the only honest way to show it: a screen
 * that estimated the split would disagree with the settlement later.
 */
export default function Expenses() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /**
   * What the bill would take off each person if the night ended now.
   *
   * Wrapped, because it cannot run until everyone has been counted — and this
   * screen is opened mid-game, when nobody has been. An absent preview is
   * correct then; a made-up one would not be.
   */
  const preview = useMemo(() => {
    if (night === null) return null;
    try {
      const r = settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
      });
      return r.deductions.find((d) => d.destination === 'bill') ?? null;
    } catch {
      return null;
    }
  }, [night]);

  if (night === null || ledger === null) {
    return <Sheet title="Food &amp; drinks">{null}</Sheet>;
  }

  const expenses = ledger.entries.filter((e) => !e.voided && e.type === 'expense');
  const total = ledger.totalExpenses;
  const billRule = night.rules.find((r) => r.destination === 'bill' && r.active);

  return (
    <Sheet
      title="Food &amp; drinks"
      sub={
        billRule === undefined
          ? 'Recorded, and nothing more — no rule shares this out, so whoever paid, paid.'
          : undefined
      }
    >
      {/* The bone card: this is money leaving the table. */}
      <View style={[styles.card, { backgroundColor: t.offTableWash }]}>
        <Text style={[styles.cardLabel, { color: t.offTable }]}>On the bill tonight</Text>
        <Text style={[styles.cardFigure, { color: t.text }]}>{formatMoney(total)}</Text>
        <Text style={[styles.cardNote, { color: t.offTable }]}>
          {billRule === undefined
            ? 'Not charged to anyone at settle-up'
            : billRule.charge === 'winners_only'
              ? 'Charged to the winners at settle-up'
              : 'Split between everyone at settle-up'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {expenses.length === 0
            ? 'Nothing yet'
            : expenses.length === 1
              ? 'One item'
              : `${expenses.length} items`}
        </Text>

        {expenses.map((e, i) => (
          <View
            key={e.id}
            style={[
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === expenses.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>
                {night.noteOf[e.id] ?? 'Expense'}
              </Text>
              <Text style={[styles.detail, { color: t.muted }]}>
                {nameOf(night, e.payerId)} paid · {clock(night.occurredAt[e.id])}
              </Text>
            </View>
            <Text style={[styles.figure, { color: t.text }]}>{formatMoney(e.amount)}</Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/add-expense')}
          style={({ pressed }) => [
            styles.add,
            { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="plus" color={t.text} />
          <Text style={[styles.addLabel, { color: t.text }]}>
            {expenses.length === 0 ? 'Add an expense' : 'Add another'}
          </Text>
        </Pressable>
      </View>

      {preview !== null && preview.total > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>
            How it lands, if the night ended now
          </Text>
          {preview.charges.map((c, i) => (
            <View
              key={c.playerId}
              style={[
                styles.previewRow,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth:
                    i === preview.charges.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.previewName, { color: t.text }]}>
                {nameOf(night, c.playerId)}
              </Text>
              <Text style={[styles.previewShare, { color: t.muted }]}>
                share {formatMoney(c.amount)}
              </Text>
              <Text style={[styles.previewFigure, { color: t.offTable }]}>
                −{formatMoney(c.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: space.cardPadV,
    paddingHorizontal: space.cardPadH,
    borderRadius: radius.card,
    gap: 6,
  },
  cardLabel: type.label,
  cardFigure: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  cardNote: { fontSize: 13, fontWeight: '400' },

  section: { marginHorizontal: space.page, marginBottom: 18 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: type.detail,
  figure: { ...type.feedFigure, marginLeft: 'auto' },

  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addLabel: { fontSize: 15, fontWeight: '700' },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  previewName: { fontSize: 16, fontWeight: '500' },
  previewShare: { ...type.detail, fontVariant: ['tabular-nums'] },
  previewFigure: { fontSize: 16, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
});
