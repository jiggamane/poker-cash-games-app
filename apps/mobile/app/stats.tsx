import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSigned, type Money } from '@poker-club/core';
import { NightsChart } from '../src/components/NightsChart';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, tabular, type } from '../src/design/tokens';
import { SAMPLE_GROUPS, SAMPLE_HISTORY } from '../src/data/sampleHistory';
import {
  formatHours,
  formatNightDate,
  formatSitting,
  inGroup,
  inPeriod,
  mostRecentFirst,
  periodLabel,
  summarise,
  type Period,
} from '../src/lib/myStats';

/**
 * My stats — G4. What every night I have played comes to.
 *
 * The only screen in the app that crosses group lines, and the only private
 * one: inside a group people see my net in THAT group and nothing else, so the
 * total across all of them exists on this screen and nowhere on the server's
 * group views.
 *
 * Three things, in order of how often they are wanted: what this month came to,
 * the shape of the last few nights, then the nights themselves. The chart is
 * the middle one on purpose — a figure answers "how am I doing", a chart
 * answers "how did I get here", and the second question is only ever asked
 * after the first.
 *
 * The nights come from a seed file until sessions are real; see sampleHistory.
 */
export default function MyStats() {
  const t = useTheme();
  const [group, setGroup] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  // One clock for the whole screen. Two calls to new Date() could land either
  // side of midnight and put a night in the chart that is not in the total.
  const now = useMemo(() => new Date(), []);

  const nights = useMemo(
    () => mostRecentFirst(inPeriod(inGroup(SAMPLE_HISTORY, group), period, now)),
    [group, period, now],
  );
  const stats = useMemo(() => summarise(nights), [nights]);

  // Oldest first for the chart, and never more than eight: past that the
  // columns are too narrow to compare and the dates stop fitting under them.
  const plotted = useMemo(() => [...nights].slice(0, 8).reverse(), [nights]);

  return (
    <Screen title="My stats" backTo="The group">
      <View style={styles.chips}>
        <Chip label="All groups" on={group === null} onPress={() => setGroup(null)} />
        {SAMPLE_GROUPS.map((name) => (
          <Chip key={name} label={name} on={group === name} onPress={() => setGroup(name)} />
        ))}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor:
              stats.net > 0 ? t.winWash : stats.net < 0 ? t.lossWash : t.surface,
          },
        ]}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>{periodLabel(period, now)}</Text>
          <View style={styles.tabs}>
            <Tab label="Month" on={period === 'month'} onPress={() => setPeriod('month')} />
            <Tab label="Year" on={period === 'year'} onPress={() => setPeriod('year')} />
            <Tab label="All time" on={period === 'all'} onPress={() => setPeriod('all')} />
          </View>
        </View>

        <View style={styles.heroRow}>
          <Text style={[styles.hero, { color: moneyColor(t, stats.net) }]}>
            {formatSigned(stats.net as Money)}
          </Text>
          <Text style={[styles.heroMeta, { color: t.muted }]}>
            {stats.games} {stats.games === 1 ? 'game' : 'games'} · {formatHours(stats.minutes)}
          </Text>
        </View>

        <View style={[styles.cardFoot, { borderTopColor: t.hairline }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: t.muted }]}>Won / lost</Text>
            <Text style={[styles.statValue, { color: t.text }]}>
              <Text style={{ color: t.win }}>{stats.won} W</Text>
              {' · '}
              <Text style={{ color: t.loss }}>{stats.lost} L</Text>
            </Text>
          </View>
          <View style={[styles.stat, styles.statRight]}>
            <Text style={[styles.statLabel, { color: t.muted }]}>Avg / night</Text>
            <Text style={[styles.statValue, { color: moneyColor(t, stats.average) }]}>
              {formatSigned(stats.average as Money)}
            </Text>
          </View>
        </View>
      </View>

      {plotted.length > 0 && (
        <NightsChart
          caption="result per night"
          nights={plotted.map((n) => ({
            id: n.id,
            label: formatNightDate(n.startedAt),
            net: n.net,
          }))}
        />
      )}

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {period === 'all' ? 'Every night' : 'The nights'}
        </Text>

        {nights.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            No settled night in this stretch. A night joins this page the moment it is
            settled — never before, because until then nobody has actually won anything.
          </Text>
        )}

        {nights.map((n) => (
          <View key={n.id} style={[styles.row, { borderTopColor: t.hairline }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: t.text }]}>
                {formatNightDate(n.startedAt, true)}
              </Text>
              <Text style={[styles.rowSub, { color: t.muted }]}>{n.group}</Text>
            </View>
            <View style={styles.rowFigures}>
              <Text style={[styles.rowFigure, { color: moneyColor(t, n.net) }]}>
                {formatSigned(n.net)}
              </Text>
              <Text style={[styles.rowSub, { color: t.muted }]}>{formatSitting(n.minutes)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        Only you see this page. Inside a group, the others see your net in that group and
        nothing else.
      </Text>
    </Screen>
  );
}

/** A group filter: filled when it is the one being shown. */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: on ? t.text : t.surface,
          borderColor: on ? t.text : t.hairline,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[on ? styles.chipLabelOn : styles.chipLabel, { color: on ? t.onFill : t.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Month / Year / All time — underlined rather than filled, inside the card. */
function Tab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.tab,
        { borderBottomColor: on ? t.text : 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[on ? styles.tabLabelOn : styles.tabLabel, { color: on ? t.text : t.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: StyleSheet.hairlineWidth },
  chipLabel: type.tab,
  chipLabelOn: type.tabOn,

  card: {
    marginHorizontal: space.card,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: radius.card,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLabel: { ...type.label, flexShrink: 1 },
  tabs: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  tab: { paddingBottom: 3, borderBottomWidth: 1.5 },
  tabLabel: { fontSize: 11.5, fontWeight: '500' },
  tabLabelOn: { fontSize: 11.5, fontWeight: '700' },

  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  hero: { fontSize: 34, fontWeight: '800', letterSpacing: -1.36, ...tabular },
  heroMeta: { fontSize: 12, fontWeight: '400', flexShrink: 1, ...tabular },

  cardFoot: { flexDirection: 'row', alignItems: 'flex-end', gap: space.statGap, marginTop: 4, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { gap: 4 },
  statRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: type.statValue,

  list: { marginTop: 8, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: space.rowInset, paddingBottom: 6 },
  empty: { ...type.footnote, paddingHorizontal: space.rowInset, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: space.rowInset, borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { gap: 2, flexShrink: 1 },
  rowName: { fontSize: 15.5, fontWeight: '600' },
  rowSub: { ...type.detail, lineHeight: 16 },
  rowFigures: { marginLeft: 'auto', alignItems: 'flex-end', gap: 2 },
  rowFigure: { fontSize: 16, fontWeight: '700', ...tabular },

  footnote: { ...type.footnote, marginTop: 16, marginHorizontal: space.page, paddingHorizontal: space.rowInset },
});
