import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Keypad } from '../src/components/Keypad';
import { Preset } from '../src/components/Preset';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure, space, tabular, type } from '../src/design/tokens';
import {
  backspaceClockDigits,
  checkEndTime,
  clockDigitsOf,
  dayFor,
  displayClock,
  endDays,
  endSpanLabel,
  endTimeAt,
  typeClockDigits,
  type EndDay,
} from '../src/lib/endTime';
import { setEndedAt, useNight } from '../src/lib/nightStore';

/**
 * End time — when the cards actually stopped.
 *
 * THE NIGHT THIS IS FOR. A night whose totals do not add up is not settled at
 * the table; everybody goes home and the host finishes it the next day. Until
 * B87 the app recorded that next day as the end of the game, because the only
 * thing that ever stamped `ended_at` was the close itself. Tapping End game
 * stamps the honest moment now, and this is where a host corrects it when even
 * that is wrong — the tap came late, or the night was counted a day after it
 * was played.
 *
 * A SHEET, BY DOC 09'S OWN TEST: it ends in a Save. So Chrome B — grabber,
 * close, swipe down — and it replaces nothing and pushes nowhere.
 *
 * TWO SCREENS OPEN IT AND THE SECOND ONE IS UNUSUAL. E2 Count up owns it, for
 * the same reason it owns the rounding bar: it is the screen where the night is
 * being finished, and the end time is a term of the night in the way the step
 * is. `/settled` opens it too — and that makes this the one thing in the app
 * that edits a night after it has closed. It is allowed because an end time is
 * not a figure: nothing recomputes from it, the frozen settlement beside it is
 * untouched, and the correction is the entire point of the feature. See
 * `setEndedAt` for what reaches the server, and when.
 *
 * ⚠ NO BOARD DRAWS THIS SHEET. Every string below was written for it and none
 * of them came from a handoff — which is the thing `CLAUDE.md` says to flag
 * rather than quietly decide. The geometry is borrowed from sheets that ARE
 * drawn: the figure and the pad are `/log`'s, the day chips are the preset row,
 * and the paragraph sets where every sheet's sub-line sets. `docs/screens.md`
 * carries the flag.
 */
export default function EndTime() {
  const t = useTheme();
  const night = useNight();

  /*
   * NOW IS TAKEN ONCE, when the sheet opens, and not read again.
   *
   * It decides two things — which days are on offer and where the future
   * starts — and both have to hold still while somebody types. A clock read at
   * render would let the day list grow under the thumb at midnight, and would
   * let a time typed at 08:59:58 be refused as the future by the render that
   * lands at 09:00:01. The sheet is open for seconds; the drift is not worth
   * the two faults.
   */
  const [now] = useState(() => Date.now());

  const days = useMemo(
    () => (night === null ? [] : endDays(night.startedAt, now, night.endedAt ?? null)),
    [night, now],
  );

  /* Prefilled from what the night already holds, which since the End game tap
     is nearly always something. A night with nothing stamped opens empty and
     the host types all four: no default is better than a plausible wrong one on
     the one screen whose job is to correct a plausible wrong one. */
  const [digits, setDigits] = useState(() =>
    night?.endedAt == null ? '' : clockDigitsOf(night.endedAt),
  );
  const [day, setDay] = useState<EndDay | null>(null);
  const [busy, setBusy] = useState(false);

  if (night === null) return <Sheet title="End time">{null}</Sheet>;

  /* The chosen day, or the one the night is already on — resolved here rather
     than seeded into state, because `days` is not built until the night is. */
  const chosen = day ?? (night.endedAt == null ? null : dayFor(days, night.endedAt));

  const check = checkEndTime({ startedAt: night.startedAt, day: chosen, digits, now });
  const preview = endTimeAt(chosen, digits);

  const save = async () => {
    if (!check.ok || busy) return;
    setBusy(true);
    await setEndedAt(check.at);
    router.back();
  };

  return (
    <Sheet
      title="End time"
      sub={
        night.status === 'settled'
          ? 'This night is settled. Changing when it ended moves no money — the result stands.'
          : 'When the cards stopped, not when the night was added up.'
      }
      sentence
      footer={
        <Button label="Save" variant="primary" disabled={!check.ok || busy} onPress={save} />
      }
    >
      <View style={styles.clockRow}>
        {/*
         * THE TYPED CLOCK, at the same weight `/log` gives a typed amount and
         * two steps down in size, because five characters do not need 68 and
         * this sheet has a day control and a pad to fit under it. It is muted
         * until it is a time, so a half-typed clock never looks like an answer.
         *
         * Tabular, so the figure does not shuffle sideways as the digits land.
         */}
        <Text
          {...cappedFigure}
          style={[styles.clock, { color: check.ok ? t.text : t.muted }]}
        >
          {displayClock(digits)}
        </Text>

        {/*
         * ONE LINE, THREE STATES, AND IT NEVER COLLAPSES. The span when the
         * time is good, the refusal when it is bad, and a blank holding the
         * height while it is neither — a line that appears and disappears
         * moves the pad under the thumb mid-type.
         *
         * THE SPAN IS THE CHECK A HOST CAN ACTUALLY MAKE. Two clocks a day
         * apart read exactly like two clocks in one evening; `31h 07m` does
         * not, and it is the term that catches the likeliest mistake here —
         * the right time left on the wrong day.
         */}
        <Text
          style={[
            styles.under,
            { color: check.reason == null ? (check.ok ? t.muted : 'transparent') : t.loss },
          ]}
          numberOfLines={2}
        >
          {check.reason ?? (preview === null ? ' ' : endSpanLabel(night.startedAt, preview))}
        </Text>
      </View>

      {/*
       * WHICH DAY, AND IT IS NOT OPTIONAL. The whole premise is a night that
       * crossed midnight and was finished after a sleep, so a clock alone does
       * not say which 03:12 — and the two readings are a day apart on the
       * figure that dates the night everywhere it is listed.
       *
       * The night's own day, the morning after, and today, deduplicated — so
       * the ordinary night settled before midnight draws one chip and the case
       * this was built for draws two or three. `endDays` never offers a day
       * that has not happened.
       */}
      <View style={styles.days}>
        {days.map((d) => (
          <Preset
            key={d.key}
            label={d.label}
            caption={d.startOfDay === days[0].startOfDay ? 'THE NIGHT' : 'LATER'}
            on={chosen?.key === d.key}
            onPress={() => setDay(d)}
          />
        ))}
      </View>

      {/*
       * THE APP'S OWN PAD, for `Keypad.tsx`'s reason: the system keyboard
       * would slide up over the figure being typed and the button that commits
       * it. The `00` key earns its place here — an hour on the hour is two
       * keystrokes.
       *
       * `typeClockDigits` is what a key MEANS against what is already there,
       * and it fills LEFT TO RIGHT rather than shifting in from the right the
       * way an amount does. See `endTime.ts`: an amount accumulates and a clock
       * does not.
       */}
      <Keypad
        onDigits={(d) => setDigits((current) => typeClockDigits(current, d))}
        onBackspace={() => setDigits(backspaceClockDigits)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  clockRow: { alignItems: 'center', paddingHorizontal: space.page, gap: 6, marginBottom: 14 },
  clock: { ...tabular, fontSize: 44, fontWeight: '600', letterSpacing: 1 },
  under: { ...type.meta, textAlign: 'center', minHeight: 18 },

  /* The preset row's own gap and edge. One to three chips, each `flex: 1`, so
     a single day fills the row rather than sitting in a corner of it. */
  days: { flexDirection: 'row', gap: 8, marginHorizontal: space.page, marginBottom: 16 },
});
