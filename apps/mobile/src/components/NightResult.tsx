import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import {
  columnsFit,
  formula,
  prizePool,
  receiptRows,
  resultColumns,
  resultRows,
  ruleCollector,
  UNACCOUNTED_ID,
  type Money,
  type PlayerId,
  type ResolvedLedger,
  type RoundingMode,
  type SettlementResult,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../lib/money';
import { Button } from './Button';
import { Icon } from './Icon';
import { RoundingBar } from './RoundingBar';
import { moneyColor, useTheme, useThemeName } from '../design/useTheme';
import { block, cappedFigure, space, type, unscaledLabel } from '../design/tokens';

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
  roundingMode,
  onChangeRounding,
  onFullLedger,
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
  /**
   * The step the night settled at, for the row under the deductions. It is on
   * the night rather than on the result because a night that never rounded
   * still has a setting, and the row says `off` rather than vanishing.
   */
  roundingMode?: RoundingMode | null;
  /**
   * Open the rounding sheet. Left out — a closed night, or a watcher reading
   * somebody else's — the row is text and carries no chevron.
   */
  onChangeRounding?: () => void;
  /**
   * Open the four-column ledger — format `7e`, which `7a` replaced on this
   * screen and which *Full ledger* is the way back to. Left out, the chip is
   * absent rather than dead.
   */
  onFullLedger?: () => void;
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

  /* Which layout this night can be drawn in. The engine's answer — see
     `columnsFit` — because it is a question about the night's rules and not
     about the screen. */
  const columns = columnsFit(result);

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
        {/*
         * THE KICKER. `02-E6-results-row.md`: `NET, AFTER DEDUCTIONS`, 700 12,
         * `.1em`, muted, `0 4px 7px`. It replaces "The table · after
         * deductions", and the word that changed is the one doing the work —
         * the column under it is the NET now, not the table, and the row
         * states the terms that got there.
         */}
        <Text style={[styles.kicker, { color: t.muted }]}>Net, after deductions</Text>

        {/*
         * TWO LAYOUTS, AND THIS SCREEN PICKS — but the pick is no longer
         * between the columns and the receipts. `02-E6-results-row.md`, cut 1
         * September, chose format `7a` over the four other formats it was
         * drawn against, the columns (`7e`) included:
         *
         *     Petr                                        +$315
         *     game +$150 · food +$188 · piggy −$23
         *
         * SAME FOUR TERMS, SAME ORDER, ONE ROW INSTEAD OF FIVE CELLS. It is the
         * only format besides `7e` that puts all eight players above the fold,
         * and the one that still reads as a list rather than as a spreadsheet.
         * `7e` is not deleted — it is what *Full ledger* opens, "where columns
         * are worth the width" — so this screen draws `7a` and `/ledger` draws
         * the table.
         *
         * WHAT STILL DECIDES IS `columnsFit`, unchanged, because the question
         * it answers has not changed: `7a` names exactly three terms, so a
         * night whose rules reach past the bill and the piggy bank has nowhere
         * to put a host's fee and its sub-line would stop adding up to the
         * figure beside it. That night gets the receipt rows, which have a line
         * per kind. The engine's test, not this screen's.
         */}
        {columns ? (
          <FormulaList result={result} />
        ) : (
          <ReceiptList result={result} openRow={openRow} setOpenRow={setOpenRow} tinted={tinted} />
        )}
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

      {/*
       * THE STEP, AS THE LAST LINE OF THE DEDUCTIONS BLOCK —
       * `design/handoff-E2/docs/E2-rounding.md`, "Where it surfaces
       * afterwards", frames `3a`–`3d`. E2 owns it; this screen shows it and
       * says what it cost, which is the piggy bank's business and so belongs
       * under the block that names the piggy bank.
       *
       * IT IS THE CONTROL ROW AND NOT A DEDUCTION LINE. What the rounding moved
       * is not one of the totals above it — those are the rules' — so it sits
       * below the `TOTAL` rather than inside it, and the block still adds up to
       * what `settle()` says leaves the table.
       *
       * A CLOSED NIGHT DOES NOT OPEN IT (rule 8). Every figure on this screen
       * was derived at the step it closed with; a row that still looked like a
       * door would be offering to re-round a record of what people paid.
       */}
      {result.rounding.on && (
        <RoundingBar
          mode={roundingMode}
          remainder={result.rounding.remainder}
          {...(onChangeRounding === undefined ? {} : { onPress: onChangeRounding })}
          style={styles.rounding}
        />
      )}

      {/*
       * ⚠ WHERE THIS LANDS IS PART-DRAWN. The handoff's own *Still to draw*
       * names "where the *Full ledger* button lands" as open, but the `7a`
       * frame does put the button at the FOOT of the screen, under the
       * deductions — not under the list it is the alternative to. That is what
       * this is, and it is also where the screen's other way through already
       * lives: `settled.tsx` puts *Who has paid* directly after it, for the
       * same reason both are chips rather than rows. The board's *Close* beside
       * it has no counterpart here — E6 is a push, and a push closes with back.
       *
       * ONLY WHERE THERE IS A TABLE TO SHOW. A night drawn in receipt rows is
       * one the columns cannot hold, so there is no `7e` behind the button.
       */}
      {columns && onFullLedger !== undefined && (
        <Button
          label="Full ledger"
          variant="chip"
          style={styles.toLedger}
          onPress={onFullLedger}
        />
      )}
    </>
  );
}

