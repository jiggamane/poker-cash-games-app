import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { type Money, type PlayerId } from '@poker-club/core';
import { formatMoney } from '../lib/money';
import { Card, CardRow, SectionLabel } from './Card';
import { Icon } from './Icon';
import { Pill } from './Pill';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

/** What this list needs of a spend. `nightStore`'s `Spend` satisfies it. */
export interface SpendLine {
  id: string;
  amount: Money;
  note: string;
  /** "21:48" — when it was stamped. */
  at: string;
  coveredBy: 'kitty' | 'unpaid' | null;
  fronters: ReadonlyArray<{ playerId: PlayerId; amount: Money }>;
}

/**
 * "Marek fronted it", "Marek and Dana fronted it", "the piggy bank paid".
 *
 * Exported because it was written twice — once on the bill and once here — and
 * `CLAUDE.md`'s rule about a screen adding up its own column is the same rule:
 * a sentence written twice is two sentences, and one of them gets fixed.
 */
export function frontedSentence(
  spend: SpendLine,
  nameFor: (id: PlayerId) => string,
): string {
  if (spend.coveredBy === 'kitty') return 'the piggy bank paid';
  if (spend.coveredBy === 'unpaid') return 'nobody has paid for it yet';

  const names = spend.fronters.map((f) => nameFor(f.playerId));
  if (names.length === 0) return 'nobody has paid for it yet';
  const list =
    names.length === 1
      ? names[0]!
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`;
  return `${list} fronted it`;
}

/**
 * WHAT THE NIGHT HAS SPENT, AND WHO PUT THE MONEY IN — on the screens where the
 * deductions themselves are settled.
 *
 * The bill was reachable from one place: the table's own drawer, while the game
 * is running. That is the wrong half of the night. The two moments a host is
 * actually looking at what comes off the table are tonight's money rules — O4,
 * opened from the table, from the deductions step and from settle-up — and E3
 * itself, with the count already in and the bill still arriving from the bar.
 * `11-bill-and-piggy-bank.md` says as much under "After the count": *"A spend
 * added during settle-up is allowed and recalculates every winner's share and
 * every transfer."* Until now it was allowed by the engine and unreachable from
 * the screen that shows the shares, so the host left the flow, found the table,
 * opened the drawer, opened the bill, and came back.
 *
 * A spend is an amount AND the person who covered it, which is why this opens
 * `/spend` rather than growing an amount field of its own: "Covered by" is four
 * cases with a sum rule on one of them, and a second implementation of it here
 * would be the second implementation that goes wrong. One row per spend so the
 * person who paid is on the screen and not one tap behind it.
 *
 * Every string here is L1's own, moved rather than invented: the caption,
 * "nothing added yet", the amber *unpaid* tag and the fronted line are what
 * the bill already says.
 *
 * THE FULL BOARD (`money-rules`, approved, is the first board to draw it): the
 * caption is the quiet section label with the total at its right, the spends
 * are one card whose rows lead with the time and carry no chevron — the same
 * rows `/bill` draws — and Add a spend is the outlined button with a plus. It
 * was a dashed card; the board draws `button('Add a spend', { icon: 'plus' })`,
 * because nothing in the look is dashed but a chip. Like `RuleList` it carries
 * the sheet's 20 side inset itself.
 */
export function SpendList({
  caption = 'The bill',
  total,
  spends,
  nameFor,
  canAdd = true,
}: {
  caption?: string;
  /** What is on the bill so far, off the ledger — nothing here adds it up. */
  total: Money;
  spends: readonly SpendLine[];
  nameFor: (id: PlayerId) => string;
  /** A power the reader does not have is removed, not disabled — 12 § 4.1. */
  canAdd?: boolean;
}) {
  const t = useTheme();
  const empty = spends.length === 0;

  return (
    <View style={styles.block}>
      <SectionLabel text={caption} right={formatMoney(total)} quiet />

      {empty ? (
        <Text style={[styles.empty, { color: t.muted }]}>
          Nothing added yet. Who pays it back is worked out at settle-up, never now.
        </Text>
      ) : (
        <Card>
          {spends.map((s, i) => (
            <CardRow
              key={s.id}
              last={i === spends.length - 1}
              onPress={() => router.push({ pathname: '/spend', params: { id: s.id } })}
              lead={<Text style={[styles.time, { color: t.muted }]}>{s.at}</Text>}
              /* An empty note is valid: the row is then the amount alone. */
              name={s.note === '' ? formatMoney(s.amount) : s.note}
              meta={frontedSentence(s, nameFor)}
              trail={s.coveredBy === 'unpaid' ? <Pill label="unpaid" tone="amber" /> : undefined}
              amount={formatMoney(s.amount)}
            />
          ))}
        </Card>
      )}

      {canAdd && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/spend')}
          style={({ pressed }) => [
            styles.add,
            { borderColor: t.outline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="plus" color={t.text} size={z(18)} />
          <Text style={[styles.addLabel, { color: t.text }]}>Add a spend</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginHorizontal: z(20), gap: z(12) },
  // The kit's `note()`: 13 / 1.45, muted.
  empty: { fontSize: z(13), lineHeight: z(18.85), marginHorizontal: z(2) },
  // As `/bill` leads its spend rows: 12.5 600, tabular, a fixed column.
  /* A floor, not a width: at 360 with 120% text "10:26" needs more than 38 and wrapped (ui-journeys, 27 Nov). */
  time: { minWidth: z(38), flexShrink: 0, fontSize: z(12.5), fontWeight: '600', fontVariant: ['tabular-nums'] },
  // The kit's `.btn2`: 48 tall, 14 round, a 1.5 outline, 700 15 in the title face.
  add: {
    height: z(48),
    borderRadius: z(14),
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(8),
  },
  addLabel: { fontFamily: 'head', fontSize: z(15), fontWeight: '700' },
});
