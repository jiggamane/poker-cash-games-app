import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, sum, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { entries, nameOf, players, timeOf } from '../src/data/sampleNight';

/**
 * The live session — two views of the same night.
 *
 * FEED is chronological: time, what happened, how much.
 * TOTALS has no times at all — just how much is in play and who is in for what,
 * most money in first. The design is firm that these are two readings of one
 * ledger, not two data sets.
 */
export default function Session() {
  const t = useTheme();
  const [tab, setTab] = useState<'feed' | 'totals'>('feed');

  const ledger = useMemo(() => resolveLedger(entries), []);

  const inPlay = ledger.totalBoughtIn - ledger.totalCashedOut;

  /** Most money in first — the totals view's stated order. */
  const standings = useMemo(
    () =>
      players
        .filter((p) => p.atTable)
        .map((p) => ({
          id: p.id,
          name: p.name,
          in: (ledger.boughtInByPlayer.get(p.id) ?? 0) as Money,
        }))
        .sort((a, b) => b.in - a.in || (a.name < b.name ? -1 : 1)),
    [ledger],
  );

  return (
    <Screen
      title="Tonight"
      backTo="The group"
      footer={
        <>
          <Button label="Buy-in" variant="primary" />
          <Button label="End the night" variant="destructive" onPress={() => router.push('/settle-up')} />
        </>
      }
    >
      <Text style={[styles.label, { color: t.muted }]}>IN PLAY</Text>
      <Text style={[styles.display, { color: t.text }]}>{formatMoney(inPlay as Money)}</Text>
      <Text style={[styles.meta, { color: t.muted }]}>
        {standings.length} at the table · started 20:05
      </Text>

      <Tabs value={tab} onChange={setTab} />

      {tab === 'feed' ? (
        <View>
          {[...ledger.entries].reverse().map((e, i, all) => (
            <Row
              key={e.id}
              time={timeOf[e.id] ?? ''}
              label={describe(e.type, e.playerId ?? e.payerId ?? null)}
              detail={e.voided ? 'voided' : e.corrected ? 'corrected' : undefined}
              amount={e.amount}
              tone={e.type === 'expense' ? 'offTable' : 'plain'}
              last={i === all.length - 1}
            />
          ))}
        </View>
      ) : (
        <View>
          {standings.map((s, i) => (
            <Row
              key={s.id}
              label={s.name}
              amount={s.in}
              last={i === standings.length - 1}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function describe(kind: string, who: PlayerId | null): string {
  const name = who ? nameOf(who) : '';
  switch (kind) {
    case 'buyin':
      return `${name} bought in`;
    case 'rebuy':
      return `${name} rebought`;
    case 'cashout':
      return `${name} cashed out`;
    case 'expense':
      return `${name} paid the bill`;
    default:
      return name;
  }
}

/**
 * Two readings of one night. A quiet track rather than a filled control — the
 * one filled thing on any screen is its primary button.
 */
function Tabs({
  value,
  onChange,
}: {
  value: 'feed' | 'totals';
  onChange: (v: 'feed' | 'totals') => void;
}) {
  const t = useTheme();

  return (
    <View style={[styles.tabs, { backgroundColor: t.surface }]}>
      {(['feed', 'totals'] as const).map((key) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(key)}
            style={[styles.tab, on && { backgroundColor: t.text }]}
          >
            <Text style={[styles.tabLabel, { color: on ? t.onFill : t.muted }]}>
              {key === 'feed' ? 'Feed' : 'Totals'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: type.label,
  display: { ...type.display, marginTop: 4, fontSize: 52 },
  meta: { ...type.meta, marginTop: 6 },
  tabs: {
    flexDirection: 'row',
    borderRadius: radius.pressable,
    padding: 3,
    marginTop: space.section,
    marginBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  tabLabel: { ...type.body, fontWeight: '700', fontSize: 15 },
});
