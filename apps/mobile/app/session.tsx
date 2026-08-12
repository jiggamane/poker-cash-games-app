import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
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
      {/* One card: the headline figure, a hairline, then the two figures that
          explain it. Measured from the board — 20 inset, 18/20 padding, gap 12. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardFigures}>
            <Text style={[styles.label, { color: t.muted }]}>ON THE TABLE</Text>
            <Text style={[styles.cardFigure, { color: t.text }]}>{formatMoney(onTable)}</Text>
          </View>
          <Text style={[styles.seated, { color: t.muted }]}>
            {standings.length} seated{'\n'}since 20:05
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: t.hairline }]} />

        <View style={styles.stats}>
          <Stat label="cash in" value={ledger.totalBoughtIn} />
          <Stat label="cashed out" value={ledger.totalCashedOut} />
          <Chip label="House rules" />
        </View>
      </View>

      <Tabs value={tab} onChange={setTab} />

      <View style={styles.list}>
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
      </View>
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
    <View style={[styles.badge, { backgroundColor: t.winTint }]}>
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

/** A quiet action that is not a button: bone text, bone border at 30%. */
function Chip({ label }: { label: string }) {
  const t = useTheme();
  return (
    <Pressable style={[styles.chip, { borderColor: `${t.offTable}4D` }]}>
      <Text style={[styles.chipText, { color: t.offTable }]}>{label}</Text>
    </Pressable>
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
            <Text style={[on ? styles.tabLabelOn : styles.tabLabel, { color: on ? t.onFill : t.muted }]}>
              {key === 'totals' ? 'Totals' : 'Feed'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- header card ---------------------------------------------------------
  card: {
    marginHorizontal: space.card,
    marginBottom: space.belowCard,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    paddingVertical: space.cardPadV,
    paddingHorizontal: space.cardPadH,
    gap: space.cardGap,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  cardFigures: { gap: 4 },
  label: type.label,
  cardFigure: type.cardFigure,
  seated: { ...type.statLabel, fontWeight: '400', marginLeft: 'auto', textAlign: 'right', lineHeight: 17 },
  rule: { height: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.statGap },
  stat: { gap: 2 },
  statValue: type.statValue,
  statLabel: type.statLabel,
  chip: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingVertical: control.chipPadV,
    paddingHorizontal: control.chipPadH,
  },
  chipText: type.chip,

  // --- live badge ----------------------------------------------------------
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.badge,
    paddingVertical: control.badgePadV,
    paddingHorizontal: control.badgePadH,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: type.badge,

  // --- tabs ----------------------------------------------------------------
  tabs: {
    flexDirection: 'row',
    marginHorizontal: space.card,
    marginBottom: space.belowCard,
    padding: control.tabTrackPad,
    borderRadius: control.tabTrackRadius,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: control.tabPadV, borderRadius: control.tabRadius },
  tabLabel: type.tab,
  tabLabelOn: type.tabOn,

  // --- list ----------------------------------------------------------------
  // 22, where the card above it is 20. The 2px difference is deliberate.
  list: { marginHorizontal: space.page },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { ...type.body, fontWeight: '700' },
  totalValue: { ...type.figure, fontWeight: '800' },

  // --- footer --------------------------------------------------------------
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
