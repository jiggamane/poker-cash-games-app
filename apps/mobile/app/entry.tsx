import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { correctEntry, nameOf, useNight, voidEntry } from '../src/lib/nightStore';

/**
 * N10 · Correct an entry. Change it, or void it.
 *
 * NOTHING HERE DELETES ANYTHING. The ledger is append-only on the device and
 * on the server, and both a correction and a void are new rows pointing at the
 * old one. The original line stays in the feed, marked, because five people
 * are relying on this record and a number that can silently change is not a
 * record — it is a claim. The paragraph under the card says exactly that, to
 * whoever is about to press one of the two rows.
 *
 * The engine follows the chain: an entry can be corrected twice, and a
 * correction after a void brings it back.
 */
export default function EntryPage() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const night = useNight();

  const [mode, setMode] = useState<'menu' | 'amount'>('menu');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="One entry">{null}</Sheet>;

  const entry = ledger.entries.find((e) => e.id === id);
  if (entry === undefined) {
    return (
      <Sheet title="One entry">
        <Text style={[styles.note, { color: t.muted }]}>That entry is not in this night.</Text>
      </Sheet>
    );
  }

  const who = nameOf(night, entry.playerId ?? entry.payerId);
  const what =
    entry.type === 'buyin'
      ? 'buy-in'
      : entry.type === 'rebuy'
        ? 'rebuy'
        : entry.type === 'cashout'
          ? 'cash out'
          : 'expense';

  const amount = typed === '' ? 0 : Number(typed);
  const valid = amount > 0 && amount !== entry.amount;

  async function apply(action: 'correct' | 'void') {
    if (busy) return;
    setBusy(true);
    try {
      if (action === 'void') await voidEntry(entry!.id);
      else await correctEntry(entry!.id, money(amount));
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="One entry">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          {/* The board reads "22:41 · logged by Ivo". Who logged an entry is not
              on the row yet, so the eyebrow carries its state instead. */}
          <Text style={[styles.eyebrow, { color: t.muted }]}>
            {clock(night.occurredAt[entry.id])} ·{' '}
            {entry.voided ? 'voided' : entry.corrected ? 'corrected since' : 'as logged'}
          </Text>
          <Text style={[styles.headline, { color: t.text }]}>
            {who} · {what} · {formatMoney(entry.amount)}
          </Text>
        </View>

        <Text style={[styles.explain, { color: t.muted }]}>
          The ledger is append-only. A correction does not erase this line — it writes a reversal
          underneath it, and both stay visible to everyone.
        </Text>

        {mode === 'menu' ? (
          <View style={styles.list}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setTyped(String(entry.amount));
                setMode('amount');
              }}
              style={({ pressed }) => [
                styles.row,
                styles.firstRow,
                { borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.rowLabel, { color: t.text }]}>Change the amount</Text>
              <Text style={[styles.rowHint, { color: t.muted }]}>writes a correction</Text>
              <Icon name="chevron" color={t.muted} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={entry.voided || busy}
              onPress={() => void apply('void')}
              style={({ pressed }) => [
                styles.row,
                { borderColor: t.hairline, opacity: entry.voided ? 0.4 : pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.rowLabel, { color: t.danger }]}>
                {entry.voided ? 'Already voided' : 'Void this entry'}
              </Text>
              <Text style={[styles.rowHint, { color: t.muted }]}>writes a reversal</Text>
              <Icon name="chevron" color={t.muted} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.amountRow}>
              <Text style={[styles.amount, { color: valid ? t.text : t.muted }]}>
                {formatMoney(money(amount))}
              </Text>
            </View>
            <Keypad
              onDigits={(d) => setTyped((cur) => appendDigits(cur, d))}
              onBackspace={() => setTyped((cur) => cur.slice(0, -1))}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {mode === 'amount' ? (
          <Button
            label={valid ? `Correct to ${formatMoney(money(amount))}` : 'Type the right amount'}
            variant="primary"
            disabled={!valid || busy}
            onPress={() => void apply('correct')}
          />
        ) : (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        )}
      </View>
    </Sheet>
  );
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  /* 6 is the bottom padding the drawn title row carried. */
  card: {
    marginTop: 6,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.52 },

  explain: { fontSize: 13.5, fontWeight: '400', lineHeight: 21, marginHorizontal: 22, marginBottom: 18 },

  list: { marginHorizontal: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  firstRow: { borderTopWidth: 1 },
  rowLabel: { fontSize: 17, fontWeight: '600' },
  rowHint: { fontSize: 13, fontWeight: '400', marginLeft: 'auto' },

  amountRow: { alignItems: 'center', paddingTop: 6, paddingBottom: 20 },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, lineHeight: 68, fontVariant: ['tabular-nums'] },

  scroll: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  footer: { paddingTop: 14, paddingHorizontal: 20 },

  note: { fontSize: 12.5, fontWeight: '400', lineHeight: 19, marginHorizontal: 22, marginTop: 14 },
});
