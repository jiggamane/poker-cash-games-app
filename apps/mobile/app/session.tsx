import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { resolveLedger, resultBeforeDeductions, type Money } from '@poker-club/core';
import { formatMoney, formatSignedToFit, formatToFit } from '../src/lib/money';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { ActiveRow, FinishedSlab, PlayerGroup } from '../src/components/PlayerList';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { clockLabel, useElapsed } from '../src/lib/elapsed';
import {
  cashedOutAt,
  defaultBuyIn,
  standingsOf,
  useNight,
  type Standing,
} from '../src/lib/nightStore';
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
 * column that needs roughly 130 for "$99,999 in play". The card's inside is
 * 321 at 393 wide, which leaves the figure seven glyphs: "$99,999" and no
 * more. A real night went past that and the right column was pushed clean
 * outside the card, over the edge of the screen, with nothing clipping it.
 *
 * Both figures use the same threshold on purpose. Abbreviating one and not the
 * other would put "$10.5M" beside "$10,515,400" in one card and read as two
 * different scales rather than two different sums.
 */
const CARD_FITS = 10_000;

/*
 * WHERE THE TABLE ROW RUNS OUT OF ROOM, and it is the sub-line that decides it.
 *
 * A settled row carries three figures now: the signed result on the right at
 * 19/700, and `in $500 · out $2,120` under the name at 12/400 behind a `23:15`.
 * At 360 — the narrowest phone in the matrix — the list is 316 wide, the row
 * spends 4 on its padding, 24 on its two gaps and 8 on the chevron, and the
 * result takes about 80 of what is left. That leaves roughly 200 points for a
 * line that starts with 34 points of clock it cannot shorten.
 *
 * ONE THRESHOLD FOR ALL THREE, which is the rule every other row in this app
 * follows and for the same reason: a row that abbreviated the figure under the
 * name and printed the one beside it in full would read as two scales rather
 * than as one person's night.
 *
 * TIGHTER THAN COUNT UP'S MILLION, deliberately. E2's sub-line carries the same
 * two figures with no clock in front of them and no chevron behind them, which
 * is about forty points this row does not have. The two screens are different
 * widths, so one threshold across both would have to be this one everywhere.
 */
