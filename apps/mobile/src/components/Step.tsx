import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../design/useTheme';

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
  return <Text style={[styles.step, { color: t.muted }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  step: { fontSize: 13, fontWeight: '600' },
});
