import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { home, space, type } from '../src/design/tokens';

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
 */
export default function PokerTools() {
  const t = useTheme();
  return (
    <Screen title="Poker tools" backTo="the club" meta="nothing here touches the ledger">
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile
            icon="calculator"
            name="Calculator"
            sub="hand and pot odds"
            onPress={() => router.push({ pathname: '/odds', params: { from: 'tools' } })}
          />
          <Tile
            icon="questionCard"
            name="Rulings"
            sub="look up a ruling"
            onPress={() => router.push({ pathname: '/rules', params: { from: 'tools' } })}
          />
        </View>
        <View style={styles.gridRow}>
          <Tile
            icon="boostCard"
            name="Boosters"
            sub="bomb pots and more"
            onPress={() => router.push('/boosters')}
          />
          <View style={styles.tileSpace} />
        </View>
      </View>
    </Screen>
  );
}

/**
 * The home grid's tile, drawn here at the same geometry (`home.tile*`) so the
 * two screens agree. Not shared with `index.tsx` on purpose: home's tile also
 * knows about a waiting state and a fresh club, and a shared component would
 * be a shared file two sessions could open (`CLAUDE.md`).
 */
function Tile({
  icon,
  name,
  sub,
  onPress,
}: {
  icon: IconName;
  name: string;
  sub: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.dockFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.round, { backgroundColor: t.roundFill }]}>
        <Icon name={icon} color={t.text} ground={t.surface} />
      </View>
      <View style={styles.tileText}>
        <Text style={[styles.tileName, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.tileSub, { color: t.muted }]} numberOfLines={2}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* The pushed screen's own inset, not home's 20: `Screen` pads nothing. */
  grid: { gap: home.tileGap, marginHorizontal: space.page, paddingTop: 4 },
  gridRow: { flexDirection: 'row', gap: home.tileGap },
  /* The empty half beside an odd tile, so it keeps the half width. It carries
     the tile's padding because a flex basis of 0 still counts padding: without
     it the tile beside it came out 16 points wider than the two above. */
  tileSpace: { flex: 1, minWidth: 0, padding: home.tilePad },
  tile: {
    flex: 1,
    minWidth: 0,
    height: home.tileHeight,
    padding: home.tilePad,
    borderRadius: home.tileRadius,
    justifyContent: 'space-between',
  },
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
