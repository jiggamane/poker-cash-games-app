import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  destinationWord,
  formatMoney,
  formatSignedToFit,
  formatToFit,
  playerDeductions,
  prizePool,
  UNACCOUNTED_ID,
  type Money,
  type PlayerId,
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
  onOpenPlayer,
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
   * Open one person's night. Left out, the rows are text and nothing else.
   *
   * IT IS A PROP RATHER THAN A ROUTE because the two callers hold different
   * nights: `settled.tsx` is reading the one on this phone, which the player
   * card can also read, and `watch.tsx` is reading somebody else's over the
   * wire, which it cannot. A component that pushed `/player` itself would put
   * a door on the watcher's screen that opens onto the wrong night.
   */
  onOpenPlayer?: (playerId: PlayerId) => void;
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
        {table.map((p, i) => {
          const line = [
            /* The last row closes on the deductions block's own rule. Two
               hairlines 10 points apart read as a box, and doc 15 does not
               put a box inside a box. */
            styles.row,
            {
              borderBottomColor: t.hairline,
              borderBottomWidth: i === table.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ];

          /*
           * THE HOLE IS NOT A PERSON, so its row is not a door. `Unaccounted`
           * holds the confirmed shortfall and has no card behind it — the
           * player screen would open on "Nobody by that name tonight", which
           * is the app telling the truth about a row it should not have
           * offered. What that money is is on the pill above.
           */
          const opens = onOpenPlayer !== undefined && p.playerId !== UNACCOUNTED_ID;

          const body = (
            <>
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: t.text }]}>{p.name}</Text>
                <Text style={[styles.rowDetail, { color: t.muted }]}>{workingLine(result, p)}</Text>
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
              {opens && <Icon name="chevron" color={t.muted} />}
            </>
          );

          return !opens ? (
            <View key={p.playerId} style={line}>
              {body}
            </View>
          ) : (
            <Pressable
              key={p.playerId}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} · their night`}
              onPress={() => onOpenPlayer?.(p.playerId)}
              style={({ pressed }) => [...line, { opacity: pressed ? 0.6 : 1 }]}
            >
              {body}
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
 * The second line under a name — `in $500 · out $620 · bill −$29 · piggy bank −$50`.
 *
 * DELIBERATE DEVIATION from `E6-results-logic.md`, which draws this line as
 * `in ${in} · out ${out}` and says the deductions block below carries "totals
 * only — no per-player breakdown". The totals block is untouched; what changed
 * is that a person's own row now says what came off THEM, because the row
 * without it cannot be checked: E6 prints a net that is already after
 * deductions, so a reader who does the only arithmetic the row invites —
 * out minus in — gets a figure that disagrees with the one printed beside it,
 * and has nothing on the screen to explain the gap. With the charges on the
 * line the row reconciles: out − in − charges + back = the net on the right.
 *
 * A term appears only when there is money in it, so a night with no rules is
 * the line E6 draws, unchanged, and a loser charged nothing keeps it too.
 *
 * `back` is what came back to them for that same kind — they fronted the bill,
 * or they hold what the rule takes — and it follows the charge it belongs to,
 * so "bill −$29 · back +$120" reads as one bill seen from both sides rather
 * than as two unrelated movements. That pairing is `working.ts`'s, and this is
 * the same decision at one line's width.
 *
 * NOTHING HERE ADDS ANYTHING UP: `playerDeductions` is the engine's, and the
 * words are `destinationWord`'s, so a group that renames its rules does not
 * rename this line — it is where the money went, not what the rule was called.
 */
function workingLine(result: SettlementResult, p: SettlementResult['players'][number]): string {
  /*
   * IN AND OUT GO WHEN THERE WAS NEITHER, which is one row and one row only:
   * the collector who holds the piggy bank and never sat down. "in $0 · out $0"
   * is two figures saying nothing about somebody whose whole appearance here is
   * the money they are holding for everyone else. Anybody who played has an in.
   */
  const parts =
    p.boughtIn === 0 && p.endedWith === 0
      ? []
      : [`in ${formatToFit(p.boughtIn, ROW_FITS)}`, `out ${formatToFit(p.endedWith, ROW_FITS)}`];

  for (const d of playerDeductions(result, p.playerId)) {
    if (d.charged > 0) {
      parts.push(
        `${destinationWord(d.destination)} ${formatSignedToFit((0 - d.charged) as Money, ROW_FITS)}`,
      );
    }
    /* A `back` per kind rather than one total, because adding the two would be
       this screen doing arithmetic — and one person owed by two rules is one
       person the app should not be rounding into a single figure. */
    if (d.credited > 0) parts.push(`back ${formatSignedToFit(d.credited, ROW_FITS)}`);
  }

  return parts.join(' · ');
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
 * working line at 11.5/400 on the left, the net at 18/800 on the right, 10
 * between them, and — where the row is a door — a chevron and its own gap,
 * about 22 more. Three figures on one line, "in $999,999 · out $999,999" at
 * 159 and "−$999,999" at 93, leave 32 spare. Seven digits fit and eight do
 * not, so a million is where this row stops printing in full.
 *
 * THE WORKING LINE IS ALLOWED TO WRAP, and past two or three terms it does.
 * That is the one thing on this row that may: it is words and fragments, the
 * name above it is a word, and the net beside them is a figure with
 * `flexShrink: 0` — B18 is what happens when a figure gives instead. A row
 * carrying a bill, a piggy bank and a reimbursement is three lines tall on a
 * 360-wide phone, and three legible lines beat one cut one.
 *
 * IT IS A WIDER ROW THAN E5'S, which stops at ten thousand: the sub-line runs
 * 11.5 rather than 13, and there is no avatar. The two screens abbreviate at
 * different points because they are different widths — what would read as "a
 * figure that changed" is a column that visibly is not the same column.
 *
 * THE CHEVRON IS ONLY THERE WHEN THE ROW OPENS SOMETHING. E6 draws no chevron,
 * and on `watch.tsx` — where there is no night on this phone to open — there
 * still is none. Where the row IS a door it carries the same mark every other
 * list in the app uses for one, because a door nothing points at is a door
 * nobody finds.
 *
 * THE POOL FIGURE has the pill beside it and 27/800 to spend: about 209 points
 * once the pill and its gap are out, which is thirteen glyphs. "$9,999,999" is
 * ten. THE PILL itself may never take a second line, so its own figure is the
 * one thing on this screen that abbreviates early.
 */
const ROW_FITS = 1_000_000;
const POOL_FITS = 10_000_000;
const PILL_FITS = 100_000;
