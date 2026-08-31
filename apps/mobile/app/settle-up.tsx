import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  checkReconciliation,
  endedWith,
  resolveLedger,
  settle,
  type Money,
  type PlayerId,
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
 * handing over cash. THE KITTY IS A PAYEE LIKE ANYONE ELSE, and reads in bone
 * because it is the one row where the money leaves the table for good.
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
    const map = new Map<PlayerId, string>();
    const seated = new Set(players.filter((p) => p.boughtIn > 0).map((p) => p.playerId));
    for (const d of deductions) {
      if (d.destination === 'bill') continue;
      for (const c of d.credits) {
        if (!seated.has(c.playerId)) map.set(c.playerId, word(d.destination));
      }
    }
    return map;
  })();

  /* The night's net is the people who played it. A collector holding the piggy bank
     is a payee in the list above, not a result. */
  const net = [...players]
    .filter((p) => p.boughtIn > 0 || p.endedWith > 0)
    .sort((a, b) => b.finalPosition - a.finalPosition);

  const setAside = [...new Set(offTable.values())];
  const lede =
    `${inWords(transfers.length)} ${transfers.length === 1 ? 'transfer clears' : 'transfers clear'} the night.` +
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
        remainder={rounding.remainder}
        onPress={() => router.push({ pathname: '/rounding', params: { scope: 'night' } })}
        style={styles.rounding}
      />

      <View style={styles.list}>
        {transfers.map((tr, i) => {
          const piggy = offTable.get(tr.toPlayerId);
          return (
            <View
              key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`}
              style={[
                piggy === undefined ? styles.row : styles.piggyRow,
                piggy === undefined
                  ? {
                      borderBottomColor: t.hairline,
                      borderBottomWidth:
                        i === transfers.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    }
                  : { backgroundColor: t.offTableWash },
              ]}
            >
              <Text style={[styles.party, { color: t.text }]}>{nameOf(night, tr.fromPlayerId)}</Text>
              <Icon name="arrow" color={t.muted} size={18} />
              <Text style={[styles.party, { color: piggy === undefined ? t.text : t.offTable }]}>
                {piggy === undefined ? nameOf(night, tr.toPlayerId) : `The ${piggy}`}
              </Text>
              <Text style={[styles.amount, { color: piggy === undefined ? t.text : t.offTable }]}>
                {formatMoney(tr.amount)}
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
          {net.map((p) => (
            <NetChip key={p.playerId} name={p.name} amount={p.finalPosition} />
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
          {formatMoney(ledger.totalBoughtIn)} went in, {formatMoney(reconciliation.counted)} was
          counted out.{' '}
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

/** What the money is, rather than what the rule that took it is called. */
const word = (destination: 'bill' | 'kitty' | 'host_fee' | 'next_pot'): string =>
  destination === 'kitty' ? 'kitty' : destination === 'host_fee' ? 'host' : 'next pot';

/** "Six transfers clear the night" — the count reads as a word, not a digit. */
const inWords = (n: number): string =>
  ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] ??
  String(n);

const styles = StyleSheet.create({
  /* Above the transfers, under the lede that counts them. */
  rounding: { marginBottom: 4 },
  list: { marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  piggyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
    marginHorizontal: -12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: radius.pressable,
  },
  party: type.rowName,
  amount: { ...type.figure, marginLeft: 'auto' },

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
 * WHAT THE COUNTED ROW ON E5 HOLDS EXACTLY.
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
