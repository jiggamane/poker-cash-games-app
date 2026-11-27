import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
import { L, z } from '../design/scale';
import { clockLabel } from '../lib/elapsed';
import { dismissNotice } from '../lib/handover';
import type { Notice } from '../lib/hold';
import { openNightById, useNight } from '../lib/nightStore';
import { Icon } from './Icon';

/**
 * The announcement — `design/handoff-game-admin/` § 3, states 9, 9b, 10, 11.
 *
 * ONE CARD COMPONENT IN TWO PLACES: pinned above the dock on Tonight, or above
 * the Settings pill on home. It is a card in the page, not an overlay, toast
 * or banner — the system has none of those, and the handoff says so ("a card
 * with the sheet's close button"). It needs no action.
 *
 * DISMISSAL: a tap anywhere on the card, the close button, the first entry the
 * new admin makes (Tonight watches the ledger for it), or opening Tonight from
 * home. The close is a visual cue, not the only target.
 *
 * WHAT IT SAYS is the handoff's, to the word:
 *   9   Marek passed you the game · You're recording from 23:10. Everything
 *       before that is already here.
 *   9b  … Tap to open the table.                              (home)
 *   10  … This uses your host night for September.           (Regular)
 *   11  Marek took the game back · You're watching now. Nothing you recorded
 *       is lost.
 *
 * A hand-off from somebody with no seat in the group has no name to give; the
 * card then says "the game was passed to you", which is the one line here that
 * is mine (⚠ not drawn — `docs/screens.md`).
 */
export function PassCard({ notice, on }: { notice: Notice; on: 'tonight' | 'home' }) {
  const t = useTheme();
  const night = useNight();

  /*
   * THE FIRST ENTRY DISMISSES IT (state 9). The count of entries on the night
   * when the card went up, held against the count now: the first one that
   * lands after is the new admin recording, and the announcement has done its
   * job. Only on Tonight, which is where entries are made.
   */
  const entriesAtMount = useRef<number | null>(null);
  const entries = night?.sessionId === notice.sessionId ? night.entries.length : null;
  useEffect(() => {
    if (on !== 'tonight' || entries === null) return;
    if (entriesAtMount.current === null) {
      entriesAtMount.current = entries;
      return;
    }
    if (entries > entriesAtMount.current) void dismissNotice(notice.id);
  }, [on, entries, notice.id]);

  const from = notice.fromName;
  const title =
    notice.kind === 'taken_back'
      ? from === null
        ? 'The game was taken back'
        : `${from} took the game back`
      : from === null
        ? 'The game was passed to you'
        : `${from} passed you the game`;

  const body =
    notice.kind === 'taken_back'
      ? 'You’re watching now. Nothing you recorded is lost.'
      : notice.spentHostNight
        ? `You’re recording from ${clockLabel(notice.at)}. This uses your host night for ${monthOf(notice.at)}.`
        : on === 'home'
          ? `You’re recording from ${clockLabel(notice.at)}. Tap to open the table.`
          : `You’re recording from ${clockLabel(notice.at)}. Everything before that is already here.`;

  const open = async () => {
    await dismissNotice(notice.id);
    if (on === 'home' && notice.kind === 'received') {
      /* Tapping pushes Tonight and dismisses (9b). The store swaps to the
         night first, as home's own cards do. */
      await openNightById(notice.sessionId);
      router.push('/session');
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={() => void open()}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.surface, boxShadow: t.lift, borderLeftColor: t.win, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* THE FULL BOARD (`home-pass`, `session-takenback`): a lifted card with a
          green edge, the pass glyph white in a green disc. */}
      <View style={[styles.disc, { backgroundColor: t.win }]}>
        <Icon name="pass" color={t.onFill} size={z(16)} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.body, { color: t.muted }]}>{body}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
        onPress={() => void dismissNotice(notice.id)}
        style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="close" color={t.muted} size={z(12)} />
      </Pressable>
    </Pressable>
  );
}

/** "September" — the month the host night was spent in, for state 10. */
const monthOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long' });

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: z(12),
    paddingVertical: z(14),
    paddingRight: z(10),
    paddingLeft: z(14),
    borderRadius: L.cardRadius,
    borderLeftWidth: 3,
  },
  disc: { width: z(28), height: z(28), borderRadius: z(14), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: z(3) },
  title: { fontFamily: 'head', fontSize: z(15.5), fontWeight: '700', lineHeight: z(19) },
  body: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.5) },
  close: { width: z(24), height: z(24), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
