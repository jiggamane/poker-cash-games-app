import { describe, expect, it } from 'vitest';
import { elapsedLabel, msUntilNextLabelChange } from './elapsed';

/**
 * The running time is the live tag (S51), so this figure is the whole of the
 * app's claim that a night is happening. It shipped frozen — computed once per
 * render on two screens that nothing re-rendered on a clock — and the tests
 * that matter here are the ones about it moving.
 */

const START = '2026-08-16T20:05:00.000Z';
const at = (ms: number) => new Date(START).getTime() + ms;
const MINUTE = 60_000;

describe('the elapsed label', () => {
  it('reads the way both screens draw it', () => {
    expect(elapsedLabel(START, at(17 * MINUTE))).toBe('0h 17m');
    expect(elapsedLabel(START, at(3 * 60 * MINUTE + 17 * MINUTE))).toBe('3h 17m');
  });

  it('says the night is open rather than showing a clock at zero', () => {
    // "0h 00m" under a green dot reads as a stopped clock, which is the one
    // thing the tag must not say. The word holds for the whole first minute.
    expect(elapsedLabel(START, at(0))).toBe('just opened');
    expect(elapsedLabel(START, at(45_000))).toBe('just opened');
    expect(elapsedLabel(START, at(MINUTE))).toBe('0h 01m');
  });

  it('switches to days past 99 hours', () => {
    // A night left open over a weekend. Four figures of hours is not a
    // duration anybody reads.
    expect(elapsedLabel(START, at(99 * 60 * MINUTE))).toBe('99h 00m');
    expect(elapsedLabel(START, at(100 * 60 * MINUTE))).toBe('4d 04h');
    expect(elapsedLabel(START, at(100 * 60 * MINUTE + 30 * MINUTE))).toBe('4d 04h');
    expect(elapsedLabel(START, at(120 * 60 * MINUTE))).toBe('5d 00h');
  });

  it('pads the minutes so the figure does not change width', () => {
    // "3h 7m" beside "3h 17m" would shift the row every ten minutes.
    expect(elapsedLabel(START, at(60 * MINUTE + 7 * MINUTE))).toBe('1h 07m');
  });

  it('never goes negative on a clock that disagrees with the night', () => {
    // Phone clocks are wrong, and a night started on another device carries
    // that device's timestamp. "-1h 59m" beside a green dot is not a state.
    expect(elapsedLabel(START, at(-5 * MINUTE))).toBe('just opened');
  });

  it('rolls over into hours', () => {
    expect(elapsedLabel(START, at(59 * MINUTE))).toBe('0h 59m');
    expect(elapsedLabel(START, at(60 * MINUTE))).toBe('1h 00m');
  });
});

describe('when the label next changes', () => {
  it('waits to the exact moment the label changes', () => {
    // The first minute is the word "just opened", so the next thing to show
    // arrives when that minute is up.
    expect(msUntilNextLabelChange(START, at(0))).toBe(MINUTE);
    expect(msUntilNextLabelChange(START, at(29_000))).toBe(31_000);
    expect(msUntilNextLabelChange(START, at(59_000))).toBe(1_000);

    // After it, the label rounds, so it flips at 90s, 150s… not on the minute.
    expect(msUntilNextLabelChange(START, at(61_000))).toBe(29_000);
    expect(msUntilNextLabelChange(START, at(89_000))).toBe(1_000);
  });

  it('never schedules a zero-delay timer', () => {
    // A boundary landing exactly on now would otherwise spin the event loop.
    expect(msUntilNextLabelChange(START, at(30_000))).toBe(30_000);
    expect(msUntilNextLabelChange(START, at(90_000))).toBe(MINUTE);
  });

  it('always waits a whole number of milliseconds inside one minute', () => {
    for (let ms = 0; ms < 5 * MINUTE; ms += 137) {
      const wait = msUntilNextLabelChange(START, at(ms));
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(MINUTE);
    }
  });

  it('lands on a moment where the label really has changed', () => {
    // The point of the whole exercise: wake up exactly when there is something
    // new to show, and find something new to show.
    for (let ms = 0; ms < 4 * 60 * MINUTE; ms += 9_973) {
      const before = elapsedLabel(START, at(ms));
      const after = elapsedLabel(START, at(ms + msUntilNextLabelChange(START, at(ms))));
      expect(after).not.toBe(before);
    }
  });

  it('copes with a start time in the future', () => {
    // Same wrong-clock case as above; the timer must still be sane.
    const wait = msUntilNextLabelChange(START, at(-5 * MINUTE));
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(MINUTE);
  });
});
