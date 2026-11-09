import { router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { ToolTiles } from '../src/components/ToolTiles';

/**
 * Poker tools — the screen behind the home grid's fourth tile.
 *
 * Decided on the canvas "Odds and rules, where they live" on 25 October, board
 * P2: a PUSH (Chrome A, back to the club, nothing top-right) holding the two
 * tools that are about the game rather than the money — the calculator and the
 * rules library — as the same tiles the home grid draws, so the screen looks
 * like the tile that opened it. One push below the club, which makes each tool
 * the second push, the limit (`09-navigation.md` § Depth); a situation then
 * opens as a sheet, exactly as it does from Settings, and Settings keeps its
 * own two rows to both.
 *
 * Nothing on this screen reads or writes the night. The calculator keeps its
 * own table and a ruling is reference only (`docs/rulings.md` § 1.7), which is
 * what the meta line says.
 *
 * ⚠ COPY NOT DRAWN by any handoff: the title, the meta line and the two
 * sub-lines are the canvas's, marked UNSURE there (`docs/screens.md`).
 *
 * The tile names are *Calculator* and *Rulings*, the owner's call of 26
 * October: the canvas's *Poker calculator* and *Rules & rulings* both cut to an
 * ellipsis at 20/800 in a half-width tile on a 393 phone. The home tile's
 * sub-line still says *poker calculator, rules & rulings* in full, and the
 * screens behind keep their own titles.
 *
 * *Rulings* reads *look up a ruling*, one line, the owner's pick of 4 November
 * over the canvas's *what happened, and what the rule says*, which wrapped.
 *
 * *Boosters* is the third tile, 9 November, the owner's request: bomb pots,
 * straddles and the side games, listed on `/boosters`. It starts a second row
 * of the same two-up grid rather than squeezing three across, so every tile
 * keeps the half width the names were measured at; the empty half beside it is
 * left empty. The name is *Boosters*, not the screen's *Game boosters*, for the
 * same reason *Calculator* is not *Poker calculator*. ⚠ UNSURE, both lines.
 *
 * The tiles are `ToolTiles` since 9 November, shared with the Poker tools
 * sheet that Tonight's one tools icon opens (`/pick-tool`).
 */
export default function PokerTools() {
  return (
    <Screen title="Poker tools" backTo="the club" meta="nothing here touches the ledger">
      <ToolTiles
        onOpen={(tool) => router.push({ pathname: tool.path, params: { from: 'tools' } })}
      />
    </Screen>
  );
}
