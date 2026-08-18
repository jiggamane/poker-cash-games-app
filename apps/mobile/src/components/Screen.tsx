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
  trailing,
  meta,
  backTo,
  lede,
  children,
  footer,
  footerPad = true,
  scroll = true,
  dimmed = false,
}: {
  title: string;
  /**
   * After the title, in the same row. A string becomes a status pill; anything
   * else is drawn as given — Tonight's running-time tag is its own element.
   */
  badge?: ReactNode;
  /**
   * The right edge of the title row: the state of the screen, not part of its
   * name. Two things are drawn there — the step count in the ending flow
   * ("1 of 3") and Tonight's running-time tag.
   *
   * NO CONTROLS, ever. Text or a tag, nothing you can press. That rule is what
   * keeps a push and a sheet telling different stories.
   *
   * ONE THING AT A TIME, and never alongside a badge. Two elements pulling at
   * opposite ends of the row leave the title — the one child that shrinks — to
   * absorb what is left, and on Tonight that broke "Tonight" mid-word. Where a
   * screen seems to want both, one of them belongs somewhere else: Tonight's
   * start time is a line on the On-the-table card. docs/tonight-title-row.md
   * has the arithmetic.
   */
  trailing?: ReactNode;
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
  /** Off when the footer carries its own margins — the dock does. */
  footerPad?: boolean;
  /** Off when the screen manages its own scrolling — a list with a dock. */
  scroll?: boolean;
  /**
   * Everything above the footer drops to .4 while the table-admin drawer is
   * open. The drawer is not a navigation state — it is the dock expanding in
   * place — so the screen stays mounted and simply steps back.
   */
  dimmed?: boolean;
}) {
  const t = useTheme();

  const badgeNode = typeof badge === 'string' ? <Pill label={badge} /> : badge;

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
        {/* The frames draw a title on one line because their back chevron sits
            on a row of its own; Chrome A puts the two together, which costs the
            title 48pt. Where that is not enough it WRAPS — an ellipsis would
            drop a word, and "Where everyone st…" is not a screen title. */}
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {title}
        </Text>

        {badgeNode}
        {trailing !== undefined && <View style={styles.trailing}>{trailing}</View>}
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
        /* `flexShrink` bounds it. A ScrollView is as tall as its content
           unless something says otherwise, and in a column with a pinned
           footer that means a long screen pushes its own primary action off
           the bottom of the phone — with nothing left to scroll, because the
           view is exactly as tall as what is in it. Sheets had the same bug
           and it is the same fix; see `Sheet`. */
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={[styles.body, dimmed && styles.dimmed]}
        >
          {head}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fixed, dimmed && styles.dimmed]}>
          {head}
          {children}
        </View>
      )}

      {footer !== undefined && <View style={footerPad ? styles.footer : undefined}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixed: { flex: 1 },
  // A pushed screen fills the phone, so its scroll area takes what is left
  // after the footer and the footer stays at the foot. (A sheet does the
  // opposite — it shrinks to its content; see `Sheet`.)
  body: { flexGrow: 1, flexShrink: 1 },
  content: { paddingBottom: 24 },
  dimmed: { opacity: chrome.behindDrawer },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chrome.titleGap,
    paddingTop: chrome.titlePadTop,
    paddingHorizontal: chrome.titlePadH,
    // The floor under a title. Every screen's first element adds its own
    // margin on top of this; none of them can land on the title by omitting
    // one, which is exactly what had happened.
    paddingBottom: chrome.titlePadBottom,
  },
  back: {
    width: chrome.back,
    height: chrome.back,
    borderRadius: chrome.back / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.title, flexShrink: 1 },
  trailing: { marginLeft: 'auto' },
  meta: {
    ...type.pushMeta,
    paddingTop: chrome.metaPadTop,
    paddingRight: chrome.titlePadH,
    paddingLeft: chrome.metaIndent,
  },
  lede: { ...type.lede, marginTop: 8, marginHorizontal: space.page },

  // Every board draws the footer `14px 20px 0` with `gap: 10` — E2b, E4, E5,
  // L1, N5, N7, GR4. The 16 and the 12 here were neither, and a two-pixel
  // error on the one block that sits on every screen is the most visible
  // place in the app to have one. The 6 at the foot stays: it is clearance
  // over the safe-area inset, which the drawn frames do not have.
  footer: {
    paddingHorizontal: space.card,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
});
