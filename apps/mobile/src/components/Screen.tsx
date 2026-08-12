import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { space, type } from '../design/tokens';

/**
 * The frame every screen sits in.
 *
 * A pushed screen carries a back that is LABELLED with where it returns to —
 * not a bare chevron — and a home glyph beside it, because the design's whole
 * navigation idea is that the club is always one tap away without a tab bar.
 */
export function Screen({
  title,
  eyebrow,
  trailing,
  backTo,
  step,
  children,
  footer,
}: {
  title: string;
  /** The group's name, sitting above the title. A name, never a figure. */
  eyebrow?: string;
  /** On the title's baseline, right-aligned — a live badge, a duration. */
  trailing?: ReactNode;
  /** The name of the screen this returns to. Omit on the root. */
  backTo?: string;
  /** Numbered flows say "2 of 3" — the close flow is genuinely sequential. */
  step?: string;
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
            <Text style={[styles.chevron, { color: t.text }]}>‹</Text>
            <Text style={[styles.backLabel, { color: t.text }]} numberOfLines={1}>
              {backTo}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="The group"
            onPress={() => router.dismissTo('/')}
            hitSlop={12}
            style={({ pressed }) => [styles.home, { opacity: pressed ? 0.6 : 1 }]}
          >
            <HomeGlyph color={t.text} />
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {eyebrow !== undefined && (
          <Text style={[styles.eyebrow, { color: t.muted }]}>{eyebrow}</Text>
        )}
        <View style={[styles.titleRow, eyebrow !== undefined && styles.titleTight]}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {trailing}
          {step !== undefined && <Text style={[styles.step, { color: t.muted }]}>{step}</Text>}
        </View>
        {children}
      </ScrollView>

      {footer !== undefined && (
        <View style={[styles.footer, { borderTopColor: t.hairline }]}>{footer}</View>
      )}
    </SafeAreaView>
  );
}

/** A house, drawn rather than imported — the design ships no bitmaps. */
function HomeGlyph({ color }: { color: string }) {
  return (
    <View style={glyph.wrap}>
      <View style={[glyph.roof, { borderBottomColor: color }]} />
      <View style={[glyph.body, { borderColor: color }]} />
    </View>
  );
}

const glyph = StyleSheet.create({
  wrap: { width: 20, height: 18, alignItems: 'center', justifyContent: 'flex-end' },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  body: { width: 14, height: 9, borderWidth: 2, borderTopWidth: 0 },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.page,
    paddingTop: 4,
    paddingBottom: 8,
  },
  back: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  chevron: { fontSize: 26, fontWeight: '400', marginRight: 4, marginTop: -3 },
  backLabel: { ...type.body, fontWeight: '500' },
  home: { paddingLeft: 12 },
  content: { paddingHorizontal: space.page, paddingBottom: 32 },
  eyebrow: { ...type.meta, marginTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 20, gap: 10 },
  titleTight: { marginTop: 2 },
  title: type.title,
  step: { ...type.meta, marginLeft: 'auto' },
  footer: { paddingHorizontal: space.page, paddingTop: 12, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
});
