import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { chrome, space, type } from '../design/tokens';
import { Icon } from './Icon';
import { Pill } from './Pill';

/**
 * Chrome A — a pushed screen. 09-navigation.md.
 *
 * A screen you navigate TO is pushed and says so with a round back button on
 * its title line. A screen you open to DO ONE THING is a sheet — see `Sheet` —
 * and the two vocabularies must never mix, because which one is on screen is
 * the only thing telling a person whether to swipe down or tap back.
 *
 *   title row   26 / 20 / 0    back 36×36, title 800 32/1, badge after it
 *   meta line    8 / 20 / 0 / 68   500 13 muted, indented under the title
 *
 * THE TOP-RIGHT CORNER IS EMPTY. No actions, no overflow, no icons — not even
 * the home glyph this component used to carry, and not the receipt and house
 * that used to sit on the night screen. Bill lives in the dock; the club is
 * what back returns to. An action that wants a corner wants to be a sheet.
 */
export function Screen({
  title,
  badge,
  meta,
  backTo,
  lede,
  children,
  footer,
  scroll = true,
}: {
  title: string;
  /** A status pill directly after the title — "1 of 3", "SETTLED". */
  badge?: string;
  /** Club · elapsed · since. One line, and it may be a fragment. */
  meta?: string;
  /**
   * Where back goes, for the screen reader. The button itself is a bare
   * chevron now — the label that used to sit beside it is gone.
   */
  backTo?: string;
  /** One paragraph under the title, saying what the screen is showing. */
  lede?: string;
  children: ReactNode;
  /** Pinned below the scroll area, where the one primary action lives. */
  footer?: ReactNode;
  /** Off when the screen manages its own scrolling — a list with a dock. */
  scroll?: boolean;
}) {
  const t = useTheme();

  const head = (
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
              { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="back" color={t.text} />
          </Pressable>
        )}
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {badge !== undefined && <Pill label={badge} />}
      </View>

      {meta !== undefined && (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {meta}
        </Text>
      )}

      {lede !== undefined && <Text style={[styles.lede, { color: t.muted }]}>{lede}</Text>}
    </>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {head}
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>
          {head}
          {children}
        </View>
      )}

      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixed: { flex: 1 },
  content: { paddingBottom: 24 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chrome.titleGap,
    paddingTop: chrome.titlePadTop,
    paddingHorizontal: chrome.titlePadH,
  },
  back: {
    width: chrome.back,
    height: chrome.back,
    borderRadius: chrome.back / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.title, flexShrink: 1 },
  meta: {
    ...type.pushMeta,
    paddingTop: chrome.metaPadTop,
    paddingRight: chrome.titlePadH,
    paddingLeft: chrome.metaIndent,
  },
  lede: { ...type.lede, marginTop: 12, marginHorizontal: space.page },

  footer: {
    paddingHorizontal: space.card,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 12,
  },
});
