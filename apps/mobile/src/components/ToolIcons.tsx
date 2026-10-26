import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';

/**
 * The two poker tools on a live night's role line — Rules & rulings and the
 * Poker calculator — as two round icons at the right end of the line every
 * phone reads under *Tonight*.
 *
 * Decided on the canvas "Poker calculator · ways in", 25–26 October: the
 * recording phone and a watcher get the tools IN THE SAME SPOT ("put it on
 * same spot as on viewers' interface"), not a row in the table-admin drawer,
 * which only the recording phone has and whose every control records money.
 * The icon is 40 round with the glyph at 21 ("40–42 pt look better" over the
 * 34 the calculator's own New hand icon uses), the back button's fill; the
 * glyphs are the set `Icon.tsx` already draws for the home grid. Rules first,
 * then the calculator, left to right.
 *
 * It goes through `Screen`'s `metaTrailing`, so the role line's text shrinks
 * and these do not — the name in "Watching · passed to Aleksandra at 23:10"
 * is what gives, as it already did. The row then carries the floor a meta
 * line with a control carries (B68), and the whole head dims with the drawer.
 *
 * Both open as pushes with back → Tonight, by the `from` param each screen
 * reads: a tool is a place you stay in (`09-navigation.md`), and from Tonight
 * it is the second push, the limit the doc allows — Count up is the precedent.
 */
export function ToolIcons() {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rules"
        hitSlop={4}
        onPress={() => router.push({ pathname: '/rules', params: { from: 'tonight' } })}
        style={({ pressed }) => [
          styles.round,
          { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Icon name="questionCard" color={t.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Poker calculator"
        hitSlop={4}
        onPress={() => router.push({ pathname: '/odds', params: { from: 'tonight' } })}
        style={({ pressed }) => [
          styles.round,
          { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        {/* The front card hides the back card's edge with the ground's own
            colour, as the home grid's tile does with the tile's. */}
        <Icon name="calculator" color={t.text} ground={t.ground} />
      </Pressable>
    </View>
  );
}

const ROUND = 40;

const styles = StyleSheet.create({
  /* 8 between the two, the meta row's own gap to the text beside them. */
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: {
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
