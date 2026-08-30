import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, type Money, type PlayerId } from '@poker-club/core';
import { Icon } from './Icon';
import { Pill } from './Pill';
import { useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';

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
 * ⚠ COPY NOT DRAWN. No board puts the bill on O4 or on E3. Every string here is
 * L1's own, moved rather than invented: the caption, "nothing added yet", the
 * amber *unpaid* tag and the fronted line are what the bill already says.
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
    <>
      <View style={styles.captionRow}>
        <Text style={[styles.caption, { color: t.muted }]}>{caption}</Text>
        <Text style={[styles.captionValue, { color: empty ? t.muted : t.text }]}>
          {formatMoney(total)}
        </Text>
      </View>

      <View style={styles.list}>
        {empty ? (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nothing added yet. Who pays it back is worked out at settle-up, never now.
          </Text>
        ) : (
          spends.map((s, i) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/spend', params: { id: s.id } })}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === spends.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>{s.at}</Text>
              <View style={styles.rowText}>
                {/* An empty note is valid: the row is then the amount alone. */}
                <Text style={[styles.note, { color: t.text }]} numberOfLines={1}>
                  {s.note === '' ? formatMoney(s.amount) : s.note}
                </Text>
                <Text style={[styles.fronted, { color: t.muted }]} numberOfLines={1}>
                  {frontedSentence(s, nameFor)}
                </Text>
              </View>
              {s.coveredBy === 'unpaid' && <Pill label="unpaid" tone="amber" />}
              <Text style={[styles.amount, { color: t.text }]}>{formatMoney(s.amount)}</Text>
              <Icon name="chevron" color={t.muted} />
            </Pressable>
          ))
        )}
      </View>

      {canAdd && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/spend')}
          style={({ pressed }) => [
            styles.add,
            { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="plus" color={t.text} />
          <Text style={[styles.addLabel, { color: t.text }]}>Add a spend</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  captionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 18,
    marginHorizontal: space.page,
    marginBottom: 2,
  },
  caption: type.sectionLabel,
  captionValue: {
    marginLeft: 'auto',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  list: { marginHorizontal: space.page },
  empty: { ...type.footnote, paddingHorizontal: 4, paddingVertical: 10 },
  // A spend is a transfer-height row on L1, not a feed-height one: 15, not 13.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  time: { ...type.time, width: 44 },
  rowText: { gap: 2, flexShrink: 1 },
  note: type.entryType,
  fronted: type.entryProvenance,
  amount: { ...type.entryAmount, marginLeft: 'auto' },

  /* The dashed add, same object as the one that starts a rule on the house
     rules — the two things a host adds to the money off the table. */
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 10,
    marginHorizontal: space.page,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addLabel: { fontSize: 15, fontWeight: '700' },
});
