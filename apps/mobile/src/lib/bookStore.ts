import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Period } from './myStats';

/**
 * HOW THE BOOK IS BEING READ — which group, and over what stretch.
 *
 * `design/handoff-sessions-stats/`, cut 9 September. Both are **persisted per
 * user and shared by both screens**, which is the handoff's own state note and
 * the reason they are a store rather than two `useState`s: Sessions and My
 * stats are one book read two ways, and a reader who scopes to one club on one
 * of them has scoped the book, not the screen. Walking between the two and
 * finding the scope reset is the app forgetting something it was told.
 *
 * `month` is the default period — S48, and it is the honest one: the figure a
 * person wants at 1am is what this month has done to them, not what the year
 * has.
 *
 * `all` is the default scope, because a fresh reader has no reason to prefer
 * one of their clubs and the screens both say which they are showing.
 *
 * Written asynchronously and read once at startup, exactly like `themeStore`
 * and `sessionViewStore`: nothing on screen waits for the disk.
 */

/** `all`, or one group's own name. The app has no group ids on a night yet. */
export type Scope = string;
export const ALL_GROUPS: Scope = 'all';

const SCOPE_KEY = 'book.scope';
const PERIOD_KEY = 'book.period';
const PERIODS: readonly Period[] = ['month', 'year', 'all'];

const isPeriod = (v: unknown): v is Period =>
  typeof v === 'string' && (PERIODS as readonly string[]).includes(v);

let scope: Scope = ALL_GROUPS;
let period: Period = 'month';
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

/** Read from disk once, at startup. Never throws: an unreadable store is the default. */
export async function loadBook(): Promise<void> {
  try {
    const [storedScope, storedPeriod] = await Promise.all([
      AsyncStorage.getItem(SCOPE_KEY),
      AsyncStorage.getItem(PERIOD_KEY),
    ]);
    /*
     * A STORED SCOPE IS NOT CHECKED AGAINST THE GROUPS THAT EXIST, and it must
     * not be: this runs before any night is read, and a club whose name has not
     * loaded yet would be silently reset to `all`. The screens filter on it and
     * a scope that matches nothing draws an empty list, which is recoverable
     * from the control itself.
     */
    if (typeof storedScope === 'string' && storedScope !== '') scope = storedScope;
    if (isPeriod(storedPeriod)) period = storedPeriod;
    emit();
  } catch {
    // A phone that cannot read its own preferences still has a working app.
  }
}

const scopeSnapshot = (): Scope => scope;
const periodSnapshot = (): Period => period;

export function useScope(): Scope {
  return useSyncExternalStore(subscribe, scopeSnapshot, scopeSnapshot);
}

export function usePeriod(): Period {
  return useSyncExternalStore(subscribe, periodSnapshot, periodSnapshot);
}

export function setScope(next: Scope): void {
  if (next === scope) return;
  scope = next;
  emit();
  void AsyncStorage.setItem(SCOPE_KEY, next).catch(() => {});
}

export function setPeriod(next: Period): void {
  if (next === period) return;
  period = next;
  emit();
  void AsyncStorage.setItem(PERIOD_KEY, next).catch(() => {});
}

/** `All groups`, or the group's own name. The control's label. */
export const scopeLabel = (s: Scope): string => (s === ALL_GROUPS ? 'All groups' : s);
