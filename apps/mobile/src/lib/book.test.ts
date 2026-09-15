import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expoSqlite, reset } from './testSqlite';

/**
 * WHOSE NIGHTS ARE IN THE BOOK.
 *
 * Sessions and My stats are the two screens a person's own history lives on,
 * and between them they answer one question: what have I played, and what did
 * it do to me. Two faults made that answer a fiction, and neither of them broke
 * anything a check could see.
 *
 * **B77 — the book was eight invented nights and at most one real one.**
 * `myNights()` took the single `Night` the store was holding and returned a
 * list of at most one, and both screens concatenated `SAMPLE_HISTORY` behind
 * it: eight nights, in two groups, with plausible durations and player counts,
 * none of which anybody had ever played. It was honest when it was written —
 * the phone held one night and the screen had to draw something — and it stayed
 * after `importNights` made the phone able to hold every night on the server.
 * So a host with nine games saw one of them, a member who claimed a seat and
 * pulled their whole book saw none of it, and the figures at the top of My
 * stats were about a fictional person.
 *
 * **B78 — a night pulled off the server had nobody's name on it.** `me_id` is
 * what makes a night yours, and it is stamped by `CLAIM_LIVE_NIGHTS`, which by
 * design never touches a night that is already settled. Every night arriving
 * from the server is settled before it lands. So the pull wrote the ledger, the
 * seats, the counts and the frozen settlement, and the reader whose history it
 * was could not be found in any of it — X2b promises a claimed player their
 * nights are already there, and they were, with no way to tell which figure was
 * theirs.
 *
 * Both are held here, against a real SQLite, through the real store: the seed
 * is laid down the way a first launch lays it down, and the nights arrive the
 * way the pull delivers them.
 */

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-sqlite', () => expoSqlite);
vi.mock('expo-crypto', () => ({ randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }));
// Reached through `clubStore` → `invites`, and nothing here makes a link.
vi.mock('expo-linking', () => ({ createURL: (p: string) => `pokerclub://${p}`, parse: () => ({}) }));
// Nothing here goes near a network: the book is read off the phone.
vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

const uuid = (n: number): string =>
  `0000${n.toString(16).padStart(4, '0')}-0000-4000-8000-000000000000`.slice(0, 36);

const DANA = uuid(2);
const IVO = uuid(3);
const CLUB = 'The Poker Club';

const store = () => import('./nightStore');

/**
 * A balanced night, as the pull hands one over: two players, $200 on the table,
 * $200 counted off it, and Dana $30 up.
 */
function nightFrom(
  sessionId: string,
  startedAt: string,
  over: Partial<Parameters<Awaited<ReturnType<typeof store>>['importNights']>[0][number]> = {},
) {
  return {
    sessionId,
    groupName: CLUB,
    startedAt,
    endedAt: startedAt.replace('T18:', 'T23:'),
    status: 'settled' as const,
    stakes: null,
    defaultBuyIn: 10_000,
    rules: [],
    players: [
      { id: DANA, name: 'Dana', atTable: true },
      { id: IVO, name: 'Ivo', atTable: true },
    ],
    entries: [
      {
        id: `${sessionId}-a`,
        seq: 1,
        type: 'buyin' as const,
        playerId: DANA,
        payerId: null,
        amount: 10_000 as never,
        correctsEntryId: null,
        occurredAt: startedAt,
        note: null,
      },
      {
        id: `${sessionId}-b`,
        seq: 2,
        type: 'buyin' as const,
        playerId: IVO,
        payerId: null,
        amount: 10_000 as never,
        correctsEntryId: null,
        occurredAt: startedAt,
        note: null,
      },
    ],
    counts: [
      { playerId: DANA, amount: 13_000 },
      { playerId: IVO, amount: 7_000 },
    ],
    ...over,
  };
}

beforeEach(() => {
  reset();
  vi.resetModules();
});

describe('a phone that has never played a night', () => {
  it('opens with an empty book, not with somebody else’s', async () => {
    const night = await store();

    // A first launch, which lays down the sample night. It is the app's only
    // demo data and the one night that never leaves the phone.
    const seeded = await night.openNight();
    expect(seeded.seeded).toBe(true);

    /*
     * AND THE BOOK IS EMPTY. This is B77's tripwire. Before, the same call
     * stood behind eight rows of `SAMPLE_HISTORY` — two groups this person has
     * never heard of, and a headline figure adding them up. The honest answer
     * to "what have I played" on a phone that has played nothing is nothing,
     * and both screens have an empty state saying exactly that.
     */
    expect(await night.readMyNights()).toEqual([]);
  });
});

