import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { Card, OutGroup } from '@poker-club/core';
import { useTheme } from '../design/useTheme';
import { FAN_OVERLAP, FAN_W, FanCard } from './PlayingCard';

/**
 * The outs of one hand, under its card on the odds screen — layout G, decided
 * 25 October (`design/handoff-odds-calculator`, boards `Turn-outs` and `Outs-G`).
 *
 * Two forms of the same groups, which come from `groupOuts()` in core and are
 * only laid out here:
 *
 *   closed   the names of the kinds of out, as quiet chips — Flush, Straight,
 *            One pair — and NO NUMBERS: not a count, not a total. What it says
 *            is what to expect; how many is for the reader who opens it.
 *   open     one row per kind, the strongest first: the name and "9 cards" on
 *            the left, the cards fanned on the right. Nine or fewer to a line,
 *            more on two, split evenly so a ten is two fives and not nine and
 *            a one.
 *
 * ⚠ NOT DRAWN, so mine: "card" and "cards" as the unit, and the rows' own
 * accessibility labels (`Flush, 8 cards`). The board draws the words "9 cards"
 * and "1 card" and nothing else about them.
 */
const PER_LINE = 9;
const KIND_W = 118;
const ROW_GAP = 10;
const FAN_PAD = 6;

/** How many fanned cards fit on a line of this width, at most nine. */
export function perLineIn(width: number): number {
  if (width <= 0) return PER_LINE;
  return Math.max(1, Math.min(PER_LINE, Math.floor((width - FAN_W) / (FAN_W - FAN_OVERLAP)) + 1));
}

/** Even lines: ten cards are 5 + 5, never 9 + 1. */
export function fanLines(cards: readonly Card[], perLine: number = PER_LINE): Card[][] {
  const lines = Math.ceil(cards.length / perLine);
  const size = Math.ceil(cards.length / lines);
  return Array.from({ length: lines }, (_, i) => cards.slice(i * size, (i + 1) * size));
}

const countText = (n: number): string => `${n} ${n === 1 ? 'card' : 'cards'}`;

export function OutsNames({ seat, groups }: { seat: number; groups: readonly OutGroup[] }) {
  const t = useTheme();
  return (
    <View nativeID={`outs-names-${seat}`} style={styles.names}>
      {groups.map((g) => (
        <View key={g.category} style={[styles.chip, { backgroundColor: t.roundFill }]}>
          <Text style={[styles.chipText, { color: t.muted }]}>{g.kind}</Text>
        </View>
      ))}
    </View>
  );
}

export function OutsTable({ seat, groups }: { seat: number; groups: readonly OutGroup[] }) {
  const t = useTheme();
  /* A phone narrow enough that nine cards do not fit on a line gets fewer to a line, not a cut-off fan. */
  const [width, setWidth] = useState(0);
  const perLine = perLineIn(width - KIND_W - ROW_GAP - FAN_PAD);
  return (
    <View
      nativeID={`outs-table-${seat}`}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.table, { borderTopColor: t.hairline }]}
    >
      {groups.map((g, i) => (
        <View
          key={g.category}
          nativeID={`outs-row-${seat}-${g.category.replace(/\s+/g, '-').toLowerCase()}`}
          accessibilityLabel={`${g.kind}, ${countText(g.cards.length)}`}
          style={[styles.row, i > 0 && { borderTopColor: t.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}
        >
          <View style={styles.kind}>
            <Text style={[styles.kindName, { color: t.text }]}>{g.kind}</Text>
            <Text style={[styles.kindCount, { color: t.muted }]}>{countText(g.cards.length)}</Text>
          </View>
          <View style={styles.fan}>
            {fanLines(g.cards, perLine).map((line, k) => (
              <View key={k} style={styles.line}>
                {line.map((c, j) => (
                  <FanCard key={c} card={c} first={j === 0} />
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 10 },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },

  table: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: ROW_GAP, paddingVertical: 8 },
  /* Wide enough for "Three of a kind" and "Straight flush" at the body size
     without wrapping, which is where the names were widest. */
  kind: { width: KIND_W, flexShrink: 0, gap: 1 },
  kindName: { fontSize: 14, fontWeight: '700' },
  kindCount: { fontSize: 12, fontWeight: '400' },
  fan: { flex: 1, minWidth: 0, gap: 4, paddingLeft: FAN_PAD },
  line: { flexDirection: 'row' },
});
