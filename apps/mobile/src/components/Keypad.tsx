import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
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
 *
 * What a key MEANS against a figure that is already on screen — replace it or
 * append to it — is `typedAmount.ts`, beside this file. It is the half of this
 * control no board draws and the half that four screens each got to decide for
 * themselves until B20.
 *
 * `compact` is the odds calculator's, on a short phone (4 November): keys 44
 * tall rather than 58, so the field being typed into still has room above the
 * pad. Every money screen keeps the full keys.
 */
export function Keypad({
  onDigits,
  onBackspace,
  compact = false,
}: {
  onDigits: (digits: string) => void;
  onBackspace: () => void;
  compact?: boolean;
}) {
  const t = useTheme();

  const key = (label: string, filled: boolean, end = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onDigits(label)}
      style={({ pressed }) => [
        styles.key,
        compact && styles.compact,
        end && styles.last,
        { borderColor: t.hairline, backgroundColor: pressed ? t.raised : 'transparent' },
      ]}
    >
      <Text style={[styles.digit, { color: filled ? t.text : t.muted }]}>{label}</Text>
    </Pressable>
  );

  return (
    /* THE FULL BOARD: a grid of hairlines across the sheet's width, no fills,
       the figures in the title face (the kit's `keypad()`). */
    <View style={[styles.pad, { borderTopColor: t.hairline }]}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d, i) => key(d, true, i % 3 === 2))}
      {key('00', false)}
      {key('0', true)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete"
        onPress={onBackspace}
        style={({ pressed }) => [
          styles.key,
          compact && styles.compact,
          styles.last,
          { borderColor: t.hairline, backgroundColor: pressed ? t.raised : 'transparent' },
        ]}
      >
        <Icon name="backspace" color={t.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1 },
  key: {
    width: '33.3333%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  /* The third key of every row stops the grid at the sheet's edge. */
  last: { borderRightWidth: 0 },
  compact: { height: 44 },
  digit: { fontFamily: 'head', fontSize: 22, fontWeight: '600' },
});
