import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BOOSTER_SECTIONS, boostersIn, type Booster } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';

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

  return (
    <Screen title="Game boosters" backTo={backTo} meta="house rules for more action">
      {BOOSTER_SECTIONS.map((section) => {
        const rows = boostersIn(section.id);
        return (
          <View key={section.id} style={styles.list}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>{section.label}</Text>
            {rows.map((b, i) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`${b.name}, ${b.summary}`}
                onPress={() => open(b)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: t.hairline,
                    borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={2}>
                    {b.name}
                  </Text>
                  <Text style={[styles.summary, { color: t.muted }]} numberOfLines={2}>
                    {b.summary}
                  </Text>
                </View>
                <Icon name="chevron" color={t.muted} />
              </Pressable>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingTop: 14, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  name: type.rowName,
  summary: { ...type.meta, fontSize: 14, lineHeight: 19 },
});
