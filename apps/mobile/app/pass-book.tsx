import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import {
  issuePass,
  PassBlockedError,
  passSheet,
  passState,
  watchFromHere,
  withdrawPass,
} from '../src/lib/handover';
import { useNight } from '../src/lib/nightStore';
import { explainServerError, isSupabaseConfigured } from '../src/lib/supabase';
import { useSession } from '../src/lib/useSession';

/**
 * Pass the book — another phone records tonight. NOT DRAWN.
 *
 * ⚠ NO HANDOFF HAS THIS SCREEN, and every string on it is mine rather than the
 * designer's. It is built from C3's parts (the invite sheet: the code as the
 * hero, grouped five and five) because it is the same act — ten characters read
 * across a table — and flagged in `docs/screens.md` for a board and for copy.
 *
 * A SHEET, because it ends in a confirm: the other phone taking it. It never
 * pushes. See `docs/09-navigation.md`.
 *
 * THE CODE WORKS ONLY WHILE THIS IS OPEN. It is withdrawn on the way out, and
 * while it is up nothing can be recorded on this phone — which is what makes
 * the night the other phone reads the whole night. `handover.ts` has the
 * reasoning; `0016_pass_the_book.sql` the rule.
 *
 * Four states:
 *   issuing   asking the server for a code
 *   code      the code, waiting for the other phone
 *   blocked   something is not on the server yet, or no account, or no server
 *   passed    the other phone has it — this phone reads the night from now
 */
export default function PassBook() {
  const t = useTheme();
  const night = useNight();
  const { who, loading } = useSession();
  const sessionId = night?.sessionId ?? null;

  const [stage, setStage] = useState<Stage>('issuing');
  const [code, setCode] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  /* Whether there is a code out to withdraw, and whether it was taken. */
  const issued = useRef(false);
  const done = useRef(false);

  /* Issue the code once the sign-in is known, and withdraw it on the way out
     unless it was taken. */
  useEffect(() => {
    if (loading || sessionId === null) return;
    if (!isSupabaseConfigured) {
      setBlocked('This build has no server, so there is nothing to pass the night through.');
      setStage('blocked');
      return;
    }
    if (who.kind !== 'person') {
      setBlocked('Passing the night goes through the server, so you have to be signed in.');
      setStage('blocked');
      return;
    }

    passSheet.open = true;
    let alive = true;
    void issuePass(sessionId)
      .then((c) => {
        issued.current = true;
        if (!alive) return;
        setCode(c);
        setStage('code');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setBlocked(
          e instanceof PassBlockedError
            ? `${e.waiting} ${e.waiting === 1 ? 'change has' : 'changes have'} not reached the server yet. The other phone reads the night from there, so it has to be all there first. Try again when this phone has signal.`
            : explainServerError(e),
        );
        setStage('blocked');
      });

    return () => {
      alive = false;
      passSheet.open = false;
      if (issued.current && !done.current) void withdrawPass(sessionId).catch(() => undefined);
    };
  }, [loading, who.kind, sessionId]);

  /* Watch for the other phone. Three seconds is long enough to be nothing on a
     server and short enough that the person holding this phone is not left
     wondering whether it worked. */
  useEffect(() => {
    if (stage !== 'code' || sessionId === null) return;
    const timer = setInterval(() => {
      void passState(sessionId)
        .then(async (state) => {
          if (state === 'taken') {
            done.current = true;
            await watchFromHere(sessionId);
            setStage('passed');
          } else if (state === 'gone') {
            // Expired under the open sheet — ten minutes. Say so; do not reissue
            // behind the reader's back.
            setBlocked('The code ran out. Close this and pass the night again.');
            setStage('blocked');
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [stage, sessionId]);

  if (stage === 'passed') {
    return (
      <Sheet
        title="Passed"
        sub={night?.tableName}
        footer={<Button label="Done" variant="primary" onPress={() => router.back()} />}
      >
        <View style={styles.page}>
          <Text style={[styles.note, { color: t.text }]}>
            The other phone is recording this night now. This one follows along and can take it
            back from Settings.
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Pass the book"
      sub={night?.tableName}
      footer={<Button label="Cancel" variant="secondary" onPress={() => router.back()} />}
    >
      <View style={styles.page}>
        <Text style={[styles.eyebrow, { color: t.muted }]}>THE CODE</Text>

        {stage === 'blocked' ? (
          <Text style={[styles.note, { color: t.text }]}>{blocked}</Text>
        ) : (
          <>
            <Text selectable style={[styles.hero, { color: code === null ? t.muted : t.text }]}>
              {code === null ? '· · · · ·  · · · · ·' : grouped(code)}
            </Text>
            <Text style={[styles.note, { color: t.muted }]}>
              On the other phone: Settings → Take over a night. It has to be signed in. The code
              works while this is open, and once.
            </Text>
            <Text style={[styles.note, { color: t.muted }]}>
              From then on that phone records the night and this one follows along. You can take it
              back from Settings at any time.
            </Text>
          </>
        )}
      </View>
    </Sheet>
  );
}

type Stage = 'issuing' | 'code' | 'blocked' | 'passed';

/** "K7M4X P29QT" — two groups of five, as the invite sheet reads it. */
const grouped = (code: string): string => `${code.slice(0, 5)} ${code.slice(5)}`;

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  hero: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.7,
    textAlign: 'center',
    paddingVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  note: { ...type.footnote },
});
