import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import {
  balanceCheck,
  ruleOutcomes,
  settledRows,
  type Money,
  type ResolvedLedger,
  type RoundingMode,
  type SettlementResult,
} from '@poker-club/core';
import { formatToFit } from '../lib/money';
import { Card } from './Card';
import { RoundingBar } from './RoundingBar';
import { ChipsBlock, DeductionsBlock, MENU_DIM, SessionRow } from './SessionViews';
import { useTheme } from '../design/useTheme';
import { T, z } from '../design/scale';
import { cappedFigure } from '../design/tokens';
import type { SessionView } from '../lib/sessionViewStore';

/**
 * A NIGHT THAT HAS ENDED, READ BY SOMEBODY WHO IS NOT THE HOST —
 * `design/handoff-session-views/`, frames `10a`–`10c`, cut 9 September.
 *
 * IT IS THE SAME SCREEN THE HOST READS, and that is the whole reason this file
 * exists rather than `/watch` drawing its own: the host's record and a
 * watcher's read-only view of it are the same facts, so they are the same rows,
 * the same blocks and the same three views. What differs is the band under it,
 * and the band is `/watch`'s.
 *
 * THE CONTROL IS NOT HERE. It belongs on the meta line, which is the SCREEN's,
 * so `/watch` owns the view and the menu's open state and hands both down. A
 * component that opened its own menu would put the control in the body on one
 * screen and in the chrome on the other, for one fact about one night.
 *
 * NOTHING HERE ADDS ANYTHING UP. The rows and their terms come off
 * `settledRows()`, the deduction rows off `ruleOutcomes()`, and the chips block
 * off `balanceCheck()` — the same three calls `/settled` makes.
 */
export function NightResult({
  result,
  ledger,
  loggedBy,
  view,
  menuOpen,
  roundingMode,
  onOpenPlayer,
}: {
  result: SettlementResult;
  /** Read for the chips block's own counts — how many buy-ins made the total. */
  ledger: ResolvedLedger;
  /**
   * Who confirmed the difference, when there was one. Null drops the second
   * line — and a night that balanced never has one, because a night that
   * balanced needs no explanation.
   */
  loggedBy: string | null;
  /** Which of the three the screen is on. The control is the screen's. */
  view: SessionView;
  /** True while the menu is up, and everything here drops to 32%. */
  menuOpen: boolean;
  /**
   * The step the night settled at, for the row under the list. It is on the
   * night rather than on the result because a night that never rounded still
   * has a setting, and the row says `off` rather than vanishing.
   */
  roundingMode?: RoundingMode | null;
  /** Opens a player's detail, where the reader is allowed to. */
  onOpenPlayer?: (playerId: string) => void;
}) {
  const onTable = view === 'onTable';
  const rows = settledRows(result, onTable ? 'table' : 'final');
  const outcomes = ruleOutcomes(result);

  /*
   * THE CHIPS BLOCK'S OWN COUNTS. A watcher has the resolved ledger and no
   * `finalCounts` map of their own, so `seated` is empty here and every stack
   * is already accounted for: the night is closed, which is the only state
   * this component is ever drawn in.
   */
  const balance = balanceCheck(ledger, new Map(), []);

  return (
    /* THE SHEET'S COLUMN, carried here rather than by the screen: `/watch`
       draws this inside a body of its own with no inset, and the full board's
       pushed screens stand 18 in from the sheet's edge, 12 between groups. */
    <View style={styles.column}>
      {/*
       * THE ONE THING THE LIST CANNOT SAY.
       *
       * A night that balanced states its status in the meta line and nowhere
       * else: a confirmed result carries no status pill of its own. A night
       * that did NOT balance still has to say so, and by how much, and who
       * signed it off, because every figure below was derived with that gap
       * inside it. So this block exists only when there is something to explain.
       */}
      {result.reconciliation.difference !== 0 && (
        <Difference difference={result.reconciliation.difference} loggedBy={loggedBy} />
      )}

      <View style={[styles.stack, menuOpen && { opacity: MENU_DIM }]}>
        {/* ONE LIFTED CARD, the rows straight inside it — the night pass reads
            the block as the next sibling of the rows' own parent. */}
        <Card>
          {rows.map((row, i) => (
            <SessionRow
              key={row.player.playerId}
              rank={i + 1}
              row={row}
              view={view}
              last={i === rows.length - 1}
              {...(onOpenPlayer === undefined
                ? {}
                : { onPress: () => onOpenPlayer(row.player.playerId) })}
            />
          ))}
        </Card>

        {onTable ? (
          <ChipsBlock balance={balance} offTable={result.totalOffTable} />
        ) : (
          <DeductionsBlock outcomes={outcomes} total={result.totalOffTable} />
        )}

        {/*
         * THE STEP, LAST. A CLOSED NIGHT DOES NOT OPEN IT — every figure above
         * was derived at the step it closed with, and a row that looked like a
         * door would offer to re-round a record of what people have been paid.
         *
         * FINAL ONLY. On table is `out − in`, which the step does not reach.
         */}
        {!onTable && result.rounding.on && (
          <RoundingBar mode={roundingMode} style={styles.rounding} />
        )}
      </View>
    </View>
  );
}

/*
 * WHAT WAS HERE, AND WHERE IT WENT — `itemise`, `SectionLabel` and
 * `ClosingRow`, all three replaced by the 9 September cut rather than deleted
 * for tidiness. The deduction slabs became one line per rule in
 * `DeductionsBlock`, the section labels became that block's own head, and the
 * closing rows became the `CHIPS` block on the On table view.
 */

/**
 * A night that did not add up, on the record.
 *
 * The gap and who signed it off. It is a block rather than a pill because it is
 * the one thing on this screen that has to be read before the figures under it
 * are believed — every net below was derived with this difference inside it.
 *
 * DRAWN AS E5'S ALARM IS ON THE FULL BOARD (`settle-up-off`, approved): a
 * padded card with the red label over the sentence. The look has no danger
 * wash; the red word is the alarm.
 */
function Difference({ difference, loggedBy }: { difference: Money; loggedBy: string | null }) {
  const t = useTheme();
  return (
    <Card pad style={styles.gap}>
      {/* NO GLYPH. E5 draws the same alarm as a tracked label over a sentence
          and nothing else, and this block is that block one step quieter. */}
      <Text style={[T.lookLabel, styles.gapLabel, { color: t.red }]} numberOfLines={1} {...cappedFigure}>
        {formatToFit(Math.abs(difference) as Money, ROW_FITS)}
        {difference > 0 ? ' over' : ' short'}
      </Text>
      <Text style={[styles.gapBody, { color: t.text }]}>
        The count did not match the money in, and every figure below was worked
        out with the difference in it
        {loggedBy === null ? '.' : `. Logged by ${loggedBy}.`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  /* The list and the two blocks are `SessionViews.tsx`'s. What is left here is
     the column they stand in, the alarm above them and the step below. */
  column: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },
  stack: { gap: z(12) },
  /* The step is another helper's component and carries its own side margin;
     inside this column it takes the column's edge instead, and the stack's gap. */
  rounding: { marginHorizontal: 0 },

  /* The kit's padded card, the label 7 over the sentence (`settle-up-off`). */
  gap: { gap: z(7) },
  gapLabel: { textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
  /* The kit's 13/1.45. */
  gapBody: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
});

/* Every figure under seven digits prints in full; past that it goes compact
   rather than clipped. */
const ROW_FITS = 1_000_000;
