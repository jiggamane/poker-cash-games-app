import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { GROUP_NAME, entries, nameOf, players, timeOf } from '../src/data/sampleNight';

/**
 * The live session — N1 and N2, rebuilt from the drawn screens.
 *
 * TOTALS first, then FEED: what a host checks most often is who is in for how
 * much, not the order things happened in. Both are readings of one ledger.
 *
 * Every row carries a sub-label — "second rebuy", "double", "late", "left the
 * table" — which is what makes the feed readable at a glance instead of a wall
 * of names and figures.
 */
export default function Session() {
  const t = useTheme();
  const [tab, setTab] = useState<'totals' | 'feed'>('totals');

  const ledger = useMemo(() => resolveLedger(entries), []);
  const onTable = (ledger.totalBoughtIn - ledger.totalCashedOut) as Money;

  /** Most money in first. */
  const standings = useMemo(() => {
    const seated = players.filter((p) => p.atTable);
    return seated
      .map((p) => {
        const buyIns = ledger.entries.filter(
          (e) => !e.voided && e.playerId === p.id && (e.type === 'buyin' || e.type === 'rebuy'),
        );
        const rebuys = buyIns.filter((e) => e.type === 'rebuy').length;
        const cashedOut = ledger.cashedOutByPlayer.get(p.id) ?? 0;
        return {
          id: p.id,
          name: p.name,
          in: (ledger.boughtInByPlayer.get(p.id) ?? 0) as Money,
          detail: cashedOut
            ? `cashed out · counted ${formatMoney(cashedOut as Money)}`
            : rebuys === 0
              ? 'buy-in'
              : `buy-in + ${rebuys} ${rebuys === 1 ? 'rebuy' : 'rebuys'}`,
        };
      })
      .sort((a, b) => b.in - a.in || (a.name < b.name ? -1 : 1));
  }, [ledger]);

  return (
    <Screen
      eyebrow={GROUP_NAME}
      title="Tonight"
      backTo="The group"
      trailing={<LiveBadge />}
      footer={
        <>
          <View style={styles.actions}>
            <Button label="Buy-in" variant="primary" style={styles.action} />
            <Button label="Cash out" variant="secondary" style={styles.action} />
          </View>
          <Button
            label="End the night"
            variant="destructive"
            onPress={() => router.push('/settle-up')}
          />
        </>
      }
    >
      <Text style={[styles.label, { color: t.muted }]}>ON THE TABLE</Text>
      <Text style={[styles.display, { color: t.text }]}>{formatMoney(onTable)}</Text>
      <Text style={[styles.meta, { color: t.muted }]}>
        {standings.length} seated · since 20:05
      </Text>

      {/* Cash in and cash out, side by side — the two figures that explain the
          one above them. */}
      <View style={[styles.strip, { borderColor: t.hairline }]}>
        <Stat label="cash in" value={ledger.totalBoughtIn} />
        <View style={[styles.divider, { backgroundColor: t.hairline }]} />
        <Stat label="cashed out" value={ledger.totalCashedOut} />
      </View>

      <Tabs value={tab} onChange={setTab} />

      {tab === 'totals' ? (
        <View>
          {standings.map((s, i) => (
            <Row
              key={s.id}
              label={s.name}
              detail={s.detail}
              amount={s.in}
              last={i === standings.length - 1}
            />
          ))}
          <View style={[styles.total, { borderTopColor: t.hairline }]}>
            <Text style={[styles.totalLabel, { color: t.text }]}>Total in play</Text>
            <Text style={[styles.totalValue, { color: t.text }]}>{formatMoney(onTable)}</Text>
          </View>
        </View>
      ) : (
        <View>
          {[...ledger.entries].reverse().map((e, i, all) => {
            const d = describe(e, ledger);
            return (
              <Row
                key={e.id}
                time={timeOf[e.id] ?? ''}
                label={d.label}
                detail={e.voided ? 'voided' : e.corrected ? 'corrected' : d.detail}
                amount={e.amount}
                tone={e.type === 'expense' ? 'offTable' : 'plain'}
                last={i === all.length - 1}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

/**
 * What happened, and the small print under it.
 *
 * "second rebuy" rather than just "rebought": at 23:00 the host wants to know
 * how deep somebody is without opening their page.
 */
function describe(
  e: ReturnType<typeof resolveLedger>['entries'][number],
  ledger: ReturnType<typeof resolveLedger>,
): { label: string; detail?: string } {
  const who = nameOf((e.playerId ?? e.payerId ?? '') as PlayerId);

  switch (e.type) {
    case 'buyin':
      return { label: `${who} bought in`, detail: 'first buy-in' };
    case 'rebuy': {
      const before = ledger.entries.filter(
        (x) => x.playerId === e.playerId && x.type === 'rebuy' && x.seq <= e.seq,
      ).length;
      return { label: `${who} rebought`, detail: `${ordinal(before)} rebuy` };
    }
    case 'cashout':
      return { label: `${who} cashed out`, detail: 'left the table' };
    case 'expense':
      return { label: 'Food & drinks', detail: `${who} paid` };
    default:
      return { label: who };
  }
}

const ordinal = (n: number) =>
  n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`;

/** 999px radius is reserved for this and nothing else. */
function LiveBadge() {
  const t = useTheme();
  return (
    <View style={[styles.badge, { borderColor: t.win }]}>
      <View style={[styles.dot, { backgroundColor: t.win }]} />
      <Text style={[styles.badgeText, { color: t.win }]}>LIVE</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: Money }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]}>{formatMoney(value)}</Text>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

function Tabs({
  value,
  onChange,
}: {
  value: 'totals' | 'feed';
  onChange: (v: 'totals' | 'feed') => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.tabs, { backgroundColor: t.surface }]}>
      {(['totals', 'feed'] as const).map((key) => {
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
              {key === 'totals' ? 'Totals' : 'Feed'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: type.label,
  display: { ...type.display, fontSize: 52, marginTop: 2 },
  meta: { ...type.meta, marginTop: 4 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: radius.badge },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    paddingVertical: 12,
    marginTop: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...type.figure },
  statLabel: { ...type.meta, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  tabs: {
    flexDirection: 'row',
    borderRadius: radius.pressable,
    padding: 3,
    marginTop: space.section,
    marginBottom: 2,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  tabLabel: { ...type.body, fontWeight: '700', fontSize: 15 },

  total: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { ...type.body, fontWeight: '700' },
  totalValue: { ...type.figure, fontWeight: '800' },

  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
