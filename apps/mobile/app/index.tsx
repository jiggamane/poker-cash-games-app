import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { type Money } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { useTheme, useThemeName } from '../src/design/useTheme';
import { L, LOOK_SCALE, z } from '../src/design/scale';
import { unscaledLabel } from '../src/design/tokens';
import { SPOTS, type SpotPlace } from '../src/art/spots';
import { Spot } from '../src/components/Spot';
import { formatNightDate } from '../src/lib/myStats';
import { Icon, type IconName } from '../src/components/Icon';
import { useClub, type Club } from '../src/lib/clubStore';
import { useElapsed } from '../src/lib/elapsed';
import { useOnline } from '../src/lib/online';
import { useNotice } from '../src/lib/handover';
import { canTakeGame, membershipOf } from '../src/lib/membership';
import { useMemberships } from '../src/lib/membershipStore';
import { PassCard } from '../src/components/PassCard';
import { toggleTheme } from '../src/lib/themeStore';
import {
  openNightById,
  useLedger,
  useNight,
  useMyNights,
  useOpenGames,
  type OpenGame,
} from '../src/lib/nightStore';

/**
 * Club home — the root, and the only screen in the app with no back button.
 * Built from the club-home handoff; `docs/home-handoff.md` records what the
 * app could not honour and why.
 *
 * THE SHAPE OF THE SCREEN, top to bottom: who this is (eyebrow, club name,
 * and the offline line when there is one) · the game or the invitation to
 * start one · four destinations as a two-by-two grid of tiles · ONE flexible
 * spacer · the dock.
 *
 * THE SPACER IS THE WHOLE LAYOUT RULE. A tile is intrinsic height — 108pt, two
 * rows of them with 10 between — and never stretches; every leftover point on
 * a tall screen goes into the single `flex: 1` between the grid and the dock.
 * Spread that slack into the tiles instead and the screen looks fine on the
 * phone it was built on and pushes content under the fold on every other one.
 *
 * THE GRID REPLACED THREE ROWS ON 25 OCTOBER — the canvas "Odds and rules,
 * where they live", board N6, the owner's pick — so that Poker tools (the
 * calculator and the rules library) could join the main navigation without a
 * fifth row. It costs 226pt where the rows cost 222; `docs/home-handoff.md`
 * § "The grid" has the arithmetic and what the handoff said instead.
 *
 * THE CARD LIST IS THE ONE THING THAT SCROLLS — doc 10 § H3, "past three live
 * cards the card list scrolls; the rows and dock stay put". It is the only
 * block here whose height is unbounded: the header is three lines, the grid
 * is two fixed 108s and the dock is one, but a club can open a table and
 * then another, each card ~90pt, and the list grows with them. Every other
 * child of this column is intrinsic and refuses to shrink, so once the cards
 * outgrew the phone they simply pushed the rows and the dock off the bottom —
 * with nothing to scroll, because nothing on this screen scrolled.
 *
 * `flexShrink` is the fix, exactly as it is on `Sheet`: the scroller keeps
 * its content height while there is room (one game still sits directly under
 * the club name, where the boards draw it) and gives space back only when
 * there is none left, at which point it scrolls instead of overflowing.
 *
 * The header stays OUTSIDE it. A scroller that carries the club name is the
 * screen scrolling, which is the one thing `scripts/ui-audit.mjs` checks for
 * and `Screen` exists to prevent: the name is what says which club this is.
 *
 * WHAT IS NOT HERE. No "Last night" card: a settled night is history the
 * moment it is settled, and history is a list, not the top of the home screen.
 * No figure beside My stats — a number there is a result before the reader
 * asked for one, and it is wrong as often as it is right. No tab bar, no
 * full-width buttons. (The handoff also said no icon-only controls; the
 * invite button in the dock is one since 25 October, by the owner's call —
 * see `RoundButton`.)
 */
