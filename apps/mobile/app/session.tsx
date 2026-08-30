import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
  formatMoney,
  formatSigned,
  formatToFit,
  resolveLedger,
  type Money,
} from '@poker-club/core';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { clockLabel, useElapsed } from '../src/lib/elapsed';
import { defaultBuyIn, standingsOf, useNight } from '../src/lib/nightStore';
import { usePending } from '../src/lib/pending';

/**
 * Tonight — T1, with T3 (the drawer), T3b (the hold) and T5 (nobody in yet).
 * 08-tonight-home.md, rev 11. Every earlier drawing of this screen is dead.
 *
 * THE SCREEN IS THE TABLE. No tabs, no segmented control, no feed: one figure
 * for the money on it, one row per player, and a dock. Every entry with its
 * timestamp now lives on the player it belongs to, one tap away, because a
 * chronological feed is a thing you read and a table is a thing you check —
 * and at 23:00 a host is checking.
 *
 * Two sums are shown deliberately, and only when they differ:
 *
 *   On the table   what players still seated have bought in for
 *   Total in       every dollar bought in tonight, including those who left
 *
 * The first is what is in front of people; the second is what the night has to
 * reconcile against. Before anyone cashes out they are the same number, and a
 * number printed twice reads as two facts, so the smaller one hides.
 */
/*
 * WHERE THE MONEY CARD RUNS OUT OF ROOM.
 *
 * The headline is 44/800 tabular — about 26 points a glyph — beside a right
 * column that needs roughly 130 for "$99,999 total in". The card's inside is
 * 321 at 393 wide, which leaves the figure seven glyphs: "$99,999" and no
 * more. A real night went past that and the right column was pushed clean
 * outside the card, over the edge of the screen, with nothing clipping it.
 *
 * Both figures use the same threshold on purpose. Abbreviating one and not the
 * other would put "$10.5M" beside "$10,515,400" in one card and read as two
 * different scales rather than two different sums.
 */
const CARD_FITS = 10_000;

