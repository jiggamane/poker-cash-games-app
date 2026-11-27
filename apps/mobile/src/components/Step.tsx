import { StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

/**
 * "1 of 3" — where a screen sits in the ending flow.
 *
 * Right-aligned muted text rather than a status pill: it is not a state the
 * night is in, it is a position in a sequence, and the three E frames draw it
 * as the quietest thing on the title row. It takes the `trailing` slot, which
 * is text-only by rule.
 */
export function Step({ label }: { label: string }) {
  const t = useTheme();
  /* Always on the ink top, at the title's right (the kit's `.trail`). */
  return <Text style={[styles.step, { color: t.onTopMuted }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  /* The kit's `.trail`: 600 13, in the ink's quieter white. */
  step: { fontSize: z(13), fontWeight: '600' },
});
