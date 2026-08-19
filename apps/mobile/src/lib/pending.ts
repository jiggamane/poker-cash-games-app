import { useEffect, useSyncExternalStore } from 'react';
import { outbox } from './sync';

/**
 * Which entries are written down but have not reached anyone else yet — N11.
 *
 * A QUEUED ENTRY IS NOT A PENDING ENTRY. It is written, it is counted, and the
 * total on Tonight already includes it: the host recorded money and the app
 * agreed. What has not happened is the rest of the table seeing it. That is
 * the whole distinction the mark carries, and it is why the mark sits on the
 * row rather than over the figure — a screen that greyed the amount would be
 * saying the money is in doubt, and it is not.
 *
 * The queue is the outbox, which is durable and survives a force-quit, so this
 * is a read of it rather than a second list that could disagree. `entry.append`
 * only: a session or a player still in the queue is not a line anybody is
 * looking at.
 */

interface Pending {
  /** Entry ids the queue is still holding. */
  ids: ReadonlySet<string>;
  /** How many, for the dock. */
  waiting: number;
}

const NONE: Pending = { ids: new Set(), waiting: 0 };

let state: Pending = NONE;
const listeners = new Set<() => void>();

/** More than any real night queues; the outbox wants a bound, not a page. */
const ALL = 5_000;

const emit = (): void => {
  for (const l of listeners) l();
};

const same = (a: Pending, b: Pending): boolean =>
  a.waiting === b.waiting && [...a.ids].every((id) => b.ids.has(id));

/**
 * Re-read the queue. Cheap — one indexed SELECT — and it does nothing when the
 * answer has not changed, so the screens holding it do not re-render every
 * few seconds for nothing.
 */
export async function refreshPending(sessionId?: string): Promise<void> {
  const items = await outbox.pending(ALL).catch(() => []);
  const mine = items.filter(
    (i) => i.kind === 'entry.append' && (sessionId === undefined || i.sessionId === sessionId),
  );
  const next: Pending = { ids: new Set(mine.map((i) => i.id)), waiting: mine.length };
  if (same(state, next)) return;
  state = next;
  emit();
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const snapshot = (): Pending => state;

/** How often a screen showing the mark asks again. */
const EVERY = 4_000;

/**
 * The queue for one night, kept current while a screen is looking at it.
 *
 * It polls rather than being told, because the things that empty the queue —
 * a drain that finally reached the server, an app resumed with a signal — do
 * not all go through one call this module could hook. Four seconds is slower
 * than a person notices and far cheaper than the SELECT it runs.
 */
export function usePending(sessionId?: string): Pending {
  useEffect(() => {
    let live = true;
    const ask = (): void => {
      if (live) void refreshPending(sessionId);
    };
    ask();
    const timer = setInterval(ask, EVERY);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
