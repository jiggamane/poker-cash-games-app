import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Session } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { canSend, whoIs } from './who';

/**
 * A SESSION IS NOT A SIGN-IN — B91.
 *
 * Two ordinary journeys hand this app a real Supabase session belonging to
 * nobody: opening a share link and claiming a seat both call
 * `signInAnonymously` first. Six places then asked `session !== null` and got
 * the wrong answer for both of them — Settings offered a watcher the host's
 * controls under the words *Signed in as unknown*, and the queue's two gates
 * believed a phone that cannot write could send the whole book.
 *
 * The second half of this file is the part that keeps it fixed. The predicate
 * is one function now, but nothing stops the next edit writing the comparison
 * out again — it reads perfectly, it typechecks, and it is wrong in a state no
 * test fixture reaches by accident. So the check is on the SHAPE of the
 * callers, in the manner of `storageCoverage.test.ts`: ask the source.
 */
const session = (over: Record<string, unknown> = {}): Session =>
  ({ access_token: 'a', user: { id: 'u', ...over } }) as unknown as Session;

describe('who is behind the phone', () => {
  it('is nobody without a session', () => {
    expect(whoIs(null)).toEqual({ kind: 'nobody' });
  });

  it('is a person with an account', () => {
    expect(whoIs(session({ email: 'host@example.com' }))).toEqual({
      kind: 'person',
      email: 'host@example.com',
    });
  });

  /* The whole bug: a watch link and a claimed seat both leave one of these. */
  it('is anonymous behind a share link or a claimed seat', () => {
    expect(whoIs(session({ is_anonymous: true }))).toEqual({ kind: 'anonymous' });
  });

  /*
   * `is_anonymous` is optional on Supabase's `User`. Absent has to mean a real
   * account — the safe way round, because the alternative locks a host out of
   * their own controls against a server too old to answer.
   */
  it('treats a server that does not say as a person', () => {
    expect(whoIs(session({ email: 'host@example.com' })).kind).toBe('person');
    expect(whoIs(session({ is_anonymous: false, email: 'a@b.c' })).kind).toBe('person');
  });

  /* An empty address draws a blank where a name should be. */
  it('has no email rather than an empty one', () => {
    expect(whoIs(session({ email: '' }))).toEqual({ kind: 'person', email: null });
    expect(whoIs(session())).toEqual({ kind: 'person', email: null });
  });

  /*
   * THE HALF THAT COSTS SOMETHING. The outbox halts at its first failure, on
   * purpose, so a queue drained under a session the row policies refuse stops
   * behind a refusal it will never get past — with every real night behind it.
   */
  it('lets only a person send', () => {
    expect(canSend(session({ email: 'host@example.com' }))).toBe(true);
    expect(canSend(session({ is_anonymous: true }))).toBe(false);
    expect(canSend(null)).toBe(false);
  });
});

/**
 * WHERE THE COMPARISON MUST NOT COME BACK.
 *
 * Every file here decides something on the strength of "is somebody signed in".
 * None of them may ask it by comparing the session to null, because that
 * question has three answers and the comparison only has two.
 *
 * NOT on this list, and correctly so: `supabase.ts`'s `redeemShareToken` and
 * `invites.ts`'s `redeemInvite`. Those two ask a different question — is there
 * ANY session to hang a grant on — and null is exactly the right test for it.
 * They are where the anonymous sessions come from in the first place.
 */
const GUARDED = [
  '../../app/settings.tsx',
  '../../app/invite.tsx',
  '../../app/auth-callback.tsx',
  './backupPump.ts',
  './sync.ts',
];

const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url).href), 'utf8');

describe('nothing asks whether there is a session and means whether there is an account', () => {
  it.each(GUARDED)('%s', (file) => {
    const code = source(file)
      /* Comments explain the bug and may quote it; the code may not. */
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/session\s*[!=]==\s*null/);
    expect(code).not.toMatch(/null\s*[!=]==\s*session/);
  });

  /* And the predicate they use instead is the one with the test above. */
  it.each(GUARDED)('%s asks who, or asks nothing', (file) => {
    const code = source(file);
    if (/\bsession\b/.test(code.replace(/\/\*[\s\S]*?\*\//g, ''))) {
      expect(code).toMatch(/from '(\.\.\/src\/lib\/)?(\.\/)?(who|useSession)'/);
    }
  });
});
