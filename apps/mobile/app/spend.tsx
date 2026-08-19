import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import {
  addSpend,
  spendsOf,
  standingsOf,
  useNight,
  voidSpend,
  type Cover,
} from '../src/lib/nightStore';

/** The three words the chips write into the note. They are prefills, not types. */
const PREFILLS = ['Food', 'Drinks', 'Venue'];

/**
 * Add a spend — L2 — and edit one — L3. 11-bill-and-piggy-bank.md.
 *
 * One screen, no steps: an amount, an optional note, and who covered it. The
 * time is stamped on save and there is no time field, because a round of
 * drinks is bought now and back-dating it changes nothing about the money.
 *
 * THERE IS NO TYPE ON A SPEND. The chips above the note are prefills that write
 * a word into the note; nothing but the amount affects the arithmetic, and an
 * empty note is valid — the bill then shows the amount alone.
 *
 * Covered by has four cases and they are not decoration: one player is repaid
 * exactly what they fronted, several players must sum to the spend before Save
 * will go, the piggy bank is repaid nothing because the money left it, and
 * nobody yet leaves the spend on the bill and unpaid until someone is named.
 */
export default function SpendScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const existing = useMemo(
    () =>
      night === null || ledger === null || id === undefined
        ? undefined
        : spendsOf(night, ledger).find((s) => s.id === id),
    [night, ledger, id],
  );

  const [typed, setTyped] = useState<string>(
    existing === undefined ? '0' : String(existing.amount),
  );
  const [note, setNote] = useState<string>(existing?.note ?? '');
  const [cover, setCover] = useState<CoverPick>(
    existing === undefined
      ? { kind: 'unpaid' }
      : existing.coveredBy !== null
        ? { kind: existing.coveredBy }
        : { kind: 'players', ids: existing.fronters.map((f) => f.playerId) },
  );
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries((existing?.fronters ?? []).map((f) => [f.playerId, String(f.amount)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (night === null || ledger === null) return <Sheet title="A spend">{null}</Sheet>;

  const amount = typed === '' ? 0 : Number(typed);
  const seated = standingsOf(night, ledger).filter((s) => s.played);

  /*
   * Several fronters must sum to the spend. This is blocking, not a warning:
   * two people who between them put in less than the bar was paid means the
   * ledger is describing money that did not move.
   */
  const picked = cover.kind === 'players' ? cover.ids : [];
  const fronted = picked.reduce((sum, pid) => sum + (Number(shares[pid] ?? '0') || 0), 0);
  const sharesAddUp = picked.length <= 1 || fronted === amount;
  const valid =
    Number.isInteger(amount) && amount > 0 && (cover.kind !== 'players' || picked.length > 0) && sharesAddUp;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const value = money(amount);
      /*
       * An edit is a void of the old lines and a fresh write, which is what
       * append-only means here: the original stays in the ledger and the bill
       * shows what is true now. It is two writes, never an update.
       */
      if (existing !== undefined) await voidSpend(existing.entryIds);
      await addSpend(value, note, asCover(cover, picked, shares, value));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (existing === undefined || busy) return;
    setBusy(true);
    try {
      await voidSpend(existing.entryIds);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={existing === undefined ? 'Add a spend' : 'The spend'}
      sub={
        existing === undefined
          ? `stamped ${now()}`
          : `logged ${existing.at}${existing.entryIds.length > 1 ? ' · fronted by several' : ''}`
      }
      footer={
        <>
          <Button
            label={
              !sharesAddUp
                ? `${formatMoney(Math.abs(amount - fronted) as Money)} ${fronted < amount ? 'still to cover' : 'too much covered'}`
                : amount === 0
                  ? 'Type an amount'
                  : existing === undefined
                    ? `Add ${formatMoney(money(amount))} to the bill`
                    : 'Save changes'
            }
            variant="primary"
            disabled={!valid || busy}
            onPress={() => void save()}
          />
          {existing !== undefined && (
            <Button
              label="Void this spend"
              variant="destructive"
              disabled={busy}
              onPress={() => void discard()}
            />
          )}
        </>
      }
    >
      <Text style={[styles.amount, { color: amount > 0 ? t.text : t.muted }]}>
        {formatMoney(money(amount))}
      </Text>

      <View style={styles.block}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: t.muted }]}>NOTE</Text>
          <Text style={[styles.optional, { color: t.dim }]}>optional</Text>
        </View>
        <View style={styles.chips}>
          {PREFILLS.map((word) => (
            <Pressable
              key={word}
              accessibilityRole="button"
              onPress={() => setNote(word)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.chipLabel, { color: t.text }]}>{word}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What it was"
          placeholderTextColor={t.muted}
          autoCapitalize="sentences"
          style={[
            styles.input,
            {
              color: t.text,
              backgroundColor: t.surface,
              borderColor: note.trim() === '' ? t.dashed : t.hairline,
              borderStyle: note.trim() === '' ? 'dashed' : 'solid',
            },
          ]}
        />
      </View>

      <View style={styles.block}>
        <Text style={[styles.label, { color: t.muted }]}>COVERED BY</Text>
        <View style={styles.chips}>
          {seated.map((p) => {
            const on = cover.kind === 'players' && cover.ids.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() =>
                  setCover((c) => ({
                    kind: 'players',
                    ids:
                      c.kind === 'players' && c.ids.includes(p.id)
                        ? c.ids.filter((x) => x !== p.id)
                        : [...(c.kind === 'players' ? c.ids : []), p.id],
                  }))
                }
                style={({ pressed }) => [
                  styles.chip,
                  on
                    ? { backgroundColor: t.text, borderColor: t.text }
                    : { borderColor: t.quietOutline },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]}>{p.name}</Text>
              </Pressable>
            );
          })}

          <CoverChip
            label="The piggy bank"
            on={cover.kind === 'kitty'}
            onPress={() => setCover({ kind: 'kitty' })}
          />
          <CoverChip
            label="Nobody yet"
            dashed
            on={cover.kind === 'unpaid'}
            onPress={() => setCover({ kind: 'unpaid' })}
          />
        </View>

        {picked.length > 1 && (
          <View style={styles.shares}>
            {picked.map((pid) => (
              <View key={pid} style={styles.shareRow}>
                <Text style={[styles.shareName, { color: t.text }]}>
                  {seated.find((s) => s.id === pid)?.name ?? 'Someone'}
                </Text>
                <TextInput
                  value={shares[pid] ?? ''}
                  onChangeText={(v) =>
                    setShares((s) => ({ ...s, [pid]: v.replace(/[^0-9]/g, '') }))
                  }
                  // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                  // to a digits-only keyboard.
                  testID="amount"
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={t.muted}
                  style={[
                    styles.shareInput,
                    {
                      color: t.text,
                      backgroundColor: t.surface,
                      borderColor: sharesAddUp ? t.hairline : t.danger,
                    },
                  ]}
                />
              </View>
            ))}
            <Text style={[styles.shareNote, { color: sharesAddUp ? t.muted : t.danger }]}>
              {formatMoney(fronted as Money)} of {formatMoney(money(amount))} covered.
            </Text>
          </View>
        )}

        <Text style={[styles.explain, { color: t.muted }]}>
          {cover.kind === 'kitty'
            ? 'The piggy bank paid it directly. Nobody is reimbursed — the money has already left it.'
            : cover.kind === 'unpaid'
              ? 'It counts towards the bill and stays tagged unpaid until somebody is named.'
              : 'Fronting is not exemption: whoever put money in gets exactly that back, and still pays their own share.'}
        </Text>
      </View>

      {error !== null && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}

      {existing === undefined && (
        <Keypad
          onDigits={(d) => setTyped((c) => appendDigits(c, d))}
          onBackspace={() => setTyped((c) => (c.length <= 1 ? '0' : c.slice(0, -1)))}
        />
      )}
    </Sheet>
  );
}

