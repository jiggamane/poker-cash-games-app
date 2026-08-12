import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { authRedirectUrl } from '../src/lib/authLink';
import { isNotInvited, isSupabaseConfigured, sendSignInLink } from '../src/lib/supabase';

/**
 * The host signs in.
 *
 * A link rather than a password: the app is opened at a kitchen table, often
 * one-handed, and a password is one more thing to have forgotten since last
 * month. This is the only sign-in in the product — players are names the host
 * types, and watchers hold a link of their own.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'email' | 'sent'>('email');
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
      setError(
        isNotInvited(e)
          ? `${email.trim()} has not been invited yet. While the app is being tested, the host adds each address by hand.`
          : e instanceof Error
            ? e.message
            : String(e),
      );
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

  if (stage === 'sent') {
    return (
      <Sheet
        title="Check your email"
        footer={
          <>
            <Button label="Done" variant="primary" onPress={() => router.dismissTo('/')} />
            <Button
              label="Use a different email"
              variant="secondary"
              onPress={() => {
                setStage('email');
                setError(null);
              }}
            />
          </>
        }
      >
        <View style={styles.page}>
          <Text style={[styles.body, { color: t.text }]}>
            A link is on its way to {email.trim()}.
          </Text>
          <Text style={[styles.body, styles.spaced, { color: t.muted }]}>
            Open it on this phone and you will come back here signed in. It works once and expires
            shortly, so ask for another if it goes stale.
          </Text>
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

        <Text style={[styles.body, styles.spaced, { color: t.muted }]}>
          The app is in testing, so sign-in is by invitation: an address has to have been added
          before a link will be sent to it.
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
