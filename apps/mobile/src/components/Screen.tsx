import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { dock, nav, space, type } from '../design/tokens';
import { Icon } from './Icon';

/**
 * Chrome A — a screen you navigate TO. See docs 09-navigation.md.
 *
 * A place you can stay in: the night, the settings, a step of the close flow.
 * Everything you open to DO one thing is a sheet instead, and the difference is
 * carried entirely by the chrome — a round back and no grabber here, a grabber
 * and a close and no chevron there. Somebody halfway through a night reads
 * which gesture takes them back off that one signal, so the two vocabularies
 * must never mix.
 *
 *   [status bar]
 *   [ ← ]  Title   BADGE      ← 26 / 20 / 0, gap 12, back 36 × 36
 *          meta · line        ← 8 / 20 / 0 / 68
 *
 * **The top-right corner is empty.** No actions, no overflow, no icons — on
 * every pushed screen in the app. It is the one rule in rev 9 with no
 * exceptions, and it is why the home glyph and the "Edit" text action that used
 * to live up here are gone: the club is what back returns to, and an action
 * belongs in the page or in the footer where it can be read.
 *
 * The 68 on the meta line is not a round number, it is the back button plus its
 * gap — the line hangs under the TITLE, not under the button.
 */
export function Screen({
  title,
  badge,
  meta,
  backTo,
  step,
  lede,
  dimmed = false,
  onDimPress,
  children,
  footer,
}: {
  title: string;
  /** A status pill, directly after the title on the same line. */
  badge?: ReactNode;
  /** One line beneath: whose club, how long, since when. */
  meta?: string;
  /** Where back goes. Read aloud, not drawn — rev 9 retired the label. */
  backTo?: string;
  /** Numbered flows say "3 of 3". Sits with the badge; it states, never acts. */
  step?: string;
  /** One paragraph under the title, saying what the screen is showing. */
  lede?: string;
  /**
   * Everything except the footer drops to 40%.
   *
   * For the dock's drawer, which is a panel over its own screen rather than a
   * sheet: the title, the card and the list go back while the panel stays
   * forward, and the footer is excluded because the dock lives there and its
   * Rebuy/Bill pair stays live with the drawer open.
   */
  dimmed?: boolean;
  /** Tapping the dimmed area — how an open drawer is closed. */
  onDimPress?: () => void;
  children: ReactNode;
  /** Pinned below the scroll area, where the one primary action lives. */
  footer?: ReactNode;
}) {
  const t = useTheme();

  const body = (
    <>
      <View style={styles.titleRow}>
        {backTo !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back to ${backTo}`}
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: t.controlFill, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="back" color={t.text} />
          </Pressable>
        )}

        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {badge}
        {step !== undefined && <Text style={[styles.step, { color: t.muted }]}>{step}</Text>}
      </View>

      {meta !== undefined && (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {meta}
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lede !== undefined && <Text style={[styles.lede, { color: t.muted }]}>{lede}</Text>}
        {children}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      {dimmed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onDimPress}
          style={[styles.dimmed, { opacity: dock.behindOpenOpacity }]}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  dimmed: { flex: 1 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nav.titleGap,
    paddingTop: nav.titleRowPadTop,
    paddingHorizontal: nav.titleRowPadH,
  },
  back: {
    width: nav.backSize,
    height: nav.backSize,
    borderRadius: nav.backRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { ...type.title, flexShrink: 1 },
  step: { ...type.navMeta, marginLeft: 'auto' },
  meta: {
    ...type.navMeta,
    paddingTop: nav.metaPadTop,
    paddingRight: nav.titleRowPadH,
    paddingLeft: nav.metaIndent,
  },

  content: { paddingTop: 14, paddingBottom: 24 },
  lede: { ...type.lede, marginHorizontal: space.page, marginBottom: 12 },

  footer: {
    paddingHorizontal: space.card,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 12,
  },
});
