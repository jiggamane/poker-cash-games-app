import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../design/useTheme';
import { home, space, type } from '../design/tokens';

/**
 * The poker tools as tiles — what `/tools` draws, and since 9 November what
 * the Poker tools sheet on Tonight draws, so the two read as the same thing.
 *
 * One list, one drawing. Where a tile goes is the caller's business: from
 * `/tools` a tool is pushed on top, from Tonight's sheet the sheet closes
 * first (`09-navigation.md`: a sheet never pushes).
 *
 * The tiles are home's at home's geometry (`home.tile*`), two to a row. An odd
 * tile starts a new row at half width with the other half left empty, so every
 * tile keeps the width the names were measured at. Not shared with
 * `index.tsx` on purpose: home's tile also knows about a waiting state and a
 * fresh club.
 *
 * The icons, 9 November (the owner): the calculator a bare percent sign and
 * Boosters a flame, with no card outline; Rulings keeps its question card. All
 * three in the same line and colour — the flame was the 🔥 emoji for an hour,
 * and one tile in colour among greyscale ones was the problem.
 *
 * ⚠ COPY NOT DRAWN — the names and sub-lines are the owner's picks recorded in
 * `docs/screens.md` (*Calculator*, *Rulings* on 26 October, *look up a ruling*
 * on 4 November, *Boosters* on 9 November).
 */

export type ToolPath = '/odds' | '/rules' | '/boosters';

export interface Tool {
  path: ToolPath;
  icon: IconName;
  name: string;
  sub: string;
}

export const TOOLS: readonly Tool[] = [
  { path: '/odds', icon: 'percent', name: 'Calculator', sub: 'hand and pot odds' },
  { path: '/rules', icon: 'questionCard', name: 'Rulings', sub: 'look up a ruling' },
  { path: '/boosters', icon: 'flame', name: 'Boosters', sub: 'bomb pots and more' },
];

export function ToolTiles({ onOpen }: { onOpen: (tool: Tool) => void }) {
  const rows: Tool[][] = [];
  for (let i = 0; i < TOOLS.length; i += 2) rows.push(TOOLS.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].path} style={styles.gridRow}>
          {row.map((tool) => (
            <Tile key={tool.path} tool={tool} onPress={() => onOpen(tool)} />
          ))}
          {row.length === 1 && <View style={styles.tileSpace} />}
        </View>
      ))}
    </View>
  );
}

function Tile({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tool.name}, ${tool.sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.round, { backgroundColor: t.roundFill }]}>
        <Icon name={tool.icon} color={t.text} />
      </View>
      <View style={styles.tileText}>
        <Text style={[styles.tileName, { color: t.text }]} numberOfLines={1}>
          {tool.name}
        </Text>
        <Text style={[styles.tileSub, { color: t.muted }]} numberOfLines={2}>
          {tool.sub}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* The page's own inset, not home's 20: neither `Screen` nor `Sheet` pads. */
  grid: { gap: home.tileGap, marginHorizontal: space.page, paddingTop: 4 },
  gridRow: { flexDirection: 'row', gap: home.tileGap },
  tile: {
    flex: 1,
    minWidth: 0,
    height: home.tileHeight,
    padding: home.tilePad,
    borderRadius: home.tileRadius,
    justifyContent: 'space-between',
  },
  /* The empty half beside an odd tile. It carries the tile's padding because a
     flex basis of 0 still counts padding: without it the tile beside it came
     out 16 points wider than the two above. */
  tileSpace: { flex: 1, minWidth: 0, padding: home.tilePad },
  round: {
    width: home.tileRound,
    height: home.tileRound,
    borderRadius: home.tileRound / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { gap: 2 },
  tileName: type.tileName,
  tileSub: type.tileSub,
});