export default function Session() {
  const t = useTheme();
  const night = useNight();
  /* N11: entries this phone has written and nobody else can see yet. Asked
     for by session so a second table's queue is not counted onto this one. */
  const pending = usePending(night?.sessionId);
  const [drawer, setDrawer] = useState(false);

  /*
   * THE DRAWER IS NEVER OPEN WHEN YOU ARRIVE.
   *
   * It is the dock expanding in place, not a mode the screen is in: it exists
   * for the two seconds between wanting to seat somebody and seating them. A
   * host who opened it, recorded a rebuy and came back found the table still
   * dimmed to .4 behind a panel they had already finished with — every figure
   * on the screen they came back to READ was greyed out, and the way out was a
   * tap they had no reason to expect they owed.
   *
   * So it closes on the way out (the handlers below) and again on the way
   * back, which is this. Two belts, because they cover different journeys: the
   * handlers catch the action, and the focus catches every other route home —
   * a swipe down on the sheet, a hardware back, a sheet that dismisses itself
   * after a confirm.
   */
  useFocusEffect(
    useCallback(() => {
      setDrawer(false);
    }, []),
  );

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /**
   * Most money in first. Everyone who has played stays in the list, including
   * whoever has already gone — a host closing the night needs the people who
   * left as much as the people still sitting there.
   */
  const standings = useMemo(() => {
    if (night === null || ledger === null) return [];
    return standingsOf(night, ledger)
      .filter((s) => s.played)
      .sort((a, b) => b.boughtIn - a.boughtIn || (a.name < b.name ? -1 : 1));
  }, [night, ledger]);

  if (night === null || ledger === null) {
    return <Screen title="Tonight" backTo="the club">{null}</Screen>;
  }

  const seated = standings.filter((s) => s.atTable);
  const out = standings.length - seated.length;

  const onTable = seated.reduce((sum, s) => sum + s.boughtIn, 0) as Money;
  const totalIn = ledger.totalBoughtIn;
  const empty = standings.length === 0;

  return (
    <Screen
      title="Tonight"
      backTo="the club"
      /* The tag sits at the RIGHT EDGE of the title row rather than beside the
         title: it is the state of the night, not part of its name, and the
         corner is where a reader looks for state. It is the only thing in that
         corner now that the start time has moved onto the card. */
      trailing={<LiveTag startedAt={night.startedAt} empty={empty} />}
      scroll={false}
      dimmed={drawer}
      footerPad={false}
      footer={
        <Dock
          variant={empty ? 'empty-table' : 'resting'}
          waiting={pending.waiting}
          open={drawer}
          onOpenChange={setDrawer}
          onRebuy={() => {
            setDrawer(false);
            router.push({ pathname: '/pick', params: { kind: 'buyin' } });
          }}
          onBill={() => {
            setDrawer(false);
            router.push('/bill');
          }}
          onSeat={() => {
            setDrawer(false);
            router.push('/seat');
          }}
          onCashOut={() => {
            setDrawer(false);
            router.push({ pathname: '/pick', params: { kind: 'cashout' } });
          }}
          /* O4 over Tonight — `09-navigation.md`: money rules open "from O1,
             or Tonight". Until now they opened from neither, so a rule agreed
             before the night could not be changed during it. */
          onRules={() => {
            setDrawer(false);
            router.push('/money-rules');
          }}
          onEnd={() => {
            setDrawer(false);
            router.push('/count-up');
          }}
        />
      }
    >
      {/*
       * Tapping anywhere off the panel closes the drawer.
       *
       * MOUNTED ONLY WHILE IT IS OPEN. Left in place and merely disabled, this
       * wrapper marks the entire table `aria-disabled` — every row, every
       * figure, all evening — and a screen reader announces the night as
       * unavailable when nothing is wrong with it. There is no scrim to catch
       * a tap when there is no drawer to close, so there is no element either.
       */}
      <PressableOrPlain
        wrap={drawer}
        onPress={() => setDrawer(false)}
        style={styles.body}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: t.surface, borderColor: t.hairline },
            empty && styles.cardEmpty,
          ]}
        >
          <View style={styles.cardLeft}>
            <Text style={[styles.tableLabel, { color: t.muted }]}>On the table</Text>
            <Text
              style={[styles.tableFigure, { color: t.text }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatToFit(onTable, CARD_FITS)}
            </Text>
          </View>

          <View style={styles.cardRight}>
            {totalIn !== onTable && (
              <Text
                style={[styles.totalIn, { color: t.muted }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatToFit(totalIn, CARD_FITS)} total in
              </Text>
            )}
            <Text style={[styles.seats, { color: t.dim }]}>
              {empty
                ? 'nobody seated'
                : out === 0
                  ? `${seated.length} seated`
                  : `${seated.length} seated · ${out} out`}
            </Text>
            {/* WHEN THE NIGHT STARTED SITS WITH WHO IS AT THE TABLE.
                It was at the right edge of the title row, where it and the
                running-time tag between them left "Tonight" too little to keep
                one line. Here it is a fact about the night beside the other
                two, the tag stays beside the title where it was drawn, and the
                column is still shorter than the figure next to it — so the
                card does not grow. */}
            <Text style={[styles.started, { color: t.dim }]}>
              {empty ? 'opened' : 'started'} {clockLabel(night.startedAt)}
            </Text>
          </View>
        </View>

        {empty ? (
          <View style={styles.blank}>
            <Icon name="person" color={t.dim} size={34} />
            <Text style={[styles.blankTitle, { color: t.text }]}>Nobody has bought in yet</Text>
            <Text style={[styles.blankBody, { color: t.muted }]}>
              Seat the first player and the table starts filling. Buy-ins are{' '}
              {formatMoney(defaultBuyIn(ledger))} tonight.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!drawer}
          >
            {standings.map((s, i) => {
              /*
               * One row, two meanings. While somebody is seated the figure is
               * what they are in for; once they have cashed out it is their
               * night's result, in the green/red pair. Two fields, never one
               * formatted number — they are not the same kind of fact.
               */
              const result = (s.cashedOut - s.boughtIn) as Money;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  disabled={drawer}
                  onPress={() => router.push({ pathname: '/player', params: { id: s.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: t.hairline,
                      borderBottomWidth:
                        i === standings.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.name, { color: s.atTable ? t.text : t.muted }]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                  <Text
                    style={[
                      styles.amount,
                      { color: s.atTable ? t.text : moneyColor(t, result) },
                    ]}
                  >
                    {s.atTable ? formatMoney(s.boughtIn) : formatSigned(result)}
                  </Text>
                  <Icon name="chevron" color={t.muted} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </PressableOrPlain>
    </Screen>
  );
}

/**
 * The running time IS the live tag — there is no "LIVE" word any more. Green
 * dot, green figure, green at 14% behind them.
 */
/**
 * A tap-catcher while the drawer is open, and nothing at all when it is not.
 *
 * Two elements rather than one disabled one, because the disabled version is
 * not invisible: it carries `aria-disabled` over everything inside it, and
 * what is inside it is the whole table.
 */
function PressableOrPlain({
  wrap,
  onPress,
  style,
  children,
}: {
  wrap: boolean;
  onPress: () => void;
  style: ViewStyle;
  children: ReactNode;
}) {
  if (!wrap) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Close the table admin drawer" onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}

function LiveTag({ startedAt, empty }: { startedAt: string; empty: boolean }) {
  const t = useTheme();
  // Ticks itself. It used to be computed once per render, which on this screen
  // meant it moved only when the host recorded something — a figure that sat
  // still for twenty minutes and then jumped, beside a green dot saying the
  // night was live.
  const running = useElapsed(startedAt);
  return (
    <View style={[styles.tag, { backgroundColor: t.winTint }]}>
      <View style={[styles.dot, { backgroundColor: t.win }]} />
      <Text style={[styles.tagText, { color: t.win }]}>
        {empty ? 'just opened' : running}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.badge,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tagText: type.liveTag,
  started: type.startedAt,

  // --- the one money card --------------------------------------------------
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  cardEmpty: { paddingVertical: 12 },
  cardLeft: { gap: 8, flexShrink: 1 },
  tableLabel: type.tableLabel,
  tableFigure: type.tableFigure,
  // The right column keeps its width and the figure beside it gives, never
  // the other way round: three lines of small print reflow into a column of
  // single words long before a headline runs out of room.
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  totalIn: type.tableTotal,
  seats: type.tableSeats,

  // --- the table -----------------------------------------------------------
  list: { flex: 1, marginHorizontal: 22 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 4,
  },
  name: { ...type.tableName, flexShrink: 1 },
  amount: { ...type.tableAmount, marginLeft: 'auto' },

  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.page },
  blankTitle: { fontSize: 19, fontWeight: '700' },
  blankBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, textAlign: 'center', maxWidth: 250 },
});
