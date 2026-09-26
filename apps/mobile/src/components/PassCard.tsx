import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/tokens';
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
        { backgroundColor: t.surface, borderColor: t.drawerEdge, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name="pass" color={t.text} size={19} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.body, { color: t.muted }]}>{body}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
        onPress={() => void dismissNotice(notice.id)}
        style={({ pressed }) => [styles.close, { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="close" color={t.text} size={14} />
      </Pressable>
    </Pressable>
  );
}

/** "September" — the month the host night was spent in, for state 10. */
const monthOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long' });

const styles = StyleSheet.create({
  /* 14 / 14 / 14 / 16, radius 14, a 1px edge one step stronger than a hairline. */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 14,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 16.5, fontWeight: '700' },
  body: { fontSize: 13, fontWeight: '400', lineHeight: 18.85 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
