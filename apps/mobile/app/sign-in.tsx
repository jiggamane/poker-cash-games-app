import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { isSupabaseConfigured, sendSignInCode, verifySignInCode } from '../src/lib/supabase';

/**
 * The host signs in with a six-digit code.
 *
 * A code rather than a magic link: a link has to reopen the app through a
 * custom URL scheme, which does not exist while the app runs inside Expo Go.
 * A code is typed into the screen already in front of you, needs no redirect
 * configuration, and behaves the same in every environment.
 *
 * This is the only sign-in in the product. Players are names the host types;
 * watchers hold a link.
 */
export default function SignIn() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const codeOk = /^\d{6}$/.test(code.trim());

  async function send() {
    setError(null);
    setBusy(true);
    try {
      await sendSignInCode(email.trim());
      setStage('code');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      await verifySignInCode(email.trim(), code);
      // The auth listener in useSession picks the session up from here.
      router.dismissTo('/');
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen title="Not connected" backTo="The group">
        <Text style={[styles.body, { color: t.muted }]}>
          This build has no Supabase project configured, so there is nothing to sign in to. Put
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart
          the server.
        </Text>
      </Screen>
    );
  }

  if (stage === 'code') {
    return (
      <Screen
        title="Enter the code"
        backTo="Sign in"
        footer={
          <>
            <Button
              label={busy ? 'Checking…' : 'Sign in'}
              variant="primary"
              disabled={!codeOk || busy}
              onPress={verify}
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
        <Text style={[styles.body, { color: t.muted }]}>
          We emailed a six-digit code to {email.trim()}.
        </Text>

        <View style={styles.form}>
          <Field
            label="Code"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            keyboardType="number-pad"
            autoFocus
            hint="It expires shortly. Ask for another if it goes stale."
          />
        </View>

        {error !== null && <Text style={[styles.body, { color: t.loss }]}>{error}</Text>}
      </Screen>
    );
  }

  return (
    <Screen
      title="Sign in"
      backTo="The group"
      footer={
        <Button
          label={busy ? 'Sending…' : 'Email me a code'}
          variant="primary"
          disabled={!emailOk || busy}
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
          hint="No password. We email you a six-digit code."
        />
      </View>

      {error !== null && <Text style={[styles.body, { color: t.loss }]}>{error}</Text>}
    </Screen>
  );
}

function message(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  // The library's wording for a wrong or stale code is unhelpfully generic.
  if (/token has expired|invalid/i.test(raw)) {
    return 'That code did not work. It may have expired — ask for another.';
  }
  return raw;
}

const styles = StyleSheet.create({
  body: { ...type.body, fontWeight: '400', lineHeight: 24 },
  form: { marginTop: space.section },
});
