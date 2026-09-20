import { clockLabel, elapsedLabel } from './elapsed';

/**
 * When the cards stopped, typed by hand.
 *
 * WHY THIS EXISTS. `night.endedAt` is meant to be the moment the game ended,
 * and `closing.ts` says so in as many words — *"the night ENDED when counting
 * started, not when the host finally tapped through the settlement"*. The
 * function that stamps it, `setStatus('counting')`, was never called by
 * anything but a test, so the fallback in `closeOf` — `night.endedAt ?? at` —
 * was not a safety net but the only path. Every night recorded the moment the
 * host tapped Settle. B87.
 *
 * Tapping End game stamps the honest default now. This file is the other half:
 * a night that does not add up is left open and finished the next day, and on
 * that next day the default is wrong by however long the argument took. The
 * host types the real one in.
 *
 * IT IS A DAY AND A TIME, NEVER A TIME ALONE. The whole premise is a night that
 * crossed midnight and was settled after a sleep, so `03:12` on its own does
 * not say which 03:12 — and the difference between the two readings is
 * twenty-four hours on a figure that dates the night in Sessions, on the home
 * card and in the book.
 *
 * NO MONEY HAPPENS HERE, which is why it is not in `packages/core`. An end time
 * moves no figure: it is a header column, and the settlement it sits beside is
 * frozen against exactly this kind of after-the-fact edit. What it does move is
 * every screen that dates the night, so it is pure and it is tested.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * 60 * 1000;

/** A day the night could plausibly have ended on. */
export interface EndDay {
  /** `2026-09-19`, local. Stable across renders, and what the control keys on. */
  key: string;
  /** "Fri 19 Sep" — the same short form the settled night titles itself with. */
  label: string;
  /** Midnight at the head of that day, local, in ms. */
  startOfDay: number;
}

/** Midnight at the head of whatever day `ms` falls in, in the phone's own zone. */
const midnight = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** `2026-09-19`, local rather than UTC — `toISOString` would shift the day. */
const dayKey = (ms: number): string => {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

const dayLabel = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const dayOf = (ms: number): EndDay => ({
  key: dayKey(ms),
  label: dayLabel(ms),
  startOfDay: midnight(ms),
});

/**
 * The days on offer, oldest first.
 *
 * THREE AT MOST, AND USUALLY TWO. The night's own date, the morning after it,
 * and today — which is the same as one of the first two on the ordinary night
 * that is settled while it is still fresh, and a third only when the host has
 * come back to it later. Deduplicated, so the control never draws one day
 * twice.
 *
 * NOTHING AFTER TODAY. A night cannot have ended tomorrow, and offering the day
 * after the night started when that day has not happened yet is offering a
 * refusal — `checkEndTime` would reject every time typed under it, which is a
 * control that exists to be disappointing.
 *
 * NOTHING BEFORE THE NIGHT STARTED, by the same reading in the other
 * direction: `midnight(startedAt)` is the earliest day here, so the only
 * invalid time left to catch is one earlier in the start's own day.
 *
 * EXCEPT THE DAY ALREADY RECORDED, WHICH IS ALWAYS ON OFFER. A night left open
 * for a week has an `endedAt` from the day counting began, and that day is
 * none of the three above — so without this the sheet would open on the time
 * it currently holds with no day selected under it, and the host would have to
 * move the night to a different day in order to save the one it is already on.
 * A control that cannot express the current value is a control that quietly
 * changes it.
 */
export function endDays(startedAt: string, now: number, endedAt?: string | null): EndDay[] {
  const start = midnight(new Date(startedAt).getTime());
  const today = midnight(now);

  /* `start + DAY` lands on the next day everywhere except across a daylight
     saving change, where it is 23 or 25 hours and can land on the same day or
     skip one. `midnight` of it is the correct day either way, which is why the
     arithmetic is done in ms and then normalised rather than by adding one to
     the date. */
  const candidates = [start, midnight(start + DAY), today];
  if (endedAt != null) candidates.push(midnight(new Date(endedAt).getTime()));

  const seen = new Set<string>();
  return candidates
    .filter((ms) => ms <= today)
    .map(dayOf)
    .filter((d) => (seen.has(d.key) ? false : (seen.add(d.key), true)))
    .sort((a, b) => a.startOfDay - b.startOfDay);
}

/** Which of `endDays` a stamp falls in, or null when it is none of them. */
export function dayFor(days: readonly EndDay[], at: string): EndDay | null {
  const key = dayKey(new Date(at).getTime());
  return days.find((d) => d.key === key) ?? null;
}

/**
 * The four digits of a wall clock, as they are typed.
 *
 * LEFT TO RIGHT, WHICH IS NOT WHAT THE MONEY PAD DOES, and the difference is
 * deliberate. An amount accumulates — a digit multiplies what is already there
 * by ten — so `typedAmount.ts` shifts in from the right and every intermediate
 * state is a smaller amount, which is true. A clock does not accumulate: the
 * first digit is the tens of the hour and stays the tens of the hour. Shifting
 * from the right would make the second keystroke of `23:12` read `00:02`, a
 * time the host never typed and might not notice replacing the one they meant.
 *
 * So the intermediate states are incomplete rather than wrong — `2–:––` — and
 * nothing is a value until all four are in.
 */
export const MAX_CLOCK_DIGITS = 4;

export const typeClockDigits = (current: string, pressed: string): string =>
  (current + pressed.replace(/\D/g, '')).slice(0, MAX_CLOCK_DIGITS);

export const backspaceClockDigits = (current: string): string => current.slice(0, -1);

/** `0312` — a stamp as the four digits that would have typed it. */
export const clockDigitsOf = (at: string): string => clockLabel(at).replace(':', '');

/**
 * `03:12` while it is complete, `3–:––` while it is not.
 *
 * The placeholder is an en dash rather than a zero so a half-typed clock can
 * never be misread as a whole one, and there are always five characters so the
 * figure does not jump about under the thumb as it fills.
 */
export function displayClock(digits: string): string {
  const filled = digits.padEnd(MAX_CLOCK_DIGITS, '–');
  return `${filled.slice(0, 2)}:${filled.slice(2)}`;
}

/** The hour and the minute, or null while the four digits are not a clock. */
export function parseClock(digits: string): { hours: number; minutes: number } | null {
  if (!/^\d{4}$/.test(digits)) return null;

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2));

  // 25:61 is four digits and is not a time. Refused here rather than clamped:
  // a clamp would silently record 23:59 for a night that ended at some hour
  // the host mistyped, and a wrong time recorded confidently is the fault this
  // whole file is about.
  return hours > 23 || minutes > 59 ? null : { hours, minutes };
}

