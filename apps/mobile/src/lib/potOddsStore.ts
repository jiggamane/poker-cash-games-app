import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether the odds calculator shows POT ODDS — an experiment, off by default.
 *
 * Decided 24 October on the canvas: the owner wants to see whether it is fun and
 * useful before it is anything more, so it lives behind one setting under
 * Settings → Odds calculator and the odds screen is exactly what it was while it
 * is off. A preference of this phone, not of the group: nothing about it is
 * money in the ledger, nothing about it needs to reach the server, and a
 * second phone at the same table can have it on or off for itself.
 *
 * Kept exactly as `themeStore` keeps the theme: read once at startup, written
 * asynchronously, nothing waits for the disk. A reader who turned it on sees the
 * screen without it for the first frames of a cold launch.
 */

const KEY = 'odds.potOdds';

let on = false;
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

const snapshot = (): boolean => on;

/** Read from disk once, at startup. Never throws: an unreadable store is "off". */
export async function loadPotOdds(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(KEY)) === 'on') {
      on = true;
      emit();
    }
  } catch {
    // A phone that cannot read its own preferences still has a working app.
  }
}

/** Whether pot odds are switched on. */
export function usePotOdds(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function setPotOdds(next: boolean): void {
  on = next;
  emit();
  void (next ? AsyncStorage.setItem(KEY, 'on') : AsyncStorage.removeItem(KEY)).catch(() => {});
}
