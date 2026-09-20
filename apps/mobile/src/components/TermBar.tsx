import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { space } from '../design/tokens';

/**
 * A term of the night, on one line, with what it currently is at the far end.
 *
 *     Ended · 03:12                                     Sat 19 Sep   ›
 *
 * THIS IS `RoundingBar`'S GEOMETRY AND THAT IS DELIBERATE, not an accident to
 * be tidied later. E2 and the settled night both already carry the rounding row
 * — one line, bounded by a hairline top and bottom, the label at the left and
 * the value at the right — and the end time is the same KIND of fact about the
 * night: something it was set to, shown where it can be changed. Drawing it in
 * a second shape would say the two are different sorts of thing.
 *
 * ⚠ SO WHY IS IT A SECOND COMPONENT? Because `RoundingBar` is opened by three
 * screens and this change is about a fourth thing entirely, and B14's lesson
 * cuts both ways: one component is what makes the next fix reach every caller,
 * and a shared file edited for a reason that is not its own is how a fix
 * reaches callers that never asked for it. This is the generic bar, written
 * once; `RoundingBar` is the specific one, older, with the rounding vocabulary
 * baked in and three screens depending on its exact output.
 *
 * **Open:** fold `RoundingBar` into this — it becomes `<TermBar label={…}
 * value={…} onPress={…} />` and the two rows stop being able to drift. It is
 * not done here because it would put a diff across E2, E4 and the settled night
 * in a change that is about none of them. `docs/screens.md` carries it.
 *
 * NOT TAPPABLE IS A STATE, the same as `RoundingBar`: leave `onPress` out and
 * the chevron goes with it, so a row that cannot be opened never looks like a
 * door.
 */
export function TermBar({
  label,
  value,
  onPress,
  style,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  style?: object;
}) {
  const t = useTheme();

  const body = (
    <>
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
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
  /* 45 tall — `13px 4px` inside, a hairline top and bottom — at the list's own
     22pt edge. `RoundingBar`'s numbers, so the two rows stack without a seam
     when a screen draws both. */
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
  /* THE LABEL HOLDS AND THE VALUE GIVES, which is `RoundingBar`'s rule and is
     right here for the same reason: at 360 the two halves compete, and the
     label is the half that says which term this row is about. The value here
     is a date at its longest — "Sat 19 Sept", eleven characters — and shrinking
     before the label does is what keeps `Ended · 03:12` whole. */
  label: { fontSize: 15, fontWeight: '600', flexShrink: 0 },
  value: {
    marginLeft: 'auto',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