/**
 * Format `7a` — the row E6 draws at rest.
 * `design/handoff-count-up-to-settled/docs/02-E6-results-row.md`, cut 1 Sept.
 *
 *     Petr                                        +$315
 *     game +$150 · food +$188 · piggy −$23
 *
 * FIFTY POINTS A ROW: 6 padding, 19 of name, 3 of gap, 15 of sub-line, 6
 * padding, 1 of hairline. Eight rows measure 406 against a 406 viewport, which
 * is the whole reason the format was chosen over the four it beat — so the doc
 * says, in bold, do not add vertical padding to the row, and this is the note
 * that says it here too.
 *
 * THE HAIRLINE IS ON TOP OF EVERY ROW, INCLUDING THE FIRST. It closes the gap
 * under the kicker rather than leaving the list to open on nothing, and it
 * means the last row does not hang a rule over the block below it.
 *
 * COLOUR IS CARRIED BY THE NET ALONE. Name, sub-line and dividers are neutral
 * in every row, and no row is tinted, filled or badged by its outcome — the
 * turn-1 frames washed the row green or red and it was dropped, because at
 * eight rows the screen turned into stripes and the net stopped being the
 * thing you read. Zero is primary text, not green: the receipt rows use muted
 * for the same figure and this doc names primary, so they differ by one token
 * on one value and this comment is the record of it.
 *
 * NOTHING IS TAPPABLE — "rows do not reorder, expand or swipe on this screen".
 * The doc sends a tap to the player's receipt, which is drawn as frame `7d`,
 * and `7d` is the format this app already opens in place under the receipt
 * rows. It is not wired from here, because wiring it would put the row into
 * two states the chosen format does not draw. `docs/screens.md` carries it.
 */
