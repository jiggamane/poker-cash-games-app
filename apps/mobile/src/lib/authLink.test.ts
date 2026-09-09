import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * B66's other half: the sign-in link must land on a screen that exists.
 *
 * `authRedirectUrl()` cannot be called from here — `expo-linking` needs a
 * running app to know whether it is inside Expo Go or a build, which is the
 * whole reason that function exists. What can be checked, and is the thing that
 * was actually wrong, is that the PATH it names has a route behind it.
 *
 * It did not, for as long as sign-in has existed. Supabase was being asked to
 * send the host to `/auth-callback`; `app/` had no such file; expo-router
 * answered with its *Unmatched Route* developer page. The session installed
 * underneath it — `_layout.tsx` reads the tokens off any URL — so the host was
 * signed in and looking at an error screen, which reads as a link that failed.
 *
 * Reading the source rather than importing it is deliberate. The fault is a
 * missing FILE, and a test that imported the screen would only prove the file
 * it imported compiles. This asserts the join: the path in the redirect, the
 * file in `app/`, and the registration in the layout are three places naming
 * one route, and nothing else in the repo makes them agree.
 */

/*
 * `new URL(rel, import.meta.url)` is the tidier spelling and does not typecheck
 * here: this workspace has React Native's DOM-flavoured `URL` in scope, and
 * `fileURLToPath` wants node's. Paths, then.
 */
const here = dirname(fileURLToPath(import.meta.url));
const at = (rel: string) => join(here, rel);
const read = (rel: string) => readFileSync(at(rel), 'utf8');

/** The path `Linking.createURL` is asked for, straight out of the source. */
function redirectPath(): string {
  const src = read('./authLink.ts');
  const found = /Linking\.createURL\(\s*'([^']+)'\s*\)/.exec(src);
  if (found === null) throw new Error('authLink.ts no longer builds the redirect with createURL');
  return found[1] as string;
}

describe('where the sign-in email sends the host', () => {
  it('is a route with a screen file behind it', () => {
    const route = redirectPath().replace(/^\//, '');
    const screen = at(`../../app/${route}.tsx`);
    expect(existsSync(screen), `${route}.tsx is missing — the link lands on Unmatched Route`).toBe(
      true,
    );
  });

  it('is registered in the stack, so it is presented rather than defaulted', () => {
    const route = redirectPath().replace(/^\//, '');
    expect(read('../../app/_layout.tsx')).toContain(`<Stack.Screen name="${route}"`);
  });

  /*
   * Not a style rule — the reason the button in the email was blank. Go's
   * html/template refuses to emit an href whose scheme it does not recognise
   * and writes `#ZgotmplZ` in its place, so a deep link is safe as a `redirect_to`
   * PARAMETER of an https confirmation URL and is not safe as the href itself.
   * `Linking.createURL` returns `exp://` in Expo Go and `pokerclub://` in a
   * build, and hardcoding either one here is what put a custom scheme where the
   * template could reach it. See docs/email-templates/magic-link.html.
   */
  it('is built by createURL rather than hardcoded to a scheme', () => {
    const src = read('./authLink.ts');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/'(?:pokerclub|exp):\/\//);
  });
});
