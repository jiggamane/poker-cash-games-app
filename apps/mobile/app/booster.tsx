import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BOOSTER_MONEY_NOTE, BOOSTER_SECTIONS, boosterById } from '@poker-club/core';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';

/**
 * One game booster, described — read at the table before the group decides
 * whether to play it. Opened from `/boosters`.
 *
 * A SHEET, as `/situation` is: one thing, read it and swipe back, and the
 * list behind it is already the second push. Nothing is saved and nothing is
 * switched on: the app does not run a booster, it explains one.
 *
 * The order is the order a table needs it in: what it is; how a hand of it
 * goes, numbered, because it happens in that order; what the table has to
 * agree before the first one, in a card, because that is the part a host reads
 * out; named variations where there are any; the one thing worth knowing; and,
 * at the foot, why none of it touches the ledger.
 *
 * ⚠ COPY NOT DRAWN — the four labels and the text are UNSURE (`docs/screens.md`).
 */
export default function BoosterSheet() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const b = id === undefined ? undefined : boosterById(id);
  if (b === undefined) return <Sheet title="Game boosters">{null}</Sheet>;

  const section = BOOSTER_SECTIONS.find((s) => s.id === b.section)?.label ?? '';

  return (
    <Sheet title={b.name} sub={section}>
      <Text style={[styles.what, { color: t.text }]}>{b.what}</Text>

      <View style={styles.block}>
        <Text style={[styles.label, { color: t.muted }]}>How it works</Text>
        {b.how.map((step, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.marker, { color: t.muted }]}>{`${i + 1}`}</Text>
            <Text style={[styles.itemText, { color: t.text }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <Text style={[styles.label, { color: t.muted }]}>Agree before you start</Text>
        {b.agree.map((line, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.marker, { color: t.muted }]}>•</Text>
            <Text style={[styles.itemText, { color: t.text }]}>{line}</Text>
          </View>
        ))}
      </View>

      {b.variations !== undefined && (
        <View style={styles.block}>
          <Text style={[styles.label, { color: t.muted }]}>Variations</Text>
          {b.variations.map((line, i) => (
            <View key={i} style={styles.item}>
              <Text style={[styles.marker, { color: t.muted }]}>•</Text>
              <Text style={[styles.itemText, { color: t.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      )}

      {b.worth !== undefined && (
        <View style={styles.block}>
          <Text style={[styles.label, { color: t.muted }]}>Worth knowing</Text>
          <Text style={[styles.itemText, { color: t.text }]}>{b.worth}</Text>
        </View>
      )}

      <Text style={[styles.note, { color: t.muted }]}>{BOOSTER_MONEY_NOTE}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  what: { fontSize: 17, lineHeight: 25, paddingHorizontal: space.page, paddingTop: 4 },
  block: { paddingHorizontal: space.page, paddingTop: 18, gap: 8 },
  card: {
    marginHorizontal: space.page,
    marginTop: 18,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  label: { ...type.sectionLabel },
  item: { flexDirection: 'row', gap: 10 },
  marker: { fontSize: 15, lineHeight: 22, fontWeight: '700', width: 12, fontVariant: ['tabular-nums'] },
  itemText: { fontSize: 15, lineHeight: 22, flex: 1, minWidth: 0 },
  note: { ...type.meta, lineHeight: 19, paddingHorizontal: space.page, paddingTop: 18, paddingBottom: 8 },
});
