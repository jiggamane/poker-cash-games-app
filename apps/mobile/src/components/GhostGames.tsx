import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { z } from '../design/scale';
import { useTheme } from '../design/useTheme';

/**
 * TWO ROWS THAT ARE NOT NIGHTS — `stats-empty`'s `ghostGames` in the full
 * board (`design/explorations/full-board/screens/70-sessions-stats-group.mjs`):
 * the shape a night row will take (a date and a figure, the line under them)
 * in the faint grey, with a rule between the two. Nothing in it is read aloud;
 * the line under the card says what it is.
 *
 * Drawn by My stats under `LAST GAMES` and by Sessions in place of its list,
 * so the two screens' "no nights yet" look the same (owner, 27 November).
 */
export function GhostGames() {
  const t = useTheme();
  const line = (width: `${number}%`, height: number) => (
    <View style={{ width, height: z(height), borderRadius: z(height) / 2, backgroundColor: t.raised }} />
  );
  return (
    <Card style={styles.card}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[styles.row, i === 0 && { borderBottomWidth: 1, borderBottomColor: t.hairline }]}
          >
            <View style={styles.head}>
              {line('42%', 12)}
              {line('18%', 12)}
            </View>
            {line('64%', 8)}
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: z(2) },
  row: { paddingVertical: z(12), gap: z(8) },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
