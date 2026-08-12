import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
 * The panel itself — the rounded top corners over the screen behind, and the
 * swipe that dismisses it — is the native modal, declared in the stack in
 * app/_layout.tsx (see `sheetPresentation` below for why it is `modal` rather
 * than `formSheet`). That matters: swipe-down is the gesture most people will
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
    // Only the bottom edge: a modal starts below the status bar already, and
    // the footer must clear the home indicator.
    <SafeAreaView
      style={[styles.sheet, { backgroundColor: t.sheetGround, borderTopColor: t.sheetEdge }]}
      edges={['bottom']}
    >
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
    </SafeAreaView>
  );
}

/**
 * What every sheet route declares in the stack.
 *
 * `modal`, NOT `formSheet`, and that is a scar rather than a preference.
 *
 * formSheet is the closer match on paper — it takes a corner radius and a
 * detent, which is exactly Chrome B — but in react-native-screens 4.16 its
 * content container does not size the way an ordinary screen's does, and every
 * sheet in the app came out with its header painted on top of its own scroll
 * content. The package's own types allude to it: contentStyle carries a note
 * about "a workaround to truncated sheet content".
 *
 * `modal` lays out identically to a pushed screen, which is the layout that
 * demonstrably works, and still gives the two things Chrome B needs from the
 * platform: rounded top corners over the screen behind, and swipe-down to
 * dismiss. What it does not give is the exact 26px radius, so that number now
 * lives only in the token file. Revisit if a later SDK fixes formSheet.
 */
export const sheetPresentation = {
  presentation: 'modal',
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
