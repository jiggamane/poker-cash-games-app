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

  /*
   * B86. The allow-list is a dashboard setting no check in this repository can
   * read, and the auth server reports an unlisted redirect as success — so the
   * sheet printing its own address is the whole of the diagnosis when this
   * fails. It printed it `if (__DEV__)`: on the one build where the address is
   * already in the terminal behind you, and nowhere on a published Expo Go
   * update, whose `u.expo.dev` redirect nobody reconstructs from memory.
   *
   * Source, not a render, for `authLink.test.ts`'s own reason above: the fault
   * is a condition on a screen with no test of its own, and this is the join
   * between the address and the place a host can read it.
   */
  /*
   * B87. The sheet asked for six digits that this project has never sent.
   *
   * `{{ .Token }}` reaches the mail only once custom SMTP is on AND the
   * template in the dashboard has been replaced by hand — step 4 and step 5 of
   * `docs/auth-test-period.md`, neither done — and until then Supabase's stock
   * magic-link mail carries a link and nothing else. So the *Check your email*
   * stage said "a link and a six-digit code are on their way", drew a field for
   * the code, and a host holding an email with no digits in it read the app as
   * broken before they had got in.
   *
   * Source rather than a render, for this file's reason above: the fault is a
   * DEPENDENCY between the app and a template nobody applied, and the only
   * place it can be seen is the join. Both halves are asserted — the field is
   * gone, and the fallback that replaced it is present in the template — since
   * either one alone is the state that caused the bug.
   */
  it('does not ask for a code, because no code is sent', () => {
    const src = read('../../app/sign-in.tsx');
    /* Comments explain WHY it is gone, so they are not the thing being read. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    expect(code, 'the sign-in sheet verifies a code again — B87').not.toMatch(
      /verifySignInCode|signInCode|normaliseCode|codeIsComplete/,
    );
    expect(code, 'a code field is back on the sign-in sheet — B87').not.toMatch(
      /number-pad|six.digit/i,
    );
  });

  /*
   * The other half of B87, and the reason the fallback is not a courtesy.
   *
   * Three of the four systems a link depends on refuse SILENTLY and what
   * arrives is a button that does nothing. The confirmation URL written out as
   * text is what a host has instead of being locked out: a plain string rather
   * than markup, so a stripped anchor, a plain-text view and a corporate
   * gateway all leave it intact, and pasted into a browser on the phone it
   * takes the identical hop. Supabase's stock template has this row too, which
   * is what makes it a fallback that works TODAY rather than one waiting on a
   * dashboard step — the exact property the six-digit code did not have.
   *
   * Both screens tell a host to look for it, so it may not quietly leave the
   * template while they go on pointing at it.
   */
  it('keeps the confirmation URL as text in the mail, which is the only fallback', () => {
    const mail = read('../../../../docs/email-templates/magic-link.html');
    const body = mail.slice(mail.indexOf('-->') + 3);

    /* Twice: once as the button's href, once written out to be copied. */
    const written = body.match(/\{\{ \.ConfirmationURL \}\}/g) ?? [];
    expect(
      written.length,
      'the sign-in email no longer prints its address as text — B87',
    ).toBeGreaterThanOrEqual(2);

    /* And nothing in the app may depend on a token that is not being sent. */
    expect(body, 'the template carries a code again; the app has no field for it — B87').not.toMatch(
      /\{\{ \.Token \}\}/,
    );
  });

  it('is printed on the sign-in sheet in every build, not only in dev', () => {
    const src = read('../../app/sign-in.tsx');
    const start = src.indexOf('function RedirectNote(');
    expect(start, 'sign-in.tsx no longer has a RedirectNote to print the address').not.toBe(-1);

    const body = src
      .slice(start, src.indexOf('\n}', start))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(body, 'the sign-in sheet hides its redirect outside dev — B86').not.toContain('__DEV__');
    /* And it still says nothing when there is no server to be allow-listed by. */
    expect(body).toContain("url === ''");
  });
});
