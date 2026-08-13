import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { correctEntry, nameOf, useNight, voidEntry } from '../src/lib/nightStore';

/**
 * One entry — N10. Correct it, or void it.
 *
 * NOTHING HERE DELETES ANYTHING. The ledger is append-only on the device and
 * on the server, and both a correction and a void are new rows pointing at the
 * old one. The original line stays in the feed, marked, because five people
 * are relying on this record and a number that can silently change is not a
 * record — it is a claim.
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

  if (night === null || ledger === null) {
    return <Sheet title="One entry">{null}</Sheet>;
  }

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
    <Sheet
      title="One entry"
      footer={
        mode === 'amount' ? (
          <Button
            label={valid ? `Correct to ${formatMoney(money(amount))}` : 'Type the right amount'}
            variant="primary"
            disabled={!valid || busy}
            onPress={() => void apply('correct')}
          />
        ) : (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        )
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.label, { color: t.muted }]}>
          {clock(night.occurredAt[entry.id])} · {entry.voided ? 'voided' : entry.corrected ? 'corrected since' : 'as logged'}
        </Text>
        {/* Voiding zeroes the amount, which is how the arithmetic drops it —
            but "Petr · rebuy · $0" describes an entry nobody ever made. The
            figure it was logged with is the one being looked at, and the line
            above already says the entry was voided. */}
        <Text style={[styles.headline, { color: t.text }]}>
          {who} · {what} · {formatMoney(entry.voided ? entry.originalAmount : entry.amount)}
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
    padding: 18,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  label: type.label,
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.52 },

  explain: { ...type.footnote, marginHorizontal: space.page, marginBottom: 18, lineHeight: 21 },

  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  rowLabel: type.rowName,
  rowHint: { ...type.meta, marginLeft: 'auto' },

  amountRow: { alignItems: 'center', paddingTop: 6, paddingBottom: 20 },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, fontVariant: ['tabular-nums'] },

  note: { ...type.footnote, marginHorizontal: space.page },
});
