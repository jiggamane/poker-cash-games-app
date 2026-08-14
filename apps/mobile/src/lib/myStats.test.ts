import { describe, expect, it } from 'vitest';
import { money } from '@poker-club/core';
import {
  formatHours,
  formatSitting,
  inGroup,
  inPeriod,
  mostRecentFirst,
  periodTitle,
  summarise,
  type PlayedNight,
} from './myStats';

const night = (startedAt: string, net: number, group = 'The Poker Club'): PlayedNight => ({
  id: startedAt,
  startedAt,
  group,
  net: money(net),
  minutes: 240,
});

const NIGHTS: PlayedNight[] = [
  night('2026-07-12T20:00:00.000Z', -210),
  night('2026-07-19T20:00:00.000Z', 120, 'Office game'),
  night('2026-08-01T20:00:00.000Z', 315),
  night('2026-08-15T20:00:00.000Z', 540),
  night('2025-12-02T20:00:00.000Z', 90),
];

const NOW = new Date('2026-08-20T12:00:00.000Z');

describe('inPeriod', () => {
  it('counts this month by the calendar, not by the last thirty days', () => {
    expect(inPeriod(NIGHTS, 'month', NOW).map((n) => n.net)).toEqual([315, 540]);
  });

  it('keeps this year inside this year', () => {
    expect(inPeriod(NIGHTS, 'year', NOW)).toHaveLength(4);
  });

  it('takes everything for all time', () => {
    expect(inPeriod(NIGHTS, 'all', NOW)).toHaveLength(5);
  });
});

describe('inGroup', () => {
  it('filters to one group, or to none at all', () => {
    expect(inGroup(NIGHTS, 'Office game')).toHaveLength(1);
    expect(inGroup(NIGHTS, null)).toHaveLength(5);
  });
});

describe('summarise', () => {
  it('adds the nights up', () => {
    const s = summarise(inPeriod(NIGHTS, 'month', NOW));
    expect(s).toMatchObject({ net: 855, games: 2, won: 2, lost: 0, average: 428 });
  });

  it('counts a square night as neither won nor lost', () => {
    const s = summarise([night('2026-08-02T20:00:00.000Z', 0)]);
    expect(s).toMatchObject({ won: 0, lost: 0, net: 0 });
  });

  it('has nothing to say about no nights, and does not divide by zero', () => {
    expect(summarise([])).toMatchObject({ net: 0, games: 0, average: 0 });
  });
});

describe('mostRecentFirst', () => {
  it('puts the latest night at the top without mutating the input', () => {
    const sorted = mostRecentFirst(NIGHTS);
    expect(sorted[0].startedAt).toBe('2026-08-15T20:00:00.000Z');
    expect(NIGHTS[0].startedAt).toBe('2026-07-12T20:00:00.000Z');
  });
});

describe('periodTitle', () => {
  it('names the month, numbers the year, and says all time', () => {
    expect(periodTitle('month', NOW)).toBe('August');
    expect(periodTitle('year', NOW)).toBe('2026');
    expect(periodTitle('all', NOW)).toBe('All time');
  });
});

describe('time', () => {
  it('rounds a total to hours and keeps one night to the minute', () => {
    expect(formatHours(1_500)).toBe('25 h');
    expect(formatSitting(260)).toBe('4 h 20');
    expect(formatSitting(180)).toBe('3 h 00');
  });
});