type CoverPick = { kind: 'players'; ids: PlayerId[] } | { kind: 'kitty' } | { kind: 'unpaid' };

/**
 * One fronter gets the whole spend without a per-person field; several carry
 * what was typed against each name.
 */
function asCover(
  pick: CoverPick,
  ids: PlayerId[],
  shares: Record<string, string>,
  amount: Money,
): Cover {
  if (pick.kind !== 'players') return { kind: pick.kind };
  if (ids.length === 1) return { kind: 'players', shares: [{ playerId: ids[0]!, amount }] };
  return {
    kind: 'players',
    shares: ids.map((playerId) => ({
      playerId,
      amount: money(Number(shares[playerId] ?? '0') || 0),
    })),
  };
}

function CoverChip({
  label,
  on,
  dashed = false,
  onPress,
}: {
  label: string;
  on: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        on
          ? { backgroundColor: t.text, borderColor: t.text }
          : { borderColor: dashed ? t.dashed : t.quietOutline, borderStyle: dashed ? 'dashed' : 'solid' },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.chipLabel, { color: on ? t.onFill : dashed ? t.muted : t.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const now = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  amount: {
    fontSize: 68,
    fontWeight: '800',
    letterSpacing: -3.4,
    lineHeight: 70,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: 18,
  },

  block: { marginHorizontal: space.card, marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { ...type.label, marginBottom: 10 },
  optional: { ...type.meta, marginLeft: 'auto', marginBottom: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },

  input: {
    ...type.body,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  shares: { marginTop: 14, gap: 8 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareName: { ...type.rowName, flexShrink: 1 },
  shareInput: {
    ...type.figure,
    marginLeft: 'auto',
    minWidth: 110,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shareNote: { ...type.meta, marginTop: 2 },

  explain: { ...type.footnote, marginTop: 12 },
  error: { ...type.footnote, marginHorizontal: space.card, marginBottom: 12 },
});
