import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { type Money } from '@poker-club/core';
import { formatSigned, formatSignedToFit } from '../src/lib/money';
import { Dropdown, MENU_DIM, type DropdownItem } from '../src/components/Dropdown';
import { duration, GameRow } from '../src/components/GameRow';
import { ChartPlaceholder, NightsChart } from '../src/components/NightsChart';
import { GhostGames } from '../src/components/GhostGames';
import { Card, SectionLabel } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
import { cappedFigure, tabular, unscaledLabel } from '../src/design/tokens';
import { ALL_GROUPS, scopeLabel, setPeriod, setScope, usePeriod, useScope } from '../src/lib/bookStore';
import {
  formatNightDate,
  inGroup,
  inPeriod,
  mostRecentFirst,
  periodTitle,
  readBook,
  sinceTitle,
  summarise,
  type Period,
  type PlayedNight,
} from '../src/lib/myStats';
import { openNightById, useMyNights } from '../src/lib/nightStore';

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
 * PUSH from the club root — the group dropdown shares the TITLE row, on the
 * ink in white, which is the one place this screen departs from the app's
 * usual chrome and the handoff is explicit about why.
 *
 * IN THE FULL BOARD'S LOOK (`design/explorations/full-board/screens/
 * 70-sessions-stats-group.mjs`: `stats`, `stats-book`, `stats-empty`, all
 * approved): three lifted cards on the sheet, `LAST GAMES` a quiet section
 * label with `See all` at its end, and no bar — it is a place, nothing to
 * confirm. Before the first night the chart and the list are drawn as
 * placeholders in the faint grey (owner, 25 November).
 *
 * THREE BLOCKS AND NOTHING ELSE:
 *
 *   THE FIGURE CARD   the period's net over `6 games · 25 h`, the period tabs
 *                     inside it, and two stat pairs under a divider. A lifted
 *                     card like the other two — the board has no green fills.
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
  const mine = useMyNights();
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

  /* One book, and Sessions assembles it the same way — `useMyNights` and
     `readBook` are what stop the destination holding less than the sample that
     links to it. Every settled night on this phone: the ones the host recorded
     and the ones the pull brought back off the server. */
  const history = useMemo<PlayedNight[]>(() => readBook(mine), [mine]);

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

  /* WHAT `All time` IS NAMED AFTER — the month of the earliest night in the
     SCOPED book, which is the one the figure beside it is added up from. Read
     off `scoped` rather than `nights` so the label is the same fact whichever
     tab is showing, and computed in `myStats` rather than here. */
  const since = useMemo(() => sinceTitle(scoped), [scoped]);

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
      <View
        style={[styles.body, menuOpen && { opacity: MENU_DIM }]}
        pointerEvents={menuOpen ? 'none' : 'auto'}
      >
        <FigureCard period={period} stats={stats} now={now} since={since} />

        {plotted.length > 0 ? (
          <NightsChart
            caption={`Last ${plotted.length} ${plotted.length === 1 ? 'night' : 'nights'}`}
            cleared={cleared}
            nights={plotted.map((n) => ({
              id: n.id,
              label: formatNightDate(n.startedAt),
              net: n.net,
            }))}
          />
        ) : (
          /* Before the first night the chart is its own placeholder, with the
             caption the full eight will have (`stats-empty`). */
          <ChartPlaceholder caption="Last 8 nights" />
        )}

        <SectionLabel
          text="Last games"
          quiet
          right={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/games')}
              hitSlop={10}
              style={styles.seeAllHit}
            >
              <Text style={[styles.seeAll, { color: t.muted }]}>See all</Text>
            </Pressable>
          }
        />

        {/*
         * FOUR ROWS, AND THE GROUP NAME FIRST. This list spans every club the
         * reader plays in — Sessions is scoped and does not repeat its own
         * name eight times, and this one has to say which night was where.
         * It reads the SCOPED history rather than the period's, for the same
         * reason the graph does: `LAST GAMES` is a count, not a stretch.
         */}
        {scoped.length > 0 ? (
          <Card style={styles.nights}>
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
                  onPress={() => void openNight(n.id)}
                />
              ))}
          </Card>
        ) : (
          <>
            <GhostGames />
            <Text style={[styles.empty, { color: t.muted }]}>
              No nights yet. Your first one shows up here the moment it is settled.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

/**
 * THE FIGURE CARD — the answer, and the only tinted thing on the screen.
 *
 * `August` over `+$610`, with `6 games · 25 h` flush right on the same
 * baseline, then a hairline and two stat pairs. The period tabs live inside it
 * because the figure is what they change: tabs anywhere else would be a control
 * with no visible subject.
 *
 * THE EYEBROW IS THE STRETCH AND NOTHING ELSE — `August`, `2026`,
 * `Since Aug 2026`. The handoff draws `This month · August`, and `This month`
 * is the half of that line the tabs already say: `Month` is lit directly above
 * it, and a card whose every figure is the period's does not need to be told
 * twice which period it is. `All time` gained what the other two always had —
 * the stretch it covers, which for a book is the month it opens in. The month
 * is short there because the line is shared with the tabs; `sinceTitle` has
 * the measurement. Owner's call, 15 September; recorded in
 * `docs/screens.md`.
 *
 * THE GREEN TINT IS GONE. The handoff tinted this card with the win colour at
 * 13% whatever the figure was; the full board has no green fills, so it is a
 * lifted card like the other two (`stats`, approved). `period-card` keeps its
 * name for `ui-audit.mjs`.
 *
 * A LOSS IS RED here — the net, the `L` count and the average — not the loss
 * grey the rest of the app uses (owner, on the board). `6 games · 25 h` keeps
 * its first style, one muted line: the owner passed over three others.
 */
function FigureCard({
  period,
  stats,
  now,
  since,
}: {
  period: Period;
  stats: ReturnType<typeof summarise>;
  now: Date;
  /** What `All time` is named: `Since Aug 2026`. `myStats.sinceTitle`. */
  since: string;
}) {
  const t = useTheme();
  const net = stats.net as Money;

  return (
    /* `Card` takes no testID, so the name `ui-audit.mjs` reads is on a box
       around it of exactly its size. */
    <View testID="period-card">
      <Card pad style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={[styles.eyebrow, { color: t.muted }]} {...unscaledLabel}>
            {period === 'all' ? since : periodTitle(period, now)}
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
                  hitSlop={6}
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

        <View style={styles.figureRow}>
          <Text
            testID="period-net"
            style={[styles.figure, tabular, { color: signed(t, net) }]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(net, HEAD_FITS)}
          </Text>
          <Text style={[styles.cardMeta, tabular, { color: t.muted }]} numberOfLines={1}>
            {`${stats.games} ${stats.games === 1 ? 'game' : 'games'} · ${hours(stats.minutes)}`}
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: t.hairline }]} />

        <View style={styles.pairs}>
          <View style={styles.pair}>
            <Text style={[styles.pairLabel, { color: t.muted }]} {...unscaledLabel}>
              Won / lost
            </Text>
            <Text style={[styles.pairValue, tabular]}>
              <Text style={{ color: t.win }}>{`${stats.won} W`}</Text>
              <Text style={{ color: t.muted }}> · </Text>
              <Text style={{ color: t.red }}>{`${stats.lost} L`}</Text>
            </Text>
          </View>
          <View style={[styles.pair, styles.pairRight]}>
            <Text style={[styles.pairLabel, { color: t.muted }]} {...unscaledLabel}>
              Avg / night
            </Text>
            <Text
              style={[styles.pairValue, tabular, { color: signed(t, stats.average) }]}
              {...cappedFigure}
            >
              {formatSigned(stats.average as Money)}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

/** Green up, red down, the text colour at nothing — this screen's losses are red. */
function signed(t: ReturnType<typeof useTheme>, amount: number): string {
  if (amount > 0) return t.win;
  if (amount < 0) return t.red;
  return t.text;
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
  /* The sheet's content: 18 in from each edge, the cards 12 apart. */
  body: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },

  /* The kit's `card pad` at `padding: 16px`. */
  card: { padding: z(16) },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: z(10) },
  eyebrow: {
    fontSize: z(11),
    lineHeight: z(13),
    fontWeight: '700',
    letterSpacing: z(1.32),
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  tabs: { flexDirection: 'row', alignItems: 'baseline', gap: z(12), marginLeft: 'auto' },
  tab: { paddingBottom: z(3), borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  tabOff: { fontSize: z(11.5), fontWeight: '500' },
  tabOn: { fontSize: z(11.5), fontWeight: '700' },

  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: z(10), marginTop: z(10) },
  /* `.fig` at 34: 700, the figure face, -.03em. */
  figure: {
    fontFamily: 'head',
    fontSize: z(34),
    fontWeight: '700',
    letterSpacing: z(-1.02),
    lineHeight: z(36),
    flexShrink: 1,
  },
  cardMeta: { marginLeft: 'auto', flexShrink: 0, fontFamily: 'head', fontSize: z(12), fontWeight: '400' },

  rule: { height: 1, marginVertical: z(12) },

  pairs: { flexDirection: 'row', alignItems: 'flex-end', gap: z(24) },
  pair: { gap: z(6) },
  pairRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  pairLabel: { fontSize: z(10), lineHeight: z(10), fontWeight: '700', letterSpacing: z(1), textTransform: 'uppercase' },
  pairValue: { fontFamily: 'head', fontSize: z(18), fontWeight: '700' },

  seeAllHit: { paddingLeft: z(12) },
  seeAll: { fontSize: z(12.5), fontWeight: '500' },

  /* `padding: 4px 12px` — the rows carry their own 9 above and below. */
  nights: { paddingVertical: z(4) },

  /* The kit's `note`: 13/1.45, muted. */
  empty: { fontSize: z(13), lineHeight: z(18.85) },
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

/**
 * Open one night of the reader's own.
 *
 * ⚠ EVERY ROW USED TO OPEN WHICHEVER NIGHT THE STORE HAPPENED TO HOLD, which
 * `docs/screens.md` recorded as open and which cost nothing while eight of the
 * nine rows were invented anyway. Now that the list is the reader's real
 * history it is the whole screen: nine nights that all open the same one is a
 * list of nine nights you cannot read.
 *
 * The swap comes first and the push second — the same order, and for the same
 * reason, as `goTo` on home: every screen below reads the night the store
 * holds, so pushing first paints the night you were looking at a moment ago.
 */
async function openNight(sessionId: string): Promise<void> {
  await openNightById(sessionId);
  router.push('/settled');
}