export default function ClubHome() {
  const t = useTheme();
  const themeName = useThemeName();
  const club = useClub();
  const night = useNight();
  const ledger = useLedger();
  const online = useOnline();

  /*
   * WHO IS READING. The admin of a club is the person whose phone opened it,
   * so a reader is the host unless the club positively says somebody else is.
   * A power the reader does not have is REMOVED, not disabled: a member sees
   * no start affordance at all rather than a greyed-out one.
   */
  const admin = club?.members.find((m) => m.standing === 'admin');
  const meId = night?.meId;
  const host = admin === undefined || meId === undefined || admin.id === meId;

  /*
   * ONE CARD PER GAME. A club can have two tables going at once, so this is a
   * list and not a night: the store hands back every game that is not settled,
   * newest first, each with the figures already resolved through the engine.
   * Tapping one makes it the table every screen below home is about.
   */
  const games = useOpenGames();

  /* A game arriving, or going, while the reader is here — state 9b. */
  const notice = useNotice();
  /*
   * WHETHER THIS PHONE MAY OPEN A GAME — `membership.ts`, the seam, fed by the
   * server since 0021 (`useMemberships` asks, and re-renders when the answer
   * lands; until it does the seam answers yes). State 16: after a night
   * closes, a lapsed membership is one line on the start row and the gate
   * behind it. Home is the screen that warms the answer, so O1 — which reads
   * it once, synchronously, to decide whether to gate — finds it there.
   */
  useMemberships(null);
  const mayOpen = admin === undefined || canTakeGame(membershipOf(admin));

  // H8 · first paint. The club is known long before the night is read off the
  // database, so everything known paints immediately and only the unknown
  // block is a skeleton — in the exact geometry the card will take.
  const loading = night === null || ledger === null;

  // H5 · a club with nobody in it yet has never played and has no rules to
  // inherit, so the card asks for the first session rather than the next one.
  const fresh = club !== null && club.members.length <= 1 && !loading && games.length === 0;

  const mine =
    ledger === null || meId === undefined
      ? null
      : ((ledger.boughtInByPlayer.get(meId) ?? 0) as Money);

  /*
   * THE FULL BOARD (`home`, `home-live`, `home-first`, `home-member`,
   * `home-unsettled`, `home-pass`, `plan-lapsed`, all approved): the group on
   * the ink top, one sheet rising over it with the game as the ink card and
   * the four destinations as lifted tiles carrying their drawings, and the
   * ink bar at the foot holding Settings, the invite and the theme.
   */
  const insets = useSafeAreaInsets();
  const mine2 = useMyNights();
  const last = mine2.find((n) => n.played) ?? mine2[0];
  const members = club?.members.length ?? 0;

  return (
    <View
      // Home does not use `Screen`, so it carries the marks itself — see
      // scripts/ui-frames.mjs.
      nativeID="app-root"
      /* The ink under everything: the sheet is the ground laid over it, and the
         ink bar at the foot sits on a strip of the ground of its own. */
      style={[styles.screen, { backgroundColor: t.top }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + z(8) }]}>
        <Text style={[styles.eyebrow, { color: t.onTopMuted }]} numberOfLines={1}>
          {host ? 'Your group' : `Hosted by ${admin?.name ?? '—'}`}
        </Text>

        {club === null ? (
          <Skeleton width="70%" height={z(27)} onInk />
        ) : (
          <Text
            nativeID="screen-title"
            style={[styles.clubName, { color: t.onTop }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {club.name}
          </Text>
        )}

        {/* H9 · the connection, and when the app last had one. It never counts
            a figure on from a guess; it says what it knows and when. */}
        {!online.ok && (
          <Text style={[styles.banner, { color: t.onTopMuted }]} numberOfLines={1}>
            {online.savedAt === null
              ? 'No connection · reconnecting'
              : `No connection · saved ${clock(online.savedAt)}, reconnecting`}
          </Text>
        )}
      </View>

      <View style={[styles.sheet, { backgroundColor: t.ground }]}>
        <ScrollView
          style={styles.cards}
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
        >
          {/* The announcement, first on the sheet — the board's `home-pass`. */}
          {notice !== null && <PassCard notice={notice} on="home" />}
          {loading ? (
            <CardSkeleton />
          ) : games.length === 0 ? (
            host ? (
              <StartCard club={club} fresh={fresh} lapsed={!mayOpen} />
            ) : null
          ) : (
            games.map((game) =>
              game.status === 'open' ? (
                <LiveCard
                  key={game.sessionId}
                  game={game}
                  /* A member's card names the night, the host's the table
                     (the board's `home-member` / `home-live`). */
                  title={!host && game.sessionId === night?.sessionId ? 'Tonight' : game.tableName}
                  /* The host reads what the ledger is doing; a member reads
                     what they are in for. With more than one table open the
                     line says what each costs, the thing that differs. */
                  meta={
                    !host && mine !== null && game.sessionId === night?.sessionId
                      ? `you’re in for ${formatMoney(mine)} · ${game.seated} at the table`
                      : games.length === 1
                        ? `${game.seated} at the table · the ledger is open`
                        : `${game.seated} at the table · ${game.buyIn === null ? '—' : formatMoney(game.buyIn)}`
                  }
                />
              ) : (
                <UnsettledCard key={game.sessionId} game={game} />
              ),
            )
            /* No "Start another game" while a night runs (owner, 24 November,
               the board's `home-live`). */
          )}

          {/* The four destinations, each with its drawing and one line of what is
              behind it (the board's tiles; the lines are the board's words). */}
          <View style={styles.grid}>
            <Tile place="group" name="The group" to="/players"
              sub={members <= 1 ? 'just you so far' : `${members} on the roster`} />
            <Tile place="sessions" name="Sessions" to="/games" waiting={fresh}
              sub={last === undefined ? 'none yet' : formatNightDate(last.startedAt, true).replace(',', '')} />
            <Tile place="stats" name="My stats" to="/stats" waiting={fresh} sub="across every group you play in" />
            <Tile place="tools" name="Poker tools" to="/tools" sub="calculator, rulings, boosters" />
          </View>
        </ScrollView>
      </View>

      {/* The ink bar, not an action: Settings, the invite, the theme (approved
          as drawn, 22 November — the kit's `barMenu`). */}
      <View style={{ backgroundColor: t.ground }}>
      <View style={[styles.dock, { backgroundColor: t.bar, paddingBottom: Math.max(insets.bottom, z(24)) }, t.barShadow !== 'none' && { boxShadow: t.barShadow }]}>
        <Pill icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        {host && (
          /*
           * ICON-ONLY, since 25 October — the owner's call on the canvas
           * ("use only an icon in all versions"). The label is the
           * accessibility name. `filled` while the club is fresh is kept: the
           * first thing a new host must do is still the one lit control.
           */
          <RoundButton
            icon="invite"
            label="Invite a player"
            filled={fresh}
            /* An invite has to reach the server. Offline it stays where it is
               and says so, because moving it would move everything beside it. */
            disabled={!online.ok}
            onPress={() => router.push('/players')}
          />
        )}
        <View style={styles.pushRight}>
          <ThemeButton showing={themeName} />
        </View>
      </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The cards
// ---------------------------------------------------------------------------

/**
 * H2 · a game being played: the ink card, a live dot before the title, the line
 * under it, the session drawing at the right. Tapping it opens Tonight.
 */
function LiveCard({ game, title, meta }: { game: OpenGame; title: string; meta: string }) {
  const t = useTheme();
  return (
    <InkCard label={`${title}, ${meta}`} onPress={() => void goTo(game.sessionId)}>
      <View style={styles.liveRow}>
        <View style={[styles.liveDot, { backgroundColor: t.liveDot }]} />
        <Text style={[styles.cardTitle, styles.shrink, { color: t.onFill }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={2}>
        {meta}
      </Text>
    </InkCard>
  );
}

async function goTo(sessionId: string, to = '/session'): Promise<void> {
  await openNightById(sessionId);
  router.push(to);
}

/** The card the whole screen is for: ink, with the session drawing at its right (the kit's `.cta`). */
function InkCard({ label, onPress, children }: { label?: string; onPress: () => void; children: ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.text, opacity: pressed ? 0.9 : 1 },
        t.name === 'light' && styles.cardShadow,
      ]}
    >
      <View style={styles.cardBody}>{children}</View>
      <View style={styles.cardArt}>
        <Spot place="session" level="home" width={76} height={76} onInk />
      </View>
    </Pressable>
  );
}

function StartCard({ club, fresh, lapsed }: { club: Club | null; fresh: boolean; lapsed: boolean }) {
  const t = useTheme();
  return (
    <InkCard onPress={() => router.push('/new-night')}>
      <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
        {fresh ? 'Start the first session' : 'Start a session'}
      </Text>
      <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={2}>
        {lapsed
          ? 'Your membership ended · renew to open one'
          : fresh
            ? 'You’ll set the buy-in and blinds once, here'
            : `${formatMoney(club?.defaultBuyIn ?? (0 as Money))} buy-in · same rules as last time`}
      </Text>
    </InkCard>
  );
}

/**
 * A night ended and not settled: the same ink card, saying how far the count
 * got, with Settle up as the one action on it (the board's `home-unsettled`).
 * Tapping the card opens the table; Settle up goes straight back to Count up.
 */
function UnsettledCard({ game }: { game: OpenGame }) {
  const t = useTheme();
  const left = game.played - game.counted;
  return (
    <InkCard label={`${game.tableName}, counting, not settled`} onPress={() => void goTo(game.sessionId)}>
      <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
        Counting · not settled
      </Text>
      <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={2}>
        {`ended ${game.endedAt === null ? '—' : clock(new Date(game.endedAt))} · ${
          left > 0 ? `${left} of ${game.played} stacks still uncounted` : 'every stack counted'
        }`}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Settle up ${game.tableName}`}
        hitSlop={10}
        onPress={() => void goTo(game.sessionId, '/count-up')}
        style={({ pressed }) => [styles.settle, { backgroundColor: t.onFill, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.settleLabel, { color: t.text }]}>Settle up</Text>
      </Pressable>
    </InkCard>
  );
}

function CardSkeleton() {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, boxShadow: t.lift, gap: z(8) }]}>
      <Skeleton width={z(124)} height={z(11)} />
      <Skeleton width={z(104)} height={z(21)} />
      <Skeleton width="66%" height={z(13)} />
    </View>
  );
}

function Skeleton({ width, height, onInk = false }: { width: number | `${number}%`; height: number; onInk?: boolean }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ width, height, borderRadius: 6, backgroundColor: onInk ? t.onTopFill : t.hairline }}
    />
  );
}

/**
 * A destination: a lifted tile, its name and one line, and its approved drawing
 * in the corner (the kit's `tile()` and `tileArt(place, 'home')`). A tile that
 * has nothing behind it yet (`waiting`, a fresh group) looks the same — its line
 * says so ("none yet") — and does not open.
 */
function Tile({
  place,
  name,
  sub,
  to,
  waiting = false,
}: {
  place: SpotPlace;
  name: string;
  sub: string;
  to: string;
  waiting?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={waiting ? 'text' : 'button'}
      accessibilityLabel={name}
      disabled={waiting}
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.surface, boxShadow: t.lift, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <TileArt place={place} />
      {/*
       * THE NAME IS READ WHOLE (B114). It sat in a fixed tile and grew with the
       * phone's text size, and "Poker tools" — the longest of the four, with 6%
       * to spare at 360 and 20% at 393 — came back off a phone as "Poker to…".
       * The tile is a box the board fixed, so the name does not grow
       * (`unscaledLabel`: it is already a 21–24 point heading), and if a font
       * still lands it wider than the tile it shrinks rather than ellipsises.
       * The sub-line under it keeps scaling: it may take a second line.
       * `data-whole` is what ui-audit's WHOLE pass measures.
       */}
      <Text
        style={[styles.tileName, { color: t.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        {...wholeName}
      >
        {name}
      </Text>
      <Text style={[styles.tileSub, { color: t.muted }]} numberOfLines={2}>
        {sub}
      </Text>
    </Pressable>
  );
}

/** The tile name's text props — see B114 in `Tile`. A const, because `dataSet` is web-only and not in TextProps. */
const wholeName = { ...unscaledLabel, dataSet: { ...unscaledLabel.dataSet, whole: '1' } } as const;

/** A drawing anchored by its own outline to a tile's bottom-right corner, 6 in (the kit's `tileArt`). */
function TileArt({ place }: { place: SpotPlace }) {
  const t = useTheme();
  const art = SPOTS[place];
  const [x, y, w, h] = art.box;
  const S = art.size.home * LOOK_SCALE;
  const k = S / 88;
  const inset = -6 * LOOK_SCALE;
  const right = -inset + (x - 4 + w) * k - S;
  const bottom = -inset + (y - 12 + h) * k - S;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -right, bottom: -bottom }}>
      <SvgXml xml={t.name === 'dark' ? art.dark : art.light} width={S} height={S} />
    </View>
  );
}

/** A control on the ink bar: white on the ink's own fill. */
function Pill({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: t.onTopFill, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} color={t.onBar} />
      <Text style={[styles.pillLabel, { color: t.onBar }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  filled = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  const ink = disabled ? t.onBarDead : filled ? t.text : t.onBar;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: filled && !disabled ? t.onBar : t.onTopFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={ink} />
    </Pressable>
  );
}

/** The theme in force, drawn: the sun in the light, the moon in the dark (the kit's `barMenu`). */
function ThemeButton({ showing }: { showing: 'dark' | 'light' }) {
  const t = useTheme();
  const next = showing === 'dark' ? 'light' : 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to the ${next} theme`}
      onPress={() => toggleTheme(showing)}
      style={({ pressed }) => [styles.round, { backgroundColor: t.onTopFill, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={showing === 'dark' ? 'moon' : 'sun'} color={t.onBar} />
    </Pressable>
  );
}

const clock = (at: Date): string =>
  at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1 },

  /* The ink top: the kit's `.eyebrow` and `h1.home`. */
  header: { paddingHorizontal: L.topPadH, paddingBottom: L.topPadBottom },
  eyebrow: { fontSize: z(13), lineHeight: z(17), marginBottom: z(4) },
  clubName: { fontFamily: 'head', fontSize: z(26), fontWeight: '700', lineHeight: z(27), letterSpacing: -0.52 * (z(26) / 26) },
  banner: { fontSize: z(12.5), marginTop: z(4) },

  /* The sheet, rising over the ink. */
  sheet: {
    flex: 1,
    marginTop: -L.sheetOverlap,
    borderTopLeftRadius: L.sheetRadius,
    borderTopRightRadius: L.sheetRadius,
    overflow: 'hidden',
  },
  cards: { flex: 1 },
  cardList: { paddingHorizontal: z(18), paddingTop: z(18), paddingBottom: z(18), gap: z(12) },

  /* The kit's `.cta`. */
  card: {
    borderRadius: L.cardRadius,
    paddingVertical: z(13),
    paddingLeft: z(18),
    paddingRight: z(18),
    minHeight: z(84),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardShadow: { boxShadow: '0px 1px 2px 0px rgba(20,26,42,0.25), 0px 12px 24px -12px rgba(20,26,42,0.55)' },
  cardBody: { flex: 1, minWidth: 0, paddingRight: z(76), gap: z(6) },
  cardArt: { position: 'absolute', right: z(6), bottom: 0 },
  cardTitle: { fontFamily: 'head', fontSize: z(21), fontWeight: '700', lineHeight: z(23) },
  cardMeta: { fontSize: z(13), lineHeight: z(17), opacity: 0.72 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: z(8) },
  liveDot: { width: z(8), height: z(8), borderRadius: z(4) },
  shrink: { flexShrink: 1 },
  settle: { alignSelf: 'flex-start', marginTop: z(6), paddingVertical: z(8), paddingHorizontal: z(14), borderRadius: z(10) },
  settleLabel: { fontFamily: 'head', fontSize: z(14), fontWeight: '700' },

  /* The kit's `.tiles` / `.tile`. */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: z(10) },
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    minHeight: z(128),
    borderRadius: L.cardRadius,
    paddingTop: z(10),
    paddingHorizontal: z(14),
    paddingBottom: z(14),
    overflow: 'hidden',
  },
  tileName: { fontFamily: 'head', fontSize: z(19), fontWeight: '700', lineHeight: z(21), letterSpacing: -0.19 },
  tileSub: { fontSize: z(11.5), lineHeight: z(15.5), marginTop: z(3), maxWidth: z(118) },

  /* The kit's `barMenu`. */
  dock: { flexDirection: 'row', alignItems: 'center', gap: z(10), paddingHorizontal: z(18), paddingTop: z(12) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: z(9), height: z(44), paddingHorizontal: z(18), borderRadius: 999 },
  pillLabel: { fontSize: z(15), fontWeight: '700' },
  round: { width: z(44), height: z(44), borderRadius: z(22), alignItems: 'center', justifyContent: 'center' },
  pushRight: { marginLeft: 'auto' },
});
