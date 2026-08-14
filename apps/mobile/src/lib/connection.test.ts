import { describe, expect, it } from 'vitest';
import { checkConnection, readKeyProbe, readSessionProbe } from './connection';

/**
 * One status code, one sentence, and never the same sentence twice.
 *
 * The check is only worth having if its verdicts are distinguishable — "the key
 * was refused" and "the project is asleep" are both a red screen and completely
 * different evenings. These assertions are about the mapping, which is the part
 * that has to stay true; the wording around it can change freely.
 */

describe('what the server’s answer to the key means', () => {
  it('200 is the only good news', () => {
    expect(readKeyProbe(200).ok).toBe(true);
  });

  it('401 is the key, and says so in the words the host will have seen', () => {
    const v = readKeyProbe(401);
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('Invalid API key');
    expect(v.detail).toMatch(/\.env/);
  });

  it('403 is treated as the same refusal', () => {
    expect(readKeyProbe(403).headline).toBe(readKeyProbe(401).headline);
  });

  it('404 is the URL, not the key', () => {
    expect(readKeyProbe(404).headline).toMatch(/address/i);
  });

  it('5xx is the free project having gone to sleep', () => {
    expect(readKeyProbe(503).detail).toMatch(/paus/i);
    expect(readKeyProbe(540).detail).toMatch(/paus/i);
  });

  it('anything else is reported as itself rather than dressed up', () => {
    expect(readKeyProbe(418).headline).toContain('418');
  });

  it('never blames the sign-in — the key probe is made without one', () => {
    for (const status of [200, 401, 404, 503, 418]) {
      expect(readKeyProbe(status).staleSignIn).toBe(false);
    }
  });
});

describe('what it means when the key is good and the token is not', () => {
  it('200 is signed in', () => {
    expect(readSessionProbe(200).ok).toBe(true);
    expect(readSessionProbe(200).staleSignIn).toBe(false);
  });

  it('a refusal points at the stored sign-in, which is the only thing left', () => {
    const v = readSessionProbe(401);
    expect(v.ok).toBe(false);
    expect(v.staleSignIn).toBe(true);
    expect(v.detail).toMatch(/sign in again/i);
  });
});

describe('a build with nothing configured', () => {
  it('answers from the configuration rather than asking the network', async () => {
    // No EXPO_PUBLIC_ variables exist under vitest, so this is that build.
    const report = await checkConnection(null);
    expect(report.ok).toBe(false);
    expect(report.headline).toBe('Not configured');
    expect(report.detail).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});
