import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Dock } from '../src/components/Dock';
import { Icon } from '../src/components/Icon';
import { PushHeader } from '../src/components/PushHeader';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { defaultBuyIn, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Tonight's game — H1, with H3 the admin drawer, H3b the hold, and H5 the empty
 * table. `08-tonight-home.md` rev 11, drawn in `screens-tonight-home.html`.
 *
 * THE SCREEN IS THE TABLE. No tabs, no segmented control, no feed: one figure
 * for the money on it, one row per player, and a dock at the foot with the two
 * actions a host touches every half hour. Every entry with its timestamp lives
 * on the player it belongs to, one tap into their row.
 *
 * The running time IS the live tag — a green dot and the elapsed clock, no
 * "LIVE" — and the start time sits at the right edge of the title row, which is
 * the only place in the app it appears.
 *
 * Two sums, never one: **On the table** is what players still seated have
 * bought in, **total in** is every dollar tonight including people who have
 * gone. The second line hides when the two are equal, so the same figure is
 * never printed twice.
 */
export default function Session() {
  const t = useTheme();
  const night = useNight();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      .sort(
        (a, b) =>
          Number(b.atTable) - Number(a.atTable) ||
          b.boughtIn - a.boughtIn ||
          (a.name < b.name ? -1 : 1),
      );
  }, [night, ledger]);

  const running = useElapsed(night?.startedAt);

  if (night === null || ledger === null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="Tonight" />
      </SafeAreaView>
    );
  }

  /*
   * Two sums, and they are NOT the same arithmetic. On the table is what the
   * people still sitting there have bought in; total in is every dollar
   * tonight. Neither is "bought in minus cashed out" — that is the chips a
   * count has to reconcile against, and it lives in the close flow.
   */
  const onTable = standings
    .filter((s) => s.atTable)
    .reduce((sum, s) => sum + s.boughtIn, 0) as Money;
  const totalIn = ledger.totalBoughtIn;
  const seated = standings.filter((s) => s.atTable).length;
  const out = standings.length - seated;
  const empty = standings.length === 0;

  const started = new Date(night.startedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.above}>
        <View
          style={[styles.above, drawerOpen && styles.behind]}
          pointerEvents={drawerOpen ? 'none' : 'auto'}
        >
          {/* Before the first buy-in there is no elapsed time worth printing and
              no start to point at — the night has not begun, it is being set
              up. The tag says "starting" and the right corner stays empty until
              somebody is in for something. */}
          <PushHeader
            title="Tonight"
            badge={<RunningTag label={empty ? 'starting' : running} />}
            trailing={
              empty ? undefined : (
                <Text style={[styles.started, { color: t.muted }]}>started {started}</Text>
              )
            }
          />

          <View
            style={[
              styles.card,
              empty ? styles.cardEmpty : styles.cardResting,
              { backgroundColor: t.surface, borderColor: t.hairline },
            ]}
          >
            <View style={styles.cardFigures}>
              <Text style={[styles.cardLabel, { color: t.muted }]}>On the table</Text>
              <Text
                style={[
                  empty ? styles.figureEmpty : styles.figure,
                  { color: empty ? t.muted : t.text },
                ]}
              >
                {formatMoney(onTable)}
              </Text>
            </View>

            {empty ? (
              <Text style={[styles.seats, styles.cardRight, { color: t.dim }]}>nobody seated</Text>
            ) : (
              <View style={[styles.cardRight, styles.cardRightCol]}>
                {/* Hidden when it equals what is on the table: before anybody
                    cashes out the two are the same figure, and one of them is
                    then just noise. */}
                {totalIn !== onTable && (
                  <Text style={[styles.totalIn, { color: t.muted }]}>
                    {formatMoney(totalIn)} total in
                  </Text>
                )}
                <Text style={[styles.seats, { color: t.dim }]}>
                  {seated} seated{out > 0 ? ` · ${out} out` : ''}
                </Text>
              </View>
            )}
          </View>

          {empty ? (
            <View style={styles.emptyState}>
              <Icon name="person" color={t.name === 'dark' ? '#3A3B40' : '#D2D5DA'} size={34} stroke={1.6} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>Nobody has bought in yet</Text>
              <Text style={[styles.emptyBody, { color: t.muted }]}>
                Seat the first player and the table starts filling. Buy-ins are{' '}
                {formatMoney(defaultBuyIn(ledger))} tonight.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {standings.map((s, i) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/player', params: { id: s.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: t.hairline,
                      borderBottomWidth: i === standings.length - 1 ? 0 : 1,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.name, { color: s.atTable ? t.text : t.muted }]}>{s.name}</Text>
                  {s.atTable ? (
                    <Text style={[styles.value, { color: t.text }]}>{formatMoney(s.boughtIn)}</Text>
                  ) : (
                    <Text
                      style={[
                        styles.value,
                        { color: moneyColor(t, (s.cashedOut - s.boughtIn) as Money) },
                      ]}
                    >
                      {/* No symbol here: the board prints a bare +1,620 in
                          this column, and the money figures above it carry
                          the $ that tells you what the column is. */}
                      {formatSigned((s.cashedOut - s.boughtIn) as Money, '')}
                    </Text>
                  )}
                  <Icon name="chevron" color={t.muted} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Tapping outside the panel closes it. */}
        {drawerOpen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close table admin"
            onPress={() => setDrawerOpen(false)}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      <Dock
        variant={empty ? 'empty-table' : 'resting'}
        onOpenChange={setDrawerOpen}
        onRebuy={() => router.push({ pathname: '/pick', params: { kind: 'buyin' } })}
        onBill={() => router.push('/bill')}
        onSeat={() => router.push({ pathname: '/pick', params: { kind: 'buyin' } })}
        onCashOut={() => router.push({ pathname: '/pick', params: { kind: 'cashout' } })}
        onEnd={() => router.push('/count-up')}
      />
    </SafeAreaView>
  );
}

