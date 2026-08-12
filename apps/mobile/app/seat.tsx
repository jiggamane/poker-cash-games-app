import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { addPlayer, defaultBuyIn, seatAndBuyIn, useNight } from '../src/lib/nightStore';

/**
 * Seat a new player — N7.
 *
 * Two things at once, on purpose: it adds them to the group's roster AND puts
 * them in tonight's game. A roster that had to be curated separately would
 * mean typing a name at the table twice, and the second time is the one that
 * gets skipped.
 *
 * The roster chips above the field are people the group already knows who are
 * not playing tonight — the far more common case than somebody genuinely new.
 */
export default function Seat() {
  const t = useTheme();
  const night = useNight();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="New player" backTo="Who’s playing?">{null}</Screen>;
  }

  const suggested = defaultBuyIn(ledger);

  /** On the roster, not in tonight's game. */
  const bench = night.players.filter((p) => (ledger.boughtInByPlayer.get(p.id) ?? 0) === 0);

  const trimmed = name.trim();
  const clash = night.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
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

  /** Roster only, no buy-in yet — for adding somebody who is not playing. */
  async function justAdd() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await addPlayer(trimmed);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title="New player"
      backTo="Who’s playing?"
      action={{ label: 'Cancel', quiet: true, onPress: () => router.back() }}
      lede="Seats them tonight and adds them to the group roster. They can be invited later."
      footer={
        <>
          <Button
            label={
              trimmed === ''
                ? 'Type a name'
                : clash
                  ? `${trimmed} is already here`
                  : `Seat ${trimmed} · ${formatMoney(suggested)}`
            }
            variant="primary"
            disabled={!valid || busy}
            onPress={commit}
          />
          <Button
            label="Add to the roster only"
            variant="secondary"
            disabled={!valid || busy}
            onPress={() => void justAdd()}
          />
        </>
      }
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
                onPress={() =>
                  router.replace({ pathname: '/log', params: { player: p.id, kind: 'buyin' } })
                }
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
        <Text style={[styles.stakeHint, { color: t.muted }]}>
          {ledger.totalBoughtIn === 0 ? 'the usual' : 'same as the table'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: space.card, marginBottom: 14, gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.08, textTransform: 'uppercase' },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputText: { fontSize: 19, fontWeight: '600', padding: 0 },
  hint: { ...type.footnote },

  section: { marginHorizontal: space.page, marginBottom: 14 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1 },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  stake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stakeLabel: { fontSize: 16, fontWeight: '500' },
  stakeValue: { fontSize: 16, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  stakeHint: { fontSize: 13, fontWeight: '600' },
});
