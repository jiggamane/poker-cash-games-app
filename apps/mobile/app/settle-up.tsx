import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import {
  balanceCheck,
  checkReconciliation,
  destinationTerm,
  destinationWord,
  endedWith,
  resolveLedger,
  resultFormula,
  settle,
  transfersInWords,
  type Money,
  type PlayerId,
  type RuleDestination,
} from '@poker-club/core';
import {
  formatMoney,
  formatSignedToFit,
  formatSignedUnmarked,
  formatToFit,
  formatToFitUnmarked,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { T, z } from '../src/design/scale';
import { cappedFigure } from '../src/design/tokens';
import {
  closeNight,
  nameOf,
  setAcknowledgement,
  settlementInput,
  settlementOf,
  standingsOf,
  useNight,
} from '../src/lib/nightStore';

/**
 * Settle up — E4, step 3 of 3 — and E5 when the night does not add up.
 * 13-after-the-night.md.
 *
 * The screen is the list of transfers and nothing else is given equal weight:
 * what a room needs at 1am is who hands what to whom. The count is stated in
 * WORDS above the list, so a wrong number is visible before anybody starts
 * handing over cash. THE PIGGY BANK IS A PAYEE LIKE ANYONE ELSE — frame `4a`
 * draws it as the last row of the same list, in the same ink, and this screen
 * gives it no wash and no panel of its own.
 *
 * TWO LISTS THAT DO NOT AGREE, ON PURPOSE. The transfers are balances — what
 * each person hands over or collects when the room breaks up, the food money
 * and the piggy bank included. `Night's net` underneath is scores: the same
 * figures E6 prints, with whatever somebody is holding for the room outside
 * them. See the note on `net` below, and B27.
 *
 * Every figure comes from the settlement engine. Nothing here does arithmetic
 * of its own; if a number looks wrong, the engine is wrong, and there is a test
 * for it.
 *
 * THE FULL BOARD (`settle-up`, `settle-up-off`, approved): the sentence that
 * counts the transfers is the sheet's first line rather than a lede on the ink;
 * the transfers are one lifted card of kit rows; the nets are outlined chips in
 * rows of three under a quiet label; the way back to the rules is the outlined
 * button; Close the session is the bar.
 */
export default function SettleUp() {
  const t = useTheme();
  const night = useNight();

  /**
   * The close gate, from this side.
   *
   * `settle()` throws when the count does not balance and nothing has been
   * confirmed. That is not an error to swallow — it is the rule, and catching
   * it here is what turns this screen into E5: the same step, stating the gap
   * and offering the three ways out of it.
   */
  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return {
        ok: true as const,
        value: settlementOf(night),
      };
    } catch {
      return { ok: false as const };
    }
  }, [night]);

  if (night === null || result === null) {
    return <Screen title="Settle up" backTo="Deductions">{null}</Screen>;
  }

  if (!result.ok) return <OutOfBalance night={night} />;

  const { deductions, players, transfers, rounding } = result.value;

  /**
   * Money that leaves the table for good, as opposed to money going back to
   * somebody who fronted it. A bill reimbursement is a person being repaid and
   * stays in plain ink; the piggy bank and the host's fee are bone.
   *
   * Only collectors who are NOT at the table qualify: if the piggy bank's holder is
   * also playing, the engine nets their winnings and the piggy bank into one
   * position, and colouring that row bone would be a lie about what it is.
   */
  const offTable = (() => {
    const map = new Map<PlayerId, RuleDestination>();
    const seated = new Set(players.filter((p) => p.boughtIn > 0).map((p) => p.playerId));
    for (const d of deductions) {
      if (d.destination === 'bill') continue;
      for (const c of d.credits) {
        if (!seated.has(c.playerId)) map.set(c.playerId, d.destination);
      }
    }
    return map;
  })();

  /*
   * THE NIGHT'S NET IS A SCORE, AND THE LIST ABOVE IT IS A BALANCE — B27, and
   * this is the third screen it applies to.
   *
   * The transfers say what each person hands over or collects when the room
   * breaks up, and the piggy bank is genuinely part of that: somebody has to be
   * given the envelope, and that is what `finalPosition` answers. A chip down
   * here answers a different question — how did their night go — and a host who
   * plays AND holds the piggy bank read their own night $126 heavy in it,
   * sorted above people who had played all night for more. `resultFormula` is
   * the engine's answer to both halves: the same list of people E6 draws, in
   * the same order, on the same figure, with the float outside it and named
   * where it went.
   *
   * So the two lists on this screen deliberately disagree, and the disagreement
   * is the point: the transfers move the food money and the piggy bank as well
   * as the winnings, and the nets are the winnings after the food money and the
   * piggy bank came off. Neither is computed here.
   */
  const net = resultFormula(result.value);

  /*
   * "The piggy bank is set aside for the group."
   *
   * `destinationWord` is where that phrase lives, so this screen and the rules
   * and the receipt all call the money the same thing. It used to say "the
   * kitty", which is the STORED value and a word no reader is ever meant to see.
   *
   * IT IS SAID WHETHER OR NOT THE HOLDER IS SITTING AT THE TABLE, and that is
   * the fix rather than the phrasing. The sentence used to be driven off the
   * map above — collectors who are NOT at the table — so a night where a player
   * holds the piggy bank said nothing about it at all: the float was folded into
   * that player's own transfer, they were listed by name like anybody else, and
   * the room handing them the cash had no line anywhere saying part of it was
   * the group's. The transfers are right either way; this is the sentence that
   * says what is inside them.
   */
  const setAside = [
    ...new Set(
      deductions
        .filter((d) => d.destination !== 'bill' && d.total !== 0)
        .map((d) => destinationWord(d.destination)),
    ),
  ];
  /* "Seven transfers clear the night" — the count reads as a word, not a digit,
     and the word comes off `transfersInWords` in core because the rounding sheet
     behind the row above states the same count for each step it offers. Two
     spellings of "seven" on one screen is how a room starts counting the list to
     check. Capitalised here because it opens the sentence. */
  const counted = transfersInWords(transfers.length);
  const lede =
    `${counted.charAt(0).toUpperCase()}${counted.slice(1)} ` +
    `${transfers.length === 1 ? 'clears' : 'clear'} the night.` +
    (setAside.length > 0 ? ` The ${setAside.join(' and ')} is set aside for the group.` : '');

  return (
    <Screen
      title="Settle up"
      backTo="Deductions"
      trailing={<Step label="3 of 3" />}
      /* Closed on the phone recording it — `hold.ts`. The store would refuse
         the close anyway; the control is taken off rather than left to do
         nothing, and with it the bar. */
      bar={
        night.hold === 'away'
          ? undefined
          : [
              {
                label: 'Close the session',
                onPress: () => {
                  /*
                   * `closeNight` and not `setStatus('settled')` — the close is not
                   * a status flag. It settles, hands the night to `verifyNight()`,
                   * freezes the result so no later engine can restate it, and
                   * queues the whole record for the server. See `closing.ts`.
                   *
                   * NAVIGATION WAITS FOR THE WRITE. It used to fire and forget,
                   * which was harmless while closing was one column and is not now:
                   * `/settled` reads the frozen result, and pushing before it
                   * exists would draw the night live for a frame and then swap the
                   * figures under the reader. The write is local SQLite — the queue
                   * drains separately and may fail all evening — so this is a few
                   * milliseconds, not a network round trip.
                   *
                   * A close that throws leaves the night open and the host on this
                   * screen, which is right: the only way `settle()` refuses here is
                   * an unbalanced count with no acknowledgement, and this screen
                   * already draws *Out of balance* for exactly that.
                   */
                  void closeNight().then(
                    () => {
                      router.dismissTo('/');
                      router.push('/settled');
                    },
                    () => {},
                  );
                },
              },
            ]
      }
      /*
        Share and Export used to sit in the footer with no onPress at all — two
        controls that did nothing, on the last screen of the night, at the
        moment the host most needs to trust what they are tapping. Sharing a
        night already exists, as the watcher link in Settings; export is not
        designed and `05-build-order.md` puts it in phase 4. An absent control
        is better than a dead one.
      */
    >
      <View style={styles.column}>
      {/* The count in words, first on the sheet (the board's `note`). */}
      <Text style={[styles.note, { color: t.muted }]}>{lede}</Text>

      {/*
       * THE STEP, ABOVE THE TRANSFERS AND NOT OWNED HERE —
       * `design/handoff-E2/docs/E2-rounding.md`, frames `4a`–`4d`. The
       * transfers are derived from the rounded nets, so they are multiples of
       * the step for free and are never rounded a second time; this row is what
       * says so, and what says who paid for it. Changing it here recomputes the
       * list underneath, because the sheet writes the night and the screen
       * reads it.
       */}
      <RoundingBar
        mode={night.roundingMode}
        /* `from: 'settle'` is what makes the sheet behind this row E4's rather
           than E2's: same sheet, same four steps, but each one states what the
           piggy bank ends up with and how many payments it would leave — frame
           `4b`. E2 owns the setting and states what the step guarantees, which
           is the question being asked while stacks are entered.

           NO `remainder` PROP any more: since B36 the step redistributes the
           positions and leaves nothing over, so there is no remainder for this
           row to name. */
        onPress={() =>
          router.push({ pathname: '/rounding', params: { scope: 'night', from: 'settle' } })
        }
        /* Another file's row, with its own 22 of side margin; in this column
           it takes the column's edge. */
        style={styles.rounding}
      />

      {transfers.length > 0 ? (
        <Card>
          {transfers.map((tr, i) => {
            /*
             * THE PIGGY BANK IS A PAYEE LIKE ANYONE ELSE — `13-after-the-night.md`,
             * verbatim, and frame `4a` draws it that way: the last row of the same
             * list, the same hairline, the same ink, reading `Karel → Piggy bank`.
             *
             * (The board's own transfer row, `settle-up`: the kit's row in the one
             * card, the last row without its hairline.)
             *
             * IT USED TO BE AN OBJECT. A bone wash, rounded, inset from the list,
             * because it is the one row where the money leaves the table for good
             * — which is true and is not this screen's business: a room reading
             * this list is handing over cash in order, and a row drawn as a panel
             * reads as a row that works differently. Where the bone belongs is E6,
             * on the block that says where the money ended up, and that is where
             * it now is.
             *
             * The name is `destinationTerm`, so a payee that is not a person is
             * still called what every other screen calls it.
             */
            const collected = offTable.get(tr.toPlayerId);
            return (
              <View
                key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`}
                style={[
                  styles.row,
                  i < transfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.hairline },
                ]}
              >
                <Text style={[styles.party, { color: t.text }]} numberOfLines={1}>
                  {nameOf(night, tr.fromPlayerId)}
                </Text>
                <Icon name="arrow" color={t.muted} size={z(15)} />
                <Text style={[styles.party, { color: t.text }]} numberOfLines={1}>
                  {collected === undefined
                    ? nameOf(night, tr.toPlayerId)
                    : destinationTerm(collected)}
                </Text>
                <Text style={[styles.amount, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
                  {formatToFit(tr.amount, ROW_FITS)}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : (
        <Text style={[styles.note, { color: t.muted }]}>
          Nothing to move: everyone left level.
        </Text>
      )}

      <SectionLabel text="Night’s net" quiet />
      <View style={styles.chips}>
        {net.map((f) => (
          <NetChip key={f.player.playerId} name={f.player.name} amount={f.net} />
        ))}
      </View>

      {/* The corner is empty on a pushed screen, so the way back to the rules
          is here, at the end, where a room that disagrees with a figure is
          already looking. The board's outlined button. */}
      <Button
        label="Change a rule and look again"
        variant="secondary"
        onPress={() => router.push('/money-rules')}
      />
      </View>
    </Screen>
  );
}

/**
 * E5 · Settle up · out of balance.
 *
 * The gap is stated twice — as a tag and as a sentence naming both figures and
 * both likely causes — because a host who is $150 out needs to know which $150
 * before they can look for it. Fixing happens HERE: every counted player is a
 * row into their own count.
 *
 * Three routes out, and the third is the footnote: writing the difference off
 * records it against the night and shows it to everybody. It is a decision, not
 * a dismissal, which is why it is a sentence rather than a button.
 */
function OutOfBalance({ night }: { night: NonNullable<ReturnType<typeof useNight>> }) {
  const t = useTheme();
  const ledger = resolveLedger(night.entries);

  const reconciliation = checkReconciliation(settlementInput(night));

  const short = reconciliation.difference < 0;
  const off = Math.abs(reconciliation.difference) as Money;

  const counted = standingsOf(night, ledger)
    .filter((s) => s.played)
    .map((s) => {
      const out = endedWith(ledger, s.id, night.finalCounts);
      return { ...s, out, result: (out - s.boughtIn) as Money };
    });

  /*
   * THE SAME TWO FIGURES THE COUNT SCREEN COMPARES — B40, and off the same
   * engine call so they cannot drift.
   *
   * The sentence used to read `$5,000 went in, $2,860 was counted out`, which
   * pairs everything that went in against the final counts alone and leaves the
   * $2,120 somebody cashed out during play on neither side. Read literally it
   * described a $2,140 hole under a tag saying $20. That is exactly the fault
   * the balance block on E2 was rebuilt to remove — *that is half a sum* — and
   * this screen, whose entire job is naming which money is missing, never got
   * the same treatment.
   *
   * `accountedFor` is the cash-outs plus the counts, which is the other side of
   * `boughtIn`, and `balanceCheck` is what E2 states its whole equation from.
   */
  const balance = balanceCheck(
    ledger,
    night.finalCounts,
    counted.filter((s) => s.atTable).map((s) => s.id),
  );

  async function writeOff() {
    await setAcknowledgement({
      amount: reconciliation.difference,
      confirmedByUserId: 'host',
      confirmedAt: new Date().toISOString(),
      note: `Written off at settle-up: ${formatMoney(reconciliation.difference)}.`,
    });
  }

  return (
    <Screen
      title="It doesn’t add up"
      /* E5 replaces E4 in the flow, but it is only ever ARRIVED at from the
         count: a night that does not balance skips the deductions entirely
         (E2 sends it straight here), so back goes one step, to the count. */
      backTo="Count up"
      /*
       * THE BAR KEEPS THE APP'S TWO CONTROLS (the board's note on
       * `settle-up-off`): Settle the night, blocked, and Fix beside it. The
       * board draws Fix as a narrow half with its mark over the word; `Bar`
       * draws two equal halves, so it is that, with the pencil beside the word.
       */
      bar={[
        { label: 'Settle the night', disabled: true },
        { label: 'Fix', icon: 'pencil', onPress: () => router.dismissTo('/count-up') },
      ]}
    >
      <View style={styles.column}>
      {/*
       * THE ALARM, as the board draws it: a padded card with the red label
       * over the sentence. The app drew it on a red wash with a red edge; the
       * look has no danger surface (flagged on `settle-up-off`, approved).
       */}
      <Card pad style={styles.alert}>
        <Text style={[T.lookLabel, styles.alertLabel, { color: t.red }]}>Off by {formatMoney(off)}</Text>
        <Text style={[styles.alertBody, { color: t.text }]}>
          {formatMoney(balance.boughtIn)} went in, {formatMoney(balance.accountedFor)} is
          accounted for.{' '}
          {short
            ? 'Someone’s stack is short, or a buy-in was never written down.'
            : 'A count is too high, or a buy-in was written down twice.'}
        </Text>
      </Card>

      <SectionLabel text="Counted" quiet />

      {/* Every counted player is a row into their own count — the kit's row,
          names only and nothing pointing: no avatar, no chevron. */}
      <Card>
        {counted.map((s, i) => (
          <CardRow
            key={s.id}
            name={s.name}
            last={i === counted.length - 1}
            onPress={() => router.push({ pathname: '/log', params: { player: s.id, kind: 'count' } })}
            /* `in 500 · out 2,120`, unmarked — the rule of 19 September, in
               `money.ts`. The two stacks are what the figure on the right of
               this row is made of, and that figure keeps the mark.

               THIS IS E5's LIST, NOT E4's: the balanced screen draws
               transfers and net chips and no sub-line at all. */
            meta={`in ${formatToFitUnmarked(s.boughtIn, ROW_FITS)} · out ${formatToFitUnmarked(s.out, ROW_FITS)}`}
            /* A fact in two figures: it wraps rather than losing one. */
            wrapMeta
            trail={
              <Text
                style={[styles.result, { color: moneyColor(t, s.result) }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatSignedToFit(s.result, ROW_FITS)}
              </Text>
            }
          />
        ))}
      </Card>

      {/* Writing the difference off is a decision, not a dismissal, so it stays
          a sentence and not a button — on the sheet, under the list, as the
          board draws it. */}
      <Text style={[styles.note, { color: t.muted }]}>
        Fix a count, add the missing buy-in, or{' '}
        <Text style={styles.writeOff} onPress={() => void writeOff()}>
          write the difference off to the piggy bank
        </Text>
        .
      </Text>
      </View>
    </Screen>
  );
}

/**
 * A name and a signed figure, outlined rather than filled.
 *
 * No currency symbol, and it was the first thing in the app to go without one:
 * in a row of six the sign is the information, and six dollar signs are six
 * pieces of noise. That is the app's general rule for a working now — see
 * `money.ts`.
 *
 * IT WAS FILLED with the win or the loss wash, and E6's rule applies here for
 * the same reason it applies to the settled screen — the green and the red sit
 * only on the figures. A chip that carries a signed number AND a coloured
 * ground states one fact twice, and the ground is the half that has to survive
 * a phone at arm's length in bad light. The outline keeps the chip an object
 * without giving it an opinion.
 *
 * THE FULL BOARD (`settle-up`): three to a row, name and figure centred, 32
 * tall at radius 10. Three to a row by a 30% floor rather than a fixed third,
 * so a chip carrying a figure in the millions grows onto a row of its own
 * instead of clipping — the figure is never abbreviated here.
 */
function NetChip({ name, amount }: { name: string; amount: Money }) {
  const t = useTheme();
  const won = amount >= 0;
  return (
    <View style={[styles.chip, { borderColor: t.hairline }]}>
      <Text style={[styles.chipName, { color: t.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.chipFigure, { color: won ? t.win : t.loss }]} numberOfLines={1} {...cappedFigure}>
        {formatSignedUnmarked(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* The full board's pushed screen: 18 in from the sheet, 12 between groups. */
  column: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },
  /* The kit's `note`: 13/1.45, muted. */
  note: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
  /* `RoundingBar` carries its own side margin; the column's edge wins here. */
  rounding: { marginHorizontal: 0 },

  /* The kit's row, the two names and the arrow in its left words. */
  row: { flexDirection: 'row', alignItems: 'center', gap: z(7), minHeight: z(44), paddingVertical: z(8) },
  party: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6), flexShrink: 1 },
  amount: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: z(6) },
  /*
   * An outlined chip: 1 of hairline, centred, the name 600 12 and the figure in
   * the figure face. `minHeight`, so it grows with the reader's text setting.
   */
  chip: {
    flexGrow: 1,
    minWidth: '30%',
    minHeight: z(32),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(4),
    paddingHorizontal: z(4),
    borderWidth: 1,
    borderRadius: z(10),
  },
  chipName: { fontSize: z(12), fontWeight: '600', flexShrink: 1 },
  chipFigure: { fontFamily: 'head', fontSize: z(12), fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 0 },

  // --- out of balance ------------------------------------------------------
  /* The label 7 over the sentence, the kit's padded card. */
  alert: { gap: z(7) },
  alertLabel: { textTransform: 'uppercase' },
  alertBody: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },

  /*
   * WHERE THE COUNTED ROW RUNS OUT OF ROOM — see ROW_FITS at the foot of this
   * file. The kit's row: the name over its in-and-out line, the result beside
   * it, inside a card 12 in on each side of an 18-inset column.
   */
  // Never shrinks: the name and its in-and-out line may wrap, a figure may not.
  result: {
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },

  writeOff: { textDecorationLine: 'underline' },
});

/*
 * WHAT THE COUNTED ROW ON E5 HOLDS EXACTLY — and, since the transfer rows above
 * took the same threshold, what one of those holds too.
 *
 * A TRANSFER ROW is two names, an arrow and an amount, and the amount is the one
 * child that may not give: `formatMoney` never abbreviated, so a table playing
 * for millions pushed `$1,201,400` into a row already holding two names and the
 * figure wrapped. It is `formatToFit` at the same ten thousand as the row below,
 * because they are the same width and the same figure — and the names
 * ellipsise, which is the right thing for a word and the wrong thing for money.
 *
 * THE FULL BOARD'S ROW (24 November) gave the row back the avatar and the
 * chevron it used to spend, and took it in the card's insets: at 360 the row is
 * about 290 wide, shared by the in-and-out line at the kit's 12 and the result
 * at its 16.5/700 (both through `z()`, about 1.15 there). Five digits fit with
 * room; the threshold stays where it was measured rather than chasing the new
 * room, because the line under the name scales with the reader's text and the
 * figure does not.
 *
 * Nothing clipped when it stopped fitting, which is why this lived: the row
 * simply grew and the RESULT ITSELF broke across two lines, "−$1,201,400" as
 * "−$1,201," over "400". A number split down the middle is the one thing a
 * money column may never do. See `docs/bugs.md`.
 *
 * The in-and-out line and the result take the same threshold: they are the same
 * fact stated twice and abbreviating one of them alone reads as two scales.
 * The exact figures are a tap away on the row itself — it opens that person's
 * count — which is the condition `formatCompact` sets for rounding at all.
 */
const ROW_FITS = 10_000;
