import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { APP_DEFAULT_BUY_IN, createClub } from '../src/lib/clubStore';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CZK'];

/**
 * New group — GR3. Three steps in one sheet, replacing their own content.
 *
 * A GROUP NEEDS ONLY A NAME. The currency has a default, the buy-in has a
 * default, the roster can be empty and the rules can be nothing at all — a
 * club with no rules simply takes nothing off the table. Everything after step
 * one can be skipped, and the last step says so rather than hiding it.
 */
export default function NewGroup() {
  const t = useTheme();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [buyIn, setBuyIn] = useState(String(APP_DEFAULT_BUY_IN));
  const [players, setPlayers] = useState<string[]>([]);
  const [typing, setTyping] = useState('');
  const [busy, setBusy] = useState(false);

  const named = name.trim() !== '';

  async function create() {
    if (!named || busy) return;
    setBusy(true);
    try {
      await createClub({
        name,
        currency,
        defaultBuyIn: money(Number(buyIn) || APP_DEFAULT_BUY_IN),
        playerNames: players,
      });
      router.dismissTo('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="New group"
      sub={['Name and currency', 'The money side', 'Who is in it'][step]}
      footer={
        step === 2 ? (
          <>
            <Button
              label={`Create ${name.trim()}`}
              variant="primary"
              disabled={!named || busy}
              onPress={() => void create()}
            />
            <Button
              label="Add players later"
              variant="secondary"
              disabled={!named || busy}
              onPress={() => void create()}
            />
          </>
        ) : (
          <>
            <Button
              label="Next"
              variant="primary"
              disabled={step === 0 && !named}
              onPress={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
            />
            {step === 1 && (
              <Button label="Skip · defaults are fine" variant="secondary" onPress={() => setStep(2)} />
            )}
          </>
        )
      }
    >
      {step === 0 && (
        <>
          <Field label="GROUP NAME">
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder="The Thursday game"
              placeholderTextColor={t.muted}
              autoCapitalize="words"
              style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.hairline }]}
            />
          </Field>

          <Field label="CURRENCY">
            <View style={styles.chips}>
              {CURRENCIES.map((c) => (
                <Chip key={c} label={c} on={c === currency} onPress={() => setCurrency(c)} />
              ))}
            </View>
          </Field>
        </>
      )}

      {step === 1 && (
        <>
          <Field label="STANDARD BUY-IN">
            <TextInput
              value={buyIn}
              onChangeText={(v) => setBuyIn(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.hairline }]}
            />
          </Field>

          <Text style={[styles.note, { color: t.muted }]}>
            It is only what a night opens with — the host can change it for one evening without
            changing it here. Bills, the kitty and fees are set in the group’s money rules once
            it exists; a group with none takes nothing off the table.
          </Text>
        </>
      )}

      {step === 2 && (
        <>
          <Field label="ADD BY NAME">
            <TextInput
              value={typing}
              onChangeText={setTyping}
              onSubmitEditing={() => {
                if (typing.trim() === '') return;
                setPlayers((p) => [...p, typing.trim()]);
                setTyping('');
              }}
              placeholder="Their name"
              placeholderTextColor={t.muted}
              autoCapitalize="words"
              returnKeyType="done"
              style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.hairline }]}
            />
          </Field>

          <View style={styles.chips}>
            {players.map((p, i) => (
              <Chip
                key={`${p}-${i}`}
                label={p}
                on
                onPress={() => setPlayers((all) => all.filter((_, x) => x !== i))}
              />
            ))}
          </View>

          <Text style={[styles.note, { color: t.muted }]}>
            A new group starts empty. Players you know are not carried over, and neither are their
            results elsewhere. Buy-ins default to {formatMoney(money(Number(buyIn) || APP_DEFAULT_BUY_IN))}.
          </Text>
        </>
      )}
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        on ? { backgroundColor: t.text, borderColor: t.text } : { borderColor: t.quietOutline },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: space.card, marginBottom: 20 },
  label: { ...type.label, marginBottom: 10 },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: space.card },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1.5 },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },
  note: { ...type.footnote, marginTop: 16, marginHorizontal: space.page },
});
