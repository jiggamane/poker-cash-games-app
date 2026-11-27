import type { ComponentRef, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { money, potOdds, formatHundredths, type SeatOdds } from '@poker-club/core';
import { Icon } from './Icon';
import { cappedFigure } from '../design/tokens';
import { L, z } from '../design/scale';
import { useTheme } from '../design/useTheme';
import { SectionLabel } from './Card';
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
 * the board, and it is the one use of it on this screen. The full board draws
 * the marker in the text colour and asks whether to; the app's odds colours
 * are the exception `tokens.ts` names, so the amber stays.
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
  activeRef,
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
  /** On the amount being typed, so the screen can keep it above the keypad. */
  activeRef?: Ref<ComponentRef<typeof View>>;
}) {
  const t = useTheme();
  const p = potOdds(pot, call, seat, boards);
  const hasCall = p.problem === null;
  const has = formatHundredths(p.hasHundredths);
  const needs = hasCall ? formatHundredths(p.needsHundredths) : '—';

  return (
    <View nativeID="pot-odds" style={styles.wrap}>
      <SectionLabel text="Pot odds" quiet />

      {!open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pot odds, closed"
          onPress={onToggle}
          style={({ pressed }) => [styles.card, styles.closed, { backgroundColor: t.surface, boxShadow: t.lift, opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.closedText}>
            <Text style={[styles.title, { color: t.text }]}>Pot odds</Text>
            <Text style={[styles.sub, { color: t.muted }]}>Type the pot and what you must call</Text>
          </View>
          <Icon name="chevronDown" color={t.muted} size={z(18)} />
        </Pressable>
      ) : (
        <View style={[styles.card, { backgroundColor: t.surface, boxShadow: t.lift }]}>
          {/* The same label that opened it closes it: the card's own title row. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pot odds, open"
            onPress={onToggle}
            style={({ pressed }) => [styles.openHead, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.title, { color: t.text }]}>Pot odds</Text>
            <Icon name="chevronUp" color={t.muted} size={z(18)} />
          </Pressable>

          <AmountRow
            label="Pot"
            amount={pot}
            active={editing === 'pot'}
            onPress={() => onEdit('pot')}
            last={false}
            boxRef={editing === 'pot' ? activeRef : undefined}
          />
          <AmountRow
            label="To call"
            amount={call}
            active={editing === 'call'}
            onPress={() => onEdit('call')}
            last
            boxRef={editing === 'call' ? activeRef : undefined}
          />

          <View style={styles.pair}>
            <Figure label="Needs" value={needs} />
            <Figure label="You have" value={has} />
          </View>

          <View style={styles.barBlock}>
            <View style={[styles.track, { backgroundColor: t.raised }]}>
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
                <Text style={[styles.returnsFigure, { color: p.returns > 0 ? t.win : p.returns < 0 ? t.loss : t.text }]}>
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

/**
 * A typed amount: the label, and the figure in a box that is outlined while the
 * keypad is on it. An untyped `$0` is in the text colour, as the full board
 * draws it (`odds-amount`); it was muted.
 */
function AmountRow({
  label,
  amount,
  active,
  onPress,
  last,
  boxRef,
}: {
  label: string;
  amount: number;
  active: boolean;
  onPress: () => void;
  last: boolean;
  boxRef?: Ref<ComponentRef<typeof View>> | undefined;
}) {
  const t = useTheme();
  const shown = formatMoney(money(amount));
  return (
    <View style={[styles.amountRow, !last && { borderBottomColor: t.hairline, borderBottomWidth: 1 }]}>
      <Text style={[styles.amountLabel, { color: t.text }]}>{label}</Text>
      <Pressable
        ref={boxRef}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        onPress={onPress}
        hitSlop={8}
        style={[styles.amountBox, { borderColor: active ? t.text : 'transparent' }]}
      >
        <Text {...cappedFigure} style={[styles.amount, { color: t.text }]}>
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

/*
 * THE FULL BOARD'S MEASURES (`odds-turn`, `odds-amount`, approved), each
 * through `z()`: a lifted card with 12 of padding under a quiet section label;
 * the title 700 15.5 in the title face; the two amounts on rows 34 tall, 700 15
 * against a 700 17 figure, the one being typed in a 2-point outline of the text
 * colour, 5 / 9 of padding, 9 round; Needs and You have at 26 with the per-cent
 * at 14; an 8-point track on the raised fill; the scale at 11; the return at
 * 13.5 under a hairline and the formula at 11.5.
 */
const styles = StyleSheet.create({
  wrap: { gap: z(12) },

  card: { borderRadius: L.cardRadius, padding: z(12) },
  closed: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  closedText: { flex: 1, minWidth: 0, gap: z(2) },
  title: { fontFamily: 'head', fontSize: z(15.5), lineHeight: z(18.6), fontWeight: '700' },
  sub: { fontSize: z(12.5), lineHeight: z(16), fontWeight: '400' },

  openHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: z(10), minHeight: z(34), marginTop: z(4) },
  amountLabel: { fontSize: z(15), fontWeight: '700', flexShrink: 1 },
  amountBox: { borderWidth: 2, borderRadius: z(9), paddingVertical: z(3), paddingHorizontal: z(7), minWidth: z(56), alignItems: 'flex-end' },
  amount: { fontFamily: 'head', fontSize: z(17), lineHeight: z(20), fontWeight: '700', fontVariant: ['tabular-nums'] },

  pair: { flexDirection: 'row', gap: z(8), marginTop: z(8) },
  figure: { flex: 1, minWidth: 0 },
  figureLabel: { fontSize: z(12), fontWeight: '400' },
  figureValue: { fontFamily: 'head', fontSize: z(26), lineHeight: z(30), fontWeight: '700', letterSpacing: -0.78 * (z(26) / 26), fontVariant: ['tabular-nums'] },
  figurePct: { fontSize: z(14), letterSpacing: 0 },

  barBlock: { marginTop: z(8) },
  track: { height: z(8), borderRadius: z(4), overflow: 'visible' },
  fill: { height: z(8), borderRadius: z(4) },
  marker: { position: 'absolute', top: z(-4), bottom: z(-4), width: 2, marginLeft: -1 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: z(6), gap: z(8) },
  scaleText: { fontSize: z(11), fontWeight: '400', fontVariant: ['tabular-nums'] },
  breakEven: { fontWeight: '700', flexShrink: 1, textAlign: 'center' },

  money: { marginTop: z(8), paddingTop: z(8), borderTopWidth: 1, gap: z(4) },
  returns: { fontSize: z(13.5), lineHeight: z(19), fontWeight: '500' },
  returnsFigure: { fontFamily: 'head', fontWeight: '700', fontVariant: ['tabular-nums'] },
  formula: { fontSize: z(11.5), lineHeight: z(16.5), fontVariant: ['tabular-nums'] },
});
