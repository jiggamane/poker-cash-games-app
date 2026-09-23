import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { takeOver } from '../src/lib/handover';
import { explainServerError, isSupabaseConfigured } from '../src/lib/supabase';
import { useSession } from '../src/lib/useSession';

/**
 * Take over a night — the other half of Pass the book. NOT DRAWN.
 *
 * ⚠ NO HANDOFF HAS THIS SCREEN, and its strings are mine. The two five-letter
 * fields are X2d's (`claim.tsx`, typing an invite), because it is the same ten
 * characters from the same alphabet and a person who has typed one has typed
 * both. Flagged in `docs/screens.md`.
 *
 * A SHEET: it ends in a confirm. On success it lands on Tonight for the night
 * it took, which is the confirmation — the table, with this phone's controls on
 * it.
 *
 * SIGNED IN ONLY. The server refuses an anonymous phone (`0016`), and saying so
 * before the reader types ten characters is kinder than after.
 */
export default function TakeOver() {
  const t = useTheme();
  const { who, loading } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const second = useRef<TextInput>(null);

  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const first = code.slice(0, 5);
  const rest = code.slice(5, 10);

  const blocked = !isSupabaseConfigured
    ? 'This build has no server, so there is nothing to take a night from.'
    : !loading && who.kind !== 'person'
      ? 'Recording a night goes through the server, so this phone has to be signed in first.'
      : null;

  async function take() {
    if (busy || code.length !== 10) return;
    setBusy(true);
    setTrouble(null);
    try {
      await takeOver(code);
      router.dismissAll();
      router.push('/session');
    } catch (e) {
      /* The server has one sentence for every dead code — unknown, used,
         withdrawn, expired — on purpose. It is shown as it comes. */
      setTrouble(explainServerError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Take over a night"
      sub="Ten characters, from the phone recording it."
      footer={
        <Button
          label={busy ? 'Taking over…' : 'Take over'}
          variant={code.length === 10 && blocked === null ? 'primary' : 'blocked'}
          disabled={busy || code.length !== 10 || blocked !== null}
          onPress={() => void take()}
        />
      }
    >
      <View style={styles.page}>
        {blocked !== null ? (
          <Text style={[styles.note, { color: t.text }]}>{blocked}</Text>
        ) : (
          <>
            <View style={styles.fields}>
              <TextInput
                style={[styles.field, { backgroundColor: t.surface, borderColor: t.hairline, color: t.text }]}
                value={first}
                onChangeText={(v) => {
                  setCode(clean(v).slice(0, 5) + rest);
                  if (clean(v).length >= 5) second.current?.focus();
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                autoFocus
                accessibilityLabel="First five characters"
              />
              <TextInput
                ref={second}
                style={[styles.field, { backgroundColor: t.surface, borderColor: t.text, color: t.text }]}
                value={rest}
                onChangeText={(v) => setCode(first + clean(v).slice(0, 5))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                accessibilityLabel="Last five characters"
              />
            </View>
            {trouble !== null && <Text style={[styles.note, { color: t.loss }]}>{trouble}</Text>}
            <Text style={[styles.note, { color: t.muted }]}>
              This phone records the night from then on, and the one that passed it follows along.
            </Text>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 12 },
  note: { ...type.footnote },
  fields: { flexDirection: 'row', gap: 10, marginTop: 6 },
  field: {
    flex: 1,
    height: 62,
    borderRadius: 8,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3.36,
    paddingHorizontal: space.rowInset,
  },
});
