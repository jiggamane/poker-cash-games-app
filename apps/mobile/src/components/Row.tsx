import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, type Money } from '@poker-club/core';
import { moneyColor, useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';
import { Icon } from './Icon';

/**
 * A hairline row. Never a card inside a card — rows are separated by a line.
 *
 * There is no single row. The boards draw three, and they differ in every
 * measurement, which is exactly the sort of thing that makes a hand-built
 * screen look almost right:
 *
 *   totals    9 / 4   gap 12   name 600 17  detail 400 13    figure 700 19
 *   feed     13 / 0   gap 14   name 600 16  detail 400 12.5  figure 700 18
 *   transfer 15 / 4   gap 12   name 600 17  → arrow →        figure 700 19
 *
 * Money leaving the table does not get a colour and a hairline. It gets a
 * rounded washed block that breaks out of the list by 12 on each side, with
 * the hairline suppressed — that is what marks it as a different KIND of money.
 */
export type RowKind = 'totals' | 'feed' | 'transfer';

export function Row({
  kind = 'totals',
  time,
  label,
  to,
  detail,
  amount,
  tone = 'plain',
  chevron = false,
  last = false,
}: {
  kind?: RowKind;
  /** Feed rows only; the totals view has no times at all. */
  time?: string;
  label: string;
  /** Transfer rows only — the payee, on the other side of the arrow. */
  to?: string;
  detail?: string;
  amount?: Money;
  /** 'plain' prints the figure; 'result' colours it; 'offTable' washes the row. */
  tone?: 'plain' | 'result' | 'offTable';
  /** A row that opens something says so with a hair of a chevron. */
  chevron?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  const off = tone === 'offTable';

  const figureColor = off
    ? t.offTable
    : tone === 'result' && amount !== undefined
      ? moneyColor(t, amount)
      : t.text;

  const inset = kind === 'feed' ? 0 : space.rowInset;
  const padV =
    kind === 'feed' ? space.feedRow : kind === 'transfer' ? space.transferRow : space.totalsRow;

  return (
    <View
      style={[
        styles.row,
        { paddingVertical: padV, paddingHorizontal: inset, gap: kind === 'feed' ? 14 : 12 },
        off
          ? {
              // Breaks out of the list by 12 and pays it back as padding, so the
              // text stays on the same left edge as every other row.
              backgroundColor: t.offTableWash,
              marginHorizontal: -12,
              paddingHorizontal: inset + 12,
              marginVertical: kind === 'feed' ? 5 : 6,
              borderRadius: radius.pressable,
            }
          : {
              borderBottomColor: t.hairline,
              borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
            },
      ]}
    >
      {time !== undefined && (
        <Text style={[styles.time, { color: off ? t.offTable : t.muted }]}>{time}</Text>
      )}

      {kind === 'transfer' ? (
        <>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {label}
          </Text>
          <Icon name="arrow" color={t.muted} />
          <Text style={[styles.name, { color: figureColor }]} numberOfLines={1}>
            {to}
          </Text>
        </>
      ) : (
        <View style={[styles.middle, { gap: kind === 'feed' ? 2 : 3 }]}>
          <Text
            style={[kind === 'feed' ? styles.feedName : styles.name, { color: t.text }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {detail !== undefined && (
            <Text
              style={[kind === 'feed' ? styles.feedDetail : styles.detail, { color: t.muted }]}
              numberOfLines={1}
            >
              {detail}
            </Text>
          )}
        </View>
      )}

      {amount !== undefined && (
        <Text
          style={[
            kind === 'feed' ? styles.feedFigure : styles.figure,
            { color: figureColor, marginLeft: 'auto' },
          ]}
        >
          {tone === 'result' ? formatSigned(amount) : formatMoney(amount)}
        </Text>
      )}

      {chevron && <Icon name="chevron" color={t.muted} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { ...type.time, width: 42, flexGrow: 0, flexShrink: 0 },
  middle: { flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  figure: type.figure,
  feedName: type.feedName,
  feedDetail: type.detail,
  feedFigure: type.feedFigure,
});
