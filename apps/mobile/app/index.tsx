import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Money } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { useTheme, useThemeName } from '../src/design/useTheme';
import { home, radius, type } from '../src/design/tokens';
import { Icon, type IconName } from '../src/components/Icon';
import { useClub, type Club } from '../src/lib/clubStore';
import { useElapsed } from '../src/lib/elapsed';
import { useOnline } from '../src/lib/online';
import { useNotice } from '../src/lib/handover';
import { canTakeGame, membershipOf } from '../src/lib/membership';
import { PassCard } from '../src/components/PassCard';
import { toggleTheme } from '../src/lib/themeStore';
import {
  openNightById,
  useLedger,
  useNight,
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
 * THE SPACER IS THE WHOLE LAYOUT RULE. A tile is intrinsic height — 124pt, two
 * rows of them with 10 between — and never stretches; every leftover point on
 * a tall screen goes into the single `flex: 1` between the grid and the dock.
 * Spread that slack into the tiles instead and the screen looks fine on the
 * phone it was built on and pushes content under the fold on every other one.
 *
 * THE GRID REPLACED THREE ROWS ON 25 OCTOBER — the canvas "Odds and rules,
 * where they live", board N6, the owner's pick — so that Poker tools (the
 * calculator and the rules library) could join the main navigation without a
 * fifth row. It costs 258pt where the rows cost 222; `docs/home-handoff.md`
 * § "The grid" has the arithmetic and what the handoff said instead.
 *
 * THE CARD LIST IS THE ONE THING THAT SCROLLS — doc 10 § H3, "past three live
 * cards the card list scrolls; the rows and dock stay put". It is the only
 * block here whose height is unbounded: the header is three lines, the grid
 * is two fixed 124s and the dock is one, but a club can open a table and
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
  const live = games.filter((g) => g.status === 'open');

  /* A game arriving, or going, while the reader is here — state 9b. */
  const notice = useNotice();
  /*
   * WHETHER THIS PHONE MAY OPEN A GAME — `membership.ts`, the seam, which
   * answers yes for everybody today. State 16: after a night closes, a lapsed
   * membership is one line on the start row and the gate behind it.
   */
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

  return (
    <SafeAreaView
      // Home does not use `Screen`, so it carries the marks itself — see
      // scripts/ui-frames.mjs.
      nativeID="app-root"
      style={[styles.screen, { backgroundColor: t.ground }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: t.muted }]} numberOfLines={1}>
          {host ? 'Your group' : `Hosted by ${admin?.name ?? '—'}`}
        </Text>

        {club === null ? (
          <Skeleton width="70%" height={31.8} />
        ) : (
          <Text
            nativeID="screen-title"
            style={[styles.clubName, { color: t.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {club.name}
          </Text>
        )}

        {/* H9 · the connection, and when the app last had one. It never counts
            a figure on from a guess; it says what it knows and when. */}
        {!online.ok && (
          <Text style={[styles.banner, { color: t.amber }]} numberOfLines={1}>
            {online.savedAt === null
              ? 'No connection · reconnecting'
              : `No connection · saved ${clock(online.savedAt)}, reconnecting`}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.cards}
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <CardSkeleton />
        ) : games.length === 0 ? (
          host ? (
            <StartCard club={club} fresh={fresh} lapsed={!mayOpen} />
          ) : null
        ) : (
          <>
            {games.map((game) =>
              game.status === 'open' ? (
                <LiveCard
                  key={game.sessionId}
                  game={game}
                  /* One table and the card says what the ledger is doing;
                     two and it says what the table costs, because that is
                     the thing that now differs between them. */
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
            )}
            {host && <StartAnother open={live.length} />}
          </>
        )}
      </ScrollView>

      {/*
       * THE GRID — four destinations, two by two, since 25 October: the canvas
       * "Odds and rules, where they live", board N6, the owner's pick over the
       * three rows the club-home handoff drew (and over six other layouts on
       * the same canvas). The order is the owner's too: Sessions second, Poker
       * tools last. `Poker tools` is the one new destination — the calculator
       * and the rules library, which used to be reachable only from Settings.
       */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile icon="people" name="The group" sub="players, money rules, the piggy bank" to="/players" />
          <Tile
            icon="calendar"
            name="Sessions"
            sub="every night you played, most recent first"
            to="/games"
            waiting={fresh}
          />
        </View>
        <View style={styles.gridRow}>
          <Tile icon="bars" name="My stats" sub="across every group you play in" to="/stats" waiting={fresh} />
          <Tile icon="spadeCard" name="Poker tools" sub="poker calculator, rules & rulings" to="/tools" />
        </View>
      </View>

      {/* The only flexible thing on the screen. */}
      <View style={styles.slack} />

      {/* The announcement, above the Settings pill — 9b. A card in the page. */}
      {notice !== null && (
        <View style={styles.notice}>
          <PassCard notice={notice} on="home" />
        </View>
      )}

      <View style={styles.dock}>
        <Pill icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        {host && (
          /*
           * ICON-ONLY, since 25 October — the owner's call on the canvas
           * ("use only an icon in all versions"), against the handoff's rule
           * that a dock pill is never icon-only. The label is the
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// The cards
// ---------------------------------------------------------------------------

/**
 * H2 · a game being played.
 *
 * The status line is the only place the elapsed time appears, it counts up on
 * its own, and it never wraps and never truncates: "PLAYING NOW · 3H…" is
 * worse than no status at all.
 */
function LiveCard({ game, meta }: { game: OpenGame; meta: string }) {
  const t = useTheme();
  const running = useElapsed(game.startedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.tableName}, ${meta}`}
      onPress={() => void goTo(game.sessionId)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.text, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.cardStatus, { color: t.onFillWin }]} numberOfLines={1}>
          {`● Playing now · ${running}`}
        </Text>
        <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
          {game.tableName}
        </Text>
        <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.cardArrow}>
        <Icon name="arrow" color={t.onFill} />
      </View>
    </Pressable>
  );
}

/**
 * Open one of the club's tables.
 *
 * The store holds one night at a time and every screen below home reads it, so
 * choosing a card is a swap and then a push — never a push and then a swap, or
 * Tonight paints the table you were looking at a moment ago.
 */
async function goTo(sessionId: string, to = '/session'): Promise<void> {
  await openNightById(sessionId);
  router.push(to);
}

/**
 * H1 and H5 · no game running: the stakes are inherited, and the tap opens the
 * night. `lapsed` is state 16 of `design/handoff-game-admin/`: the membership
 * ran out, the card says so on its second line, and the tap opens the gate
 * (`/new-night` draws it). ⚠ The line is UNSURE on the board.
 */
function StartCard({ club, fresh, lapsed }: { club: Club | null; fresh: boolean; lapsed: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/new-night')}
      style={({ pressed }) => [
        styles.card,
        styles.cardIdle,
        { backgroundColor: t.text, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
          {fresh ? 'Start the first session' : 'Start a session'}
        </Text>
        <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={1}>
          {lapsed
            ? 'Your membership ended · renew to open one'
            : fresh
              ? 'You’ll set the buy-in and blinds once, here'
              : `${formatMoney(club?.defaultBuyIn ?? (0 as Money))} buy-in · same rules as last time`}
        </Text>
      </View>
      <View style={styles.cardArrow}>
        <Icon name="arrow" color={t.onFill} />
      </View>
    </Pressable>
  );
}

/**
 * H4 · a game that has ended and is not settled.
 *
 * It is never hidden, because it holds money — and it never blocks starting
 * another one either. Amber and unfilled: it is not the thing to do next
 * unless you are the one counting, and a second filled card would compete with
 * the live table beside it.
 */
function UnsettledCard({ game }: { game: OpenGame }) {
  const t = useTheme();
  const left = game.played - game.counted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.tableName}, counting, not settled`}
      onPress={() => void goTo(game.sessionId)}
      style={({ pressed }) => [
        styles.card,
        styles.cardUnsettled,
        { borderColor: t.amber, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardBody}>
        <View style={styles.statusRow}>
          <Icon name="clock" color={t.amber} size={13} />
          <Text style={[styles.cardStatus, { color: t.amber }]} numberOfLines={1}>
            Counting · not settled
          </Text>
          {/* The one action the card carries, and it is not where the card
              itself goes: tapping the card opens the table, this finishes it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Settle up ${game.tableName}`}
            hitSlop={10}
            onPress={() => void goTo(game.sessionId, '/count-up')}
            style={({ pressed }) => [styles.pushRight, styles.settle, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.settleLabel, { color: t.amber }]}>Settle up</Text>
            <Icon name="chevron" color={t.amber} size={13} />
          </Pressable>
        </View>
        <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>
          {game.tableName}
        </Text>
        <Text style={[styles.cardMetaQuiet, { color: t.muted }]} numberOfLines={1}>
          {`ended ${game.endedAt === null ? '—' : clock(new Date(game.endedAt))} · ${
            left > 0 ? `${left} of ${game.played} stacks still uncounted` : 'every stack counted'
          }`}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * "Start another game" — H2 and H3.
 *
 * A club can run a second table on the same night, so the start affordance is
 * NEVER hidden because a game is on. Dashed and secondary: it must be reachable
 * underneath the live card without competing with it.
 */
function StartAnother({ open }: { open: number }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/new-night')}
      style={({ pressed }) => [
        styles.secondary,
        { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.plus, { borderColor: t.dashed }]}>
        <Icon name="plus" color={t.text} size={13} />
      </View>
      <View style={styles.secondaryText}>
        <Text style={[styles.secondaryTitle, { color: t.text }]} numberOfLines={1}>
          Start another game
        </Text>
        <Text style={[styles.secondarySub, { color: t.muted }]} numberOfLines={1}>
          {open > 1 ? `${count(open)} tables are already open` : 'a second table, same rules'}
        </Text>
      </View>
      <View style={styles.pushRight}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

/** The drawn line counts in words, as the counting screen does. */
const count = (n: number): string =>
  ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

/**
 * H8 · what the card looks like before the night is read off the disk.
 *
 * Three blocks at the three type sizes with the card's own gaps between them,
 * so the card is exactly as tall now as it will be a moment from now and
 * nothing below it moves when the data lands.
 */
function CardSkeleton() {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface }]}>
      <Skeleton width={124} height={11} />
      <Skeleton width={104} height={21} />
      <Skeleton width="66%" height={13} />
    </View>
  );
}

function Skeleton({ width, height }: { width: number | `${number}%`; height: number }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ width, height, borderRadius: 6, backgroundColor: t.hairline }}
    />
  );
}

// ---------------------------------------------------------------------------
// The rows, and the dock
// ---------------------------------------------------------------------------

/**
 * A destination, as a tile — board N6 of the canvas "Odds and rules, where
 * they live", 25 October, which replaced the handoff's rows. The glyph sits
 * top-left in a 40 round, the name and its sub-line at the foot, so the two
 * never share a line: the first round of this layout put a 26pt glyph beside
 * a 24pt name and the owner turned it down for exactly that. No chevron — a
 * tile reads as a button on its own, which a row never quite did.
 *
 * `waiting` is a tile with nothing behind it yet. It states what it will hold
 * and does not navigate; it is never removed, because an empty tile is how a
 * reader learns the app has somewhere to put this.
 */
function Tile({
  icon,
  name,
  sub,
  to,
  waiting = false,
}: {
  icon: IconName;
  name: string;
  sub: string;
  to: string;
  waiting?: boolean;
}) {
  const t = useTheme();
  const ink = waiting ? t.disabled : t.text;
  return (
    <Pressable
      accessibilityRole={waiting ? 'text' : 'button'}
      accessibilityLabel={`${name}, ${sub}`}
      disabled={waiting}
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.round, { backgroundColor: t.roundFill }]}>
        {/* The calculator's front card hides the back card's edge with the
            colour it sits on; the tile's two washes over the ground are the
            surface, near enough, and `people` is drawn on a 20 box at 21. */}
        <Icon name={icon} color={ink} size={21} ground={t.surface} />
      </View>
      <View style={styles.tileText}>
        <Text style={[styles.tileName, { color: ink }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.tileSub, { color: waiting ? t.disabled : t.muted }]} numberOfLines={2}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

/** A dock pill. Content width, label always visible, never a tab and never icon-only. */
function Pill({
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
  const ink = disabled ? t.disabled : filled ? t.onFill : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: filled && !disabled ? t.text : t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={ink} />
      <Text style={[styles.pillLabel, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A round dock button: the theme button's shape with a job of its own. Since
 * 25 October the invite is one — the owner's call on the canvas, against the
 * handoff's "never icon-only" — because the home grid's four tiles have the
 * width the pair of labelled pills needed, and a 42 round beside Settings
 * keeps the dock to one row at 360 wide. `label` is the accessibility name.
 */
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
  const ink = disabled ? t.disabled : filled ? t.onFill : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeButton,
        { backgroundColor: filled && !disabled ? t.text : t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={ink} size={18} />
    </Pressable>
  );
}

/**
 * One tap between the two themes, in every state including loading and
 * offline. The icon shows the theme you will GET — a sun while the app is
 * dark — because an icon of the state you are already in tells you nothing.
 */
function ThemeButton({ showing }: { showing: 'dark' | 'light' }) {
  const t = useTheme();
  const next = showing === 'dark' ? 'light' : 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to the ${next} theme`}
      onPress={() => toggleTheme(showing)}
      style={({ pressed }) => [
        styles.themeButton,
        { backgroundColor: t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={showing === 'dark' ? 'sun' : 'moon'} color={t.text} />
    </Pressable>
  );
}

/** 23:22 — the same 24-hour clock every other screen states a time in. */
const clock = (at: Date): string =>
  at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingTop: home.padTop,
    paddingHorizontal: home.gutter,
    gap: home.eyebrowGap,
    marginBottom: home.nameGap,
  },
  eyebrow: type.groupLabel,
  clubName: type.homeTitle,
  banner: { ...type.cardMeta, marginTop: 3 },

  // The scroller itself: content height while it fits, and no more than the
  // room the header, the rows and the dock leave it. `flexGrow: 0` keeps the
  // slack below the rows the only flexible thing on the screen, so a club with
  // one game is still drawn exactly where the boards draw it.
  cards: { flexGrow: 0, flexShrink: 1 },
  // The cards' own gutter and gaps ride the content, not the scroller — a
  // ScrollView's padding belongs to what moves.
  cardList: { paddingHorizontal: home.gutter, gap: home.cardGapOuter },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: home.cardPadTop,
    paddingHorizontal: home.cardPadH,
    paddingBottom: home.cardPadBottom,
    borderRadius: radius.card,
  },
  // The card's three lines. `min-width: 0` in every sense that matters here:
  // the text column shrinks so the arrow keeps its place, rather than the
  // arrow being pushed off the edge by a long table name.
  cardBody: { flex: 1, minWidth: 0, gap: home.cardGap },
  cardArrow: { flexShrink: 0 },
  // Nothing above the title on the idle card, so it opens a little further
  // down and breathes a little tighter.
  cardIdle: { paddingTop: home.cardPadTopIdle },
  cardUnsettled: { borderWidth: 1 },
  cardStatus: { ...type.cardStatus, textTransform: 'uppercase', flexShrink: 1 },
  cardTitle: type.cardTitle,
  cardMeta: { ...type.cardMeta, opacity: 0.62 },
  cardMetaQuiet: type.cardMeta,
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  settleLabel: type.homeDock,

  // "Start another game": dashed, secondary, and never absent while a game is
  // on. The 44 is the floor under everything tappable on this screen.
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: home.tap,
    paddingVertical: home.secondaryPadV,
    paddingHorizontal: home.secondaryPadH,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  plus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { flex: 1, minWidth: 0, gap: 2 },
  secondaryTitle: type.secondary,
  secondarySub: type.destinationSub,

  // The grid: the card list's own gutter, two rows of two, 10 between.
  grid: { marginTop: home.listGap, marginHorizontal: home.gutter, gap: home.tileGap },
  gridRow: { flexDirection: 'row', gap: home.tileGap },
  tile: {
    flex: 1,
    minWidth: 0,
    height: home.tileHeight,
    padding: home.tilePad,
    borderRadius: home.tileRadius,
    justifyContent: 'space-between',
  },
  round: {
    width: home.tileRound,
    height: home.tileRound,
    borderRadius: home.tileRound / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { gap: 2 },
  tileName: type.tileName,
  tileSub: type.tileSub,

  slack: { flex: 1 },
  /* The card carries its own 14 of side margin; the dock's gutter is 20. */
  notice: { marginHorizontal: home.gutter - 14, marginBottom: 10 },

  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: home.dockGap,
    paddingHorizontal: home.gutter,
    paddingBottom: home.dockBottom,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: home.dockIconGap,
    minHeight: home.tap,
    paddingVertical: home.dockPadV,
    paddingHorizontal: home.dockPadH,
    borderRadius: radius.badge,
  },
  pillLabel: type.homeDock,
  themeButton: {
    width: home.tap,
    height: home.tap,
    borderRadius: home.tap / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pushRight: { marginLeft: 'auto' },
});
