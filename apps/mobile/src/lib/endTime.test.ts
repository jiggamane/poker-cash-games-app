import { describe, expect, it } from 'vitest';
import {
  backspaceClockDigits,
  checkEndTime,
  clockDigitsOf,
  dayFor,
  displayClock,
  endDays,
  endSpanLabel,
  endTimeAt,
  endedRowLabel,
  endedRowValue,
  parseClock,
  typeClockDigits,
} from './endTime';

/**
 * B87 — the end time a night recorded was the moment the host tapped Settle.
 *
 * EVERY DATE HERE IS BUILT LOCAL, never from an ISO literal with a `Z` on it.
 * The thing under test is a wall clock and a calendar day in the phone's own
 * zone, so a test that pinned UTC would pass in London and fail in Tbilisi —
 * which is where this app is actually used. `local()` is the whole trick.
 */

const local = (y: number, m: number, d: number, h = 0, min = 0): number =>
  new Date(y, m - 1, d, h, min, 0, 0).getTime();

const iso = (ms: number): string => new Date(ms).toISOString();

/** A night that began at 20:05 on Friday 18 September 2026. */
const STARTED = iso(local(2026, 9, 18, 20, 5));

describe('the days a night could have ended on', () => {
  it('offers the night and the morning after, while it is still that morning', () => {
    const days = endDays(STARTED, local(2026, 9, 19, 9, 0));
    expect(days.map((d) => d.key)).toEqual(['2026-09-18', '2026-09-19']);
  });

  it('is one day for a night settled before midnight', () => {
    const days = endDays(STARTED, local(2026, 9, 18, 23, 40));
    expect(days.map((d) => d.key)).toEqual(['2026-09-18']);
  });

  /* The case the whole feature is for: the totals did not add up, everybody
     went to bed, and the host came back to it. */
  it('adds today when the host comes back days later', () => {
    const days = endDays(STARTED, local(2026, 9, 21, 14, 30));
    expect(days.map((d) => d.key)).toEqual(['2026-09-18', '2026-09-19', '2026-09-21']);
  });

  it('never offers a day that has not happened', () => {
    for (const d of endDays(STARTED, local(2026, 9, 18, 23, 40))) {
      expect(d.startOfDay).toBeLessThanOrEqual(local(2026, 9, 18));
    }
  });

  it('draws no day twice when today is the morning after', () => {
    const keys = endDays(STARTED, local(2026, 9, 19, 9, 0)).map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /* A night left open for days has a stamp from none of the three, and the
     sheet has to be able to show the day it is already on. */
  it('always offers the day already recorded', () => {
    const recorded = iso(local(2026, 9, 19, 3, 12));
    const days = endDays(STARTED, local(2026, 9, 25, 14, 0), recorded);
    expect(days.map((d) => d.key)).toContain('2026-09-19');
    expect(dayFor(days, recorded)?.key).toBe('2026-09-19');
  });

  it('does not draw the recorded day twice when it is already offered', () => {
    const recorded = iso(local(2026, 9, 18, 23, 40));
    const keys = endDays(STARTED, local(2026, 9, 19, 9, 0), recorded).map((d) => d.key);
    expect(keys).toEqual(['2026-09-18', '2026-09-19']);
  });

  it('finds the day a stamp belongs to, and none for one outside them', () => {
    const days = endDays(STARTED, local(2026, 9, 19, 9, 0));
    expect(dayFor(days, iso(local(2026, 9, 19, 3, 12)))?.key).toBe('2026-09-19');
    expect(dayFor(days, iso(local(2026, 9, 25, 3, 12)))).toBeNull();
  });
});

describe('typing a clock', () => {
  it('fills left to right and stops at four', () => {
    let d = '';
    for (const key of ['0', '3', '1', '2', '9']) d = typeClockDigits(d, key);
    expect(d).toBe('0312');
  });

  /* The pad's `00` key sends two digits at once, which is the key a host
     reaches for typing an hour on the hour. */
  it('takes the pad’s double zero as two digits', () => {
    expect(typeClockDigits('23', '00')).toBe('2300');
  });

  it('never runs past four even on a double zero', () => {
    expect(typeClockDigits('231', '00')).toBe('2310');
  });

  it('backspaces one at a time and survives an empty field', () => {
    expect(backspaceClockDigits('0312')).toBe('031');
    expect(backspaceClockDigits('')).toBe('');
  });

  it('shows what is missing rather than a plausible time', () => {
    expect(displayClock('')).toBe('––:––');
    expect(displayClock('2')).toBe('2–:––');
    expect(displayClock('031')).toBe('03:1–');
    expect(displayClock('0312')).toBe('03:12');
  });

  it('is not a value until all four are in', () => {
    expect(parseClock('031')).toBeNull();
    expect(parseClock('0312')).toEqual({ hours: 3, minutes: 12 });
  });

  /* Refused, not clamped. A clamp records 23:59 for a night the host mistyped
     and says nothing about it. */
  it('refuses four digits that are not a clock', () => {
    expect(parseClock('2561')).toBeNull();
    expect(parseClock('2400')).toBeNull();
    expect(parseClock('0060')).toBeNull();
    expect(parseClock('2359')).toEqual({ hours: 23, minutes: 59 });
    expect(parseClock('0000')).toEqual({ hours: 0, minutes: 0 });
  });

  it('reads a stamp back as the digits that would have typed it', () => {
    expect(clockDigitsOf(iso(local(2026, 9, 19, 3, 12)))).toBe('0312');
    expect(clockDigitsOf(iso(local(2026, 9, 19, 23, 5)))).toBe('2305');
  });
});

describe('the stamp a day and a clock make', () => {
  it('lands on the chosen day at the typed time', () => {
    const [, morning] = endDays(STARTED, local(2026, 9, 19, 9, 0));
    expect(endTimeAt(morning, '0312')).toBe(iso(local(2026, 9, 19, 3, 12)));
  });

  /* The same four digits under the two days are twenty-four hours apart, which
     is the ambiguity the day control exists to remove. */
  it('is a different moment under each day', () => {
    const [night, morning] = endDays(STARTED, local(2026, 9, 19, 9, 0));
    expect(endTimeAt(night, '2312')).toBe(iso(local(2026, 9, 18, 23, 12)));
    expect(endTimeAt(morning, '2312')).toBe(iso(local(2026, 9, 19, 23, 12)));
  });

  it('is nothing without a day or without four digits', () => {
    const [night] = endDays(STARTED, local(2026, 9, 19, 9, 0));
    expect(endTimeAt(null, '0312')).toBeNull();
    expect(endTimeAt(night, '03')).toBeNull();
  });
});

describe('what can be saved', () => {
  const NOW = local(2026, 9, 19, 9, 0);
  const days = endDays(STARTED, NOW);
  const [night, morning] = days;

  it('takes the night that ended in the small hours', () => {
    const check = checkEndTime({ startedAt: STARTED, day: morning, digits: '0312', now: NOW });
    expect(check).toEqual({ ok: true, at: iso(local(2026, 9, 19, 3, 12)), reason: null });
  });

  /* The likeliest mistake in the flow: the right clock, the wrong day. */
  it('refuses a time before the night started, and says when it started', () => {
    const check = checkEndTime({ startedAt: STARTED, day: night, digits: '0312', now: NOW });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('cannot have ended before');
    expect(check.at).toBeNull();
  });

  it('refuses a time in the future', () => {
    const check = checkEndTime({ startedAt: STARTED, day: morning, digits: '2300', now: NOW });
    expect(check).toEqual({ ok: false, at: null, reason: 'That is in the future.' });
  });

  /* The current minute is now, not the future: the clock being typed on has no
     seconds, so the host typing 09:00 at 09:00:30 means now. */
  it('takes the minute it is being typed in', () => {
    const check = checkEndTime({ startedAt: STARTED, day: morning, digits: '0900', now: NOW + 30_000 });
    expect(check.ok).toBe(true);
  });

  it('takes the moment the night started, and nothing before it', () => {
    const atStart = checkEndTime({ startedAt: STARTED, day: night, digits: '2005', now: NOW });
    expect(atStart.ok).toBe(true);
    const before = checkEndTime({ startedAt: STARTED, day: night, digits: '2004', now: NOW });
    expect(before.ok).toBe(false);
  });

  it('says nothing at all while the clock is half typed', () => {
    const check = checkEndTime({ startedAt: STARTED, day: morning, digits: '03', now: NOW });
    expect(check).toEqual({ ok: false, at: null, reason: null });
  });
});

describe('what the host is told they are recording', () => {
  it('spells out the span so a wrong day is visible before it is saved', () => {
    expect(endSpanLabel(STARTED, iso(local(2026, 9, 19, 3, 12)))).toBe('20:05 → 03:12 · 7h 07m');
  });

  /* A day out reads as a day out, rather than as an identical pair of clocks. */
  it('shows a day-out choice as a day-long night', () => {
    expect(endSpanLabel(STARTED, iso(local(2026, 9, 20, 3, 12)))).toBe('20:05 → 03:12 · 31h 07m');
  });

  it('drops the length when there is none to speak of', () => {
    expect(endSpanLabel(STARTED, STARTED)).toBe('20:05 → 20:05');
  });
});

describe('the row that opens the sheet', () => {
  it('says a night has no end time rather than drawing a blank', () => {
    expect(endedRowLabel(null)).toBe('Ended · not set');
    expect(endedRowLabel(undefined)).toBe('Ended · not set');
    expect(endedRowValue(STARTED, null)).toBe('tap to set');
  });

  /* The month is matched loosely on purpose. `toLocaleDateString` is the
     engine's, and en-GB's short September is "Sep" on some ICU builds and
     "Sept" on others — Node here says "Sept", Hermes on a phone may not. What
     this test is about is that the date is drawn at all, and only when the day
     differs; pinning the glyph would fail on a machine rather than on a bug. */
  it('names the day only when it is not the night’s own', () => {
    expect(endedRowLabel(iso(local(2026, 9, 18, 23, 40)))).toBe('Ended · 23:40');
    expect(endedRowValue(STARTED, iso(local(2026, 9, 18, 23, 40)))).toBe('same night');
    expect(endedRowValue(STARTED, iso(local(2026, 9, 19, 3, 12)))).toMatch(/^Sat 19 Sept?$/);
  });
});
