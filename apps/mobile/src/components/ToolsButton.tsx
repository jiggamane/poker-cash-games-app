import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';

/**
 * The poker tools on a live night's role line — ONE round icon at the right end
 * of the line every phone reads under *Tonight*, opening the Poker tools sheet
 * (`/pick-tool`) with the three tiles: Calculator, Rulings, Boosters.
 *
 * Until 9 November this was two icons side by side, Rules then the calculator,
 * each pushing its tool directly (the canvas "Poker calculator · ways in",
 * 25–26 October). With Boosters as a third tool the owner grouped them behind
 * one: three rounds would take the room the role line's name needs, and the
 * sheet shows the same tiles `/tools` does, so the tools read the same from
 * Tonight as from the club.
 *
 * What the canvas decided still holds: the recording phone and a watcher get
 * the tools IN THE SAME SPOT, not a row in the table-admin drawer, whose every
 * control records money; the round is 40 with the glyph at 21, the back
 * button's fill. The glyph is the question card the home grid's Poker tools
 * tile draws (the owner, 26 October), so one thing has one picture.
 *
 * It goes through `Screen`'s `metaTrailing`, so the role line's text shrinks
 * and this does not, and the whole head dims with the drawer.
 */
export function ToolsButton() {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Poker tools"
      hitSlop={4}
      onPress={() => router.push('/pick-tool')}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="questionCard" color={t.text} />
    </Pressable>
  );
}

const ROUND = 40;

const styles = StyleSheet.create({
  round: {
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
