import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '../design/useTheme';

/**
 * Chrome A — a pushed screen. `09-navigation.md`, drawn in `Nav System.dc.html`.
 *
 *   [ ← ]  Title   BADGE
 *          meta · line · beneath
 *
 * A 36px round back button on the title line, the title beside it, an optional
 * status pill after that, and the meta line beneath at a 68px indent so it
 * hangs under the title rather than under the button.
 *
 * THE RIGHT CORNER IS EMPTY. Not "empty unless a screen needs something" —
 * empty. The receipt and house glyphs that used to sit there on the night
 * screen were removed with rev 9 (S37): the bill lives in the dock and the club
 * is what the back button returns to, so a control up there would be a third
 * way to reach something that already has two.
 *
 * The old labelled back row — a chevron plus the name of the parent screen — is
 * retired everywhere (S38). A push and a sheet must not share a vocabulary, and
 * the round button is the half of that pair which means "this goes back".
 */
export function PushHeader({
  title,
  badge,
  trailing,
  meta,
  onBack,
}: {
  title: string;
  /** A status pill, directly after the title in the same row. */
  badge?: ReactNode;
  /**
   * One line at the right edge of the title row, pushed there with
   * `margin-left: auto`. Rev 11 puts the session's start time here and nothing
   * else has earned the space: it is a fact, not a control, and S32's empty
   * right corner is about controls.
   */
  trailing?: ReactNode;
  /** One line beneath, indented to sit under the title. */
  meta?: string;
  /** Defaults to popping the stack. */
  onBack?: () => void;
}) {
  const t = useTheme();

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={onBack ?? (() => router.back())}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Svg width={10} height={17} viewBox="0 0 12 20" fill="none">
            <Path
              d="M9 2L2 10l7 8"
              stroke={t.text}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        {/* The title never truncates. When the row runs out of room the badge
            wraps instead — which is what the board does with "just opened". */}
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {badge}
        {trailing !== undefined && <View style={styles.trailing}>{trailing}</View>}
      </View>

      {meta !== undefined && <Text style={[styles.meta, { color: t.muted }]}>{meta}</Text>}
    </View>
  );
}

/**
 * The pill that sits after a title on either chrome — SEATED, CASH OUT,
 * REBUY · 3RD. Tinted and pill-shaped, never outlined: an outline reads as a
 * control and this is a state.
 */
export function HeaderPill({ label, quiet = false }: { label: string; quiet?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.pillFill }]}>
      <Text style={[styles.pillText, { color: quiet ? t.muted : t.text }]}>{label}</Text>
    </View>
  );
}

/**
 * How tall Chrome A is below the safe area: 26 of padding and the 36px button.
 *
 * Rev 11 deleted the club-name / elapsed meta line from every frame — the
 * running time moved into the tag beside the title and the start time to the
 * right edge — so the header is two numbers tall, and a sheet is drawn 24 below
 * it rather than 18. Exporting the number is what keeps the two from drifting.
 */
export const pushHeaderHeight = 26 + 36;

/** The gap between Chrome A and the top of a sheet's panel. */
export const sheetGap = 24;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 26, paddingHorizontal: 20 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.96, lineHeight: 32, flexShrink: 0 },
  trailing: { marginLeft: 'auto', flexShrink: 0 },
  meta: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    paddingTop: 8,
    paddingRight: 20,
    paddingLeft: 68,
    fontVariant: ['tabular-nums'],
  },

  pill: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    flexShrink: 0,
    justifyContent: 'center',
  },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
