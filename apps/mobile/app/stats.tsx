import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatSigned, formatSignedToFit } from '../src/lib/money';
import { Dropdown, MENU_DIM, type DropdownItem } from '../src/components/Dropdown';
import { duration, GameRow } from '../src/components/GameRow';
import { NightsChart } from '../src/components/NightsChart';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, space, tabular, type, unscaledLabel } from '../src/design/tokens';
import { SAMPLE_HISTORY } from '../src/data/sampleHistory';
import { ALL_GROUPS, scopeLabel, setPeriod, setScope, usePeriod, useScope } from '../src/lib/bookStore';
import {
  formatNightDate,
  inGroup,
  inPeriod,
  mostRecentFirst,
  periodTitle,
  readBook,
  summarise,
  type Period,
  type PlayedNight,
} from '../src/lib/myStats';
import { myNights, useNight } from '../src/lib/nightStore';

/** Month first, everywhere. Rev 10, S48 — and the handoff repeats it. */
const PERIODS: ReadonlyArray<{ label: string; value: Period }> = [
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All time', value: 'all' },
];

/**
 * MY STATS — `design/handoff-sessions-stats/`, frames `2a` and `3a`, cut
 * 9 September.
 *
 * Where a player stands over a stretch: one figure with its supporting counts,
 * a result-per-night graph for the last eight, and their last four games. A
 * PUSH from the club root with **nothing in the top-right** — the group
 * dropdown shares the TITLE row, which is the one place this screen departs
 * from the app's usual chrome and the handoff is explicit about why.
 *
 * THREE BLOCKS AND NOTHING ELSE:
 *
 *   THE FIGURE CARD   the period's net over `6 games · 25 h`, the period tabs
 *                     inside it, and two stat pairs under a divider. Tinted
 *                     rather than outlined — it is the answer, and it is the
 *                     only tinted thing on the screen.
 *   THE GRAPH         the last eight nights, tapped to read one out.
 *   LAST GAMES        four rows, and `See all` to Sessions.
 *
 * THE PERIOD IS TABS AND THE GROUP IS A DROPDOWN, which is the cut's own split
 * and its reasoning is worth keeping: the period is a three-way with short
 * labels a reader flips between, and a second dropdown beside the group one
 * would read as configuration. The group is a list that grows with every club
 * joined, and a chip row for it costs a 54-point band.
 *
 * BOTH ARE PERSISTED AND SHARED WITH SESSIONS — `bookStore`. A reader who
 * scopes the book to one club has scoped the book, not the screen.
 *
 * NOT ONE FIGURE ON THIS SCREEN IS ADDED UP HERE. Every one comes out of
 * `myStats`, which is tested — including the thing this screen used to get
 * wrong: a period is a CALENDAR month, not the last thirty-one days.
 */
