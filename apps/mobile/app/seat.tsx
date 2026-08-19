import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
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
  /**
   * The first buy-in, typed. It arrives filled with what the table has been
   * buying in for, and somebody sitting down for half of that — or double it —
   * is a normal enough thing that it must not need a second screen.
   */
  const [stake, setStake] = useState<string | null>(null);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="New player">{null}</Sheet>;
  }

  const suggested = defaultBuyIn(ledger);
  const typed = stake ?? String(suggested);
  const amount = typed === '' ? 0 : Number(typed);
  const stakeOk = Number.isInteger(amount) && amount > 0;

  /** On the roster, not in tonight's game. */
  const bench = night.players.filter((p) => (ledger.boughtInByPlayer.get(p.id) ?? 0) === 0);

  const trimmed = name.trim();
  const clash = night.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed.length > 0 && !clash && stakeOk;

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await seatAndBuyIn(trimmed, money(amount));
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
    <Sheet
      title="New player"
      sub="Seats them tonight and adds them to the group roster. They can be invited later."
      sentence
      footer={
        <>
          <Button
            label={
              trimmed === ''
                ? 'Type a name'
                : clash
                  ? `${trimmed} is already here`
                  : !stakeOk
                    ? 'Set a first buy-in'
                    : `Seat ${trimmed} · ${formatMoney(money(amount))}`
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
        <View style={[styles.stakeField, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.stakeCurrency, { color: stakeOk ? t.text : t.muted }]}>$</Text>
          <TextInput
            value={typed}
            onChangeText={(v) => setStake(v.replace(/[^0-9]/g, ''))}
            // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
            // to a digits-only keyboard.
            testID="amount"
            keyboardType="number-pad"
            selectTextOnFocus
            style={[styles.stakeValue, { color: stakeOk ? t.text : t.muted }]}
          />
        </View>
        <Text style={[styles.stakeHint, { color: t.muted }]}>
          {amount !== suggested
            ? 'for this seat'
            : ledger.totalBoughtIn === 0
              ? 'the usual'
              : 'same as the table'}
        </Text>
      </View>
    </Sheet>
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
    gap: 10,
    marginHorizontal: space.card,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The label and the hint both hold their line; only the hint may wrap, and
  // the field between them keeps its width whatever the two of them do.
  stakeLabel: { fontSize: 16, fontWeight: '500', flexShrink: 0 },
  stakeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    // A fixed box. A text input left to itself takes whatever room is going
    // and squeezes the line beside it into a column of single words.
    width: 108,
    marginLeft: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stakeCurrency: { fontSize: 16, fontWeight: '700' },
  stakeValue: {
    // A width, not a flex: an input given `flex` inside a fixed box overflows
    // it on web and puts the figure outside its own field.
    width: 72,
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  stakeHint: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
