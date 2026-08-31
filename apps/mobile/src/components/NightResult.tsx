import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatSignedToFit,
  formatToFit,
  prizePool,
  receiptRows,
  resultRows,
  ruleCollector,
  UNACCOUNTED_ID,
  type Money,
  type PlayerId,
  type ResolvedLedger,
  type SettlementResult,
} from '@poker-club/core';
import { Icon } from './Icon';
import { moneyColor, useTheme, useThemeName } from '../design/useTheme';
import { block, cappedFigure, space, type } from '../design/tokens';

/**
 * A night that has ended — E6. `design/handoff-E6/`, cut 30 August, with the
 * row addendum of 31 August (`docs/E6-row-formula.md`) on top of it.
 *
 * REBUILT FROM X1c, and what changed is mostly what is no longer here. X1c drew
 * a confirmed result as three blocks about the reader — their own card with the
 * working under it, a SETTLEMENT panel saying whether they were square, and the
 * table underneath in tinted rows. E6 removes all three:
 *
 *   · THE STATUS APPEARS ONCE, OR NOT AT ALL. There was a `SETTLED` pill beside
 *     the title AND a `SETTLEMENT / You are square` panel saying the same thing
 *     twice. Both are gone. What is left is one pill on the prize pool line,
 *     and `docs/E6-results-logic.md` is blunt about it: a status pill appears
 *     NOWHERE ELSE on this screen.
 *   · NO ROW IS EMPHASISED. No "You," prefix, no personal card. A confirmed
 *     night is a record of what happened to seven people, and the reader's own
 *     row is one of the seven. (The fill is the one part of this the addendum
 *     took back, in the dark theme only — see the rows below.)
 *   · THE IN-VERSUS-OUT COMPARISON BELONGS TO E2, the counting screen, where
 *     the figures are still being entered and the comparison is still a
 *     question. Here it is settled, and re-asking it reads as doubt.
 *
 * TWO THINGS HAVE CHANGED SINCE E6 WAS CUT, both about the player rows:
 *
 *   · THE ROW STATES THE RESULT; TAPPING IT STATES THE REASON. The addendum's
 *     own sentence. The `in $100 · out $250` sub-line is gone — it was two of
 *     five terms, which invites the reader to do maths that does not
 *     reconcile — and a collapsed row is a name and a net at 40 points instead
 *     of 60, so eight players fit at rest. Opening one draws the whole
 *     receipt, `receiptRows` line for line, closed by the same figure the row
 *     was already showing. One row is open at a time.
 *   · A ROW PRINTS A SCORE, NOT A BALANCE. Whoever holds the piggy bank ends
 *     the night with the room's money in their pocket, and E6 drew it as their
 *     result — a $126 win, sorted above people who had played all night for
 *     less. The float comes out of the figure, out of the receipt behind it,
 *     and is named once under the deduction it came from, beside the person
 *     holding it. Nothing has moved: the transfers still hand it over, because
 *     `finalPosition` is untouched. See B27, and `nightScore` in `working.ts`.
 *
 * NOTHING HERE ADDS ANYTHING UP. The pool comes off `prizePool()`, the rows
 * and their order off `resultRows()`, each receipt off `receiptRows()`, its
 * `Net` off `nightScore()`, the deductions off `settle()`, and the difference
 * off the reconciliation. See `CLAUDE.md`.
 *
 * SHARED BY `settled.tsx` AND `watch.tsx` — the host's own record and a
 * watcher's read-only view of it are the same facts, and E6 draws every player
 * the same way, so there is now nothing left for the two to disagree about.
 * What still differs is only what the caller puts after it.
 */