function FormulaList({ result }: { result: SettlementResult }) {
  const t = useTheme();
  const rows = resultColumns(result);

  return (
    <>
      {rows.map((r) => (
        <View key={r.player.playerId} style={[styles.formulaRow, { borderTopColor: t.hairline }]}>
          {/*
           * THE NAME IS THE ONE THING THAT MAY TRUNCATE, which is the doc's own
           * recommendation between its two candidates: "the name is
           * recoverable from context at the table; a half-printed sum is not."
           */}
          <View style={styles.formulaText}>
            <Text style={[styles.formulaName, { color: t.text }]} numberOfLines={1}>
              {r.player.name}
            </Text>
            {/*
             * THE SUB-LINE, WHOLE. The doc leaves truncation open and measures
             * the widest drawn case at 227 points into 261 — which holds at
             * four-digit sums and short names and does not at five. This app is
             * measured against tables in the millions at 360 points and 120%
             * text, where three terms of exact figures are not close to
             * fitting, so the terms take the same `…ToFit` compaction every
             * other figure in the app takes rather than a truncation rule the
             * design has not chosen. Nothing is ever half-printed and no term
             * is ever dropped; a seven-figure term reads `+$1.6M`.
             */}
            <Text
              style={[styles.formulaTerms, { color: t.muted }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formula(r, (m) => formatSignedToFit(m, FORMULA_FITS))}
            </Text>
          </View>

          <Text
            style={[
              styles.formulaNet,
              { color: r.net === 0 ? t.text : moneyColor(t, r.net) },
            ]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(r.net, ROW_FITS)}
          </Text>
        </View>
      ))}
    </>
  );
}

/**
 * The columns — `E6-results-columns.md`, frames `6a` and `6b`, and format
 * `7e` on `Result Formula Options.dc.html`. The same table under two names.
 *
 * IT NO LONGER SHIPS AS THE DEFAULT and it is not dead either.
 * `02-E6-results-row.md` measured it against `7a` and kept both: `7e` "fits,
 * but reads as a spreadsheet", so the list on E6 is `7a` and this is what
 * *Full ledger* opens, "where columns are worth the width". Exported for the
 * `/ledger` route, which is that screen.
 *
 *     name            game     food    piggy      net
 *     103              64       58       50        74
 *
 * NO COLUMN GAP, and that is the board's: the numeric cells take their space as
 * a left padding instead, so the hairline runs unbroken across the row rather
 * than stopping and starting four times. Here that is one border on the row,
 * which is the same rule drawn once.
 *
 * NOTHING IS TAPPABLE. The doc says so in its own comparison table, and it
 * follows from the layout: there is nothing left to open.
 *
 * THE SAME IN BOTH THEMES — hairlines and no fill, on `6a` as on `6b`. The dark
 * tint belongs to the receipt rows, which are an object per player; four
 * columns are a table, and a table with a coloured band behind every row is a
 * ranking drawn twice.
 */
export function ColumnTable({ result }: { result: SettlementResult }) {
  const t = useTheme();
  const rows = resultColumns(result);

  /* A column nobody has a figure in is not drawn — the same discipline as the
     deductions block, where a kind with a total of $0 is absent. A night with
     no bill has no `food` to explain. */
  const food = rows.some((r) => r.food !== 0);
  const piggy = rows.some((r) => r.piggy !== 0);

  return (
    <>
      <View style={styles.colHead}>
        <View style={styles.colName} />
        <Text style={[styles.colLabel, styles.colGame, { color: t.muted }]} {...unscaledLabel}>
          game
        </Text>
        {food && (
          <Text style={[styles.colLabel, styles.colFood, { color: t.muted }]} {...unscaledLabel}>
            food
          </Text>
        )}
        {piggy && (
          <Text style={[styles.colLabel, styles.colPiggy, { color: t.muted }]} {...unscaledLabel}>
            piggy
          </Text>
        )}
        <Text style={[styles.colLabel, styles.colNet, { color: t.muted }]} {...unscaledLabel}>
          net
        </Text>
      </View>

      {rows.map((r) => (
        <View key={r.player.playerId} style={[styles.colRow, { borderTopColor: t.hairline }]}>
          <Text style={[styles.colNameText, styles.colName, { color: t.text }]} numberOfLines={1}>
            {r.player.name}
          </Text>
          <Cell amount={r.game} style={styles.colGame} />
          {food && <Cell amount={r.food} style={styles.colFood} />}
          {piggy && <Cell amount={r.piggy} style={styles.colPiggy} />}
          <Text
            style={[
              styles.colFigure,
              styles.colNetFigure,
              styles.colNet,
              { color: r.net === 0 ? t.muted : moneyColor(t, r.net) },
            ]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(r.net, COLUMN_FITS)}
          </Text>
        </View>
      ))}

      {/*
       * ⚠ THE BOARD'S FOOTNOTE, LESS ITS EXAMPLE. It is drawn as "…plus
       * whatever they paid at the counter — Petr paid $242 and owed $54, so
       * +$188", and those are the sample night's figures against the sample
       * night's name. A real night printing them would be explaining itself
       * with somebody else's money. The two sentences that are about the
       * columns rather than about the sample are verbatim; the illustration is
       * dropped rather than rewritten with figures nobody asked this screen to
       * compute.
       */}
      <Text style={[styles.colFootnote, { color: t.muted }]}>
        Game = cashed out less bought in. Food = their share of the bill, plus whatever they paid
        at the counter.
      </Text>
    </>
  );
}

/** One muted figure in a column. Never wraps, never grows past the cap. */
function Cell({ amount, style }: { amount: Money; style: object }) {
  const t = useTheme();
  return (
    <Text
      style={[styles.colFigure, style, { color: t.muted }]}
      numberOfLines={1}
      {...cappedFigure}
    >
      {formatSignedToFit(amount, COLUMN_FITS)}
    </Text>
  );
}

/**
 * The receipt rows — `E6-row-formula.md`, frames `2a`–`2d`.
 *
 * NOT DEAD CODE AND NOT A SECOND OPINION. It is what a night too complicated
 * for four columns gets: one line per kind, so a host's fee or a next-pot rule
 * has somewhere to be named. The columns above are the layout that ships and
 * this is the layout that catches what will not fit in it.
 */
function ReceiptList({
  result,
  openRow,
  setOpenRow,
  tinted,
}: {
  result: SettlementResult;
  openRow: PlayerId | null;
  setOpenRow: (id: PlayerId | null) => void;
  tinted: boolean;
}) {
  const t = useTheme();
  const table = resultRows(result);

  return (
    <>
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

/** The one thing every figure in this file shares. */
const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

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

  /*
   * `700 12 / .1em / uppercase / muted`, padding `0 4px 7px` — doc 02's
   * kicker, and 4 rather than the 2 every other section label on this screen
   * uses, because it sits over a list whose rows are inset by 4 and a label
   * half-indented from the column under it reads as a mistake.
   */
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 7,
  },

  /*
   * FORMAT 7a — 50 points a row, and the doc is explicit that none of it is
   * spare: `6 + 19 + 3 + 15 + 6 + 1`. Eight rows against a 406 viewport is why
   * this format was chosen, so vertical padding added here costs a player off
   * the fold.
   */
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /* `min-width: 0` in the only sense React Native has: the column gives so the
     net keeps its place, rather than the net being pushed off the edge. */
  formulaText: { flex: 1, minWidth: 0, gap: 3 },
  formulaName: { fontSize: 16, fontWeight: '600' },
  formulaTerms: { fontSize: 12.5, fontWeight: '400', ...tabularNums },
  /*
   * NEVER SHRINKS, like every other net in this app: left to give, a figure
   * comes apart into a sign on one line and an amount on the next. See B18.
   */
  formulaNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '700',
    ...tabularNums,
  },
  /* At the foot, where the frame draws it and where `Who has paid` follows it.
     The same gutter and the same 20 of space that chip already takes. */
  toLedger: { marginHorizontal: space.card, marginTop: 20 },

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
  /*
   * `1fr 64px 58px 50px 74px` — the board's grid, in the only two things react
   * native has: a name that takes what is left, and four fixed cells.
   *
   * NO COLUMN GAP. Each numeric cell carries 8 of left padding instead, which
   * is what lets the hairline run unbroken across the row — a rule that stopped
   * and started four times would read as five little tables.
   */
  colHead: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 7 },
  colName: { flex: 1, minWidth: 0 },
  colNameText: { fontSize: 16, fontWeight: '600' },
  colLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textAlign: 'right',
    paddingLeft: 8,
  },
  colGame: { width: 64 },
  /*
   * 60 AND 60 WHERE THE BOARD DRAWS 58 AND 50 — the one deviation in this
   * table, and it is about what the columns have to hold rather than about how
   * they look.
   *
   * The board's night has two-figure piggy contributions: `−$23` is four
   * glyphs and fifty points is generous for it. This app is measured against
   * tables in the millions, where the same cell holds `−$118k` and `−$12M` —
   * six glyphs of compacted figure, which came to 53 and 56 points against the
   * board's 50 and was clipped in both. The name gives the twelve points up;
   * it is the one thing in the row that may ellipsise.
   */
  colFood: { width: 60 },
  colPiggy: { width: 60 },
  colNet: { width: 74 },
  colRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  colFigure: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
    paddingLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  colNetFigure: { fontSize: 16, fontWeight: '700' },
  colFootnote: { fontSize: 11.5, fontWeight: '400', lineHeight: 17, paddingTop: 9 },

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
  /* Under the deductions block's own bottom rule, at the page's edge. */
  rounding: { marginTop: 10 },

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

