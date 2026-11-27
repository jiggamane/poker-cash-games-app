import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { paymentProgress, settle, type TransferLine } from '@poker-club/core';
import { formatMoney, formatToFit, roundingRowLabel, roundingRowValue } from '../src/lib/money';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { TotalsCard } from '../src/components/TotalsCard';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
import { cappedFigure } from '../src/design/tokens';
import { setPaid, settlementOf, transferKey, useNight } from '../src/lib/nightStore';

/**
 * Who pays whom — `2a`, from `design/handoff-game-end/`, cut 6 September, which
 * supersedes the 5 September `R2` cut on this screen.
 *
 * SETTLING AND PAYING ARE STILL SEPARATE, and no cut has ever touched that. The
 * book closes at the table; the money moves over the following week. Nothing on
 * this screen changes the night's result — a settled night stays settled whether
 * or not any cash has moved — and marking a payment is not a ledger entry.
 *
 * WHAT THE NEW CUT CHANGES is that the two states are one list again. R2 drew
 * them as two objects: hairline rows above, tinted slabs below, the settled ones
 * inert but for an `Undo`. This draws ONE list where a ticked row dims in place
 * and stays tappable — *"whole row is the tap target and toggles paid"*.
 *
 * ⚠ THAT IS THE APP'S MIXED-LIST RULE GOING THE OTHER WAY on this screen, and
 * the reason it is right here is that a transfer is not a finished thing. A
 * player who has cashed out is done for the night and a slab says so honestly.
 * A payment marked off is a claim about the world — "he sent it on Tuesday" —
 * which is wrong often enough that the app already had to build a way back
 * (B21). A row that stays a row, and stays tappable, IS that way back, and it
 * costs nothing: there is no second control to find and no word to read.
 * Recorded in `docs/screens.md`.
 *
 * THE HEADER IS THE SAME CARD `/settled` DREW, reading the same figure. `Left
 * to move` is `paymentProgress`'s `value.owed`, and so is the pill's amount —
 * the cut's rule, and the one thing on this screen that would be most
 * obviously broken if it were ever computed twice.
 *
 * THE FULL BOARD (`payments`, `payments-settled`, approved): the totals and
 * the step in one lifted card, the transfers in another under a quiet label
 * with the count at its right, the piggy-bank note, Nudge the table as a quiet
 * line, and Mark all as paid as the bar. With every row ticked there is no
 * primary, so no bar.
 */
export default function Payments() {
  const t = useTheme();
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settlementOf(night);
    } catch {
      return null;
    }
  }, [night]);

  const progress = useMemo(() => {
    if (result === null || night === null) return null;
    return paymentProgress(result, (from, to) =>
      night.paidAt.get(transferKey(from, to)) !== undefined,
    );
  }, [result, night]);

  if (night === null || result === null || progress === null) {
    return (
      <Screen title="Who pays whom" backTo="the results">
        {null}
      </Screen>
    );
  }

  const { lines, waiting, count, value } = progress;
  const done = waiting.length === 0;

  return (
    <Screen
      title="Who pays whom"
      meta={`${nightDate(night.startedAt)} · ${count.total} ${count.total === 1 ? 'transfer' : 'transfers'}`}
      backTo="the results"
      bar={
        done
          ? undefined
          : [
              {
                label: 'Mark all as paid',
                onPress: () => {
                  for (const line of waiting) {
                    /* Refused on a night another phone holds (`hold.ts`); the
                       tick simply does not land, and the row says so by not
                       changing. */
                    void setPaid(line.fromPlayerId, line.toPlayerId, true).catch(() => undefined);
                  }
                },
              },
            ]
      }
    >
      <View style={styles.column}>
      {/*
       * ⚠ AND NO `Close the night` WHERE THE CUT DRAWS ONE. Its 2a closes the
       * night from this screen; in this app the night was closed at settle-up,
       * before this screen can be reached at all, so the button would either do
       * nothing or claim to do something that already happened. What is left
       * once every row is ticked is a screen with nothing to do, and Chrome A's
       * back button is the way out — `09-navigation.md` forbids a pushed screen
       * a second one. The pill says `Settled`, which is the state the cut's
       * button was there to reach.
       */}
      <TotalsCard
        eyebrow="Left to move"
        amount={value.owed}
        owed={value.owed}
        anyPaid={count.settled > 0}
      >
        {/*
         * THE STEP, STATED AND LOCKED. The cut lets 2a change it — *"changing
         * the step here recomputes the transfers on screen"* — and its own body
         * copy ends *"changeable until the night is closed"*, which this night
         * is. Every transfer below was derived at this step and re-rounding a
         * record of what people actually paid is the thing rule 8 forbids. So
         * the row states it and opens nothing.
         *
         * A KIT ROW IN THE TOTALS CARD, as the board draws it, rather than
         * `RoundingBar` under it: the same label and value off the same two
         * `money.ts` calls, with no `onPress`, so it is no door.
         */}
        <CardRow
          name={roundingRowLabel(night.roundingMode)}
          value={roundingRowValue(night.roundingMode)}
          last
        />
      </TotalsCard>

      <SectionLabel text="Transfers" quiet right={`${count.settled} of ${count.total} paid`} />

      {count.total > 0 ? (
        <Card>
          {lines.map((line, i) => (
            <TransferRow key={line.key} line={line} last={i === lines.length - 1} />
          ))}
        </Card>
      ) : (
        <Text style={[styles.none, { color: t.muted }]}>
          Nothing to move: everyone left level.
        </Text>
      )}

      <View style={styles.note}>
        <Icon name="info" color={t.muted} size={z(14)} />
        <Text style={[styles.noteText, { color: t.muted }]}>
          The piggy bank is set aside for the group, so it stays on the book after the night closes.
        </Text>
      </View>

      {/*
       * ⚠ `Nudge the table` IS NOT DRAWN ON 2a EITHER, and it survives for the
       * reason it did under R2: this screen is the only door into `/nudge` in
       * the app. The full board keeps it in the content as a quiet line with
       * the message mark (`payments`, approved), and drops it with the bar once
       * every row is ticked.
       */}
      {!done && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/nudge')}
          style={({ pressed }) => [styles.quiet, pressed && { opacity: 0.6 }]}
        >
          <Icon name="message" color={t.muted} size={z(16)} />
          <Text style={[styles.quietText, { color: t.muted }]}>Nudge the table</Text>
        </Pressable>
      )}
      </View>
    </Screen>
  );
}

