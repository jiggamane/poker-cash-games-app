import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, type } from '../src/design/tokens';
import { supabase } from '../src/lib/supabase';
import { clearMemberships } from '../src/lib/membershipStore';
import { myName, nameRefusal, setMyName } from '../src/lib/account';

/**
 * Your name — N1–N3 and N5 of `design/handoff-account-and-names/`, approved by
 * the owner on 9 November.
 *
 * REQUIRED, the owner's word: an account with an email is asked the moment its
 * first sign-in lands (`auth-callback.tsx`), for an invite and a promo code
 * alike, and cannot go on without one. Since 0030 the server agrees — a group
 * cannot be started by an account with no name.
 *
 * Chrome B is never broken to make that true: the sheet keeps its close, and
 * closing it while the account still has no name signs the phone out again.
 * Opened from Settings → Name (N5), the account already has one, and the close
 * is an ordinary close.
 */
export default function YourName() {
  const t = useTheme();
  const [known, setKnown] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    void myName()
      .then((n) => {
        setKnown(n);
        if (n !== null) setName(n);
      })
      .catch(() => setKnown(null));
  }, []);

  const required = known === null;

  function close() {
    if (required) {
      clearMemberships();
      void supabase.auth.signOut();
    }
    router.back();
  }

  async function save() {
    setSaving(true);
    setRefusal(null);
    try {
      await setMyName(name);
      router.back();
    } catch (e) {
      setRefusal(nameRefusal(e instanceof Error ? e.message : ''));
      setSaving(false);
    }
  }

  const empty = name.trim() === '';

  return (
    <Sheet
      title="Your name"
      onClose={close}
      footer={<Button label={saving ? 'Saving…' : 'Save'} onPress={() => void save()} disabled={empty || saving} />}
    >
      <View style={styles.body}>
        <Text style={[styles.lede, { color: t.text }]}>
          How the people you play with see you when you run a game.
        </Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setRefusal(null);
          }}
          placeholder="Lena"
          placeholderTextColor={t.muted}
          autoCapitalize="words"
          autoFocus={required}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!empty && !saving) void save();
          }}
          style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.hairline }]}
        />
        {refusal !== null && <Text style={[styles.refusal, { color: t.text }]}>{refusal}</Text>}
        {/* ⚠ UNSURE on the board. Only while the account has no name. */}
        {required && (
          <Text style={[styles.foot, { color: t.muted }]}>
            Closing this signs the phone out again. An account needs a name.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  lede: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  refusal: { fontSize: 13, fontWeight: '500', lineHeight: 18.9 },
  foot: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
});