export default function MyStats() {
  const t = useTheme();
  const night = useNight();
  const scope = useScope();
  const period = usePeriod();
  const [menuOpen, setMenuOpen] = useState(false);
  /*
   * WHAT CLEARS THE GRAPH'S READOUT. The handoff lists a change of group or
   * period among the interrupts, so the chart is handed a value that changes
   * with either and drops the selection the moment it does.
   */
  const cleared = `${scope}:${period}`;

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
        players: n.players,
        terms: n.terms,
      }));
    /* One book, and Sessions assembles it the same way — `readBook` is what
       stops the destination holding less than the sample that links to it. */
    return readBook(mine, SAMPLE_HISTORY);
  }, [night]);

  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const n of history) if (!seen.includes(n.group)) seen.push(n.group);
    return seen;
  }, [history]);

  /* THE SCOPE APPLIES FIRST AND THE PERIOD SECOND, which is the order a reader
     would say them in: "this month, at the poker club". */
  const scoped = useMemo(
    () => inGroup(history, scope === ALL_GROUPS ? null : scope),
    [history, scope],
  );
  const nights = useMemo(
    () => mostRecentFirst(inPeriod(scoped, period, now)),
    [scoped, period, now],
  );
  const stats = useMemo(() => summarise(nights), [nights]);

  /*
   * THE GRAPH IS THE LAST EIGHT, OLDEST FIRST — and it reads the SCOPED
   * history rather than the period's, deliberately. `LAST 8 NIGHTS` is a count
   * of nights, not a stretch of calendar: a reader on `Month` two days in has
   * one night in the period and eight behind them, and a graph of one column
   * says nothing about how they are playing.
   */
  const plotted = useMemo(
    () => mostRecentFirst(scoped).slice(0, 8).reverse(),
    [scoped],
  );

  const options: Array<DropdownItem<string>> = [
    { value: ALL_GROUPS, label: scopeLabel(ALL_GROUPS) },
    ...groups.map((g) => ({ value: g, label: g })),
  ];

  return (
    <Screen
      title="My stats"
      /*
       * THE GROUP CONTROL SHARES THE TITLE ROW. `trailing` is the slot doc 9
       * leaves empty on a pushed screen, and this is the one screen that fills
       * it — the handoff draws it there, and the alternative places are worse:
       * the meta line does not exist on this screen, and a band of its own
       * costs 54 points at the top of a screen that is three cards deep.
       * Recorded in `docs/screens.md`.
       */
      trailing={
        <Dropdown
          testID="stats-scope"
          items={options}
          value={scope}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onPick={setScope}
          accessibilityLabel={`Showing ${scopeLabel(scope)}. Change the group.`}
        />
      }
      backTo="the club"
      headScroll="meta"
    >
      <View style={menuOpen && { opacity: MENU_DIM }} pointerEvents={menuOpen ? 'none' : 'auto'}>
        <FigureCard period={period} stats={stats} now={now} />

        {plotted.length > 0 && (
          <NightsChart
            caption={`Last ${plotted.length} ${plotted.length === 1 ? 'night' : 'nights'}`}
            cleared={cleared}
            nights={plotted.map((n) => ({
              id: n.id,
              label: formatNightDate(n.startedAt),
              net: n.net,
            }))}
          />
        )}

        <View style={styles.list}>
          <View style={styles.listHead}>
            <Text style={[styles.sectionLabel, { color: t.muted }]} {...unscaledLabel}>
              Last games
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/games')}
              style={styles.seeAllHit}
            >
              <Text style={[styles.seeAll, { color: t.muted }]}>See all</Text>
            </Pressable>
          </View>

          {/*
           * FOUR ROWS, AND THE GROUP NAME FIRST. This list spans every club the
           * reader plays in — Sessions is scoped and does not repeat its own
           * name eight times, and this one has to say which night was where.
           * It reads the SCOPED history rather than the period's, for the same
           * reason the graph does: `LAST GAMES` is a count, not a stretch.
           */}
          {mostRecentFirst(scoped)
            .slice(0, 4)
            .map((n) => (
              <GameRow
                key={n.id}
                compact
                date={formatNightDate(n.startedAt, true)}
                net={n.net}
                {...(scope === ALL_GROUPS ? { group: n.group } : {})}
                {...(n.players === undefined ? {} : { players: n.players })}
                minutes={n.minutes}
                testID="stats-night"
                onPress={() => router.push('/settled')}
              />
            ))}

          {scoped.length === 0 && (
            <Text style={[styles.empty, { color: t.muted }]}>
              No nights yet. Your first one shows up here the moment it is settled.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

/**
 * THE FIGURE CARD — the answer, and the only tinted thing on the screen.
 *
 * `This month · August` over `+$610`, with `6 games · 25 h` flush right on the
 * same baseline, then a hairline and two stat pairs. The period tabs live
 * inside it because the figure is what they change: tabs anywhere else would be
 * a control with no visible subject.
 *
 * ⚠ THE TINT IS THE WIN COLOUR AT 13% WHATEVER THE FIGURE IS, and that is the
 * handoff's own card. It is a departure from B23's rule about washes behind
 * signed figures, and a narrow one: B23 is about a LIST of rows banded green
 * and red, where the band re-states the ranking the figures already give. This
 * is one card, it is the same colour on a losing month as on a winning one, and
 * it says "here is the answer" rather than "the answer is good".
 * `ui-audit.mjs` knows it by name. Recorded in `docs/screens.md`.
 */
function FigureCard({
  period,
  stats,
  now,
}: {
  period: Period;
  stats: ReturnType<typeof summarise>;
  now: Date;
}) {
  const t = useTheme();
  const net = stats.net as Money;

  return (
    <View testID="period-card" style={[styles.card, { backgroundColor: t.winWash }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.eyebrow, { color: t.muted }]} {...unscaledLabel}>
          {period === 'all' ? 'All time' : `This ${period} · ${periodTitle(period, now)}`}
        </Text>
        <View style={styles.tabs}>
          {PERIODS.map((p) => {
            const on = p.value === period;
            return (
              <Pressable
                key={p.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setPeriod(p.value)}
                style={[styles.tab, on && { borderBottomColor: t.text }]}
              >
                <Text
                  style={[on ? styles.tabOn : styles.tabOff, { color: on ? t.text : t.muted }]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 10 above and below the figure line — measured, not eyeballed. */}
      <View style={styles.figureRow}>
        <Text
          testID="period-net"
          style={[styles.figure, tabular, { color: net === 0 ? t.text : moneyColor(t, net) }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {formatSignedToFit(net, HEAD_FITS)}
        </Text>
        <Text style={[styles.cardMeta, tabular, { color: t.muted }]} numberOfLines={1}>
          {`${stats.games} ${stats.games === 1 ? 'game' : 'games'} · ${hours(stats.minutes)}`}
        </Text>
      </View>

      <View style={[styles.pairs, { borderTopColor: t.hairline }]}>
        <View style={styles.pair}>
          <Text style={[styles.pairLabel, { color: t.muted }]} {...unscaledLabel}>
            Won / lost
          </Text>
          <Text style={[styles.pairValue, tabular]}>
            <Text style={{ color: t.win }}>{`${stats.won} W`}</Text>
            <Text style={{ color: t.muted }}> · </Text>
            <Text style={{ color: t.loss }}>{`${stats.lost} L`}</Text>
          </Text>
        </View>
        <View style={[styles.pair, styles.pairRight]}>
          <Text style={[styles.pairLabel, { color: t.muted }]} {...unscaledLabel}>
            Avg / night
          </Text>
          <Text
            style={[
              styles.pairValue,
              tabular,
              { color: stats.average === 0 ? t.text : moneyColor(t, stats.average) },
            ]}
            {...cappedFigure}
          >
            {formatSigned(stats.average as Money)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * `25 h`, and never `25 h 12`.
 *
 * A period's hours are a scale rather than a duration — the minutes on twenty
 * nights are noise, and the row that needs them to the minute is one night's
 * own, which `duration` draws. Imported rather than reimplemented so the two
 * cannot drift into two spellings of the same hour.
 */
function hours(minutes: number): string {
  return minutes < 60 ? duration(minutes) : `${Math.round(minutes / 60)} h`;
}

const styles = StyleSheet.create({
  /* `0 20px 12px` · `20px 22px` · radius 12, tinted, no border. */
  card: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: 12,
    gap: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.32, textTransform: 'uppercase', flexShrink: 1 },
  tabs: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginLeft: 'auto' },
  tab: { paddingBottom: 3, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  tabOff: { fontSize: 11.5, fontWeight: '500' },
  tabOn: { fontSize: 11.5, fontWeight: '700' },

  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 7 },
  figure: { fontSize: 34, fontWeight: '800', letterSpacing: -1.36, lineHeight: 36, flexShrink: 1 },
  cardMeta: { marginLeft: 'auto', flexShrink: 0, fontSize: 12, fontWeight: '400' },

  pairs: { flexDirection: 'row', alignItems: 'flex-end', gap: 24, marginTop: 7, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  pair: { gap: 4 },
  pairRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  pairLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  pairValue: { fontSize: 18, fontWeight: '700' },

  /* `14px 22px 10px`. */
  list: { marginHorizontal: space.page, marginTop: 14, marginBottom: 10 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  // The push has to carry the margin, not the text inside it: `auto` on the
  // Text only pushes it within a box that is already hard against the label.
  seeAllHit: { marginLeft: 'auto', paddingLeft: 12 },
  seeAll: { fontSize: 12.5, fontWeight: '500' },
  empty: { ...type.footnote, paddingTop: 8 },
});

/*
 * WHERE THE HEADLINE RUNS OUT OF ROOM.
 *
 * 34/800 is the widest type on this screen, inside a card 20 in from each edge
 * with 22 of padding — about 264 points on a 360 phone, less what `6 games ·
 * 25 h` takes on the same line. That holds six glyphs comfortably, and this
 * total only ever grows: it is every night in the period added together.
 *
 * The exact figure is never lost. Every night that makes it up is a row on
 * Sessions with its own result printed in full.
 */
const HEAD_FITS = 100_000;