/*
 * WHERE A COLUMN RUNS OUT, which is far earlier than a row does — that is the
 * price of putting four figures on one line.
 *
 * The narrowest is `piggy` at 50 points with 8 of that spent on the padding
 * that keeps the hairline whole. Forty-two points at 14/400 tabular is about
 * six glyphs, and "−$1,620" is seven. `cappedFigure` holds the phone's text
 * setting at the money cap so this does not move underneath the measurement,
 * and `formatSignedToFit` shortens what is left: a table playing for tens of
 * thousands reads "−$12.9K" here and the exact figure on the player's own row
 * in the ledger.
 *
 * Ten thousand rather than the row's million, and the two are deliberately not
 * the same number: they are different columns at different widths, and one
 * threshold for both would have to be the tighter of the two everywhere.
 */
const COLUMN_FITS = 10_000;

/*
 * WHERE THE THREE TERMS ON ONE LINE RUN OUT — format `7a`'s sub-line, and the
 * tightest measurement on this screen.
 *
 * The doc measures its own widest drawn case — `game +$1,620 · food −$54 ·
 * piggy −$23` — at 227 points into 261 available at 393, and says in as many
 * words that it will not fit a five-digit game figure. At 360 the available
 * width is about 228, so the drawn night itself clears by a point.
 *
 * Three exact figures at the millions scale are not close. Ten thousand is
 * where they start compacting: `game +$1.6M · food −$54 · piggy −$23` is about
 * 190 points, which holds at 360 with the 120% text run on top of it, and
 * every night a person actually plays is printed in full because
 * `formatCompact` leaves anything under a thousand exactly as it is.
 *
 * It is the same threshold as the columns and for the same reason — three
 * figures sharing one line is the same problem as four sharing one row — and
 * deliberately not the row's million: the net has the whole right-hand side to
 * itself and does not need to give anything back.
 */
const FORMULA_FITS = 10_000;
const POOL_FITS = 10_000_000;
const PILL_FITS = 100_000;
