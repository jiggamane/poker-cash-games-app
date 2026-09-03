import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { formatMoney, formatSignedToFit, formatSignedUnmarked, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { nameOf, setAcknowledgement, setStatus, settlementInput, standingsOf, useNight } from '../src/lib/nightStore';

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
        value: settle(settlementInput(night)),
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
      lede={lede}
      footer={
        <>
          <Button
            label="Close the session"
            variant="primary"
            onPress={() => {
              void setStatus('settled');
              router.dismissTo('/');
              router.push('/settled');
            }}
          />
          {/*
            Share and Export used to sit here with no onPress at all — two
            controls that did nothing, on the last screen of the night, at the
            moment the host most needs to trust what they are tapping.
            Sharing a night already exists, as the watcher link in Settings;
            export is not designed and `05-build-order.md` puts it in phase 4.
            An absent control is better than a dead one.
          */}
        </>
      }
    >
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
        style={styles.rounding}
      />

      <View style={styles.list}>
        {transfers.map((tr, i) => {
          /*
           * THE PIGGY BANK IS A PAYEE LIKE ANYONE ELSE — `13-after-the-night.md`,
           * verbatim, and frame `4a` draws it that way: the last row of the same
           * list, the same hairline, the same ink, reading `Karel → Piggy bank`.
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
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth:
                    i === transfers.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.party, { color: t.text }]} numberOfLines={1}>
                {nameOf(night, tr.fromPlayerId)}
              </Text>
              <Icon name="arrow" color={t.muted} size={18} />
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

        {transfers.length === 0 && (
          <Text style={[styles.blocked, { color: t.muted }]}>
            Nothing to move: everyone left level.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Night’s net</Text>
        <View style={styles.chips}>
          {net.map((f) => (
            <NetChip key={f.player.playerId} name={f.player.name} amount={f.net} />
          ))}
        </View>
      </View>

      {/* The corner is empty on a pushed screen, so the way back to the rules
          is here, at the end, where a room that disagrees with a figure is
          already looking. */}
      <Button
        label="Change a rule and look again"
        variant="chip"
        style={styles.edit}
        onPress={() => router.push('/money-rules')}
      />
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
      footer={
        <>
          <Text style={[styles.footnote, { color: t.muted }]}>
            Fix a count, add the missing buy-in, or{' '}
            <Text style={styles.writeOff} onPress={() => void writeOff()}>
              write the difference off to the piggy bank
            </Text>
            .
          </Text>
          <View style={styles.footerRow}>
            <Button label="Settle the night" variant="blocked" style={styles.settle} />
            <Button
              label="Fix"
              variant="secondary"
              style={styles.fix}
              onPress={() => router.dismissTo('/count-up')}
            />
          </View>
        </>
      }
    >
      <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
        <Text style={[styles.alertLabel, { color: t.danger }]}>Off by {formatMoney(off)}</Text>
        <Text style={[styles.alertBody, { color: t.text }]}>
          {formatMoney(balance.boughtIn)} went in, {formatMoney(balance.accountedFor)} is
          accounted for.{' '}
          {short
            ? 'Someone’s stack is short, or a buy-in was never written down.'
            : 'A count is too high, or a buy-in was written down twice.'}
        </Text>
      </View>

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Counted</Text>

        {counted.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/log', params: { player: s.id, kind: 'count' } })}
            style={({ pressed }) => [
              styles.countRow,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === counted.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: t.surface }]}>
              <Text style={[styles.initial, { color: t.muted }]}>
                {s.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>
                in {formatToFit(s.boughtIn, ROW_FITS)} · out {formatToFit(s.out, ROW_FITS)}
              </Text>
            </View>
            <Text
              style={[styles.result, { color: moneyColor(t, s.result) }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(s.result, ROW_FITS)}
            </Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

/**
 * A name and a signed figure, outlined rather than filled.
 *
 * No currency symbol: in a row of six the sign is the information, and six
 * dollar signs are six pieces of noise.
 *
 * IT WAS FILLED with the win or the loss wash, and E6's rule applies here for
 * the same reason it applies to the settled screen — the green and the red sit
 * only on the figures. A chip that carries a signed number AND a coloured
 * ground states one fact twice, and the ground is the half that has to survive
 * a phone at arm's length in bad light. The outline keeps the chip an object
 * without giving it an opinion.
 */
function NetChip({ name, amount }: { name: string; amount: Money }) {
  const t = useTheme();
  const won = amount >= 0;
  return (
    <View style={[styles.chip, { borderColor: t.hairline }]}>
      <Text style={[styles.chipName, { color: t.text }]}>{name}</Text>
      <Text style={[styles.chipFigure, { color: won ? t.win : t.loss }]}>
        {formatSignedUnmarked(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Above the transfers, under the lede that counts them. */
  rounding: { marginBottom: 4 },
  list: { marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  party: { ...type.rowName, flexShrink: 1 },
  amount: { ...type.figure, marginLeft: 'auto', flexShrink: 0 },

  // 22 above, 22 aside — and the label carries the rows' own 4 of inset so it
  // lines up with the names beneath it rather than with the hairline.
  section: { marginTop: space.section, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  // A point of padding back on each side, which is what the 1px outline takes:
  // an outlined chip and a filled one are the same object at the same size.
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.pressable,
  },
  chipName: type.netName,
  chipFigure: type.netFigure,
  edit: { marginHorizontal: space.card, marginTop: 20 },

  blocked: { ...type.footnote, paddingHorizontal: 4 },

  // --- out of balance ------------------------------------------------------
  // E5: `0 20px 16px` · `16px 18px` · gap 6 · radius 8. Not a card — a card's
  // 14 put a rounder corner on the one block that has to read as an alarm.
  alert: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  // 13.5/1.5 as drawn, not the 14.5 lede: this sentence sits inside a block
  // and a lede sits under a title.
  alertBody: { fontSize: 13.5, fontWeight: '400', lineHeight: 20.25 },

  /*
   * WHERE THE COUNTED ROW RUNS OUT OF ROOM — see ROW_FITS at the foot of this
   * file. Everything fixed on the row is named here: an avatar of 36, a chevron
   * of about 16, four gaps of 12 and 8 of padding, which is 108 of a 316-wide
   * row on a 360 phone. What is left is shared by the name over its in-and-out
   * line and the result beside it.
   */
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 14, fontWeight: '700' },
  rowText: { gap: 2, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  // Never shrinks: the name and its in-and-out line may wrap, a figure may not.
  result: { fontSize: 18, fontWeight: '700', marginLeft: 'auto', flexShrink: 0, fontVariant: ['tabular-nums'] },

  footnote: type.footnote,
  writeOff: { textDecorationLine: 'underline' },
  settle: { flex: 2 },
  fix: { flex: 1 },

  footerRow: { flexDirection: 'row', gap: 10 },
});

/*
 * WHAT THE COUNTED ROW ON E5 HOLDS EXACTLY — and, since the transfer rows above
 * took the same threshold, what one of those holds too.
 *
 * A TRANSFER ROW is two names, an arrow and an amount, and the amount is the one
 * child that may not give: `formatMoney` never abbreviated, so a table playing
 * for millions pushed `$1,201,400` into a row already holding two names and the
 * figure wrapped. It is `formatToFit` at the same ten thousand as the row below,
 * because they are the same width and the same 19/700 — and the names ellipsise,
 * which is the right thing for a word and the wrong thing for money.
 *
 * Roughly 208 points are shared by the in-and-out line at 13/400 and the result
 * at 18/700 (see `countRow` above for where the rest of the row goes). At five
 * digits that is "in $99,999 · out $99,999" beside "−$99,999" — 140 and 78, and
 * it just fits. At six it is 155 and 89 and it does not.
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
