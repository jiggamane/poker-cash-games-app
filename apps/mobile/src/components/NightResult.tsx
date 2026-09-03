import { StyleSheet, Text, View } from 'react-native';
import {
  gameResults,
  prizePool,
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
 * A night that has ended — screen 3 of `design/handoff-four-screens/`, cut
 * 2 September, which supersedes the rev-18 E6 frame on this screen.
 *
 * **DEDUCTIONS ARE NOT FOLDED INTO ANY PLAYER'S BALANCE**, and that is the whole
 * of what changed. Every layout before this one resolved a row to a net: the E6
 * frame drew `in $500 · out $2,120`, the columns cut drew four cells, and the
 * formula line drew `game +$1,620 · food −$54 · piggy −$23` under the name. All
 * three answered "why is my number this" by showing the working. This one
 * answers it by not doing the arithmetic on somebody's behalf: the row is what
 * they did at the table, the deductions are a block of their own underneath, and
 * who fronted the food or holds the tin is settled at the transfers.
 *
 * The owner's reason, and it is the right one: a bill split flat across eight
 * people takes $54 off six losers for something that has nothing to do with
 * poker, and a row that folds it in has stopped being a poker result.
 *
 * WHAT IS LOST IS NOT LOST — `/ledger` draws the whole formula as four columns,
 * `Full ledger` at the foot of this screen is the way to it, and somebody who
 * wants to check the sum has a screen for it.
 *
 * THE CHECK THIS SCREEN CAN NOW STATE, which no previous layout could: the game
 * results sum to ZERO. That is what says the game half of the night is sound,
 * and nothing about the rules or the step can move it.
 *
 * -- what this screen kept from every earlier cut --
 *

 *   · HAIRLINE ROWS, NO FILL, in both themes. B23 is what a washed row cost, and
 *     `ui-audit.mjs`'s `tinted-result-row` holds it. The colour is on the figure
 *     and nowhere else.
 *   · THE FLOAT IS NOT A WIN (B27). Whoever holds the piggy bank ends the night
 *     with the room's money in their pocket, and it is out of their row and
 *     named once in the block below beside their name.
 *   · `Piggy bank`, never `Kitty`. The stored value is `kitty` and no reader ever
 *     sees that word — `destinationWord` in core owns the spelling.
 *   · NO STATUS PILL. A night that balanced says `settled` in the meta line under
 *     the title and nowhere else; a night that did not still has to explain
 *     itself, which is the one block below that is conditional.
 *
 * NOTHING HERE ADDS ANYTHING UP. The pool comes off `prizePool()`, the rows and
 * their order off `gameResults()`, the block off `ruleOutcomes()`, the deductions
 * total off `settle()` and the difference off the reconciliation. See
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
   * ONE ROW PER PERSON THE NIGHT HAPPENED TO, carrying what they did at the
   * table and nothing else — `gameResults`, which is the engine's answer to who
   * that is and in what order. Two names it does not return are the point of it:
   * the hole is not dropped (B28) and the collector's float is not a night
   * (B27). See `working.ts`.
   */
  const rows = gameResults(result);

  /* One line per rule that took something, and where it went. A rule with a
     total of $0 is not a line; with no deductions at all the block is absent. */
  const outcomes = ruleOutcomes(result);

  return (
    <>
      {/*
       * THE THREE FIGURES, IN A CARD — `0 20px 18px`, `15px 18px`, radius 14.
       *
       * WHAT THE NIGHT WAS, IN THE ORDER IT IS ASKED: how much money came
       * through the table, how many times somebody bought in, and how much of
       * it did not go back to the players. The three read across as one
       * sentence, which is why they are cells in one card and not three.
       *
       * DEDUCTIONS IS IN BONE, the same ink the block at the foot uses, because
       * it is the one of the three that is not the players' any more. It is the
       * only figure on this screen drawn in that colour above the block, and it
       * is what ties the top of the screen to the bottom.
       */}
      <View style={[styles.summary, { backgroundColor: t.surface }]}>
        <Stat
          label="Prizepool"
          value={formatToFit(pool.total, SUMMARY_FITS)}
          style={styles.statWide}
        />
        <Stat
          label={pool.entries === 1 ? 'Entry' : 'Entries'}
          value={String(pool.entries)}
          style={styles.statEntries}
        />
        <Stat
          label="Deductions"
          value={formatToFit(result.totalOffTable, SUMMARY_FITS)}
          style={styles.statRight}
          tone={t.offTable}
          align="right"
        />
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
          Game results
        </Text>

        {/*
         * ONE FIGURE PER PERSON, AND IT IS THE ONE THEY EARNED. Cashed out less
         * bought in — no food column, no piggy column, no per-player deduction
         * anywhere on this row. What the rules took is the block below.
         *
         * THESE SUM TO ZERO on a night that balanced, which is the check the
         * screen exists to let a room make. Nothing about the rules or the
         * rounding step can move it: neither touches a gross result.
         */}
        {rows.map(({ player: p, game }, i) => (
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
            <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
              {p.name}
            </Text>

            {/*
             * Muted at exactly zero, which `moneyColor` is not: it falls back to
             * the text colour, and in a column of green and red a white figure
             * reads as a third state rather than as no state.
             */}
            <Text
              style={[styles.rowNet, { color: game === 0 ? t.muted : moneyColor(t, game) }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(game, ROW_FITS)}
            </Text>
          </View>
        ))}
      </View>

      {/*
       * WHAT THE RULES TOOK, AND WHO HAS IT — its own card, `14px 20px 0`,
       * `14px 16px`, radius 14, 10 between the rows.
       *
       * IT IS THE OTHER HALF OF THE SCREEN NOW, not a footnote to it. The rows
       * above say what everybody did at the table; this says what came off the
       * top and where it went, and the two together are the whole night. That
       * is why it has a TOTAL of its own: the block has to add up on its own
       * terms, not lean on a figure at the top of the screen.
       *
       * ONE LINE PER RULE, and the second line of it names the destination
       * rather than the payers: who paid what is the working, and the working is
       * E3's and `/ledger`'s. What is here is the half a room asks for at the
       * end — the food money goes back to the people who fronted it, and the
       * piggy bank is in somebody's pocket.
       *
       * THE HELD MONEY IS IN BONE, the rest in plain ink. A bill being paid back
       * is a person getting their own money returned; a float is the room's
       * money leaving the table for good, and that is the one distinction this
       * block exists to draw.
       *
       * NO "LEAVES THE TABLE" AND NO "TAKEN FROM THE TABLE" — the handoff's own
       * copy rule for this flow.
       */}
      {outcomes.length > 0 && (
        <View style={[styles.outcomes, { backgroundColor: t.surface }]}>
          <Text style={[styles.sectionLabel, { color: t.muted }]} {...unscaledLabel}>
            Deductions
          </Text>

          {outcomes.map((o) => (
            <View key={o.ruleId} style={styles.outcomeRow}>
              <View style={styles.outcomeText}>
                <Text
                  style={[styles.outcomeName, { color: o.float ? t.offTable : t.text }]}
                  numberOfLines={1}
                >
                  {o.name}
                </Text>
                <Text style={[styles.outcomeHolder, { color: t.muted }]} numberOfLines={1}>
                  {outcomeHolder(o)}
                </Text>
              </View>
              <Text
                style={[styles.outcomeValue, { color: o.float ? t.offTable : t.text }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatToFit(o.total, ROW_FITS)}
              </Text>
            </View>
          ))}

          {/* `totalOffTable` IS the sum of the lines above, computed by the
              engine. The block does not re-add its own column. */}
          <View style={[styles.outcomeTotal, { borderTopColor: t.hairline }]}>
            <Text style={[styles.totalLabel, { color: t.text }]} {...unscaledLabel}>
              Total
            </Text>
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
 * WHO HAS A RULE'S MONEY — the second line of its row, under the rule's name.
 *
 * `→ Lena, Marek` is money going BACK to people who spent it at the shop: they
 * are out of pocket until the table pays them, so the line names them and the
 * arrow points at them. `held by Radka` is not a repayment at all — that money
 * is the room's, and the name is whose pocket it is sitting in. `ruleOutcomes`
 * draws the line between the two; this writes it.
 *
 * ⚠ `held by {name}` IS NOT ON ANY BOARD. The handoff draws `held by the group`,
 * which is this sentence for a rule with no collector, and no frame draws one
 * that has a collector — because taking the float off the collector's own row
 * (B27) is what put a name here at all. Written to the grammar of the string
 * that IS drawn, and flagged rather than passed off as decided copy.
 */
function outcomeHolder(o: RuleOutcome): string {
  if (o.paidTo.length === 0) {
    /* Nobody has it: a bill nobody has been repaid for yet, or a rule whose
       collector the group never named. Both are the same sentence. */
    return o.float ? 'held by the group' : 'not paid back yet';
  }
  const names = o.paidTo.map((c) => c.name).join(', ');
  return o.float ? `held by ${names}` : `→ ${names}`;
}

/**
 * One of the three figures across the top, with its LABEL ABOVE IT.
 *
 * The handoff puts the label first and the figure under it, which is the
 * opposite of the frame this screen used to draw. It reads as a caption to the
 * number rather than a footnote to it, and it is what lets the three cells take
 * different widths without the labels drifting apart.
 */
function Stat({
  label,
  value,
  style,
  tone,
  align,
}: {
  label: string;
  value: string;
  style: object;
  /** Bone, for the one of the three that is not the players' any more. */
  tone?: string;
  align?: 'right';
}) {
  const t = useTheme();
  return (
    <View style={[styles.stat, style]}>
      {/* Uppercased by the token, not by the string: the copy is written the way
          it is read aloud, and the tracking is what makes 11px legible. */}
      <Text
        style={[styles.statLabel, align === 'right' && styles.right, { color: t.muted }]}
        {...unscaledLabel}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          align === 'right' && styles.right,
          { color: tone ?? t.text },
        ]}
        numberOfLines={1}
        {...cappedFigure}
      >
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
  /* `0 20px 18px` · `15px 18px` · radius 14 — the handoff's card. Three cells
     in a row, the first taking what is left, the second fixed at the width of
     a two-digit count, the third right-aligned against the card's edge. */
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: space.card,
    marginBottom: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.card,
  },
  stat: { minWidth: 0, gap: 4 },
  statWide: { flex: 1 },
  statEntries: { width: 74 },
  statRight: { flexShrink: 0 },
  right: { textAlign: 'right' },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },

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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  rowName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name and the line under it may give — they are words —
   * and a figure may not: left to shrink, "−$12,000" came apart into a dash on
   * one line and an amount on the next, which reads as two things. See B18.
   */
  rowNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 19,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* `14px 20px 0` · `14px 16px` · radius 14 · gap 10 — the handoff's card, and
     the 20 is deliberate against the list's 22: the block runs two points wider
     either side, which is what makes it read as a block rather than as two more
     rows of the list above it. */
  outcomes: {
    marginTop: 14,
    marginHorizontal: space.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    gap: 10,
  },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outcomeText: { gap: 2, flexShrink: 1, minWidth: 0 },
  outcomeName: { fontSize: 15, fontWeight: '600' },
  outcomeHolder: { fontSize: 12.5, fontWeight: '400', lineHeight: 17 },
  outcomeValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  /* The total sits over a hairline, inside the card's own padding. */
  outcomeTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  totalValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  /* Under the block, at the page's edge. */
  rounding: { marginTop: 12 },
});

/*
 * WHERE EACH FIGURE ON THIS SCREEN RUNS OUT, measured at 360 — the narrowest
 * phone in the device matrix and the width everything is tightest at.
 *
 * A GAME-RESULT ROW holds about 308 points inside its own padding: the name on
 * the left, the figure at 19/700 on the right, 12 between them. The name gives
 * and the figure does not, so the only question is how much the figure may
 * take — "−$999,999" at about 98 leaves 210 for a name, which is more than any
 * name needs. Seven digits fit and eight do not, so a million is where the
 * result stops printing in full.
 *
 * There is no formula line under it any more, so nothing on this row competes
 * for that space. What used to abbreviate at ten thousand — the terms of the
 * formula — has moved to `/ledger`, where it has four columns of its own.
 *
 * A SUMMARY CELL is the tightest of the three: `PRIZEPOOL` takes what is left
 * of the card after a fixed 74 for the entry count and whatever `DEDUCTIONS`
 * needs, which at 360 is about 130 points, and 26/800 tabular spends roughly
 * 15.6 a glyph — eight of them. "$99,999" is seven and "$999,999" is eight, so
 * the summary abbreviates a decade earlier than the row beneath it. That is
 * deliberate and it is not one figure printed twice: the pool is the night's
 * own total and a result is one person's share of it.
 *
 * `cappedFigure` holds the phone's text setting at the money cap on every one
 * of them, so none of these measurements moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
const SUMMARY_FITS = 100_000;
