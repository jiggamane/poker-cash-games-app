import { useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@poker-club/core';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { Icon, type IconName } from '../src/components/Icon';
import { defaultBuyIn, startNight, useLedger, useNight } from '../src/lib/nightStore';

/**
 * Home — the night. The root of everything; nothing is pushed beneath it.
 *
 * ONE CLUB PER HOST, so the screen names no club and offers no way to switch
 * between clubs: there is nothing to switch to. That is why there is no header
 * at all — a title saying "Your group" above a name you already know is a line
 * the host reads past every single time. The card is the first thing on the
 * screen, and it carries the only thing you might do right now: the game that
 * is running, or the one you are about to start.
 *
 * Built from H2 (idle) and H3 (live), minus that header. Below the card, a
 * list of destinations, then a quiet bar at the bottom. A destination is a
 * NAME, never a figure — a place you go, not a number you read. Figures belong
 * to the night, which is why the only figure anywhere on this screen is inside
 * the card, and only when a night is open.
 *
 * "My stats" is the one place the app still knows about more than one club:
 * a host runs one, but they can PLAY in several, and their own results are the
 * only screen where a per-club filter means anything.
 *
 * Home does not use `Screen`: it has no back bar and no title.
 */
export default function Home() {
  const t = useTheme();
  const night = useNight();
  const ledger = useLedger();
  const [starting, setStarting] = useState(false);

  /**
   * Three states, and the card is a different card in each. A night is live
   * until it has been SETTLED — counting still counts as playing — and once it
   * has been, starting the next one is the thing to offer.
   */
  const state =
    night === null || ledger === null
      ? null
      : night.status === 'settled'
        ? { kind: 'idle' as const, buyIn: defaultBuyIn(ledger) }
        : {
            kind: 'live' as const,
            seated: night.players.filter(
              (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
            ).length,
            since: elapsed(night.startedAt),
          };

  async function start(): Promise<void> {
    if (starting) return;
    setStarting(true);
    try {
      await startNight();
      router.push('/session');
    } catch {
      // The night was not written. Last night is still on screen and the card
      // can be pressed again; nothing has been lost.
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      {/* The one filled thing on the screen. Inverted — ink on white, white on
          ink — with a 2px keyline of the ground set inside it. */}
      <Pressable
        accessibilityRole="button"
        disabled={state === null || starting}
        onPress={() => {
          if (state?.kind === 'live') router.push('/session');
          else void start();
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.text, borderColor: t.ground, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {state?.kind === 'live' && (
          <View style={styles.cardStatusRow}>
            <View style={[styles.dot, { backgroundColor: t.onFillWin }]} />
            <Text style={[styles.cardStatus, { color: t.onFill }]}>
              PLAYING NOW · {state.since.toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.cardNameRow}>
          {/* Name and line grouped, at the same gap 6 the destination rows use,
              so the card and the rows beneath it read as one column. */}
          <View style={styles.cardText}>
            <Text style={[styles.cardName, { color: t.onFill }]}>
              {state?.kind === 'idle' ? 'Start a session' : 'Tonight'}
            </Text>
            <Text style={[styles.cardLede, { color: t.onFill }]}>
              {state === null
                ? 'opening the ledger'
                : state.kind === 'idle'
                  ? starting
                    ? 'dealing you in…'
                    : `${formatMoney(state.buyIn)} buy-in · same players and rules as last time`
                  : `${state.seated} at the table · the ledger is open`}
            </Text>
          </View>
          <View style={styles.pushRight}>
            <Icon name="arrow" color={t.onFill} />
          </View>
        </View>
      </Pressable>

      <View style={[styles.destinations, { borderTopColor: t.hairline }]}>
        {/* Only while last night is still the night this phone is holding —
            once the next one starts, it is history, and history is Sessions. */}
        {state?.kind === 'idle' && (
          <Destination
            name="Last night"
            sub="settled · look back at it"
            onPress={() => router.push('/settled')}
          />
        )}
        <Destination
          name="Players &amp; rules"
          sub="the roster, the money rules, the kitty"
          onPress={() => router.push('/session')}
        />
        <Destination name="My stats" sub="every club you play in" />
        <Destination name="Sessions" sub="every night, most recent first" last />
      </View>

      <View style={styles.bottom}>
        <View style={styles.bottomBar}>
          <Quiet icon="settings" label="Settings" onPress={() => router.push('/settings')} />
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

/** "3h 17m" — how long the table has been running. */
function elapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  card: {
    // 28 down from the top, where the header's own first line used to sit:
    // the card takes over that place rather than sliding up into the status
    // bar's shadow.
    marginTop: 28,
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
  cardText: { gap: 6, flexShrink: 1 },
  cardName: type.destination,
  cardLede: { ...type.cardLede, opacity: 0.62 },

  /*
   * The card and this list share one column.
   *
   * The board insets the card 20 and the destination list 24 + 4, which puts
   * "Tonight" at 44 from the edge and "The group" at 28 — a 16px step between
   * two things drawn as the same kind of thing. Both are 20 to the edge and 44
   * to the text here, so the names line up and so do the arrows.
   */
  destinations: { marginTop: 6, marginHorizontal: space.card, borderTopWidth: StyleSheet.hairlineWidth },
  destination: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 26, paddingHorizontal: 24 },
  destinationText: { gap: 6, flexShrink: 1 },
  destinationName: type.destination,
  destinationSub: type.destinationSub,

  pushRight: { marginLeft: 'auto' },

  bottom: { marginTop: 'auto' },
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
