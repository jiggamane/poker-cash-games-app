import { useSyncExternalStore } from 'react';
import type { Money, PlayerId } from '@poker-club/core';

/**
 * WHAT A REBUY IS ANNOUNCING RIGHT NOW — the state behind `RebuyConfirmation`.
 *
 * It is a module store and not a piece of state on Tonight, for two reasons
 * and both of them are the handoff's:
 *
 *   - the rebuy is TAPPED ON ONE SCREEN AND CONFIRMED ON ANOTHER. The player
 *     sheet writes the entry and dismisses itself; the confirmation belongs to
 *     the table underneath, which was never told anything happened.
 *   - TWO TAPS INSIDE TWO SECONDS ARE ONE ANNOUNCEMENT. Collapsing them needs
 *     somewhere that survives the sheet going away and knows what the last one
 *     said.
 *
 * NOTHING IN HERE TOUCHES THE LEDGER, and that is deliberate: this file has no
 * import that a test cannot run, so the collapse rule and the two clocks are
 * held by real tests rather than by reading the source. The writing half —
 * the rebuy itself, and the void that Undo appends against it — stays with the
 * screens that do it.
 */

export interface RebuyAnnouncement {
  playerId: PlayerId;
  /** Their name, captured at the tap: the bar names them in a sentence. */
  name: string;
  /** Everything this bar is announcing — one rebuy, or two collapsed. */
  amount: Money;
  /** What Undo voids. One id per tap, oldest first. */
  entryIds: readonly string[];
  /** The bar is on its way out: 160ms, and Undo has died with it. */
  leaving: boolean;
  /**
   * Bumped on every fresh announcement AND every collapse. The three drawn
   * parts each restart their own clock off it, which is what "the 2s timer
   * restarts" means for a second rebuy landing under a bar that is already up.
   */
  token: number;
}

/**
 * How long the bar holds at full strength, measured from the tap.
 *
 * The handoff's table: the sheet is gone by 300ms and the confirmation is at
 * full strength there, the bar holds until 2300, then leaves in 160. Undo is
 * live for the whole of that hold and dies with the bar.
 */
export const BAR_LIVE_MS = 2300;
export const BAR_LEAVE_MS = 160;
/** The two tags fade to zero across the bar's hold — 300 → 2300. */
export const TAG_FADE_MS = 2000;
/** In: the tags peak instantly on arrival, the bar rises under them. */
export const TAG_IN_MS = 180;
export const BAR_IN_MS = 200;

let live: RebuyAnnouncement | null = null;
let token = 0;
let leaveTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
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
const snapshot = (): RebuyAnnouncement | null => live;

const stopClocks = (): void => {
  if (leaveTimer !== null) clearTimeout(leaveTimer);
  if (clearTimer !== null) clearTimeout(clearTimer);
  leaveTimer = null;
  clearTimer = null;
};

const startClocks = (): void => {
  stopClocks();
  leaveTimer = setTimeout(() => {
    if (live === null) return;
    live = { ...live, leaving: true };
    emit();
  }, BAR_LIVE_MS);
  clearTimer = setTimeout(() => {
    live = null;
    emit();
  }, BAR_LIVE_MS + BAR_LEAVE_MS);
};

/** What is being confirmed right now, or null — which is nearly always. */
export const currentAnnouncement = (): RebuyAnnouncement | null => live;

export function useRebuyAnnouncement(): RebuyAnnouncement | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Say that a rebuy has landed. Called from the tap, after the write.
 *
 * TWO IN A ROW COLLAPSE INTO ONE BAR — the handoff's rapid-tap rule, and the
 * only reason this is a store rather than a piece of state on Tonight. A
 * second rebuy for the same player while the bar is still up adds its figure
 * to the one on the bar, keeps both entry ids so Undo reverses both, and
 * restarts the clock. Two bars stacking up, or one replacing another mid-fade,
 * would be the same event announced twice.
 *
 * ⚠ A SECOND PLAYER REPLACES THE BAR RATHER THAN JOINING IT, and that is not
 * drawn: the handoff's collapsed copy names one person — "Petr rebought $1,000
 * · 2 entries" — so there is no sentence for two, and inventing one would be
 * inventing copy. The newer announcement wins outright, with its own entry ids,
 * and the older rebuy keeps its figures on the screen exactly as if its bar had
 * faded. Flagged in `docs/screens.md`.
 */
export function announceRebuy(rebuy: {
  playerId: PlayerId;
  name: string;
  amount: Money;
  entryId: string;
}): void {
  token += 1;
  /* Only into a bar that is still up. One already falling is finished being
     undoable — "Undo dies with the bar" — and collapsing into it would hand a
     fresh Undo the entry from an announcement the host has watched leave. */
  const collapsing = live !== null && !live.leaving && live.playerId === rebuy.playerId;
  live = {
    playerId: rebuy.playerId,
    name: rebuy.name,
    amount: (collapsing ? live!.amount + rebuy.amount : rebuy.amount) as Money,
    entryIds: collapsing ? [...live!.entryIds, rebuy.entryId] : [rebuy.entryId],
    leaving: false,
    token,
  };
  startClocks();
  emit();
}

/**
 * Take the announcement off the screen and hand it back — what Undo calls.
 *
 * ONE STEP, because the bar has to go in the frame the tap happens in while
 * the voids it triggers land a few milliseconds later. Leaving it up until
 * they had would put a live Undo over a rebuy that is already reversed, and
 * a second tap on it would void the same rows twice.
 *
 * Nothing comes back once the bar is already leaving: Undo is live for the
 * bar's two seconds and dies with it, which the handoff says in as many words.
 */
export function takeAnnouncement(): RebuyAnnouncement | null {
  const it = live;
  if (it === null || it.leaving) return null;
  endAnnouncement();
  return it;
}

/** Nothing is being announced. The clock running out, and the tests. */
export function endAnnouncement(): void {
  stopClocks();
  live = null;
  emit();
}
