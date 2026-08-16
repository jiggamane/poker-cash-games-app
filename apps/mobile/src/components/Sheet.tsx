import { useRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
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
  sub,
  sentence = false,
  children,
  footer,
  onClose,
}: {
  title: string;
  /** A status pill after the title, in the same row. */
  badge?: string;
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
        <SafeAreaView style={styles.fill} edges={['bottom']}>
          <View
            style={[
              styles.panel,
              { backgroundColor: t.sheet, borderTopColor: t.sheetEdge },
            ]}
          >
            <View {...pan.panHandlers}>
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
                {badge !== undefined && <Pill label={badge} />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={close}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.close,
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

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer !== undefined && <View style={styles.footer}>{footer}</View>}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject },

  panel: {
    flex: 1,
    marginTop: chrome.sheetTop,
    borderTopLeftRadius: chrome.sheetRadius,
    borderTopRightRadius: chrome.sheetRadius,
    borderTopWidth: 1,
  },
  grabberRow: { alignItems: 'center', paddingTop: 9, paddingBottom: 2 },
  grabber: {
    width: chrome.grabberWidth,
    height: chrome.grabberHeight,
    borderRadius: 3,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chrome.sheetTitleGap,
    paddingTop: chrome.sheetTitlePadTop,
    paddingHorizontal: chrome.sheetTitlePadH,
  },
  title: { ...type.sheetTitle, flexShrink: 1 },
  titleWithSub: { ...type.sheetTitleSub, flexShrink: 1 },
  close: {
    marginLeft: 'auto',
    width: chrome.close,
    height: chrome.close,
    borderRadius: chrome.close / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { ...type.sheetSub, paddingTop: 7, paddingHorizontal: chrome.sheetTitlePadH },
  sentence: { ...type.sheetSentence, paddingTop: 7, paddingHorizontal: chrome.sheetTitlePadH },

  content: { paddingTop: 16, paddingBottom: 20 },
  // 14 / 20 / 0 and gap 10, the same footer the pushed screens draw — the two
  // chromes differ at the top of a screen and nowhere else.
  footer: {
    paddingHorizontal: space.card,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
});
