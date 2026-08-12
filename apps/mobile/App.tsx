import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  formatMoney,
  money,
  settle,
  type LedgerEntry,
  type Money,
  type MoneyRule,
  type Player,
  type PlayerId,
} from '@poker-club/core';
import { Button } from './src/components/Button';
import { Row } from './src/components/Row';
import { useTheme } from './src/design/useTheme';
import { space, type } from './src/design/tokens';
import { isSupabaseConfigured } from './src/lib/supabase';

/**
 * Settle up — a first real screen, drawn from design/Style Guide v2.dc.html and
 * driven by the actual settlement engine rather than mock numbers. The night
 * below is fixed data for now; the next step is reading it from Supabase.
 */

const MAREK = 'p1';
const PETR = 'p2';
const DANA = 'p3';
const RADKA = 'p9';

const NAMES: Record<PlayerId, string> = {
  [MAREK]: 'Marek',
  [PETR]: 'Petr',
  [DANA]: 'Dana',
  [RADKA]: 'Radka',
};

const players: Player[] = [
  { id: MAREK, name: 'Marek', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: DANA, name: 'Dana', atTable: true },
  // the group's treasurer: collects the kitty, never sits down
  { id: RADKA, name: 'Radka', atTable: false },
];

let n = 0;
const entry = (e: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++n}`, seq: n, ...e });

const entries: LedgerEntry[] = [
  entry({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  entry({ type: 'buyin', playerId: PETR, amount: money(500) }),
  entry({ type: 'rebuy', playerId: PETR, amount: money(1000) }),
  entry({ type: 'buyin', playerId: DANA, amount: money(1000) }),
  entry({ type: 'expense', payerId: MAREK, amount: money(170) }),
];

const finalCounts = new Map<PlayerId, Money>([
  [MAREK, money(1982)],
  [PETR, money(270)],
  [DANA, money(748)],
]);

const rules: MoneyRule[] = [
  {
    id: 'kitchen', name: 'Kitchen & drinks', active: true,
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'everyone_flat', destination: 'bill', split: 'across_everyone',
    collectorPlayerId: MAREK, sortOrder: 1,
  },
  {
    id: 'kitty', name: 'Group kitty', active: true,
    amountKind: 'percent', amount: money(10), basis: 'net_after_others',
    charge: 'winners_only', destination: 'kitty', split: 'equal',
    collectorPlayerId: RADKA, sortOrder: 2,
  },
];

export default function App() {
  const t = useTheme();
  const result = settle({ players, entries, finalCounts, rules });

  const offTable = result.totalOffTable;
  const payees = result.deductions.flatMap((d) => d.credits);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]}>
        <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: t.text }]}>Settle up</Text>

          <Text style={[styles.label, { color: t.muted }]}>OFF THE TABLE</Text>
          <Text style={[styles.display, { color: t.text }]}>{formatMoney(offTable)}</Text>
          <Text style={[styles.meta, { color: t.muted }]}>
            {formatMoney(offTable)} leaves the table
            {payees.length > 0 ? ': ' : ''}
            {payees.map((c) => `${formatMoney(c.amount)} to ${NAMES[c.playerId]}`).join(', ')}
          </Text>

          <Text style={[styles.label, styles.section, { color: t.muted }]}>NIGHT'S NET</Text>
          <View>
            {result.players.map((p, i) => (
              <Row
                key={p.playerId}
                label={NAMES[p.playerId]}
                detail={p.boughtIn > 0 ? `in ${formatMoney(p.boughtIn)}` : 'collector'}
                amount={p.finalPosition}
                tone="result"
                last={i === result.players.length - 1}
              />
            ))}
          </View>

          <Text style={[styles.label, styles.section, { color: t.muted }]}>DEDUCTIONS</Text>
          <View>
            {result.deductions.map((d, i) => (
              <Row
                key={d.ruleId}
                label={d.name}
                detail={`to ${NAMES[d.credits[0]?.playerId ?? '']}`}
                amount={d.total}
                tone="offTable"
                last={i === result.deductions.length - 1}
              />
            ))}
          </View>

          <Text style={[styles.label, styles.section, { color: t.muted }]}>WHO PAYS WHOM</Text>
          <View>
            {result.transfers.map((tr, i) => (
              <Row
                key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`}
                label={`${NAMES[tr.fromPlayerId]}  →  ${NAMES[tr.toPlayerId]}`}
                amount={tr.amount}
                last={i === result.transfers.length - 1}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Button label="Confirm settlement" variant="primary" />
            <Button label="Adjust" variant="secondary" />
          </View>

          <Text style={[styles.meta, styles.section, { color: t.muted }]}>
            {isSupabaseConfigured
              ? 'Connected to Supabase.'
              : 'No Supabase project yet — these figures are computed on the device.'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.page, paddingBottom: 48 },
  title: { ...type.title, marginTop: 8, marginBottom: 28 },
  label: type.label,
  section: { marginTop: 32 },
  display: { ...type.display, marginTop: 6 },
  meta: { ...type.meta, marginTop: 8 },
  actions: { marginTop: 36, gap: 12 },
});
