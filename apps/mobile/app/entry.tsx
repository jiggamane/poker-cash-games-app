import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money, resolveLedger } from '@poker-club/core';
import { formatMoney, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { PRESET_FITS, Preset } from '../src/components/Preset';
import { Sheet } from '../src/components/Sheet';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure, radius, space, type } from '../src/design/tokens';
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
  /*
   * THE SAME KEYPAD AS EVERY OTHER AMOUNT IN THE APP, and it was not before.
   *
   * The logged figure is put up as an OFFER when the step opens, so the first
   * key replaces it — see `typedAmount.ts`. This screen used to seed the same
   * figure as plain text and append to it, which is the wrong way round
   * everywhere and worst here: a correction is nearly always a figure being
   * made SMALLER, and $500 with `5` `0` typed after it came out at $50,050.
   */
  const field = useTypedAmount();
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

  const amount = amountOf(field.typed, entry.amount);
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
      /*
       * 09-navigation.md § sheets: a flow REPLACES ONE SHEET'S CONTENT and
       * keeps one close, and the close goes back a step — the same shape as
       * New session and Invite. Without it the only way out of the amount
       * step was to dismiss the whole sheet, so a mis-tap on "Change the
       * amount" cost the host the entry they had opened.
       */
      onClose={mode === 'amount' ? () => setMode('menu') : undefined}
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
        <Text style={[styles.headline, { color: t.text }]}>
          {who} · {what} · {formatMoney(entry.amount)}
        </Text>
      </View>

      {/* The sentence belongs to the choice, so it is on the step where the
          choice is made. On the amount step it would push the keypad off a
          short phone to say a thing that was read one tap ago. */}
      {mode === 'menu' && (
        <Text style={[styles.explain, { color: t.muted }]}>
          The ledger is append-only. A correction does not erase this line — it writes a reversal
          underneath it, and both stay visible to everyone.
        </Text>
      )}

      {mode === 'menu' ? (
        <View style={styles.list}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              field.offer(entry.amount);
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
            <Text
              {...cappedFigure}
              style={[
                styles.amount,
                typedFigureSize(formatMoney(money(amount)), 68),
                { color: valid ? t.text : t.muted },
              ]}
            >
              {formatMoney(money(amount))}
            </Text>
          </View>
          {/*
            THE CHIP ROW THE OTHER AMOUNT SHEETS HAVE. Two figures are worth
            offering on a correction and there are only two: the amount as it
            stands, which is how a host backs out of a half-typed figure without
            leaving the sheet, and an empty field to type into. Same object as
            /log and /share — `src/components/Preset.tsx`, and B14's lesson.

            "as logged" is the words this screen already uses for the entry as
            it stands, on the card above. Nothing here is invented copy.
          */}
          <View style={styles.presets}>
            <Preset
              label={formatToFit(entry.amount, PRESET_FITS)}
              caption="AS LOGGED"
              on={amount === entry.amount}
              onPress={() => field.offer(entry.amount)}
            />
            <Preset
              label="Custom"
              caption="SET"
              on={amount !== entry.amount}
              onPress={() => field.offer(null)}
            />
          </View>

          <Keypad {...field.keys} />
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

  amountRow: { alignItems: 'center', paddingTop: 6, paddingBottom: 16 },
  // The row on /log, to the point: `gap:8; padding:0 20px 16px`.
  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, fontVariant: ['tabular-nums'] },

  note: { ...type.footnote, marginHorizontal: space.page },
});
