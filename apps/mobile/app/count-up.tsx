import { useMemo, useState } from 'react';
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
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { setAcknowledgement, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Count up — step 1 of closing a night. E2, and E5 when it does not add up.
 *
 * THE CLOSE GATE LIVES HERE, in the UI half of it.
 *
 * A night can be settled only when the chips counted equal the chips that
 * should be on the table — or when the host has looked at the difference, been
 * told the exact figure, and confirmed it. There is no third path: the primary
 * button is disabled until one of those two things is true, and the engine
 * refuses independently, so a screen that got this wrong would still fail to
 * settle rather than settle wrongly.
 *
 * "The chips that should be on the table" is buy-ins minus cash-outs. It does
 * NOT subtract the bill, the kitty or any other rule: those are taken at
 * settle-up, out of money that is by then already counted. Subtracting them
 * here would double-count them and make every honest night look short.
 */
export default function CountUp() {
  const t = useTheme();
  const night = useNight();
  const [confirming, setConfirming] = useState(false);

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
  const stillPlaying = standings.filter((s) => s.atTable);
  const gone = standings.filter((s) => !s.atTable);

  const toCount = stillPlaying.filter((p) => !night.finalCounts.has(p.id));
  const counted = stillPlaying.filter((p) => night.finalCounts.has(p.id));

  const countedTotal = [...night.finalCounts.values()].reduce((a, b) => a + b, 0) as Money;

  const balanced = reconciliation.reconciled;
  const confirmed = night.acknowledgement !== undefined;
  const short = reconciliation.difference < 0;

  // The gate, stated once: everybody counted, and the money either agrees or
  // has been confirmed not to.
  const canSettle = toCount.length === 0 && (balanced || confirmed);

  async function confirmDifference() {
    await setAcknowledgement({
      amount: reconciliation.difference,
      confirmedByUserId: 'host',
      confirmedAt: new Date().toISOString(),
      note: `Confirmed on the count screen: ${formatMoney(reconciliation.difference)}.`,
    });
    setConfirming(false);
  }

  return (
    <Screen
      title={balanced || toCount.length > 0 ? 'Count up' : 'It doesn’t add up'}
      backTo="Tonight"
      step="1 of 3"
      footer={
        <>
          {!balanced && toCount.length === 0 && !confirmed && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirming((c) => !c)}
              style={({ pressed }) => [
                styles.confirmRow,
                { borderColor: t.dangerEdge, backgroundColor: t.dangerWash, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.box, { borderColor: t.danger }, confirming && { backgroundColor: t.danger }]} />
              <Text style={[styles.confirmText, { color: t.text }]}>
                I know {formatMoney(abs(reconciliation.difference))} is{' '}
                {short ? 'missing' : 'unaccounted for'}, and I want to settle anyway.
              </Text>
            </Pressable>
          )}

          <Button
            label={
              toCount.length > 0
                ? `${toCount.length} still to count`
                : balanced
                  ? 'What comes off'
                  : confirmed
                    ? `Carry on, ${formatMoney(abs(reconciliation.difference))} unaccounted`
                    : 'Confirm the difference'
            }
            variant="primary"
            disabled={toCount.length > 0 || (!balanced && !confirmed && !confirming)}
            onPress={() => {
              if (canSettle) router.push('/deductions');
              else void confirmDifference();
            }}
          />
        </>
      }
    >
      {/* Counted, against what should be there. One figure and its target — a
          host wants to know how far off they are without doing the subtraction. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardText}>
          <Text style={[styles.label, { color: t.muted }]}>Counted</Text>
          <Text style={[styles.cardFigure, { color: t.text }]}>
            {formatMoney(countedTotal)}
            <Text style={[styles.cardOf, { color: t.muted }]}>
              {' '}of {formatMoney(reconciliation.chipsOnTable)}
            </Text>
          </Text>
        </View>
        <Text style={[styles.toGo, { color: t.muted }]}>
          {toCount.length > 0 ? `${toCount.length} TO GO` : balanced ? 'BALANCED' : 'OFF'}
        </Text>
      </View>

      {/* The difference, named. This is the message the host has to see before
          anything can be confirmed — never a silent rounding away. */}
      {toCount.length === 0 && !balanced && (
        <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
          <Text style={[styles.alertLabel, { color: t.danger }]}>
            Off by {formatMoney(abs(reconciliation.difference))}
          </Text>
          <Text style={[styles.alertBody, { color: t.text }]}>
            {formatMoney(ledger.totalBoughtIn)} went in and{' '}
            {formatMoney((ledger.totalCashedOut + countedTotal) as Money)} came out.{' '}
            {short
              ? 'Someone’s stack is short, or a buy-in was never logged.'
              : 'There are more chips than were bought in — a count is too high, or a buy-in was logged twice.'}
          </Text>
          {confirmed && (
            <Text style={[styles.alertBody, { color: t.muted }]}>
              Confirmed. It will be recorded with the night and shown to everyone.
            </Text>
          )}
        </View>
      )}

      <Group
        label={`Still to count · ${toCount.length}`}
        players={toCount}
        ledger={ledger}
        counts={night.finalCounts}
        hide={toCount.length === 0}
      />
      <Group
        label={`Done · ${counted.length}`}
        players={counted}
        ledger={ledger}
        counts={night.finalCounts}
        hide={counted.length === 0}
      />
      <Group
        label="Already gone"
        players={gone}
        ledger={ledger}
        counts={night.finalCounts}
        cashedOut
        hide={gone.length === 0}
      />
    </Screen>
  );
}

