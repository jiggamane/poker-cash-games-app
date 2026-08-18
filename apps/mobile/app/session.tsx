import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { useElapsed } from '../src/lib/elapsed';
import { defaultBuyIn, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Tonight — T1, with T3 (the drawer), T3b (the hold) and T5 (nobody in yet).
 * 08-tonight-home.md, rev 11. Every earlier drawing of this screen is dead.
 *
 * THE SCREEN IS THE TABLE. No tabs, no segmented control, no feed: one figure
 * for the money on it, one row per player, and a dock. Every entry with its
 * timestamp now lives on the player it belongs to, one tap away, because a
 * chronological feed is a thing you read and a table is a thing you check —
 * and at 23:00 a host is checking.
 *
 * Two sums are shown deliberately, and only when they differ:
 *
 *   On the table   what players still seated have bought in for
 *   Total in       every dollar bought in tonight, including those who left
 *
 * The first is what is in front of people; the second is what the night has to
 * reconcile against. Before anyone cashes out they are the same number, and a
 * number printed twice reads as two facts, so the smaller one hides.
 */
export default function Session() {
  const t = useTheme();
  const night = useNight();
  const [drawer, setDrawer] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /**
   * Most money in first. Everyone who has played stays in the list, including
   * whoever has already gone — a host closing the night needs the people who
   * left as much as the people still sitting there.
   */
  const standings = useMemo(() => {
    if (night === null || ledger === null) return [];
    return standingsOf(night, ledger)
      .filter((s) => s.played)
      .sort((a, b) => b.boughtIn - a.boughtIn || (a.name < b.name ? -1 : 1));
  }, [night, ledger]);

  if (night === null || ledger === null) {
    return <Screen title="Tonight" backTo="the club">{null}</Screen>;
  }

  const seated = standings.filter((s) => s.atTable);
  const out = standings.length - seated.length;

  const onTable = seated.reduce((sum, s) => sum + s.boughtIn, 0) as Money;
  const totalIn = ledger.totalBoughtIn;
  const empty = standings.length === 0;

  return (
    <Screen
      title="Tonight"
      backTo="the club"
      badge={<LiveTag startedAt={night.startedAt} empty={empty} />}
      scroll={false}
      dimmed={drawer}
      footerPad={false}
      footer={
        <Dock
          variant={empty ? 'empty-table' : 'resting'}
          open={drawer}
          onOpenChange={setDrawer}
          onRebuy={() => router.push({ pathname: '/pick', params: { kind: 'buyin' } })}
          onBill={() => router.push('/bill')}
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
      {/* Tapping anywhere off the panel closes the drawer. */}
      <Pressable
        accessibilityRole={drawer ? 'button' : 'none'}
        disabled={!drawer}
        onPress={() => setDrawer(false)}
        style={styles.body}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: t.surface, borderColor: t.hairline },
            empty && styles.cardEmpty,
          ]}
        >
          <View style={styles.cardLeft}>
            <Text style={[styles.tableLabel, { color: t.muted }]}>On the table</Text>
            <Text style={[styles.tableFigure, { color: t.text }]}>{formatMoney(onTable)}</Text>
          </View>

          <View style={styles.cardRight}>
            {totalIn !== onTable && (
              <Text style={[styles.totalIn, { color: t.muted }]}>
                {formatMoney(totalIn)} total in
              </Text>
            )}
            <Text style={[styles.seats, { color: t.dim }]}>
              {empty
                ? 'nobody seated'
                : out === 0
                  ? `${seated.length} seated`
                  : `${seated.length} seated · ${out} out`}
            </Text>
            {/* The start time used to sit at the right edge of the title row,
                where it and the running-time tag between them left "Tonight"
                too little to stay on one line — see docs/tonight-title-row.md.
                It lives here now, and this is the right place for it on its
                own merits: the tag is live and belongs in the chrome, while
                the start time is read once and is a fact about the night, like
                the two lines above it. The column is shorter than the figure
                beside it either way, so the card does not grow. */}
            <Text style={[styles.started, { color: t.dim }]}>
              {empty ? 'opened' : 'started'} {clock(night.startedAt)}
            </Text>
          </View>
        </View>

        {empty ? (
          <View style={styles.blank}>
            <Icon name="person" color={t.dim} size={34} />
            <Text style={[styles.blankTitle, { color: t.text }]}>Nobody has bought in yet</Text>
            <Text style={[styles.blankBody, { color: t.muted }]}>
              Seat the first player and the table starts filling. Buy-ins are{' '}
              {formatMoney(defaultBuyIn(ledger))} tonight.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!drawer}
          >
            {standings.map((s, i) => {
              /*
               * One row, two meanings. While somebody is seated the figure is
               * what they are in for; once they have cashed out it is their
               * night's result, in the green/red pair. Two fields, never one
               * formatted number — they are not the same kind of fact.
               */
              const result = (s.cashedOut - s.boughtIn) as Money;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  disabled={drawer}
                  onPress={() => router.push({ pathname: '/player', params: { id: s.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: t.hairline,
                      borderBottomWidth:
                        i === standings.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.name, { color: s.atTable ? t.text : t.muted }]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                  <Text
                    style={[
                      styles.amount,
                      { color: s.atTable ? t.text : moneyColor(t, result) },
                    ]}
                  >
                    {s.atTable ? formatMoney(s.boughtIn) : formatSigned(result)}
                  </Text>
                  <Icon name="chevron" color={t.muted} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Pressable>
    </Screen>
  );
}

/**
 * The running time IS the live tag — there is no "LIVE" word any more. Green
 * dot, green figure, green at 14% behind them.
 */
function LiveTag({ startedAt, empty }: { startedAt: string; empty: boolean }) {
  const t = useTheme();
  // Ticks itself. It used to be computed once per render, which on this screen
  // meant it moved only when the host recorded something — a figure that sat
  // still for twenty minutes and then jumped, beside a green dot saying the
  // night was live.
  const running = useElapsed(startedAt);
  return (
    <View style={[styles.tag, { backgroundColor: t.winTint }]}>
      <View style={[styles.dot, { backgroundColor: t.win }]} />
      <Text style={[styles.tagText, { color: t.win }]}>
        {empty ? 'just opened' : running}
      </Text>
    </View>
  );
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  body: { flex: 1 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.badge,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tagText: type.liveTag,
  started: type.startedAt,

  // --- the one money card --------------------------------------------------
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  cardEmpty: { paddingVertical: 12 },
  cardLeft: { gap: 8 },
  tableLabel: type.tableLabel,
  tableFigure: type.tableFigure,
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3 },
  totalIn: type.tableTotal,
  seats: type.tableSeats,

  // --- the table -----------------------------------------------------------
  list: { flex: 1, marginHorizontal: 22 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 4,
  },
  name: { ...type.tableName, flexShrink: 1 },
  amount: { ...type.tableAmount, marginLeft: 'auto' },

  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.page },
  blankTitle: { fontSize: 19, fontWeight: '700' },
  blankBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, textAlign: 'center', maxWidth: 250 },
});
