import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * How a past session is being read, and it is a preference rather than a place.
 *
 * `design/handoff-session-views/`, cut 9 September. One control in the meta
 * line switches how the SAME list is read: settled nets with every spend
 * itemised, settled nets with the spends collapsed to one figure, or the poker
 * result before any spend. The rank line never moves between them — only the
 * annotation under each name and the block under the table.
 *
 * **PERSISTED PER USER, NOT PER SESSION** — the handoff's own rule, and the
 * reason this is a store rather than a `useState` on the screen. A person who
 * reads their nights one way reads all of them that way; reopening a night in
 * a view they did not choose is the screen forgetting something it was told.
 * It survives launches for the same reason.
 *
 * Written asynchronously and read once at startup, exactly like
 * `themeStore` — nothing on screen waits for the disk. A session opened in the
 * first frames of a cold launch shows the default and switches when the stored
 * answer lands, which is a change under the reader's eyes on the one screen
 * they are least likely to be looking at that early.
 */

export type SessionView =
  /** Settled nets, every spend itemised per player. The default. */
  | 'finalDetailed'
  /** Settled nets, spends collapsed to one figure. */
  | 'finalGrouped'
  /** Chips in, chips out — the result BEFORE spends, and it sums to zero. */
  | 'onTable';

const KEY = 'session.view';
const VALUES: readonly SessionView[] = ['finalDetailed', 'finalGrouped', 'onTable'];

const is = (v: unknown): v is SessionView =>
  typeof v === 'string' && (VALUES as readonly string[]).includes(v);

/**
 * `finalDetailed` on a fresh install — the handoff's default, and the honest
 * one: where the money actually left a person is the figure they argue about,
 * and the itemised line is what makes it checkable without a tap.
 */
let view: SessionView = 'finalDetailed';
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

const snapshot = (): SessionView => view;

/** Read from disk once, at startup. Never throws: an unreadable store is the default. */
export async function loadSessionView(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (is(stored)) {
      view = stored;
      emit();
    }
  } catch {
    // A phone that cannot read its own preferences still has a working app.
  }
}

export function useSessionView(): SessionView {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function setSessionView(next: SessionView): void {
  if (next === view) return;
  view = next;
  emit();
  void AsyncStorage.setItem(KEY, next).catch(() => {});
}

/**
 * The control's own label, which is always the ACTIVE view's name and never a
 * static word — the handoff is explicit about that, and it is what makes the
 * closed control readable as a state rather than as a menu button.
 */
export function sessionViewLabel(v: SessionView): string {
  switch (v) {
    case 'finalDetailed':
      return 'Final, detailed';
    case 'finalGrouped':
      return 'Final, grouped';
    case 'onTable':
      return 'On table';
  }
}

/** The line under each label in the open menu. */
export function sessionViewHint(v: SessionView): string {
  switch (v) {
    case 'finalDetailed':
      return 'every spend itemised';
    case 'finalGrouped':
      return 'spends as one figure';
    case 'onTable':
      return 'chips in, chips out';
  }
}

/** The three, in the order the menu draws them. */
export const SESSION_VIEWS = VALUES;
