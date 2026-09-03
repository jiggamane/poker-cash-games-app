import { StyleSheet, Text, View } from 'react-native';
import {
  prizePool,
  resultFormula,
  ruleOutcomes,
  type Money,
  type ResolvedLedger,
  type RoundingMode,
  type RuleOutcome,
  type SettlementResult,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../lib/money';
import { RoundingBar } from './RoundingBar';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, radius, space, type, unscaledLabel } from '../design/tokens';

/**
 * A night that has ended — E6, as drawn.
 *
 * THE BOARD IS THE E6 FRAME IN `docs/screen-specs/Screens - After the night.md`
 * (§ E6) and `design/handoff-rev18/reference/screens-after-the-night.html`, which
 * is where every dimension below comes from: the three-figure summary between two
 * rules, `NET, AFTER DEDUCTIONS` over a list of hairline rows, and the
 * rule-outcome block on its bone wash. The pair of buttons the frame puts at the
 * foot belongs to the caller — see `settled.tsx`, where one of the two has
 * nowhere to point.
 *
 * THAT FRAME CARRIES THE DECISIONS EVERY LATER CUT MADE, and they are not
 * negotiable just because the layout came back:
 *
 *   · `PRIZEPOOL` / `ENTRIES` / `DEDUCTIONS` — `E6-results-columns.md` renamed
 *     `THROUGH THE TABLE` and `OFF THE TABLE` and the summary uses the new words.
 *   · HAIRLINE ROWS, NO FILL, in both themes. The frame washes every row green or
 *     red; B23 is what that cost, and `ui-audit.mjs`'s `tinted-result-row` holds
 *     it. The colour is on the figure and nowhere else.
 *   · THE ROW STATES THE WHOLE NIGHT — `game +$1,620 · food −$54 · piggy −$23`,
 *     the columns addendum's terms as a sentence, in place of the frame's
 *     `in $500 · out $2,120`. Two of five terms invite arithmetic that does not
 *     reconcile; all of them reconcile to the figure beside them, and
 *     `resultFormula` is what guarantees it.
 *   · THE FLOAT IS NOT A WIN (B27). Whoever holds the piggy bank ends the night
 *     with the room's money in their pocket, and it is out of their row, out of
 *     the line under it, and named once in the block below beside their name.
 *   · `Piggy bank`, never `Kitty`. The stored value is `kitty` and no reader ever
 *     sees that word — `destinationWord` in core owns the spelling.
 *
 * NOTHING HERE ADDS ANYTHING UP. The pool comes off `prizePool()`, the rows and
 * their order off `resultFormula()`, the block off `ruleOutcomes()`, the
 * deductions total off `settle()` and the difference off the reconciliation. See
 * `CLAUDE.md`.
 *
 * SHARED BY `settled.tsx` AND `watch.tsx` — the host's own record and a watcher's
 * read-only view of it are the same facts, and E6 draws every player the same
 * way. What differs is only what the caller puts after it.
 */
