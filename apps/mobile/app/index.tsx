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

  /*
   * THE CARD IS TONIGHT'S GAME, and only that.
   *
   * Two things used to be able to sit on it that are not tonight's game, and
   * each of them walled the host in:
   *
   *   THE SAMPLE NIGHT arrives seeded and open, with six people at the table,
   *   so this read as live and sent every tap to /session. There was no state
   *   in which "Set up the game" could be reached, and settling the demo only
   *   moved the wall — the card then read "Last night" and pushed /settled.
   *   The seed still has a job (it is what `loadClubs` builds the club from),
   *   so it stays on the phone; it just is not tonight.
   *
   *   A NIGHT ALREADY SETTLED is history the moment it closes, and history
   *   belongs in My nights — `09-navigation.md` puts a past night in a sheet
   *   over that list, not on the root. Leaving it here meant a host opening
   *   the app the following Saturday had nowhere to go.
   *
   * So: a real, unsettled night is Tonight. Anything else is an invitation to
   * start one.
   */
  const live =
    // 'counting' stays live on purpose: a half-counted night is still tonight's,
    // and the host walking back to the root must be able to walk into it again.
    night === null || ledger === null || night.seeded || night.status === 'settled'
      ? null
      : {
          seated: night.players.filter(
            (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
          ).length,
          since: elapsed(night.startedAt),
        };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      {/* The one filled thing on the screen, and the only figure on it. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(live !== null ? '/session' : '/new-night')}
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
              {live !== null ? 'Tonight' : 'Set up the game'}
            </Text>
            <Text style={[styles.cardLede, { color: t.onFill }]}>
              {live !== null
                ? `${live.seated} at the table · the ledger is open`
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

  /*
   * NOTHING ABOVE THE CARD. GR1 draws a club name and an avatar here; this
   * screen starts at the night instead, because the name of the club is the
   * one thing a person opening their own club already knows. It is still on
   * Settings and on Your groups, where it identifies rather than decorates.
   */
  card: {
    marginTop: chrome.titlePadTop,
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
