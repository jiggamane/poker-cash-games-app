import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

/**
 * The plan list's round tick — X2b's, and since `design/handoff-game-admin/`
 * the pick on the pass sheet (state 3) and the row tick on the late-changes
 * review (state 12b): "the tick is the plan list's round check; there is no
 * checkbox in the system."
 *
 * Filled with the check in the fill's opposite colour when on; a 1.5px ring in
 * the outline when off. A state, so it is never an outline that reads as a
 * button on its own — the row around it is the target.
 *
 * The full board (`45-running-the-game.mjs`, `tick()`): 22 across, the check
 * 12, the ring `--outline` rather than the quieter outline it was.
 */
export function RoundTick({ on }: { on: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.ring,
        on ? { backgroundColor: t.text } : { borderWidth: 1.5, borderColor: t.outline },
      ]}
    >
      {on && (
        <Svg width={z(12)} height={z(12)} viewBox="0 0 12 12" fill="none">
          <Path
            d="M2.5 6.5l2.5 2.5 4.5-5"
            stroke={t.onFill}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
}

/**
 * A radio: a ring, with a dot in the text colour when picked. The full board
 * draws two — `radio()` in `45-running-the-game.mjs` (22, a 1.5 ring, the
 * one Hand over admin uses) and in `80-settings-and-rules.mjs` (20, a 2 ring,
 * Bill rules') — so the size and the ring are arguments and the dot is 10 in
 * both. `dead` is a row that cannot be picked: its ring is the hairline.
 *
 * Next to `RoundTick` because the two are the only "which one" marks in the
 * app, and a third copy of a ring with a dot in it was about to be written.
 */
export function Radio({
  on,
  dead = false,
  size = 22,
  ring = 1.5,
}: {
  on: boolean;
  dead?: boolean;
  size?: number;
  ring?: number;
}) {
  const t = useTheme();
  const s = z(size);
  return (
    <View
      style={[
        styles.radio,
        {
          width: s,
          height: s,
          borderRadius: s / 2,
          borderWidth: ring,
          borderColor: on ? t.text : dead ? t.hairline : t.outline,
        },
      ]}
    >
      {on && <View style={[styles.dot, { backgroundColor: t.text }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: z(22),
    height: z(22),
    borderRadius: z(11),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radio: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dot: { width: z(10), height: z(10), borderRadius: z(5) },
});
