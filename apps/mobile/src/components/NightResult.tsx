import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  destinationWord,
  resultTotals,
  ruleOutcomes,
  settledRows,
  type Money,
  type ResolvedLedger,
  type RoundingMode,
  type RuleOutcome,
  type SettledMode,
  type SettlementResult,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../lib/money';
import { Icon } from './Icon';
import { ReconciliationRow, ScoreRow, ScoreTabs } from './ScoreBreakdown';
import { RoundingBar } from './RoundingBar';
import { useTheme } from '../design/useTheme';
import { cappedFigure, radius, space, type, unscaledLabel } from '../design/tokens';

/**
 * A NIGHT THAT HAS ENDED, READ BY SOMEBODY WHO IS NOT THE HOST —
 * `design_handoff_score_breakdown/Score Breakdown Icons.dc.html`, turn 6, cut
 * 8 September, which supersedes the 5 September `R1 · Results` cut here.
 *
 * IT IS THE SAME SCREEN THE HOST READS, and after this cut it is the same in
 * every particular that matters: one ranked list with a Final / At table toggle
 * over it, and every row drawn by `ScoreBreakdown` — the app's ONE drawing of a
 * finished night. That is the whole point of the change. R1 stacked three
 * blocks here — the table's result, the deductions, then the finals — while
 * `/settled` had already moved to one list and a toggle, so the host and the
 * watcher were reading two different shapes of the same night and a fix to
 * either was a fix to one of them.
 *
 * WHAT THE THREE BLOCKS WERE FOR IS STILL HERE. The reader still watches the
 * subtraction happen; the toggle is what does it now. `At table` is what
 * everybody did before any rule, and it closes on the check the room actually
 * runs — `$5,500 in, $5,500 out`, `$0`. `Final` is the same list after the
 * evening, with what each rule took printed on the row as a glyph and a signed
 * figure. Between them, the deduction slabs say who fronted which bill, which
 * is the one thing a figure on a row cannot say.
 *
 * -- what this screen keeps from every earlier cut --
 *
 *   · HAIRLINE ROWS, NO FILL, in both themes. The only tinted things on the
 *     screen are the deduction slabs and the row's own bone tray, and neither
 *     carries a verdict — `ui-audit.mjs`'s `tinted-result-row` knows both by
 *     name and holds every other signed figure in the app to B23.
 *   · THE FLOAT IS NOT A WIN (B27). Whoever holds the piggy bank ends the night
 *     with the room's money in their pocket; it is out of their row and named
 *     on the slab it came off. `settledRows` reads `nightScore`, so that split
 *     is made once, in core.
 *   · `Piggy bank`, never `Kitty`. The stored value is `kitty` and no reader
 *     ever sees that word — `destinationWord` in core owns the spelling.
 *   · NO STATUS PILL. A night that balanced says `settled` in the meta line and
 *     nowhere else; a night that did not still has to explain itself, which is
 *     the one block below that is conditional.
 *
 * NOTHING HERE ADDS ANYTHING UP. The rows and their terms come off
 * `settledRows()`, the slabs off `ruleOutcomes()`, and the closing row off
 * `resultTotals()`. See `CLAUDE.md`, and `packages/core/src/settled.test.ts`
 * for the list's own worked night asserted to the dollar.
 */
