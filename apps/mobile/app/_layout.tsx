import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { loadClubs } from '../src/lib/clubStore';
import { openNight } from '../src/lib/nightStore';
import { loadThemeChoice } from '../src/lib/themeStore';

/**
 * The navigation shell. 09-navigation.md.
 *
 * NO TAB BAR, ever. The club is the root and the only permanent screen.
 *
 * Every other screen is one of two things, and the list below is where that is
 * decided: a screen you navigate TO is PUSHED (Chrome A, `Screen`), and a
 * screen you open to do ONE THING is a SHEET (Chrome B, `Sheet`). The test:
 * if it ends with a Save, an Add, an Apply or a confirm, it is a sheet; if it
 * is a place you can stay in, it is a push.
 *
 * A sheet is a transparent modal because the design's scrim is not opaque —
 * what is behind sits at .32 and stays visible, which is what tells you the
 * thing underneath is still there and still yours.
 *
 * Headers are off everywhere: each chrome draws its own.
 */
const SHEET = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
  contentStyle: { backgroundColor: 'transparent' },
} as const;
export default function RootLayout() {
  const t = useTheme();

  // Read the night off the device once, at the root, so every screen finds it
  // already there. It comes from SQLite, not the network — the app is fully
  // usable with no connection and no account.
  useEffect(() => {
    /*
     * A FAILURE HERE MUST NOT BE SILENT. If the database cannot be opened the
     * app still renders — the home card reads "Set up the game", because that
     * is what it shows when there is no night — and every screen behind it is
     * inert, with nothing anywhere saying why. That is indistinguishable from
     * a working first run right up until the host tries to seat somebody.
     */
    void openNight()
      .then((night) =>
        /*
         * THE CLUB IS LOADED HERE TOO, for the same reason and one more.
         * Every screen below home reads `useClub` — the setup sheet, the
         * rules, the roster — and nothing loads it but the screen that
         * happens to be first. That held only while home was guaranteed to
         * be first, which a deep link, a restored route or a notification
         * are each enough to break; the screen then renders its empty state
         * for ever, with no error and no way forward.
         *
         * It is chained rather than parallel because the club seeds itself
         * from tonight the first time — the players at that table are its
         * roster — so it has to know the night before it asks.
         */
        loadClubs({
          name: night.groupName,
          players: night.players.map((p) => ({ id: p.id, name: p.name })),
          rules: night.rules,
          ...(night.meId === undefined ? {} : { meId: night.meId }),
        }),
      )
      .catch((e) => {
        console.error('openNight failed — the app has no local database', e);
      });
  }, []);

  // Whether the reader has overridden the phone's theme. Read once, here, for
  // the same reason: every screen asks for it and none of them should wait.
  useEffect(() => {
    void loadThemeChoice();
  }, []);

  // The sign-in link comes back into the app here. It has to be handled at the
  // root: the link can arrive while the app is cold, backgrounded, or sitting
  // on any screen, and only the shell is guaranteed to be mounted.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
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
        {/* Root, and pushes: the club, the night, the ending flow, settings. */}
        <Stack.Screen name="index" />
        <Stack.Screen name="session" />
        <Stack.Screen name="count-up" />
        <Stack.Screen name="stands" />
        <Stack.Screen name="deductions" />
        <Stack.Screen name="settle-up" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="games" />
        <Stack.Screen name="groups" />
        <Stack.Screen name="players" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="club-rules" />
        {/*
         * X1 is a PUSH, not a root (S77). There is no watcher's install: every
         * install is a host install with a book in it, so a share link opens
         * the club and pushes the night on top of it, and back returns to the
         * club exactly as it does from Tonight. This supersedes the "Root, for
         * a watcher's install" row in `09-navigation.md`.
         */}
        <Stack.Screen name="watch" />
        {/*
         * X1c is a PUSH. This was a sheet under 1C (rev 10); rev 15 redraws the
         * settled night as Chrome A, and the classification follows the layout:
         * it is a place you stay and read, not something you confirm and
         * dismiss.
         */}
        <Stack.Screen name="settled" />

        {/* Sheets. Each of these ends with one action and then gets out. */}
        <Stack.Screen name="player" options={SHEET} />
        <Stack.Screen name="pick" options={SHEET} />
        <Stack.Screen name="log" options={SHEET} />
        <Stack.Screen name="entry" options={SHEET} />
        <Stack.Screen name="seat" options={SHEET} />
        <Stack.Screen name="bill" options={SHEET} />
        <Stack.Screen name="spend" options={SHEET} />
        <Stack.Screen name="bill-rules" options={SHEET} />
        <Stack.Screen name="piggy-bank-rules" options={SHEET} />
        <Stack.Screen name="house-rules" options={SHEET} />
        <Stack.Screen name="money-rules" options={SHEET} />
        <Stack.Screen name="rule" options={SHEET} />
        <Stack.Screen name="sign-in" options={SHEET} />
        <Stack.Screen name="member" options={SHEET} />
        <Stack.Screen name="new-group" options={SHEET} />
        <Stack.Screen name="new-night" options={SHEET} />
        {/* C3, over Players. Its reset and its QR replace this sheet's own
            content rather than stacking a second one on top (S79). */}
        <Stack.Screen name="invite" options={SHEET} />

        {/*
         * X2 is NEITHER. It is the one screen in the app with no chrome at all:
         * it arrives from a link, the reader has not been anywhere, and there
         * is nothing behind it — no chevron, no grabber, and deliberately no
         * close. Presenting it as a card would give it a dismiss gesture that
         * leads nowhere.
         */}
        <Stack.Screen name="claim" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
