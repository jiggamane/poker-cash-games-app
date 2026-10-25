import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money, potOdds, formatHundredths, type SeatOdds } from '@poker-club/core';
import { Icon } from './Icon';
import { cappedFigure, radius, type } from '../design/tokens';
import { useTheme } from '../design/useTheme';
import { formatMoney, formatSigned } from '../lib/money';

/**
 * POT ODDS — under the players on the odds screen. Permanent since 25 October; it was an experiment behind a setting for a day.
 *
 * `design/handoff-odds-calculator`, "Pot odds, decided 24 October", boards
 * `Pot-closed` and `Pot-open`. One quiet row, only on the flop and the turn
 * while an exact result is on screen. Player 1 is
 * always "you". Two amounts are typed — the pot, and what the call costs — and
 * the card says three things about them and nothing else:
 *
 *   Needs     the share of the pot the call has to win to break even
 *   You have  Player 1's equity, from the result above
 *   returns   what the call comes to over many runs
 *
 * It never says what to do about them. There is no "call", "fold" or "should"
 * on this card; the app states the arithmetic and does not adjudicate. Side
 * pots need every stack and are left out, and the card says so in a line.
 *
 * ALL THE ARITHMETIC IS `potOdds()` IN `packages/core/src/odds`. This file lays
 * out what that returns and adds up nothing — which is the rule for every
 * screen, and the reason the figures here can be held to the function by
 * `ui-odds.mjs`.
 *
 * ⚠ DEPARTURES FROM THE BOARD, both for the same reason: THIS APP HAS NO CENTS.
 * `money.ts`: whole units, and `Money` refuses anything fractional. The board
 * draws `$75.00`, `$25.00` and `+$15.91`; the amounts here are `$75`, `$25` and
 * `+$16`, the last rounded half away from zero — the exact quotient is the
 * percentages' job. And amber, the board's colour for the break-even marker and
 * its label, is the app's "waiting" colour; it is kept because the owner chose
 * the board, and it is the one use of it on this screen.
 */
export type PotField = 'pot' | 'call';

