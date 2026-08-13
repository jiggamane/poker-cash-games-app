import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { sheetPresentation } from '../src/components/Sheet';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { drain } from '../src/lib/sync';
import { supabase } from '../src/lib/supabase';
import { parseShareLink } from '../src/lib/shareLink';
import { openNight } from '../src/lib/nightStore';

/**
 * Every screen you open to DO one thing, per the classification in
 * 09-navigation.md § Every screen, classified.
 *
 * Read it as the rule that produced it: each of these ends in a Save, an Add,
 * an Apply or a confirm, and leaves you exactly where you were. Everything else
 * — the night, the close flow, settings, a settled record — is a place you can
 * stay in, so it is pushed.
 */
const SHEETS = [
  'player', // T2 / T4 · the player card, over Tonight
  'pick', // N4 / N8 · who is this about
  'log', // N5 / N6 / N9 · the amount keypads
  'entry', // N10 · correct an entry
  'seat', // N7 · seat a new player
  'house-rules', // B1 · what tonight will take off the table
  'expenses', // B2 / B4 · the bill
  'add-expense', // B3 · a new expense
  'new-session', // O1 / O2 · open a table, and who is at it
  'money-rules', // O4 · tonight's money rules
  'rule', // O5 · the rule editor
  'sign-in', // ends in "email me a link"; over Settings
] as const;

/**
 * The navigation shell.
 *
 * NO TAB BAR — the design is explicit about this. The group is the root, and
 * the session and the book are pushed on top of it, so the club is always one
 * tap back rather than one tab across.
 *
 * Headers are off everywhere: every screen draws its own large title top-left,
 * with rev 9's round back sitting on that same line. A stock navigation bar
 * would sit above all of that and duplicate it.
 */
export default function RootLayout() {
  const t = useTheme();

  // Read the night off the device once, at the root, so every screen finds it
  // already there. It comes from SQLite, not the network — the app is fully
  // usable with no connection and no account.
  useEffect(() => {
    void openNight().catch(() => {});
  }, []);

  /*
   * Two moments worth draining on, beyond after every write.
   *
   * Coming back to the foreground is when a phone that spent the evening in
   * somebody's pocket rejoins the wifi — and signing in is when a queue that
   * has been filling with no account suddenly has somewhere to go. Neither
   * blocks anything: a failed drain leaves the queue exactly where it was.
   */
  useEffect(() => {
    void drain().catch(() => {});

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drain().catch(() => {});
    });
    const { data } = supabase.auth.onAuthStateChange(() => {
      void drain().catch(() => {});
    });

    return () => {
      sub.remove();
      data.subscription.unsubscribe();
    };
  }, []);

  // Both kinds of link come back into the app here — the host's sign-in link
  // and the watcher's share link. It has to be handled at the root: a link can
  // arrive while the app is cold, backgrounded, or sitting on any screen, and
  // only the shell is guaranteed to be mounted.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;

    // A watcher's link is a destination, so it navigates rather than being
    // silently absorbed. Redeeming happens on the screen it lands on, which is
    // also where the failures are worth reading — a revoked link should say so
    // somewhere the person holding it can see.
    const token = parseShareLink(url);
    if (token !== null) {
      router.push({ pathname: '/watch', params: { t: token } });
      return;
    }

    void completeSignInFromUrl(url).catch(() => {
      // A stale or already-used link. useSession stays signed out and the
      // sign-in screen remains available; nothing to interrupt the host with.
    });
  }, [url]);

  return (
    <SafeAreaProvider>
      <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.ground },
          animation: 'slide_from_right',
        }}
      >
        {/*
          The classification from 09-navigation.md, in one place.

          Anything not listed is a push and needs no declaration. Listing the
          sheets here rather than per screen is deliberate: the rule is about
          the app's shape, not about any one screen, and a route that quietly
          disagreed with its own chrome would be invisible in review.
        */}
        {SHEETS.map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{ ...sheetPresentation, contentStyle: { backgroundColor: t.sheetGround } }}
          />
        ))}
      </Stack>
    </SafeAreaProvider>
  );
}
