import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/tokens';
import { Icon } from './Icon';

/**
 * The number pad every amount is typed on.
 *
 * Its own keys rather than the system keyboard: the amount is the whole point
 * of the screen, and a keyboard sliding up would cover the running figure and
 * the button that commits it. It also means there is no decimal point, which
 * is correct — this app deals in whole units and `Money` refuses anything else.
 *
 * `00` sits where a decimal point would: at a table where buy-ins are 500 and
 * 1,000, two zeros is the key you actually want.
 */
export function Keypad({
  onDigits,
  onBackspace,
}: {
  onDigits: (digits: string) => void;
  onBackspace: () => void;
}) {
  const t = useTheme();

  const key = (label: string, filled: boolean) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onDigits(label)}
      style={({ pressed }) => [
        styles.key,
        filled && { backgroundColor: t.surface },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.digit, { color: filled ? t.text : t.muted }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.pad}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, true))}
      {key('00', false)}
      {key('0', true)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete"
        onPress={onBackspace}
        style={({ pressed }) => [styles.key, styles.delete, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="backspace" color={t.muted} />
      </Pressable>
    </View>
  );
}

/** Append digits to a typed amount, refusing a leading zero and silly lengths. */
export function appendDigits(current: string, digits: string): string {
  const next = (current === '0' ? '' : current) + digits;
  const trimmed = next.replace(/^0+(?=\d)/, '');
  return trimmed.length > 9 ? current : trimmed;
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  // Three to a row, with the gaps taken out of the width.
  key: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.pressable,
  },
  delete: { backgroundColor: 'transparent' },
  digit: { fontSize: 25, fontWeight: '500' },
});
