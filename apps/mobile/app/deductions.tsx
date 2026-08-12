import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, settle, type Deduction, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * Deductions — E3, step 2 of 3.
 *
 * The step between counting and paying out, and the one that stops an argument
 * before it starts: it shows what each rule took, FROM WHOM, and where it went,
 * while there is still time to change a rule and look again.
 *
 * Every figure is the engine's. This screen does no arithmetic of its own —
 * not even the totals, which come from the deduction rather than from adding
 * up the rows above them. If a share looks wrong, the rule is wrong, and the
 * way to fix it is Edit rather than a different number here.
 */
export default function Deductions() {
  const t = useTheme();
  const night = useNight();

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
    return <Screen title="Deductions" backTo="Count up">{null}</Screen>;
  }

  /* The same gate as everywhere else: no counted night, no figures. */
  if (!result.ok) {
    return (
      <Screen
        title="Not yet"
        backTo="Count up"
        lede="Nothing can be worked out until every stack has been counted, or the difference has been confirmed."
        footer={<Button label="Back to the count" variant="primary" onPress={() => router.back()} />}
      >
        <Text style={[styles.blocked, { color: t.muted }]}>{result.message}</Text>
      </Screen>
    );
  }

  const { deductions, totalOffTable } = result.value;
  const taken = deductions.filter((d) => d.total > 0);

  /** "$120 back to Marek, $50 to Lena · $126 to the kitty" */
  const summary = taken
    .map((d) =>
      d.credits
        .map(
          (c) =>
            `${formatMoney(c.amount)} ${d.destination === 'bill' ? 'back to' : 'to'} ${nameOf(
              night,
              c.playerId,
            )}`,
        )
        .join(', '),
    )
    .filter((s) => s.length > 0)
    .join(' · ');

  return (
    <Screen
      title="Deductions"
      backTo="Count up"
      action={{ label: 'Edit', onPress: () => router.push('/money-rules') }}
      step="2 of 3"
      footer={
        <Button
          label={
            taken.length === 0
              ? 'Nothing comes off · settle up'
              : `${formatMoney(totalOffTable)} off the table · settle up`
          }
          variant="primary"
          onPress={() => router.push('/settle-up')}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.cardLabel, { color: t.muted }]}>Leaves the table</Text>
        <Text style={[styles.cardFigure, { color: t.text }]}>{formatMoney(totalOffTable)}</Text>
        {summary !== '' && <Text style={[styles.cardNote, { color: t.muted }]}>{summary}</Text>}
      </View>

      {taken.length === 0 && (
        <Text style={[styles.blocked, { color: t.muted }]}>
          No rule takes anything tonight. Everyone leaves with exactly what they counted.
        </Text>
      )}

      <View style={styles.cards}>
        {taken.map((d) => (
          <Card key={d.ruleId} deduction={d} night={night} />
        ))}
      </View>
    </Screen>
  );
}

/** One rule: what it took in total, in one line of why, then who paid it. */
function Card({
  deduction,
  night,
}: {
  deduction: Deduction;
  night: NonNullable<ReturnType<typeof useNight>>;
}) {
  const t = useTheme();
  const rule = night.rules.find((r) => r.id === deduction.ruleId);

  const name =
    rule?.amountKind === 'percent' ? `${deduction.name} · ${rule.amount}%` : deduction.name;

  const why =
    deduction.destination === 'bill'
      ? `${describeSplit(rule)} · ${deduction.credits
          .map((c) => `${nameOf(night, c.playerId)} fronted ${formatMoney(c.amount)}`)
          .join(', ')}.`
      : rule?.amountKind === 'percent'
        ? `Off each win${rule.basis === 'net_after_others' ? ', after the rules above' : ''} · held by ${nameOf(night, rule.collectorPlayerId)}.`
        : `${describeSplit(rule)} · held by ${nameOf(night, rule?.collectorPlayerId)}.`;

  return (
    <View style={[styles.rule, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <View style={styles.ruleTop}>
        <Text style={[styles.ruleName, { color: t.text }]}>{name}</Text>
        <Text style={[styles.ruleTotal, { color: t.text }]}>{formatMoney(deduction.total)}</Text>
      </View>

      <Text style={[styles.why, { color: t.muted }]}>{why}</Text>

      <View style={styles.charges}>
        {deduction.charges.map((c, i) => (
          <View
            key={c.playerId}
            style={[
              styles.charge,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth:
                  i === deduction.charges.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.chargeName, { color: t.text }]}>
              {nameOf(night, c.playerId)}
            </Text>
            <Text style={[styles.chargeAmount, { color: t.text }]}>
              {formatMoney(c.amount as Money)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const describeSplit = (rule: { split?: string; charge?: string } | undefined): string =>
  rule?.split === 'custom'
    ? 'Split by hand'
    : rule?.charge === 'everyone_flat'
      ? 'Split between everyone at the table'
      : rule?.split === 'by_percent'
        ? 'Split between the winners, by the size of the win'
        : 'Split equally between the winners';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  cardLabel: type.label,
  cardFigure: { fontSize: 28, fontWeight: '800', letterSpacing: -1.12, fontVariant: ['tabular-nums'] },
  cardNote: { fontSize: 13.5, fontWeight: '400', lineHeight: 19 },

  cards: { marginHorizontal: space.card, gap: 8 },
  rule: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 6,
  },
  ruleTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  ruleTotal: { ...type.statValue, marginLeft: 'auto' },
  why: { fontSize: 12.5, fontWeight: '400', lineHeight: 17.5 },

  charges: { gap: 2 },
  charge: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  chargeName: { fontSize: 15, fontWeight: '500' },
  chargeAmount: { fontSize: 16, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  blocked: { ...type.footnote, marginHorizontal: space.page },
});
