import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
import { L, z } from '../design/scale';

/**
 * A term of the night, on one line, with what it currently is at the far end.
 *
 *     Ended · 03:12                                         Sat 19 Sep
 *
 * IT IS THE SAME ROW AS THE ROUNDING ONE AND THAT IS DELIBERATE. The end time
 * is the same KIND of fact about the night as its rounding: something it was
 * set to, shown where it can be changed. Drawing it in a second shape would say
 * the two are different sorts of thing.
 *
 * FOLDED, 27 November: `RoundingBar` is now `<TermBar label={…} value={…}
 * nativeID="rounding-label" />`, so the two rows cannot drift. (This was the
 * open item `docs/screens.md` carried.)
 *
 * THE FULL BOARD'S ROW (`design/explorations/full-board/`, every screen that
 * draws `Rounding · off` or `Ended · 17:23`, approved): a row in a lifted card —
 * the name at 15.5/600 at the left, its value in the muted 13.5 at the right —
 * and NOTHING POINTS. The chevron that said "this opens" is gone with every
 * other chevron in the look; a row that opens is still the whole target.
 *
 * ON ITS OWN it draws its own one-row card and carries the sheet's 20 side
 * inset itself, as `SpendList` and `RuleList` do, so a screen that drops it
 * into an unpadded column gets the board's card. `bare` draws the row alone for
 * a screen that stacks several terms in ONE card of its own (Count up's
 * Rounding and Ended), with `last` on the bottom one.
 */
export function TermBar({
  label,
  value,
  onPress,
  style,
  nativeID,
  bare = false,
  last = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  style?: object;
  /** On the label, for the checks — `RoundingBar` names its `rounding-label`. */
  nativeID?: string;
  /** The row alone, for a card the screen draws round several terms. */
  bare?: boolean;
  /** With `bare`: the bottom row of that card, so no hairline under it. */
  last?: boolean;
}) {
  const t = useTheme();

  const body = (
    <>
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1} {...(nativeID === undefined ? {} : { nativeID })}>
        {label}
      </Text>
      <Text style={[styles.value, { color: t.muted }]} numberOfLines={1}>
        {value}
      </Text>
    </>
  );

  const frame = bare
    ? [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }, style]
    : [styles.row, styles.card, { backgroundColor: t.surface, boxShadow: t.lift }, style];

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
  /* The kit's `.row`: 44 at least, `8 0`, the label and value 10 apart. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    minHeight: z(44),
    paddingVertical: z(8),
  },
  /* On its own: the kit's `card()` round one row — 14 round, 12 in, at the sheet's 20. */
  card: { borderRadius: L.cardRadius, paddingHorizontal: z(12), marginHorizontal: z(20) },
  /*
   * THE LABEL HOLDS AND THE VALUE GIVES. At 360 the two halves compete, and
   * the label is the half that says which term this row is about — with it
   * shrinking the rounding row read `Rounding · neares…   stacks snap to $50`,
   * the informative half truncated and the half that only restates it intact.
   * `ui-journeys.mjs` holds the rounding label whole at 360. The value is a
   * restatement (the step is in the label) or a date at its longest, "Sat 19
   * Sept", and shrinking first is what keeps `Ended · 03:12` whole.
   */
  label: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6), flexShrink: 0 },
  value: {
    marginLeft: 'auto',
    flexShrink: 1,
    fontSize: z(13.5),
    fontWeight: '400',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
