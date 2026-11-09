import { router } from 'expo-router';
import { Sheet } from '../src/components/Sheet';
import { ToolTiles } from '../src/components/ToolTiles';

/**
 * Poker tools, as a sheet — what Tonight's one tools icon opens, on the
 * recording phone and a watcher's alike (`ToolsButton`).
 *
 * The owner, 9 November: with a third tool the role line's separate icons are
 * grouped behind one, opening the same three tiles `/tools` draws. It is a
 * SHEET and not `/tools` itself because of depth (`09-navigation.md`): club →
 * Tonight is already one push, so `/tools` would be the second and every tool
 * behind it a third. As a sheet it is a chooser, like `/pick`: tapping a tile
 * CLOSES THE SHEET FIRST — a sheet never pushes — and then pushes the tool
 * from Tonight, the second push, exactly where the two icons used to put it.
 * Back from the tool is Tonight, as it was.
 *
 * ⚠ COPY NOT DRAWN — the title and the sub-line are `/tools`' own.
 */
export default function PickTool() {
  return (
    <Sheet title="Poker tools" sub="nothing here touches the ledger">
      <ToolTiles
        onOpen={(tool) => {
          router.back();
          router.push({ pathname: tool.path, params: { from: 'tonight' } });
        }}
      />
    </Sheet>
  );
}
