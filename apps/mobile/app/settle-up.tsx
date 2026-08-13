import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatSigned, settle, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { closeNight, nameOf, useNight } from '../src/lib/nightStore';

/**
 * Settle up — the last of the three close steps. Built from E4.
 *
 * The screen is the list of transfers, and nothing else is given equal weight:
 * what a room needs at 1am is who hands what to whom, not a summary. The net
 * per player sits underneath as chips, small and green-and-red, because it is
 * the thing you check afterwards rather than act on.
 *
 * Every figure comes from the settlement engine. Nothing here does arithmetic
 * of its own; if a number looks wrong, the engine is wrong, and there is a test
 * for it.
 */
export default function SettleUp() {
  const t = useTheme();
  const night = useNight();

  /**
   * The close gate, from this side.
   *
   * `settle()` throws when the count does not balance and nothing has been
   * confirmed. That is not an error to swallow — it is the rule, and catching
   * it here is how the screen refuses to show figures that were never allowed
   * to exist. The only way past it is back to the count.
   */
  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return {
        ok: true as const,
        value: settle({
          players: night.players,
          entries: night.entries,
          finalCounts: night.finalCounts,
          rules: night.rules,
          ...(night.acknowledgement ? { acknowledgedDiscrepancy: night.acknowledgement } : {}),
        }),
      };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }
  }, [night]);

  if (night === null || result === null) {
    return <Screen title="Settle up" backTo="Deductions">{null}</Screen>;
  }

  if (!result.ok) {
    return (
      <Screen
        title="Not yet"
        backTo="Deductions"
        lede="The night cannot be settled until the chips counted match the chips on the table, or the difference has been confirmed."
        footer={
          <Button
            label="Back to the count"
            variant="primary"
            onPress={() => router.dismissTo('/count-up')}
          />
        }
      >
        <Text style={[styles.blocked, { color: t.muted }]}>{result.message}</Text>
      </Screen>
    );
  }

  const { deductions, players, transfers } = result.value;

  /**
   * Money that leaves the table for good, as opposed to money going back to
   * somebody who fronted it. A bill reimbursement is a person being repaid and
   * stays in plain ink; the kitty and the host's fee are bone.
   *
   * Only collectors who are NOT at the table qualify: if the kitty's holder is
   * also playing, the engine nets their winnings and the kitty into one
   * position, and colouring that row bone would be a lie about what it is.
   */
  const offTable = (() => {
    const map = new Map<PlayerId, string>();
    const seated = new Set(players.filter((p) => p.boughtIn > 0).map((p) => p.playerId));
    for (const d of deductions) {
      if (d.destination === 'bill') continue;
      for (const c of d.credits) {
        if (!seated.has(c.playerId)) map.set(c.playerId, d.name);
      }
    }
    return map;
  })();

  const net = [...players].sort((a, b) => b.finalPosition - a.finalPosition);

  const kept = [...offTable.values()];
  const lede =
    `${count(transfers.length, 'transfer')} clear the night.` +
    (kept.length > 0 ? ` ${kept.join(' and ')} ${kept.length === 1 ? 'is' : 'are'} set aside.` : '');

  return (
    <Screen
      title="Settle up"
      backTo="Deductions"
      step="3 of 3"
      lede={lede}
      footer={
        <>
          <Button
            label="Close the session"
            variant="primary"
            onPress={() => {
              // Freezes the result, marks the night, and queues the record.
              // Everything after this reads that frozen copy rather than
              // recomputing — which is what stops a settled night drifting.
              void closeNight()
                .then(() => {
                  router.dismissTo('/');
                  router.push('/settled');
                })
                .catch(() => {
                  // settle() refused: the count does not balance and nothing
                  // has been confirmed. The screen above already says so.
                });
            }}
          />
          <Button
            label="Edit the money rules"
            variant="secondary"
            onPress={() => router.push('/money-rules')}
          />
          <View style={styles.footerRow}>
            <Button label="Share" variant="secondary" style={styles.footerAction} />
            <Button label="Export" variant="secondary" style={styles.footerAction} />
          </View>
        </>
      }
    >
      <View style={styles.list}>
        {transfers.map((tr, i) => {
          const asKitty = offTable.get(tr.toPlayerId);
          return (
            <Row
              key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`}
              kind="transfer"
              label={nameOf(night, tr.fromPlayerId)}
              to={asKitty ?? nameOf(night, tr.toPlayerId)}
              amount={tr.amount}
              tone={asKitty !== undefined ? 'offTable' : 'plain'}
              last={i === transfers.length - 1}
            />
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Night’s net</Text>
        <View style={styles.chips}>
          {net.map((p) => (
            <NetChip key={p.playerId} name={p.name} amount={p.finalPosition} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

/**
 * A name and a signed figure on a wash of its own colour.
 *
 * No currency symbol: in a row of six the sign is the information, and six
 * dollar signs are six pieces of noise.
 */
function NetChip({ name, amount }: { name: string; amount: Money }) {
  const t = useTheme();
  const won = amount >= 0;
  return (
    <View style={[styles.chip, { backgroundColor: won ? t.winWash : t.lossWash }]}>
      <Text style={[styles.chipName, { color: t.text }]}>{name}</Text>
      <Text style={[styles.chipFigure, { color: won ? t.win : t.loss }]}>
        {formatSigned(amount, '')}
      </Text>
    </View>
  );
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },

  // 22 above, 22 aside — and the label carries the rows' own 4 of inset so it
  // lines up with the names beneath it rather than with the hairline.
  section: { marginTop: space.section, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: radius.pressable,
  },
  chipName: type.netName,
  chipFigure: type.netFigure,

  blocked: { ...type.footnote, marginHorizontal: space.page },
  footerRow: { flexDirection: 'row', gap: 14 },
  footerAction: { flex: 1 },
});
