import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, money, resolveLedger, type Money } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { HeaderPill } from '../src/components/PushHeader';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { defaultBuyIn, rebuy, standingOf, useNight } from '../src/lib/nightStore';

/**
 * The player card — H2 at the table, H4 once they are counted.
 *
 * A sheet over Tonight, and the screen rev 8 promoted out of a rebuy sheet and
 * merged with N3. Two figures side by side, and the right one is an EM DASH
 * until their chips are counted: while a game is running nobody's result is
 * known, only what they have put in, and a running "net" would be a number
 * invented out of chips nobody has seen.
 *
 * Underneath, every entry OLDEST FIRST with the time it was made and where it
 * came from — which is what settles an argument about whether somebody rebought
 * before or after a hand.
 *
 * The primary is **Rebuy $500** with the amount already resolved per M16 —
 * their last rebuy tonight, else the session's buy-in, else the group default —
 * and M17 says not to explain where it came from. One tap logs it. The pair
 * beneath is deliberately NOT red: cashing out is a normal, expected act, and
 * only ending the night is destructive.
 */
export default function PlayerPage() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const night = useNight();
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="Player">{null}</Sheet>;

  const player = night.players.find((p) => p.id === id);
  if (player === undefined) {
    return (
      <Sheet title="Player">
        <Text style={[styles.note, { color: t.muted }]}>Nobody by that name tonight.</Text>
      </Sheet>
    );
  }

  const standing = standingOf(night, ledger, player.id);
  const inFor = (standing?.boughtIn ?? 0) as Money;
  const seated = standing?.atTable === true;

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if they are still sitting there. Nothing at all until one of
   * those exists — a player mid-game has no result, only a stake.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted = seated
    ? finalCount === undefined
      ? undefined
      : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
    : standing?.played === true
      ? ((standing.cashedOut ?? 0) as Money)
      : undefined;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  const first = mine[0];
  const last = mine[mine.length - 1];

  const status = seated
    ? standing?.returned === true
      ? 'BACK IN'
      : 'SEATED'
    : standing?.played === true
      ? 'CASHED OUT'
      : 'ON THE ROSTER';

  /* M16: their last rebuy tonight, else the session's buy-in, else the group's. */
  const lastRebuy = [...mine].reverse().find((e) => e.type === 'rebuy' && !e.voided);
  const nextRebuy = lastRebuy?.amount ?? defaultBuyIn(ledger);

  async function logRebuy() {
    if (busy) return;
    setBusy(true);
    try {
      await rebuy(player!.id, money(nextRebuy));
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={player.name}
      badge={<HeaderPill label={status} quiet={!seated} />}
      meta={
        first === undefined || last === undefined
          ? undefined
          : seated
            ? `since ${clock(night.occurredAt[first.id])}`
            : `left ${clock(night.occurredAt[last.id])} · stack counted`
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Stat label="In for" value={formatMoney(inFor)} big={counted === undefined} />
        <Stat
          label="Counted"
          value={counted === undefined ? '—' : formatMoney(counted)}
          big={counted === undefined}
          muted={counted === undefined}
        />

        {counted === undefined ? (
          <Text style={[styles.cardNote, { color: t.muted }]}>Net is known once chips are counted</Text>
        ) : (
          <View style={styles.third}>
            <Text style={[styles.statLabel, { color: t.muted }]}>Night</Text>
            <Text style={[styles.statSmall, { color: moneyColor(t, (counted - inFor) as Money) }]}>
              {formatSigned((counted - inFor) as Money, '')}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Entries</Text>

        {mine.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.time, { color: t.muted }]}>{clock(night.occurredAt[e.id])}</Text>
            <View style={styles.rowText}>
              <Text style={[styles.what, { color: t.text }]}>
                {e.type === 'buyin' ? 'Buy-in' : e.type === 'rebuy' ? 'Rebuy' : 'Cashed out'}
              </Text>
              <Text style={[styles.provenance, { color: t.muted }]}>
                {provenance(e, mine, night)}
              </Text>
            </View>
            <Text style={[styles.amount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
          </Pressable>
        ))}

        {counted !== undefined && (
          <View style={[styles.settled, { borderTopColor: t.hairline }]}>
            {/* The board writes "Her result is set"; the app does not know a
                pronoun, so it says theirs. */}
            <Text style={[styles.settledText, { color: t.muted }]}>
              Their result is set. Bills and the kitty still come off it at settle-up.
            </Text>
          </View>
        )}
      </ScrollView>

      {seated ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={logRebuy}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: t.text, opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name="plus" color={t.onFill} size={18} stroke={2.6} />
            <Text style={[styles.primaryLabel, { color: t.onFill }]}>
              Rebuy {formatMoney(money(nextRebuy))}
            </Text>
          </Pressable>

          <View style={styles.pair}>
            <Secondary
              label="Other amount"
              onPress={() =>
                router.push({ pathname: '/log', params: { player: player.id, kind: 'rebuy' } })
              }
            />
            <Secondary
              label={`Cash out ${player.name}`}
              onPress={() =>
                router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.actionsOut}>
          <Secondary
            tall
            label="Correct an entry"
            /* Undrawn: which entry it means is not specified. The newest is the
               one a host has just mistyped; every other row is tappable too. */
            onPress={() =>
              last === undefined
                ? undefined
                : router.push({ pathname: '/entry', params: { id: last.id } })
            }
          />
          <Secondary tall label="Back to table" onPress={() => router.back()} />
        </View>
      )}
    </Sheet>
  );
}

