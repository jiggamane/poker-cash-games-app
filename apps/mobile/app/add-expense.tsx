import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { addExpense, useNight } from '../src/lib/nightStore';

/**
 * A new expense — B3.
 *
 * Two things have to be true of every one of these: it says what it was, and
 * it says who actually put their card down. The second is the one that gets
 * forgotten and the one that matters, because whoever fronted the money gets
 * back exactly what they spent at settle-up.
 *
 * The split is NOT set here. It belongs to the bill rule, which is a property
 * of the group rather than of one pizza, and letting each expense carry its own
 * split would mean two bills on the same night could disagree about who pays
 * for the table's food.
 */
export default function AddExpense() {
  const t = useTheme();
  const night = useNight();

  const [typed, setTyped] = useState('');
  const [what, setWhat] = useState<'Food' | 'Drinks' | 'Other'>('Food');
  const [payer, setPayer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="New expense">{null}</Sheet>;
  }

  // Whoever is actually here. Somebody who never sat down did not buy the pizza.
  const candidates = night.players.filter(
    (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
  );

  const amount = typed === '' ? 0 : Number(typed);
  const valid = amount > 0 && payer !== null;
  const stamped = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await addExpense(payer!, money(amount), what);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="New expense"
      footer={
        <Button
          label={
            payer === null
              ? 'Say who paid'
              : `${name(night, payer)} paid ${formatMoney(money(amount))}`
          }
          variant="primary"
          disabled={!valid || busy}
          onPress={commit}
        />
      }
    >
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: amount > 0 ? t.text : t.muted }]}>
          {formatMoney(money(amount))}
        </Text>
      </View>

      <View style={styles.segment}>
        {(['Food', 'Drinks', 'Other'] as const).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityState={{ selected: what === k }}
            onPress={() => setWhat(k)}
            style={[
              styles.segmentItem,
              { backgroundColor: what === k ? t.text : t.surface },
            ]}
          >
            <Text style={[styles.segmentLabel, { color: what === k ? t.onFill : t.text }]}>{k}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Who paid</Text>
        <View style={styles.chips}>
          {candidates.map((p) => {
            const on = payer === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setPayer(p.id)}
                style={[
                  styles.chip,
                  on
                    ? { backgroundColor: t.text, borderColor: t.text }
                    : { backgroundColor: t.surface, borderColor: t.hairline },
                ]}
              >
                <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.stamp, { borderColor: t.hairline }]}>
        <Icon name="clock" color={t.muted} />
        <Text style={[styles.stampText, { color: t.text }]}>Stamped {stamped}</Text>
      </View>

      <Keypad
        onDigits={(d) => setTyped((cur) => appendDigits(cur, d))}
        onBackspace={() => setTyped((cur) => cur.slice(0, -1))}
      />
    </Sheet>
  );
}

const name = (night: NonNullable<ReturnType<typeof useNight>>, id: string): string =>
  night.players.find((p) => p.id === id)?.name ?? 'Someone';

const styles = StyleSheet.create({
  amountRow: { alignItems: 'center', paddingTop: 6, paddingBottom: 14 },
  amount: { fontSize: 66, fontWeight: '800', letterSpacing: -3.3, fontVariant: ['tabular-nums'] },

  segment: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.pressable },
  segmentLabel: { fontSize: 14, fontWeight: '700' },

  section: { marginHorizontal: space.page, marginBottom: 14 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stampText: { fontSize: 16, fontWeight: '500' },
});
