import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatSigned, formatSignedToFit } from '../src/lib/money';
import { Icon } from '../src/components/Icon';
import { NightsChart } from '../src/components/NightsChart';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { SAMPLE_HISTORY } from '../src/data/sampleHistory';
import {
  formatNightDate,
  formatSitting,
  inPeriod,
  mostRecentFirst,
  summarise,
  type Period,
  type PlayedNight,
} from '../src/lib/myStats';
import { myNights, useNight } from '../src/lib/nightStore';

/** Month first, everywhere. Rev 10, S48. */
const PERIODS: ReadonlyArray<{ label: string; value: Period }> = [
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All time', value: 'all' },
];

/**
 * My stats — G4. Rev 10, S40: this layout is the confirmed one, and the old
 * All-groups/per-group segmented version is dead.
 *
 * Recency first: the period you are in, then how the last few nights went,
 * then the nights themselves. A running all-time total is one tab away and
 * nowhere else, because the number a player actually wants at 1am is what
 * this month has done to them.
 *
 * Not one figure on this screen is added up here. Every one of them comes out
 * of `myStats`, which is tested — including the thing this screen used to get
 * wrong: a period is a CALENDAR month, not the last thirty-one days. On the
 * 2nd of the month "this month" is two days of poker, which is what a person
 * means and what makes the total agree with the one they would reach counting
 * their own nights on their fingers.
 */
export default function MyStats() {
  const t = useTheme();
  const night = useNight();
  const [period, setPeriod] = useState<Period>('month');

  // One clock for the whole screen. Two calls to new Date() could land either
  // side of midnight and put a night in the chart that is not in the total.
  const now = useMemo(() => new Date(), []);

  const history = useMemo<PlayedNight[]>(() => {
    const mine = myNights(night, null)
      .filter((n) => n.played)
      .map((n) => ({
        id: n.sessionId,
        startedAt: n.startedAt,
        group: n.groupName,
        net: n.result,
        minutes: n.minutes,
      }));
    // This phone's own settled night first, then the seeded ones behind it.
    // Both are the same shape by the time anything adds them up.
    return [...mine, ...SAMPLE_HISTORY];
  }, [night]);

  const nights = useMemo(
    () => mostRecentFirst(inPeriod(history, period, now)),
    [history, period, now],
  );
  const stats = useMemo(() => summarise(nights), [nights]);
  const best = useMemo(
    () => (nights.length === 0 ? null : Math.max(...nights.map((n) => n.net))),
    [nights],
  );

  // Oldest first for the chart, and never more than eight: past that the
  // columns are too narrow to compare and the dates stop fitting under them.
  const plotted = useMemo(() => [...nights].slice(0, 8).reverse(), [nights]);

  const periodLabel = PERIODS.find((p) => p.value === period)!.label;

  return (
    // The club name goes with the body. On a month with a dozen nights this
    // screen scrolls for a while, and the line naming the club is part of what
    // is being read rather than chrome that has to be held over it. The title
    // and the way back stay put — see `headScroll` in `Screen`.
    <Screen title="My stats" backTo="the club" meta={night?.groupName} headScroll="meta">
      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>
            {period === 'all' ? 'All time' : `This ${periodLabel.toLowerCase()}`}
          </Text>
          <View style={styles.tabs}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: p.value === period }}
                onPress={() => setPeriod(p.value)}
                style={[
                  styles.tab,
                  p.value === period && { borderBottomWidth: 1.5, borderBottomColor: t.text },
                ]}
              >
                <Text
                  style={[
                    p.value === period ? styles.tabOn : styles.tabOff,
                    { color: p.value === period ? t.text : t.muted },
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text
          style={[styles.figure, { color: moneyColor(t, stats.net as Money) }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {formatSignedToFit(stats.net as Money, HEAD_FITS)}
        </Text>

        {/* The count, then the average — in that order, always. */}
        <Text style={[styles.meta, { color: t.muted }]}>
          played {stats.games} {stats.games === 1 ? 'game' : 'games'} / av.{' '}
          {formatSigned(stats.average as Money)} per game
        </Text>

        <View style={[styles.pairs, { borderTopColor: t.hairline }]}>
          <View style={styles.pair}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>WON / LOST</Text>
            <Text style={styles.pairValue}>
              <Text style={{ color: t.win }}>{stats.won} W</Text>
              <Text style={{ color: t.muted }}> · </Text>
              <Text style={{ color: t.loss }}>{stats.lost} L</Text>
            </Text>
          </View>
          <View style={[styles.pair, styles.pairRight]}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>BEST NIGHT</Text>
            <Text style={[styles.pairValue, { color: t.text }]}>
              {best === null ? '—' : formatSigned(best as Money)}
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
        <View style={styles.listHead}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Last games</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/games')}
            style={styles.seeAllHit}
          >
            <Text style={[styles.seeAll, { color: t.text }]}>See all</Text>
          </Pressable>
        </View>

        {nights.slice(0, 4).map((n) => (
          <NightRow key={n.id} night={n} />
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

/** A game in the list: club and how long you sat, the result on the right. */
function NightRow({ night }: { night: PlayedNight }) {
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
        <Text style={[styles.rowDate, { color: t.text }]}>
          {formatNightDate(night.startedAt, true)}
        </Text>
        {/* Club · how long the sitting ran. Buy-in lives on the night, not in
            the list. */}
        <Text style={[styles.rowMeta, { color: t.muted }]}>
          {night.minutes === 0
            ? night.group
            : `${night.group} · ${formatSitting(night.minutes)}`}
        </Text>
      </View>
      <Text style={[styles.rowResult, { color: moneyColor(t, night.net) }]}>
        {formatSigned(night.net)}
      </Text>
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
  // The push has to carry the margin, not the text inside it: `auto` on the
  // Text only pushes it within a box that is already hard against the label.
  seeAllHit: { marginLeft: 'auto', paddingLeft: 12 },
  seeAll: { ...type.chip, fontWeight: '700' },
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

/*
 * WHERE THE HEADLINE RUNS OUT OF ROOM.
 *
 * 40/800 is the widest type in the app, inside a card 20 in from each edge with
 * 18 of padding — about 264 points on a 360 phone. That holds seven glyphs and
 * not the eight a table in the millions produces, and this total only ever goes
 * up: it is every night the reader has played, added together.
 *
 * The exact figure is never lost. Every night that makes it up is a row in the
 * list below with its own result printed in full.
 */
const HEAD_FITS = 100_000;