export function NightResult({
  result,
  ledger,
  loggedBy,
  roundingMode,
  onChangeRounding,
}: {
  result: SettlementResult;
  /** Where the prize pool is counted from. Resolved, so voids are gone. */
  ledger: ResolvedLedger;
  /**
   * Who confirmed the difference, when there was one. Null drops the second
   * line — and a night that balanced never has one, because a night that
   * balanced needs no explanation.
   */
  loggedBy: string | null;
  /**
   * The step the night settled at, for the row under the block. It is on the
   * night rather than on the result because a night that never rounded still
   * has a setting, and the row says `off` rather than vanishing.
   */
  roundingMode?: RoundingMode | null;
  /**
   * Open the rounding sheet. Left out — a closed night, or a watcher reading
   * somebody else's — the row is text and carries no chevron.
   */
  onChangeRounding?: () => void;
}) {
  const t = useTheme();
  const pool = prizePool(ledger);

  /*
   * ONE ROW PER PERSON THE NIGHT HAPPENED TO, with the whole night on it —
   * `resultFormula`, which is the engine's answer to who that is, in what order,
   * and what each term of their night was. Two names it does not return are the
   * point of it: the hole is not dropped (B28) and the collector's float is not
   * a night (B27). See `working.ts`.
   */
  const rows = resultFormula(result);

  /* One line per rule that took something, and where it went. A rule with a
     total of $0 is not a line; with no deductions at all the block is absent. */
  const outcomes = ruleOutcomes(result);

  return (
    <>
      {/*
       * THE THREE FIGURES, between a rule and a rule — `0 22px 8px`, hairline
       * top and bottom, three equal cells of `14px 0`.
       *
       * WHAT THE NIGHT WAS, IN THE ORDER IT IS ASKED: how much money came
       * through the table, how many times somebody bought in, and how much of
       * it left. The three read across as one sentence, which is why they are
       * cells in a row and not three cards.
       */}
      <View
        style={[
          styles.summary,
          { borderTopColor: t.hairline, borderBottomColor: t.hairline },
        ]}
      >
        <Stat label="Prizepool" value={formatToFit(pool.total, SUMMARY_FITS)} />
        <Stat label={pool.entries === 1 ? 'Entry' : 'Entries'} value={String(pool.entries)} />
        <Stat label="Deductions" value={formatToFit(result.totalOffTable, SUMMARY_FITS)} />
      </View>

      {/*
       * AND THE ONE THING THE THREE CANNOT SAY.
       *
       * A night that balanced states its status in the meta line under the title
       * — `20:05 → 23:45 · 3h 40m · 8 players · settled` — and nowhere else, per
       * `handoff-E6`: a confirmed result carries no status pill of its own. A
       * night that did NOT balance still has to say so, and by how much, and who
       * signed it off, because every figure above was derived with that gap
       * inside it. So this block exists only when there is something to explain.
       */}
      {result.reconciliation.difference !== 0 && (
        <Difference difference={result.reconciliation.difference} loggedBy={loggedBy} />
      )}

      <View style={styles.table}>
        <Text style={[styles.sectionLabel, { color: t.muted }]} {...unscaledLabel}>
          Net, after deductions
        </Text>

        {rows.map(({ player: p, terms, net }, i) => (
          <View
            key={p.playerId}
            testID="e6-row"
            style={[
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                {p.name}
              </Text>

              {/*
               * THE FORMULA, AS ONE STRING AND NOT A ROW OF THEM.
               *
               * `game +$1,620 · food −$54 · piggy −$23`, wrapping to a second
               * line on a narrow phone rather than being cut off — it is a
               * sentence, and a sentence may take two lines where a figure in a
               * fixed cell may not.
               *
               * ONE TERM IS THE NET STATED TWICE, so it is not drawn at all: a
               * loser nothing was charged to has `game −$500` and a `−$500`
               * beside it, and the line would be explaining the figure with the
               * figure. `resultFormula` decides which terms there are; this
               * decides only whether there is anything left worth printing.
               */}
              {terms.length > 1 && (
                <Text style={[styles.rowFormula, { color: t.muted }]} numberOfLines={2}>
                  {terms
                    /*
                     * A NON-BREAKING SPACE INSIDE EACH TERM, and it is not
                     * typographic fussiness — it is B18.
                     *
                     * At 360 the line is three terms long and has to take a
                     * second line. With an ordinary space it took it wherever
                     * it liked, and where it liked was inside a figure:
                     * `piggy −` on one line and `$600` on the next, a number
                     * split down the middle, which is the one thing a money
                     * column may never do. The separator between terms is a
                     * space either side of a middot and that is where a break
                     * belongs; `label\u00a0amount` is what makes it the only
                     * place one can happen.
                     */
                    .map(
                      (term) =>
                        `${term.label}\u00a0${formatSignedToFit(term.amount, TERM_FITS)}`,
                    )
                    .join(' · ')}
                </Text>
              )}
            </View>

            {/*
             * Muted at exactly zero, which `moneyColor` is not: it falls back to
             * the text colour, and in a column of green and red a white figure
             * reads as a third state rather than as no state.
             */}
            <Text
              style={[styles.rowNet, { color: net === 0 ? t.muted : moneyColor(t, net) }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(net, ROW_FITS)}
            </Text>
          </View>
        ))}
      </View>

      {/*
       * WHERE THE MONEY THAT LEFT THE TABLE WENT — `14px 20px 0`, `16px 18px`,
       * radius 8, on the bone wash, 7 between the lines.
       *
       * ONE LINE PER RULE, and the line names the destination rather than the
       * payers: who paid what is the working, and the working is E3's. What is
       * here is the half a room asks for at the end — the food money goes back
       * to the people who fronted it, and the piggy bank is in somebody's
       * pocket.
       *
       * THE LINES SUM TO `DEDUCTIONS` IN THE SUMMARY ABOVE, which is why there
       * is no TOTAL row: the total is already on the screen, at the top, where
       * it is one of the three things the night was.
       */}
      {outcomes.length > 0 && (
        <View style={[styles.outcomes, { backgroundColor: t.offTableWash }]}>
          {outcomes.map((o) => (
            <View key={o.ruleId} style={styles.outcomeRow}>
              <Text style={[styles.outcomeLabel, { color: t.offTable }]} numberOfLines={2}>
                {outcomeLine(o)}
              </Text>
              <Text
                style={[styles.outcomeValue, { color: t.offTable }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatToFit(o.total, ROW_FITS)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/*
       * THE STEP, LAST — `design/handoff-E2/docs/E2-rounding.md`, frames
       * `3a`–`3d`. E2 owns it; this screen shows it and says what it cost, which
       * is the piggy bank's business and so belongs under the block that names
       * the piggy bank.
       *
       * A CLOSED NIGHT DOES NOT OPEN IT (rule 8). Every figure on this screen was
       * derived at the step it closed with; a row that still looked like a door
       * would be offering to re-round a record of what people paid.
       */}
      {result.rounding.on && (
        <RoundingBar
          mode={roundingMode}
          {...(onChangeRounding === undefined ? {} : { onPress: onChangeRounding })}
          style={styles.rounding}
        />
      )}
    </>
  );
}

/**
 * WHAT A RULE'S LINE SAYS, and the two halves of it are two different
 * movements.
 *
 * `Kitchen & drinks → Lena, Marek` is money going BACK to people who spent it
 * at the shop: they are out of pocket until the table pays them, so the line
 * names them and the arrow points at them. `Group piggy bank · held by Radka`
 * is not a repayment at all — that money is the room's, and the name is whose
 * pocket it is sitting in. `ruleOutcomes` draws the line between the two;
 * this writes it.
 *
 * ⚠ `held by {name}` IS NOT ON ANY BOARD. The frame draws `Kitty · held by the
 * group`, which is this sentence for a rule with no collector, and no frame
 * draws one that has a collector — because taking the float off the collector's
 * own row (B27) is what put a name here at all. It is written to the grammar of
 * the string that IS drawn, and flagged rather than passed off as decided copy.
 */
function outcomeLine(o: RuleOutcome): string {
  if (o.paidTo.length === 0) {
    /* Nobody has it: a bill nobody has been repaid for yet, or a rule whose
       collector the group never named. Both are the same sentence. */
    return o.float ? `${o.name} · held by the group` : `${o.name} · not paid back yet`;
  }
  const names = o.paidTo.map((c) => c.name).join(', ');
  return o.float ? `${o.name} · held by ${names}` : `${o.name} → ${names}`;
}

/** One of the three figures across the top, with its label under it. */
function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text
        style={[styles.statValue, { color: t.text }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {value}
      </Text>
      {/* Uppercased by the token, not by the string: the copy is written the way
          it is read aloud, and the tracking is what makes 11px legible. */}
      <Text style={[styles.statLabel, { color: t.muted }]} {...unscaledLabel}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A night that did not add up, on the record.
 *
 * The gap and who signed it off. It is a block rather than a pill because it is
 * the one thing on this screen that has to be read before the figures under it
 * are believed — every net above was derived with this difference inside it.
 */
function Difference({ difference, loggedBy }: { difference: Money; loggedBy: string | null }) {
  const t = useTheme();
  return (
    <View style={[styles.gap, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
      {/* NO GLYPH. E5 draws the same alarm as a tracked label over a sentence
          and nothing else, and this block is that block one step quieter. */}
      <Text style={[styles.gapLabel, { color: t.danger }]} numberOfLines={1} {...cappedFigure}>
        {formatToFit(Math.abs(difference) as Money, ROW_FITS)}
        {difference > 0 ? ' over' : ' short'}
      </Text>
      <Text style={[styles.gapBody, { color: t.text }]}>
        The count did not match the money in, and every figure below was worked
        out with the difference in it
        {loggedBy === null ? '.' : `. Logged by ${loggedBy}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `0 22px 8px`, a rule top and bottom, three cells of `14px 0` with 3
     between each figure and its label. The frame's own measurements. */
  summary: {
    flexDirection: 'row',
    marginHorizontal: space.page,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, minWidth: 0, paddingVertical: 14, gap: 3 },
  statValue: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.88, textTransform: 'uppercase' },

  /* `16px 22px 12px` · `13px 15px` · radius 8 — the alarm shape E5 uses, one
     step quieter, because here it is a fact about a closed night rather than a
     thing to go and fix. */
  gap: {
    marginHorizontal: space.card,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: radius.pressable,
    gap: 5,
  },
  gapLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  gapBody: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  /* `12px 22px 0`, and the label carries the rows' own 4 of inset so it lines up
     with the names beneath it rather than with the hairline. */
  table: { marginTop: 12, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  /* `11px 4px`, a hairline between rows and none under the last. The frame
     draws a washed rounded row here; B23 is why this one is a hairline. */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  rowText: { gap: 3, flexShrink: 1 },
  rowName: { fontSize: 17, fontWeight: '600' },
  rowFormula: { fontSize: 13, fontWeight: '400', lineHeight: 18, fontVariant: ['tabular-nums'] },
  /*
   * NEVER SHRINKS. The name and the line under it may give — they are words —
   * and a figure may not: left to shrink, "−$12,000" came apart into a dash on
   * one line and an amount on the next, which reads as two things. See B18.
   */
  rowNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* `14px 20px 0` · `16px 18px` · radius 8 · gap 7 — the frame's own, and the
     20 is deliberate against the list's 22: the block runs two points wider
     either side, which is what makes it read as a block rather than as two more
     rows of the list above it. */
  outcomes: {
    marginTop: 14,
    marginHorizontal: space.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    gap: 7,
  },
  outcomeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  outcomeLabel: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  outcomeValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* Under the block, at the page's edge. */
  rounding: { marginTop: 12 },
});

/*
 * WHERE EACH FIGURE ON THIS SCREEN RUNS OUT, measured at 360 — the narrowest
 * phone in the device matrix and the width everything is tightest at.
 *
 * A ROW holds about 308 points inside its own padding: the name and the formula
 * line on the left, the net at 18/700 on the right, 12 between them. The name
 * and the line give and the figure does not, so the only question is how much
 * the figure may take — "−$999,999" at 93 leaves 215 for a name, which is more
 * than any name needs. Seven digits fit and eight do not, so a million is where
 * the net stops printing in full.
 *
 * A TERM ON THE FORMULA LINE is 13/400 tabular and there are up to four of
 * them, separated by a middot: at full length "game +$99,999 · food −$99,999 ·
 * piggy −$99,999" is about 250 points against the 230 the line has at 360, and
 * it wraps to a second line rather than being cut — which is the right failure
 * for a sentence and the wrong one for a figure. Ten thousand is where the
 * terms start abbreviating, so the common night prints in full and a table
 * playing for millions reads "game +$1.2M" instead of wrapping to three lines.
 *
 * A SUMMARY CELL is a third of 316 at 360, which is 105 points, and 24/700
 * tabular spends about 14.4 a glyph — seven of them. "$99,999" is seven and
 * "$999,999" is eight, so the summary abbreviates a decade earlier than the row
 * beside it. That is deliberate and it is not a figure printed twice: the pool
 * is the night's own total and the nets are one person's share of it.
 *
 * `cappedFigure` holds the phone's text setting at the money cap on every one of
 * them, so none of these measurements moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
const TERM_FITS = 10_000;
const SUMMARY_FITS = 100_000;
