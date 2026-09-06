import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  granularityOf,
  settle,
  transfersInWords,
  type Money,
  type RoundingMode,
} from '@poker-club/core';
import {
  formatMoney,
  formatSigned,
  roundingChoices,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { setClubRounding, useClub } from '../src/lib/clubStore';
import { settlementInput, setNightRounding, useNight } from '../src/lib/nightStore';
import { useIsAdmin } from '../src/lib/whoIsReading';

/**
 * Rounding — the step the night settles at.
 *
 * REBUILT 31 AUGUST from `design/handoff-E2/docs/E2-rounding.md`, and CHANGED
 * AGAIN ON 2 SEPTEMBER — the second change puts back what the first one took
 * away. This sheet once said, at length, under a heading reading *What it does
 * not touch*, that the step reached "nothing anybody counted… a chip count is a
 * chip count". The addendum reversed that and snapped the stacks. It is true
 * again: nothing here touches a count. What the step lands is the final
 * POSITIONS, apportioned across every party at once so that they still sum to
 * zero — no remainder, nothing for the piggy bank to absorb, and no screen
 * printing a figure another screen disagrees with.
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
  const { scope, from } = useLocalSearchParams<{
    scope?: 'club' | 'night';
    /**
     * WHICH SCREEN OPENED IT, and it changes what the four rows say about
     * themselves. E2 is counting stacks, so a step is worth knowing as the worst
     * distortion it puts on one stack; E4 has already counted them and is about
     * to hand over cash, so a step is worth knowing as what it costs the piggy
     * bank and how many payments it leaves. Frames `5a`–`5d` and `4a`–`4d` draw
     * the two, and the sheet is the same sheet either way — only the sub-lines
     * and the paragraph differ. E2 is the default: it owns the setting.
     */
    from?: 'count' | 'settle';
  }>();
  const forClub = scope === 'club';
  const atSettle = !forClub && from === 'settle';

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

  /* What has been counted so far, for the `Off` row's own sub-line. */
  const counts = night?.finalCounts ?? new Map<string, Money>();
  const rawTotal = [...counts.values()].reduce((a, b) => (a + b) as Money, 0 as Money);

  /*
   * AND WHAT THE STEP WOULD COST THE ROOM, which is E4's question — frame `4b`,
   * "each step also states how many transfers it leaves".
   *
   * IT IS A WHOLE RE-SETTLE PER ROW, four of them, and that is the only honest
   * way to answer it: what the piggy bank ends up with and the number of
   * payments are both downstream of every rule and of the matching that pairs
   * debtors with creditors. Working either out here would be a second
   * implementation of `settle()` with nothing checking it. Four settles of a
   * six-player night is arithmetic on a few dozen integers — the engine is pure,
   * and this sheet is not a screen anybody scrolls.
   *
   * WHAT IT NO LONGER SAYS IS THE REMAINDER — B36. This line used to read
   * `+$16 to the piggy bank`, the money the step invented and the tin funded.
   * The step redistributes the positions now and leaves nothing over, so there
   * is no remainder to name; what a step changes about the tin is its TOTAL,
   * and that is what each row states.
   */
  const atStep = (mode: RoundingMode): ReturnType<typeof settle> | null => {
    if (night === null) return null;
    try {
      return settle({ ...settlementInput(night), roundingMode: mode });
    } catch {
      /* A night that does not balance has no transfers to count yet. The row
         still offers the step; it just cannot say what it would cost. */
      return null;
    }
  };

  function subline(mode: RoundingMode): string | null {
    if (forClub) return null;
    const step = granularityOf(mode);

    if (atSettle) {
      const at = atStep(mode);
      if (at === null) return null;
      const transfers = transfersInWords(at.transfers.length);
      /* The tin's own total at this step, which since B36 is exactly what it
         receives — no remainder rides on top of it. A night with no piggy-bank
         rule says nothing about one. */
      const piggy = at.deductions.find((d) => d.destination === 'kitty');
      const tin = piggy === undefined ? '' : ` · piggy bank ${formatMoney(piggy.total)}`;
      return (step === 1 ? 'Nets to the dollar' : `Nets land on ${formatMoney(step as Money)}`) +
        tin +
        ` · ${transfers}`;
    }

    /*
     * AND ON E2, WHAT THE STEP GUARANTEES rather than what it measured.
     *
     * It used to be the worst single stack, recomputed on every render, and it
     * had to be: the old rule snapped each stack on its own, so what a step
     * would do depended on which stacks had been counted — half way through a
     * count the sheet could only answer for the half it had. The step lands the
     * positions now, and the apportionment hands anybody at most one, so the
     * worst case is a fact about the step: at the nearest $10 nobody's net moves
     * by more than $9, ever, and the sheet can say so before a stack is in.
     *
     * ⚠ THE DRAWN COPY SAYS STACKS, AND IS NOT TAKEN. Both the addendum and
     * the 6 September cut write these as `No stack moves by more than ₾3`.
     * Under the positions rule no stack moves at all, so the sheet would be
     * quoting a distortion it does not apply while hiding the one it does.
     * Recorded in `docs/screens.md`; it is a deviation, not an oversight.
     */
    if (step === 1) {
      /* Short enough to survive the reader's text cap with a nine-digit night
         in it: the long form ran 329 points into a 281-point row at 120%. */
      return counts.size === 0
        ? 'To the dollar'
        : `To the dollar · ${formatMoney(rawTotal)} so far`;
    }
    /* Money is whole units, so the tight bound is one under the step. */
    return `No net moves by more than ${formatMoney((step - 1) as Money)}`;
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
          : atSettle
            ? AT_SETTLE
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
 * Body copy — the 31 August paragraph with the half that is no longer true
 * replaced, and `design/handoff-game-end/`'s own second paragraph for the
 * settle-up form of the sheet.
 *
 * ⚠ THE HALF THAT WAS REPLACED IS THE ONLY ONE. Both the addendum and the
 * 6 September cut open with *"stacks snap to the step as they are entered"*,
 * and this app has not snapped a stack since 2 September: the step lands the
 * POSITIONS, apportioned so they still sum to zero, and `finalCounts` is never
 * rewritten. A sheet that told a host their count was about to be rounded would
 * be describing the rule this repo removed, in the one place a host goes to
 * decide whether to use it. B36 and B44.
 *
 * The rest is the doc's, including the sentence about what is kept underneath,
 * which is the one that answers the question the old sheet spent three blocks
 * on — and which is MORE true now, not less.
 */
const BODY =
  'Set it here and it governs the whole night: every position lands on the step, and the ' +
  'transfers follow. Nothing rewrites a count — what was counted is kept underneath. ' +
  'Changeable until the night is closed.';

/**
 * The same paragraph as the settle-up screens ask for it — `2a`'s, cut
 * 6 September, and it replaces frame `4b`'s.
 *
 * `4b`'s ended *"the difference goes to the piggy bank"*, which was the
 * remainder rule: the old stack rounding left one, and the tin absorbed it.
 * There has been no remainder since 2 September — the apportionment leaves
 * nothing over — so that sentence had the sheet promising the piggy bank money
 * the settlement was never going to hand it. The new cut's paragraph says what
 * this sheet actually does from here, and carries the same clause about the
 * count being kept.
 */
const AT_SETTLE =
  'Changing the step here recomputes the transfers on screen. Nothing rewrites a count — ' +
  'what was counted is kept underneath. Changeable until the night is closed.';

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
