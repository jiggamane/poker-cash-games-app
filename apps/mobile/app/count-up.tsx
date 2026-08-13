import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  checkReconciliation,
  formatMoney,
  resolveLedger,
  type Money,
  type PlayerId,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Count up — E2, step 1 of 3. 13-after-the-night.md.
 *
 * A count for every seated player, in three groups that say three different
 * things: what is still owed, what is in, and who is already gone. Somebody who
 * cashed out during play keeps what they left with and is NEVER re-counted —
 * their row is muted, carries no glyph and does not respond to a tap.
 *
 * THE CARD STAYS NEUTRAL — no green, no red — until counted equals what is on
 * the table. A screen that went green early would be congratulating a host on a
 * figure they have not finished checking.
 *
 * The gate here is only the count: the primary is blocked while any stack is
 * uncounted, and it says which stacks. Money that does not add up is a
 * different problem, and it is caught at settle-up (E5), where the fix lives.
 */
export default function CountUp() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="Count up" backTo="Tonight">{null}</Screen>;
  }

  const reconciliation = checkReconciliation({
    players: night.players,
    entries: night.entries,
    finalCounts: night.finalCounts,
    rules: night.rules,
  });

  /**
   * Only people with chips in front of them owe a count. Somebody who busted
   * out cashed out for nothing and has nothing left to count — waiting for one
   * would block the close forever.
   */
  const standings = standingsOf(night, ledger).filter((s) => s.played);
  const seated = standings.filter((s) => s.atTable);
  const gone = standings.filter((s) => !s.atTable);

  const toCount = seated.filter((p) => !night.finalCounts.has(p.id));
  const done = seated.filter((p) => night.finalCounts.has(p.id));

  const countedTotal = [...night.finalCounts.values()].reduce((a, b) => a + b, 0) as Money;
  const ready = toCount.length === 0;

  /*
   * Every stack counted and the money still not adding up goes STRAIGHT to the
   * out-of-balance screen, not to the deductions. There is nothing to deduct
   * from a table whose total is unknown, and E5 is where the difference is
   * named and fixed.
   */
  const balanced = reconciliation.reconciled || night.acknowledgement !== undefined;

  return (
    <Screen
      title="Count up"
      backTo="Tonight"
      trailing={<Step label="1 of 3" />}
      footer={
        <>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/stands')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[styles.link, { color: t.text }]}>See where everyone stands</Text>
          </Pressable>

          <Button
            label="Apply the money rules"
            variant={ready ? 'primary' : 'blocked'}
            onPress={() => router.push(balanced ? '/deductions' : '/settle-up')}
          />

          {!ready && (
            <Text style={[styles.reason, { color: t.muted }]}>
              {count(toCount.length)} still to count.
            </Text>
          )}
        </>
      }
    >
      {/* Counted, against what should be there. One figure and its target — a
          host wants to know how far off they are without doing the subtraction. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardText}>
          <Text style={[styles.label, { color: t.muted }]}>COUNTED</Text>
          <Text style={[styles.cardFigure, { color: t.text }]}>
            {formatMoney(countedTotal)}
            <Text style={[styles.cardOf, { color: t.muted }]}>
              {' '}of {formatMoney(reconciliation.chipsOnTable)}
            </Text>
          </Text>
        </View>
        <Text style={[styles.toGo, { color: t.muted }]}>
          {ready ? 'ALL IN' : `${toCount.length} TO GO`}
        </Text>
      </View>

      <Group
        label={`Still to count · ${toCount.length}`}
        players={toCount}
        ledger={ledger}
        counts={night.finalCounts}
        kind="todo"
        first
      />
      <Group
        label={`Done · ${done.length}`}
        players={done}
        ledger={ledger}
        counts={night.finalCounts}
        kind="done"
      />
      <Group
        label="Already gone"
        players={gone}
        ledger={ledger}
        counts={night.finalCounts}
        kind="gone"
        night={night}
      />
    </Screen>
  );
}

/** "Two stacks still to count." The drawn line counts in words, not digits. */
const count = (n: number): string => {
  const word = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] ?? String(n);
  return `${word} ${n === 1 ? 'stack' : 'stacks'}`;
};

function Group({
  label,
  players,
  ledger,
  counts,
  kind,
  night,
  first = false,
}: {
  label: string;
  players: Array<{ id: PlayerId; name: string }>;
  ledger: ReturnType<typeof resolveLedger>;
  counts: Map<PlayerId, Money>;
  kind: 'todo' | 'done' | 'gone';
  night?: NonNullable<ReturnType<typeof useNight>>;
  first?: boolean;
}) {
  const t = useTheme();
  if (players.length === 0) return null;

  const gone = kind === 'gone';

  return (
    <View style={[styles.group, !first && styles.groupAfter]}>
      <Text style={[styles.sectionLabel, { color: t.muted }]}>{label}</Text>

      {players.map((p) => {
        const value = gone
          ? ((ledger.cashedOutByPlayer.get(p.id) ?? 0) as Money)
          : counts.get(p.id);
        const left = new Date(night === undefined ? 0 : (leftAt(night, p.id) ?? 0));

        return (
          <Pressable
            key={p.id}
            accessibilityRole={gone ? 'none' : 'button'}
            disabled={gone}
            onPress={() =>
              router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } })
            }
            style={({ pressed }) => [
              gone ? styles.goneRow : styles.row,
              !gone && { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
              { opacity: pressed && !gone ? 0.6 : 1 },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: gone ? t.muted : t.text }]}>{p.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>
                {gone
                  ? `cashed out ${clock(left)} · in ${formatMoney((ledger.boughtInByPlayer.get(p.id) ?? 0) as Money)}`
                  : `in ${formatMoney((ledger.boughtInByPlayer.get(p.id) ?? 0) as Money)}`}
              </Text>
            </View>

            {/* An em dash, never a zero: nothing counted is not the same as
                nothing there, and a zero would balance the books by accident. */}
            <Text style={[styles.figure, { color: value === undefined || gone ? t.muted : t.text }]}>
              {value === undefined ? '—' : formatMoney(value)}
            </Text>

            {kind === 'todo' && <Icon name="pencil" color={t.muted} size={15} />}
            {kind === 'done' && <Icon name="check" color={t.win} size={15} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** When they left the table, which is the time on their last cash-out. */
function leftAt(
  night: NonNullable<ReturnType<typeof useNight>>,
  playerId: PlayerId,
): string | undefined {
  const out = [...night.entries]
    .filter((e) => e.type === 'cashout' && e.playerId === playerId)
    .sort((a, b) => b.seq - a.seq)[0];
  return out === undefined ? undefined : night.occurredAt[out.id];
}

const clock = (d: Date): string =>
  d.getTime() === 0 ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  cardText: { gap: 5, flexShrink: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  cardFigure: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, fontVariant: ['tabular-nums'] },
  cardOf: { fontSize: 17, fontWeight: '800' },
  toGo: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

  group: { marginHorizontal: 22 },
  groupAfter: { paddingTop: 16 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  goneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  figure: { ...type.figure, marginLeft: 'auto' },

  link: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
    paddingBottom: 2,
  },
  reason: { textAlign: 'center', fontSize: 12.5, fontWeight: '400', marginTop: -2 },

  page: { marginHorizontal: space.page },
});
