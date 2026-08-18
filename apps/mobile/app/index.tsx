import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, type Money } from '@poker-club/core';
import { useTheme, useThemeName } from '../src/design/useTheme';
import { home, radius, type } from '../src/design/tokens';
import { Icon, type IconName } from '../src/components/Icon';
import { currencyFor } from '../src/data/currencies';
import { loadClubs, useClub, type Club } from '../src/lib/clubStore';
import { useElapsed } from '../src/lib/elapsed';
import { useOnline } from '../src/lib/online';
import { toggleTheme } from '../src/lib/themeStore';
import { isTonight, useLedger, useNight, type Night } from '../src/lib/nightStore';

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

  // Seeded from tonight the first time: the players at that table are the
  // club's roster, and whoever holds the phone is its admin.
  useEffect(() => {
    void loadClubs(
      night === null
        ? undefined
        : {
            name: night.groupName,
            players: night.players.map((p) => ({ id: p.id, name: p.name })),
            rules: night.rules,
            ...(night.meId === undefined ? {} : { meId: night.meId }),
          },
    ).catch(() => {});
  }, [night]);

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
   * WHICH STATE. `isTonight` is the one rule for whether a night on this phone
   * is a game being played — a seeded night is demo data and a settled one is
   * history. Past that, `status` splits the two cards apart: a game still
   * being played, and a game that has ended and is holding money until it is
   * settled.
   */
  const playing = isTonight(night) && night !== null && night.status === 'open' ? night : null;
  const counting = isTonight(night) && night !== null && night.status === 'counting' ? night : null;

  // H8 · first paint. The club is known long before the night is read off the
  // database, so everything known paints immediately and only the unknown
  // block is a skeleton — in the exact geometry the card will take.
  const loading = night === null || ledger === null;

  // H5 · a club with nobody in it yet has never played and has no rules to
  // inherit, so the card asks for the first session rather than the next one.
  const fresh = club !== null && club.members.length <= 1 && !loading && playing === null;

  const seated =
    playing === null || ledger === null
      ? 0
      : playing.players.filter((p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0)
          .length;
  const mine =
    playing === null || ledger === null || meId === undefined
      ? null
      : ((ledger.boughtInByPlayer.get(meId) ?? 0) as Money);

  const symbol = currencyFor(club?.currency ?? 'USD').symbol;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: t.muted }]} numberOfLines={1}>
          {host ? 'Your group' : `Hosted by ${admin?.name ?? '—'}`}
        </Text>

        {club === null ? (
          <Skeleton width="70%" height={31.8} />
        ) : (
          <Text style={[styles.clubName, { color: t.text }]} numberOfLines={2} ellipsizeMode="tail">
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

      <View style={styles.cards}>
        {loading ? (
          <CardSkeleton />
        ) : playing !== null ? (
          <LiveCard
            startedAt={playing.startedAt}
            meta={
              host || mine === null
                ? `${seated} at the table · the ledger is open`
                : `you’re in for ${formatMoney(mine, symbol)} · ${seated} at the table`
            }
          />
        ) : counting !== null ? (
          <UnsettledCard night={counting} />
        ) : host ? (
          <StartCard club={club} fresh={fresh} symbol={symbol} />
        ) : null}
      </View>

      <View style={styles.rows}>
        <Row
          name="The group"
          sub={
            club === null
              ? '—'
              : `${club.members.length} players · buy-in ${formatMoney(club.defaultBuyIn, symbol)}`
          }
          to="/players"
        />
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
function LiveCard({ startedAt, meta }: { startedAt: string; meta: string }) {
  const t = useTheme();
  const running = useElapsed(startedAt);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/session')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.text, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={[styles.cardStatus, { color: t.onFillWin }]} numberOfLines={1}>
        {`Playing now · ${running}`}
      </Text>
      <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
        Tonight
      </Text>
      <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={1}>
        {meta}
      </Text>
    </Pressable>
  );
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
      <Text style={[styles.cardTitle, { color: t.onFill }]} numberOfLines={1}>
        {fresh ? 'Start the first session' : 'Start a session'}
      </Text>
      <Text style={[styles.cardMeta, { color: t.onFill }]} numberOfLines={1}>
        {fresh
          ? 'You’ll set the buy-in and blinds once, here'
          : `${formatMoney(club?.defaultBuyIn ?? (0 as Money), symbol)} buy-in · same rules as last time`}
      </Text>
    </Pressable>
  );
}

/**
 * H4 · a night that has ended and is not settled.
 *
 * It is never hidden, because it holds money. Amber rather than the filled
 * card: it is not the thing to do next unless you are the one counting, and a
 * second filled card would compete with the live one when both are on screen.
 */
function UnsettledCard({ night }: { night: Night }) {
  const t = useTheme();
  const left = night.players.length - night.finalCounts.size;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/count-up')}
      style={({ pressed }) => [
        styles.card,
        styles.cardUnsettled,
        { backgroundColor: t.surface, borderColor: t.amber, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={[styles.cardStatus, { color: t.amber }]} numberOfLines={1}>
        Counting · not settled
      </Text>
      <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>
        Tonight
      </Text>
      <Text style={[styles.cardMeta, { color: t.muted }]} numberOfLines={1}>
        {`started ${clock(new Date(night.startedAt))} · ${left > 0 ? `${left} still to count` : 'every stack counted'}`}
      </Text>
      <View style={[styles.settle, { backgroundColor: t.text }]}>
        <Text style={[styles.settleLabel, { color: t.onFill }]}>Settle up</Text>
      </View>
    </Pressable>
  );
}

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
            <Icon name="arrow" color={t.muted} />
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

  cards: { paddingHorizontal: home.gutter, gap: home.cardGapOuter },
  card: {
    paddingTop: home.cardPadTop,
    paddingHorizontal: home.cardPadH,
    paddingBottom: home.cardPadBottom,
    borderRadius: radius.card,
    gap: home.cardGap,
  },
  // Nothing above the title on the idle card, so it opens a little further
  // down and breathes a little tighter.
  cardIdle: { paddingTop: home.cardPadTopIdle, gap: home.cardGapIdle },
  cardUnsettled: { borderWidth: 1 },
  cardStatus: { ...type.cardStatus, textTransform: 'uppercase' },
  cardTitle: type.cardTitle,
  cardMeta: { ...type.cardMeta, opacity: 0.62 },
  settle: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
  },
  settleLabel: type.homeDock,

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
