import { StyleSheet, Text, View } from 'react-native';
import type { Money } from '@poker-club/core';
import { useTheme } from '../design/useTheme';

/**
 * Result per night — D4. A read-only figure, not a control.
 *
 * Bars grow up from a hairline axis for a win and down for a loss, which is
 * the only thing this chart says: how often the nights went which way. There
 * are no gridlines and no value labels, because a figure you have to read off
 * a bar is a figure that belongs in the list underneath.
 */
export function Chart({ nights }: { nights: ReadonlyArray<{ label: string; result: Money }> }) {
  const t = useTheme();
  const peak = Math.max(1, ...nights.map((n) => Math.abs(n.result)));

  return (
    <View style={[styles.card, { borderColor: t.hairline }]}>
      <View style={styles.plot}>
        {nights.map((n, i) => {
          const height = Math.max(3, Math.round((Math.abs(n.result) / peak) * 36));
          const up = n.result >= 0;
          return (
            <View key={`${n.label}-${i}`} style={styles.column}>
              <View style={styles.zone}>
                {up && (
                  <View
                    style={[styles.bar, styles.up, { height, backgroundColor: t.win }]}
                  />
                )}
              </View>
              <View style={[styles.axis, { backgroundColor: t.hairline }]} />
              <View style={styles.zone}>
                {!up && (
                  <View
                    style={[styles.bar, styles.down, { height, backgroundColor: t.loss }]}
                  />
                )}
              </View>
              <Text style={[styles.label, { color: t.muted }]} numberOfLines={1}>
                {n.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  plot: { flexDirection: 'row', gap: 4 },
  column: { flex: 1, alignItems: 'center' },
  // 38 above the axis and 38 below it, so a win and a loss of the same size
  // are drawn the same length in opposite directions.
  zone: { height: 38, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 15 },
  up: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  down: { borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginBottom: 'auto' },
  axis: { height: 1, width: '100%' },
  label: { fontSize: 9.5, fontWeight: '500', marginTop: 6 },
});
