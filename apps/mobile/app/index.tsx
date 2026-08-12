import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { Icon, type IconName } from '../src/components/Icon';
import { GROUP_NAME, players } from '../src/data/sampleNight';
import { useSession } from '../src/lib/useSession';

/**
 * Home — the group. The root of everything; nothing is pushed beneath it.
 *
 * Built from H2 (idle) and H3 (live). The shape is the same in both: a header,
 * ONE filled card carrying the only thing you might do right now, then a list
 * of destinations, then a quiet bar at the bottom.
 *
 * A destination is a NAME, never a figure — the group is a place you go, not a
 * number you read. Figures belong to the night, which is why the only figure
 * anywhere on this screen is inside the card, and only when a night is open.
 *
 * Home does not use `Screen`: it has no back bar, and its header is inset 24
 * where a pushed screen's title is inset 22.
 */
export default function Home() {
  const t = useTheme();
  const { session, loading, configured } = useSession();

  // Until the repository lands there is always a night in progress, because the
  // sample data describes one. H2 is what this becomes when there is not.
  const live = { seated: players.filter((p) => p.atTable).length, since: '3h 17m' };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.groupLabel, { color: t.muted }]}>Your group</Text>
        <Text style={[styles.title, { color: t.text }]}>{GROUP_NAME}</Text>
      </View>

      {/* The one filled thing on the screen. Inverted — ink on white, white on
          ink — with a 2px keyline of the ground set inside it. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/session')}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.text, borderColor: t.ground, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={styles.cardStatusRow}>
          <View style={[styles.dot, { backgroundColor: t.onFillWin }]} />
          <Text style={[styles.cardStatus, { color: t.onFill }]}>
            PLAYING NOW · {live.since.toUpperCase()}
          </Text>
        </View>

        <View style={styles.cardNameRow}>
          <Text style={[styles.cardName, { color: t.onFill }]}>Tonight</Text>
          <View style={styles.pushRight}>
            <Icon name="arrow" color={t.onFill} />
          </View>
        </View>

        <Text style={[styles.cardLede, { color: t.onFill }]}>
          {live.seated} at the table · the ledger is open
        </Text>
      </Pressable>

      <View style={[styles.destinations, { borderTopColor: t.hairline }]}>
        <Destination
          name="The group"
          sub="players, money rules, the kitty"
          onPress={() => router.push('/session')}
        />
        <Destination name="My stats" sub="across every group you play in" />
        <Destination name="Sessions" sub="tonight, then 27 before it" last />
      </View>

      <View style={styles.bottom}>
        {/* Where tonight actually lives. Say it here rather than let the host
            find out at settle-up. */}
        {!loading && (configured ? session === null : true) && (
          <Text style={[styles.status, { color: t.muted }]}>
            {configured
              ? 'Not signed in — tonight stays on this phone.'
              : 'Not connected — tonight stays on this phone.'}
          </Text>
        )}

        <View style={styles.bottomBar}>
          {!loading && configured && session === null ? (
            <Quiet icon="invite" label="Sign in" onPress={() => router.push('/sign-in')} />
          ) : (
            <Quiet icon="settings" label="Settings" />
          )}
          <Quiet icon="invite" label="Invite a player" />
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * A destination row: a big name, a line of small print, an arrow.
 *
 * Rows with no screen behind them yet are drawn exactly as designed but do
 * nothing — the alternative is inventing a placeholder screen, which would be
 * a worse lie than a row that waits.
 */
function Destination({
  name,
  sub,
  onPress,
  last = false,
}: {
  name: string;
  sub: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={onPress === undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destination,
        {
          borderBottomColor: t.hairline,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.destinationText}>
        <Text style={[styles.destinationName, { color: t.text }]}>{name}</Text>
        <Text style={[styles.destinationSub, { color: t.muted }]}>{sub}</Text>
      </View>
      <View style={styles.pushRight}>
        <Icon name="arrow" color={t.muted} />
      </View>
    </Pressable>
  );
}

/** A quiet outlined action: 1.5px, radius 8, 13/18, glyph then label at gap 9. */
function Quiet({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}): ReactNode {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quiet,
        { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={t.text} />
      <Text style={[styles.quietLabel, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // 28 / 24 / 20 — the home header is inset 24, not the 22 of a pushed title.
  header: { paddingTop: 28, paddingHorizontal: space.home, paddingBottom: 20, gap: 4 },
  groupLabel: type.groupLabel,
  title: type.homeTitle,

  card: {
    marginHorizontal: space.card,
    marginBottom: 16,
    padding: 24,
    borderRadius: radius.card,
    borderWidth: control.keylineWidth,
    gap: 14,
  },
  cardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardStatus: { ...type.cardStatus, opacity: 0.6 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: type.destination,
  cardLede: { ...type.cardLede, opacity: 0.62 },

  destinations: { marginTop: 6, marginHorizontal: space.home, borderTopWidth: StyleSheet.hairlineWidth },
  destination: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 26, paddingHorizontal: 4 },
  destinationText: { gap: 6, flexShrink: 1 },
  destinationName: type.destination,
  destinationSub: type.destinationSub,

  pushRight: { marginLeft: 'auto' },

  bottom: { marginTop: 'auto' },
  status: { ...type.meta, paddingHorizontal: space.card, paddingBottom: 10 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.card, paddingBottom: 14 },
  quiet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: control.quietPadV,
    paddingHorizontal: control.quietPadH,
    borderRadius: radius.pressable,
    borderWidth: control.quietWidth,
  },
  quietLabel: type.quietAction,
});
