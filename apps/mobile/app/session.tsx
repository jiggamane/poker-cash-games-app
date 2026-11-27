import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '../src/components/Text';
import { resolveLedger, resultBeforeDeductions, type Money } from '@poker-club/core';
import {
  formatMoney,
  formatSignedToFit,
  formatToFit,
  formatToFitUnmarked,
} from '../src/lib/money';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { NameTag, RebuyBar, TotalTag } from '../src/components/RebuyConfirmation';
import { Screen } from '../src/components/Screen';
import { ToolsButton } from '../src/components/ToolsButton';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure } from '../src/design/tokens';
import { L, z } from '../src/design/scale';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Spot } from '../src/components/Spot';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockLabel, useElapsed } from '../src/lib/elapsed';
import {
  cashedOutAt,
  defaultBuyIn,
  setStatus,
  standingsOf,
  useNight,
  type Standing,
} from '../src/lib/nightStore';
import { usePending } from '../src/lib/pending';
import { takeBack, useLate, useNotice, useRole, type Role } from '../src/lib/handover';
import { useIsAdmin } from '../src/lib/whoIsReading';
import { useClub } from '../src/lib/clubStore';
import { useSession } from '../src/lib/useSession';
import { explainServerError, isSupabaseConfigured } from '../src/lib/supabase';
import { HoldButton } from '../src/components/HoldButton';
import { PassCard } from '../src/components/PassCard';

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

/** The board's `gap 10` between the *On the table* figure and a rebuy's tag. */
const FIGURE_TAG_GAP = 10;

