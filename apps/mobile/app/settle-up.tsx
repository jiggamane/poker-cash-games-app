import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Row } from '../src/components/Row';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { nameOf, settlement } from '../src/data/sampleNight';

/**
 * Settle up — the last of the three close steps.
 *
 * Every figure here comes from the settlement engine. Nothing on this screen
 * does arithmetic of its own; if a number looks wrong, the engine is wrong,
 * and there is a test for it.
 */
export default function SettleUp() {
  const t = useTheme();
  const { totalOffTable, deductions, players, transfers } = settlement;
  const payees = deductions.flatMap((d) => d.credits);

  return (
    <Screen
      title="Settle up"
      backTo="Count up"
      step="3 of 3"
      footer={
        <>
          <Button label="Confirm settlement" variant="primary" onPress={() => router.dismissTo('/')} />
          <Button label="Adjust" variant="secondary" />
        </>
      }
    >
      <Text style={[styles.label, { color: t.muted }]}>OFF THE TABLE</Text>
      <Text style={[styles.display, { color: t.text }]}>{formatMoney(totalOffTable)}</Text>
      <Text style={[styles.meta, { color: t.muted }]}>
        {formatMoney(totalOffTable)} leaves the table
        {payees.length > 0 ? ': ' : ''}
        {payees.map((c) => `${formatMoney(c.amount)} to ${nameOf(c.playerId)}`).join(', ')}
      </Text>

      <Text style={[styles.label, styles.section, { color: t.muted }]}>NIGHT’S NET</Text>
      <View>
        {players.map((p, i) => (
          <Row
            key={p.playerId}
            label={p.name}
            detail={p.boughtIn > 0 ? `in ${formatMoney(p.boughtIn)}` : 'collector'}
            amount={p.finalPosition}
            tone="result"
            last={i === players.length - 1}
          />
        ))}
      </View>

      <Text style={[styles.label, styles.section, { color: t.muted }]}>DEDUCTIONS</Text>
      <View>
        {deductions.map((d, i) => (
          <Row
            key={d.ruleId}
            label={d.name}
            detail={`to ${nameOf(d.credits[0]?.playerId ?? '')}`}
            amount={d.total}
            tone="offTable"
            last={i === deductions.length - 1}
          />
        ))}
      </View>

      <Text style={[styles.label, styles.section, { color: t.muted }]}>WHO PAYS WHOM</Text>
      <View>
        {transfers.map((tr, i) => (
          <Row
            key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`}
            label={`${nameOf(tr.fromPlayerId)}  →  ${nameOf(tr.toPlayerId)}`}
            amount={tr.amount}
            last={i === transfers.length - 1}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: type.label,
  section: { marginTop: space.section },
  display: { ...type.display, marginTop: 4 },
  meta: { ...type.meta, marginTop: 6 },
});
