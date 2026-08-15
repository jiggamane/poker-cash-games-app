import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { chrome, control, radius, space, type } from '../src/design/tokens';
import { Icon } from '../src/components/Icon';
import { loadClubs, useClub } from '../src/lib/clubStore';
import { useElapsed } from '../src/lib/elapsed';
import { isTonight, useLedger, useNight } from '../src/lib/nightStore';

/**
 * Club home — GR1. The root, and the only screen in the app with no back
 * button. 12-the-group.md.
 *
 * A club owns a name, a roster, its money rules and a history of nights. It
 * does not own the night in progress: the card below is that night, and the
 * night is the club's child rather than part of it.
 *
 * TWO THINGS AND A WAY OUT. The card starts a game — or opens the one running
 * — and under it are the two places a person actually goes between games:
 * every night that has been played, and their own record across them. Settings
 * is where it was before the section grew rows: the quiet control at the foot
 * of the screen, out of the way of everything you open the app to do.
 *
 * WHAT IS NOT HERE. There is no "Last night" card: a settled night is history
 * the moment it is settled, and history is a list, not the top of the home
 * screen — leaving it up there means the first thing a host sees on a Friday
 * is last Friday. The roster and Your groups are gone too; both are admin work
 * between nights and both live in Settings, which is where you go when the
 * group itself needs changing rather than when a game does. None of it is
 * reachable from inside a live session — a host halfway through recording a
 * rebuy should not be one tap from the roster.
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
   * start one. `isTonight` is that rule, and "Set up the game" reads the same
   * one — the two screens disagreeing is what walled the host in the first
   * time.
   */
  const live =
    !isTonight(night) || night === null || ledger === null
      ? null
      : {
          seated: night.players.filter(
            (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
          ).length,
          startedAt: night.startedAt,
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
        {live !== null && <RunningFor startedAt={live.startedAt} />}

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
        <Row name="My stats" sub="across every group you play in" to="/stats" last />
      </View>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.quiet,
            { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="settings" color={t.text} />
          <Text style={[styles.quietLabel, { color: t.text }]}>Settings</Text>
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

/**
 * The green running-time tag on the card, which is what says a night is on.
 *
 * Its own component so the hook that ticks it is not conditional — and so the
 * figure is the same one Tonight draws, off the same clock. Both screens used
 * to compute it once per render and neither ever re-rendered on time.
 */
function RunningFor({ startedAt }: { startedAt: string }) {
  const t = useTheme();
  const running = useElapsed(startedAt);
  return (
    <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
      <View style={[styles.dot, { backgroundColor: t.onFillWin }]} />
      <Text style={[styles.tagText, { color: t.onFillWin }]}>{running}</Text>
    </View>
  );
}

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
