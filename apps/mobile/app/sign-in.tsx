import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { authRedirectUrl } from '../src/lib/authLink';
import { codeIsComplete, explainCodeFailure, normaliseCode } from '../src/lib/signInCode';
import {
  explainServerError,
  isNotInvited,
  isSupabaseConfigured,
  sendSignInLink,
  verifySignInCode,
} from '../src/lib/supabase';

/**
 * The host signs in.
 *
 * A link rather than a password: the app is opened at a kitchen table, often
 * one-handed, and a password is one more thing to have forgotten since last
 * month. This is the only sign-in in the product — players are names the host
 * types, and watchers hold a link of their own.
 *
 * TWO WAYS IN, AND THE SECOND ONE IS NOT A NICETY — B66. The same email carries
 * a link and a six-digit code, and the link is the half that can arrive broken:
 * a mail client that will not render a custom scheme, a redirect that is not on
 * the project's allow-list, or Go's html/template blanking the href because
 * `exp://` is not a scheme it trusts. Every one of those failures looks the same
 * on the phone — a button that does nothing — and a screen whose only exit is
 * that button has no way out of any of them. The code has none of those parts.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'email' | 'sent'>('email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const redirect = isSupabaseConfigured ? authRedirectUrl() : '';

  async function send() {
    setError(null);
    setBusy(true);
    try {
      await sendSignInLink(email.trim(), redirect);
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
        setError(
          'That address has not been invited yet. The app is in a closed test, so the host has to add you before a link can be sent.',
        );
      } else {
        setError(explainServerError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  /*
   * Dismissed only after the await returns. `verifyOtp` resolves once the
   * session is installed, so by the time this closes, `useSession` has already
   * seen it and every screen subscribed to it is drawing the signed-in state.
   * Closing first — optimistically, on the tap — would put the host back on a
   * club that still believes nobody is signed in, for as long as the round
   * trip takes.
   */
  async function signInWithCode() {
    setError(null);
    setBusy(true);
    try {
      await verifySignInCode(email.trim(), normaliseCode(code));
      router.dismissTo('/');
    } catch (e) {
      setError(explainCodeFailure(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Sheet title="Not connected">
        <Text style={[styles.body, styles.page, { color: t.muted }]}>
          This build has no Supabase project configured, so there is nothing to sign in to. Put
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart
          the server.
        </Text>
      </Sheet>
    );
  }

  /*
   * "Done" was the primary on this stage and has gone, rather than becoming a
   * third button in the footer. It only ever dismissed the sheet, which is what
   * the close in the corner already does — Chrome B is a grabber, a close and a
   * swipe, and doc 09 is explicit that those are the way out of a sheet. The
   * primary slot now holds the thing there is actually to do.
   */
  if (stage === 'sent') {
    return (
      <Sheet
        title="Check your email"
        footer={
          <>
            <Button
              label={busy ? 'Signing in…' : 'Sign in'}
              variant={codeIsComplete(code) && !busy ? 'primary' : 'blocked'}
              disabled={!codeIsComplete(code) || busy}
              onPress={signInWithCode}
            />
            <Button
              label="Use a different email"
              variant="secondary"
              onPress={() => {
                setStage('email');
                setCode('');
                setError(null);
              }}
            />
          </>
        }
      >
        <View style={styles.page}>
          <Text style={[styles.body, { color: t.text }]}>
            A link and a six-digit code are on their way to {email.trim()}.
          </Text>
          <Text style={[styles.body, styles.spaced, { color: t.muted }]}>
            Either one signs you in. Open the link on this phone, or type the code below without
            leaving the app. Both work once and expire shortly, so ask for another if it goes stale.
          </Text>

          <View style={styles.form}>
            <Field
              label="Code from the email"
              value={code}
              onChangeText={(v) => setCode(normaliseCode(v))}
              placeholder="123456"
              keyboardType="number-pad"
              autoFocus
              hint="Six digits. Use this one if the link in the email does not open."
            />
          </View>

          {error !== null && <Text style={[styles.body, { color: t.loss }]}>{error}</Text>}

          <RedirectNote url={redirect} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Sign in"
     
      footer={
        <Button
          label={busy ? 'Sending…' : 'Email me a link'}
          variant="primary"
          disabled={!emailOk || busy}
          onPress={send}
        />
      }
    >
      <View style={styles.page}>
        <Text style={[styles.body, { color: t.muted }]}>
          Only the host signs in. Players are names you type, and watchers open a link.
        </Text>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoFocus
            hint="No password. We email you a link that signs you in."
          />
        </View>

        {error !== null && <Text style={[styles.body, { color: t.loss }]}>{error}</Text>}

        <RedirectNote url={redirect} />
      </View>
    </Sheet>
  );
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
 * Development only. A real build uses pokerclub://auth-callback, which is fixed.
 */
function RedirectNote({ url }: { url: string }) {
  const t = useTheme();
  if (!__DEV__ || url === '') return null;
  return (
    <View style={styles.note}>
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
  page: { paddingHorizontal: space.page },
  body: { ...type.body, fontWeight: '400', lineHeight: 24 },
  spaced: { marginTop: 12 },
  form: { marginTop: space.section },
  note: { marginTop: space.section, gap: 6 },
  noteLabel: type.footnote,
  noteUrl: { ...type.footnote, fontWeight: '600' },
});
