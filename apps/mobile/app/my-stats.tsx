import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSigned, type Money } from '@poker-club/core';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { history, setWhoAmI, useNight, whoAmI, type PastNight } from '../src/lib/nightStore';

/**
 * My stats — G4, confirmed as the layout by rev 10 (S40).
 *
 * A push from the club: somewhere you go and stay, not something you open to do
 * one thing. Four bands — the period card, the result-per-night chart, the last
 * games, and above all of them the one question this screen cannot work
 * without.
 *
 * IT IS A SCREEN ABOUT ONE PERSON, and a player in this app is a name the host
 * typed rather than an account, so the app has to be told which name is the
 * reader. That is asked once, plainly, and stored on the phone. It is the small
 * local ancestor of X2 "Claim your place" — it proves nothing and unlocks
 * nothing, it only decides whose row these figures are about.
 *
 * Every net comes from the settlement engine, night by night. A month that was
 * added up some other way would eventually disagree with the nights inside it,
 * and of the two numbers the wrong one would be this screen's.
 */

type Period = 'month' | 'year' | 'all';

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
];

export default function MyStats() {
  const t = useTheme();
  const night = useNight();

  const [me, setMe] = useState<string | null>(null);
  const [nights, setNights] = useState<PastNight[]>([]);
  const [period, setPeriod] = useState<Period>('month'); // S48: month is the default
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setMe(await whoAmI());
    setNights(await history());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A night settled while this screen sat in the stack would otherwise show
  // last week's figures.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return <Screen title="My stats" backTo="The group">{null}</Screen>;
  }

  if (me === null) {
    return (
      <WhoAreYou
        names={[...new Set((night?.players ?? []).map((p) => p.name))]}
        onPick={(name) => {
          void setWhoAmI(name).then(load);
        }}
      />
    );
  }

  const played = nights.filter((n) => n.played && n.net !== null);
  const inPeriod = played.filter((n) => within(n.startedAt, period));

  const total = inPeriod.reduce((sum, n) => sum + (n.net ?? 0), 0) as Money;
  const wins = inPeriod.filter((n) => (n.net ?? 0) > 0).length;
  const losses = inPeriod.filter((n) => (n.net ?? 0) < 0).length;
  const average = (inPeriod.length === 0 ? 0 : Math.round(total / inPeriod.length)) as Money;
  const hours = inPeriod.reduce((sum, n) => sum + lengthInHours(n), 0);

  // The chart is the last eight nights PLAYED, oldest on the left so it reads
  // as time passing rather than as a list.
  const chart = [...played].slice(0, 8).reverse();
  const biggest = Math.max(1, ...chart.map((n) => Math.abs(n.net ?? 0)));

  return (
    <Screen title="My stats" backTo="The group" meta={`Playing as ${me}`}>
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>{periodLabel(period)}</Text>
          <View style={styles.tabs}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === p.key }}
                onPress={() => setPeriod(p.key)}
                style={[
                  styles.tab,
                  { borderBottomColor: period === p.key ? t.text : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    period === p.key ? styles.tabOn : styles.tab_,
                    { color: period === p.key ? t.text : t.muted },
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.figure, { color: moneyColor(t, total) }]}>
          {inPeriod.length === 0 ? '—' : formatSigned(total)}
        </Text>
        <Text style={[styles.figureMeta, { color: t.muted }]}>
          {inPeriod.length === 0
            ? 'No games in this period'
            : `${inPeriod.length} ${inPeriod.length === 1 ? 'game' : 'games'} · ${hours} h`}
        </Text>

        <View style={[styles.pairs, { borderTopColor: t.hairline }]}>
          <View style={styles.pair}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>Won / lost</Text>
            <Text style={styles.pairValue}>
              <Text style={{ color: t.win }}>{wins} W</Text>
              <Text style={{ color: t.muted }}> · </Text>
              <Text style={{ color: t.loss }}>{losses} L</Text>
            </Text>
          </View>
          <View style={styles.pair}>
            <Text style={[styles.pairLabel, { color: t.muted }]}>Avg / night</Text>
            <Text style={[styles.pairValue, { color: moneyColor(t, average) }]}>
              {inPeriod.length === 0 ? '—' : formatSigned(average)}
            </Text>
          </View>
        </View>
      </View>

      {chart.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>
              Last {chart.length} {chart.length === 1 ? 'night' : 'nights'}
            </Text>
            <Text style={[styles.sectionAside, { color: t.muted }]}>result per night</Text>
          </View>

          {/* A zero line with bars either side of it, so a losing night reads as
              a losing night at a glance rather than as a shorter green one. */}
          <View style={styles.chart}>
            {chart.map((n) => {
              const net = n.net ?? 0;
              const height = Math.max(2, Math.round((Math.abs(net) / biggest) * 34));
              return (
                <View key={n.sessionId} style={styles.column}>
                  <View style={styles.half}>
                    {net > 0 && <View style={[styles.bar, { height, backgroundColor: t.win }]} />}
                  </View>
                  <View style={[styles.zero, { backgroundColor: t.hairline }]} />
                  <View style={styles.half}>
                    {net < 0 && <View style={[styles.bar, { height, backgroundColor: t.loss }]} />}
                  </View>
                  <Text style={[styles.columnLabel, { color: t.muted }]} numberOfLines={1}>
                    {shortDate(n.startedAt)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Last games</Text>
        </View>

        {nights.length === 0 ? (
          <Text style={[styles.empty, { color: t.muted }]}>
            No nights on this phone yet. Start a session and this fills in on its own.
          </Text>
        ) : (
          nights.slice(0, 8).map((n, i) => (
            <Pressable
              key={n.sessionId}
              accessibilityRole="button"
              disabled={!n.settled}
              onPress={() => router.push('/settled')}
              style={({ pressed }) => [
                styles.gameRow,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth:
                    i === Math.min(nights.length, 8) - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.gameText}>
                <Text style={[styles.gameDate, { color: t.text }]}>{longDate(n.startedAt)}</Text>
                {/* S49: club · session times, and "did not play" for a night
                    that ran without the reader in it. */}
                <Text style={[styles.gameSub, { color: t.muted }]}>
                  {n.played ? `${n.groupName} · ${times(n)}` : `${n.groupName} · did not play`}
                </Text>
              </View>
              <View style={styles.gameFigures}>
                <Text
                  style={[styles.gameNet, { color: n.played ? moneyColor(t, n.net ?? 0) : t.muted }]}
                >
                  {n.played ? formatSigned(n.net ?? (0 as Money)) : '—'}
                </Text>
                <Text style={[styles.gameLength, { color: t.muted }]}>
                  {n.settled ? duration(n) : 'live'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void setWhoAmI('').then(() => setMe(null));
        }}
        style={({ pressed }) => [styles.change, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.changeLabel, { color: t.muted }]}>Not {me}? Change who you are</Text>
      </Pressable>
    </Screen>
  );
}

/**
 * The one question this screen cannot work without.
 *
 * Asked plainly, once, and answered by tapping a name. There is no account
 * behind it and nothing is verified — at a kitchen table, the person holding
 * the phone saying which name is theirs is the whole of the security model, and
 * pretending otherwise would mean building sign-in for six friends.
 */
function WhoAreYou({ names, onPick }: { names: string[]; onPick: (name: string) => void }) {
  const t = useTheme();
  return (
    <Screen
      title="My stats"
      backTo="The group"
      lede="These figures are about one person. Which of these is you?"
    >
      <View style={styles.section}>
        {names.length === 0 ? (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nobody has played on this phone yet. Seat a few people and come back.
          </Text>
        ) : (
          names.map((name, i) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => onPick(name)}
              style={({ pressed }) => [
                styles.gameRow,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === names.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.gameDate, { color: t.text }]}>{name}</Text>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Dates and lengths. A night has no stored end time, so its last entry is the
// closest honest thing to one — stated as "until the last entry", never dressed
// up as a real close.
// ---------------------------------------------------------------------------

function within(iso: string, period: Period): boolean {
  if (period === 'all') return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === 'year') return d.getFullYear() === now.getFullYear();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function periodLabel(period: Period): string {
  const now = new Date();
  if (period === 'all') return 'All time';
  if (period === 'year') return `This year · ${now.getFullYear()}`;
  return `This month · ${now.toLocaleDateString('en-GB', { month: 'long' })}`;
}

function lengthInHours(n: PastNight): number {
  if (n.lastEntryAt === null) return 0;
  const ms = new Date(n.lastEntryAt).getTime() - new Date(n.startedAt).getTime();
  return Math.max(0, Math.round(ms / 3_600_000));
}

function duration(n: PastNight): string {
  if (n.lastEntryAt === null) return '—';
  const minutes = Math.max(
    0,
    Math.round((new Date(n.lastEntryAt).getTime() - new Date(n.startedAt).getTime()) / 60000),
  );
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function times(n: PastNight): string {
  return n.lastEntryAt === null
    ? clock(n.startedAt)
    : `${clock(n.startedAt)} – ${clock(n.lastEntryAt)}`;
}

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const longDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginBottom: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card + 2,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardLabel: { ...type.label, letterSpacing: 1.3, flexShrink: 1 },

  tabs: { flexDirection: 'row', gap: 14, marginLeft: 'auto' },
  tab: { borderBottomWidth: 1.5, paddingBottom: 3 },
  tab_: { fontSize: 11.5, fontWeight: '500' },
  tabOn: { fontSize: 11.5, fontWeight: '700' },

  figure: { fontSize: 34, fontWeight: '800', letterSpacing: -1.36, fontVariant: ['tabular-nums'] },
  figureMeta: { fontSize: 12, fontWeight: '400', paddingTop: 2, fontVariant: ['tabular-nums'] },

  pairs: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pair: { gap: 4 },
  pairLabel: type.label,
  pairValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },

  section: { marginHorizontal: space.page, marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  sectionLabel: type.sectionLabel,
  sectionAside: { ...type.footnote, marginLeft: 'auto' },

  chart: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  column: { flex: 1, alignItems: 'center' },
  half: { height: 36, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '72%', borderRadius: 2 },
  zero: { height: StyleSheet.hairlineWidth, width: '100%' },
  columnLabel: { fontSize: 9.5, fontWeight: '500', paddingTop: 4 },

  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  gameText: { gap: 3, flexShrink: 1 },
  gameDate: { fontSize: 15.5, fontWeight: '600' },
  gameSub: { fontSize: 12.5, fontWeight: '400' },
  gameFigures: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3 },
  gameNet: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gameLength: { fontSize: 12.5, fontWeight: '400', fontVariant: ['tabular-nums'] },

  empty: { ...type.footnote, paddingHorizontal: 4 },

  change: { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  changeLabel: { ...type.chip, fontWeight: '500' },
});