const ROW_FITS = 10_000;

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
   * `standingsOf` maps `night.players`, which is the roster in the order the
   * seats were filled, so seat order is what comes back unsorted.
   *
   * Everyone who has played stays in the list, including whoever has already
   * gone — a host closing the night needs the people who left as much as the
   * people still sitting there.
   */
  const standings = useMemo(() => {
    if (night === null || ledger === null) return [];
    return standingsOf(night, ledger).filter((s) => s.played);
  }, [night, ledger]);

  if (night === null || ledger === null) {
    return <Screen title="Tonight" backTo="the club">{null}</Screen>;
  }

  /**
   * MOST MONEY IN FIRST, in the group that is still playing.
   *
   * ⚠ THIS REVERSES A DOCUMENTED DECISION, ON THE OWNER'S INSTRUCTION —
   * 3 September, "the more player has bought in the higher he should be in the
   * list". `design/handoff-count-up-to-settled/docs/05-active-vs-settled.md`,
   * cut 1 September, says "Groups never reorder. Within a group, seat order",
   * and this screen was changed FROM buy-in order TO seat order to obey it.
   * Do not put seat order back by reading that doc: `docs/screens.md` carries
   * which way round it went and why.
   *
   * THE ORDER IS THE COLUMN AT THE RIGHT EDGE. Every row in this group draws
   * what its player is in for, 19/700, so a list sorted by it can be checked by
   * a reader running a finger down the column — which is the whole argument for
   * sorting on a key at all, and the reason the group below is left alone.
   *
   * WHAT SEAT ORDER WAS PROTECTING, still true and now accepted: logging a
   * rebuy moves that row up the list, so the row under the host's thumb is not
   * the row that was there a moment ago. It costs an extra look after a rebuy;
   * what it buys is that the biggest stacks at the table are the ones at the
   * top of the screen, which is what a host is watching for.
   *
   * TIES KEEP SEAT ORDER — `Array#sort` is stable, so two players in for the
   * same amount stay in the order their seats were filled rather than swapping
   * about as unrelated entries land.
   */
  const seated = [...standings]
    .filter((s) => s.atTable)
    .sort((a, b) => b.boughtIn - a.boughtIn);

  /* Settled, on this screen, means the admin has taken their stack. The two
     lists are the two groups, and neither is re-derived below.

     LEFT IN SEAT ORDER, and not for want of a rule: the buy-in is not drawn on
     these rows — the fact is the time they left and the figure at the right is
     their result — so sorting them by it would be an order the reader cannot
     see.

     ⚠ AND THE SCREEN THAT USED TO ANSWER THIS IS GONE. Ranking them by RESULT
     was the other candidate, and this comment sent it to E2b, `Where everyone
     stands`, "which is the screen that ranks". E2b was deleted on 5 September
     and E2's own two finished groups rank in its place — so the same argument
     now applies here, on rows that do draw their result at the right edge.
     Left alone pending the owner's call rather than changed on the strength of
     a decision made about a different screen. **Open**, and it is in
     `docs/screens.md`. */
  const gone = standings.filter((s) => !s.atTable);
  const out = gone.length;

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
                {/* `in play`, not `total in` — 5 September, on the owner's
                    instruction. One word for this figure everywhere it is
                    drawn: it was `total in` here, `BOUGHT IN` on E2 and
                    `PRIZEPOOL` on the settled night, one number under three
                    nouns. `On the table` beside it is a DIFFERENT figure —
                    what the seated players still have in front of them — and
                    keeps its own name. */}
                {formatToFit(totalIn, CARD_FITS)} in play
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
            {/*
             * TWO GROUPS, AND THE HEADER IS LOAD-BEARING —
             * `05-active-vs-settled.md`. The right-hand column means two
             * different things on this list: for somebody still playing it is
             * MONEY IN, unsigned; for somebody who has cashed out it is a
             * signed RESULT BEFORE DEDUCTIONS. Nothing else on the row says
             * which, so the group header is the whole of what tells $500 and
             * +$1,620 apart, and it is not decoration.
             *
             * DO NOT SHORTEN "result before deductions" TO "result". The doc
             * says so in as many words, and the reason is what has not come
             * off yet: the bill, the piggy bank and the rounding step all land
             * later, so a row calling itself a *result* would be the third
             * different figure the same person is shown for the same night.
             *
             * BOTH HEADERS ARE ALWAYS DRAWN, INCLUDING AT ZERO. "An empty
             * group renders its header with `· 0` rather than disappearing, so
             * the admin can see that nobody has cashed out yet" — a group that
             * vanished would leave the host reading an ungrouped list whose
             * one remaining header they have no reason to still be reading.
             */}
            <PlayerGroup label="Still playing" count={seated.length} first>
              {seated.map((p, i) => (
                <ActiveRow
                  key={p.id}
                  name={p.name}
                  fact=""
                  last={i === seated.length - 1}
                  {...(drawer ? {} : {
                    onPress: () => router.push({ pathname: '/player', params: { id: p.id } }),
                  })}
                  right={
                    <>
                      <Text style={[styles.amount, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
                        {formatToFit(p.boughtIn, ROW_FITS)}
                      </Text>
                      <Icon name="chevron" color={t.muted} />
                    </>
                  }
                />
              ))}
            </PlayerGroup>

            {/*
              * THE CASHED-OUT ROW IS A SLAB, AND IT LOSES ITS CHEVRON —
              * `design/handoff-player-list/`, cut 3 September. It is finished:
              * there is nothing left to open on it, and a finished slab is not
              * tappable on any screen in the app.
              *
              * IT ALSO LOSES `in $500`. The buy-in has its own column on the
              * rows above, the slab is one line, and name, time, cash-out and
              * result are what fit. The label loses its qualifier for the same
              * reason the slab exists: the treatment says "settled" and the
              * words no longer have to.
              *
              * ⚠ AND IT KEEPS ITS CHEVRON, WHICH THE HANDOFF TAKES AWAY. The
              * one deviation from the rule in the app, and it is about what
              * this app has that the board was not drawn against: `/player` is
              * the ONLY route to `/player` → `/entry`, and `/entry` is the only
              * way to correct a cash-out typed wrong. The ledger is
              * append-only, so a correction is the mechanism rather than a
              * convenience; the roster opens `/member`, the club record, not
              * the night's card. Dropping the chevron here does not tidy a
              * finished row, it strands the fix for the most expensive typo of
              * the evening. `docs/screens.md` carries it and the question.
              */}
            <PlayerGroup label="Cashed out" count={out}>
              {gone.map((p) => (
                <FinishedSlab
                  key={p.id}
                  name={p.name}
                  fact={goneFact(cashedOutAt(night, p.id), p.cashedOut)}
                  result={resultBeforeDeductions(p.boughtIn, p.cashedOut)}
                  fits={ROW_FITS}
                  {...(drawer ? {} : {
                    opens: () => router.push({ pathname: '/player', params: { id: p.id } }),
                  })}
                />
              ))}
            </PlayerGroup>
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

/**
 * WHAT FINISHED THEM — `23:15 · out $2,120`.
 *
 * No `in $500`: the buy-in has its own column on the rows above this group, the
 * slab is a single line, and what a reader wants from a settled row is when
 * they left, what they left with, and the result at the right.
 */
const goneFact = (at: string | undefined, cashedOut: Money): string => {
  const out = `out ${formatToFit(cashedOut, ROW_FITS)}`;
  return at === undefined ? out : `${clockLabel(at)} · ${out}`;
};

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

  /*
   * `11.5 / 700 / .1em`, muted, uppercase, `0 2px 8px`, and 20 above it — the
   * doc's Tonight scale, which is deliberately not E2's: this screen's rows
   * are 17 and 19 against E2's 15.5 and 18, and a header shared between them
   * would be half a point wrong on one of the two.
   */
  groupLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.15,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  groupAfter: { paddingTop: 20 },

  /*
   * `14px 2px` ACTIVE, `11px 2px` SETTLED — the settled row is shorter by 3
   * points a side because it is taller by a sub-line, so the two states end up
   * within a few points of each other and the list does not visibly jolt when
   * somebody cashes out and their row changes group.
   *
   * A HAIRLINE UNDER EVERY ROW, the last one included. The doc says every row;
   * the list is two groups now, so "all but the last" would have to mean all
   * but the last of each — and a group ending on nothing, 20 points above the
   * next header, reads as the list having stopped.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowSettled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flexShrink: 1, minWidth: 0, gap: 3 },
  name: { ...type.tableName, flexShrink: 1 },
  /* 12/400 muted and tabular. It carries the two figures behind the signed one
     beside it, so it is the row's substantive line and takes the muted token
     rather than the dim one — `05-active-vs-settled.md` § Contrast. */
  sub: { fontSize: 12, fontWeight: '400', fontVariant: ['tabular-nums'] },
  /* NEVER SHRINKS. The name gives — it is a word — and a figure may not: left
     to shrink, "+$1,620" comes apart into a sign on one line and an amount on
     the next. See B18. */
  amount: { ...type.tableAmount, marginLeft: 'auto', flexShrink: 0 },

  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.page },
  blankTitle: { fontSize: 19, fontWeight: '700' },
  blankBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, textAlign: 'center', maxWidth: 250 },
});
