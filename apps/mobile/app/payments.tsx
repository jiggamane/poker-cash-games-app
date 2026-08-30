import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, settle, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, setPaid, settlementInput, transferKey, useNight } from '../src/lib/nightStore';

/**
 * Who has paid — E7. 13-after-the-night.md.
 *
 * SETTLING AND PAYING ARE SEPARATE. The book closes at the table; the money
 * moves over the following week. So nothing on this screen changes the
 * night's result — a settled night stays settled whether or not any cash has
 * moved — and marking a payment is not a ledger entry.
 *
 * One row per transfer the settlement produced, with the state under the
 * names. A paid row keeps its place: the list is the whole week's business and
 * a row that vanished when it was finished would leave the host counting what
 * is left instead of reading it.
 *
 * THE WHOLE ROW IS THE TICK, AND IT GOES BOTH WAYS.
 *
 * A host clears this list standing in a doorway with a phone in one hand, four
 * transfers landing in the same two minutes. What that wants is a checklist:
 * one tap per row, anywhere on the row, and one tap back off when the tap was
 * the wrong row. The board draws the tap target as a `Mark paid` chip on the
 * right of a waiting row — the chip is still there and still says that, it is
 * simply no longer the only place the tap lands.
 *
 * NOTHING HERE IS REQUIRED. Not one figure, screen or state in this app reads
 * `paidAt`: the night is settled by its ledger and it stays settled whether
 * this list is untouched, half ticked, or ticked wrong. A host who settles in
 * cash at the table and never opens this screen has lost nothing, which is why
 * the ticks carry no warning, no prompt, no red, and no completion of any kind
 * — and why a paid row can go back to waiting with the same one tap that
 * marked it.
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
        {rows.map((r) => {
          const paid = r.paidAt !== undefined;
          const from = nameOf(night, r.fromPlayerId);
          const to = nameOf(night, r.toPlayerId);
          return (
            <Pressable
              key={r.key}
              /*
               * A checkbox, not a button, and it says so: a screen reader
               * announces the state it is in and that tapping changes it,
               * rather than announcing an action that sounds one-way.
               */
              accessibilityRole="checkbox"
              accessibilityState={{ checked: paid }}
              accessibilityLabel={`${from} to ${to}, ${formatMoney(r.amount)}, ${
                paid ? 'marked paid' : 'waiting'
              }`}
              accessibilityHint={
                paid ? 'Double tap to put it back to waiting.' : 'Double tap to mark it paid.'
              }
              onPress={() => void setPaid(r.fromPlayerId, r.toPlayerId, !paid)}
              style={({ pressed }) => [
                styles.row,
                /*
                 * The two states as drawn: a paid row is a washed block with
                 * no outline, a waiting one is an outline with no wash. The
                 * wash is the tick you can see from arm's length — the glyph
                 * on the right is the one you can see up close.
                 */
                paid
                  ? { backgroundColor: t.winWash }
                  : { borderWidth: 1, borderColor: t.hairline },
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <View style={styles.who}>
                <View style={styles.names}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {from}
                  </Text>
                  <Icon name="arrow" color={t.muted} />
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {to}
                  </Text>
                </View>
                <Text style={[styles.state, { color: t.muted }]}>
                  {r.paidAt === undefined ? 'waiting' : `marked paid ${clock(r.paidAt)}`}
                </Text>
              </View>

              {/* Green only once it has landed. A figure still owed is not a
                  win to anybody yet — it is a thing somebody has to remember. */}
              <Text style={[styles.amount, { color: paid ? t.win : t.text }]}>
                {formatMoney(r.amount)}
              </Text>

              {paid ? (
                /*
                 * ⚠ NOT DRAWN. E7 puts nothing at all on the right of a paid
                 * row, because in rev 18 a paid row could not be tapped. Once
                 * it can, the row needs to say so, and a filled tick is the
                 * one mark that reads as "this is done, and it is a control"
                 * without a word of invented copy. Flagged for the designer
                 * rather than passed off as decided.
                 */
                <View style={[styles.tick, { backgroundColor: t.win }]}>
                  <Icon name="check" color={t.ground} size={14} />
                </View>
              ) : (
                <View style={[styles.mark, { borderColor: t.outline }]}>
                  <Text style={[styles.markLabel, { color: t.text }]}>Mark paid</Text>
                </View>
              )}
            </Pressable>
          );
        })}

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

  /*
   * A row is the block E7 draws, not a hairline-separated line: radius 8,
   * `16px 10px`, gap 12, and 8 between one row and the next. The block is what
   * lets a paid row carry a wash — a hairline list has nothing to fill.
   *
   * `alignItems: center` and nothing fixed about the height: the names may run
   * to two lines under large text and the row grows with them.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: radius.pressable,
  },
  who: { flexShrink: 1, gap: 3 },
  names: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: type.rowName,
  state: type.meta,
  // Never shrinks. The names either side of it may wrap; a figure may not.
  amount: { ...type.rowName, marginLeft: 'auto', flexShrink: 0 },

  /* The waiting row's chip, as drawn: 700 13, `9px 12px`, radius 6, 1.5px. */
  mark: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  markLabel: { fontSize: 13, fontWeight: '700' },

  /* The tick that replaces it, at the height of the chip's own glyph box. */
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  none: { ...type.footnote, paddingHorizontal: 8, paddingTop: 14 },

  foot: { gap: 14 },
  owed: { ...type.meta, textAlign: 'center' },
});
