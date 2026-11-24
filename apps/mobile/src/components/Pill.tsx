import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
import { radius, type } from '../design/tokens';

/**
 * A status pill: SEATED, CASHED OUT, 1 OF 3.
 *
 * It sits directly after a title, in the same row, and it is a STATE — which is
 * why it is a tint and never an outline. An outline reads as something you can
 * press, and none of these can be.
 *
 * `tone` picks what the state is about: 'plain' is the state of a screen,
 * 'muted' is a state that has passed, 'amber' is one that is waiting on
 * somebody, and the money pair is for a figure that is a result.
 */
export function Pill({
  label,
  tone = 'plain',
  onTop = false,
}: {
  label: string;
  tone?: 'plain' | 'muted' | 'amber' | 'win' | 'loss';
  /** Sitting on the ink top beside a title: white on the ink's own fill (the kit's `tpill`). */
  onTop?: boolean;
}) {
  const t = useTheme();
  const color = onTop
    ? t.onTop
    : tone === 'muted'
      ? t.muted
      : tone === 'amber'
        ? t.amber
        : tone === 'win'
          ? t.win
          : tone === 'loss'
            ? t.loss
            : t.text;

  return (
    <View style={[styles.pill, { backgroundColor: onTop ? t.onTopFill : t.roundFill }]}>
      <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.badge,
  },
  label: type.badge,
});
