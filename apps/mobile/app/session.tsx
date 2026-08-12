import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Tonight — T1, and T5 when nobody is in yet. `08-tonight-home.md`.
 *
 * THE SCREEN IS THE TABLE. No tabs, no segmented control, no feed: one figure
 * for the money in front of people, one row per player, and a dock holding the
 * two actions a host touches every half hour. Every timestamped entry lives on
 * the player it belongs to, one tap away, which is where somebody looks for it
 * anyway — "what has Petr put in?" is a question about Petr, not about 23:04.
 *
 * TWO SUMS, DELIBERATELY DIFFERENT, and both are needed. **On the table** is
 * what players still seated have bought in — the chips actually in front of
 * people. **Total in play** is every dollar bought in tonight, including by
 * whoever has already gone home. The first is what the room looks like; the
 * second is what the night has to reconcile against at count-up.
 *
 * A cashed-out player keeps their row. Their name goes muted and their figure
 * stops being what they put in and becomes what they ended with, in the green
 * or red pair — the same row, two meanings, which is why the view model keeps
 * them as two fields rather than one formatted number.
 */
export default function Session() {
  const t = useTheme();
  const night = useNight();
  const [drawer, setDrawer] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /** Most money in first. Everyone who has played, including whoever left. */
  const rows = useMemo(() => {
    if (night === null || ledger === null) return [];
    return standingsOf(night, ledger)
      .filter((s) => s.played)
      .map((s) => ({
        id: s.id,
        name: s.name,
        boughtIn: s.boughtIn,
        atTable: s.atTable,
        // Only meaningful once they have left: what they walked away with,
        // against what they put in. Still a gross figure — the bill and the
        // kitty come off it at settle-up, not here.
        result: (s.cashedOut - s.boughtIn) as Money,
      }))
      .sort((a, b) => b.boughtIn - a.boughtIn || (a.name < b.name ? -1 : 1));
  }, [night, ledger]);

  if (night === null || ledger === null) {
    return <Screen title="Tonight" backTo="The group">{null}</Screen>;
  }

  const seated = rows.filter((r) => r.atTable);
  const onTable = seated.reduce((sum, r) => sum + r.boughtIn, 0) as Money;
  const totalInPlay = ledger.totalBoughtIn;
  const nobodyIn = rows.length === 0;

  const since = new Date(night.startedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Screen
      title="Tonight"
      backTo={night.groupName}
      badge={<LiveBadge />}
      meta={`${night.groupName} · ${elapsed(night.startedAt)} · since ${since}`}
      dimmed={drawer}
      onDimPress={() => setDrawer(false)}
      footer={
        <Dock
          variant={nobodyIn ? 'empty-table' : 'resting'}
          open={drawer}
          onOpenChange={setDrawer}
          // Rebuy asks who, then how much. The dock cannot know which player
          // without a selection, and guessing "whoever was last" would be a
          // rebuy logged against the wrong person at 1am.
          onPrimary={() =>
            router.push(nobodyIn ? '/seat' : { pathname: '/pick', params: { kind: 'buyin' } })
          }
          onBill={() => router.push('/expenses')}
          onSeat={() => {
            setDrawer(false);
            router.push('/seat');
          }}
          onCashOut={() => {
            setDrawer(false);
            router.push({ pathname: '/pick', params: { kind: 'cashout' } });
          }}
          onEnd={() => {
            setDrawer(false);
            router.push('/count-up');
          }}
        />
      }
    >
      <View
        style={[
          styles.card,
          nobodyIn && styles.cardEmpty,
          { backgroundColor: t.surface, borderColor: t.hairline },
        ]}
      >
        <View style={styles.cardFigures}>
          <Text style={[styles.label, { color: t.muted }]}>On the table</Text>
          <Text style={[styles.figure, { color: t.text }]}>{formatMoney(onTable)}</Text>
        </View>
        <Text style={[styles.aside, { color: t.muted }]}>
          {seated.length} seated{'\n'}since {since}
        </Text>
      </View>

      {nobodyIn ? (
        /* T5. Reachable every night — between opening the table and the first
           buy-in — so it is a state, not an error. */
        <View style={styles.empty}>
          <Icon name="person" color={t.disabledEdge} size={34} weight={1.6} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>Nobody has bought in yet</Text>
          <Text style={[styles.emptyBody, { color: t.muted }]}>
            Seat the first player and the table starts filling. Buy-ins are{' '}
            {formatMoney(night.defaultBuyIn)} tonight.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.list}>
            {rows.map((r, i) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/player', params: { id: r.id } })}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: t.hairline,
                    borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.name, { color: r.atTable ? t.text : t.muted }]}>{r.name}</Text>
                <Text
                  style={[
                    styles.amount,
                    { color: r.atTable ? t.text : moneyColor(t, r.result) },
                  ]}
                >
                  {/* No currency symbol on a result: the board draws "+1,620",
                      and the sign plus the colour already say what it is. */}
                  {r.atTable ? formatMoney(r.boughtIn) : formatSigned(r.result, '')}
                </Text>
                <Icon name="chevron" color={t.muted} />
              </Pressable>
            ))}
          </View>

          <View style={[styles.total, { borderTopColor: t.hairline }]}>
            <Text style={[styles.totalLabel, { color: t.muted }]}>Total in play</Text>
            <Text style={[styles.totalValue, { color: t.text }]}>{formatMoney(totalInPlay)}</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

/** Tinted, never outlined: an outline reads as a control, a tint as a state. */
function LiveBadge() {
  const t = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: t.winTint }]}>
      <View style={[styles.badgeDot, { backgroundColor: t.win }]} />
      <Text style={[styles.badgeLabel, { color: t.win }]}>LIVE</Text>
    </View>
  );
}

/** "3h 17m" — how long the table has been running. */
function elapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
  },
  cardEmpty: { paddingVertical: 12 },
  cardFigures: { gap: 4 },
  label: type.label,
  figure: type.tableFigure,
  aside: { ...type.tableAside, marginLeft: 'auto', textAlign: 'right' },

  list: { marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: space.rowInset },
  name: type.rowName,
  amount: { ...type.playerAmount, marginLeft: 'auto' },

  total: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.page,
    paddingTop: 11,
    paddingBottom: 2,
    paddingHorizontal: space.rowInset,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: type.totalLabel,
  totalValue: { ...type.playerAmount, marginLeft: 'auto' },

  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: space.page },
  emptyTitle: type.emptyTitle,
  emptyBody: { ...type.emptyBody, textAlign: 'center', maxWidth: 250 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: control.badgePadV,
    paddingHorizontal: control.badgePadH,
    borderRadius: radius.badge,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: type.badge,
});