describe('the nights the server sends back', () => {
  it('are in the book, with this reader’s own figure on them', async () => {
    const night = await store();
    await night.openNight();

    const added = await night.importNights([
      nightFrom(uuid(11), '2026-09-05T18:00:00.000Z', { meId: DANA }),
      nightFrom(uuid(12), '2026-09-12T18:00:00.000Z', { meId: DANA }),
    ]);
    expect(added).toBe(2);

    const book = await night.readMyNights();
    expect(book).toHaveLength(2);

    // Newest first, which is the order both screens read in.
    expect(book.map((n) => n.sessionId)).toEqual([uuid(12), uuid(11)]);

    for (const one of book) {
      expect(one.played).toBe(true);
      // $30 up: bought in for $100, counted $130 off the table, no deductions.
      // Read off the engine — nothing on the screen or in this test adds it up.
      expect(one.result).toBe(3_000);
      expect(one.groupName).toBe(CLUB);
      expect(one.players).toBe(2);
      expect(one.terms.length).toBeGreaterThan(0);
    }
  });

  it('carry no figure for somebody who was not at them', async () => {
    const night = await store();
    await night.openNight();

    /*
     * B78's other half. A book holds games played before the reader joined the
     * group, and the pull hands the whole roster down on every night — so
     * "is in this group" is not the test. A night stamped with somebody who was
     * not there would sit in their lifetime total at zero, which reads as an
     * evening they broke even on rather than one they were not invited to.
     */
    const before = nightFrom(uuid(13), '2026-08-01T18:00:00.000Z', {
      meId: uuid(99),
      players: [
        { id: DANA, name: 'Dana', atTable: true },
        { id: IVO, name: 'Ivo', atTable: true },
        { id: uuid(99), name: 'Newcomer', atTable: false },
      ],
    });
    await night.importNights([before]);

    const book = await night.readMyNights();
    expect(book).toHaveLength(1);
    expect(book[0]!.played).toBe(false);
    expect(book[0]!.result).toBe(0);
  });
});

describe('what the book refuses', () => {
  it('never counts the sample night into somebody’s figures, even played out', async () => {
    const night = await store();
    const seeded = await night.openNight();
    await night.importNights([nightFrom(uuid(11), '2026-09-05T18:00:00.000Z', { meId: DANA })]);

    /*
     * THE SEED CAN BE PLAYED TO THE END, and that is the case worth holding.
     * It arrives live, with six people, $5,000 on the table and a `me_id` on
     * it — so somebody trying the app before their first real game can count it
     * up and close it, and it becomes a settled night of theirs in every
     * respect but the one that matters. Being open is not what keeps it out of
     * the book; `seed_version IS NULL` is, and `nightAsMine` asks a second time
     * off the row it read.
     */
    await night.openNightById(seeded.sessionId);
    await night.setStatus('settled');

    const book = await night.readMyNights();
    expect(book.map((n) => n.sessionId)).toEqual([uuid(11)]);
  });

  it('holds a night open until it is settled', async () => {
    const night = await store();
    await night.openNight();

    await night.importNights([
      nightFrom(uuid(14), '2026-09-12T18:00:00.000Z', {
        meId: DANA,
        status: 'open',
        endedAt: null,
      }),
    ]);

    // A game still being played is not a result. It is on home, as a live
    // table, and it joins the book the moment it closes.
    expect(await night.readMyNights()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

/**
 * WHERE A ROW GOES.
 *
 * A source-shape tripwire, the same shape as `storageCoverage.test.ts` and for
 * the same reason: what it guards cannot be seen by anything else that runs.
 *
 * It took over from `ui-journeys.mjs`, which used to tap the first row of each
 * list and require a settled night — the live half of B65's protection, when
 * the score-breakdown row was applied to both lists and silently took their
 * `onPress` with it. That tap needs a real settled night on screen, and the
 * browser build has only the seeded one, which B77 correctly keeps out of the
 * book. So the journey now asserts the lists are empty and this asserts the
 * wiring.
 *
 * TWO FAULTS, AND THE SECOND IS THE NEW ONE. A row that navigates nowhere is
 * B65. A row that navigates to whichever night the store happens to hold is
 * what every row on both lists did until B77 — harmless while eight of the nine
 * rows were invented, and the whole screen the moment they are somebody's real
 * games. Opening a night is `openNightById` first and `router.push` second, the
 * order `goTo` on home uses, because every screen below reads the store's night.
 */
describe('where a row goes', () => {
  const screen = (file: string): string =>
    readFileSync(fileURLToPath(new URL(`../../app/${file}`, import.meta.url).href), 'utf8');

  for (const file of ['stats.tsx', 'games.tsx']) {
    it(`${file}: a row opens the night it names`, () => {
      const source = screen(file);

      // It navigates at all — B65.
      expect(source, `${file} has a row that presses nothing`).toMatch(/onPress=\{[^}]*openNight\(/);

      // It carries the row's own id, rather than pushing a bare route.
      expect(source).toMatch(/onPress=\{\(\) => void openNight\(n\.id\)\}/);
      expect(source, `${file} still pushes /settled without choosing a night`).not.toMatch(
        /onPress=\{\(\) => router\.push\('\/settled'\)\}/,
      );

      // And the swap comes before the push, or the pushed screen paints the
      // night that was on it a moment ago.
      const swap = source.indexOf('await openNightById(sessionId)');
      const push = source.indexOf("router.push('/settled')");
      expect(swap, `${file} never swaps the store's night`).toBeGreaterThanOrEqual(0);
      expect(push).toBeGreaterThan(swap);
    });
  }

  it('neither screen draws a night nobody played', () => {
    for (const file of ['stats.tsx', 'games.tsx']) {
      const source = screen(file);
      // B77. The book is read from the store, never concatenated with a fixture.
      expect(source, `${file} imports a fabricated history`).not.toMatch(/sampleHistory|SAMPLE_HISTORY/);
      expect(source, `${file} does not read the book`).toContain('useMyNights');
    }
  });
});
