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
  meta,
  onBack,
}: {
  title: string;
  /** A status pill, directly after the title in the same row. */
  badge?: ReactNode;
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

        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {badge}
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
 * How tall Chrome A is below the safe area: 26 of padding, the 36px button,
 * then 8 and the 13px meta line. A sheet is drawn 18 below this, and exporting
 * the number is what keeps the two from drifting apart.
 */
export const pushHeaderHeight = 26 + 36 + 8 + 16;

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
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.96, lineHeight: 32, flexShrink: 1 },
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
