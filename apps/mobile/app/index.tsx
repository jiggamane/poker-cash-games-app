import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { chrome, control, radius, space, type } from '../src/design/tokens';
import { Icon } from '../src/components/Icon';
import { loadClubs, useClub } from '../src/lib/clubStore';
import { useLedger, useNight } from '../src/lib/nightStore';

/**
 * Club home — GR1. The root, and the only screen in the app with no back
 * button. 12-the-group.md.
 *
 * A club owns a name, a roster, its money rules and a history of nights. It
 * does not own the night in progress: the card below is that night, and the
 * night is the club's child rather than part of it.
 *
 * Four rows and no more. Everything to do with the group is admin work between
 * nights, and none of it is reachable from inside a live session — a host
 * halfway through recording a rebuy should not be one tap from the roster.
 */
export default function ClubHome() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  const ledger = useLedger();

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

  const live =
    night === null || ledger === null || night.status === 'settled'
      ? null
      : {
          seated: night.players.filter(
            (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
          ).length,
          since: elapsed(night.startedAt),
        };

  const settled = night?.status === 'settled';
  const name = club?.name ?? night?.groupName ?? 'The Poker Club';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.avatar, { backgroundColor: t.roundFill }]}>
          <Text style={[styles.initial, { color: t.text }]}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.meta, { color: t.muted }]}>
        {club === null
          ? 'opening the ledger'
          : `${club.members.length} ${club.members.length === 1 ? 'player' : 'players'} · ${club.currency}`}
      </Text>

      {/* The one filled thing on the screen, and the only figure on it. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(settled ? '/settled' : live !== null ? '/session' : '/new-night')}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.text, borderColor: t.ground, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {live !== null && (
          <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <View style={[styles.dot, { backgroundColor: t.onFillWin }]} />
            <Text style={[styles.tagText, { color: t.onFillWin }]}>{live.since}</Text>
          </View>
        )}

        <View style={styles.cardRow}>
          <View style={styles.cardText}>
            <Text style={[styles.cardName, { color: t.onFill }]}>
              {live !== null ? 'Tonight' : settled ? 'Last night' : 'Set up the game'}
            </Text>
            <Text style={[styles.cardLede, { color: t.onFill }]}>
              {live !== null
                ? `${live.seated} at the table · the ledger is open`
                : settled
                  ? 'settled · look back at it'
                  : 'the rules are already set — pick who is playing'}
            </Text>
          </View>
          <View style={styles.pushRight}>
            <Icon name="arrow" color={t.onFill} />
          </View>
        </View>
      </Pressable>

      <View style={[styles.rows, { borderTopColor: t.hairline }]}>
        <Row name="My nights" sub="every night you played, most recent first" to="/games" />
        <Row name="Players" sub="the roster, and who has the app" to="/players" />
        <Row name="Settings" sub="the group, the money, the people" to="/settings" />
        <Row name="Your groups" sub="every club you play in" to="/groups" last />
      </View>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/stats')}
          style={({ pressed }) => [
            styles.quiet,
            { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="rules" color={t.text} />
          <Text style={[styles.quietLabel, { color: t.text }]}>My stats</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
  name,
  sub,
  to,
  last = false,
}: {
  name: string;
  sub: string;
  to: string;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
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
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: t.text }]}>{name}</Text>
        <Text style={[styles.rowSub, { color: t.muted }]}>{sub}</Text>
      </View>
      <View style={styles.pushRight}>
        <Icon name="arrow" color={t.muted} />
      </View>
    </Pressable>
  );
}

const elapsed = (startedAt: string): string => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // The root wears the same title row as a push, minus the back button, plus
  // a 38px avatar at the right.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chrome.titleGap,
    paddingTop: chrome.titlePadTop,
    paddingHorizontal: chrome.titlePadH,
  },
  title: { ...type.homeTitle, flexShrink: 1 },
  avatar: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 16, fontWeight: '700' },
  meta: { ...type.pushMeta, paddingTop: chrome.metaPadTop, paddingHorizontal: chrome.titlePadH },

  card: {
    marginTop: 18,
    marginHorizontal: space.card,
    marginBottom: 16,
    padding: 24,
    borderRadius: radius.card,
    borderWidth: control.keylineWidth,
    gap: 14,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.badge,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tagText: type.liveTag,
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardText: { gap: 6, flexShrink: 1 },
  cardName: type.destination,
  cardLede: { ...type.cardLede, opacity: 0.62 },

  rows: { marginTop: 6, marginHorizontal: space.card, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, paddingHorizontal: 24 },
  rowText: { gap: 5, flexShrink: 1 },
  rowName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.72 },
  rowSub: type.destinationSub,

  pushRight: { marginLeft: 'auto' },

  bottom: { marginTop: 'auto' },
  quiet: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    marginHorizontal: space.card,
    marginBottom: 14,
    paddingVertical: control.quietPadV,
    paddingHorizontal: control.quietPadH,
    borderRadius: radius.pressable,
    borderWidth: control.quietWidth,
  },
  quietLabel: type.quietAction,
});
