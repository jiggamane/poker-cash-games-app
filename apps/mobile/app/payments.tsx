import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { paymentProgress, settle, type TransferLine } from '@poker-club/core';
import { formatMoney, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { TotalsCard } from '../src/components/TotalsCard';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure, space, unscaledLabel } from '../src/design/tokens';
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
 * THE HEADER IS THE SAME CARD `/settled` DRAWS, reading the same figure. `Left
 * to move` is `paymentProgress`'s `value.owed`, and so is the pill's amount on
 * both screens — the cut's rule, and the one thing on these two screens that
 * would be most obviously broken if it were ever computed twice.
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
      footer={
        done ? undefined : (
          <View style={styles.foot}>
            {/*
             * ⚠ `Nudge the table` IS NOT DRAWN ON 2a EITHER, and it survives for
             * the reason it did under R2: this screen is the only door into
             * `/nudge` in the app. The cut's footer is one button and it is not
             * this one, so the nudge is a chip above it. Delete it the day a
             * board draws the nudge somewhere else.
             */}
            <Button label="Nudge the table" variant="chip" onPress={() => router.push('/nudge')} />
            <Button
              label="Mark all as paid"
              variant="primary"
              onPress={() => {
                for (const line of waiting) {
                  void setPaid(line.fromPlayerId, line.toPlayerId, true);
                }
              }}
            />
          </View>
        )
      }
    >
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
      />

      {/*
       * THE STEP, STATED AND LOCKED. The cut lets 2a change it — *"changing the
       * step here recomputes the transfers on screen"* — and its own body copy
       * ends *"changeable until the night is closed"*, which this night is. Every
       * transfer below was derived at this step and re-rounding a record of what
       * people actually paid is the thing rule 8 forbids. So the row states it
       * and opens nothing.
       */}
      <RoundingBar mode={night.roundingMode} style={styles.rounding} />

      <View style={styles.list}>
        <View style={styles.listHead}>
          <Text style={[styles.eyebrow, { color: t.muted }]} {...unscaledLabel}>
            Transfers
          </Text>
          <Text style={[styles.listCount, { color: t.muted }]}>
            {`${count.settled} of ${count.total} paid`}
          </Text>
        </View>

        {lines.map((line) => (
          <TransferRow key={line.key} line={line} />
        ))}

        {count.total === 0 && (
          <Text style={[styles.none, { color: t.muted }]}>
            Nothing to move: everyone left level.
          </Text>
        )}
      </View>

      <View style={styles.note}>
        <Icon name="info" color={t.muted} size={14} />
        <Text style={[styles.noteText, { color: t.muted }]}>
          The piggy bank is set aside for the group, so it stays on the book after the night closes.
        </Text>
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
 * THE PIGGY BANK IS A RECIPIENT LIKE ANY PERSON, and it is drawn in bone —
 * the arrow with it — because it is the one row where the money is leaving the
 * players for good. Which recipients those are is `paymentProgress`'s answer,
 * not this screen's: the same membership test that keeps a collector's float
 * off anybody's result (B27).
 */
function TransferRow({ line }: { line: TransferLine }) {
  const t = useTheme();

  /* Paid outranks bone: a row that has been handed over is spent ink whoever
     it went to, or the piggy row would be the one row that never dims. */
  const ink = line.paid ? t.dim : line.toOffTable ? t.offTable : t.text;

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
      onPress={() => void setPaid(line.fromPlayerId, line.toPlayerId, !line.paid)}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: t.hairline, opacity: line.paid ? 0.62 : 1 },
        pressed && { opacity: line.paid ? 0.4 : 0.6 },
      ]}
    >
      <Text style={[styles.who, { color: ink }]} numberOfLines={1}>
        {line.from}
      </Text>
      <Icon name="arrow" color={line.paid ? t.disabled : line.toOffTable ? t.offTable : t.dim} size={15} />
      <Text style={[styles.who, { color: ink }]} numberOfLines={1}>
        {line.to}
      </Text>
      <Text style={[styles.amount, { color: ink }]} numberOfLines={1} {...cappedFigure}>
        {formatToFit(line.amount, ROW_FITS)}
      </Text>

      {/*
       * 22 across, and two states rather than one drawn twice: an empty ring
       * while it is open, the win colour filled with a check once it is not.
       */}
      <View
        style={[
          styles.marker,
          line.paid
            ? { backgroundColor: t.win }
            : { borderWidth: 1.6, borderColor: t.quietOutline },
        ]}
      >
        {line.paid && <Icon name="check" color={t.ground} size={13} />}
      </View>
    </Pressable>
  );
}

const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* The transfer amount at 18/700, with two names giving beside it. */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  rounding: { marginTop: 14 },

  list: { marginHorizontal: space.page, marginTop: 16 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  listCount: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500', fontVariant: ['tabular-nums'] },

  /*
   * 14 of padding each way over a hairline, which comes to 48 with a 16pt name
   * in it — past the 44 a tap target has to be, and it grows rather than clips
   * when the reader turns the text up.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /* The two names give and the figure does not — B18. */
  who: { fontSize: 16, fontWeight: '600', flexShrink: 1, minWidth: 0 },
  amount: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  none: { fontSize: 14, fontWeight: '400', paddingVertical: 8 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginHorizontal: space.page,
    paddingTop: 11,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  foot: { gap: 10 },
});
