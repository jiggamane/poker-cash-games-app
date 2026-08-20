import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, type Money } from '@poker-club/core';
import { useTheme, useThemeName } from '../src/design/useTheme';
import { home, radius, type } from '../src/design/tokens';
import { Icon, type IconName } from '../src/components/Icon';
import { currencyFor } from '../src/data/currencies';
import { useClub, type Club } from '../src/lib/clubStore';
import { useElapsed } from '../src/lib/elapsed';
import { useOnline } from '../src/lib/online';
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
 * start one · three destinations · ONE flexible spacer · the dock.
 *
 * THE SPACER IS THE WHOLE LAYOUT RULE. A row is intrinsic height — 74pt — and
 * never stretches; every leftover point on a tall screen goes into the single
 * `flex: 1` between the rows and the dock. Spread that slack into the rows
 * instead and the screen looks fine on the phone it was built on and pushes
 * content under the fold on every other one.
 *
 * THE CARD LIST IS THE ONE THING THAT SCROLLS — doc 10 § H3, "past three live
 * cards the card list scrolls; the rows and dock stay put". It is the only
 * block here whose height is unbounded: the header is three lines, the rows
 * are three fixed 74s and the dock is one, but a club can open a table and
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
 * full-width buttons, no icon-only controls.
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

  const symbol = currencyFor(club?.currency ?? 'USD').symbol;

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
            <StartCard club={club} fresh={fresh} symbol={symbol} />
          ) : null
        ) : (
          <>
            {games.map((game) =>
              game.status === 'open' ? (
                <LiveCard
                  key={game.sessionId}
                  game={game}
                  symbol={symbol}
                  /* One table and the card says what the ledger is doing;
                     two and it says what the table costs, because that is
                     the thing that now differs between them. */
                  meta={
                    !host && mine !== null && game.sessionId === night?.sessionId
                      ? `you’re in for ${formatMoney(mine, symbol)} · ${game.seated} at the table`
                      : games.length === 1
                        ? `${game.seated} at the table · the ledger is open`
                        : `${game.seated} at the table · ${game.buyIn === null ? '—' : formatMoney(game.buyIn, symbol)}`
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

      <View style={styles.rows}>
        <Row name="The group" sub="players, money rules, the piggy bank" to="/players" />
        <Row name="My stats" sub="across every group you play in" to="/stats" waiting={fresh} />
        <Row
          name="Sessions"
          sub="every night you played, most recent first"
          to="/games"
          waiting={fresh}
          last
        />
      </View>

      {/* The only flexible thing on the screen. */}
      <View style={styles.slack} />

      <View style={styles.dock}>
        <Pill icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        {host && (
          <Pill
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
function LiveCard({ game, meta }: { game: OpenGame; symbol: string; meta: string }) {
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

/** H1 and H5 · no game running: the stakes are inherited, and the tap opens the night. */
function StartCard({ club, fresh, symbol }: { club: Club | null; fresh: boolean; symbol: string }) {
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
          {fresh
            ? 'You’ll set the buy-in and blinds once, here'
            : `${formatMoney(club?.defaultBuyIn ?? (0 as Money), symbol)} buy-in · same rules as last time`}
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
 * A destination. Intrinsic height, and the arrow rides the name's line rather
 * than the middle of the block — a row is two lines of different weight and
 * the second describes the first, so centring the arrow aims it at the gap.
 *
 * `waiting` is a row with nothing in it yet. It states what it will hold and
 * does not navigate; it is never removed, because an empty row is how a reader
 * learns the app has somewhere to put this.
 */
function Row({
  name,
  sub,
  to,
  waiting = false,
  last = false,
}: {
  name: string;
  sub: string;
  to: string;
  waiting?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={waiting ? 'text' : 'button'}
      disabled={waiting}
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: t.hairline,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.nameLine}>
        <Text
          style={[styles.rowName, { color: waiting ? t.disabled : t.text }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {!waiting && (
          <View style={styles.pushRight}>
            {/* A row goes somewhere and a card opens something: the boards
                draw the first with a chevron and the second with an arrow. */}
            <Icon name="chevron" color={t.muted} />
          </View>
        )}
      </View>
      <Text style={[styles.rowSub, { color: waiting ? t.disabled : t.muted }]} numberOfLines={1}>
        {sub}
      </Text>
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

  rows: { marginTop: home.listGap, marginHorizontal: home.rowGutter },
  row: { paddingVertical: home.rowPadV, gap: home.rowGap },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: type.destination,
  rowSub: type.destinationSub,

  slack: { flex: 1 },

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
