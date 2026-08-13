import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { depthOf, nameOf, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * The live session — N1 and N2.
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
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /**
   * Most money in first, and everyone who has played — including whoever has
   * already gone. A host closing the night needs to see the people who left as
   * much as the people still sitting there.
   */
  const standings = useMemo(() => {
    if (night === null || ledger === null) return [];
    return standingsOf(night, ledger)
      .filter((s) => s.played)
      .map((s) => ({ ...s, detail: depthOf(ledger, s.id) }))
      .sort(
        (a, b) =>
          Number(b.atTable) - Number(a.atTable) ||
          b.boughtIn - a.boughtIn ||
          (a.name < b.name ? -1 : 1),
      );
  }, [night, ledger]);

  if (night === null || ledger === null) {
    return <Screen title="Tonight" backTo="Home">{null}</Screen>;
  }

  const onTable = (ledger.totalBoughtIn - ledger.totalCashedOut) as Money;
  const since = new Date(night.startedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Screen
      title="Tonight"
      backTo="Home"
      barExtra={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Food and drinks"
          hitSlop={12}
          onPress={() => router.push('/expenses')}
        >
          <Icon name="rules" color={t.offTable} />
        </Pressable>
      }
      trailing={
        <>
          <LiveBadge />
          <Text style={[styles.elapsed, { color: t.muted }]}>{elapsed(night.startedAt)}</Text>
        </>
      }
      footer={
        <>
          {/* Ending the night is not a red button. It is a quiet row that names
              what happens next — you count, then you settle. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/count-up')}
            style={({ pressed }) => [
              styles.endRow,
              { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.endLabel, { color: t.text }]}>End the night</Text>
            <Text style={[styles.endHint, { color: t.muted }]}>count &amp; settle</Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>

          <View style={styles.actions}>
            <Button
              label="Buy-in"
              variant="primary"
              style={styles.action}
              onPress={() => router.push({ pathname: '/pick', params: { kind: 'buyin' } })}
            />
            <Button
              label="Cash out"
              variant="secondary"
              style={styles.action}
              onPress={() => router.push({ pathname: '/pick', params: { kind: 'cashout' } })}
            />
          </View>
        </>
      }
    >
      {/* One card: the headline figure, a hairline, then the two figures that
          explain it. Measured from N2 — 20 inset, 18/20 padding, gap 12. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardFigures}>
            <Text style={[styles.label, { color: t.muted }]}>On the table</Text>
            <Text style={[styles.cardFigure, { color: t.text }]}>{formatMoney(onTable)}</Text>
          </View>
          <Text style={[styles.seated, { color: t.muted }]}>
            {standings.filter((s) => s.atTable).length} seated{'\n'}since {since}
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: t.hairline }]} />

        <View style={styles.stats}>
          <Stat label="cash in" value={ledger.totalBoughtIn} />
          <Stat label="cashed out" value={ledger.totalCashedOut} />
          <HouseRules />
        </View>
      </View>

      <Tabs value={tab} onChange={setTab} />

      {tab === 'totals' ? (
        <>
          <View style={styles.list}>
            {standings.map((s, i) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/player', params: { id: s.id } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Row
                  label={s.name}
                  detail={s.detail}
                  amount={s.boughtIn}
                  chevron
                  last={i === standings.length - 1}
                />
              </Pressable>
            ))}
          </View>

          {/* Its own block above the list, not the last row of it. */}
          <View style={[styles.total, { borderTopColor: t.hairline }]}>
            <Text style={[styles.totalLabel, { color: t.muted }]}>Total in play</Text>
            <Text style={[styles.totalValue, { color: t.text }]}>{formatMoney(onTable)}</Text>
          </View>
        </>
      ) : (
        <View style={styles.list}>
          {[...ledger.entries].reverse().map((e, i, all) => {
            const d = describe(e, ledger, night);
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Row
                  kind="feed"
                  time={clock(night.occurredAt[e.id])}
                  label={d.label}
                  detail={e.voided ? 'voided' : e.corrected ? 'corrected' : d.detail}
                  amount={e.amount}
                  tone={e.type === 'expense' ? 'offTable' : 'plain'}
                  last={i === all.length - 1}
                />
              </Pressable>
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
  night: NonNullable<ReturnType<typeof useNight>>,
): { label: string; detail?: string } {
  const who = nameOf(night, (e.playerId ?? e.payerId ?? '') as PlayerId);

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
      return { label: night.noteOf[e.id] ?? 'Food & drinks', detail: `${who} paid` };
    default:
      return { label: who };
  }
}

const ordinal = (n: number) =>
  n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`;

/** 23:15. The feed's left column, and the only place a time is shown. */
const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** "3h 17m" — how long the table has been running. */
function elapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

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
function HouseRules() {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/house-rules')}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: `${t.offTable}4D`, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="info" color={t.offTable} />
      <Text style={[styles.chipText, { color: t.offTable }]}>House rules</Text>
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
  elapsed: { ...type.meta, fontWeight: '500', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  // --- header card ---------------------------------------------------------
  card: {
    marginHorizontal: space.card,
    marginBottom: space.belowCard,
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
  seated: { ...type.detail, marginLeft: 'auto', textAlign: 'right' },
  rule: { height: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', alignItems: 'flex-end', gap: space.statGap },
  stat: { gap: 2 },
  statValue: type.statValue,
  statLabel: type.statLabel,
  chip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.page,
    paddingVertical: 11,
    paddingHorizontal: space.rowInset,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: type.rowName,
  totalValue: { ...type.figure, marginLeft: 'auto' },

  // --- footer --------------------------------------------------------------
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: control.quietWidth,
  },
  endLabel: { fontSize: 15, fontWeight: '600' },
  endHint: { ...type.meta, marginLeft: 'auto' },
  actions: { flexDirection: 'row', gap: 14 },
  action: { flex: 1 },
});
