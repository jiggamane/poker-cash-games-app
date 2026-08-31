import { Pressable, StyleSheet, Text, View } from 'react-native';
import { roundingRowLabel, roundingRowValue, type Money, type RoundingMode } from '@poker-club/core';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { space } from '../design/tokens';

/**
 * The rounding bar — `design/handoff-E2/docs/E2-rounding.md`, cut 31 August.
 *
 * NOT `RoundingRow`, which is the money-rules screen's entry for the same
 * setting: a captioned rule row with a sentence under it, sitting in a list of
 * other rules. This is the control bar the addendum draws — one line, bounded
 * top and bottom, carrying the step and what it costs. Two presentations of one
 * value, and the value and its words come from core so they cannot drift.
 *
 *     Rounding · nearest $10                    stacks snap to $10   ›
 *
 * ONE ROW, THREE SCREENS, ONE OWNER. E2 owns the setting, because rounding
 * changes what a stack is worth and so has to be decided where stacks are
 * entered. E4 and E6 draw the identical row and open the identical sheet —
 * they display it, they do not own it — and having one component rather than
 * three copies is what stops the three screens ever disagreeing about what the
 * night is set to. The words are `ruleText.ts`'s for the same reason.
 *
 * IT IS PRESENT IN EVERY STATE, including before the first stack is counted:
 * the doc says so, and the reason is that a host who wants to settle in tens
 * wants to know it before they start rather than after. Off is a state of the
 * row, not its absence — `Rounding · off`, `stacks as counted`.
 *
 * NOT TAPPABLE IS A STATE TOO. Leave `onPress` out and the chevron goes with
 * it: a settled night is locked (rule 8), and a row that still looked like a
 * door would be offering to re-round a record of what people actually paid.
 */
export function RoundingBar({
  mode,
  remainder,
  onPress,
  style,
}: {
  mode: RoundingMode | null | undefined;
  /**
   * What the step cost the piggy bank, where the night has settled far enough
   * to know. It turns the value into `+$16 → piggy`, which is the question the
   * row actually gets asked once there is a figure to ask about.
   */
  remainder?: Money | null;
  onPress?: () => void;
  style?: object;
}) {
  const t = useTheme();
  const label = roundingRowLabel(mode);
  const value = roundingRowValue(mode, remainder);

  const body = (
    <>
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1} nativeID="rounding-label">
        {label}
      </Text>
      <Text style={[styles.value, { color: t.muted }]} numberOfLines={1}>
        {value}
      </Text>
      {onPress !== undefined && <Icon name="chevron" color={t.muted} size={13} />}
    </>
  );

  const frame = [styles.row, { borderColor: t.hairline }, style];

  return onPress === undefined ? (
    <View style={frame}>{body}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} · ${value}`}
      onPress={onPress}
      style={({ pressed }) => [...frame, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /*
   * 45 tall — `13px 4px` inside, a hairline top and bottom — at the list's own
   * 22pt edge. The board draws it edge to edge for the tap target and inset for
   * the type, which is what the 4 is: the rule runs the width of the list above
   * it, and the words line up with the rows either side.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: space.page,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /*
   * THE LABEL IS THE HALF THAT MAY NOT GIVE, which is the one place this row
   * departs from the board — and only because the board is 393 wide and this
   * app supports 360.
   *
   * At 360 the two halves are about five points too long together, and with
   * the label shrinking the row read `Rounding · neares…   stacks snap to $50`:
   * the informative half truncated and the half that only restates it intact.
   * So the label holds and the value gives. What it gives up is a restatement —
   * the step is already in the label — and its other form, `+$16 → piggy`, is
   * twelve characters and never reaches the point of shrinking.
   */
  label: { fontSize: 15, fontWeight: '600', flexShrink: 0 },
  value: {
    marginLeft: 'auto',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
