import { useSyncExternalStore } from 'react';
import type { Money, PlayerId } from '@poker-club/core';

/**
 * THE REBUY THAT JUST LANDED, for as long as that is still news.
 *
 * A quick rebuy is written on the player card and the card then closes itself,
 * so the confirmation has to survive a screen change: the sentence the host
 * read on the sheet has to be readable again on Tonight, where the money
 * actually moved. Nothing in the ledger can carry that — an entry's timestamp
 * says when it happened, not whether anybody has seen it yet — so it is app
 * state, and this is the whole of it.
 *
 * ONE MARK, NOT A QUEUE. Two rebuys in a row means the second one is the news;
 * the first has already been confirmed on its own sheet and is in the list like
 * every other entry. A queue would put a backlog of green rows on a screen
 * whose job is the table as it is now.
 *
 * WHO CLEARS IT IS THE POINT OF THE DESIGN. The mark is set when the row is
 * written and cleared by the screen that has finished SHOWING it — Tonight,
 * once its two seconds are up. The clock is therefore the reader's, not the
 * writer's: the sheet holds the green for the second or so it has left before
 * it closes, and Tonight then gets its own full two seconds from when it
 * appears. Expiring on a single timestamp instead would have made the strip a
 * flash on arrival, because most of the two seconds would already have been
 * spent on a screen that had gone.
 */
export interface JustAdded {
  playerId: PlayerId;
  amount: Money;
  /** When it was written. Only the staleness guard below reads it. */
  at: number;
}

/** How long the mark is held at full strength, once a screen is showing it. */
export const JUST_ADDED_MS = 2_000;

/** And how long it takes to go, so it fades rather than blinking out. */
export const JUST_ADDED_FADE_MS = 350;

/*
 * A MARK NOBODY CAME BACK FOR IS NOT NEWS.
 *
 * Tonight clears the mark, and Tonight is where the host lands — but not
 * always, and not always soon: a rebuy held on a card reached from a deep link,
 * a phone locked mid-hold, a host who swiped down and went to the bill instead.
 * Without this, the next visit to Tonight — minutes or an hour later — would
 * announce a rebuy as though it had just happened.
 *
 * Thirty seconds is well past any honest reading of "just now" and well past
 * the slowest route between the two screens.
 */
const STALE_MS = 30_000;

let mark: JustAdded | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const l of listeners) l();
};

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const snapshot = (): JustAdded | null => mark;

/** Written a rebuy. It is news until a screen has shown it. */
export function markAdded(playerId: PlayerId, amount: Money): void {
  mark = { playerId, amount, at: Date.now() };
  emit();
}

/** Shown it. Called by the screen that ran the two seconds out. */
export function clearAdded(): void {
  if (mark === null) return;
  mark = null;
  emit();
}

/**
 * The rebuy that just landed, or null.
 *
 * The staleness guard is applied on the way OUT rather than by a timer: a
 * stale mark is simply not returned, and it is cleared by whatever screen
 * would have shown it. That keeps this module free of a timer that would have
 * to be cancelled, and it means the answer cannot depend on whether anything
 * happened to be mounted while the clock ran.
 */
export function useJustAdded(): JustAdded | null {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (current === null) return null;
  return Date.now() - current.at > STALE_MS ? null : current;
}

/** What both screens say. One place, so the two cannot drift. */
export const addedLead = (name: string): string => `${name} added`;
