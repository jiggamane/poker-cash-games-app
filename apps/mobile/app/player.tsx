import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSigned,
  lastRebuyAmount,
  resolveLedger,
  type EffectiveEntry,
  type Money,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { rebuy, standingOf, useNight } from '../src/lib/nightStore';

/**
 * The player card — T2 at the table, T4 once they have cashed out.
 * `08-tonight-home.md`.
 *
 * Rev 8 moved the night's history here, off the session screen: there is no
 * feed any more, and every timestamped entry lives on the player it belongs to.
 * That is where the question is anyway. Nobody asks "what happened at 22:03",
 * they ask "how much is Petr in for", and the answer is a screen with his name
 * at the top.
 *
 * COUNTED IS AN EM DASH UNTIL THE CHIPS ARE COUNTED, and that is the point of
 * the card rather than an omission. While a game runs nobody's result is known,
 * only their stake; a running "net" would be a number invented out of chips
 * nobody has looked at.
 *
 * Rev 9 makes this a sheet over the night (S39) — the board still draws it as a
 * full screen. It is a place you look at, not a place you stay.
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
  const played = standing?.played === true;

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if they are still sitting there. Nothing at all until one of
   * those exists — a player mid-game has no result, only a stake.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted = stillIn
    ? finalCount === undefined
      ? undefined
      : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
    : played
      ? ((standing?.cashedOut ?? 0) as Money)
      : undefined;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  const first = mine[0];
  const last = mine[mine.length - 1];
  const cashedOut = played && !stillIn;

  /**
   * M16, resolved here and NOT explained anywhere on the screen (M17).
   *
   * The button says "Rebuy $500" and nothing under it says why $500. A host who
   * wants a different number taps Other amount; a host who does not is one tap
   * from the thing they were going to do anyway.
   */
  const nextRebuy = lastRebuyAmount(ledger, player.id, night.defaultBuyIn);

  return (
    <Sheet
      title={player.name}
      badge={
        <View style={[styles.pill, { backgroundColor: t.controlFill }]}>
          <Text style={[styles.pillLabel, { color: cashedOut ? t.muted : t.text }]}>
            {!played
              ? 'ON THE ROSTER'
              : stillIn
                ? standing?.returned === true
                  ? 'BACK IN'
                  : 'SEATED'
                : (standing?.cashedOut ?? 0) === 0
                  ? 'BUSTED OUT'
                  : 'CASHED OUT'}
          </Text>
        </View>
      }
      sub={
        cashedOut && last !== undefined
          ? `left ${clock(night.occurredAt[last.id])}`
          : first !== undefined
            ? `since ${clock(night.occurredAt[first.id])}`
            : 'not in yet'
      }
      footer={
        stillIn ? (
          /* T2. The primary is the rebuy that is about to happen; the pair
             beneath it is NOT red, because cashing out is an ordinary act and
             only ending the night is destructive. */
          <>
            <Button
              label={`Rebuy ${formatMoney(nextRebuy)}`}
              variant="primary"
              onPress={() => {
                void rebuy(player.id, nextRebuy);
                router.back();
              }}
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
                label={`Cash out ${player.name}`}
                variant="secondary"
                style={styles.half}
                onPress={() =>
                  router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
                }
              />
            </View>
          </>
        ) : cashedOut ? (
          /* T4. No primary at all: there is nothing left to do to somebody who
             has gone home except fix a mistake. Buying back in seats them
             again, from the dock. */
          <View style={styles.pair}>
            <Button
              label="Correct an entry"
              variant="secondary"
              style={styles.half}
              disabled={last === undefined}
              onPress={() =>
                last !== undefined &&
                router.push({ pathname: '/entry', params: { id: last.id } })
              }
            />
            <Button
              label="Back to table"
              variant="secondary"
              style={styles.half}
              onPress={() => router.back()}
            />
          </View>
        ) : undefined
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Stat label="In for" value={formatMoney(boughtIn)} three={cashedOut} />
        <Stat
          label="Counted"
          value={counted === undefined ? '—' : formatMoney(counted)}
          muted={counted === undefined}
          three={cashedOut}
        />

        {cashedOut && counted !== undefined ? (
          <Stat
            label="Night"
            value={formatSigned((counted - boughtIn) as Money, '')}
            color={moneyColor(t, (counted - boughtIn) as Money)}
            three
            pushRight
          />
        ) : (
          <Text style={[styles.aside, { color: t.muted }]}>
            Net is known once chips are counted
          </Text>
        )}
      </View>

      <View style={styles.entries}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Entries</Text>

        {mine.length === 0 ? (
          <Text style={[styles.note, { color: t.muted }]}>Nothing yet tonight.</Text>
        ) : (
          mine.map((e, i) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
              style={({ pressed }) => [
                styles.entry,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === mine.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>
                {clock(night.occurredAt[e.id])}
              </Text>
              <View style={styles.entryText}>
                <Text style={[styles.entryName, { color: t.text }]}>{titleOf(e)}</Text>
                <Text style={[styles.provenance, { color: t.muted }]}>
                  {provenanceOf(e, mine)}
                </Text>
              </View>
              <Text style={[styles.entryAmount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
            </Pressable>
          ))
        )}
      </View>

      {cashedOut && (
        <View style={[styles.closing, { borderTopColor: t.hairline }]}>
          <Text style={[styles.closingText, { color: t.muted }]}>
            Their result is set. Bills and the kitty still come off it at settle-up.
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/** One figure with its caption. Three of them once a night is over. */
function Stat({
  label,
  value,
  muted = false,
  color,
  three = false,
  pushRight = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  color?: string;
  three?: boolean;
  pushRight?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.stat, pushRight && styles.statPushRight]}>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text
        style={[
          three ? styles.statValueThree : styles.statValue,
          { color: color ?? (muted ? t.muted : t.text) },
          pushRight && styles.statValueRight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** "Buy-in", "Rebuy", "Cashed out" — what the row is. */
function titleOf(e: EffectiveEntry): string {
  if (e.type === 'buyin') return 'Buy-in';
  if (e.type === 'rebuy') return 'Rebuy';
  if (e.type === 'cashout') return 'Cashed out';
  return 'Expense';
}

/**
 * The line under it: which one this was, and anything that has happened to it.
 *
 * "logged by Ivo" is on the board and is not built: there is one writer, so
 * every entry was logged by the host and saying so on each row is noise until
 * a night can have two.
 *
 * VOIDED COPY IS NOT WRITTEN. Rev 8 says the row must exist and to flag the
 * missing string rather than invent one, so this reuses the word the feed has
 * always used here rather than writing new prose for the design.
 */
function provenanceOf(e: EffectiveEntry, mine: readonly EffectiveEntry[]): string {
  if (e.voided) return 'voided';

  if (e.type === 'cashout') return 'stack counted · seat closed';

  const kind = e.type === 'buyin' ? 'buy-in' : 'rebuy';
  const sameKind = mine.filter((x) => x.type === e.type && !x.voided);
  const which = sameKind.findIndex((x) => x.id === e.id);
  const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][which] ?? `${which + 1}th`;

  const base = `${ordinal} ${kind}`;
  return e.corrected ? `${base} · corrected from ${formatMoney(e.originalAmount)}` : base;
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? '—'
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  note: { ...type.footnote, paddingHorizontal: space.page },

  pill: {
    paddingVertical: control.badgePadV,
    paddingHorizontal: control.badgePadH,
    borderRadius: radius.badge,
  },
  pillLabel: type.badge,

  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.statGap,
    marginHorizontal: space.card,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
  },
  stat: { gap: 4 },
  statPushRight: { marginLeft: 'auto' },
  statLabel: type.label,
  statValue: type.statFigure,
  statValueThree: type.statFigureThree,
  statValueRight: { textAlign: 'right' },
  aside: { ...type.tableAside, marginLeft: 'auto', textAlign: 'right', maxWidth: 104 },

  entries: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: space.rowInset, paddingBottom: 4 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: space.rowInset,
  },
  time: { ...type.time, width: 44 },
  entryText: { gap: 2, flexShrink: 1 },
  entryName: type.feedName,
  provenance: type.provenance,
  entryAmount: { ...type.figure, fontSize: 17, marginLeft: 'auto' },

  closing: {
    marginHorizontal: space.page,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closingText: { ...type.emptyBody, fontSize: 13, lineHeight: 19.5 },

  pair: { flexDirection: 'row', gap: 10, paddingTop: 2 },
  half: { flex: 1 },
});
