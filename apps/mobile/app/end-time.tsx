import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Card, CardRow } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { cappedFigure } from '../src/design/tokens';
import { clockLabel, elapsedLabel } from '../src/lib/elapsed';
import {
  backspaceClockDigits,
  checkEndTime,
  clockDigitsOf,
  displayClock,
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
 * THE FULL BOARD DRAWS IT NOW (`end-time`, `end-time-empty`, approved; the
 * owner, 25 November: the end is stamped by itself, and this sheet only
 * corrects it). Started and Ended are two rows in a card, the day is a field
 * that opens the month in the same sheet, the time is typed on the pad into
 * the field beside it, and Save is the bar. The day chips it replaces were the
 * preset row. Strings the board did not draw are still this app's own, and
 * `docs/screens.md` carries the flag for them.
 */
export default function EndTime() {
  const t = useTheme();
  const night = useNight();

  /*
   * NOW IS TAKEN ONCE, when the sheet opens, and not read again.
   *
   * It decides two things — which days are on offer and where the future
   * starts — and both have to hold still while somebody types. A clock read at
   * render would let the calendar's last day move under the thumb at midnight,
   * and would let a time typed at 08:59:58 be refused as the future by the
   * render that lands at 09:00:01. The sheet is open for seconds; the drift is
   * not worth the two faults.
   */
  const [now] = useState(() => Date.now());

  /*
   * WHAT HAS BEEN TYPED, OR NOTHING YET — and the null is load-bearing.
   *
   * The prefill is what the night already holds, which since the End game tap
   * is nearly always something. It is DERIVED at render rather than seeded into
   * state, because `useNight` answers null until the store has opened the night
   * and a `useState` initialiser runs once: on a cold start the sheet would
   * seed itself empty from the null and then never pick the stamp up, so the
   * screen whose whole job is to correct a time would open having silently
   * discarded the one it was correcting.
   *
   * A night with nothing stamped opens empty and the host types all four. No
   * default is better than a plausible wrong one here.
   */
  const [typed, setTyped] = useState<string | null>(null);
  const [day, setDay] = useState<EndDay | null>(null);
  const [busy, setBusy] = useState(false);
  /*
   * THE SECOND STEP OF THE ONE SHEET: the month (`end-time-empty`). Its own
   * pick is held apart from `day` until the bar says Use, so stepping back
   * with the circle leaves the day the time step had.
   */
  const [step, setStep] = useState<'time' | 'day'>('time');
  const [pending, setPending] = useState<EndDay | null>(null);
  const [month, setMonth] = useState<{ year: number; month: number } | null>(null);

  if (night === null) return <Sheet title="End time">{null}</Sheet>;

  const digits = typed ?? (night.endedAt == null ? '' : clockDigitsOf(night.endedAt));

  /* The chosen day, or the one the night is already on — resolved here rather
     than seeded into state, because the night is not here on the first render. */
  const chosen = day ?? (night.endedAt == null ? null : dayAt(new Date(night.endedAt).getTime()));

  const check = checkEndTime({ startedAt: night.startedAt, day: chosen, digits, now });
  const preview = endTimeAt(chosen, digits);

  /*
   * WHICH DAYS CAN BE PICKED: from the night's own day to today. `endDays`
   * gave three chips by the same two bounds — nothing after today, which would
   * be offering a refusal, and nothing before the night began, which
   * `checkEndTime` would refuse whatever time was typed under it.
   */
  const firstDay = midnightOf(new Date(night.startedAt).getTime());
  const lastDay = midnightOf(now);

  const save = async () => {
    if (!check.ok || busy) return;
    setBusy(true);
    await setEndedAt(check.at);
    router.back();
  };

  const openCalendar = () => {
    const at = chosen ?? dayAt(firstDay);
    const d = new Date(at.startOfDay);
    setPending(at);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
    setStep('day');
  };

  if (step === 'day' && month !== null) {
    const view = new Date(month.year, month.month, 1);
    const first = new Date(firstDay);
    const last = new Date(lastDay);
    const canBack = view > new Date(first.getFullYear(), first.getMonth(), 1);
    const canOn = view < new Date(last.getFullYear(), last.getMonth(), 1);
    const shift = (by: number) => {
      const d = new Date(month.year, month.month + by, 1);
      setMonth({ year: d.getFullYear(), month: d.getMonth() });
    };
    const cells = monthCells(month.year, month.month);
    const startKey = dayAt(firstDay).key;

    return (
      <Sheet
        title="The day it ended"
        sub={`Started ${dayAt(firstDay).label} · ${clockLabel(night.startedAt)}`}
        onBack={() => setStep('time')}
        bar={[
          {
            label: pending === null ? 'Use' : `Use ${pending.label}`,
            disabled: pending === null,
            onPress: () => {
              if (pending === null) return;
              setDay(pending);
              setStep('time');
            },
          },
        ]}
      >
        <View style={styles.body}>
          <View style={styles.monthRow}>
            <Text style={[styles.month, { color: t.text }]}>
              {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.monthNav}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                disabled={!canBack}
                hitSlop={10}
                onPress={() => shift(-1)}
                style={styles.flip}
              >
                <Icon name="chevron" color={canBack ? t.muted : t.dim} size={z(16)} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                disabled={!canOn}
                hitSlop={10}
                onPress={() => shift(1)}
              >
                <Icon name="chevron" color={canOn ? t.muted : t.dim} size={z(16)} />
              </Pressable>
            </View>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`w${i}`} style={[styles.weekday, { color: t.muted }]}>
                {w}
              </Text>
            ))}
            {cells.map((ms, i) => {
              if (ms === null) return <View key={`b${i}`} style={styles.cell} />;
              const d = dayAt(ms);
              const open = ms >= firstDay && ms <= lastDay;
              const on = pending?.key === d.key;
              /* The night's start is marked so a wrong day is caught; on the
                 board it is also the day picked, and filled. Picked elsewhere,
                 it keeps a ring. */
              const start = d.key === startKey;
              return (
                <Pressable
                  key={d.key}
                  accessibilityRole="button"
                  accessibilityLabel={d.label}
                  accessibilityState={{ selected: on, disabled: !open }}
                  disabled={!open}
                  onPress={() => setPending(d)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayDot,
                      on
                        ? { backgroundColor: t.text }
                        : start
                          ? { borderWidth: 1.5, borderColor: t.outline }
                          : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        on && styles.dayNumOn,
                        { color: on ? t.onFill : open ? t.text : t.dim },
                      ]}
                    >
                      {new Date(ms).getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="End time"
      sub={
        night.status === 'settled'
          ? 'This night is settled. Changing when it ended moves no money — the result stands.'
          : night.endedAt != null
            ? /* The board's words for a stamped night (`end-time`, owner 25
                 November: the end is stamped when the night is ended). */
              'Stamped when the night was ended. Change it if the cards stopped earlier.'
            : 'When the cards stopped, not when the night was added up.'
      }
      sentence
      bar={[{ label: 'Save', disabled: !check.ok || busy, onPress: () => void save() }]}
    >
      <View style={styles.body}>
        {/*
         * THE SPAN IS THE CHECK A HOST CAN ACTUALLY MAKE. Two clocks a day
         * apart read exactly like two clocks in one evening; `31h 07m` does
         * not, and it is the term that catches the likeliest mistake here —
         * the right time left on the wrong day. It is the Ended row's value
         * now, beside the start it is measured from.
         */}
        <Card>
          <CardRow
            name="Started"
            value={`${dayAt(firstDay).label} · ${clockLabel(night.startedAt)}`}
          />
          <CardRow
            name="Ended"
            value={preview === null ? displayClock(digits) : endedValue(night.startedAt, preview)}
            last
          />
        </Card>

        <View style={styles.fields}>
          {/*
           * WHICH DAY, AND IT IS NOT OPTIONAL. The whole premise is a night
           * that crossed midnight and was finished after a sleep, so a clock
           * alone does not say which 03:12 — and the two readings are a day
           * apart on the figure that dates the night everywhere it is listed.
           */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={chosen === null ? 'The day it ended' : `The day it ended, ${chosen.label}`}
            onPress={openCalendar}
            style={({ pressed }) => [
              styles.field,
              styles.dayField,
              { backgroundColor: t.surface, borderColor: t.outline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.dayLabel, { color: t.text }]} numberOfLines={1}>
              {chosen?.label ?? ''}
            </Text>
            <Icon name="calendar" color={t.muted} size={z(18)} />
          </Pressable>

          {/*
           * THE TYPED CLOCK, in the field the pad types into — always the
           * focused one, so it carries the 2-point ring. Muted until it is a
           * time, so a half-typed clock never looks like an answer. Tabular, so
           * the figure does not shuffle sideways as the digits land.
           */}
          <View style={[styles.field, styles.timeField, { backgroundColor: t.surface, borderColor: t.text }]}>
            <Text {...cappedFigure} style={[styles.clock, { color: check.ok ? t.text : t.muted }]}>
              {displayClock(digits)}
            </Text>
          </View>
        </View>

        {/*
         * THE REFUSAL, AND IT NEVER COLLAPSES. Empty while the time is good
         * or half typed, the reason when it is a real time this night cannot
         * have ended at — and the height held either way, because a line that
         * appears and disappears moves the pad under the thumb mid-type. Not
         * drawn on the board, which draws only the good state.
         */}
        <Text style={[styles.reason, { color: t.loss }]} numberOfLines={2}>
          {check.reason ?? ' '}
        </Text>

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
        <View style={styles.pad}>
          <Keypad
            onDigits={(d) => setTyped(typeClockDigits(digits, d))}
            onBackspace={() => setTyped(backspaceClockDigits(digits))}
          />
        </View>
      </View>
    </Sheet>
  );
}

/** The calendar's head, Monday first, as the board draws it. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MINUTE = 60_000;

/** Midnight at the head of whatever day `ms` falls in, in the phone's own zone. */
const midnightOf = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/**
 * Any day as `endTime.ts` describes one — the same key and the same "Fri 20
 * Nov" it builds for its own offers. It is built here because the calendar can
 * offer any day, and `endTime.ts` exports only the three-day `endDays`.
 */
function dayAt(ms: number): EndDay {
  const d = new Date(midnightOf(ms));
  const two = (n: number) => String(n).padStart(2, '0');
  return {
    key: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`,
    label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    startOfDay: d.getTime(),
  };
}

/** A month laid out Monday first: blanks for the days before the 1st, then every day. */
function monthCells(year: number, month: number): (number | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(year, month, i + 1).getTime()),
  ];
}

/** "17:23 · 3h 16m" — the end and how long the night ran. `endSpanLabel` without the start, which is the row above. */
function endedValue(startedAt: string, endedAt: string): string {
  const length = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const clock = clockLabel(endedAt);
  return length < MINUTE ? clock : `${clock} · ${elapsedLabel(startedAt, new Date(endedAt).getTime())}`;
}

/* The kit at this phone's scale (`design/scale.ts`). */
const styles = StyleSheet.create({
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },

  fields: { flexDirection: 'row', gap: z(10) },
  /* The kit's `.fi`: 48 tall, 12 corners, a 1.5 outline; `.focus` is a 2 in the text colour. */
  field: {
    minHeight: z(48),
    borderRadius: L.fieldRadius,
    paddingHorizontal: z(14),
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayField: { flex: 1, borderWidth: 1.5, justifyContent: 'space-between', gap: z(8) },
  dayLabel: { fontSize: z(15), fontWeight: '600', flexShrink: 1 },
  timeField: { width: z(110), borderWidth: 2, justifyContent: 'center' },
  clock: { fontFamily: 'head', fontSize: z(20), fontWeight: '700', fontVariant: ['tabular-nums'] },

  reason: { fontSize: z(12.5), fontWeight: '500', lineHeight: z(17), minHeight: z(17), marginVertical: z(-6) },

  /** Out of the body's 20 so the pad's hairlines run to the sheet's edges. */
  pad: { marginHorizontal: z(-20) },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontFamily: 'head', fontSize: z(17), fontWeight: '700' },
  monthNav: { flexDirection: 'row', gap: z(14), alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: z(4) },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: z(11.5), fontWeight: '600', paddingBottom: z(6) },
  cell: { width: `${100 / 7}%`, height: z(34), alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: z(34), height: z(34), borderRadius: z(17), alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontFamily: 'head', fontSize: z(14), fontWeight: '500' },
  dayNumOn: { fontWeight: '700' },
});
