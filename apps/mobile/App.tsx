import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { allocate, formatMoney, formatSigned, money, sum } from '@poker-club/core';

/**
 * Scaffold smoke screen — NOT a designed screen.
 *
 * It exists to prove the plumbing works end to end: the app resolves
 * @poker-club/core through the monorepo, the money types survive the bundler,
 * and both themes are wired to the OS setting. The real screens come next,
 * built from `design/Style Guide v2.dc.html`.
 */
export default function App() {
  const isDark = useColorScheme() !== 'light';
  const t = isDark ? dark : light;

  // A worked example from the design: $296 leaves the table, split by size of win.
  const offTable = money(296);
  const winners = [
    { name: 'Marek', win: money(1482) },
    { name: 'Radka', win: money(903) },
  ];
  const shares = allocate(
    offTable,
    winners.map((w) => w.win),
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.ground }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Text style={[styles.label, { color: t.muted }]}>NIGHT'S NET</Text>
      <Text style={[styles.display, { color: t.text }]}>{formatMoney(money(2880))}</Text>

      <View style={styles.rows}>
        {winners.map((w, i) => (
          <View key={w.name} style={[styles.row, { borderBottomColor: t.hairline }]}>
            <Text style={[styles.body, { color: t.text }]}>{w.name}</Text>
            <Text style={[styles.figure, { color: t.win }]}>{formatSigned(w.win)}</Text>
            <Text style={[styles.figure, { color: t.bone }]}>{formatMoney(shares[i])}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.meta, { color: t.muted }]}>
        {formatMoney(sum(shares))} off the table · allocated with no unit created or lost
      </Text>
    </View>
  );
}

// From design/Style Guide v2.dc.html — no brand accent; colour means money only.
const dark = {
  ground: '#0A0A0B',
  text: '#FFFFFF',
  muted: '#8B8D93',
  hairline: '#26262B',
  win: '#6FCF97',
  loss: '#F0705C',
  bone: '#D9D3C4',
};

const light = {
  ground: '#FFFFFF',
  text: '#0C0D0F',
  muted: '#6B6F76',
  hairline: '#EDEDF0',
  win: '#0A7A3D',
  loss: '#C0341B',
  bone: '#6B6F76',
};

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  display: { fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rows: { marginTop: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { fontSize: 17, fontWeight: '500', flex: 1 },
  figure: { fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 16 },
  meta: { fontSize: 13, fontWeight: '400', marginTop: 24 },
});
