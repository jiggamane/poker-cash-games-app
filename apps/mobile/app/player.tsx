import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { depthOf, standingOf, useNight } from '../src/lib/nightStore';

/**
 * One player — N3.
 *
 * Two figures side by side, and the right one is an EM DASH until their chips
 * are counted. That is the whole point of the screen: while a game is running
 * nobody's result is known, only what they have put in, and a page that showed
 * a running "net" would be inventing a number out of chips it has not seen.
 *
 * Underneath, every entry with the time it was made — which is what settles an
 * argument about whether somebody rebought before or after a hand.
 */
export default function PlayerPage() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="Player">{null}</Sheet>;
  }

  const player = night.players.find((p) => p.id === id);
  if (player === undefined) {
    return (
      <Sheet title="Player">
        <Text style={[styles.note, { color: t.muted }]}>Nobody by that name tonight.</Text>
      </Sheet>
    );
  }

  const standing = standingOf(night, ledger, player.id);
  const boughtIn = (standing?.boughtIn ?? 0) as Money;
  const stillIn = standing?.atTable === true;

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if they are still sitting there. Nothing at all until one of
   * those exists — a player mid-game has no result, only a stake.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted =
    stillIn
      ? finalCount === undefined
        ? undefined
        : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
      : standing?.played === true
        ? ((standing.cashedOut ?? 0) as Money)
        : undefined;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  const first = mine[0];

  return (
    <Sheet
      title={player.name}
      footer={
        stillIn ? (
          <View style={styles.actions}>
            <Button
              label="Rebuy"
              variant="primary"
              style={styles.action}
              onPress={() =>
                router.push({ pathname: '/log', params: { player: player.id, kind: 'rebuy' } })
              }
            />
            <Button
              label="Cash out"
              variant="secondary"
              style={styles.action}
              onPress={() =>
                router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
              }
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: t.raised }]}>
          <Text style={[styles.tagText, { color: t.muted }]}>
            {standing?.played !== true
              ? 'ON THE ROSTER'
              : stillIn
                ? standing.returned
                  ? 'BACK IN'
                  : 'SEATED'
                : standing.cashedOut === 0
                  ? 'BUSTED OUT'
                  : 'CASHED OUT'}
          </Text>
        </View>
        {first !== undefined && (
          <Text style={[styles.since, { color: t.muted }]}>
            since {clock(night.occurredAt[first.id])}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardTop}>
          <View style={styles.figure}>
            <Text style={[styles.label, { color: t.muted }]}>Buy-in + rebuys</Text>
            <Text style={[styles.big, { color: t.text }]}>{formatMoney(boughtIn)}</Text>
          </View>
          <View style={[styles.figure, styles.right]}>
            <Text style={[styles.label, { color: t.muted }]}>Counted</Text>
            <Text style={[styles.big, { color: counted === undefined ? t.muted : t.text }]}>
              {counted === undefined ? '—' : formatMoney(counted)}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardNote, { color: t.muted }]}>
          {counted === undefined
            ? `Net is known once ${player.name}’s chips are counted, at cash-out or at the end of the night.`
            : 'Before the bill and the kitty, which come off at settle-up.'}
        </Text>

        {counted !== undefined && (
          <View style={[styles.net, { borderTopColor: t.hairline }]}>
            <Text style={[styles.netLabel, { color: t.text }]}>Chips against buy-ins</Text>
            <Text
              style={[styles.netFigure, { color: moneyColor(t, (counted - boughtIn) as Money) }]}
            >
              {formatSigned((counted - boughtIn) as Money)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {mine.length === 0 ? 'Nothing yet' : `${depthOf(ledger, player.id)} · when each was made`}
        </Text>

        {[...mine].reverse().map((e, i, all) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === all.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.time, { color: t.muted }]}>{clock(night.occurredAt[e.id])}</Text>
            <Text style={[styles.what, { color: e.voided ? t.muted : t.text }]}>
              {e.type === 'buyin' ? 'Buy-in' : e.type === 'rebuy' ? 'Rebuy' : 'Cash out'}
              {e.voided ? ' · voided' : e.corrected ? ' · corrected' : ''}
            </Text>
            <Text style={[styles.amount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
    marginHorizontal: space.page,
    marginBottom: 4,
  },
  tag: { borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  since: { fontSize: 14, fontWeight: '400' },

  card: {
    marginTop: 16,
    marginHorizontal: 18,
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  figure: { gap: 5 },
  right: { marginLeft: 'auto', alignItems: 'flex-end' },
  label: type.sectionLabel,
  big: { fontSize: 46, fontWeight: '800', letterSpacing: -1.84, fontVariant: ['tabular-nums'] },
  cardNote: { fontSize: 13.5, fontWeight: '400', lineHeight: 20 },
  net: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  netLabel: { fontSize: 14, fontWeight: '500' },
  netFigure: { fontSize: 18, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  list: { marginTop: 22, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4 },
  time: { ...type.time, width: 42 },
  what: type.feedName,
  amount: { ...type.feedFigure, marginLeft: 'auto' },

  note: { ...type.footnote, marginHorizontal: space.page },
  actions: { flexDirection: 'row', gap: 14 },
  action: { flex: 1 },
});
