import { useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '../design/useTheme';
import { pushHeaderHeight } from './PushHeader';

/**
 * Chrome B — a sheet. `09-navigation.md`, drawn in `Nav System.dc.html`.
 *
 *   [status bar, 50%]
 *   [what you were looking at, at .32]
 *   ╭───────────────────────╮
 *   │         ▬▬▬           │  grabber
 *   │  Title            [×] │
 *   │  sub-line             │
 *
 * A sheet is a screen you open to DO ONE THING, and the rule that decides it is
 * blunt: if the screen ends with a Save, an Add, an Apply or a confirm, it is a
 * sheet; if it is a place you can stay in, it is a push. Everything from N4 to
 * N10 ends with an act, so all seven arrive this way.
 *
 * A sheet NEVER carries a chevron and a push never carries a grabber or a
 * close. That pair is the only thing telling somebody which gesture takes them
 * back, so the two vocabularies must not mix.
 *
 * Three ways out — swipe down, tap the close, or complete the action — and all
 * three land on the screen underneath, unchanged and in the same scroll
 * position. The route is presented as a transparent modal for exactly that
 * reason: the screen behind stays mounted and visible through the scrim.
 */
export function Sheet({
  title,
  badge,
  /** A short meta line — "already in for $1,500". 500 13px. */
  meta,
  /** A sentence instead. 400 13px/1.5. */
  lede,
  onClose,
  children,
}: {
  title: string;
  badge?: ReactNode;
  meta?: string;
  lede?: string;
  /** Defaults to dismissing the sheet. */
  onClose?: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => router.back());

  const hasSub = meta !== undefined || lede !== undefined;

  /*
   * Drag to dismiss. The panel follows the finger downward only — dragging up
   * does nothing, because there is no second detent to drag to — and lets go
   * past 96 points or a firm flick. Anything less springs back, which is what
   * makes an accidental brush harmless.
   */
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 96 || g.vy > 0.8) dismiss();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.fill}>
      {/* The screen behind, dropped to .32 — a wash of the ground over it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={dismiss}
        style={[StyleSheet.absoluteFill, { backgroundColor: t.ground, opacity: 0.68 }]}
      />

      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.panel,
          {
            marginTop: insets.top + pushHeaderHeight + 18,
            paddingBottom: insets.bottom,
            backgroundColor: t.sheetPanel,
            borderTopColor: t.sheetEdge,
            transform: [{ translateY: drag }],
          },
        ]}
      >
        <View style={styles.grabberRow}>
          <View style={[styles.grabber, { backgroundColor: t.grabber }]} />
        </View>

        <View style={styles.titleRow}>
          <Text
            style={[hasSub ? styles.titleWithSub : styles.title, { color: t.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={dismiss}
            style={({ pressed }) => [
              styles.close,
              { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M5 5l14 14M19 5L5 19" stroke={t.text} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {meta !== undefined && <Text style={[styles.meta, { color: t.muted }]}>{meta}</Text>}
        {lede !== undefined && <Text style={[styles.lede, { color: t.muted }]}>{lede}</Text>}

        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  panel: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    overflow: 'hidden',
  },

  grabberRow: { alignItems: 'center', paddingTop: 9, paddingBottom: 2 },
  grabber: { width: 38, height: 5, borderRadius: 3 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingTop: 12, paddingHorizontal: 22 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.02, lineHeight: 34, flexShrink: 1 },
  titleWithSub: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31.5, flexShrink: 1 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
  },

  meta: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    paddingTop: 7,
    paddingHorizontal: 22,
    fontVariant: ['tabular-nums'],
  },
  lede: { fontSize: 13, fontWeight: '400', lineHeight: 19.5, paddingTop: 7, paddingHorizontal: 22 },
});
