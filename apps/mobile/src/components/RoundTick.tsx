import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../design/useTheme';

/**
 * The plan list's round tick — X2b's, and since `design/handoff-game-admin/`
 * the pick on the pass sheet (state 3) and the row tick on the late-changes
 * review (state 12b): "the tick is the plan list's round check; there is no
 * checkbox in the system."
 *
 * Filled 20px with the check in the fill's opposite colour when on; a 1.5px
 * ring in the quiet outline when off. A state, so it is never an outline that
 * reads as a button on its own — the row around it is the target.
 */
export function RoundTick({ on }: { on: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.ring,
        on ? { backgroundColor: t.text } : { borderWidth: 1.5, borderColor: t.quietOutline },
      ]}
    >
      {on && (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
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

const styles = StyleSheet.create({
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
