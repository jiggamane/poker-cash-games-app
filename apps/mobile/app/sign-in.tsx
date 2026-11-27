import { useEffect, useState } from 'react';
import { StyleSheet, View, type KeyboardTypeOptions } from 'react-native';
import { Text, TextInput } from '../src/components/Text';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { L, T, z } from '../src/design/scale';
import { authRedirectUrl } from '../src/lib/authLink';
import {
  RESEND_WAIT_SECONDS,
  explainLinkFailure,
  isThrottled,
  secondsUntilResend,
  waitSecondsIn,
} from '../src/lib/signInLink';
import {
  explainServerError,
  isNotInvited,
  isSupabaseConfigured,
  sendSignInLink,
} from '../src/lib/supabase';
import { resendConfirmation, startWithCode } from '../src/lib/plan';

/**
 * The host signs in, with a link and only a link.
 *
 * A link rather than a password: the app is opened at a kitchen table, often
 * one-handed, and a password is one more thing to have forgotten since last
 * month. This is the only sign-in in the product — players are names the host
 * types, and watchers hold a link of their own.
 *
 * THE CODE FIELD HAS GONE, and this is the note that keeps it gone. B66 put a
 * six-digit field on the second stage and argued for it well: a link has to be
 * agreed on by four separate systems and three of them refuse silently, so a
 * screen whose only exit is that link has no way out of any of them. All true.
 * What the argument missed is that this project has never sent a code.
 * `{{ .Token }}` reaches the mail only once custom SMTP is on and the template
 * in the dashboard has been replaced by hand — step 4 of
 * `docs/auth-test-period.md`, not done — and until then Supabase's stock
 * magic-link mail carries a link and nothing else. So the sheet said "a link
 * and a six-digit code are on their way", and a host holding an email with no
 * digits in it read that as the app being broken before they had got in. A
 * fallback nobody wired up is worse than no fallback: it spends the one screen
 * a locked-out host is looking at on an instruction that cannot be followed.
 *
 * WHAT CARRIES THE WEIGHT INSTEAD, because the dead-end is a real risk and
 * removing the code does not make it not one. Three things, and none of them
 * depends on a dashboard setting nobody has touched:
 *
 *   - **The address in the mail, written out as text.** The email prints
 *     `{{ .ConfirmationURL }}` under the button as well as inside it, and that
 *     https address pasted into a browser on the same phone is the same hop —
 *     Supabase verifies the token and redirects to the app itself. It survives
 *     a stripped anchor, a plain-text view and a corporate gateway, which are
 *     the three ways a button arrives dead.
 *   - **The redirect this build asks for**, printed below, which is the only
 *     diagnosis of the silent failure — an address not on the project's
 *     allow-list is not refused, it is quietly swapped for the Site URL.
 *   - **A second email, and a wait that is visible before it is spent.**
 *     Throttling is the failure that got more likely when the code went, so the
 *     button counts down rather than letting a locked-out host meet a 429.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'email' | 'sent'>('email');
  /*
   * When another email may be asked for, and how long that wait was.
   *
   * TWO NUMBERS RATHER THAN A TIMESTAMP, because the wait has two sources and
   * they do not agree. An email that went out starts our own 60-second floor;
   * a 429 starts whatever the server said in the refusal, which can be longer
   * and is the only figure that is actually true. Keeping the length beside
   * the start is what lets the second one replace the first without the button
   * lying about how long is left.
   */
  const [cooldown, setCooldown] = useState<{ from: number; seconds: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * THE OTHER WAY IN — 0018, `docs/accounts-roadmap.md` Stage 1.
   *
   * An address the server does not know used to be the end of this sheet: a
   * sentence saying the host has to add you. Now a group can be started by
   * anybody whose account has a plan, and a friend's plan arrives as a code —
   * so the refusal opens a field for one. With a code, the account is made on
   * this phone (the anonymous one it already holds, if it holds one, so a
   * member keeps every seat they claimed) and the email is attached to it;
   * what arrives in the inbox is a confirmation link, and it lands on
   * `/auth-callback` exactly as a sign-in link does.
   *
   * `via` remembers which of the two sent the mail, because "Send another
   * link" has to repeat the same one: a sign-in link to an address with no
   * account would only be refused again.
   */
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [via, setVia] = useState<'link' | 'code'>('link');
  const codeOk = code.trim().length >= 4;

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const redirect = isSupabaseConfigured ? authRedirectUrl() : '';
  const wait = useCountdown(cooldown);
  const cooling = wait > 0;

  async function send() {
    setError(null);
    setBusy(true);
    try {
      if (via === 'code') await resendConfirmation(email.trim(), redirect);
      else await sendSignInLink(email.trim(), redirect);
      setCooldown({ from: Date.now(), seconds: RESEND_WAIT_SECONDS });
      setStage('sent');
    } catch (e) {
      /*
       * `isNotInvited` has existed since the closed test was set up, saying in
       * its own comment that "the sign-in screen says it in its own words" —
       * and this screen had never called it, so what a tester actually read was
       * Supabase's own "Signups not allowed for otp". That reads like a broken
       * build rather than a door that is shut, and it is the first thing
       * anybody hits who was never added in the dashboard. Found beside B66.
       */
      if (isNotInvited(e)) {
        /* Not an error any more: the sheet grows the field for a code and
           says why underneath it. */
        setNeedsCode(true);
      } else {
        /*
         * The send failures first — no signal, and the throttle — then
         * everything else in `explainServerError`'s words. Two files, one
         * vocabulary; see the null at the end of `explainLinkFailure`.
         */
        setError(explainLinkFailure(e) ?? explainServerError(e));
      }
      /*
       * A REFUSED SEND STARTS THE CLOCK TOO, when the refusal was a throttle.
       *
       * Without this the button comes straight back looking available, the
       * host taps it, and meets the identical 429 — which is the one thing
       * that makes a rate limit worse, since each attempt can extend it. The
       * server's own figure wins over our floor when it names one: it knows
       * what it is counting and we are guessing.
       *
       * Every other failure leaves the clock alone. A bad key or an uninvited
       * address is not a wait, and making somebody sit out a minute before
       * they can correct a typo would be a punishment for our own error
       * message.
       */
      if (isThrottled(e)) {
        const said = waitSecondsIn(e instanceof Error ? e.message : String(e));
        setCooldown({ from: Date.now(), seconds: said ?? RESEND_WAIT_SECONDS });
      }
    } finally {
      setBusy(false);
    }
  }

  async function spendCode() {
    setError(null);
    setBusy(true);
    try {
      await startWithCode(email.trim(), code.trim(), redirect);
      setVia('code');
      setCooldown({ from: Date.now(), seconds: RESEND_WAIT_SECONDS });
      setStage('sent');
    } catch (e) {
      setError(explainLinkFailure(e) ?? explainServerError(e));
      if (isThrottled(e)) {
        const said = waitSecondsIn(e instanceof Error ? e.message : String(e));
        setCooldown({ from: Date.now(), seconds: said ?? RESEND_WAIT_SECONDS });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Sheet title="Not connected">
        <View style={styles.page}>
          <Text style={[styles.lede, { color: t.muted }]}>
            This build has no Supabase project configured, so there is nothing to sign in to. Put
            EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart
            the server.
          </Text>
        </View>
      </Sheet>
    );
  }

  /*
   * "Done" was the primary on this stage and has gone, rather than becoming a
   * third button in the footer. It only ever dismissed the sheet, which is what
   * the close in the corner already does — Chrome B is a grabber, a close and a
   * swipe, and doc 09 is explicit that those are the way out of a sheet. The
   * primary slot now holds the thing there is actually to do.
   *
   * AND THE THING TO DO IS NOT ON THIS SHEET. That is the shape of a link
   * flow and it is why this stage reads the way it does: the host leaves for
   * the mail app, taps, and comes back signed in — `_layout.tsx` installs the
   * session off the URL wherever the app happens to be, and `/auth-callback`
   * is where the link lands. So the primary here is the recovery, not the
   * action: a second email, once the first has had time to arrive — and on the
   * full board (`sign-in-sent`, approved) that recovery is the bar, faint while
   * it counts down. "Use a different email" is the outlined secondary in the
   * content.
   */
  if (stage === 'sent') {
    return (
      <Sheet
        title="Check your email"
        bar={[
          {
            label: busy ? 'Sending…' : cooling ? `Send another link in ${wait}s` : 'Send another link',
            onPress: () => void send(),
            disabled: cooling || busy,
          },
        ]}
      >
        <View style={styles.page}>
          {/* Board draft copy (`sign-in-sent`): the owner asked for "much fewer
              text" on every sign-in screen (24 November), and the board trims
              the stage to these two lines. The app's longer paragraph said the
              link works once and expires; that is what the bar is for. */}
          <Text style={[styles.lede, { color: t.text }]}>A link is on its way to {email.trim()}.</Text>
          <Text style={[styles.note, { color: t.muted }]}>Open it on this phone.</Text>

          <Button
            label="Use a different email"
            variant="secondary"
            /*
             * The cooldown is NOT cleared here. It belongs to the server's
             * rate limit, which counts per project and not per address, so
             * stepping back to change a typo does not buy another email —
             * and a button that looks available and is not is exactly what
             * this countdown exists to prevent.
             */
            onPress={() => {
              setStage('email');
              setError(null);
            }}
          />

          {error !== null && <Text style={[styles.note, { color: t.loss }]}>{error}</Text>}

          {/*
            The one instruction that matters when the button in the email is
            dead, and it has to be on the screen rather than only in the mail:
            a host reading a stripped anchor has no button to read a hint under.

            KEPT THROUGH THE TRIM, deliberately. The board's `sign-in-sent`
            cuts the stage to two lines and does not draw this block, but B88
            (`docs/bugs.md`) names it as one of the three things that carry the
            weight the code used to — "both /sign-in and /auth-callback now
            point at it". A trim of words is not a decision to remove a fix, so
            it stays, quiet, at the foot.
          */}
          <View style={styles.aside}>
            <Text style={[T.lookLabel, { color: t.muted }]}>IF THE BUTTON DOES NOTHING</Text>
            <Text style={[styles.note, { color: t.muted }]}>
              The email prints the same address as text underneath it. Paste that into a browser on
              this phone — it signs you in the same way.
            </Text>
          </View>

          <RedirectNote url={redirect} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Sign in"
      /*
       * THE FULL BOARD (`sign-in`, `sign-in-code`, approved): the send is the
       * bar, faint until it can go, and with a code field open the bar changes
       * its words to "Open an account".
       */
      bar={[
        needsCode
          ? {
              label: busy ? 'Opening…' : cooling ? `Open an account in ${wait}s` : 'Open an account',
              onPress: () => void spendCode(),
              disabled: !emailOk || !codeOk || busy || cooling,
            }
          : {
              /*
               * The wait shows here too. The throttle is the project's, not the
               * address's, so a host who came back to fix a typo is under it
               * just the same and should read that on the bar rather than in
               * an error after spending a tap.
               */
              label: busy ? 'Sending…' : cooling ? `Email me a link in ${wait}s` : 'Email me a link',
              onPress: () => void send(),
              disabled: !emailOk || busy || cooling,
            },
      ]}
    >
      <View style={styles.page}>
        {/*
         * Board draft copy (`sign-in`): the owner asked for "much fewer text"
         * on every sign-in screen (24 November), and the board trims the sheet
         * to the field and one line. Gone with it: the lede "Only the host
         * signs in. Players are names you type, and watchers open a link." and
         * the hint's "…a link that signs you in."
         */}
        <View>
          <Text style={[styles.fieldLabel, { color: t.muted }]}>Email</Text>
          <Input
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              /* A different address may well have an account — ask again. */
              setNeedsCode(false);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoFocus
            accessibilityLabel="Email"
          />
        </View>
        <Text style={[styles.note, { color: t.muted }]}>No password. We email you a link.</Text>

        {/*
         * ⚠ COPY NOT DRAWN until the full board — the sheet was drawn for a
         * closed test in which this state was a dead end. Board draft copy
         * (`sign-in-code`), trimmed like the rest at the owner's word.
         *
         * A PLAIN FIELD, NOT THE BOARD'S TWO BOXES. The board draws the code in
         * the invite claim's two boxes "on the reading that it is the
         * six-character invite code", and its own flag says that if the
         * sign-up code stays a free word ("FRIDAY") this goes back to a plain
         * field. It is a free word: `startWithCode` spends a plan code, not an
         * invite.
         */}
        {needsCode && (
          <>
            <Text style={[styles.note, { color: t.muted }]}>
              No account for that address yet. Got a code? Type it here.
            </Text>
            <Input value={code} onChangeText={setCode} placeholder="FRIDAY" accessibilityLabel="Code" />
          </>
        )}

        {error !== null && <Text style={[styles.note, { color: t.loss }]}>{error}</Text>}

        <RedirectNote url={redirect} />
      </View>
    </Sheet>
  );
}

/**
 * The kit's `.fi`: outlined, never filled — 48 tall, 12 corners, a 1.5 outline
 * that turns to a 2 in the text colour on focus. Local to this sheet rather
 * than `Field`, which other screens still draw in the old look.
 */
function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.dim}
      keyboardType={keyboardType}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={accessibilityLabel}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.input,
        { color: t.text, backgroundColor: t.surface, borderColor: focused ? t.text : t.outline },
        focused && styles.focused,
      ]}
    />
  );
}


