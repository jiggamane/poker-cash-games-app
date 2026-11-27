import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { money, resolveLedger } from '@poker-club/core';
import { formatMoney, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Card, CardRow } from '../src/components/Card';
import { Keypad } from '../src/components/Keypad';
import { PRESET_FITS, Preset } from '../src/components/Preset';
import { Sheet } from '../src/components/Sheet';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure } from '../src/design/tokens';
import { z } from '../src/design/scale';
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

  /*
   * THE ENTRY BEING CORRECTED, stated once at the top of both steps — the full
   * board's `entryHead`: a caps line over the headline, in a lifted card.
   */
  const head = (
    <Card pad>
      <Text style={[styles.label, { color: t.muted }]}>
        {`${clock(night.occurredAt[entry.id])} · ${entry.voided ? 'voided' : entry.corrected ? 'corrected since' : 'as logged'}`.toUpperCase()}
      </Text>
      <Text style={[styles.headline, { color: t.text }]}>
        {who} · {what} · {formatMoney(entry.amount)}
      </Text>
    </Card>
  );

  return (
    <Sheet
      title="One entry"
      /*
       * 09-navigation.md § sheets: a flow REPLACES ONE SHEET'S CONTENT and
       * keeps one close. The amount step carries the back circle the full
       * board draws (`entry-amount`, `stepBack`), and it goes back a step —
       * without it the only way out of the amount step was to dismiss the
       * whole sheet, so a mis-tap on "Change the amount" cost the host the
       * entry they had opened. The close is the sheet's, on both steps.
       */
      onBack={mode === 'amount' ? () => setMode('menu') : undefined}
      /*
       * THE FULL BOARD (`entry-amount`, `entry-amount-blocked`, approved): on
       * the amount step the correction is the bar, with the figure in it, faint
       * until the figure differs from the one logged. The menu step is a
       * choice, not a confirm, so it has no bar (`entry`).
       */
      bar={
        mode === 'amount'
          ? [
              {
                label: valid ? `Correct to ${formatMoney(money(amount))}` : 'Type the right amount',
                disabled: !valid || busy,
                onPress: () => void apply('correct'),
              },
            ]
          : undefined
      }
    >
      {mode === 'menu' ? (
        <View style={styles.body}>
          {head}
          {/* The sentence belongs to the choice, so it is on the step where the
              choice is made. On the amount step it would push the keypad off a
              short phone to say a thing that was read one tap ago. */}
          <Text style={[styles.explain, { color: t.muted }]}>
            The ledger is append-only. A correction does not erase this line — it writes a reversal
            underneath it, and both stay visible to everyone.
          </Text>

          {/* No chevrons (the full board): the two rows say what they write
              under their names rather than at the right. */}
          <Card>
            <CardRow
              name="Change the amount"
              meta="writes a correction"
              onPress={() => {
                field.offer(entry.amount);
                setMode('amount');
              }}
            />
            <CardRow
              last
              name={
                <Text style={{ color: entry.voided ? t.dim : t.red }}>
                  {entry.voided ? 'Already voided' : 'Void this entry'}
                </Text>
              }
              meta="writes a reversal"
              accessibilityLabel={entry.voided ? 'Already voided' : 'Void this entry'}
              onPress={entry.voided || busy ? undefined : () => void apply('void')}
            />
          </Card>

          {/* ⚠ The board keeps Close, outlined, and flags that it repeats the
              sheet's own close now that it is not a full-width footer. */}
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <View style={styles.body}>{head}</View>
          <View style={styles.amountRow}>
            <Text
              {...cappedFigure}
              style={[
                styles.amount,
                typedFigureSize(formatMoney(money(amount)), z(56)),
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

          {/* The pad runs to the bar, as on /log. */}
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
  /* The sheet's body: the kit's `.mbody`, 20 in and 12 between groups. */
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },
  label: { fontSize: z(10.5), lineHeight: z(10.5), fontWeight: '700', letterSpacing: z(1.05) },
  /* The kit's `.h2` at the 21 the board sets it in here. */
  headline: { fontFamily: 'head', fontSize: z(21), fontWeight: '700', letterSpacing: z(-0.21), lineHeight: z(24), marginTop: z(7) },

  explain: { fontSize: z(13), lineHeight: z(18.85), marginHorizontal: z(2) },

  /* The typed figure and the presets: /log's, at the board's 56. */
  amountRow: { alignItems: 'center', paddingTop: z(14), paddingBottom: z(14) },
  presets: { flexDirection: 'row', gap: z(8), paddingHorizontal: z(20), paddingBottom: z(14) },
  amount: { fontFamily: 'head', fontSize: z(56), fontWeight: '800', letterSpacing: z(-2.52), fontVariant: ['tabular-nums'] },

  note: { fontSize: z(13), lineHeight: z(18.85), marginHorizontal: z(22) },
});
