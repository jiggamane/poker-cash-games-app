import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { previewInvite, redeemInvite, type InvitePreview } from '../src/lib/invites';
import { dropSampleNight, setWhoAmI } from '../src/lib/nightStore';
import { pullBooks } from '../src/lib/pull';
import { isSupabaseConfigured } from '../src/lib/supabase';

/**
 * X2 · Claim your place.
 *
 * Standalone, no chrome — rev 9 classifies it that way because it is where a
 * link lands rather than somewhere you navigate to. There is no back button on
 * purpose: the person reading it has not been anywhere yet.
 *
 * WHAT IT PROMISES, AND WHAT IT DOES NOT. It says the seat and the nights are
 * already there, because they are — the member row has been in the host's book
 * the whole time and every night is already attached to it. It never says the
 * reader can record anything. Only the host writes to a book, before and after
 * claiming, and the third line on the card says so plainly rather than leaving
 * somebody to discover it when a buy-in will not save.
 *
 * The code is shown before it is spent: `previewInvite` reads two strings out
 * of a book the reader otherwise cannot see, so "you have been added as Petr"
 * can be true on the screen before anything is committed. A code that is
 * unknown, spent, revoked or expired fails the same way and says the same
 * sentence, so somebody holding a guess learns nothing from which way it broke.
 */
export default function Claim() {
  const t = useTheme();
  const { c } = useLocalSearchParams<{ c?: string }>();

  const [code, setCode] = useState(c ?? '');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [state, setState] = useState<'typing' | 'checking' | 'ready' | 'claiming' | 'dead'>(
    c === undefined ? 'typing' : 'checking',
  );
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') return;

    setState('checking');
    setError(null);
    try {
      const found = await previewInvite(trimmed);
      if (found === null) {
        setState('dead');
        return;
      }
      setPreview(found);
      setState('ready');
    } catch (e) {
      setState('dead');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // A code that arrived in a link is checked without being asked for. One that
  // is typed waits for the button, because checking every keystroke would ask
  // the server ten questions to answer one.
  useEffect(() => {
    if (c !== undefined) void check(c);
  }, [c, check]);

  /**
   * Take the seat, then tell the phone whose figures these are.
   *
   * `setWhoAmI` is the local half and it matters as much as the server half:
   * My stats has always been about one name on this device, and a claim is the
   * first time the app can know that name for certain rather than by asking.
   */
  async function claim() {
    if (preview === null) return;
    setState('claiming');
    setError(null);
    try {
      await redeemInvite(code.trim());

      // The seat first, then everything behind it. The sample night goes only
      // if it is all this phone has — a host claiming their own place keeps
      // every night they have played, sample included.
      await dropSampleNight();
      await setWhoAmI(preview.playerName);

      // "Your nights are already here" has to be true by the time the group
      // opens. A failure leaves the claim standing — it is already made on the
      // server — and Settings can fetch again.
      await pullBooks().catch(() => ({ added: 0, books: 0 }));

      router.replace('/');
    } catch (e) {
      setState('ready');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Bare>
        <Text style={[styles.body, { color: t.muted }]}>
          This build has no server configured, so there is nothing to claim.
        </Text>
      </Bare>
    );
  }

  if (state === 'typing' || state === 'dead') {
    return (
      <Bare>
        <Text style={[styles.eyebrow, { color: t.muted }]}>Claim your place</Text>
        <Text style={[styles.title, { color: t.text }]}>Your code</Text>
        <Text style={[styles.body, { color: t.muted }]}>
          Ten characters, from whoever runs your game. It works once.
        </Text>

        <View style={styles.form}>
          <Field
            label="Invite code"
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              if (state === 'dead') setState('typing');
            }}
            placeholder="K7M2QX4RTB"
            autoCapitalize="none"
            autoFocus={state === 'typing'}
          />

          {state === 'dead' && (
            <Text style={[styles.body, { color: t.loss }]}>
              {error ?? 'That code does not open anything. Ask for a new one.'}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            label="Check the code"
            variant="primary"
            disabled={code.trim().length === 0}
            onPress={() => void check(code)}
          />
        </View>
      </Bare>
    );
  }

  if (state === 'checking' || preview === null) {
    return (
      <Bare>
        <Text style={[styles.body, { color: t.muted }]}>Checking the code…</Text>
      </Bare>
    );
  }

  return (
    <Bare>
      {/* The card X2 draws: who added you and as whom, then the group's name
          at full size, because the group is what you are being handed. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.eyebrow, { color: t.muted }]}>
          You have been added as {preview.playerName}
        </Text>
        <Text style={[styles.group, { color: t.text }]}>{preview.groupName}</Text>
      </View>

      <View style={styles.promises}>
        <Promise text="Your seat and your nights are already here" />
        <Promise text="Your net carries across every night" />
        <Promise text="Only the host writes to the book" quiet />
      </View>

      <View style={[styles.aside, { borderColor: t.dashed }]}>
        <Text style={[styles.asideText, { color: t.muted }]}>
          This code is yours alone and works once. On a second phone it asks the host for a new one.
        </Text>
      </View>

      {error !== null && <Text style={[styles.body, { color: t.loss }]}>{error}</Text>}

      <View style={styles.footer}>
        <Button
          label={state === 'claiming' ? 'Opening…' : 'This is me · open the group'}
          variant="primary"
          disabled={state === 'claiming'}
          onPress={() => void claim()}
        />
      </View>
    </Bare>
  );
}

/** One line of what claiming actually gets you, over a hairline. */
function Promise({ text, quiet = false }: { text: string; quiet?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.promise, { borderTopColor: t.hairline }]}>
      <Text style={[styles.promiseText, { color: quiet ? t.muted : t.text }]}>{text}</Text>
    </View>
  );
}

/**
 * No chrome at all — not Chrome A, not Chrome B.
 *
 * Neither vocabulary applies: there is nothing behind this screen to go back
 * to and nothing to dismiss it onto. It is the first thing somebody sees of
 * this app, and it is the only screen in it drawn this way.
 */
function Bare({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: space.page, paddingTop: 30, paddingBottom: 20 },

  eyebrow: { ...type.label, paddingBottom: 12 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.1, paddingBottom: 10 },
  body: { ...type.footnote, paddingHorizontal: 4, paddingBottom: 6 },

  card: {
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    marginBottom: 20,
  },
  group: { fontSize: 38, fontWeight: '800', letterSpacing: -1.3, lineHeight: 39 },

  promises: { marginHorizontal: 2 },
  promise: { paddingVertical: 15, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth },
  promiseText: { fontSize: 16, fontWeight: '500' },

  aside: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.pressable,
  },
  asideText: type.footnote,

  form: { paddingTop: 18 },
  footer: { marginTop: 'auto', paddingTop: 20 },
});
