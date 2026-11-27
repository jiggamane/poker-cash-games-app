import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { z } from '../design/scale';

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
/*
 * The tools button's own drawing (owner, 25 November, "D"): two cards fanned on
 * the ink, the back one at half white, the front one white with a red question
 * mark, 32 points and no round behind it. It always sits on the ink top, in
 * both themes, so its colours are the drawing's and not the theme's — like the
 * approved spot drawings (`src/art/spots.ts`).
 */
const TOOLS_ICON = `<svg viewBox="0 0 22 20"><rect x="3" y="3.5" width="10" height="14.5" rx="2" transform="rotate(-14 8 10.75)" fill="#fff" opacity=".5"/><g transform="rotate(10 13 10)"><rect x="8" y="2.5" width="10.5" height="15" rx="2.1" fill="#fff"/><path d="M11.6 8.4c0-1.1.8-1.9 1.9-1.9s1.9.7 1.9 1.7c0 .8-.5 1.2-1.1 1.6-.5.3-.7.6-.7 1.1v.4" fill="none" stroke="#E5484D" stroke-width="1.5" stroke-linecap="round"/><circle cx="13.55" cy="13.5" r=".95" fill="#E5484D"/></g></svg>`;

export function ToolsButton() {
  const size = z(32);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Poker tools"
      hitSlop={4}
      onPress={() => router.push('/pick-tool')}
      style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.6 : 1 }]}
    >
      <SvgXml xml={TOOLS_ICON} width={size} height={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { width: z(36), height: z(36), alignItems: 'center', justifyContent: 'center' },
});
