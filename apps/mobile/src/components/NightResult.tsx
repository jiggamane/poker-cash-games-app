import { StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSignedToFit,
  formatToFit,
  prizePool,
  type Money,
  type ResolvedLedger,
  type SettlementResult,
} from '@poker-club/core';
import { Icon } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { block, cappedFigure, space, type } from '../design/tokens';

/**
 * A night that has ended — E6. `design/handoff-E6/`, cut 30 August.
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
 *   · NO ROW IS EMPHASISED. No tinted fill, no "You," prefix, no personal card.
 *     A confirmed night is a record of what happened to seven people, and the
 *     reader's own row is one of the seven. The green and the red are on the
 *     figures alone — which is also the only place they carry any information,
 *     a washed row saying nothing the sign beside it had not already said.
 *   · THE IN-VERSUS-OUT COMPARISON BELONGS TO E2, the counting screen, where
 *     the figures are still being entered and the comparison is still a
 *     question. Here it is settled, and re-asking it reads as doubt.
 *
 * NOTHING HERE ADDS ANYTHING UP. The pool comes off `prizePool()`, the
 * deductions off `settle()`, and the difference off the reconciliation. See
 * `CLAUDE.md`.
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
  const pool = prizePool(ledger);

  /*
   * Somebody who never sat down and was neither charged nor credited has
   * nothing to say on a results list — the engine counts them because they
   * could have collected something, and tonight they did not.
   *
   * E6 says "one row per player who bought in", and this is wider than that on
   * purpose: `Unaccounted` bought in nothing and holds the confirmed shortfall.
   * It is the one row that must never be filtered out, because it IS the hole.
   */
  const table = [...result.players]
    .filter((p) => p.boughtIn > 0 || p.endedWith > 0 || p.charged > 0 || p.credited > 0)
    .sort((a, b) => b.finalPosition - a.finalPosition);

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
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The table · after deductions</Text>
        {table.map((p, i) => (
          <View
            key={p.playerId}
            style={[
              styles.row,
              {
                borderBottomColor: t.hairline,
                /* The last row closes on the deductions block's own rule. Two
                   hairlines 10 points apart read as a box, and doc 15 does not
                   put a box inside a box. */
                borderBottomWidth: i === table.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: t.text }]}>{p.name}</Text>
              <Text style={[styles.rowDetail, { color: t.muted }]}>
                in {formatToFit(p.boughtIn, ROW_FITS)} · out {formatToFit(p.endedWith, ROW_FITS)}
              </Text>
            </View>
            {/*
             * Muted at exactly zero, which `moneyColor` is not: it falls back
             * to the text colour, and on this screen a black figure in a column
             * of green and red reads as a third state rather than as no state.
             * E6 names the colour for $0 and it is the muted one.
             */}
            <Text
              style={[
                styles.rowNet,
                { color: p.finalPosition === 0 ? t.muted : moneyColor(t, p.finalPosition) },
              ]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(p.finalPosition, ROW_FITS)}
            </Text>
          </View>
        ))}
      </View>

      {deductions.length > 0 && (
        <View style={[styles.deductions, { borderColor: t.hairline }]}>
          <View style={styles.deductionsHead}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>Deductions</Text>
            <Text style={[styles.qualifier, { color: t.muted }]}>collected on the side</Text>
          </View>

          {/* TOTALS ONLY. No per-player breakdown and no payer name: who paid
              what is the working, and the working is not on this screen. */}
          {deductions.map((d) => (
            <View key={d.ruleId} style={styles.deductionRow}>
              <Text style={[styles.deductionLabel, { color: t.text }]} numberOfLines={1}>
                {d.name}
              </Text>
              <Text
                style={[styles.deductionValue, { color: t.text }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatToFit(d.total, ROW_FITS)}
              </Text>
            </View>
          ))}

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

  table: { marginHorizontal: space.card, gap: 4 },
  sectionLabel: { ...type.label, paddingHorizontal: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 2 },
  rowText: { gap: 1, flexShrink: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowDetail: { fontSize: 11.5, fontWeight: '400', fontVariant: ['tabular-nums'] },
  /*
   * NEVER SHRINKS. The name and its in-and-out line beside it may wrap — they
   * are words and a fragment — and a figure may not: left to give, "−$12,000"
   * came apart into a dash on one line and an amount on the next, which reads
   * as two things. See B18.
   */
  rowNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 18,
    fontWeight: '800',
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
  deductionLabel: { fontSize: 14, fontWeight: '400', flexShrink: 1 },
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
 * A PLAYER ROW holds 316 points between the card margins: the name and its
 * "in … · out …" line at 11.5/400 on the left, the net at 18/800 on the right,
 * 10 between them. Six figures — "in $999,999 · out $999,999" at 159 and
 * "−$999,999" at 93 — leave 54 spare. Seven fit with 10 to spare and nothing
 * to say for themselves, so a million is where this row stops printing in full.
 *
 * IT IS A WIDER ROW THAN E5'S, which stops at ten thousand: there is no avatar
 * and no chevron here, and the sub-line runs 11.5 rather than 13. The two
 * screens abbreviate at different points because they are different widths —
 * what would read as "a figure that changed" is a column that visibly is not
 * the same column.
 *
 * THE POOL FIGURE has the pill beside it and 27/800 to spend: about 209 points
 * once the pill and its gap are out, which is thirteen glyphs. "$9,999,999" is
 * ten. THE PILL itself may never take a second line, so its own figure is the
 * one thing on this screen that abbreviates early.
 */
const ROW_FITS = 1_000_000;
const POOL_FITS = 10_000_000;
const PILL_FITS = 100_000;
