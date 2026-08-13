import { describe, expect, it } from 'vitest';
import { readConfig, readKey, tidy } from './supabaseConfig';

/**
 * The four ways to earn "Invalid API key".
 *
 * This file exists because that one message is the answer to four different
 * questions, and a host reading it on a phone cannot tell which. Each case below
 * is one of them, decided from the two strings alone — no project, no network,
 * no account. If one of these stops holding, the app goes back to reporting a
 * cause it has not established.
 */

const URL_A = 'https://eciozeeqywpgqlxqmprl.supabase.co';

/** A legacy anon key, built the way Supabase builds them. */
function legacyKey(payload: Record<string, unknown>): string {
  const b64 = (o: unknown): string =>
    Buffer.from(JSON.stringify(o))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature-not-checked-here`;
}

const anonFor = (ref: string, exp = 4102444800): string =>
  legacyKey({ iss: 'supabase', ref, role: 'anon', iat: 1690000000, exp });

describe('reading what a key says about itself', () => {
  it('recognises the current publishable format', () => {
    expect(readKey('sb_publishable_A1b2C3d4E5f6G7h8').kind).toBe('publishable');
  });

  it('recognises a legacy anon key and the project it is for', () => {
    const facts = readKey(anonFor('eciozeeqywpgqlxqmprl'));
    expect(facts.kind).toBe('anon');
    expect(facts.ref).toBe('eciozeeqywpgqlxqmprl');
  });

  it('recognises both kinds of secret, which must never reach a phone', () => {
    expect(readKey('sb_secret_abcdefghijklmnop').kind).toBe('secret');
    expect(readKey(legacyKey({ ref: 'x', role: 'service_role' })).kind).toBe('service_role');
  });

  it('calls anything else unknown rather than guessing', () => {
    expect(readKey('your-anon-key').kind).toBe('unknown');
    expect(readKey('eyJ-not-really-a-jwt').kind).toBe('unknown');
  });
});

describe('tidying a value a human pasted into a file', () => {
  it('drops surrounding quotes and whitespace', () => {
    expect(tidy('  "abc"  ')).toBe('abc');
    expect(tidy("'abc'\n")).toBe('abc');
  });

  it('closes up a key an editor wrapped mid-paste', () => {
    // The failure this one is about: 200-odd characters pasted into .env, broken
    // across two lines, refused by the gateway with no hint that the key it got
    // is not the key on the screen.
    expect(tidy('eyJhbGciOi\n  JIUzI1NiJ9')).toBe('eyJhbGciOiJIUzI1NiJ9');
  });

  it('treats empty and missing as the same nothing', () => {
    expect(tidy('   ')).toBeNull();
    expect(tidy(undefined)).toBeNull();
  });
});

describe('what is provably wrong before anything is asked of the server', () => {
  it('accepts a matching pair', () => {
    const c = readConfig(URL_A, anonFor('eciozeeqywpgqlxqmprl'));
    expect(c.problem).toBeNull();
    expect(c.ref).toBe('eciozeeqywpgqlxqmprl');
  });

  it('accepts a publishable key, which carries no ref to check', () => {
    expect(readConfig(URL_A, 'sb_publishable_A1b2C3d4E5f6').problem).toBeNull();
  });

  it('names a key that belongs to another project', () => {
    const c = readConfig(URL_A, anonFor('someotherprojectref'));
    expect(c.problem).toBe('key-other-project');
    expect(c.complaint).toContain('someotherprojectref');
    expect(c.complaint).toContain('eciozeeqywpgqlxqmprl');
  });

  it('names an expired key, which is refused exactly like a wrong one', () => {
    const expired = anonFor('eciozeeqywpgqlxqmprl', 1700000000);
    const c = readConfig(URL_A, expired, new Date('2026-08-13T00:00:00Z'));
    expect(c.problem).toBe('key-expired');
    expect(c.complaint).toContain('2023-11-14');
  });

  it('refuses to start with a secret key rather than shipping one', () => {
    expect(readConfig(URL_A, 'sb_secret_abcdefghijk').problem).toBe('key-is-a-secret');
    expect(readConfig(URL_A, legacyKey({ ref: 'x', role: 'service_role' })).problem).toBe(
      'key-is-a-secret',
    );
  });

  it('names the placeholder left in from .env.example', () => {
    expect(readConfig(URL_A, 'your-anon-key').problem).toBe('key-not-a-key');
    expect(readConfig(URL_A, 'your-anon-or-publishable-key').problem).toBe('key-not-a-key');
  });

  it('passes through a key it cannot parse, rather than grounding the app', () => {
    // The server is the authority on a key. This file is a shortcut to a better
    // sentence, and a shortcut must never be the thing that stops a night.
    expect(readConfig(URL_A, 'eyJ.something.we.cannot.read').problem).toBeNull();
    expect(readConfig(URL_A, 'sb_publishable_but_in_some_future_shape').problem).toBeNull();
  });

  it('names each half being missing separately, because the fixes differ', () => {
    expect(readConfig(undefined, anonFor('a')).problem).toBe('no-url');
    expect(readConfig(URL_A, undefined).problem).toBe('no-key');
    expect(readConfig(URL_A, '').problem).toBe('no-key');
  });

  it('catches the dashboard URL, which is the one people copy from the address bar', () => {
    const c = readConfig(
      'https://supabase.com/dashboard/project/eciozeeqywpgqlxqmprl',
      anonFor('eciozeeqywpgqlxqmprl'),
    );
    expect(c.problem).toBe('url-is-the-dashboard');
  });

  it('every complaint says where to make the change', () => {
    const complaints = [
      readConfig(undefined, undefined),
      readConfig(URL_A, undefined),
      readConfig(URL_A, 'your-anon-key'),
      readConfig(URL_A, anonFor('anotherref')),
    ].map((c) => c.complaint ?? '');

    for (const complaint of complaints) {
      expect(complaint).toMatch(/\.env|dashboard|Project Settings/i);
    }
  });
});
