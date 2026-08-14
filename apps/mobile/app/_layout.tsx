import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { openNight } from '../src/lib/nightStore';

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
    void openNight().catch(() => {});
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

        {/* Sheets. Each of these ends with one action and then gets out. */}
        <Stack.Screen name="player" options={SHEET} />
        <Stack.Screen name="pick" options={SHEET} />
        <Stack.Screen name="log" options={SHEET} />
        <Stack.Screen name="entry" options={SHEET} />
        <Stack.Screen name="seat" options={SHEET} />
        <Stack.Screen name="bill" options={SHEET} />
        <Stack.Screen name="spend" options={SHEET} />
        <Stack.Screen name="bill-rules" options={SHEET} />
        <Stack.Screen name="kitty-rules" options={SHEET} />
        <Stack.Screen name="house-rules" options={SHEET} />
        <Stack.Screen name="money-rules" options={SHEET} />
        <Stack.Screen name="rule" options={SHEET} />
        <Stack.Screen name="settled" options={SHEET} />
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
