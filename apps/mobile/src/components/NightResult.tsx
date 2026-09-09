import { StyleSheet, Text, View } from 'react-native';
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
import { RoundingBar } from './RoundingBar';
import { ChipsBlock, DeductionsBlock, MENU_DIM, SessionRow } from './SessionViews';
import { useTheme } from '../design/useTheme';
import { cappedFigure, space } from '../design/tokens';
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
    <>
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

      <View style={menuOpen && { opacity: MENU_DIM }}>
        <View style={styles.list}>
          {rows.map((row, i) => (
            <SessionRow
              key={row.player.playerId}
              rank={i + 1}
              row={row}
              view={view}
              {...(onOpenPlayer === undefined
                ? {}
                : { onPress: () => onOpenPlayer(row.player.playerId) })}
            />
          ))}
        </View>

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
    </>
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
  /* The list and the two blocks are `SessionViews.tsx`'s. What is left here is
     the alarm above them and the step below. */
  list: { marginHorizontal: space.page },
  rounding: { marginTop: 10 },

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
    borderRadius: 8,
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
});

/* Every figure under seven digits prints in full; past that it goes compact
   rather than clipped. */
const ROW_FITS = 1_000_000;