/**
 * The tag beside the title. Green dot, elapsed clock, no word.
 *
 * Its two colours are the SAME in both themes — the board draws
 * `rgba(111,207,151,.14)` and `#6FCF97` on the bright twin as well. Only money
 * flips to the light theme's darker green; this is a state, not an amount.
 */
function RunningTag({ label }: { label: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: LIVE_WASH }]}>
      <View style={[styles.dot, { backgroundColor: LIVE_INK }]} />
      <Text style={[styles.tagText, { color: LIVE_INK }]}>{label}</Text>
    </View>
  );
}

const LIVE_WASH = 'rgba(111,207,151,0.14)';
const LIVE_INK = '#6FCF97';

/** "3h 17m", counting up. Re-reads the clock every 30s, which is twice as often
 *  as the figure can change. */
function useElapsed(startedAt: string | undefined): string {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (startedAt === undefined) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  above: { flex: 1 },
  /** Everything behind the open drawer, including the title and the card. */
  behind: { opacity: 0.4 },

  started: { fontSize: 13, fontWeight: '400', fontVariant: ['tabular-nums'] },

  tag: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.13, fontVariant: ['tabular-nums'] },

  card: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardResting: { marginBottom: 16, paddingVertical: 14 },
  cardEmpty: { marginBottom: 14, paddingVertical: 12 },
  cardFigures: { gap: 8 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  figure: { fontSize: 44, fontWeight: '800', letterSpacing: -1.76, lineHeight: 44, fontVariant: ['tabular-nums'] },
  figureEmpty: { fontSize: 34, fontWeight: '800', letterSpacing: -1.36, lineHeight: 34, fontVariant: ['tabular-nums'] },
  cardRight: { marginLeft: 'auto', textAlign: 'right' },
  cardRightCol: { gap: 3, alignItems: 'flex-end' },
  totalIn: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  seats: { fontSize: 13, fontWeight: '400' },

  list: { flex: 1, marginHorizontal: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: 4 },
  name: { fontSize: 17, fontWeight: '600' },
  value: { fontSize: 19, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  emptyState: {
    flex: 1,
    marginHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.38 },
  emptyBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, maxWidth: 250, textAlign: 'center' },
});
