import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { BOOSTER_MONEY_NOTE, BOOSTER_SECTIONS, boosterById } from '@poker-club/core';
import { Sheet } from '../src/components/Sheet';
import { Card, SectionLabel } from '../src/components/Card';
import { Spot } from '../src/components/Spot';
import type { SpotPlace } from '../src/art/spots';
import { useTheme } from '../src/design/useTheme';

/**
 * One game booster, described — read at the table before the group decides
 * whether to play it. Opened from `/boosters`.
 *
 * A SHEET, as `/situation` is: one thing, read it and swipe back, and the
 * list behind it is already the second push. Nothing is saved and nothing is
 * switched on: the app does not run a booster, it explains one.
 *
 * The order is the order a table needs it in: what it is; how a hand of it
 * goes, numbered, because it happens in that order; where tables play it
 * different ways, each question with its named answers under *Choose your
 * version* (9 November), so a group picks one; what the table has to
 * agree before the first one, in a card, because that is the part a host reads
 * out; named variations where there are any; the one thing worth knowing; and,
 * at the foot, why none of it touches the ledger.
 *
 * ⚠ COPY NOT DRAWN — the five labels and the text are UNSURE (`docs/screens.md`).
 */
export default function BoosterSheet() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const b = id === undefined ? undefined : boosterById(id);
  if (b === undefined) return <Sheet title="Game boosters">{null}</Sheet>;

  const section = BOOSTER_SECTIONS.find((s) => s.id === b.section)?.label ?? '';

  return (
    /* THE FULL BOARD (`booster`, approved 22 November): the approved drawing
       heads the sheet, the labels are the quiet section labels, the agreement
       is a card. No bar: nothing here is confirmed. */
    <Sheet title={b.name} sub={section}>
      <View style={styles.art}>
        <Spot place={b.id as SpotPlace} level="sheet" width={150} height={84} align="left" />
      </View>
      <Text style={[styles.what, { color: t.text }]}>{b.what}</Text>

      <View style={styles.block}>
        <SectionLabel text="How it works" quiet />
        {b.how.map((step, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.marker, { color: t.muted }]}>{`${i + 1}`}</Text>
            <Text style={[styles.itemText, { color: t.text }]}>{step}</Text>
          </View>
        ))}
      </View>

      {b.choices !== undefined && (
        <View style={styles.block}>
          <SectionLabel text="Choose your version" quiet />
          {b.choices.map((c) => (
            <View key={c.label} style={styles.choice}>
              <Text style={[styles.choiceLabel, { color: t.text }]}>{c.label}</Text>
              {c.options.map((o) => (
                <View key={o.name} style={styles.item}>
                  <Text style={[styles.marker, { color: t.muted }]}>•</Text>
                  <Text style={[styles.itemText, { color: t.text }]}>
                    <Text style={styles.optionName}>{o.name}. </Text>
                    {o.text}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <Card pad style={styles.card}>
        <SectionLabel text="Agree before you start" quiet />
        {b.agree.map((line, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.marker, { color: t.muted }]}>•</Text>
            <Text style={[styles.itemText, { color: t.text }]}>{line}</Text>
          </View>
        ))}
      </Card>

      {b.variations !== undefined && (
        <View style={styles.block}>
          <SectionLabel text="Variations" quiet />
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
          <SectionLabel text="Worth knowing" quiet />
          <Text style={[styles.itemText, { color: t.text }]}>{b.worth}</Text>
        </View>
      )}

      <Text style={[styles.note, { color: t.muted }]}>{BOOSTER_MONEY_NOTE}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  art: { paddingHorizontal: 20, paddingTop: 6 },
  what: { fontSize: 15, lineHeight: 21.75, paddingHorizontal: 20, paddingTop: 12 },
  block: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  card: { marginHorizontal: 20, marginTop: 16, gap: 8 },
  item: { flexDirection: 'row', gap: 6 },
  choice: { gap: 6, paddingTop: 4 },
  choiceLabel: { fontFamily: 'head', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  optionName: { fontWeight: '700' },
  marker: { fontSize: 14, lineHeight: 19.6, fontWeight: '600', width: 18, fontVariant: ['tabular-nums'] },
  itemText: { fontSize: 14, lineHeight: 19.6, flex: 1, minWidth: 0 },
  note: { fontSize: 13, lineHeight: 18.85, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
});
