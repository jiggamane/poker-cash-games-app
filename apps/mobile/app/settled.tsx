import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, settle, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { useNight } from '../src/lib/nightStore';

/**
 * Night settled — E6. What a night looks like once it is over.
 *
 * The record, not a receipt: three figures across the top, then everyone's net
 * AFTER deductions, each on a wash of its own colour. This is the screen a
 * player opens three weeks later to check what they remember, so it says
 * everything that is true of the night, including a shortfall the host
 * confirmed rather than quietly leaving that out.
 */
export default function Settled() {
  const t = useTheme();
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
        ...(night.acknowledgement ? { acknowledgedDiscrepancy: night.acknowledgement } : {}),
      });
    } catch {
      return null;
    }
  }, [night]);

  if (night === null) return <Screen title="The night" backTo="The group">{null}</Screen>;

  const ledger = resolveLedger(night.entries);

  if (result === null) {
    return (
      <Screen
        title="Not settled"
        backTo="The group"
        lede="This night was never closed. Count everyone up and settle it to see the record."
        footer={
          <Button
            label="Open the night"
            variant="primary"
            onPress={() => router.replace('/session')}
          />
        }
      >
        {null}
      </Screen>
    );
  }

  const net = [...result.players].sort((a, b) => b.finalPosition - a.finalPosition);
  const started = new Date(night.startedAt);

  return (
    <Screen
      title={started.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
      backTo="The group"
      meta={`${clock(night.startedAt)} · ${night.players.length} players · settled`}
      footer={<Button label="Done" variant="secondary" onPress={() => router.dismissTo('/')} />}
    >
      <View style={[styles.strip, { borderColor: t.hairline }]}>
        <Stat value={formatMoney(ledger.totalBoughtIn)} label="through the table" />
        <Stat value={String(ledger.entries.length)} label="entries" />
        <Stat value={formatMoney(result.totalOffTable)} label="off the table" />
      </View>

      {night.acknowledgement !== undefined && (
        <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
          <Text style={[styles.alertLabel, { color: t.danger }]}>
            Closed {formatMoney(Math.abs(night.acknowledgement.amount) as Money)} out
          </Text>
          <Text style={[styles.alertBody, { color: t.text }]}>
            The count did not add up and the host confirmed it. The difference is carried by
            “Unaccounted” below rather than spread quietly across everyone.
          </Text>
        </View>
      )}

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Net, after deductions</Text>

        {net.map((p) => (
          <View
            key={p.playerId}
            style={[
              styles.row,
              {
                backgroundColor:
                  p.finalPosition > 0 ? t.winWash : p.finalPosition < 0 ? t.lossWash : 'transparent',
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>
                in {formatMoney(p.boughtIn)} · out {formatMoney(p.endedWith)}
                {p.charged > 0 ? ` · paid ${formatMoney(p.charged)}` : ''}
                {p.credited > 0 ? ` · back ${formatMoney(p.credited)}` : ''}
              </Text>
            </View>
            <Text style={[styles.figure, { color: moneyColor(t, p.finalPosition) }]}>
              {formatSigned(p.finalPosition)}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginHorizontal: space.page,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, paddingVertical: 14, gap: 3 },
  statValue: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.88, textTransform: 'uppercase' },

  alert: {
    marginHorizontal: space.card,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: { ...type.label },
  alertBody: { fontSize: 13, fontWeight: '400', lineHeight: 19 },

  list: { marginTop: 12, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    marginBottom: 3,
    borderRadius: radius.pressable,
  },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: { ...type.rowDetail },
  figure: { ...type.feedFigure, marginLeft: 'auto' },
});
