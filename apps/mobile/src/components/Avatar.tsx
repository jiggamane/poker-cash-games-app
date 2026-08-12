import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';

/**
 * A 36px circle with one letter in it.
 *
 * Deliberately not a photo and not a colour: a group is six people the host
 * already knows, and the initial is enough to find a row with a thumb. Colour
 * in this app means money, so an avatar cannot have any.
 */
export function Avatar({ name }: { name: string }) {
  const t = useTheme();
  return (
    <View style={[styles.circle, { backgroundColor: t.surface }]}>
      <Text style={[styles.letter, { color: t.muted }]}>
        {[...name.trim()][0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 14, fontWeight: '700' },
});