export function PotOddsCard({
  seat,
  boards,
  pot,
  call,
  open,
  editing,
  onToggle,
  onEdit,
}: {
  /** Player 1's line of the odds result. */
  seat: SeatOdds;
  boards: number;
  /** Whole units, as typed. */
  pot: number;
  call: number;
  open: boolean;
  editing: PotField | null;
  onToggle: () => void;
  onEdit: (field: PotField) => void;
}) {
  const t = useTheme();
  const p = potOdds(pot, call, seat, boards);
  const hasCall = p.problem === null;
  const has = formatHundredths(p.hasHundredths);
  const needs = hasCall ? formatHundredths(p.needsHundredths) : '—';

  return (
    <View nativeID="pot-odds">
      <View style={styles.head}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Pot odds</Text>
      </View>

      {!open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pot odds, closed"
          onPress={onToggle}
          style={({ pressed }) => [styles.card, styles.closed, { backgroundColor: t.surface, opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.closedText}>
            <Text style={[styles.title, { color: t.text }]}>Pot odds</Text>
            <Text style={[styles.sub, { color: t.muted }]}>Type the pot and what you must call</Text>
          </View>
          <View style={styles.down}>
            <Icon name="chevron" color={t.muted} />
          </View>
        </Pressable>
      ) : (
        <View style={[styles.card, styles.openCard, { backgroundColor: t.surface }]}>
          {/* The same label that opened it closes it: the card's own title row. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pot odds, open"
            onPress={onToggle}
            style={({ pressed }) => [styles.openHead, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.title, { color: t.text }]}>Pot odds</Text>
            <View style={styles.up}>
              <Icon name="chevron" color={t.muted} />
            </View>
          </Pressable>

          <AmountRow
            label="Pot"
            amount={pot}
            active={editing === 'pot'}
            onPress={() => onEdit('pot')}
            last={false}
          />
          <AmountRow label="To call" amount={call} active={editing === 'call'} onPress={() => onEdit('call')} last />

          <View style={styles.pair}>
            <Figure label="Needs" value={needs} />
            <Figure label="You have" value={has} />
          </View>

          <View style={styles.barBlock}>
            <View style={[styles.track, { backgroundColor: t.hairline }]}>
              <View style={[styles.fill, { backgroundColor: t.text, width: `${p.hasHundredths / 100}%` }]} />
              {hasCall && (
                <View
                  nativeID="pot-odds-marker"
                  style={[styles.marker, { backgroundColor: t.amber, left: `${p.needsHundredths / 100}%` }]}
                />
              )}
            </View>
            <View style={styles.scale}>
              <Text style={[styles.scaleText, { color: t.muted }]}>0</Text>
              {hasCall && (
                <Text style={[styles.scaleText, styles.breakEven, { color: t.amber }]}>break-even {needs}</Text>
              )}
              <Text style={[styles.scaleText, { color: t.muted }]}>100</Text>
            </View>
          </View>

          {hasCall && (
            <View style={[styles.money, { borderTopColor: t.hairline }]}>
              <Text nativeID="pot-odds-returns" style={[styles.returns, { color: t.text }]}>
                Over many runs this call returns{' '}
                <Text style={{ fontWeight: '800', color: p.returns > 0 ? t.win : p.returns < 0 ? t.loss : t.text }}>
                  {formatSigned(money(p.returns))}
                </Text>
              </Text>
              <Text nativeID="pot-odds-formula" style={[styles.formula, { color: t.muted }]}>
                {has} × ({formatMoney(money(pot))} + {formatMoney(money(call))}) − {formatMoney(money(call))}. Side pots
                are not counted.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** A typed amount: the label, and the figure in a box that is outlined while the keypad is on it. */
function AmountRow({
  label,
  amount,
  active,
  onPress,
  last,
}: {
  label: string;
  amount: number;
  active: boolean;
  onPress: () => void;
  last: boolean;
}) {
  const t = useTheme();
  const shown = formatMoney(money(amount));
  return (
    <View style={[styles.amountRow, !last && { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.amountLabel, { color: t.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        onPress={onPress}
        hitSlop={8}
        style={[styles.amountBox, { borderColor: active ? t.text : 'transparent' }]}
      >
        <Text {...cappedFigure} style={[styles.amount, { color: amount === 0 && !active ? t.muted : t.text }]}>
          {shown}
        </Text>
      </Pressable>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  const pct = value.endsWith('%');
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureLabel, { color: t.muted }]}>{label}</Text>
      <Text {...cappedFigure} style={[styles.figureValue, { color: t.text }]}>
        {pct ? value.slice(0, -1) : value}
        {pct && <Text style={styles.figurePct}>%</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: 22, paddingBottom: 8, gap: 12 },
  sectionLabel: { ...type.sectionLabel, flexShrink: 1 },

  card: { marginHorizontal: 4, borderRadius: radius.card - 2 },
  closed: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  closedText: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 13, fontWeight: '400' },
  /* The one chevron the app has points right; this card opens down and closes up. */
  down: { transform: [{ rotate: '90deg' }] },
  up: { transform: [{ rotate: '-90deg' }] },

  openCard: { paddingHorizontal: 16, paddingBottom: 16 },
  openHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 },

  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  amountLabel: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  amountBox: { borderWidth: 2, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10, minWidth: 64, alignItems: 'flex-end' },
  amount: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },

  pair: { flexDirection: 'row', gap: 12, marginTop: 8 },
  figure: { flex: 1, minWidth: 0 },
  figureLabel: { fontSize: 13, fontWeight: '400' },
  figureValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  figurePct: { fontSize: 15, letterSpacing: 0 },

  barBlock: { marginTop: 12 },
  track: { height: 12, borderRadius: 6, overflow: 'visible' },
  fill: { height: 12, borderRadius: 6 },
  marker: { position: 'absolute', top: -4, width: 3, height: 20, borderRadius: 2, marginLeft: -1 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, gap: 8 },
  scaleText: { fontSize: 12, fontWeight: '400', fontVariant: ['tabular-nums'] },
  breakEven: { fontWeight: '600', flexShrink: 1, textAlign: 'center' },

  money: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  returns: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  formula: { fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] },
});
