import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { authRedirectUrl } from '../src/lib/authLink';
import { isSupabaseConfigured, sendSignInLink } from '../src/lib/supabase';

/**
 * The host signs in.
 *
 * A link rather than a password: the app is opened at a kitchen table, often
 * one-handed, and a password is one more thing to have forgotten since last
 * month. This is the only sign-in in the product — players are names the host
 * types, and watchers hold a link of their own.
 *
 * The redirect comes from authRedirectUrl(), which returns whatever is correct
 * for how the app is running. Hardcoding a scheme is what made the first
 * attempt fail: pokerclub:// does not exist while the app runs inside Expo Go.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'email' | 'sent'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());

  async function send() {
    setError(null);
    setBusy(true);
    try {
      await sendSignInLink(email.trim(), authRedirectUrl());
      setStage('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen title="Not connected" backTo="The group">
        <Text style={[styles.body, styles.page, { color: t.muted }]}>
          This build has no Supabase project configured, so there is nothing to sign in to. Put
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart
          the server.
        </Text>
      </Screen>
    );
  }

  if (stage === 'sent') {
    return (
      <Screen
        title="Check your email"
        backTo="Sign in"
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
        <Text style={[styles.body, { color: t.text }]}>A link is on its way to {email.trim()}.</Text>
        <Text style={[styles.body, styles.spaced, { color: t.muted }]}>
          Open it on this phone and you will come back here signed in. It works once and expires
          shortly, so ask for another if it goes stale.
        </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Sign in"
      backTo="The group"
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page },
  body: { ...type.body, fontWeight: '400', lineHeight: 24 },
  spaced: { marginTop: 12 },
  form: { marginTop: space.section },
});