/**
 * Seconds left before another email may be asked for, ticking.
 *
 * A second a tick and only while there is something to count: the interval is
 * cleared the moment it reaches zero, so a sheet left open on this stage is not
 * a timer running behind a night.
 */
function useCountdown(cooldown: { from: number; seconds: number } | null): number {
  const from = cooldown?.from ?? null;
  const seconds = cooldown?.seconds ?? RESEND_WAIT_SECONDS;
  const [left, setLeft] = useState(() => secondsUntilResend(from, Date.now(), seconds));

  /*
   * Depends on the two numbers rather than on the object: a render that builds
   * an equal `{ from, seconds }` would otherwise restart the interval every
   * second, which is a timer resetting the timer.
   */
  useEffect(() => {
    setLeft(secondsUntilResend(from, Date.now(), seconds));
    if (from === null) return;
    const id = setInterval(() => {
      const now = secondsUntilResend(from, Date.now(), seconds);
      setLeft(now);
      if (now === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [from, seconds]);

  return left;
}

/**
 * The exact address the email will send you back to.
 *
 * Worth printing, because the one way this flow fails silently is a redirect
 * that is not on Supabase's allow-list: the link then falls back to the
 * project's Site URL — localhost:3000 by default — and the phone shows a page
 * it cannot reach. In Expo Go this address contains the dev server's IP and
 * PORT, so it changes whenever either does, which is exactly the sort of thing
 * you want to be able to read off the screen rather than guess at.
 *
 * ON EVERY BUILD — B86. This said `__DEV__` and argued for it: *"A real build
 * uses pokerclub://auth-callback, which is fixed."* Fixed is not known. An
 * address that never changes and has never been pasted into the allow-list
 * fails exactly as silently as one that changes every morning, and the build
 * this app actually reaches a phone on — a published update in Expo Go — has
 * neither property: its redirect is a `u.expo.dev` URL nobody reconstructs from
 * memory. So the line was on screen only where the address was already in the
 * terminal behind you, and off everywhere it was the answer.
 *
 * IT CARRIES MORE NOW THAT THE CODE HAS GONE. While there was a six-digit
 * field on the second stage, a redirect missing from the allow-list cost a host
 * the nicer flow and no more. With the link as the only way in, this line is
 * the whole diagnosis of the one failure that reports itself as success.
 *
 * It is not a secret. The same string travels to the host by email, as the
 * `redirect_to=` parameter of the link — which is where
 * `docs/email-templates/README.md` says to read it when this fails.
 *
 * `url === ''` is still a reason to say nothing: that is a build with no server
 * configured at all, where there is no allow-list to be on.
 */
function RedirectNote({ url }: { url: string }) {
  const t = useTheme();
  if (url === '') return null;
  return (
    <View style={styles.redirect}>
      <Text style={[styles.noteLabel, { color: t.muted }]}>Redirects to</Text>
      <Text style={[styles.noteUrl, { color: t.muted }]} selectable>
        {url}
      </Text>
      <Text style={[styles.noteLabel, { color: t.muted }]}>
        This must appear in Supabase → Authentication → URL Configuration → Redirect URLs.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Sheet content, as on every converted sheet: 20 in from the edges, 12 between. */
  page: { paddingHorizontal: z(20), gap: z(12) },
  /* The kit's `para()`: 15 at 1.45, in the text colour. */
  lede: { fontSize: z(15), fontWeight: '400', lineHeight: z(21.75) },
  /* The kit's `note()`: 13 at 1.45, muted. */
  note: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
  /* The kit's `.fl`: the field's own label, sentence case, above it. */
  fieldLabel: { fontSize: z(12.5), fontWeight: '600', marginBottom: z(6), marginLeft: z(2) },
  input: {
    minHeight: z(48),
    fontSize: z(16),
    fontWeight: '600',
    borderWidth: 1.5,
    borderRadius: L.fieldRadius,
    paddingHorizontal: z(14),
    paddingVertical: z(12),
  },
  focused: { borderWidth: 2, paddingHorizontal: z(13.5) },
  aside: { gap: z(6), marginTop: z(4) },
  redirect: { gap: z(5), marginTop: z(4) },
  noteLabel: { fontSize: z(12), fontWeight: '400', lineHeight: z(16.8) },
  noteUrl: { fontSize: z(12), fontWeight: '600', lineHeight: z(16.8) },
});
