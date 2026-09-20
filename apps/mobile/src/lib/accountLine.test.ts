import { describe, expect, it } from 'vitest';
import { accountLine, type AccountFacts, type BackupState } from './accountLine';
import type { Who } from './who';

/**
 * THE ONE LINE ABOUT WHERE THE BOOK LIVES — B84, and now B90.
 *
 * The first half of this file is `backupLine.test.ts`, carried over intact
 * because the fault it pinned has not gone anywhere: Settings said `On this
 * phone` whether or not the book was anywhere else, and never said why a send
 * had failed. The states still have to be distinguishable and the reassuring
 * one still has to be unreachable by accident.
 *
 * What B90 adds is the axis those tests could not see. `backupLine` was handed
 * a queue depth and nothing else, so `Backed up` fell out of an empty queue —
 * including the empty queue of a phone with no account, which has sent nothing
 * and can send nothing. Every case below therefore says who is holding the
 * phone, and the first test in the second half is the one that matters: there
 * is no way to reach `Backed up` without a person.
 */
const PERSON: Who = { kind: 'person', email: 'host@example.com' };
const NOBODY: Who = { kind: 'nobody' };
const WATCHER: Who = { kind: 'anonymous' };

const state = (waiting: number, lastError: string | null = null): BackupState => ({
  waiting,
  lastError,
});

/** Signed in, connected, nothing asked of the server — the ordinary case. */
const facts = (over: Partial<AccountFacts> = {}): AccountFacts => ({
  configured: true,
  loading: false,
  who: PERSON,
  backup: state(0),
  probe: null,
  ...over,
});

describe('what the host is told about the queue', () => {
  it('says Backed up only when nothing is waiting', () => {
    expect(accountLine(facts({ backup: state(0) })).where).toBe('Backed up');
    expect(accountLine(facts({ backup: state(1) })).where).not.toBe('Backed up');
  });

  it('counts what is waiting, in the handoff’s own wording', () => {
    expect(accountLine(facts({ backup: state(12) })).where).toBe('Saved on this phone · 12 waiting');
    expect(accountLine(facts({ backup: state(1) })).where).toBe('Saved on this phone · 1 waiting');
  });

  /*
   * NOT ASKED YET IS NOT THE SAME AS BACKED UP, and this is the whole of B84 in
   * one line: the old screen printed something reassuring without having
   * checked anything at all.
   */
  it('never claims to be backed up before it has looked', () => {
    expect(accountLine(facts({ backup: null })).where).toBe('—');
  });

  it('gives the reason while something is stuck', () => {
    const line = accountLine(facts({ backup: state(3, 'ledger_entry: duplicate key') }));
    expect(line.trouble).toBe('ledger_entry: duplicate key');
    expect(line.wrong).toBe(true);
  });

  it('and no reason when there is nothing to explain', () => {
    expect(accountLine(facts({ backup: state(3) })).trouble).toBeNull();
    expect(accountLine(facts({ backup: null })).trouble).toBeNull();
  });

  /*
   * A drained queue that still carries an old error would otherwise draw
   * "Backed up" with a network failure underneath it — `remove()` deletes the
   * row the error belonged to and does not clear the column.
   */
  it('drops a stale error once the queue is empty', () => {
    const line = accountLine(facts({ backup: state(0, 'Network request failed') }));
    expect(line.where).toBe('Backed up');
    expect(line.trouble).toBeNull();
  });
});

describe('and who is holding the phone', () => {
  /*
   * THE BUG THIS FUNCTION EXISTS FOR. An empty queue on a phone with no account
   * is not a book that is safe, it is a book that has never been sent — and on
   * a fresh install that is the ordinary state, because the seeded night is
   * kept out of the queue by `queueable.ts` and leaves it at zero.
   */
  it('never says Backed up to a phone that cannot send', () => {
    for (const who of [NOBODY, WATCHER]) {
      for (const backup of [state(0), state(4), null]) {
        expect(accountLine(facts({ who, backup })).where).not.toBe('Backed up');
      }
    }
  });

  it('tells a signed-out phone what signing in would buy', () => {
    const line = accountLine(facts({ who: NOBODY, backup: state(0) }));
    expect(line.where).toBe('Saved on this phone');
    expect(line.detail).toContain('survives a lost phone');
    expect(line.wrong).toBe(false);
  });

  it('counts the queue for a signed-out phone too, because signing in sends it', () => {
    expect(accountLine(facts({ who: NOBODY, backup: state(12) })).where).toBe(
      'Saved on this phone · 12 waiting',
    );
  });

  /*
   * A watcher's phone holds a real session with no account behind it. It used
   * to read "Signed in as unknown" and be offered Sync now — see B91.
   */
  it('does not mistake a watch link for an account', () => {
    const line = accountLine(facts({ who: WATCHER, backup: state(0) }));
    expect(line.detail).toContain('not an account');
    expect(line.detail).not.toBe(accountLine(facts({ who: NOBODY })).detail);
  });

  /*
   * `last_error` outlives the account that earned it. Signed out, the reason
   * nothing is moving is that nobody is signed in, and the server's old
   * complaint underneath would be a second, wrong answer.
   */
  it('does not show the last account’s error to a phone with no account', () => {
    expect(accountLine(facts({ who: NOBODY, backup: state(3, 'permission denied') })).trouble)
      .toBeNull();
  });
});

describe('and what the server makes of it', () => {
  it('says nothing about an account before auth has answered', () => {
    const line = accountLine(facts({ loading: true, who: NOBODY }));
    expect(line.where).toBe('Checking…');
    expect(line.detail).toBeNull();
  });

  it('does not offer an account on a build with no server', () => {
    const line = accountLine(facts({ configured: false, who: NOBODY }));
    expect(line.detail).toContain('No server is configured');
    expect(line.where).not.toBe('Backed up');
  });

  /*
   * THE STATE EVERY OTHER LINE LIES ABOUT. Auth still holds a session and the
   * queue still counts down, and not one request will be honoured. It outranks
   * the queue rather than sitting in a third note further down the screen,
   * which is where `connection.ts`'s verdict used to land.
   */
  it('lets a refused sign-in outrank a queue that looks healthy', () => {
    const probe = {
      headline: 'This sign-in is no longer accepted',
      detail: 'The key is fine, so the server is refusing the sign-in stored on this phone.',
      staleSignIn: true,
    };
    const line = accountLine(facts({ backup: state(0), probe }));
    expect(line.where).toBe('This sign-in is no longer accepted');
    expect(line.wrong).toBe(true);
  });

  it('but leaves every other verdict to the note it already had', () => {
    const probe = { headline: 'The key was refused', detail: 'Copy the current key.', staleSignIn: false };
    expect(accountLine(facts({ backup: state(0), probe })).where).toBe('Backed up');
  });
});
