import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  destinationWord,
  gameResults,
  resultFormula,
  resultTotals,
  ruleOutcomes,
  type CaptionTerm,
  type Money,
  type ResolvedLedger,
  type RoundingMode,
  type RuleOutcome,
  type SettlementResult,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit, formatUnmarked } from '../lib/money';
import { Icon } from './Icon';
import { RoundingBar } from './RoundingBar';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, radius, space, type, unscaledLabel } from '../design/tokens';

/**
 * A night that has ended — `R1 · Results`, from
 * `design_handoff_rebuy_and_results/Game Results Breakdown.dc.html`, cut
 * 5 September. It supersedes `design/handoff-four-screens/` on this screen.
 *
 * **THE DEDUCTIONS ARE FOLDED BACK INTO THE ROW, AND THE WORKING IS PRINTED
 * UNDER IT.** That is the reversal, and it is deliberate. The screen this file
 * drew until today was built on the four-screens cut's central rule —
 * *deductions are not folded into any player's balance* — with the game results
 * in one list, the deductions in a block of their own, and the arithmetic that
 * joins them behind a button called *Full ledger*. The owner's reason for that
 * rule was good and is unchanged: a bill split flat across eight people takes
 * $54 off six losers for something that has nothing to do with poker, and a row
 * that folds it in silently has stopped being a poker result.
 *
 * R1's answer is that the objection was never to the arithmetic, it was to the
 * arithmetic being done on somebody's behalf without showing it. So the night
 * is drawn in three blocks and the reader watches the subtraction happen:
 *
 *   AT THE TABLE   what everybody did, before deductions, in neutral ink
 *   DEDUCTIONS     every bill open on the face of its own slab, with who
 *                  fronted it and for how much
 *   FINAL          one signed figure per person, and `1,620 − 54 − 23` under
 *                  the name — with `+ 242 paid` in tan for whoever covered a
 *                  bill and is getting it back
 *
 * WHAT IT CLOSES is finding 7 of `docs/game-outcomes-cjm.md`: *"a settled night
 * no longer shows anybody their net"*. Taking the deductions out of the row on
 * 3 September moved the figure a player argues about a week later — $1,429 for
 * Dana, not $1,620 — behind a button, and no row on this screen was tappable.
 * The net is back on the row, with its terms beside it.
 *
 * COLOUR IS RESERVED FOR THE FINAL BLOCK, which is the rule that makes three
 * lists of money on one screen readable: the table figures are neutral so
 * nobody reads them as the answer, and the one place green and red appear is
 * the block that IS the answer. It is also what keeps B23 true — the colour is
 * on the figure and never on a fill behind it, and `ui-audit.mjs`'s
 * `tinted-result-row` holds every signed figure in the app to that.
 *
 * -- what this screen keeps from every earlier cut --
 *
 *   · HAIRLINE ROWS, NO FILL, in both themes. The only tinted things on the
 *     screen are the deduction slabs, which carry an unsigned total.
 *   · THE FLOAT IS NOT A WIN (B27). Whoever holds the piggy bank ends the night
 *     with the room's money in their pocket; it is out of their FINAL row and
 *     named on the slab it came off.
 *   · `Piggy bank`, never `Kitty`. The stored value is `kitty` and no reader
 *     ever sees that word — `destinationWord` in core owns the spelling.
 *   · NO STATUS PILL. A night that balanced says `settled` in the meta line and
 *     nowhere else; a night that did not still has to explain itself, which is
 *     the one block below that is conditional.
 *
 * NOTHING HERE ADDS ANYTHING UP. The table rows come off `gameResults()`, the
 * slabs off `ruleOutcomes()`, the final rows and their captions off
 * `resultFormula()`, and both closing rows off `resultTotals()`. See
 * `CLAUDE.md`, and `packages/core/src/results-r1.test.ts` for the handoff's own
 * worked example asserted to the dollar.
 *
 * SHARED BY `settled.tsx` AND `watch.tsx` — the host's own record and a
 * watcher's read-only view of it are the same facts. What differs is only what
 * the caller puts after it.
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

  /* What everybody did at the table and nothing else — `gameResults`, which is
     also the engine's answer to who was there and in what order. Two names it
     does not return are the point of it: the hole is not dropped (B28) and the
     collector's float is not a night (B27). */
  const table = gameResults(result);
  /* One slab per rule that took something. A rule with a total of $0 is not a
     slab; with no deductions at all the block is absent. */
  const outcomes = ruleOutcomes(result);
  /* One row per person, the net and the terms behind it. Same membership and
     the same order as the table block, sorted on the figure IT prints. */
  const finals = resultFormula(result);
  /* Both closing rows. The only sums across a column on this screen, and they
     are made in core. */
  const totals = resultTotals(result);

  return (
    <>
      {/*
       * THE ONE THING THE BLOCKS CANNOT SAY.
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
       * BLOCK 1 · AT THE TABLE, `before deductions` right-aligned beside it.
       *
       * NEUTRAL INK ON EVERY FIGURE, which is the screen's whole layout rule.
       * These are signed results and they are not coloured, because the block
       * that is coloured is the one three sections down that a person is
       * actually paid on. A green +$1,620 here and a green +$1,543 there are
       * two answers to one question.
       *
       * ⚠ `#E8E9EC` IS NOT A TOKEN. The board's neutral money sits between
       * `text` and `muted`, and `tokens.ts` is app-wide — it must be changed by
       * a session running alone (`CLAUDE.md`), and this one is not. Drawn in
       * `text` meanwhile, which keeps the rule that matters (nothing here is
       * green or red) and loses a half-step of de-emphasis. Recorded in
       * `docs/screens.md`.
       */}
      <View style={styles.block}>
        <SectionLabel label="At the table" qualifier="before deductions" />

        {table.map(({ player: p, game }) => (
          <View
            key={p.playerId}
            testID="e6-row"
            style={[styles.tableRow, { borderTopColor: t.hairline }]}
          >
            <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={[styles.tableFigure, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
              {formatSignedToFit(game, ROW_FITS)}
            </Text>
          </View>
        ))}

        {/*
         * AND THE ROW THAT SAYS THE TABLE IS SOUND. Money is neither made nor
         * destroyed at a poker table, so these add to nothing — and the row
         * states the two sides that produced the zero rather than only the
         * zero, because a bare `$0` is not checkable.
         *
         * IT IS ALSO WHERE THE PRIZE-POOL CARD WENT. This screen used to open
         * with `In play · Entries · Deductions` in a card; R1 draws no such
         * card, and the money it stated is here, in the board's own words, with
         * the deductions total on its own section label below.
         */}
        <ClosingRow
          label={`${formatToFit(totals.boughtIn, ROW_FITS)} in, ${formatToFit(
            totals.cashedOut,
            ROW_FITS,
          )} out`}
          value={formatSignedToFit(totals.game, ROW_FITS)}
        />
      </View>

      {/*
       * BLOCK 2 · DEDUCTIONS, with its total on the section label.
       *
       * EVERY DEDUCTION IS OPEN — who paid which bill and for how much is on
       * the face of the slab, not behind a tap. That is what earns the fold in
       * the final block: the reader can see the $54 arriving before they see it
       * subtracted.
       *
       * THE SLAB IS THE ONE TINTED THING ON THIS SCREEN and it is allowed to
       * be: it carries an unsigned total, so `tinted-result-row` — which is
       * anchored on the signed figure and not on a colour name — never looks at
       * it. Bone on bone-wash, in both themes.
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
       * BLOCK 3 · FINAL — the figure a person is actually paid on, and the
       * arithmetic that reached it under their name.
       *
       * THE CAPTION MAKES EVERY FIGURE CHECKABLE WITHOUT A TAP, which is the
       * sentence the handoff uses and the reason no row here opens anything.
       * `1,620 − 54 − 23`: the game first, then every charge in the order the
       * night applied its rules, then the compensation — `+ 242 paid`, in tan,
       * because it is off-table money coming back rather than a poker result.
       *
       * The terms are the ENGINE'S — `resultFormula().caption` — including
       * which of them is a compensation. A screen deciding that for itself
       * would be a fourth copy of "which credits are a float", and the fourth
       * copy is the one that goes stale.
       */}
      {finals.length > 0 && (
        <View style={styles.block}>
          <SectionLabel label="Final" qualifier="after deductions and compensations" />

          {finals.map((f) => (
            <View
              key={f.player.playerId}
              testID="r1-final-row"
              style={[styles.finalRow, { borderTopColor: t.hairline }]}
            >
              <View style={styles.finalText}>
                <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                  {f.player.name}
                </Text>
                {/* A lone `game` term is the net said twice, so a row with
                    nothing taken off it draws no caption at all. */}
                {f.caption.length > 1 && (
                  <Text style={[styles.caption, { color: t.muted }]} numberOfLines={1}>
                    {f.caption.map((term, i) => (
                      <Fragment key={term.key}>
                        {i > 0 && ' '}
                        <Text
                          style={term.kind === 'compensation' ? { color: t.offTable } : null}
                        >
                          {captionTerm(term, i)}
                        </Text>
                      </Fragment>
                    ))}
                  </Text>
                )}
              </View>

              {/* Muted at exactly zero, which `moneyColor` is not: it falls back
                  to the text colour, and in a column of green and red a white
                  figure reads as a third state rather than as no state. */}
              <Text
                style={[styles.finalFigure, { color: f.net === 0 ? t.muted : moneyColor(t, f.net) }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatSignedToFit(f.net, ROW_FITS)}
              </Text>
            </View>
          ))}

          {/*
           * `Players net` / `−$184 → piggy bank`.
           *
           * THE ONE FIGURE ON THIS SCREEN THAT LOOKS LIKE AN ERROR AND IS NOT.
           * Eight finals summing to −$184 is money leaving the table, and the
           * row names where it went — without which a reader who adds the
           * column up finds a hole and stops trusting the screen.
           */}
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
        </View>
      )}

      {/*
       * THE STEP, LAST — `design/handoff-E2/docs/E2-rounding.md`, frames
       * `3a`–`3d`. E2 owns it; this screen shows it and says what it cost.
       *
       * A CLOSED NIGHT DOES NOT OPEN IT (rule 8). Every figure above was derived
       * at the step it closed with; a row that still looked like a door would be
       * offering to re-round a record of what people have already been paid.
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
 * ONE CAPTION TERM AS THE BOARD WRITES IT.
 *
 * The first is the game and carries only a minus when it has one — `1,620`,
 * `−210`. Every term after it is an operator with a space after it — `− 54`,
 * `+ 242 paid` — because the line is being read as arithmetic rather than as a
 * column of signed amounts.
 *
 * NO CURRENCY SYMBOL ON ANY OF THEM. That is the board's, and it is what keeps
 * a four-term line on one row at 360: the figure beside the name carries the
 * symbol, and the line under it is the working, not six more amounts.
 *
 * The minus is U+2212 and not a hyphen — the width of a digit, so a column of
 * captions stays square. `formatSignedUnmarked` in `lib/money` would give the
 * sign glued to the figure; the board sets the operator apart from it.
 */
function captionTerm(term: CaptionTerm, index: number): string {
  const figure = formatUnmarked(Math.abs(term.amount) as Money);
  const word = term.word === null ? '' : ` ${term.word}`;
  if (index === 0) return `${term.amount < 0 ? '−' : ''}${figure}${word}`;
  return `${term.amount < 0 ? '−' : '+'} ${figure}${word}`;
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
  block: { marginHorizontal: space.page, marginTop: 26 },
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

  /* AT THE TABLE — 40 tall, a hairline above each row, gap 12. `minHeight`
     rather than `height`: the row grows with the reader's text setting rather
     than clipping a name at 120%. */
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an amount
   * on the next, which reads as two things. See B18.
   */
  tableFigure: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

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

  /* FINAL — `9px 0`, a hairline above each row, and the caption under the name
     rather than beside it. */
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  finalText: { gap: 3, flexShrink: 1, minWidth: 0 },
  caption: { fontSize: 12.5, fontWeight: '400', fontVariant: ['tabular-nums'] },
  finalFigure: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

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
