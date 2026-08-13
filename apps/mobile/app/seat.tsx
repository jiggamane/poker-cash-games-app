import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { defaultBuyIn, seatAndBuyIn, useNight } from '../src/lib/nightStore';

/**
 * N7 · Seat a new player.
 *
 * Two things at once, on purpose: it adds them to the group's roster AND puts
 * them in tonight's game. A roster that had to be curated separately would
 * mean typing a name at the table twice, and the second time is the one that
 * gets skipped. That is why there is one button and it says "Seat and buy in".
 *
 * The roster chips under the field are people the group already knows who are
 * not playing tonight — the far more common case than somebody genuinely new,
 * and a tap instead of a spelling. Seating one of them is the same act: the
 * name resolves to the row that already exists rather than making a second one.
 */
export default function Seat() {
  const t = useTheme();
  const night = useNight();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="New player">{null}</Sheet>;

  const suggested = defaultBuyIn(ledger);

  /** On the roster, not in tonight's game. */
  const bench = night.players.filter((p) => (ledger.boughtInByPlayer.get(p.id) ?? 0) === 0);

  const trimmed = name.trim();
  /* Somebody already at the table is a clash; somebody on the bench is not —
     picking them off the roster is what the chips below are for. */
  const clash = night.players.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && !bench.some((b) => b.id === p.id),
  );
  const valid = trimmed.length > 0 && !clash;

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await seatAndBuyIn(trimmed, suggested);
      router.dismissTo('/session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="New player"
      lede="Seats them tonight and adds them to the group roster. They can be invited later."
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: t.muted }]}>Name</Text>
          <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.hairline }]}>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              onSubmitEditing={commit}
              placeholder="Their name"
              placeholderTextColor={t.muted}
              returnKeyType="done"
              autoCapitalize="words"
              style={[styles.inputText, { color: t.text }]}
            />
          </View>
          {clash && (
            <Text style={[styles.hint, { color: t.muted }]}>
              Somebody by that name is already in this night. Two Petrs need two different names, or
              the ledger cannot tell them apart.
            </Text>
          )}
        </View>

        {bench.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>From the roster</Text>
            <View style={styles.chips}>
              {bench.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => setName(p.name)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: t.surface, borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: t.text }]}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.stake, { borderColor: t.hairline }]}>
          <Text style={[styles.stakeLabel, { color: t.text }]}>First buy-in</Text>
          <Text style={[styles.stakeValue, { color: t.text }]}>{formatMoney(suggested)}</Text>
          <Text style={[styles.stakeHint, { color: t.muted }]}>standard</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Seat and buy in" variant="primary" disabled={!valid || busy} onPress={commit} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  /* 14 is the drawn sub-line's bottom margin, which the sheet chrome does not
     carry: the gap under the sentence stays what the board draws. */
  scroll: { flex: 1 },
  body: { paddingTop: 14 },

  field: { marginHorizontal: 20, marginBottom: 12, gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.08, textTransform: 'uppercase' },
  input: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  inputText: { fontSize: 19, fontWeight: '600', padding: 0 },
  hint: { fontSize: 12.5, fontWeight: '400', lineHeight: 19 },

  section: { marginHorizontal: 22, marginBottom: 14 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  stake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stakeLabel: { fontSize: 16, fontWeight: '500' },
  stakeValue: { fontSize: 16, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  stakeHint: { fontSize: 13, fontWeight: '600' },

  footer: { marginTop: 'auto', paddingTop: 14, paddingHorizontal: 20 },
});
