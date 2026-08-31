import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  granularityOf,
  stackRounding,
  type Money,
  type RoundingMode,
} from '@poker-club/core';
import {
  formatMoney,
  roundingChoices,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { setClubRounding, useClub } from '../src/lib/clubStore';
import { setNightRounding, useNight } from '../src/lib/nightStore';
import { useIsAdmin } from '../src/lib/whoIsReading';

/**
 * Rounding — the step the night settles at.
 *
 * REBUILT 31 AUGUST from `design/handoff-E2/docs/E2-rounding.md`, and what
 * changed is what the setting DOES. It used to reach one thing: how coarsely a
 * RULE DIVIDES, so a bill share came out at $60 rather than $56. This sheet
 * said as much, at length, under a heading reading *What it does not touch* —
 * "nothing anybody counted… a chip count is a chip count". The addendum
 * reverses exactly that: the stacks snap to the step as they are entered, the
 * nets and the transfers follow, and the difference goes to the piggy bank.
 *
 * The old objection was the right objection. Rounding a count invents or
 * destroys money, and six nets rounded independently sum to something the table
 * has not got. The answer is that the difference is computed ONCE, named, and
 * given somewhere to go — see `stacks.ts`, and rule 5 of the addendum, which
 * allows it exactly one destination.
 *
 * WHY IT IS STILL ONE SETTING. The step is `RoundingMode`, the same value that
 * has always been snapshotted onto the night, and it still governs the rule
 * divisions as well. A table settling in fifties wants both, and two controls
 * both called Rounding meaning different things is how an interface starts
 * disagreeing with itself.
 *
 * WHERE IT IS REACHED FROM. E2 owns it — "rounding changes what a stack is
 * worth, so it has to be decided where stacks are entered" — and E4 and E6 show
 * the same row and open this same sheet. The game's own settings still reach it
 * before the first stack is counted, which is a decision of 30 August that
 * fixed a real fault (a group playing for thousands played the first hand on
 * whole dollars) and which the addendum's own open item 1 asks about rather
 * than forbids. The club scope is that default, one level up.
 */
export default function Rounding() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  const admin = useIsAdmin();
  const { scope } = useLocalSearchParams<{ scope?: 'club' | 'night' }>();
  const forClub = scope === 'club';

  const current: RoundingMode | null = forClub
    ? (club?.roundingMode ?? null)
    : (night?.roundingMode ?? null);

  const [picked, setPicked] = useState<RoundingMode | null>(null);
  const [busy, setBusy] = useState(false);
  const choice: RoundingMode = picked ?? current ?? 'dollars';

  if (night === null && !forClub) return <Sheet title="Rounding">{null}</Sheet>;

  /*
   * LOCKED ONCE THE NIGHT IS CLOSED — rule 8. Every figure on a settled night
   * was derived at the step it closed with, and a record that could be
   * re-rounded afterwards is a record that does not say what anybody paid.
   */
  const closed = !forClub && night !== null && night.status === 'settled';

  /*
   * WHAT THE STEP WOULD COST, off the engine rather than off a formula written
   * here. The sub-line under each row is the WORST SINGLE STACK, not an
   * average: it is the figure an admin gets asked about at the table, and an
   * average answers a question nobody asks. Recomputed on every entry, which
   * here means every render, because `stackRounding` is pure and cheap.
   */
  const counts = night?.finalCounts ?? new Map<string, Money>();
  const nothingCounted = counts.size === 0;
  const rawTotal = [...counts.values()].reduce((a, b) => (a + b) as Money, 0 as Money);

  function subline(mode: RoundingMode): string | null {
    if (forClub) return null;
    if (nothingCounted) return 'No stacks counted yet';
    if (granularityOf(mode) === 1) {
      return `Stacks as counted · ${formatMoney(rawTotal)} so far`;
    }
    return `No stack moves by more than ${formatMoney(
      stackRounding(counts, granularityOf(mode)).worst,
    )}`;
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const mode = choice === 'dollars' ? null : choice;
      if (forClub && club !== null) await setClubRounding(club.id, mode);
      else await setNightRounding(mode);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  /* A power the reader does not have is removed, not disabled. */
  if (!admin || closed) {
    return (
      <Sheet
        title="Rounding"
        sub={rowLabel(current)}
        footer={<Button label="Close" variant="secondary" onPress={() => router.back()} />}
      >
        <Text style={[styles.body, { color: t.muted }]}>{BODY}</Text>
        <Text style={[styles.body, { color: t.muted }]}>
          {closed
            ? /* ⚠ NOT DRAWN. The addendum says only "locked once the night is
                 closed"; no frame shows the sheet in that state. Written to the
                 grammar of the sentence above it. */
              'This night is closed. What it settled at is part of the record now.'
            : 'Only the person who runs the group can change it.'}
        </Text>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Rounding"
      badge="admin only"
      footer={
        <Button
          label="Apply"
          variant="primary"
          disabled={busy}
          onPress={() => void save()}
        />
      }
    >
      {/* Body copy, verbatim from the addendum. */}
      <Text style={[styles.body, { color: t.muted }]}>
        {forClub
          ? 'The group’s default. A night copies it when it opens, so this reaches the next game and never the one being played.'
          : BODY}
      </Text>

      <View style={styles.rows}>
        {roundingChoices().map((c) => {
          const on = c.mode === choice;
          const sub = subline(c.mode);

          return (
            <Pressable
              key={c.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={c.chip}
              onPress={() => setPicked(c.mode)}
              style={({ pressed }) => [
                styles.row,
                { borderTopColor: t.hairline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: t.text }]}>{c.chip}</Text>
                {sub !== null && (
                  <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>
                    {sub}
                  </Text>
                )}
              </View>
              {/* A CHECK, NOT A FILL AND NOT A RADIO — the addendum says so, and
                  it is the mark this app already uses for a settled thing. */}
              {on && <Icon name="check" color={t.text} size={18} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/**
 * Body copy, verbatim (`E2-rounding.md`, "The sheet").
 *
 * Copy is final. The one word that is not the doc's is none: this is the
 * paragraph as written, and the sentence about what is kept underneath is the
 * one that answers the question the old sheet spent three blocks on.
 */
const BODY =
  'Set it here and it governs the whole night: stacks snap to the step as they are entered, ' +
  'and the nets and transfers follow. What was counted is kept underneath. Changeable until ' +
  'the night is closed.';

/** "Rounding · nearest $10", for the sub-line of a sheet that cannot change it. */
const rowLabel = (mode: RoundingMode | null): string =>
  granularityOf(mode) === 1 ? 'Off' : `Nearest $${granularityOf(mode).toLocaleString('en-US')}`;

const styles = StyleSheet.create({
  body: {
    ...type.rowDetail,
    lineHeight: 20,
    marginHorizontal: space.page,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  rows: { marginTop: 10, marginHorizontal: space.page },
  /* One rule above each, so the four read as a list rather than as four
     objects — the sheet's own edges close the block top and bottom. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { gap: 2, flexShrink: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 12.5, fontWeight: '400', fontVariant: ['tabular-nums'] },
});