/** One of the two — or, once they are counted, three — figures on the card. */
function Stat({
  label,
  value,
  big,
  muted = false,
}: {
  label: string;
  value: string;
  /** 32 with two pairs on the card, 30 with three. */
  big: boolean;
  muted?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[big ? styles.statBig : styles.statSmall, { color: muted ? t.muted : t.text }]}>
        {value}
      </Text>
    </View>
  );
}

function Secondary({
  label,
  onPress,
  tall = false,
}: {
  label: string;
  onPress?: () => void;
  tall?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        tall && styles.secondaryTall,
        { borderColor: t.outline, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.secondaryLabel, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The small print under an entry — "first rebuy · corrected from $300 at 21:14".
 *
 * A voided entry has to render here and the copy for it was never written, so
 * it says the one true thing rather than an invented sentence. Flagged in the
 * handoff, not guessed at.
 */
function provenance(
  e: ReturnType<typeof resolveLedger>['entries'][number],
  mine: ReturnType<typeof resolveLedger>['entries'],
  night: NonNullable<ReturnType<typeof useNight>>,
): string {
  if (e.voided) return 'voided';

  const base =
    e.type === 'buyin'
      ? 'first buy-in'
      : e.type === 'cashout'
        ? 'stack counted · seat closed'
        : `${ordinal(mine.filter((x) => x.type === 'rebuy' && x.seq <= e.seq).length)} rebuy`;

  if (!e.corrected) return base;

  const correction = night.entries
    .filter((x) => x.type === 'correction' && x.correctsEntryId === e.id)
    .pop();
  const at = correction === undefined ? '' : ` at ${clock(night.occurredAt[correction.id])}`;
  return `${base} · corrected from ${formatMoney(e.originalAmount)}${at}`;
}

const ordinal = (n: number) => (n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`);

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 22,
  },
  stat: { gap: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  statBig: { fontSize: 32, fontWeight: '800', letterSpacing: -1.28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  statSmall: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, lineHeight: 30, fontVariant: ['tabular-nums'] },
  third: { gap: 4, marginLeft: 'auto', alignItems: 'flex-end' },
  cardNote: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16.8,
    marginLeft: 'auto',
    maxWidth: 104,
    textAlign: 'right',
  },

  list: { flex: 1, marginHorizontal: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  time: { fontSize: 13, fontWeight: '600', width: 44, fontVariant: ['tabular-nums'] },
  rowText: { gap: 2, flexShrink: 1 },
  what: { fontSize: 16, fontWeight: '600' },
  provenance: { fontSize: 12.5, fontWeight: '400' },
  amount: { fontSize: 17, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  settled: { paddingTop: 12, paddingHorizontal: 4, paddingBottom: 2, borderTopWidth: 1 },
  settledText: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  actions: { marginTop: 14, marginHorizontal: 20, gap: 8 },
  actionsOut: { marginTop: 14, marginHorizontal: 20, flexDirection: 'row', gap: 10 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 19,
    borderRadius: 8,
  },
  primaryLabel: { fontSize: 18, fontWeight: '700' },
  pair: { flexDirection: 'row', gap: 10, paddingTop: 2 },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 2,
  },
  secondaryTall: { paddingVertical: 17 },
  secondaryLabel: { fontSize: 16, fontWeight: '700' },

  note: { fontSize: 12.5, fontWeight: '400', lineHeight: 19, marginHorizontal: 22, marginTop: 14 },
});
