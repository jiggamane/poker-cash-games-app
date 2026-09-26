import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * EVERY WAY THE APP CHANGES SOMETHING, AND WHERE THAT CHANGE GOES.
 *
 * This is the check that "the whole book is on the server" is supposed to keep
 * being true, and it is a different shape from every other test in the app
 * because the failure it exists for is a different shape.
 *
 * The faults it was written for were not wrong figures. `writeRules` wrote the
 * night's money rules to SQLite and queued nothing; `setStatus` moved a night to
 * counting on the phone and left the server saying `live`; `setNightRounding`,
 * `renameClub`, `setClubCurrency`, `setPaysKitty` and the E7 ticks were the
 * same. Not one of them broke a screen, failed a test or showed a host anything
 * at all — the app worked perfectly and the data stopped at the device, which is
 * discovered by reinstalling a phone, months later, with a group's real money in
 * it.
 *
 * NOTHING CAN CATCH THAT BY LOOKING AT BEHAVIOUR. So this looks at the shape of
 * the two stores instead: it reads their source, lists every exported operation,
 * and holds that list against the table below, in which every one of them says
 * either which queue operation carries it or WHY it stays on the phone. Add an
 * export to either store and this fails, naming the function and asking the one
 * question nobody remembered to ask: does this need to reach the server?
 *
 * A reason is an answer. "Reads only", "local by design", "queued by the ledger"
 * are all fine, and being made to type one is the entire mechanism. What is not
 * available is silence.
 */

// `.href` rather than the URL itself: this file is typechecked with the DOM
// lib, where `URL` is the browser's and not the one `node:url` expects.
const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url).href), 'utf8');

/** Every `export async function` in a store, which is every way in. */
const operationsIn = (file: string): string[] =>
  [...source(file).matchAll(/^export async function (\w+)/gm)].map((m) => m[1]).sort();

/**
 * What carries each operation to the server, or why nothing does.
 *
 * Keep the reasons specific. "Not needed" is not one: say what makes it not
 * needed, so the next person to read it can tell whether it is still true.
 */
const NIGHT: Record<string, string> = {
  // --- money: every one of these is a ledger entry, and entries have always
  // gone up through `recordEntry` ---
  buyIn: 'entry.append',
  rebuy: 'entry.append',
  cashOut: 'entry.append',
  addSpend: 'entry.append',
  correctEntry: 'entry.append — a correction is a new row, never an edit',
  voidEntry: 'entry.append — a void is a new row',
  voidSpend: 'entry.append — one void per fronter',
  seatAndBuyIn: 'seat.upsert + entry.append',

  // --- the night, and the people in it ---
  startNight: 'session.open — the book, the session, the seats and the rules',
  seat: 'player.upsert + seat.upsert',
  addPlayer: 'player.upsert',
  renamePlayerInPlay:
    'player.upsert, queued by clubStore.renameMember, which is the only caller — ' +
    'a name belongs to the roster and reaches the book from there',
  setFinalCount: 'count.upsert',
  setStatus: 'session.patch — the status, without an ended_at the server would refuse',
  setEndedAt:
    'session.ended when the night has already settled, and nothing at all before ' +
    'that — an open night carries it to the server inside the close. B87',
  setNightRounding: 'session.patch',
  closeNight: 'session.close — the frozen settlement, then the status and the ending',
  setPaid: 'payment.set',

  // --- the rules ---
  saveRule: 'rule.upsert, through writeRules',
  deleteRule: 'rule.delete, through writeRules',
  toggleRule: 'rule.upsert, through writeRules',
  setManualCharge:
    'nothing, deliberately: a hand-typed share is an answer about ONE night and ' +
    'money_rule belongs to the book. It reaches the server inside ' +
    'settlement.rules_snapshot at close — see 0013_night_rounding.sql',
  clearManualCharges: 'nothing, deliberately: the same as setManualCharge',

  // --- local by design ---
  setMeSeat:
    'nothing: which seat is me is this phone speaking about itself. The server ' +
    'has the real version of it — player.claimed_by_user_id, set by claiming',
  setAcknowledgement:
    'nothing directly: a shortfall is confirmed to close a night, and the ' +
    'confirmation travels inside the settlement when it does',
  dropPlayerFromPlay:
    'nothing: it only ever deletes a local row that carries nothing, and the ' +
    'book keeps the row every night still points at',
  importNights: 'nothing: this is the pull writing what the server already has',
  replaceNight:
    'nothing: a handover — the server moved the night first, and this is the phone ' +
    'taking the server\'s copy in place of its own. See hold.ts',
  applyLateChange:
    'entry.append / seat.upsert / player.upsert / count.upsert — it re-records a handed-in ' +
    'change through the same calls a tap makes, which queue it themselves',
  markHold:
    'nothing: where a night is being written is the server\'s to say ' +
    '(session.writer_user_id, moved only by 0016\'s functions); this is the phone ' +
    'writing down what it was told',

  // --- reads ---
  openNight: 'reads only',
  openNightById: 'reads only',
  refreshOpenGames: 'reads only',
  readMyNights: 'reads only — every settled night on the phone, for Sessions and My stats',
  readBackup: 'reads only — the third copy, for a person to keep. See bookBackup.ts',
  restoreBackup:
    'nothing, deliberately: it is importNights reading a pasted file instead of ' +
    'the server, and what it writes the phone already had once',
  refreshMyNights: 'reads only — the same read, into the store the two screens subscribe to',
};