export default function Session() {
  const t = useTheme();
  const night = useNight();
  /* N11: entries this phone has written and nobody else can see yet. Asked
     for by session so a second table's queue is not counted onto this one. */
  const pending = usePending(night?.sessionId);
  const late = useLate(night?.sessionId);
  const [drawer, setDrawer] = useState(false);

  /*
   * WHO IS READING, AND WHO IS RECORDING — `design/handoff-game-admin/` § 06.
   *
   * Every phone looking at Tonight says which it is: the admin records, and
   * everybody else — a claimed player who pulled the night, the phone that
   * passed it away — watches. `useIsAdmin` is the phone's own answer (the
   * club's admin row, or the hold on a night that changed hands); `useRole` is
   * the server's, which names the recorder and the last hand-off, and it is
   * what turns "Watching" into "Watching · passed to Lena at 23:10".
   */
  const admin = useIsAdmin();
  const role = useRole(night?.sessionId);
  const club = useClub();
  const { who } = useSession();
  const notice = useNotice(night?.sessionId);
  const [trouble, setTrouble] = useState<string | null>(null);

  /*
   * HOW MUCH ROOM THE MONEY CARD HAS BESIDE ITS FIGURE, measured rather than
   * assumed — and only the rebuy's `+$500` tag reads it.
   *
   * The card's left column is `flex: 1`, so the row below reports the width
   * actually available; the figure reports its own. Neither measurement moves
   * when the tag appears — the figure does not shrink and the right column does
   * not — so there is no loop here, just two numbers the tag is held against.
   * `TotalTag` carries the arithmetic and what it costs on a 360 phone.
   */
  const hidden = useHidden();
  const insets = useSafeAreaInsets();
  const [figureRoom, setFigureRoom] = useState(0);
  const [figureWidth, setFigureWidth] = useState(0);

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

  /* The night is elsewhere: another phone records it and this one reads. */
  const away = night.hold === 'away';
  /* Somebody who can record, on the phone that records. */
  const recording = admin && !away;
  const recorder = role?.recorder ?? club?.members.find((m) => m.standing === 'admin')?.name ?? null;
  /* Whether this phone may take the game back: it passed the game away (the
     last hand-off is a pass, and this phone is the one watching it), or it
     hosts the book. The server refuses anybody else, and says so. */
  const canTakeBack =
    away && role !== undefined && (role.host || role.last?.kind === 'passed');
  /* Passing needs a server and somebody to be: nothing is passed through thin
     air, and a sample night has nothing on the server to pass. */
  const canPass = recording && isSupabaseConfigured && !night.seeded && who.kind !== 'nobody';

  async function reclaim() {
    try {
      setTrouble(null);
      await takeBack(night!.sessionId);
    } catch (e) {
      setTrouble(explainServerError(e));
    }
  }

  /* Each seated player's share of the pot, for the bar under it on the ink. */
  const shares = seated.map((p) => p.boughtIn as number).filter((n) => n > 0);

  /*
   * THE FULL BOARD (`session`, `session-admin`, `session-hidden`,
   * `session-rebuy-undo`, `session-empty`, `session-watching`,
   * `session-passed`, `session-takenback`, all approved): the pot moves onto
   * the ink top with a bar of who holds it; the sheet holds the two groups as
   * cards (no chevrons), with the eye that hides every figure on the sheet; the
   * dock is the ink bar. A phone that does not record has no bar: the sheet
   * runs to the foot and ends in the read-only line, or in the hold that takes
   * the game back.
   */
  return (
    <Screen
      title="Tonight"
      backTo="the club"
      /* The tag sits at the RIGHT EDGE of the title row rather than beside the
         title: it is the state of the night, not part of its name, and the
         corner is where a reader looks for state. */
      trailing={<LiveTag startedAt={night.startedAt} empty={empty} />}
      metaNode={
        <RoleLine
          recording={recording}
          away={away}
          role={role}
          recorder={recorder}
          startedAt={night.startedAt}
          empty={empty}
        />
      }
      /* The poker tools at the right end of the role line — the same spot on
         the recording phone and a watcher's, by the owner's decision of 25
         October, and NOT a row in the drawer, whose every control records
         money. `ToolsButton` has the rest. */
      metaTrailing={<ToolsButton />}
      onInk={
        <View style={styles.hero}>
          <Text style={[styles.heroLabel, { color: t.onTopMuted }]}>On the table</Text>
          <View style={styles.heroRow}>
            <View
              style={styles.figureRow}
              onLayout={(e) => setFigureRoom(e.nativeEvent.layout.width)}
            >
              <Text
                style={[styles.heroFigure, { color: t.onTop }]}
                numberOfLines={1}
                onLayout={(e) => setFigureWidth(e.nativeEvent.layout.width)}
                {...cappedFigure}
              >
                {formatToFit(onTable, CARD_FITS)}
              </Text>
              <TotalTag onInk fits={CARD_FITS} room={figureRoom - figureWidth - FIGURE_TAG_GAP} />
            </View>
            <View style={styles.heroSide}>
              {/* `in play`, not `total in` — 5 September, on the owner's
                  instruction: one word for this figure everywhere it is drawn.
                  `On the table` beside it is a DIFFERENT figure — what the
                  seated players still have in front of them. No
                  `numberOfLines`: B99, this is the line that reflows. */}
              {totalIn !== onTable && (
                <Text style={[styles.heroSideLine, { color: t.onTopMuted }]} {...cappedFigure}>
                  {formatToFit(totalIn, CARD_FITS)} in play
                </Text>
              )}
              <Text style={[styles.heroSideLine, { color: t.onTopMuted }]}>
                {empty
                  ? 'nobody seated'
                  : out === 0
                    ? `${seated.length} seated`
                    : `${seated.length} seated · ${out} out`}
              </Text>
            </View>
          </View>
          {shares.length > 0 && (
            <View style={styles.shares} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {shares.map((n, i) => (
                <View key={i} style={[styles.share, { flex: n, backgroundColor: i % 2 === 0 ? t.onTop : t.onTopMuted }]} />
              ))}
            </View>
          )}
        </View>
      }
      scroll={false}
      /* Not dimmed while the drawer is open: the board's `session-admin` keeps
         the sheet as it is and lets the drawer rise over it. */
      footerPad={false}
      footer={
        !recording ? (
          <View style={styles.band}>
            {away && role?.last?.kind === 'passed' && !role.last.opened ? (
              <View style={styles.bandWords}>
                {/* 7 · the game is theirs on the server and their phone has
                    not opened it. Nobody records in the gap. Outlined in the
                    text colour: the look has no amber (the board flags it). */}
                <View style={[styles.pendingPill, { borderColor: t.text }]}>
                  <Text style={[styles.pendingLabel, { color: t.text }]}>
                    {`WAITING ON ${(role.last.toName ?? 'them').toUpperCase()}`}
                  </Text>
                </View>
                <Text style={[styles.bandText, { color: t.muted }]}>
                  {waitingLine(role.last.toName)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.bandText, styles.bandWords, { color: t.muted }]}>
                {trouble ?? bandLine(away, role, recorder)}
              </Text>
            )}
            {/* The hold that takes the game back is this phone's one action,
                so it is the bar (the board's `session-passed`). */}
            {canTakeBack ? (
              <HoldButton
                variant="bar"
                label="Take the game back"
                sub="Hold 1.5s · this phone records again"
                onComplete={() => void reclaim()}
              />
            ) : (
              <View style={{ height: insets.bottom }} />
            )}
          </View>
        ) : (
        <>
          {/*
           * N12 · changes from another phone, waiting to be reviewed. Above the
           * dock because it is about what the dock records, and on the sheet.
           */}
          {late.toReview > 0 && (
            <View style={styles.lateSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${late.toReview} changes from another phone. Review.`}
                onPress={() => router.push('/late-changes')}
                style={({ pressed }) => [styles.late, { backgroundColor: t.surface, boxShadow: t.lift, opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={[styles.countPill, { backgroundColor: t.text }]}>
                  <Text style={[styles.countLabel, { color: t.onFill }]}>{late.toReview}</Text>
                </View>
                <Text style={[styles.lateLine, { color: t.text }]} numberOfLines={1}>
                  {`${late.toReview === 1 ? 'change' : 'changes'} from another phone`}
                </Text>
                <Text style={[styles.review, { color: t.text }]}>Review</Text>
              </Pressable>
            </View>
          )}
          <RebuyBar />
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
            /* Money rules from Tonight: 09-navigation names Tonight as a way
               into tonight's rules, and no other control on this screen is
               one. Kept against `design/handoff-game-admin/`; `docs/screens.md`
               has it. */
            onRules={() => {
              setDrawer(false);
              router.push('/money-rules');
            }}
            /* Only a recording phone with an account and a server can pass:
               the sheet lists the group; the server moves the night. */
            {...(canPass
              ? {
                  onPass: () => {
                    setDrawer(false);
                    router.push('/pass-game');
                  },
                }
              : {})}
            onEnd={() => {
              setDrawer(false);
              void setStatus('counting');
              router.push('/count-up');
            }}
          />
        </>
        )
      }
    >
      {/* With the drawer open the sheet steps back and a tap anywhere on it
          closes the drawer. */}
      <PressableOrPlain
        wrap={drawer}
        onPress={() => setDrawer(false)}
        style={styles.body}
      >
        {empty ? (
          <View style={styles.blank}>
            {notice !== null && <PassCard notice={notice} on="tonight" />}
            <Spot place="session" level="sheet" width={110} height={96} />
            <Text style={[styles.blankTitle, { color: t.text }]}>Nobody has bought in yet</Text>
            {/* The small lines are gone (owner, 24 November, on the board's
                `session-empty`); the way on is the lifted Add players button,
                which seats the first player as the bar's Seat a player does. */}
            {recording && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/seat')}
                style={({ pressed }) => [styles.addPlayers, { backgroundColor: t.text, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.addPlayersLabel, { color: t.onFill }]}>Add players</Text>
                <View style={[styles.addPlus, { backgroundColor: t.onFill }]}>
                  <Icon name="plus" color={t.text} size={z(16)} />
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!drawer}
          >
            {/* The announcement, first on the sheet (the board's
                `session-takenback`). */}
            {notice !== null && <PassCard notice={notice} on="tonight" />}

            <SectionLabel
              text={`Still playing · ${seated.length}`}
              right={<HideControl hidden={hidden} />}
            />
            <Card>
              {seated.map((p, i) => (
                <CardRow
                  key={p.id}
                  name={p.name}
                  last={i === seated.length - 1}
                  {...(drawer || !recording ? {} : {
                    onPress: () => router.push({ pathname: '/player', params: { id: p.id } }),
                  })}
                  trail={
                    <View style={styles.amountCell}>
                      {/* The rebuy's own figure beside the name's total, for the
                          life of the confirmation. */}
                      <NameTag playerId={p.id} fits={ROW_FITS} />
                      {hidden ? (
                        <Dots />
                      ) : (
                        <Text style={[styles.amount, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
                          {formatToFit(p.boughtIn, ROW_FITS)}
                        </Text>
                      )}
                    </View>
                  }
                />
              ))}
            </Card>

            {out > 0 && (
              <>
                <SectionLabel text={`Cashed out · ${out}`} />
                <Card>
                  {gone.map((p, i) => {
                    const result = resultBeforeDeductions(p.boughtIn, p.cashedOut);
                    const at = cashedOutAt(night, p.id);
                    return (
                      <CardRow
                        key={p.id}
                        name={p.name}
                        last={i === gone.length - 1}
                        meta={hidden ? `${at === undefined ? '' : `${clockLabel(at)} · `}out ••••` : goneFact(at, p.cashedOut)}
                        {...(drawer || !recording ? {} : {
                          onPress: () => router.push({ pathname: '/player', params: { id: p.id } }),
                        })}
                        trail={
                          hidden ? (
                            <Dots />
                          ) : (
                            <Text
                              style={[styles.amount, { color: result === 0 ? t.muted : moneyColor(t, result) }]}
                              numberOfLines={1}
                              {...cappedFigure}
                            >
                              {formatSignedToFit(result, ROW_FITS)}
                            </Text>
                          )
                        }
                      />
                    );
                  })}
                </Card>
              </>
            )}
          </ScrollView>
        )}
      </PressableOrPlain>
    </Screen>
  );
}

/*
 * HIDING THE MONEY (owner, 22 November; Tonight only, display only — owner,
 * 24 November: "this should be available on the tonight screen only and this
 * relates to only the visual display of sums, doesn't affect anything else").
 * Every figure on the sheet becomes four dots — never the real figure blurred,
 * so a screenshot gives nothing away; the pot on the ink stays. The choice is
 * this phone's and lasts until Show is tapped (for the life of the app).
 */
let hiddenNow = false;
const hiddenListeners = new Set<() => void>();
function setHidden(next: boolean) {
  hiddenNow = next;
  hiddenListeners.forEach((l) => l());
}
function useHidden(): boolean {
  return useSyncExternalStore(
    (l) => {
      hiddenListeners.add(l);
      return () => hiddenListeners.delete(l);
    },
    () => hiddenNow,
  );
}

/** The eye shows what a tap will do (owner, 23 November): the struck eye and Hide while the money shows, the open eye and Show while it is hidden. */
function HideControl({ hidden }: { hidden: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
      hitSlop={10}
      onPress={() => setHidden(!hidden)}
      style={({ pressed }) => [styles.hide, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Eye open={hidden} color={t.muted} />
      <Text style={[styles.hideWord, { color: t.muted }]}>{hidden ? 'Show' : 'Hide'}</Text>
    </Pressable>
  );
}

function Eye({ open, color }: { open: boolean; color: string }) {
  const size = z(17);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <Circle cx={12} cy={12} r={2.8} />
      {!open && <Path d="M4 20L20 4" />}
    </Svg>
  );
}

/** A hidden figure: four dots in the muted grey (the owner's pick of five placeholders). */
function Dots() {
  const t = useTheme();
  return (
    <View style={styles.dots} accessibilityLabel="hidden">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.dotsDot, { backgroundColor: t.muted }]} />
      ))}
    </View>
  );
}

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

/**
 * The role line — `design/handoff-game-admin/` § 2 and § 4, on the Chrome A
 * meta line: "You’re recording · started 20:05", "Watching · Lena is
 * recording", "Watching · passed to Lena at 23:10". The first word is what
 * tells the three phones apart, so it is 600 in the text colour and never
 * truncates; nor does the time. A long name gives, with an ellipsis, and the
 * line never wraps — at 360 it has 272 points and "Watching · passed to
 * Aleksandra at 23:10" measures about 244.
 */
function RoleLine({
  recording,
  away,
  role,
  recorder,
  startedAt,
  empty,
}: {
  recording: boolean;
  away: boolean;
  role: Role | undefined;
  recorder: string | null;
  startedAt: string;
  empty: boolean;
}) {
  const t = useTheme();
  if (recording) {
    return (
      <Text style={[styles.role, styles.roleLine, { color: t.onTopMuted }]} numberOfLines={1}>
        <Text style={[styles.roleLead, { color: t.onTop }]}>You’re recording</Text>
        {` · ${empty ? 'opened' : 'started'} ${clockLabel(startedAt)}`}
      </Text>
    );
  }
  /* The phone that passed the game away: who it went to, and when (20c). */
  if (away && role?.last?.kind === 'passed') {
    return (
      <View style={styles.roleRow}>
        <Text style={[styles.roleLead, { color: t.onTop }]}>Watching</Text>
        <Text style={[styles.role, { color: t.onTopMuted }]}> · passed to </Text>
        <Text style={[styles.roleName, { color: t.onTopMuted }]} numberOfLines={1}>
          {role.last.toName ?? 'them'}
        </Text>
        <Text style={[styles.role, { color: t.onTopMuted }]}>{` at ${clockLabel(role.last.at)}`}</Text>
      </View>
    );
  }
  /* Anyone else: a claimed player, the phone a game was taken back from (20b). */
  return (
    <View style={styles.roleRow}>
      <Text style={[styles.roleLead, { color: t.onTop }]}>Watching</Text>
      <Text style={[styles.role, { color: t.onTopMuted }]}> · </Text>
      <Text style={[styles.roleName, { color: t.onTopMuted }]} numberOfLines={1}>
        {recorder ?? 'Another phone'}
      </Text>
      <Text style={[styles.role, { color: t.onTopMuted }]}> is recording</Text>
    </View>
  );
}

/**
 * The band's line under a night this phone does not record.
 *
 *   8   the phone that passed it: "Lena is recording. Every entry she makes
 *       shows here as she makes it." — drawn with THEY, not she: the app does
 *       not know anybody's pronouns and the board's copy assumes Lena's.
 *   11, 20b  everyone else: X1's line, "Read-only. Only Lena can write to the
 *       ledger."
 *
 * A recorder with no seat in the group has no name; the line then says "the
 * host", as X1 does.
 */
function bandLine(away: boolean, role: Role | undefined, recorder: string | null): string {
  if (away && role?.last?.kind === 'passed') {
    const name = role.last.toName;
    return name === null
      ? 'Another phone is recording. Every entry it makes shows here as it is made.'
      : `${name} is recording. Every entry they make shows here as they make it.`;
  }
  return recorder === null
    ? 'Read-only. Only the host can write to the ledger.'
    : `Read-only. Only ${recorder} can write to the ledger.`;
}

/** State 7's line, with THEY for the same reason as above. */
const waitingLine = (name: string | null): string =>
  name === null
    ? 'The game is theirs. It opens on their phone the next time they look at the app. Until then nothing new is recorded.'
    : `The game is ${name}’s. It opens on their phone the next time they look at the app. Until then nothing new is recorded.`;

function LiveTag({ startedAt, empty }: { startedAt: string; empty: boolean }) {
  const t = useTheme();
  // Ticks itself. It used to be computed once per render, which on this screen
  // meant it moved only when the host recorded something — a figure that sat
  // still for twenty minutes and then jumped, beside a green dot saying the
  // night was live.
  const running = useElapsed(startedAt);
  return (
    /* On the ink: white on the ink's own fill, the dot the live green (the kit's `tpill`). */
    <View style={[styles.tag, { backgroundColor: t.onTopFill }]}>
      <View style={[styles.dot, { backgroundColor: t.liveDot }]} />
      <Text style={[styles.tagText, { color: t.onTop }]}>
        {empty ? 'just opened' : running}
      </Text>
    </View>
  );
}

/**
 * WHAT FINISHED THEM — `23:15 · out 2,120`.
 *
 * No `in $500`: the buy-in has its own column on the rows above this group, the
 * slab is a single line, and what a reader wants from a settled row is when
 * they left, what they left with, and the result at the right.
 *
 * UNMARKED, because of that last one: the stack they left with is what the
 * result beside it is made of, and the result carries the mark. The rule is in
 * `money.ts`, and Count up draws the same fact the same way.
 */
const goneFact = (at: string | undefined, cashedOut: Money): string => {
  const out = `out ${formatToFitUnmarked(cashedOut, ROW_FITS)}`;
  return at === undefined ? out : `${clockLabel(at)} · ${out}`;
};

const styles = StyleSheet.create({
  body: { flex: 1 },

  /* The pot on the ink (the kit's `topHero`). */
  /* The kit's 14 above the pot, less the meta row's own floor of 10 (B68). */
  hero: { paddingTop: z(14) - 10, paddingHorizontal: z(2), paddingBottom: z(2) },
  heroLabel: { fontSize: z(12.5), fontWeight: '500' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: z(10), marginTop: z(4) },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: FIGURE_TAG_GAP, flexGrow: 1, flexShrink: 0, flexBasis: 'auto', minWidth: 0 },
  heroFigure: { fontFamily: 'head', fontSize: z(40), fontWeight: '700', lineHeight: z(42), letterSpacing: -1.2 * (z(40) / 40), fontVariant: ['tabular-nums'] },
  heroSide: { alignItems: 'flex-end', flexShrink: 1, minWidth: 0 },
  heroSideLine: { fontSize: z(12), lineHeight: z(18), textAlign: 'right' },
  shares: { flexDirection: 'row', gap: 3, height: 3, marginTop: z(12) },
  share: { borderRadius: 1.5 },

  /* The sheet. */
  list: { flex: 1 },
  listContent: { paddingHorizontal: z(18), paddingTop: z(12), paddingBottom: z(18), gap: z(12) },
  amountCell: { flexDirection: 'row', alignItems: 'center', gap: z(8), flexShrink: 0 },
  amount: { fontFamily: 'head', fontSize: z(16.5), fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },
  hide: { flexDirection: 'row', alignItems: 'center', gap: z(6) },
  hideWord: { fontSize: z(12.5), fontWeight: '600', letterSpacing: 0 },
  dots: { flexDirection: 'row', gap: z(4), alignItems: 'center', height: z(18) },
  dotsDot: { width: z(6), height: z(6), borderRadius: z(3) },

  /* Nobody seated (the board's `session-empty`). */
  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(16), paddingHorizontal: z(24) },
  blankTitle: { fontFamily: 'head', fontSize: z(26), fontWeight: '700', lineHeight: z(29), textAlign: 'center', maxWidth: z(220) },
  addPlayers: { flexDirection: 'row', alignItems: 'center', gap: z(12), paddingLeft: z(22), paddingRight: z(10), height: z(54), borderRadius: L.cardRadius, boxShadow: '0px 12px 24px -12px rgba(20,26,42,0.55)' },
  addPlayersLabel: { fontFamily: 'head', fontSize: z(18), fontWeight: '700' },
  addPlus: { width: z(32), height: z(32), borderRadius: z(16), alignItems: 'center', justifyContent: 'center' },

  /* A phone that does not record: the read-only line, or the wait, at the foot. */
  band: { flexShrink: 0 },
  bandWords: { paddingTop: z(14), paddingBottom: z(14), paddingHorizontal: z(18), gap: z(10) },
  bandText: { fontSize: z(13), fontWeight: '400', lineHeight: z(19) },
  pendingPill: { alignSelf: 'flex-start', paddingVertical: z(4), paddingHorizontal: z(8), borderRadius: 999, borderWidth: 1.5 },
  pendingLabel: { fontSize: z(10.5), fontWeight: '700', letterSpacing: 1.05 },

  /* N12 · changes from another phone. */
  lateSlot: { paddingHorizontal: z(18), paddingBottom: z(10) },
  late: { flexDirection: 'row', alignItems: 'center', gap: z(10), paddingVertical: z(10), paddingHorizontal: z(14), borderRadius: L.cardRadius },
  countPill: { minWidth: z(22), paddingVertical: 2, paddingHorizontal: z(7), borderRadius: 999, alignItems: 'center' },
  countLabel: { fontSize: z(11), fontWeight: '700', fontVariant: ['tabular-nums'] },
  lateLine: { fontSize: z(14), fontWeight: '600', flexShrink: 1 },
  review: { fontSize: z(14), fontWeight: '700', marginLeft: 'auto' },

  /* The role line — § 4: 500 13, tabular, the first word 600 in the text
     colour, one line that never wraps. The name is the one part that gives. */
  roleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 },
  role: { fontSize: z(13), fontWeight: '500', fontVariant: ['tabular-nums'] },
  roleLine: { flexShrink: 1, minWidth: 0 },
  roleLead: { fontSize: z(13), fontWeight: '600' },
  roleName: { fontSize: z(13), fontWeight: '500', flexShrink: 1 },

  /* The live tag on the ink (the kit's `tpill`). */
  tag: { flexDirection: 'row', alignItems: 'center', gap: z(7), paddingVertical: z(8), paddingHorizontal: z(12), borderRadius: 999 },
  dot: { width: z(7), height: z(7), borderRadius: z(3.5) },
  tagText: { fontFamily: 'head', fontSize: z(13), fontWeight: '700', fontVariant: ['tabular-nums'] },
});
