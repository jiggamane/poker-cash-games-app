import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BOOSTER_SECTIONS, boostersIn, type Booster } from '@poker-club/core';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Pip } from '../src/components/PlayingCard';
import { Spot } from '../src/components/Spot';
import type { SpotPlace } from '../src/art/spots';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';

/**
 * Game boosters — the list. The third tile on Poker tools, added 9 November
 * at the owner's request: bomb pots, straddles and the side games a table can
 * add, listed first by name with one line each, and each described in full on
 * the sheet a row opens (`/booster`).
 *
 * A PUSH (Chrome A, back → Poker tools): a reference you browse and stay in,
 * like `/rules`. Club → Poker tools → Game boosters is the second push, the
 * limit (`09-navigation.md` § Depth), so a booster opens as a sheet, exactly
 * as a situation does from the library.
 *
 * Nothing here reads or writes the night: every booster is played in chips at
 * the table, which is what the meta line says.
 *
 * ⚠ COPY NOT DRAWN by any handoff — the title, the meta line, the two section
 * labels and every booster's text are UNSURE (`docs/screens.md`).
 */
export default function Boosters() {
  const t = useTheme();
  /* Where back goes, for the screen reader: Poker tools, or Tonight since the
     role line's tools icon (9 November) reaches the list through a sheet. */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const backTo = from === 'tonight' ? 'Tonight' : 'Poker tools';
  const open = (b: Booster) => router.push({ pathname: '/booster', params: { id: b.id } });

  /*
   * THE FULL BOARD (`boosters`, approved 22 November): a card per section
   * under its label, the section marked by a pip — clubs in the text colour
   * for side games, diamonds in red for bigger pots — and each row led by its
   * approved drawing. No chevrons; the whole row opens the booster.
   */
  return (
    <Screen title="Game boosters" backTo={backTo} meta="house rules for more action">
      <View style={styles.body}>
        {BOOSTER_SECTIONS.map((section) => {
          const rows = boostersIn(section.id);
          return (
            <View key={section.id} style={styles.section}>
              <SectionLabel
                text={section.label}
                lead={<Pip suit={section.id === 'side' ? 0 : 1} size={13} color={section.id === 'side' ? t.text : t.red} />}
              />
              <Card style={styles.card}>
                {rows.map((b, i) => (
                  <CardRow
                    key={b.id}
                    last={i === rows.length - 1}
                    accessibilityLabel={`${b.name}, ${b.summary}`}
                    onPress={() => open(b)}
                    lead={<Spot place={b.id as SpotPlace} level="rows" width={56} height={48} />}
                    name={b.name}
                    meta={b.summary}
                    wrapMeta
                  />
                ))}
              </Card>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 12, gap: 12 },
  section: { gap: 12 },
  card: { paddingLeft: 6 },
});
