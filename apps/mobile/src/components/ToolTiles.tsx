import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Spot } from './Spot';
import { SPOTS, type SpotPlace } from '../art/spots';
import { useTheme } from '../design/useTheme';
import { L, z } from '../design/scale';

/**
 * The poker tools as tiles — what `/tools` draws, and since 9 November what
 * the Poker tools sheet on Tonight draws, so the two read as the same thing.
 *
 * One list, one drawing. Where a tile goes is the caller's business: from
 * `/tools` a tool is pushed on top, from Tonight's sheet the sheet closes
 * first (`09-navigation.md`: a sheet never pushes).
 *
 * THE FULL BOARD (`tools`, `pick-tool`, approved): the kit's `tile()` — a
 * lifted card, the name in the title face over its line, and the tool's
 * approved drawing in the bottom-right corner at the board's 'tools' level,
 * in place of the line icons (a percent, a question card, a flame) the tiles
 * carried from 9 November. Two to a row; an odd tile starts a new row at half
 * width with the other half left empty, so every tile keeps the width the
 * names were measured at.
 *
 * ⚠ COPY NOT DRAWN by a handoff — the names and sub-lines are the owner's picks
 * recorded in `docs/screens.md` (*Calculator*, *Rulings* on 26 October, *look
 * up a ruling* on 4 November, *Boosters* on 9 November). BETA under Rulings is
 * the owner's of 26 November, on the full board (`progress.mjs`, `rules`: "The
 * BETA mark sits under Rulings' description, on the tools menu and from
 * Tonight").
 */

export type ToolPath = '/odds' | '/rules' | '/boosters';

export interface Tool {
  path: ToolPath;
  place: SpotPlace;
  name: string;
  sub: string;
  /** A caps mark under the sub-line. */
  mark?: string;
}

export const TOOLS: readonly Tool[] = [
  { path: '/odds', place: 'calculator', name: 'Calculator', sub: 'hand and pot odds' },
  { path: '/rules', place: 'rulings', name: 'Rulings', sub: 'look up a ruling', mark: 'BETA' },
  { path: '/boosters', place: 'boosters', name: 'Boosters', sub: 'bomb pots and more' },
];

export function ToolTiles({
  onOpen,
  on,
}: {
  onOpen: (tool: Tool) => void;
  /** What the grid sits in: a pushed screen's sheet (18 in) or a sheet's body (20 in). */
  on: 'push' | 'sheet';
}) {
  const rows: Tool[][] = [];
  for (let i = 0; i < TOOLS.length; i += 2) rows.push(TOOLS.slice(i, i + 2));
  return (
    <View style={[styles.grid, on === 'push' ? styles.onPush : styles.onSheet]}>
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
  /*
   * THE DRAWING'S OUTLINE, 10 IN FROM THE TILE'S BOTTOM-RIGHT CORNER — the
   * kit's `tileArt(place, 'tools')`. `Spot` centres a drawing's measured
   * outline in its slot, so a slot exactly the outline's size at this level
   * puts the outline on the slot's edges, and the slot is what is placed.
   * Kit points: `Spot` scales them to the phone.
   */
  const art = SPOTS[tool.place];
  const k = art.size.tools / 88;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tool.name}, ${tool.sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.surface, boxShadow: t.lift, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.art}>
        <Spot place={tool.place} level="tools" width={art.box[2] * k} height={art.box[3] * k} />
      </View>
      <Text style={[styles.tileName, { color: t.text }]} numberOfLines={1}>
        {tool.name}
      </Text>
      <Text style={[styles.tileSub, { color: t.muted }]} numberOfLines={2}>
        {tool.sub}
      </Text>
      {tool.mark !== undefined && (
        <View style={[styles.mark, { backgroundColor: t.raised }]}>
          <Text style={[styles.markText, { color: t.muted }]}>{tool.mark}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* The kit's `.tiles`: two across, 10 apart. Neither `Screen` nor `Sheet` pads,
     so the grid carries the page's inset: the kit's `.body` on a push (18 in,
     18 down with the 6 `Screen` already gives), its `.mbody` on a sheet (20 in,
     under the sub-line's own 14). */
  grid: { gap: z(10) },
  onPush: { paddingHorizontal: z(18), paddingTop: z(12) },
  onSheet: { paddingHorizontal: z(20), paddingTop: z(2) },
  gridRow: { flexDirection: 'row', gap: z(10) },
  /* The kit's `.tile`: lifted, 14 corners, 10 / 14 / 14, at least 128 tall. */
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: z(128),
    paddingTop: z(10),
    paddingHorizontal: z(14),
    paddingBottom: z(14),
    borderRadius: L.cardRadius,
    overflow: 'hidden',
  },
  /* The empty half beside an odd tile. It carries the tile's padding because a
     flex basis of 0 still counts padding: without it the tile beside it came
     out wider than the two above. */
  tileSpace: { flex: 1, minWidth: 0, paddingHorizontal: z(14) },
  art: { position: 'absolute', right: z(10), bottom: z(10) },
  tileName: { fontFamily: 'head', fontSize: z(19), lineHeight: z(20.9), fontWeight: '700', letterSpacing: z(-0.19) },
  tileSub: { fontSize: z(11.5), lineHeight: z(15.5), marginTop: z(3), maxWidth: z(118) },
  mark: { alignSelf: 'flex-start', marginTop: z(7), paddingVertical: z(3), paddingHorizontal: z(6), borderRadius: 999 },
  markText: { fontSize: z(9.5), lineHeight: z(9.5), fontWeight: '700', letterSpacing: z(0.76) },
});
