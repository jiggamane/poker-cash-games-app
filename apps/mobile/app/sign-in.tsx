import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { isSupabaseConfigured, signInWithEmail } from '../src/lib/supabase';

/**
 * The host signs in.
 *
 * A magic link rather than a password: this is opened at a kitchen table, often
 * one-handed, and a password is one more thing to have forgotten since last
 * month. It is also the only sign-in in the app — players are names the host
 * types, and watchers hold a link.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email.trim());

  async function send() {
    setError(null);
    setState('sending');
    try {
      await signInWithEmail(email.trim());
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen title="Not connected" backTo="The group">
        <Text style={[styles.body, { color: t.muted }]}>
          This build has no Supabase project configured, so there is nothing to sign in to. Add
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to apps/mobile/.env and restart
          the server.
        </Text>
      </Screen>
    );
  }

  if (state === 'sent') {
    return (
      <Screen
        title="Check your email"
        backTo="The group"
        footer={<Button label="Done" variant="primary" onPress={() => router.dismissTo('/')} />}
      >
        <Text style={[styles.body, { color: t.text }]}>
          A link is on its way to {email.trim()}.
        </Text>
        <Text style={[styles.body, styles.spaced, { color: t.muted }]}>
          Open it on this phone and you will come back here signed in. The link works once and
          expires shortly, so if it goes stale just ask for another.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Sign in"
      backTo="The group"
      footer={
        <Button
          label={state === 'sending' ? 'Sending…' : 'Send me a link'}
          variant="primary"
          disabled={!valid || state === 'sending'}
          onPress={send}
        />
      }
    >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, fontWeight: '400', lineHeight: 24 },
  spaced: { marginTop: 12 },
  form: { marginTop: space.section },
});
