import { StyleSheet, Text, View } from 'react-native';
import { formatSigned, type Money } from '@poker-club/core';
import { useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';
import { largestResult, niceScale, plotBar } from '../lib/nightsChart';

/**
 * Result per night — a column for each night, above or below a zero line.
 *
 * The one chart in the app, and the only place a figure is drawn as a size
 * rather than written down. Two things make the size mean something:
 *
 *   THE LINE IS ZERO, drawn all the way across. A night you won stands on it, a
 *   night you lost hangs from it. You can find the losing nights without
 *   reading a single figure, and without relying on the colour.
 *
 *   ONE SCALE, BOTH WAYS. Every bar is drawn against the same pixels-per-dollar,
 *   taken from the biggest night in the set, and it is the same above and below.
 *   So bars can be compared with each other in both directions, and the plot
 *   keeps its bottom half even in a month with no losing night — squashing it
 *   would silently double the scale of the wins, and a month of losses drawn
 *   identically to a month of wins is exactly the lie this chart prevents.
 *
 * NO FIGURES ON THE CHART. It answers "how have the last few nights gone",
 * which is a shape, and every actual amount is written down in the list
 * underneath. Money on the axis as well only crowds the shape it is describing.
 *
 * The geometry is in lib/nightsChart.ts and is tested; nothing here does
 * arithmetic beyond laying the results out.
 */

/** Drawable height on ONE side of the line. Both halves are always this tall. */
const HALF = 44;
/** The zero line itself, which is a real line and not a hairline. */
const LINE = 1;
const PLOT = HALF * 2 + LINE;
/** Wide enough to be a bar, narrow enough that eight fit across a phone. */
const BAR = 15;
const GAP = 4;

export interface ChartNight {
  /** Stable across renders — the night's own id, not its position. */
  id: string;
  /** Under the column: "12 Jul". */
  label: string;
  /** The result, after the bill and the kitty. Negative is a losing night. */
  net: Money;
}

export function NightsChart({
  nights,
  caption,
}: {
  /** Oldest first, so the chart reads left to right like a calendar. */
  nights: readonly ChartNight[];
  /** Above the plot, right-aligned — "result per night". */
  caption?: string;
}) {
  const t = useTheme();

  const scale = niceScale(largestResult(nights.map((n) => n.net)));

  return (
    <View style={[styles.card, { borderColor: t.hairline }]}>
      <View style={styles.head}>
        <Text style={[styles.headLabel, { color: t.muted }]}>
          {nights.length === 1 ? 'Last night' : `Last ${nights.length} nights`}
        </Text>
        {caption !== undefined && (
          <Text style={[styles.headCaption, { color: t.muted }]}>{caption}</Text>
        )}
      </View>

      <View style={styles.plot}>
        {/* Drawn first, so the bars sit on top of the line rather than under
            it — a bar that stops one pixel short reads as floating. */}
        <View style={[styles.zeroLine, { backgroundColor: t.hairline }]} />

        <View style={styles.columns}>
          {nights.map((night) => {
            const bar = plotBar(night.net, scale, HALF);
            // A full 3px radius on a 3px bar is a lozenge, and a lozenge reads
            // as a dot rather than as a short bar. Small nights keep their
            // corners so they still read as a measured height.
            const corner = Math.min(3, Math.floor(bar.height / 3));
            return (
              <View
                key={night.id}
                accessible
                accessibilityLabel={`${night.label}, ${formatSigned(night.net)}`}
                style={styles.column}
              >
                <View style={styles.above}>
                  {bar.side === 'above' && (
                    <View
                      style={[
                        styles.bar,
                        {
                          height: bar.height,
                          backgroundColor: t.win,
                          borderTopLeftRadius: corner,
                          borderTopRightRadius: corner,
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.gap} />
                <View style={styles.below}>
                  {bar.side === 'below' && (
                    <View
                      style={[
                        styles.bar,
                        {
                          height: bar.height,
                          backgroundColor: t.loss,
                          borderBottomLeftRadius: corner,
                          borderBottomRightRadius: corner,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.dates}>
        {nights.map((night) => (
          <Text key={night.id} numberOfLines={1} style={[styles.date, { color: t.muted }]}>
            {night.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginBottom: 12,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },

  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4, paddingBottom: 10 },
  headLabel: type.sectionLabel,
  headCaption: { ...type.footnote, marginLeft: 'auto' },

  plot: { height: PLOT, paddingHorizontal: 2 },
  zeroLine: { position: 'absolute', left: 0, right: 0, top: HALF, height: LINE },

  columns: { flexDirection: 'row', alignItems: 'stretch', gap: GAP, height: PLOT },
  column: { flex: 1 },
  above: { height: HALF, justifyContent: 'flex-end', alignItems: 'center' },
  gap: { height: LINE },
  below: { height: HALF, justifyContent: 'flex-start', alignItems: 'center' },

  // Rounded at the end away from the line only — the corner radius is set on
  // the bar itself. The line is where the money is measured from, and a rounded
  // foot would lift the bar off it.
  bar: { width: BAR },

  dates: { flexDirection: 'row', gap: GAP, paddingTop: 5, paddingHorizontal: 2 },
  date: { flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: '500' },
});
