import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which theme is on screen, and the one control that changes it.
 *
 * The theme used to be the OS's decision alone. The home handoff § 3 puts a
 * theme button in the dock of every state — one tap, dark to light and back,
 * no menu and no trip to Settings — so the app needs an answer of its own that
 * can disagree with the phone's.
 *
 * Three values, and the difference between them matters:
 *
 *   'system'  — follow the phone, which is what a fresh install does.
 *   'dark' | 'light' — the reader has pressed the button, and their choice
 *                      outranks the phone until they press it again.
 *
 * A choice is remembered across launches. It is written asynchronously and
 * read once at startup: nothing on screen waits for the disk, so the first
 * frame paints in the phone's theme and switches when the stored answer lands.
 * That is a flash on cold launch for a reader who chose the opposite of their
 * phone, and it is the price of not blocking first paint on I/O.
 */

export type ThemeChoice = 'system' | 'dark' | 'light';
export type ThemeName = 'dark' | 'light';

const KEY = 'theme.choice';

let choice: ThemeChoice = 'system';
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const l of listeners) l();
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const snapshot = (): ThemeChoice => choice;

/** Read from disk once, at startup. Never throws: an unreadable store is 'system'. */
export async function loadThemeChoice(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored === 'dark' || stored === 'light') {
      choice = stored;
      emit();
    }
  } catch {
    // A phone that cannot read its own preferences still has a working app.
  }
}

/** What the reader has asked for, before the phone's own setting is applied. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Flip to the other theme.
 *
 * Always lands on an explicit 'dark' or 'light' — never back to 'system' —
 * because the button's job is to give the reader the theme they can see on the
 * icon. `showing` is what is on screen now, so the first press from 'system'
 * flips away from whatever the phone was doing rather than doing nothing.
 */
export function toggleTheme(showing: ThemeName): void {
  choice = showing === 'dark' ? 'light' : 'dark';
  emit();
  void AsyncStorage.setItem(KEY, choice).catch(() => {});
}
