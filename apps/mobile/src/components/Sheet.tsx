import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { useKeyboardInset, useKeyboardUp } from '../lib/keyboard';
import { chrome, space, type } from '../design/tokens';
import { Icon } from './Icon';
import { Pill } from './Pill';

/**
 * Chrome B — a sheet. 09-navigation.md.
 *
 * A screen you open to DO ONE THING: it ends with a Save, an Add, an Apply or
 * a confirm, and it dismisses downward onto what you were looking at, in the
 * same scroll position. A sheet NEVER carries a chevron, and a pushed screen
 * never carries a grabber or a close — that pairing is the whole signal.
 *
 * Three ways out, and all three are wired here: swipe the panel down, tap the
 * close, or complete the action. Tapping the scrim is deliberately NOT one of
 * them; a half-typed amount should not vanish because a thumb landed high.
 *
 * The screen behind sits at opacity .32, which is this scrim: the ground colour
 * at 68% over a route presented as a transparent modal.
 */
export function Sheet({
  title,
  badge,
  meta,
  sub,
  sentence = false,
  children,
  footer,
  onClose,
}: {
  title: string;
  /** A status pill after the title, in the same row. */
  badge?: string;
  /**
   * A count at the right of the title row, before the close — O2's "4 seated".
   * Quiet by design: it is the state of the thing being edited, not a status.
   */
  meta?: string;
  /** One line under the title. */
  sub?: string;
  /** A sub-line that is a sentence sets at 400/1.5 rather than 500. */
  sentence?: boolean;
  children: ReactNode;
  /** Where the one primary action lives. */
  footer?: ReactNode;
  /** Defaults to going back. Pass one when the sheet is a step in a flow. */
  onClose?: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const keyboardUp = useKeyboardUp();

  /*
   * HOW TALL A SHEET IS ALLOWED TO BE — doc 15 § 3 and § 4.7.
   *
   * A sheet hugs its content (`flexShrink`, below) and stops at a cap. The cap
   * is the safe-area inset plus `chrome.sheetGap`, so what is left above the
   * panel is the strip of the screen behind that every board draws under the
   * clock — never the clock itself, and never the Dynamic Island.
   *
   * Below 700 points of usable height the peek is given up: on a phone that
   * small a short sheet floating in the middle of the glass wastes the only
   * dimension there is, so every sheet takes the whole cap. `usable` is the
   * phone less both insets — 647 on an SE, 728 on a 13 mini, 759 here.
   *
   * THE PHONE, AND NOT THE WINDOW. Expo leaves Android on `adjustResize`, so
   * the window is what is left above the keyboard — a Pixel's 915 becomes
   * something near 600 the moment a name or an amount is tapped. Measuring
   * that would push the phone under the floor mid-keystroke and snap the panel
   * to the top of the screen while somebody was typing into it. `screen` is
   * the glass and does not move. iOS reports the two the same; the web
   * keyboard never touches `innerHeight` at all (it shrinks `visualViewport`,
   * which is what `useKeyboardInset` reads), and there `screen` is the
   * monitor rather than the viewport — so the web takes the window.
   *
   * Reading `Dimensions` in render is not reactive on its own; the window
   * hook above is what re-renders on a rotation, and this is re-read when it
   * does.
   */
  const height = Platform.OS === 'web' ? window.height : Dimensions.get('screen').height;
  const cap = insets.top + chrome.sheetGap;
  const full = height - insets.top - insets.bottom < chrome.sheetFullHeightBelow;
  /* Web only, and 0 everywhere else: see `useKeyboardInset`. */
  const covered = useKeyboardInset();
  const close = onClose ?? (() => router.back());

  /*
   * The drag lives on the header — grabber, title, sub-line — and not on the
   * body, so a list inside a sheet still scrolls. Under about a third of the
   * panel's travel it springs back; past it, the sheet leaves.
   */
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.2) close();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.fill}>
      <View style={[styles.fill, styles.scrim, { backgroundColor: t.scrim }]} />

      <Animated.View style={[styles.fill, { transform: [{ translateY: drag }] }]}>
        {/*
         * THE KEYBOARD MOVES THE PANEL, NOT THE CONTENT. Half these sheets end
         * with Save under a field — the amount, a player's name, what a table
         * is called — and a footer behind the keyboard is a sheet you cannot
         * finish. Padding rather than height: the panel keeps its radius and
         * its grabber where they were.
         */}
        <KeyboardAvoidingView
          style={[styles.fill, styles.bottom, covered > 0 && { paddingBottom: covered }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            // Measured here by `scripts/ui-frames.mjs`: a sheet is held against
            // its drawn panel, not against the screen it happens to cover.
            nativeID="sheet-root"
            style={[
              styles.panel,
              { marginTop: cap, backgroundColor: t.sheet, borderTopColor: t.sheetEdge },
              full && styles.panelFull,
            ]}
          >
            <View {...pan.panHandlers}>
              <View style={styles.grabberRow}>
                <View style={[styles.grabber, { backgroundColor: t.grabber }]} />
              </View>

              <View style={[styles.titleRow, sub === undefined && styles.titleRowAlone]}>
                <Text
                  nativeID="sheet-title"
                  style={[styles.title, { color: t.text }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {badge !== undefined && <Pill label={badge} />}
                {meta !== undefined && (
                  <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
                    {meta}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={close}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.close,
                    meta !== undefined && styles.closeAfterMeta,
                    { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Icon name="close" color={t.text} />
                </Pressable>
              </View>

              {sub !== undefined && (
                <Text style={[sentence ? styles.sentence : styles.sub, { color: t.muted }]}>
                  {sub}
                </Text>
              )}
            </View>

            {/*
             * `flexShrink` IS THE WHOLE FIX, and it was the whole bug.
             *
             * A ScrollView takes the height of its content unless something
             * bounds it. In a column with a pinned footer that means a long
             * body grows past the panel and pushes the footer off the bottom
             * of the phone — and because the ScrollView is exactly as tall as
             * what is in it, it has nothing to scroll, so the copy simply ends
             * mid-sentence at the edge of the screen. That is what happened on
             * the rule sheet (Save and Remove 44pt below the glass) and on Set
             * up the game (no footer visible at all).
             *
             * Shrinking rather than `flex: 1` keeps every short sheet drawn
             * where the boards draw it — action directly under the content —
             * and only takes space back when there is none left to give.
             */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={[
                styles.content,
                // With no footer, the last row is what clears the home
                // indicator; with one, the footer does it below.
                footer === undefined && { paddingBottom: 20 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer !== undefined && (
              /*
               * doc 15 § 5 check 2 — the button's bottom edge sits 28 above
               * the screen bottom: 6 of footer pad plus the 22 the home
               * indicator band occupies. On a phone the inset already covers
               * the band, so the pad is what is left of the 28.
               *
               * WITH THE KEYBOARD UP that band is behind the keyboard, and
               * A8 puts the button directly on the keyboard's top edge. Left
               * in place the pad holds it 28 above the edge it should sit on,
               * and on a short phone that gap is what pushes the field being
               * typed into off the screen.
               */
              <View
                // Named so `scripts/ui-audit.mjs` can find the one block that
                // must never end up behind the keyboard.
                nativeID="sheet-footer"
                style={[
                  styles.footer,
                  { paddingBottom: keyboardUp || covered > 0 ? 6 : insets.bottom > 0 ? 28 : 6 },
                ]}
              >
                {footer}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject },

  // Anchored to the bottom of the phone, and only as tall as it needs to be.
  //
  // It used to be `flex: 1` — every sheet the full height of the screen — which
  // put the action of a short one (New player, a confirm) in the middle of a
  // panel with a hand's width of nothing under it. Shrinking rather than
  // growing gives both: a short sheet is short, and one with more in it than
  // fits stops at the cap and scrolls inside, which is where the boards draw
  // the tall ones — 80 down on the reference frame, and 772 tall.
  //
  // `marginTop` is the cap and is set on the element rather than here: it is
  // the safe-area inset plus `chrome.sheetGap`, and the inset is only known at
  // render. It was a flat 18 in this block until docs/sheet-heights.md, which
  // is not a gap below anything — on a Dynamic Island phone it is 41 points
  // behind the island, and the grabber and the title went under it.
  panel: {
    flexShrink: 1,
    borderTopLeftRadius: chrome.sheetRadius,
    borderTopRightRadius: chrome.sheetRadius,
    borderTopWidth: 1,
  },
  // doc 15 § 4.7 · a short phone gives up the peek and every sheet fills to
  // the cap. Growing as well as shrinking is the whole difference.
  panelFull: { flexGrow: 1 },
  grabberRow: { alignItems: 'center', paddingTop: 9, paddingBottom: 2 },
  grabber: {
    width: chrome.grabberWidth,
    height: chrome.grabberHeight,
    borderRadius: 3,
  },

  // doc 15 § 3: header 12 / 22, then 8 under it when a subhead follows and 14
  // when the body does. The subhead carries its own 14 below itself.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chrome.sheetTitleGap,
    paddingTop: chrome.sheetTitlePadTop,
    paddingHorizontal: chrome.sheetTitlePadH,
    paddingBottom: 8,
  },
  titleRowAlone: { paddingBottom: 14 },
  title: { ...type.sheetTitle, flexShrink: 1 },
  // 600 13px, pushed right — the meta takes the free space so the close sits
  // beside it rather than both of them fighting for the same auto margin.
  meta: { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  close: {
    marginLeft: 'auto',
    width: chrome.close,
    height: chrome.close,
    borderRadius: chrome.close / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeAfterMeta: { marginLeft: 0 },
  sub: { ...type.sheetSub, paddingBottom: 14, paddingHorizontal: chrome.sheetTitlePadH },
  sentence: { ...type.sheetSentence, paddingBottom: 14, paddingHorizontal: chrome.sheetTitlePadH },

  // Bounded, so it yields to the footer instead of pushing it off the phone.
  // `flexGrow: 0` is what react-native-web needs to agree with the phone:
  // its ScrollView grows by default, which would pin every short sheet's
  // action to the bottom of the panel on the web and leave `ui-check`
  // screenshotting a layout no phone draws.
  body: { flexGrow: 0, flexShrink: 1 },
  content: { paddingBottom: 20 },
  // 14 / 20 / 0 and gap 10, the same footer the pushed screens draw — the two
  // chromes differ at the top of a screen and nowhere else.
  // The panel now paints all the way to the bottom edge of the phone — the
  // safe-area inset is applied HERE, inside it, rather than to a wrapper that
  // stopped the sheet short and left a band of the screen behind showing under
  // it. `paddingBottom` is set on the element; the 6 is the floor for a phone
  // with no home indicator.
  footer: {
    paddingHorizontal: space.card,
    paddingTop: 14,
    gap: 10,
  },
});
