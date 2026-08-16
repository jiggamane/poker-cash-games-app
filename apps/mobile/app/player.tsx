import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { lastRebuyAmount, standingOf, useNight } from '../src/lib/nightStore';

/**
 * The player card — T2 at the table, T4 cashed out. 08-tonight-home.md.
 *
 * This is where the night's history lives now: there is no feed anywhere in
 * the app, so every entry with its timestamp hangs off the person it happened
 * to. Oldest first, because you read a person's night forwards.
 *
 * COUNTED IS AN EM DASH until their chips are counted, and that is the point of
 * the screen. While a game runs nobody's result exists — only what they have
 * put in — and a page showing a running "net" would be inventing a number out
 * of chips nobody has looked at.
 *
 * The two secondaries are NOT red. Cashing out is a normal, expected act; only
 * ending the night is destructive, and that lives behind a hold in the dock.
 */
export default function PlayerCard() {
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
  const inFor = (standing?.boughtIn ?? 0) as Money;
  const seated = standing?.atTable === true;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  const first = mine[0];
  const lastOut = [...mine].reverse().find((e) => e.type === 'cashout');

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if the host has already counted it. Nothing at all until one
   * of those exists.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted = seated
    ? finalCount === undefined
      ? undefined
      : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
    : standing?.played === true
      ? ((standing.cashedOut ?? 0) as Money)
      : undefined;

  const result = counted === undefined ? undefined : ((counted - inFor) as Money);

  const rebuy = lastRebuyAmount(ledger, player.id);

  return (
    <Sheet
      title={player.name}
      badge={
        standing?.played !== true
          ? 'on the roster'
          : seated
            ? standing.returned
              ? 'back in'
              : 'seated'
            : standing.cashedOut === 0
              ? 'busted out'
              : 'cashed out'
      }
      sub={
        seated
          ? first === undefined
            ? undefined
            : `since ${clock(night.occurredAt[first.id])}`
          : lastOut === undefined
            ? undefined
            : `left ${clock(night.occurredAt[lastOut.id])}`
      }
      footer={
        seated ? (
          <>
            {/* Pre-filled per M16: their last rebuy tonight, then tonight's
                buy-in, then the group default. Where it came from is
                deliberately not printed anywhere — M17. */}
            <Button
              label={`Rebuy ${formatMoney(rebuy)}`}
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: '/log',
                  params: { player: player.id, kind: 'rebuy', amount: String(rebuy) },
                })
              }
            />
            <View style={styles.pair}>
              <Button
                label="Other amount"
                variant="secondary"
                style={styles.half}
                onPress={() =>
                  router.push({ pathname: '/log', params: { player: player.id, kind: 'rebuy' } })
                }
              />
              <Button
                label="Cash out"
                variant="secondary"
                style={styles.half}
                onPress={() =>
                  router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
                }
              />
            </View>
          </>
        ) : (
          <View style={styles.pair}>
            {/* No primary once they are out. Correcting opens the newest line,
                which is the one just written; every other line is one tap away
                in the list above. */}
            <Button
              label="Correct an entry"
              variant="secondary"
              style={styles.half}
              disabled={mine.length === 0}
              onPress={() =>
                router.push({ pathname: '/entry', params: { id: mine[mine.length - 1]!.id } })
              }
            />
            <Button
              label="Back to table"
              variant="secondary"
              style={styles.half}
              onPress={() => router.back()}
            />
          </View>
        )
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <StatPair label="In for" value={formatMoney(inFor)} tight={result !== undefined} />
        <StatPair
          label="Counted"
          value={counted === undefined ? '—' : formatMoney(counted)}
          muted={counted === undefined}
          tight={result !== undefined}
        />
        {result !== undefined && (
          <StatPair label="Night" value={formatSigned(result)} color={moneyColor(t, result)} tight push />
        )}
        {result === undefined && (
          <Text style={[styles.cardNote, { color: t.muted }]}>
            Net is known once chips are counted
          </Text>
        )}
      </View>

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Entries</Text>

        {mine.map((e, i) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === mine.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.time, { color: t.muted }]}>{clock(night.occurredAt[e.id])}</Text>
            <View style={styles.entryText}>
              <Text style={[styles.entryType, { color: e.voided ? t.muted : t.text }]}>
                {label(e.type, mine, i)}
              </Text>
              <Text style={[styles.provenance, { color: t.muted }]} numberOfLines={1}>
                {provenance(e, mine, i, night)}
              </Text>
            </View>
            <Text style={[styles.entryAmount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
          </Pressable>
        ))}

        {mine.length === 0 && (
          <Text style={[styles.note, { color: t.muted }]}>Nothing logged for them yet.</Text>
        )}
      </View>

      {!seated && result !== undefined && (
        <View style={[styles.settledNote, { borderTopColor: t.hairline }]}>
          {/* The drawn line names the sample player and so carries her pronoun;
              this is the same sentence with the pronoun that fits everyone. */}
          <Text style={[styles.settledText, { color: t.muted }]}>
            Their result is set. Bills and the kitty still come off it at settle-up.
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/** A label over a figure, two or three across the summary card. */
function StatPair({
  label,
  value,
  color,
  muted = false,
  tight = false,
  push = false,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
  tight?: boolean;
  push?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.stat, push && styles.statPush]}>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text
        style={[
          tight ? styles.statValueTight : styles.statValue,
          { color: color ?? (muted ? t.muted : t.text) },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** "First buy-in", "Second rebuy", "Cashed out" — what the line is. */
function label(
  kind: 'buyin' | 'rebuy' | 'cashout' | 'expense',
  all: readonly { type: string }[],
  index: number,
): string {
  if (kind === 'cashout') return 'Cashed out';
  if (kind === 'buyin') return 'Buy-in';
  const nth = all.slice(0, index + 1).filter((e) => e.type === 'rebuy').length;
  return `${ordinal(nth)} rebuy`;
}

/**
 * The line under it: how deep this entry is, and what has happened to it since.
 *
 * The drawn strings carry a "logged by Ivo" clause. Nothing in the app knows
 * who is holding the phone yet — there is no host identity in the store — so
 * that clause is left off rather than filled with a guess.
 *
 * A VOIDED entry has no written copy in the bundle (rev 8, § "What is not
 * settled"). The row must exist, so it uses the word this app already shipped
 * rather than a new sentence invented here. Flagged, not solved.
 */
function provenance(
  e: { id: string; type: string; corrected: boolean; voided: boolean; originalAmount: Money },
  all: readonly { type: string }[],
  index: number,
  night: NonNullable<ReturnType<typeof useNight>>,
): string {
  if (e.voided) return 'voided';

  const depth =
    e.type === 'cashout'
      ? 'stack counted · seat closed'
      : e.type === 'buyin'
        ? 'first buy-in'
        : `${ordinal(all.slice(0, index + 1).filter((x) => x.type === 'rebuy').length)} rebuy`;

  if (!e.corrected) return depth;

  const correction = [...night.entries]
    .filter((x) => x.correctsEntryId === e.id)
    .sort((a, b) => b.seq - a.seq)[0];
  const at = correction === undefined ? undefined : night.occurredAt[correction.id];

  return `${depth} · corrected from ${formatMoney(e.originalAmount)}${
    at === undefined ? '' : ` at ${clock(at)}`
  }`;
}

const ordinal = (n: number): string =>
  n === 1 ? 'First' : n === 2 ? 'Second' : n === 3 ? 'Third' : `${n}th`;

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 22,
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  // 4 between the caps label and the figure, as H2 draws it — 6 pushed the
  // three pairs a row taller than the card they sit in was drawn for.
  stat: { gap: 4 },
  statPush: { marginLeft: 'auto', alignItems: 'flex-end' },
  statLabel: type.statPairLabel,
  statValue: type.statPairValue,
  statValueTight: type.statPairValueTight,
  cardNote: { ...type.statPairNote, marginLeft: 'auto', maxWidth: 104, textAlign: 'right' },

  list: { marginHorizontal: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  time: { ...type.time, width: 44 },
  entryText: { gap: 2, flexShrink: 1 },
  entryType: type.entryType,
  provenance: type.entryProvenance,
  entryAmount: { ...type.entryAmount, marginLeft: 'auto' },

  settledNote: { marginTop: 14, marginHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  settledText: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  note: { ...type.footnote, marginHorizontal: space.page },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
