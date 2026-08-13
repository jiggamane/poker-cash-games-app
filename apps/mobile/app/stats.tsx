import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, type Money } from '@poker-club/core';
import { Chart } from '../src/components/Chart';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { myNights, useNight, type MyNight } from '../src/lib/nightStore';

/** Month first, everywhere. Rev 10, S48. */
const PERIODS = ['Month', 'Year', 'All time'] as const;
type Period = (typeof PERIODS)[number];

/**
 * My stats — G4. Rev 10, S40: this layout is the confirmed one, and the old
 * All-groups/per-group segmented version is dead.
 *
 * Recency first: the period you are in, then how the last few nights went,
 * then the nights themselves. A running all-time total is one tab away and
 * nowhere else, because the number a player actually wants at 1am is what
 * this month has done to them.
 */
export default function MyStats() {
  const t = useTheme();
  const night = useNight();
  const [period, setPeriod] = useState<Period>('Month');

  const nights = myNights(night, period === 'Month' ? 31 : period === 'Year' ? 365 : null);
  const played = nights.filter((n) => n.played);
  const total = played.reduce((sum, n) => sum + n.result, 0) as Money;
  const average = played.length === 0 ? 0 : Math.round(total / played.length);
  const won = played.filter((n) => n.result > 0).length;
  const lost = played.filter((n) => n.result < 0).length;

  return (
    <Screen title="My stats" backTo="the club" meta={night?.groupName}>
      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>
            {period === 'All time' ? 'All time' : `This ${period.toLowerCase()}`}
          </Text>
          <View style={styles.tabs}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                accessibilityRole="tab"
                accessibilityState={{ selected: p === period }}
                onPress={() => setPeriod(p)}
                style={[
                  styles.tab,
                  p === period && { borderBottomWidth: 1.5, borderBottomColor: t.text },
                ]}
              >
                <Text style={[p === period ? styles.tabOn : styles.tabOff, { color: p === period ? t.text : t.muted }]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.figure, { color: moneyColor(t, total as Money) }]}>
          {formatSigned(total)}
        </Text>

        {/* The count, then the average — in that order, always. */}
        <Text style={[styles.meta, { color: t.muted }]}>
          played {played.length} {played.length === 1 ? 'game' : 'games'} / av.{' '}
          {formatSigned(average as Money)} per game
        </Text>

        <View style={[styles.pairs, { borderTopColor: t.hairline }]}>
          <View style={styles.pair}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>WON / LOST</Text>
            <Text style={styles.pairValue}>
              <Text style={{ color: t.win }}>{won} W</Text>
              <Text style={{ color: t.muted }}> · </Text>
              <Text style={{ color: t.loss }}>{lost} L</Text>
            </Text>
          </View>
          <View style={[styles.pair, styles.pairRight]}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>BEST NIGHT</Text>
            <Text style={[styles.pairValue, { color: t.text }]}>
              {played.length === 0
                ? '—'
                : formatSigned(Math.max(...played.map((n) => n.result)) as Money)}
            </Text>
          </View>
        </View>
      </View>

      {played.length > 0 && (
        <Chart nights={played.slice(-8).map((n) => ({ label: n.short, result: n.result }))} />
      )}

      <View style={styles.list}>
        <View style={styles.listHead}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Last games</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/games')}>
            <Text style={[styles.seeAll, { color: t.text }]}>See all</Text>
          </Pressable>
        </View>

        {nights.slice(-4).reverse().map((n) => (
          <NightRow key={n.sessionId} night={n} />
        ))}

        {nights.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            No nights yet. Your first one shows up here the moment it is settled.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/** A game in the list: club and times on top, the result on the right. */
function NightRow({ night }: { night: MyNight }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/settled')}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowDate, { color: t.text }]}>{night.date}</Text>
        {/* Club · session times. Buy-in and duration live on the night, not
            in the list. */}
        <Text style={[styles.rowMeta, { color: t.muted }]}>
          {night.played ? `${night.groupName} · ${night.times}` : `${night.groupName} · did not play`}
        </Text>
      </View>
      {night.played && (
        <Text style={[styles.rowResult, { color: moneyColor(t, night.result) }]}>
          {formatSigned(night.result)}
        </Text>
      )}
      <Icon name="chevron" color={t.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 12, marginLeft: 'auto' },
  tab: { paddingBottom: 3 },
  tabOff: { fontSize: 11.5, fontWeight: '500' },
  tabOn: { fontSize: 11.5, fontWeight: '700' },
  figure: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 13, fontWeight: '400' },
  pairs: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pair: { gap: 4 },
  pairRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  pairLabel: type.statPairLabel,
  pairValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },

  list: { marginTop: 22, marginHorizontal: space.page },
  listHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 6 },
  sectionLabel: type.sectionLabel,
  seeAll: { ...type.chip, marginLeft: 'auto', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { gap: 3, flexShrink: 1 },
  rowDate: type.rowName,
  rowMeta: type.rowDetail,
  rowResult: { ...type.figure, marginLeft: 'auto' },
  empty: { ...type.footnote, paddingHorizontal: 4, paddingTop: 8 },
});