/**
 * `Levani → Goga  ₾500  ○` — the whole row is the tap target, and it goes both
 * ways.
 *
 * A host clears this list standing in a doorway with a phone in one hand, four
 * transfers landing in the same two minutes. What that wants is a checklist:
 * one tap per row, anywhere on the row. The marker on the right is still there
 * and still says what it says; it is simply not the only place the tap lands.
 *
 * THE PIGGY BANK IS A RECIPIENT LIKE ANY PERSON, and it is drawn in the muted
 * ink — the arrow with it — because it is the one row where the money is
 * leaving the players for good. (The app drew it in bone; the full board has no
 * bone token and draws it muted, flagged and approved.) Which recipients those
 * are is `paymentProgress`'s answer, not this screen's: the same membership test
 * that keeps a collector's float off anybody's result (B27).
 *
 * THE KIT'S ROW in the transfers card: a hairline under every row but the last,
 * no chevron. A paid row is the kit's `dimr` — its words in the dim ink, in
 * place, still a row and still a tap.
 */
function TransferRow({ line, last }: { line: TransferLine; last: boolean }) {
  const t = useTheme();

  /* Paid outranks the piggy bank's muted: a row that has been handed over is
     spent ink whoever it went to, or the piggy row would be the one row that
     never dims. */
  const ink = line.paid ? t.dim : line.toOffTable ? t.muted : t.text;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: line.paid }}
      /* The state, queryable. `accessibilityState` is the right thing for a
         screen reader and is not what reaches the DOM as an attribute the night
         pass can select on, so the two states are named here as well — and what
         the pass then holds is that a tick never takes a row OUT of the list,
         which is the regression to the slab treatment. */
      testID={line.paid ? 'transfer-paid' : 'transfer-open'}
      accessibilityLabel={`${line.from} pays ${line.to} ${formatMoney(line.amount)}`}
      accessibilityHint={line.paid ? 'Double tap to mark it unpaid.' : 'Double tap to mark it paid.'}
      onPress={() =>
        void setPaid(line.fromPlayerId, line.toPlayerId, !line.paid).catch(() => undefined)
      }
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: t.hairline },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.who, { color: ink }]} numberOfLines={1}>
        {line.from}
      </Text>
      <Icon name="arrow" color={line.paid ? t.dim : t.muted} size={z(15)} />
      <Text style={[styles.who, { color: ink }]} numberOfLines={1}>
        {line.to}
      </Text>
      <Text style={[styles.amount, { color: ink }]} numberOfLines={1} {...cappedFigure}>
        {formatToFit(line.amount, ROW_FITS)}
      </Text>

      {/*
       * 22 across, and two states rather than one drawn twice: an empty ring
       * while it is open, a ring in the win colour with a check once it is not.
       * The app filled it green; the look has no green fills, so the board
       * draws the ring and the check (`payments-settled`, flagged, approved).
       */}
      <View
        style={[
          styles.marker,
          { borderColor: line.paid ? t.win : t.outline },
        ]}
      >
        {line.paid && <Icon name="check" color={t.win} size={z(13)} />}
      </View>
    </Pressable>
  );
}

const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* The transfer amount at the kit's 16.5/700 (19 at 360), with two names giving
   beside it and the 22 marker after it: "$999,999" is about 100 of a row about
   290 wide, so seven digits print in full and a million goes compact. */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  /* The full board's pushed screen: 18 in from the sheet, 12 between groups. */
  column: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },

  /*
   * THE KIT'S ROW — 8 of padding each way, at least 44 tall, which is the tap
   * target a row has to be; it grows rather than clips when the reader turns
   * the text up.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(7),
    minHeight: z(44),
    paddingVertical: z(8),
  },
  /* The two names give and the figure does not — B18. The kit's row name. */
  who: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6), flexShrink: 1, minWidth: 0 },
  /* The kit's row figure, 700 16.5 in the figure face. */
  amount: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  marker: {
    width: z(22),
    height: z(22),
    borderRadius: z(11),
    borderWidth: 1.6,
    marginLeft: z(3),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  none: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85), marginHorizontal: z(2) },

  /* The info mark beside the kit's note, 9 apart, its top on the first line. */
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: z(9),
    marginHorizontal: z(2),
  },
  noteText: { flex: 1, fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },

  /* The kit's quiet line, `btnq`: 600 14, muted, at least 40 tall. */
  quiet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(6), minHeight: z(40) },
  quietText: { fontSize: z(14), fontWeight: '600' },
});