const abs = (m: Money): Money => Math.abs(m) as Money;

function Group({
  label,
  players,
  ledger,
  counts,
  cashedOut = false,
  hide,
}: {
  label: string;
  players: Array<{ id: PlayerId; name: string }>;
  ledger: ReturnType<typeof resolveLedger>;
  counts: Map<PlayerId, Money>;
  cashedOut?: boolean;
  hide: boolean;
}) {
  const t = useTheme();
  if (hide) return null;

  return (
    <View style={styles.group}>
      <Text style={[styles.sectionLabel, { color: t.muted }]}>{label}</Text>
      {players.map((p, i) => {
        const count = cashedOut
          ? ((ledger.cashedOutByPlayer.get(p.id) ?? 0) as Money)
          : counts.get(p.id);
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            disabled={cashedOut}
            onPress={() =>
              router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } })
            }
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === players.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: cashedOut ? t.muted : t.text }]}>{p.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>
                {cashedOut
                  ? (ledger.cashedOutByPlayer.get(p.id) ?? 0) === 0
                    ? 'busted out'
                    : 'cashed out earlier'
                  : `in ${formatMoney((ledger.boughtInByPlayer.get(p.id) ?? 0) as Money)}`}
              </Text>
            </View>
            {/* An em dash, never a zero: nothing counted is not the same as
                nothing there, and a zero would balance the books by accident. */}
            <Text style={[styles.figure, { color: count === undefined ? t.muted : t.text }]}>
              {count === undefined ? '—' : formatMoney(count)}
            </Text>
            {!cashedOut && <Icon name="chevron" color={t.muted} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 18,
    paddingVertical: space.cardPadV,
    paddingHorizontal: space.cardPadH,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardText: { gap: 5, flexShrink: 1 },
  label: type.label,
  cardFigure: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, fontVariant: ['tabular-nums'] },
  cardOf: { fontSize: 17, fontWeight: '800' },
  toGo: { fontSize: 13, fontWeight: '700', marginLeft: 'auto', letterSpacing: 0.5 },

  alert: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: { ...type.label, fontSize: 11, letterSpacing: 1.1 },
  alertBody: { fontSize: 13.5, fontWeight: '400', lineHeight: 20 },

  group: { marginHorizontal: space.page, marginBottom: 16 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  figure: { ...type.figure, marginLeft: 'auto' },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1,
  },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2 },
  confirmText: { fontSize: 13.5, fontWeight: '500', lineHeight: 19, flexShrink: 1 },
});