const CLUB: Record<string, string> = {
  createClub: 'book.upsert + player.upsert',
  renameClub: 'book.upsert, carrying the old name so the book is still found',
  setClubCurrency: 'book.upsert',
  setClubBuyIn: 'book.upsert',
  setClubRounding: 'book.upsert',
  setClubStakes: 'book.upsert',
  setClubRules: 'rule.upsert + rule.delete',
  addMember: 'player.upsert',
  renameMember: 'player.upsert',
  setPaysKitty: 'player.terms',
  removeMember: 'player.terms — removed_at, never a delete',
  rosterIdFor: 'player.upsert, through addMember when the name is new',

  makeAdmin:
    'nothing: standing is per club and per phone. The server has no notion of ' +
    'an admin — it has a host, which is the account that owns the book',
  switchClub: 'nothing: which group is on screen',
  loadClubs: 'reads only',
  importRoster: 'nothing: this is the pull writing what the server already has',
  reconcileSeats: 'reads only — it asks the server for the badges',
  nightsPlayed: 'reads only',
  playHistory: 'reads only',
  inheritedFor: 'reads only',
  rememberLastGame:
    'nothing: club_last_game is the middle of the inheritance chain, derived ' +
    'from the night the server already has',
};

describe('every operation says where it goes', () => {
  it('the night: no export changes something without saying', () => {
    expect(operationsIn('./nightStore.ts')).toEqual(Object.keys(NIGHT).sort());
  });

  it('the group: no export changes something without saying', () => {
    expect(operationsIn('./clubStore.ts')).toEqual(Object.keys(CLUB).sort());
  });

  it('and every answer is an answer', () => {
    for (const [name, why] of Object.entries({ ...NIGHT, ...CLUB })) {
      // Long enough to be a sentence rather than a shrug. "reads only" is the
      // shortest answer the table has and it is a complete one.
      expect(why.length, `${name} needs a real reason`).toBeGreaterThanOrEqual(10);
    }
  });
});

/**
 * The other half: the queue's vocabulary, listed once.
 *
 * `OpKind` is a union in `packages/core`, so a kind added there and never
 * dispatched in `sync.ts` is a queued operation that silently does nothing —
 * `send()` has no default case, which is TypeScript's exhaustiveness check, but
 * only until somebody adds one. This holds the two lists together from the
 * outside.
 */
describe('the queue sends every kind it knows', () => {
  const KINDS = [
    'book.upsert',
    'count.delete',
    'count.upsert',
    'entry.append',
    'payment.set',
    'player.terms',
    'player.upsert',
    'rule.delete',
    'rule.upsert',
    'seat.upsert',
    'session.close',
    'session.ended',
    'session.open',
    'session.patch',
  ];

  it('names every kind in the drain', () => {
    const sync = source('./sync.ts');
    for (const kind of KINDS) {
      expect(sync, `${kind} is never dispatched in sync.ts`).toContain(`case '${kind}'`);
    }
  });

  it('and every kind the drain names is one of these', () => {
    const cases = [...source('./sync.ts').matchAll(/case '([\w.]+)':/g)].map((m) => m[1]).sort();
    expect([...new Set(cases)]).toEqual(KINDS);
  });
});

/**
 * AND THE OPERATION THAT EXISTED, WORKED, AND WAS CALLED BY NOBODY — B87.
 *
 * The table above asks where a change GOES. This asks the question one step
 * earlier, and it is the question B87 got wrong: whether anything invokes the
 * operation at all. `setStatus` was written, tested, listed in the table as
 * `session.patch`, and documented in `closing.ts` as the thing that records the
 * honest end of a night — and no screen had ever called it. So the fallback
 * `night.endedAt ?? at` in `closeOf`, described in its own comment as covering
 * "a night that somehow reached a close without one", was the only path every
 * night in the book took, and every night recorded the moment the host tapped
 * Settle rather than the moment the cards stopped.
 *
 * NOTHING ELSE CAN SEE THIS. The store's tests pass — the function is correct.
 * `closeOf`'s tests pass — it honours an end time when it is given one. The
 * screens pass — they draw whatever figure they are handed. The fault lived
 * entirely in a call that was not written, which is the same shape as the
 * faults at the top of this file and is why it is checked the same way.
 */
describe('the end of the night is stamped when the night ends', () => {
  it('End game moves the night to counting, which is what writes ended_at', () => {
    const session = source('../../app/session.tsx');
    const onEnd = session.slice(session.indexOf('onEnd={'), session.indexOf('onEnd={') + 400);

    expect(session, 'session.tsx never calls setStatus').toContain("setStatus('counting')");
    expect(onEnd, 'End game pushes to the count without stamping the end').toContain(
      "setStatus('counting')",
    );
  });

  it('and the sheet that corrects it is reachable from the two screens that show it', () => {
    for (const screen of ['count-up', 'settled']) {
      expect(
        source(`../../app/${screen}.tsx`),
        `${screen}.tsx shows an end time nobody can fix`,
      ).toContain("'/end-time'");
    }
  });
});
