import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { space, type } from '../design/tokens';
import { Icon } from './Icon';

/**
 * The frame every pushed screen sits in.
 *
 * A pushed screen carries a back that is LABELLED with where it returns to —
 * not a bare chevron — and a home glyph on the right, because the design's
 * whole navigation idea is that the club is always one tap away without a tab
 * bar.
 *
 * Three bands, each measured off the board and each with its OWN inset:
 *
 *   bar     16 / 20 / 4      chevron 11×18, gap 5, label 500 17
 *   title    4 / 22 / 10     32/1.05, baseline-aligned trailing
 *   footer  16 / 20 / 6      no rule above it — the board draws none
 *
 * The 20-vs-22 difference between the bar and the title is deliberate and it is
 * visible; do not tidy them into one page margin.
 */
export function Screen({
  title,
  trailing,
  backTo,
  action,
  barExtra,
  step,
  lede,
  children,
  footer,
}: {
  title: string;
  /** On the title's baseline, right-aligned — a live badge, a duration. */
  trailing?: ReactNode;
  /** The name of the screen this returns to. Omit on the root. */
  backTo?: string;
  /** A text action at the right of the bar — "Edit", "Cancel". */
  action?: { label: string; onPress?: () => void; quiet?: boolean };
  /** A glyph in the bar, left of the home one. */
  barExtra?: ReactNode;
  /** Numbered flows say "3 of 3" — the close flow is genuinely sequential. */
  step?: string;
  /** One paragraph under the title, saying what the screen is showing. */
  lede?: string;
  children: ReactNode;
  /** Pinned below the scroll area, where the one primary action lives. */
  footer?: ReactNode;
}) {
  const t = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      {backTo !== undefined && (
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back to ${backTo}`}
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="back" color={t.text} />
            <Text style={[styles.backLabel, { color: t.text }]} numberOfLines={1}>
              {backTo}
            </Text>
          </Pressable>

          <View style={styles.barTrailing}>
            {barExtra}
            {action !== undefined && (
              <Pressable
                accessibilityRole="button"
                onPress={action.onPress}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text
                  style={[
                    action.quiet === true ? styles.barActionQuiet : styles.barAction,
                    { color: action.quiet === true ? t.muted : t.text },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="The group"
              onPress={() => router.dismissTo('/')}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Icon name="home" color={t.muted} />
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {trailing}
          {step !== undefined && <Text style={[styles.step, { color: t.muted }]}>{step}</Text>}
        </View>

        {lede !== undefined && <Text style={[styles.lede, { color: t.muted }]}>{lede}</Text>}

        {children}
      </ScrollView>

      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.card,
    paddingTop: 16,
    paddingBottom: 4,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  backLabel: type.eyebrow,
  barTrailing: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 16 },
  barAction: type.barAction,
  barActionQuiet: type.eyebrow,

  content: { paddingBottom: 24 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: space.page,
    paddingTop: 4,
    paddingBottom: 10,
  },
  title: type.title,
  step: { ...type.meta, fontWeight: '600', marginLeft: 'auto' },
  lede: { ...type.lede, marginHorizontal: space.page, marginBottom: 12 },

  footer: {
    paddingHorizontal: space.card,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 12,
  },
});
