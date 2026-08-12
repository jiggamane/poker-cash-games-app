import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, type Money } from '@poker-club/core';
import { moneyColor, useTheme } from '../design/useTheme';
import { space, type } from '../design/tokens';

/**
 * A hairline row. Never a card inside a card — rows are separated by a line,
 * not by nesting boxes.
 */
export function Row({
  time,
  label,
  detail,
  amount,
  tone = 'plain',
  last = false,
}: {
  /** Shown on ledger rows; the totals view has no times at all. */
  time?: string;
  label: string;
  detail?: string;
  amount?: Money;
  /** 'plain' prints the figure; 'result' colours it; 'offTable' marks money leaving. */
  tone?: 'plain' | 'result' | 'offTable';
  last?: boolean;
}) {
  const t = useTheme();

  const figureColor =
    tone === 'result' && amount !== undefined
      ? moneyColor(t, amount)
      : tone === 'offTable'
        ? t.offTable
        : t.text;

  // A net row carries a faint wash of its own colour so a win or a loss reads
  // at arm's length. Only net rows — a transfer row is neutral, because the
  // money has already been coloured once where it was won or lost.
  const wash =
    tone === 'result' && amount !== undefined && amount !== 0
      ? amount > 0
        ? t.winWash
        : t.lossWash
      : undefined;

  return (
    <View
      style={[
        styles.row,
        wash !== undefined && { backgroundColor: wash, paddingHorizontal: 10, marginHorizontal: -10 },
        { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      {time !== undefined && <Text style={[styles.time, { color: t.muted }]}>{time}</Text>}

      <View style={styles.middle}>
        <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
          {label}
        </Text>
        {detail !== undefined && (
          <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>

      {amount !== undefined && (
        <Text style={[styles.figure, { color: figureColor }]}>
          {tone === 'result' ? formatSigned(amount) : formatMoney(amount)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.row, gap: 12 },
  time: { ...type.meta, width: 44 },
  middle: { flex: 1 },
  label: type.body,
  detail: { ...type.meta, marginTop: 2 },
  figure: type.figure,
});
