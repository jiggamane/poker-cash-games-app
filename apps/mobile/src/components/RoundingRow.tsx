import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { roundingLabel, roundingSentence, type RoundingMode } from '@poker-club/core';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { space, type } from '../design/tokens';

/**
 * How coarsely the group settles, as a row under the money rules.
 *
 * IT IS A MONEY RULE AND IT IS NOT A RULE ROW. It changes what people actually
 * pay, so it belongs on the money-rules screen and not in a list of display
 * preferences — but it has no destination, no collector and nobody it charges,
 * and it governs every rule above it at once. So it sits under its own caption
 * rather than inside the hairline list, where a reader scanning for a switch
 * would find one thing that does not have one.
 *
 * The same row at both levels of the chain, for the same reason `RuleList`
 * is one component: the club's default and tonight's snapshot are the same
 * question asked at two moments, and a sentence written twice is two sentences.
 */
export function RoundingRow({
  mode,
  scope,
  caption = 'How it is rounded',
}: {
  mode: RoundingMode | null;
  /** Which layer of the chain the sheet will write. */
  scope: 'club' | 'night';
  caption?: string;
}) {
  const t = useTheme();

  return (
    <>
      <Text style={[styles.caption, { color: t.muted }]}>{caption}</Text>

      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/rounding', params: { scope } })}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.rowText}>
            <View style={styles.nameLine}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                {roundingLabel(mode)}
              </Text>
              <Icon name="chevron" color={t.muted} size={15} />
            </View>
            <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
              {roundingSentence(mode)}
            </Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  caption: { ...type.sectionLabel, marginTop: 18, marginHorizontal: space.page, marginBottom: 2 },
  list: { marginHorizontal: space.page },
  // doc 15 § 3: a sheet's body rows are 15 / 4, and this one ends the list.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  detail: { fontSize: 13.5, fontWeight: '400' },
});