export function NightResult({
  result,
  ledger: _ledger,
  loggedBy,
  roundingMode,
  onChangeRounding,
}: {
  result: SettlementResult;
  /**
   * The resolved ledger. NOT READ ANY MORE and kept on the props deliberately:
   * `watch.tsx` and `settled.tsx` both hand it over, both are outside this
   * batch's files, and a required prop removed is two screens to edit for no
   * change on the phone. R1 draws no prize-pool card — see the note on the
   * table block's closing row, which states the same money the card did.
   */
  ledger: ResolvedLedger;
  /**
   * Who confirmed the difference, when there was one. Null drops the second
   * line — and a night that balanced never has one, because a night that
   * balanced needs no explanation.
   */
  loggedBy: string | null;
  /**
   * The step the night settled at, for the row under the blocks. It is on the
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

  /*
   * FINAL BY DEFAULT, and this component only ever draws a settled night.
   * Where a person lands is where the money actually left them.
   */
  const [mode, setMode] = useState<SettledMode>('final');

  /* The ranked list, in the mode's own order. `settledRows` does the sort, so
     the two orders cannot come from two implementations. */
  const rows = settledRows(result, mode);
  /* One slab per rule that took something. A rule with a total of $0 is not a
     slab; with no deductions at all the block is absent. */
  const outcomes = ruleOutcomes(result);
  /* The closing row. The only sum across a column on this screen, and it is
     made in core. */
  const totals = resultTotals(result);
  const final = mode === 'final';

  return (
    <>
      {/*
       * THE ONE THING THE LIST CANNOT SAY.
       *
       * A night that balanced states its status in the meta line under the
       * title — `20:05 → 23:45 · 3h 40m · 8 players · settled` — and nowhere
       * else: a confirmed result carries no status pill of its own. A night that
       * did NOT balance still has to say so, and by how much, and who signed it
       * off, because every figure below was derived with that gap inside it. So
       * this block exists only when there is something to explain.
       */}
      {result.reconciliation.difference !== 0 && (
        <Difference difference={result.reconciliation.difference} loggedBy={loggedBy} />
      )}

      {/*
       * THE TOGGLE, AND THEN THE LIST — the same two objects `/settled` draws,
       * from the same file. Switching changes the figures and what is on the
       * row; nothing above the list moves.
       */}
      <View style={styles.tabs}>
        <ScoreTabs mode={mode} onPick={setMode} />
      </View>

      <View style={styles.block}>
        <SectionLabel
          label={final ? 'Final' : 'At the table'}
          qualifier={final ? 'after deductions and compensations' : 'before deductions'}
        />

        {rows.map((row) => (
          <ScoreRow
            key={row.player.playerId}
            row={row}
            layout="grouped"
            /* The dark-theme exception in `ui-audit.mjs` is anchored on this
               name, and the UI journeys find a watcher's rows by it. */
            testID="e6-row"
          />
        ))}

        {/*
         * THE CHECK PLAYERS RUN BEFORE THEY ACCEPT THE FINAL, and it belongs to
         * At table alone. Money is neither made nor destroyed at a poker table,
         * so that column comes to nothing — and the row states the two sides
         * that produced the zero rather than only the zero, because a bare `$0`
         * is not checkable. Final's column does NOT come to nothing: it is
         * short by exactly what left the players for good, which the row below
         * the slabs names.
         */}
        {!final && (
          <ReconciliationRow
            boughtIn={totals.boughtIn}
            cashedOut={totals.cashedOut}
            game={totals.game}
          />
        )}
      </View>

      {/*
       * THE DEDUCTIONS, with their total on the section label.
       *
       * EVERY DEDUCTION IS OPEN — who paid which bill and for how much is on
       * the face of the slab, not behind a tap. That is what earns the fold in
       * the rows above: the reader can see the $54 arriving before they see it
       * subtracted, and the row's bone tray is the same $54 against a name.
       *
       * THE SLAB IS TINTED AND IS ALLOWED TO BE: it carries an unsigned total,
       * so `tinted-result-row` — anchored on the signed figure and not on a
       * colour name — never looks at it. Bone on bone-wash, in both themes.
       */}
      {outcomes.length > 0 && (
        <View style={styles.deductions}>
          <SectionLabel
            label="Deductions"
            value={`${formatToFit(result.totalOffTable, ROW_FITS)} total`}
          />

          {outcomes.map((o) => (
            <View key={o.ruleId} style={[styles.slab, { backgroundColor: t.offTableWash }]}>
              <View style={styles.slabHead}>
                <Text style={[styles.slabName, { color: t.offTable }]} numberOfLines={1}>
                  {o.name}
                </Text>
                <Text
                  style={[styles.slabTotal, { color: t.offTable }]}
                  numberOfLines={1}
                  {...cappedFigure}
                >
                  {formatToFit(o.total, ROW_FITS)}
                </Text>
              </View>

              <View style={styles.items}>
                {itemise(o).map((item) => (
                  <View key={item.key} style={styles.item}>
                    <Text style={[styles.itemLabel, { color: t.muted }]}>{item.label}</Text>
                    {item.amount !== null && (
                      <Text
                        style={[styles.itemValue, { color: t.offTable }]}
                        numberOfLines={1}
                        {...cappedFigure}
                      >
                        {formatToFit(item.amount, ROW_FITS)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/*
           * `Players net` / `−$184 → piggy bank`.
           *
           * THE ONE FIGURE ON THIS SCREEN THAT LOOKS LIKE AN ERROR AND IS NOT.
           * Eight finals summing to −$184 is money leaving the table, and the
           * row names where it went — without which a reader who adds the
           * column up finds a hole and stops trusting the screen. It sits with
           * the deductions rather than under the list because it is the same
           * fact the slabs above it state, totalled.
           */}
          {final && (
            <ClosingRow
              label="Players net"
              value={
                totals.destinations.length === 0
                  ? formatSignedToFit(totals.players, ROW_FITS)
                  : `${formatSignedToFit(totals.players, ROW_FITS)} → ${totals.destinations
                      .map(destinationWord)
                      .join(', ')}`
              }
            />
          )}

          {/*
           * The note under the slabs — decided copy, and the sentence the whole
           * fold rests on. It is drawn only where it is TRUE: a night with no
           * bill to pay anybody back for would be promising something that
           * never happens.
           */}
          {outcomes.some((o) => !o.float && o.paidTo.length > 0) && (
            <View style={styles.note}>
              <Icon name="info" color={t.dim} size={14} />
              <Text style={[styles.noteText, { color: t.dim }]}>
                Whoever paid a bill gets it back in full below.
              </Text>
            </View>
          )}
        </View>
      )}

      {/*
       * THE STEP, LAST — `design/handoff-E2/docs/E2-rounding.md`, frames
       * `3a`–`3d`. E2 owns it; this screen shows it and says what it cost.
       *
       * A CLOSED NIGHT DOES NOT OPEN IT (rule 8). Every figure above was derived
       * at the step it closed with; a row that still looked like a door would be
       * offering to re-round a record of what people have already been paid.
       *
       * FINAL ONLY. At the table is `out − in`, which the step does not reach.
       */}
      {final && result.rounding.on && (
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
 * WHAT IS ON THE FACE OF A DEDUCTION SLAB, under its name and total.
 *
 * A bill lists everybody who fronted money for it and what they are owed —
 * that is the whole reason the slab is open rather than behind a tap, and it is
 * what the note underneath is promising. A float lists nobody, because nobody
 * is getting anything back: it says where the money now sits.
 *
 * ⚠ TWO STRINGS HERE ARE NOT DRAWN AS SUCH, and both are flagged rather than
 * passed off as decided copy.
 *
 *   · The board writes `Petr paid the delivery`. *The delivery* is which errand
 *     it was, and the engine has nowhere to keep that: a rule's credits are one
 *     figure per person, however many trips to the shop made it up. So the line
 *     is `Petr paid`, which is the drawn sentence with the half we do not know
 *     removed rather than invented.
 *   · `held by {name}` is this app's own, and has been since B27 took the float
 *     off the collector's row. The board draws `Stays with the group for the
 *     next buy-in`, which is this sentence for a piggy bank nobody collects —
 *     used verbatim where that is the case. It stays lower case where the board
 *     is sentence case, because it is the string that already shipped and
 *     `CLAUDE.md` says copy is final; `ui-journeys.mjs` holds it by that
 *     spelling.
 */
function itemise(o: RuleOutcome): Array<{ key: string; label: string; amount: Money | null }> {
  if (o.paidTo.length === 0) {
    return [
      {
        key: 'nobody',
        label: o.float
          ? o.destination === 'kitty'
            ? 'Stays with the group for the next buy-in'
            : 'held by the group'
          : 'not paid back yet',
        amount: null,
      },
    ];
  }
  return o.paidTo.map((c) => ({
    key: c.playerId,
    label: o.float ? `held by ${c.name}` : `${c.name} paid`,
    amount: c.amount,
  }));
}

/** `AT THE TABLE` with either a qualifier or a figure right-aligned beside it. */
function SectionLabel({
  label,
  qualifier,
  value,
}: {
  label: string;
  /** 12/400 fainter — `before deductions`. */
  qualifier?: string;
  /** 12/600 tan — `$616 total`. */
  value?: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      {/* Uppercased by the token, not by the string: the copy is written the way
          it is read aloud, and the tracking is what makes 12px legible. */}
      <Text style={[styles.sectionLabel, { color: t.muted }]} {...unscaledLabel}>
        {label}
      </Text>
      {qualifier !== undefined && (
        <Text style={[styles.qualifier, { color: t.dim }]} numberOfLines={1}>
          {qualifier}
        </Text>
      )}
      {value !== undefined && (
        <Text
          style={[styles.sectionValue, { color: t.offTable }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

/**
 * The last row of a block: a fact on the left, a figure on the right, both
 * quiet. 38 tall over a hairline, and it belongs to the block above it rather
 * than being a row of the list.
 */
function ClosingRow({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.closing, { borderTopColor: t.hairline }]}>
      <Text style={[styles.closingLabel, { color: t.dim }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.closingValue, { color: t.dim }]} numberOfLines={1} {...cappedFigure}>
        {value}
      </Text>
    </View>
  );
}

/**
 * A night that did not add up, on the record.
 *
 * The gap and who signed it off. It is a block rather than a pill because it is
 * the one thing on this screen that has to be read before the figures under it
 * are believed — every net below was derived with this difference inside it.
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
  /* `0 22px` on the board, and 26 above every block but the first. `Screen`
     owns the space above the first one. */
  /* The toggle sits directly over the list — the handoff puts it under the
     meta line, and on this screen the band above it is the caller's. */
  tabs: { marginHorizontal: space.page, marginTop: 8 },
  block: { marginHorizontal: space.page, marginTop: 14 },
  deductions: { marginHorizontal: space.page, marginTop: 26, gap: 10 },

  /* The section label's own row: `padding 0 0 8`, gap 10, baselines aligned. */
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingBottom: 8 },
  sectionLabel: { ...type.sectionLabel },
  qualifier: { marginLeft: 'auto', fontSize: 12, fontWeight: '400', flexShrink: 1 },
  sectionValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  /*
   * THE PLAYER ROW IS `ScoreBreakdown`'S NOW, and so is every dimension that
   * used to be measured here — the name, the figure, the caption under it and
   * the note about which of the two may shrink. One row drawn in one file is
   * the point of the 8 September cut; a copy of its geometry left behind here
   * is the copy that goes stale.
   */

  /* The closing row of a block: 38, a hairline above, both halves quiet. */
  closing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 38,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closingLabel: { fontSize: 13, fontWeight: '400', flexShrink: 1 },
  closingValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  /* A deduction slab: `15px 17px`, radius 8, 11 between its two halves, 10
     between one slab and the next. */
  slab: { paddingVertical: 15, paddingHorizontal: 17, borderRadius: radius.pressable, gap: 11 },
  slabHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  slabName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  slabTotal: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  items: { gap: 6 },
  item: { flexDirection: 'row', gap: 12 },
  itemLabel: { fontSize: 13.5, fontWeight: '400', flexShrink: 1, lineHeight: 18 },
  itemValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 13.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  /* The note under the slabs: a 14px glyph, 9 across, `2px 2px 0`. */
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingTop: 2, paddingHorizontal: 2 },
  noteText: { fontSize: 12.5, fontWeight: '400', lineHeight: 18.1, flexShrink: 1 },

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

  /* Under the blocks, at the page's edge. */
  rounding: { marginTop: 14 },
});

/*
 * WHERE EACH FIGURE ON THIS SCREEN RUNS OUT, measured at 360 — the narrowest
 * phone in the device matrix and the width everything is tightest at.
 *
 * A FINAL ROW holds about 316 points inside the page's 22 either side: the name
 * and its caption on the left, the figure at 18/700 on the right, 12 between.
 * The name and the caption give and the figure does not, so the only question is
 * how much the figure may take — "−$999,999" at about 93 leaves 223 for the
 * name, which is more than any name needs. Seven digits fit and eight do not,
 * so a million is where a result stops printing in full.
 *
 * THE CAPTION IS THE THING THAT ACTUALLY RUNS OUT FIRST, and it is allowed to:
 * it is one line, it truncates, and every term on it is also a figure somewhere
 * else on the same screen — the game above, the deduction's own slab between
 * them. A caption that is cut short costs the reader a re-derivation; a figure
 * that is cut short costs them the answer. That is why the caption may shrink
 * and the figure may not.
 *
 * `cappedFigure` holds the phone's text setting at the money cap on every
 * figure, so none of these measurements moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
