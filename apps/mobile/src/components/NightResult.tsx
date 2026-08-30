import { StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSigned,
  formatSignedToFit,
  workingRows,
  type Money,
  type MoneyRule,
  type PlayerId,
  type SettlementResult,
} from '@poker-club/core';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../design/tokens';

/**
 * A night that has ended — X1c. Rev 15, `14-invite-and-watcher.md`.
 *
 * ONE LAYOUT FOR TWO READERS, which is what the spec means by "N1/N2 with
 * `canWrite: false` — same data, different projection". The host opening a
 * night they kept and a player opening one they were in are looking at the same
 * facts and want the same three blocks in the same order:
 *
 *   1. YOUR OWN CARD — the net, then the working that produced it.
 *   2. THE SETTLEMENT — what you are owed, and who does the marking.
 *   3. THE TABLE — everyone's net, ranked and tinted.
 *
 * What differs between them is not the layout, it is one sentence and what
 * comes after block 3: a watcher gets the read-only band, a host gets the
 * payments to make. Both are the caller's, which is why this component stops at
 * the table rather than pretending to know.
 *
 * NOTHING HERE ADDS ANYTHING UP. Every figure is read off `settle()`, and every
 * row of the working comes from `workingRows()` in core, labels included — so
 * the bill row names the split the night was actually settled under. A watcher
 * cannot ask the host what the split was at 00:52, and neither can a host three
 * weeks later.
 */
export function NightResult({
  result,
  rules,
  me,
  hostName,
  readOnly,
}: {
  result: SettlementResult;
  /** The night's own snapshot, which is where the rule labels come from. */
  rules: readonly MoneyRule[];
  /** Whose night this is, when the app knows. Null hides the first two blocks. */
  me: PlayerId | null;
  /** Names whoever marks payments. Null when the host never sat down. */
  hostName: string | null;
  /** True for a watcher: they never mark a payment paid. */
  readOnly: boolean;
}) {
  const t = useTheme();

  const mine = me === null ? undefined : result.players.find((p) => p.playerId === me);
  const rows = me === null ? [] : workingRows(result, rules, me);

  /*
   * Somebody who never sat down and was neither charged nor credited has
   * nothing to say on a results list — the engine counts them because they
   * could have collected something, and tonight they did not.
   */
  const table = [...result.players]
    .filter((p) => p.boughtIn > 0 || p.endedWith > 0 || p.charged > 0 || p.credited > 0)
    .sort((a, b) => b.finalPosition - a.finalPosition);

  return (
    <>
      {mine !== undefined && rows.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.seatName, { color: t.text }]}>You, {mine.name}</Text>
            <Text
              style={[styles.netBig, { color: moneyColor(t, mine.finalPosition) }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(mine.finalPosition, RESULT_FITS)}
            </Text>
          </View>

          <View>
            {rows.map((row) => (
              <View key={row.key} style={[styles.workRow, { borderBottomColor: t.hairline }]}>
                <Text style={[styles.workLabel, { color: t.muted }]}>{row.label}</Text>
                <Text
                  style={[
                    styles.workValue,
                    {
                      /* Bone for money that left the table, the money colours
                         for the result, plain text for the rest. */
                      color: row.offTable
                        ? t.offTable
                        : row.kind === 'result'
                          ? moneyColor(t, row.amount)
                          : t.text,
                    },
                  ]}
                  numberOfLines={1}
                  {...cappedFigure}
                >
                  {row.signed ? formatSigned(row.amount) : formatMoney(row.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {mine !== undefined && (
        <Settlement net={mine.finalPosition} hostName={hostName} readOnly={readOnly} />
      )}

      <View style={styles.table}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The table · after deductions</Text>
        {table.map((p) => {
          const isMe = p.playerId === me;
          return (
            <View
              key={p.playerId}
              style={[
                styles.resultRow,
                { backgroundColor: p.finalPosition >= 0 ? t.winWash : t.lossWash },
              ]}
            >
              {/* Others' figures are shown because the book is shared. Nobody
                  else's calculation is — only your own card carries a working. */}
              <Text style={[isMe ? styles.resultNameMine : styles.resultName, { color: t.text }]}>
                {isMe ? 'You' : p.name}
              </Text>
              <Text style={[styles.resultNet, { color: moneyColor(t, p.finalPosition) }]}>
                {formatSigned(p.finalPosition)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

/**
 * What you are owed, then who does the marking.
 *
 * Tinted with the win wash whichever way the net went: it is the settlement's
 * own block and not a figure, and the figure inside it carries the colour. A
 * block that turned red would be a second, louder statement of something the
 * number beside it already says.
 */
function Settlement({
  net,
  hostName,
  readOnly,
}: {
  net: Money;
  hostName: string | null;
  readOnly: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.settlement, { backgroundColor: t.winWash }]}>
      <Text style={[styles.settlementEyebrow, { color: t.muted }]}>SETTLEMENT</Text>
      <Text style={[styles.settlementLine, { color: t.text }]}>
        {net > 0
          ? `You are owed ${formatMoney(net)}`
          : net < 0
            ? `You owe ${formatMoney(Math.abs(net) as Money)}`
            : 'You are square'}
      </Text>
      {/*
       * A WATCHER NEVER MARKS A PAYMENT PAID — no control, only the sentence.
       * The host is the one doing the marking, so telling them who does it
       * would be telling them about themselves; they get the payments instead,
       * which the caller adds under this block.
       */}
      {readOnly && hostName !== null && (
        <Text style={[styles.settlementSub, { color: t.muted }]}>
          {hostName} marks payments as they land.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginTop: 18,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatName: { fontSize: 19, fontWeight: '700', flexShrink: 1 },
  /*
   * NEVER SHRINKS, for the same reason `workValue` does not: the name beside it
   * is a name and may give way, the figure may not. Left to shrink it clipped
   * "+$227,051,831" to "+$227,051,8…", which is a different amount.
   */
  netBig: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.84,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },

  workRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  workLabel: { fontSize: 13.5, fontWeight: '400', flexShrink: 1 },
  /*
   * NEVER SHRINKS. The label beside it does — it is a sentence and may take two
   * lines — and when both were allowed to give, "−$150" came apart into "−" on
   * one line and "$150" on the next, which reads as a dash and an amount rather
   * than a deduction. A figure and its sign are one thing. See B18.
   */
  workValue: {
    marginLeft: 'auto',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },

  settlement: {
    marginHorizontal: space.card,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    gap: 4,
  },
  settlementEyebrow: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
  settlementLine: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  settlementSub: { fontSize: 12.5, fontWeight: '400', lineHeight: 18 },

  table: { marginHorizontal: space.page, marginTop: 18 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    marginBottom: 3,
    borderRadius: radius.pressable,
  },
  resultName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  resultNameMine: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  resultNet: { marginLeft: 'auto', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

/*
 * WHAT THE RESULT LINE ON THE SETTLED SHEET HOLDS EXACTLY.
 *
 * 28/800 beside the reader's own name, inside a card 20 in from each edge with
 * 18 of padding: 284 points at 360, and the name has to live in it too. Six
 * digits — "+$999,999" at 140 — leaves the name 130 and still fits at the cap;
 * eight did not, and the figure was the thing that gave.
 *
 * The exact figure is directly underneath, in the working: In, Out, Result, and
 * every deduction that came off it.
 */
const RESULT_FITS = 1_000_000;
