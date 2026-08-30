import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSigned, formatSignedToFit, type Money } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { myNights, useNight } from '../src/lib/nightStore';

const PERIODS = ['Month', 'Year', 'All time'] as const;
type Period = (typeof PERIODS)[number];

/**
 * My games — 1A and 1B. Rev 10.
 *
 * The list behind My stats: every night of yours, most recent first, each one
 * opening the night's results as a sheet over this. A row reads club and
 * session times and nothing else — the buy-in and the duration belong to the
 * night, not to a list of them — and a night of this club you sat out reads
 * "did not play" in the same place.
 */
export default function MyGames() {
  const t = useTheme();
  const night = useNight();
  const [period, setPeriod] = useState<Period>('Month');

  const nights = myNights(night, period === 'Month' ? 31 : period === 'Year' ? 365 : null);
  const played = nights.filter((n) => n.played);
  const total = played.reduce((sum, n) => sum + n.result, 0) as Money;
  const average = played.length === 0 ? 0 : Math.round(total / played.length);

  return (
    <Screen title="My games" backTo="the club">
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
                style={[styles.tab, p === period && { borderBottomWidth: 1.5, borderBottomColor: t.text }]}
              >
                <Text
                  style={[
                    p === period ? styles.tabOn : styles.tabOff,
                    { color: p === period ? t.text : t.muted },
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text
          style={[styles.figure, { color: moneyColor(t, total) }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {formatSignedToFit(total, HEAD_FITS)}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]}>
          played {played.length} {played.length === 1 ? 'game' : 'games'} / av.{' '}
          {formatSigned(average as Money)} per game
        </Text>
      </View>

      <View style={styles.list}>
        {[...nights].reverse().map((n) => (
          <Pressable
            key={n.sessionId}
            accessibilityRole="button"
            onPress={() => router.push('/settled')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowDate, { color: t.text }]}>{n.date}</Text>
              <Text style={[styles.rowMeta, { color: t.muted }]}>
                {n.played ? `${n.groupName} · ${n.times}` : `${n.groupName} · did not play`}
              </Text>
            </View>
            {n.played && (
              <Text style={[styles.rowResult, { color: moneyColor(t, n.result) }]}>
                {formatSigned(n.result)}
              </Text>
            )}
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {nights.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nothing in this period. A night appears here once it has been settled.
          </Text>
        )}
      </View>
    </Screen>
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

  list: { marginHorizontal: space.page },
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
