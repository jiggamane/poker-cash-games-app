import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';

/**
 * Where the sign-in link lands — B66.
 *
 * THIS ROUTE HAD NO SCREEN. `authRedirectUrl()` has asked Supabase to send the
 * host to `/auth-callback` since the day sign-in was built, and nothing in
 * `app/` answered to that name: a link that worked opened the app onto
 * expo-router's *Unmatched Route* page, which is a developer's error screen with
 * the app's own navigation nowhere on it. The session installed correctly
 * underneath it, so the host was signed in and looking at a page that said the
 * opposite — and "the link didn't work" is exactly how that is reported.
 *
 * STANDALONE, NO CHROME, for `/claim`'s reason: it arrives from a link, the
 * reader has not been anywhere in the app, and there is nothing behind it to go
 * back to. No chevron, no grabber, no close.
 *
 * IT DOES NOT INSTALL THE SESSION. `_layout.tsx` does, on every URL the app is
 * opened with, because the link can arrive while the app is cold, backgrounded,
 * or on any screen — and only the shell is guaranteed to be mounted. Doing it
 * here as well would be a second implementation of the same exchange, racing
 * the first. This screen only reports what happened.
 */
export default function AuthCallback() {
  const { session, loading } = useSession();
  const url = Linking.useURL();

  /*
   * Supabase reports a refused or expired link in the URL rather than by
   * failing, and `_layout.tsx` deliberately swallows that — it handles every
   * deep link in the app and must not interrupt a host over one it does not
   * recognise. So the message is read again here, where it is the whole point
   * of the screen. Reading is all this does; nothing is exchanged.
   */
  const refusal = url === null ? null : refusalIn(url);

  /*
   * A link that worked should not leave anybody on a page about links. The
   * session arrives asynchronously — `_layout` is mid-exchange while this
   * mounts — so this waits for it rather than deciding on the first render.
   */
  useEffect(() => {
    if (session !== null) router.replace('/');
  }, [session]);

  /*
   * Long enough for the exchange, short enough to not be a wait. Below this,
   * saying "that link did not sign you in" would be a lie about a link that is
   * working — the tokens are still being written to disk.
   */
  const settled = useSettled(loading);

  if (session !== null) return <Landing title="Signed in" line="Taking you back to the club." />;

  if (refusal !== null || settled) {
    return (
      <Landing
        title="That link did not sign you in"
        line={
          refusal ??
          'The link may have already been used, or it may have expired — each one works once.'
        }
        action={
          <Button
            label="Send myself another"
            variant="primary"
            /*
             * Home FIRST, then the sheet. `/sign-in` is Chrome B — a
             * `transparentModal` — and a sheet is a card over something. Replacing
             * this screen with it directly would present that card over nothing,
             * with the ground showing through where the club should be.
             */
            onPress={() => {
              router.replace('/');
              router.push('/sign-in');
            }}
          />
        }
        note="The same email carries a six-digit code, and the code does not depend on the link opening. Typing it on the sign-in screen works when this does not."
      />
    );
  }

  return <Landing title="Signing you in" line="One moment." />;
}

/** Supabase puts the reason in the fragment, and older links in the query. */
function refusalIn(url: string): string | null {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const parsed = Linking.parse(url);
  const said =
    new URLSearchParams(fragment).get('error_description') ??
    (parsed.queryParams?.error_description as string | undefined);
  return said === undefined || said === null || said === '' ? null : said;
}

/** True once the session read has finished and a beat has passed after it. */
function useSettled(loading: boolean): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => setSettled(true), 1200);
    return () => clearTimeout(id);
  }, [loading]);
  return settled;
}

function Landing({
  title,
  line,
  action,
  note,
}: {
  title: string;
  line: string;
  action?: React.ReactNode;
  note?: string;
}) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.body, { color: t.muted }]}>{line}</Text>
        {action !== undefined && <View style={styles.action}>{action}</View>}
        {note !== undefined && <Text style={[styles.note, { color: t.muted }]}>{note}</Text>}
      </View>
    </SafeAreaView>
  );
}

/*
 * `/claim`'s measurements, because this is `/claim`'s classification: the two
 * screens in this app that a link lands on cold, with no chrome of either kind.
 * A second set of numbers for the same object is how two screens that should
 * look identical stop looking identical.
 */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: space.page, gap: 14 },
  title: { ...type.homeTitle },
  body: { ...type.lede },
  action: { marginTop: space.section - 14 },
  note: { ...type.footnote },
});
