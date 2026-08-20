/**
 * One list of people, in four places.
 *
 * These are the rules that keep the roster, the night, the book on the server
 * and every screen showing the same names. Each of them is here because the
 * app was doing something else: a pull that filled nothing, a bench drawn off
 * the night instead of the group, a "same person" test that only ever compared
 * ids.
 */

import { describe, expect, it } from 'vitest';
import { benchFor, clubForBook, rosterAdditions, sameName } from './rosterMerge';

const BOOK = 'b0000000-0000-0000-0000-000000000001';
const OTHER_BOOK = 'b0000000-0000-0000-0000-000000000002';

describe('matching a book to a club on this phone', () => {
  it('takes the club already stamped with that book, whatever it is called', () => {
    const clubs = [
      { id: 'c1', bookId: null, name: 'The poker club' },
      { id: 'c2', bookId: BOOK, name: 'Renamed since' },
    ];
    expect(clubForBook(clubs, { id: BOOK, groupName: 'The poker club' })).toBe('c2');
  });

  it('takes an unstamped club by name — the host, whose club came first', () => {
    const clubs = [{ id: 'c1', bookId: null, name: '  the POKER club ' }];
    expect(clubForBook(clubs, { id: BOOK, groupName: 'The poker club' })).toBe('c1');
  });

  it('never takes a club that belongs to another book, however it is named', () => {
    const clubs = [{ id: 'c1', bookId: OTHER_BOOK, name: 'Friday' }];
    expect(clubForBook(clubs, { id: BOOK, groupName: 'Friday' })).toBeNull();
  });

  it('says so when there is nothing to match, so a club gets made', () => {
    expect(clubForBook([], { id: BOOK, groupName: 'Friday' })).toBeNull();
  });
});

describe('what a pull adds to the roster', () => {
  const known = [
    { id: 'p1', name: 'Marek' },
    { id: 'p2', name: 'Dana' },
  ];

  it('adds the people this phone has never heard of', () => {
    expect(rosterAdditions(known, [...known, { id: 'p3', name: 'Ivo' }])).toEqual([
      { id: 'p3', name: 'Ivo' },
    ]);
  });

  it('never renames somebody it already has — names travel the other way', () => {
    expect(rosterAdditions(known, [{ id: 'p1', name: 'Marek K.' }])).toEqual([]);
  });

  it('does not add a second row for a name the roster already carries', () => {
    // The host's own club was seeded on the phone with its own ids; the book
    // holds the same humans under the ids the queue sent up.
    expect(rosterAdditions(known, [{ id: 'server-marek', name: ' marek ' }])).toEqual([]);
  });

  it('does not add the same newcomer twice when the book lists them twice', () => {
    const twice = [
      { id: 'p3', name: 'Ivo' },
      { id: 'p4', name: 'Ivo' },
    ];
    expect(rosterAdditions(known, twice)).toEqual([{ id: 'p3', name: 'Ivo' }]);
  });
});

describe('the bench on the seat sheet', () => {
  const members = [
    { id: 'p1', name: 'Marek' },
    { id: 'p2', name: 'Dana' },
    { id: 'p3', name: 'Ivo' },
  ];

  it('is the roster, minus whoever has money on the table', () => {
    const bench = benchFor({
      members,
      nightPlayers: [{ id: 'p1', name: 'Marek' }],
      playing: new Set(['p1']),
    });
    expect(bench.map((p) => p.name)).toEqual(['Dana', 'Ivo']);
  });

  it('shows a player added to the group between nights — the whole point', () => {
    // Nobody is in the night but Marek. Dana was added on GR4 this morning and
    // would have been invisible on the one screen that exists to seat her.
    const bench = benchFor({
      members,
      nightPlayers: [{ id: 'p1', name: 'Marek' }],
      playing: new Set(),
    });
    expect(bench.map((p) => p.name)).toEqual(['Marek', 'Dana', 'Ivo']);
  });

  it('still shows somebody the night has and the roster does not', () => {
    const bench = benchFor({
      members,
      nightPlayers: [{ id: 'old', name: 'Kuba' }],
      playing: new Set(),
    });
    expect(bench.map((p) => p.name)).toContain('Kuba');
  });

  it('shows one chip when the night and the roster hold the same person twice', () => {
    const bench = benchFor({
      members,
      nightPlayers: [{ id: 'old-dana', name: 'dana' }],
      playing: new Set(),
    });
    expect(bench.filter((p) => sameName(p.name, 'Dana'))).toHaveLength(1);
  });
});