export function NightResult({
  result,
  ledger,
  loggedBy,
}: {
  result: SettlementResult;
  /** Where the prize pool is counted from. Resolved, so voids are gone. */
  ledger: ResolvedLedger;
  /**
   * Who confirmed the difference, when there was one. Null drops the second
   * line of the pill — and a night that balanced never has one, because a
   * night that balanced needs no explanation.
   */
  loggedBy: string | null;
}) {
  const t = useTheme();
  const tinted = useThemeName() === 'dark';
  const pool = prizePool(ledger);

  /*
   * ONE ROW OPEN AT A TIME, which the addendum states as a rule and which is
   * also the only way the list stays readable: a receipt is about 104 points,
   * and two of them open push everything below the fold on a phone that was
   * showing all eight players a moment earlier.
   *
   * IT LIVES HERE RATHER THAN IN A ROUTE. The receipt is the row saying more
   * about itself, not a place you go — `09-navigation.md` would make a
   * destination a push and give it a back button, and there is nothing here to
   * go back from.
   */
  const [openRow, setOpenRow] = useState<PlayerId | null>(null);

  /*
   * ONE ROW PER PERSON THE NIGHT HAPPENED TO — `resultRows`, which is the
   * engine's answer to who that is and in what order, for the reason every sum
   * in this app is the engine's. Two names it does not return are the point of
   * it: the hole is not dropped (B28) and the collector's float is not a night
   * (B27). See `working.ts`.
   */
  const table = resultRows(result);

  /* A kind with a total of $0 is not rendered; with no deductions at all the
     whole block is absent. */
  const deductions = result.deductions.filter((d) => d.total !== 0);

  return (
    <>
      <View style={[styles.pool, { backgroundColor: t.surface }]}>
        <View style={styles.poolText}>
          <Text style={[styles.poolLabel, { color: t.muted }]}>Prize pool</Text>
          <Text
            style={[styles.poolFigure, { color: t.text }]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatToFit(pool.total, POOL_FITS)}
          </Text>
          <Text style={[styles.poolCount, { color: t.muted }]}>
            {pool.entries} {pool.entries === 1 ? 'entry' : 'entries'} · {pool.players}{' '}
            {pool.players === 1 ? 'player' : 'players'}
          </Text>
        </View>
        <State difference={result.reconciliation.difference} loggedBy={loggedBy} />
      </View>

      <View style={styles.table}>
        <Text style={[styles.sectionLabel, styles.tableLabel, { color: t.muted }]}>
          The table · after deductions
        </Text>
        {table.map(({ player: p, score }, i) => {
          const open = openRow === p.playerId;
          const receipt = receiptRows(result, p.playerId);

          /*
           * THE HOLE IS NOT A PERSON, so its row does not open. `Unaccounted`
           * holds the confirmed shortfall: it bought nothing, cashed out
           * nothing and no rule charged it, so its receipt is empty and a
           * chevron would promise a block with one line in it. What that money
           * is is on the pill above.
           */
          const opens = p.playerId !== UNACCOUNTED_ID && receipt.length > 0;

          /*
           * DARK KEEPS THE TINT, BRIGHT KEEPS THE HAIRLINE, and that split is
           * the addendum's, spelled out on frames 2a and 2c. B23 took the fill
           * off every row in both themes; this puts it back in one, for the
           * reason the doc gives — at 13% on `#0A0A0B` the wash reads as a
           * band rather than as emphasis, and the bright theme has no such
           * alpha, so there it stays hairlines with the colour on the figure
           * alone. `ui-audit.mjs` knows about the exception by name.
           *
           * The tokens are 14% and 12% where the board says 13% for both — one
           * point of alpha, invisible at any size, against a change to
           * `tokens.ts`, which `CLAUDE.md` says runs alone with nothing else in
           * flight. `docs/screens.md` records it beside the loss-hex note.
           */
          const fill =
            !tinted || score === 0
              ? undefined
              : { backgroundColor: score > 0 ? t.winTint : t.dangerWash };

          return (
            <Pressable
              key={p.playerId}
              testID="e6-row"
              accessibilityRole="button"
              /* ⚠ NOT DRAWN. No board writes a screen-reader label, and this is
                 the row's own two facts in the order it says them. */
              accessibilityLabel={`${p.name} · their night`}
              accessibilityState={{ expanded: opens ? open : undefined }}
              disabled={!opens}
              onPress={() => setOpenRow(open ? null : p.playerId)}
              style={({ pressed }) => [
                styles.row,
                fill,
                open && styles.rowOpen,
                /* The last row closes on the deductions block's own rule. Two
                   hairlines 10 points apart read as a box, and doc 15 does not
                   put a box inside a box. */
                tinted
                  ? null
                  : {
                      borderBottomColor: t.hairline,
                      borderBottomWidth:
                        i === table.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                { opacity: pressed && opens ? 0.6 : 1 },
              ]}
            >
              <View style={styles.rowHead}>
                <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                {/*
                 * Muted at exactly zero, which `moneyColor` is not: it falls
                 * back to the text colour, and on this screen a black figure in
                 * a column of green and red reads as a third state rather than
                 * as no state. E6 names the colour for $0 and it is the muted
                 * one.
                 */}
                <Text
                  style={[styles.rowNet, { color: score === 0 ? t.muted : moneyColor(t, score) }]}
                  numberOfLines={1}
                  {...cappedFigure}
                >
                  {formatSignedToFit(score, ROW_FITS)}
                </Text>
                {opens && (
                  <Icon name={open ? 'chevronUp' : 'chevronDown'} color={t.muted} size={13} />
                )}
              </View>

              {/*
               * THE RECEIPT — every term behind the figure above it, closed by
               * the figure above it. `receiptRows` is the engine's and so is
               * the `Net`: this block prints them and adds nothing, which is
               * the only reason the last line can be trusted to be the same
               * number as the first.
               */}
              {open && (
                <View style={[styles.receipt, { borderTopColor: t.hairline }]}>
                  {receipt.map((r) => (
                    <View key={r.key} style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: t.muted }]} numberOfLines={1}>
                        {r.label}
                      </Text>
                      <Text
                        style={[styles.receiptValue, { color: t.text }]}
                        numberOfLines={1}
                        {...cappedFigure}
                      >
                        {r.signed
                          ? formatSignedToFit(r.amount, ROW_FITS)
                          : formatToFit(r.amount, ROW_FITS)}
                      </Text>
                    </View>
                  ))}

                  <View style={[styles.receiptTotal, { borderTopColor: t.hairline }]}>
                    <Text style={[styles.receiptNetLabel, { color: t.text }]}>Net</Text>
                    <Text
                      style={[
                        styles.receiptNetValue,
                        { color: score === 0 ? t.muted : moneyColor(t, score) },
                      ]}
                      numberOfLines={1}
                      {...cappedFigure}
                    >
                      {formatSignedToFit(score, ROW_FITS)}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {deductions.length > 0 && (
        <View style={[styles.deductions, { borderColor: t.hairline }]}>
          <View style={styles.deductionsHead}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>Deductions</Text>
            <Text style={[styles.qualifier, { color: t.muted }]}>collected on the side</Text>
          </View>

          {/*
           * NO PAYER NAME, still: who paid what is the working, and the
           * working is not on this screen. E6's "totals only" is about the
           * people the money came OFF, and that half is untouched.
           *
           * WHO IT WENT TO IS A DIFFERENT QUESTION, and it is here because
           * taking the float off the collector's own row is what put it here:
           * a room that has just handed $126 to somebody is owed the name of
           * the somebody, once, next to the figure. A bill has no such name —
           * it goes back to whoever fronted the food, which is a list — so it
           * carries no second line and `ruleCollector` returns nothing for it.
           *
           * ⚠ "collected by {name}" IS NOT DRAWN ANYWHERE. No board has this
           * line, because no board takes the float off the row. It is written
           * to the grammar of the qualifier above it — lower case, muted, a
           * statement about the row rather than a label on it — and it is
           * flagged here rather than passed off as decided copy.
           */}
          {deductions.map((d) => {
            const collector = ruleCollector(result, d.ruleId);

            return (
              <View key={d.ruleId} style={styles.deductionRow}>
                <View style={styles.deductionText}>
                  <Text style={[styles.deductionLabel, { color: t.text }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                  {collector !== null && (
                    <Text style={[styles.deductionHolder, { color: t.muted }]} numberOfLines={1}>
                      collected by {collector.name}
                    </Text>
                  )}
                </View>
                <Text
                  style={[styles.deductionValue, { color: t.text }]}
                  numberOfLines={1}
                  {...cappedFigure}
                >
                  {formatToFit(d.total, ROW_FITS)}
                </Text>
              </View>
            );
          })}

          <View style={[styles.deductionTotal, { borderTopColor: t.hairline }]}>
            <Text style={[styles.totalLabel, { color: t.text }]}>Total</Text>
            {/* `totalOffTable` IS the sum of the lines above, computed by the
                engine. The screen does not re-add its own column. */}
            <Text
              style={[styles.totalValue, { color: t.text }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatToFit(result.totalOffTable, ROW_FITS)}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

/**
 * The one status on the screen, on the right of the prize pool line.
 *
 * A night that balanced gets a check and one word. A night that did not names
 * the amount and who signed it off — and never grows past one line, because
 * the pool figure is sharing the row with it and the figure may not give.
 */
function State({ difference, loggedBy }: { difference: Money; loggedBy: string | null }) {
  const t = useTheme();
  const settled = difference === 0;
  const tint = settled ? t.winTint : t.dangerWash;
  const ink = settled ? t.win : t.loss;

  return (
    <View style={styles.state}>
      <View style={[styles.pill, { backgroundColor: tint }]}>
        {settled && <Icon name="check" color={ink} size={12} />}
        <Text style={[styles.pillLabel, { color: ink }]} numberOfLines={1} {...cappedFigure}>
          {settled
            ? 'SETTLED'
            : `${formatToFit(Math.abs(difference) as Money, PILL_FITS)} ${
                difference > 0 ? 'OVER' : 'SHORT'
              }`}
        </Text>
      </View>
      {/* A night that balanced needs no explanation, so the green pill has no
          second line — and neither has a red one nobody has signed. */}
      {!settled && loggedBy !== null && (
        <Text style={[styles.loggedBy, { color: t.muted }]} numberOfLines={1}>
          logged by {loggedBy}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* `0 20px 12px` · `12px 16px` · radius 12. A block, not a card: the two
     pixels are the difference between this and `space.card`'s 20 of padding. */
  pool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: block.radius,
  },
  poolText: { gap: 3, flexShrink: 1 },
  poolLabel: type.label,
  /*
   * NEVER SHRINKS, and capped against the phone's text setting. The pill
   * beside it is the child that gives — it is a word, and this is money.
   */
  poolFigure: {
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 27,
    letterSpacing: -0.54,
    fontVariant: ['tabular-nums'],
  },
  poolCount: { fontSize: 12, fontWeight: '400' },

  state: { marginLeft: 'auto', alignItems: 'flex-end', gap: 4, flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
  },
  pillLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.69,
    fontVariant: ['tabular-nums'],
  },
  loggedBy: { fontSize: 12, fontWeight: '600' },

  table: { marginHorizontal: space.card },
  sectionLabel: { ...type.label, paddingHorizontal: 2 },
  /* `0 4px 7px` on the board. The rows carry their own 3 below them, so the
     list has no gap of its own and this is the only space above the first. */
  tableLabel: { paddingBottom: 7 },

  /*
   * `9px 10px` inside, `0 -6px 3px` outside, radius 8 — the collapsed row is
   * 40 points tall, against the 60 the in-and-out sub-line cost, which is what
   * puts eight players on a 393-wide phone with the deductions block still on
   * screen. The negative margin is the board's: the fill runs 6 points wider
   * than the list either side, so the text inside it lines up with the section
   * label above rather than being inset from it.
   */
  row: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    marginBottom: 3,
    borderRadius: 8,
  },
  /* An open row keeps its top padding and grows 2 at the foot — `9px 10px 11px`. */
  rowOpen: { paddingBottom: 11 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name beside it may give — it is a word — and a figure
   * may not: left to shrink, "−$12,000" came apart into a dash on one line and
   * an amount on the next, which reads as two things. See B18.
   */
  rowNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* `10px 2px 0` under a hairline, 6 between the lines. */
  receipt: {
    marginTop: 9,
    paddingTop: 10,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  receiptRow: { flexDirection: 'row', gap: 12 },
  receiptLabel: { fontSize: 13, fontWeight: '400', flexShrink: 1 },
  receiptValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  receiptTotal: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  receiptNetLabel: { fontSize: 13, fontWeight: '700' },
  receiptNetValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* `10px 22px 0`, a rule top and bottom, `10px 0` inside. The list above it
     sits on the card's 20 and this on the page's 22 — measured, not rounded. */
  deductions: {
    marginTop: 10,
    marginHorizontal: space.page,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  deductionsHead: { flexDirection: 'row', alignItems: 'baseline' },
  qualifier: { marginLeft: 'auto', fontSize: 12, fontWeight: '400' },
  deductionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  deductionText: { gap: 1, flexShrink: 1 },
  deductionLabel: { fontSize: 14, fontWeight: '400' },
  /* The qualifier's size, because it is the qualifier's job one row down. */
  deductionHolder: { fontSize: 12, fontWeight: '400' },
  deductionValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  deductionTotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.52, textTransform: 'uppercase' },
  totalValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

/*
 * WHERE EACH COLUMN RUNS OUT, measured at 360 — the narrowest phone in the
 * device matrix and the width everything is tightest at.
 *
 * A COLLAPSED ROW holds about 308 points inside its own padding: the name at
 * 17/600 on the left, the net at 18/700 on the right, 12 between them, and a
 * 13-point chevron with a gap of its own. The name gives and the figure does
 * not, so the question is only how much the figure may take — "−$999,999" at
 * 93 leaves 190 for a name, which is more than any name needs. Seven digits
 * fit and eight do not, so a million is where this row stops printing in full.
 *
 * DROPPING THE SUB-LINE IS WHAT BOUGHT THE ROOM. The row was a name, a working
 * line of four to six terms, and a net; at 360 the terms wrapped to three
 * lines and the row stood 60 points tall or more. It is 40 now, which is eight
 * players at rest on a 393-wide phone with the deductions block still on
 * screen, and the terms are in the receipt where each one has a line of its
 * own and nothing has to be abbreviated at all.
 *
 * THE RECEIPT is the roomiest thing on the screen: a label at 13/400 on the
 * left, a figure at 13/500 on the right, one term per line. It is drawn inside
 * the row's own padding, so it has about 4 points less than the head above it
 * and 5 points less type — a figure that fits the net fits here.
 *
 * IT IS A WIDER ROW THAN E5'S, which stops at ten thousand: there is no avatar
 * and no sub-line. The two screens abbreviate at different points because they
 * are different widths — what would read as "a figure that changed" is a column
 * that visibly is not the same column.
 *
 * THE CHEVRON POINTS AT WHAT THE ROW DOES — down into itself when closed, up
 * when open. It is not the row-end chevron every list in the app uses for a
 * door, because this row is not a door: it opens in place and there is nothing
 * to go back from. A row with no receipt behind it — `Unaccounted`, which
 * bought nothing and was charged nothing — has no chevron and does not press.
 *
 * THE POOL FIGURE has the pill beside it and 27/800 to spend: about 209 points
 * once the pill and its gap are out, which is thirteen glyphs. "$9,999,999" is
 * ten. THE PILL itself may never take a second line, so its own figure is the
 * one thing on this screen that abbreviates early.
 */
const ROW_FITS = 1_000_000;
const POOL_FITS = 10_000_000;
const PILL_FITS = 100_000;
