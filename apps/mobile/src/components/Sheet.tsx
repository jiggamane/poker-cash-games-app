import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { nav, space, type } from '../design/tokens';
import { Icon } from './Icon';

/**
 * Chrome B — a screen you open to DO one thing. See docs/09-navigation.md.
 *
 * The test that decides every case: if it ends with a Save, an Add, an Apply or
 * a confirm, it is a sheet; if it is a place you can stay in, it is a push.
 *
 *   ╭─────────────────────────╮
 *   │           ▬▬▬           │  grabber, 38 × 5
 *   │  Title            [ × ] │  800 34, or 30 with a sub-line
 *   │  sub-line               │
 *
 * The panel itself — the 26px top corners, the dimming of what is behind, and
 * the swipe that dismisses it — is the NATIVE form sheet, declared in the stack
 * in app/_layout.tsx. That matters: swipe-down is the gesture most people will
 * use, and hand-rolling it would mean a pan responder chasing a system
 * behaviour it cannot match. This component draws what sits inside.
 *
 * A sheet never carries a chevron. Three ways out, all landing on the screen
 * underneath unchanged: swipe down, tap the close, or finish what you came for.
 */
export function Sheet({
  title,
  badge,
  sub,
  children,
  footer,
  onClose,
}: {
  title: string;
  /** A status pill, directly after the title. */
  badge?: ReactNode;
  /** One line under the title — "since 20:05" — or a sentence. */
  sub?: string;
  children: ReactNode;
  /** Pinned below the scroll area. The action this sheet exists for. */
  footer?: ReactNode;
  /** Defaults to dismissing. Give one only when leaving needs tidying up. */
  onClose?: () => void;
}) {
  const t = useTheme();

  return (
    <View style={[styles.sheet, { backgroundColor: t.sheetGround, borderTopColor: t.sheetEdge }]}>
      <View style={styles.grabberRow}>
        <View style={[styles.grabber, { backgroundColor: t.grabber }]} />
      </View>

      <View style={styles.titleRow}>
        <Text
          style={[sub === undefined ? styles.title : styles.titleWithSub, { color: t.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {badge}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose ?? (() => router.back())}
          hitSlop={12}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: t.controlFill, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="close" color={t.text} />
        </Pressable>
      </View>

      {sub !== undefined && <Text style={[styles.sub, { color: t.muted }]}>{sub}</Text>}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

/**
 * What every sheet route declares in the stack.
 *
 * `sheetAllowedDetents` is left at its default of `[1.0]` — the design draws
 * the panel starting 18px down, which is one height, not a set of them. Half
 * detents would be a different design, not a nicety.
 */
export const sheetPresentation = {
  presentation: 'formSheet',
  sheetCornerRadius: nav.sheetRadius,
  // Ours is drawn above, to the design's 38 × 5 and in the theme's colour.
  sheetGrabberVisible: false,
  gestureEnabled: true,
} as const;

const styles = StyleSheet.create({
  sheet: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },

  grabberRow: {
    alignItems: 'center',
    paddingTop: nav.grabberPadTop,
    paddingBottom: nav.grabberPadBottom,
  },
  grabber: {
    width: nav.grabberWidth,
    height: nav.grabberHeight,
    borderRadius: nav.grabberRadius,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nav.sheetTitleGap,
    paddingTop: nav.sheetTitlePadTop,
    paddingHorizontal: nav.sheetPadH,
  },
  title: { ...type.sheetTitle, flexShrink: 1 },
  titleWithSub: { ...type.sheetTitleWithSub, flexShrink: 1 },
  close: {
    width: nav.closeSize,
    height: nav.closeSize,
    borderRadius: nav.closeRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  sub: { ...type.sheetSub, paddingTop: nav.subPadTop, paddingHorizontal: nav.sheetPadH },

  content: { paddingTop: 16, paddingBottom: 24 },

  footer: {
    paddingHorizontal: space.card,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
});
