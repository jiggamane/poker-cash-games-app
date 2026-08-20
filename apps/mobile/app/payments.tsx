import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, settle, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { markPaid, nameOf, settlementInput, transferKey, useNight } from '../src/lib/nightStore';

/**
 * Who has paid — E7. 13-after-the-night.md.
 *
 * SETTLING AND PAYING ARE SEPARATE. The book closes at the table; the money
 * moves over the following week. So nothing on this screen changes the
 * night's result — a settled night stays settled whether or not any cash has
 * moved — and marking a payment is not a ledger entry.
 *
 * One row per transfer the settlement produced, with the state under the
 * names and Mark paid on waiting rows only. A paid row keeps its place: the
 * list is the whole week's business and a row that vanished when it was
 * finished would leave the host counting what is left instead of reading it.
 */
export default function Payments() {
  const t = useTheme();
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  if (night === null || result === null) {
    return (
      <Screen title="Who has paid" backTo="the night">
        {null}
      </Screen>
    );
  }

  const rows = result.transfers.map((tr) => ({
    ...tr,
    key: transferKey(tr.fromPlayerId, tr.toPlayerId),
    paidAt: night.paidAt.get(transferKey(tr.fromPlayerId, tr.toPlayerId)),
  }));

  const waiting = rows.filter((r) => r.paidAt === undefined);
  // Read off the transfers the engine produced, never re-derived from the
  // nets: two ways of arriving at "what is still owed" is one way too many.
  const owed = waiting.reduce((n, r) => n + r.amount, 0) as Money;
  const total = rows.reduce((n, r) => n + r.amount, 0) as Money;

  return (
    <Screen
      title="Who has paid"
      backTo="the night"
      lede="The night is closed and on the book. This list is just the money moving."
      footer={
        waiting.length === 0 ? undefined : (
          <View style={styles.foot}>
            <Text style={[styles.owed, { color: t.muted }]}>
              {formatMoney(owed)} of {formatMoney(total)} still owed
            </Text>
            <Button
              label="Nudge the table"
              variant="primary"
              onPress={() => router.push('/nudge')}
            />
          </View>
        )
      }
    >
      <View style={styles.list}>
        {rows.map((r, i) => (
          <View
            key={r.key}
            style={[
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.who}>
              <View style={styles.names}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {nameOf(night, r.fromPlayerId)}
                </Text>
                <Icon name="arrow" color={t.muted} />
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {nameOf(night, r.toPlayerId)}
                </Text>
              </View>
              <Text style={[styles.state, { color: t.muted }]}>
                {r.paidAt === undefined ? 'waiting' : `marked paid ${clock(r.paidAt)}`}
              </Text>
            </View>

            {/* Green only once it has landed. A figure still owed is not a
                win to anybody yet — it is a thing somebody has to remember. */}
            <Text
              style={[styles.amount, { color: r.paidAt === undefined ? t.text : t.win }]}
            >
              {formatMoney(r.amount)}
            </Text>

            {r.paidAt === undefined && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark ${nameOf(night, r.fromPlayerId)}'s payment to ${nameOf(
                  night,
                  r.toPlayerId,
                )} as paid`}
                onPress={() => void markPaid(r.fromPlayerId, r.toPlayerId)}
                style={({ pressed }) => [styles.mark, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.markLabel, { color: t.text }]}>Mark paid</Text>
              </Pressable>
            )}
          </View>
        ))}

        {rows.length === 0 && (
          <Text style={[styles.none, { color: t.muted }]}>
            Nothing to move: everyone left level.
          </Text>
        )}

        {rows.length > 0 && waiting.length === 0 && (
          <Text style={[styles.none, { color: t.muted }]}>
            Everyone has paid. Nothing left to chase.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 8,
  },
  who: { flexShrink: 1, gap: 3 },
  names: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: type.rowName,
  state: type.meta,
  amount: { ...type.rowName, marginLeft: 'auto' },
  mark: { paddingVertical: 6, paddingLeft: 12 },
  markLabel: { fontSize: 13, fontWeight: '700' },
  none: { ...type.footnote, paddingHorizontal: 8, paddingTop: 14 },

  foot: { gap: 14 },
  owed: { ...type.meta, textAlign: 'center' },
});