/** The stamp a day and four digits make, or null while they do not make one. */
export function endTimeAt(day: EndDay | null, digits: string): string | null {
  const clock = parseClock(digits);
  if (day === null || clock === null) return null;

  const d = new Date(day.startOfDay);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    clock.hours,
    clock.minutes,
    0,
    0,
  ).toISOString();
}

/** Whether a typed end time can be saved, and what is wrong with it if not. */
export type EndTimeCheck =
  /**
   * Complete, and a time this night could have ended at.
   *
   * `reason` is present and null rather than absent, so the caller can read it
   * off the union without first narrowing. The sheet draws one line whose
   * content depends on all three states, and a field that only exists in two
   * of them makes that line three branches instead of one.
   */
  | { ok: true; at: string; reason: null }
  /** Not four digits yet, or not a clock. Save is dead and nothing is said. */
  | { ok: false; at: null; reason: null }
  /** A real time that this night cannot have ended at. Say which way. */
  | { ok: false; at: null; reason: string };

/**
 * The two ways a complete time is still wrong.
 *
 * BEFORE THE NIGHT STARTED, which is the one the day control cannot prevent:
 * the night's own day is on offer, and 03:12 on it is nine hours before a game
 * that began at 20:05. It is also the likeliest mistake in the whole flow — the
 * host types the right clock and leaves the day on the default.
 *
 * IN THE FUTURE, which is a mistyped hour rather than a mistaken day, since
 * `endDays` offers nothing after today.
 *
 * AN INCOMPLETE CLOCK SAYS NOTHING. A host two digits into typing is not making
 * a mistake, and a sheet that starts complaining before the input is finished
 * teaches people to ignore it.
 */
export function checkEndTime(args: {
  startedAt: string;
  day: EndDay | null;
  digits: string;
  now: number;
}): EndTimeCheck {
  const at = endTimeAt(args.day, args.digits);
  if (at === null) return { ok: false, at: null, reason: null };

  const ms = new Date(at).getTime();
  const started = new Date(args.startedAt).getTime();

  if (ms < started) {
    return {
      ok: false,
      at: null,
      reason: `The night started at ${clockLabel(args.startedAt)}. It cannot have ended before that.`,
    };
  }

  /* To the minute, not to the millisecond: the clock this is typed on has no
     seconds, so a time in the current minute is "now" and not the future. */
  if (ms > args.now + MINUTE) {
    return { ok: false, at: null, reason: 'That is in the future.' };
  }

  return { ok: true, at, reason: null };
}

/**
 * `20:05 → 03:12 · 7h 07m` — what the host is about to record, spelled out.
 *
 * THE SPAN IS THE POINT OF SHOWING IT. Two clocks a day apart look identical to
 * two clocks in the same evening, and the third term is the only thing on the
 * sheet that tells them apart — a host who leaves the day on the default sees
 * `31h 07m` and knows before saving rather than after.
 *
 * `elapsedLabel` rather than a second copy of the arithmetic, read with the end
 * where it usually reads the clock. Under a minute it answers in words, which
 * is right for a live night and wrong for a span, so a span that short is drawn
 * as the two times alone.
 */
export function endSpanLabel(startedAt: string, endedAt: string): string {
  const span = `${clockLabel(startedAt)} → ${clockLabel(endedAt)}`;
  const length = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return length < MINUTE ? span : `${span} · ${elapsedLabel(startedAt, new Date(endedAt).getTime())}`;
}

/**
 * The row that opens this sheet, on E2 and on the settled night.
 *
 * `Ended · 03:12` beside `Rounding · nearest $10`, because they are the same
 * kind of fact about the night and the row that carries one should carry the
 * other. A night with nothing stamped yet says so rather than drawing a blank:
 * on E2 that is every night until End game was tapped.
 */
export const endedRowLabel = (endedAt: string | null | undefined): string =>
  `Ended · ${endedAt == null ? 'not set' : clockLabel(endedAt)}`;

/**
 * The right-hand half of that row: which day, when it is not the obvious one.
 *
 * A night that ended on the day after it started is the case this whole feature
 * exists for, and a bare `03:12` is exactly as ambiguous on the row as it is in
 * the sheet. The date is drawn only when it differs from the night's own, so an
 * ordinary night settled before midnight is not made to carry a term that tells
 * it nothing.
 */
export function endedRowValue(startedAt: string, endedAt: string | null | undefined): string {
  if (endedAt == null) return 'tap to set';
  return dayKey(new Date(endedAt).getTime()) === dayKey(new Date(startedAt).getTime())
    ? 'same night'
    : dayLabel(new Date(endedAt).getTime());
}
