/**
 * THE STORE, BEHIND ONE SEAM.
 *
 * Your plan (`app/plan.tsx`, `app/plan-change.tsx`) is built on this file and
 * on nothing else that knows about a store. Today it answers "no store": the
 * app sells nothing yet. The owner's call of 27 November: build the screens
 * now, wire the purchases when the RevenueCat project and the App Store
 * subscriptions exist (`docs/accounts-roadmap.md` stage 4 — RevenueCat, its
 * `appUserID` the Supabase user id, the server reading `billing_event` from
 * RevenueCat's webhook; the app never decides on its own what a person may do).
 *
 * WHEN THE STORE ARRIVES, only this file changes:
 *   - `storePlans()` returns the two subscriptions with the store's own
 *     localized price strings — the app never writes a price of its own;
 *   - `buy()` opens the store's purchase sheet and resolves when it answers;
 *   - `manage()` opens the store's subscription management, which is where a
 *     move down or a stop happens on iOS (an app cannot downgrade for you);
 *   - `restore()` re-reads the store's receipts on a new phone.
 * The screens already handle every answer: no store, waiting, bought,
 * cancelled, failed.
 */
import type { Tier } from './membership';

export type PaidTier = Exclude<Tier, 'free'>;

export interface StorePlan {
  tier: PaidTier;
  /** The store's own price string for one month, localized ("$9.99", "9,99 €"). */
  price: string;
}

/** Thrown by every call that needs a store while there is none. */
export class NoStore extends Error {
  constructor() {
    super('no store');
    this.name = 'NoStore';
  }
}

/** Whether purchases can be made in this build. */
export function storeReady(): boolean {
  return false;
}

/** The subscriptions the store sells, with its prices; null while there is no store. */
export async function storePlans(): Promise<StorePlan[] | null> {
  return null;
}

/** Buy a plan through the store's own sheet. 'cancelled' when the person backs out there. */
export async function buy(_tier: PaidTier): Promise<'bought' | 'cancelled'> {
  throw new NoStore();
}

/** Open the store's subscription management (moving down, stopping). */
export async function manage(): Promise<void> {
  throw new NoStore();
}

/** Re-read this account's purchases from the store. */
export async function restore(): Promise<void> {
  throw new NoStore();
}

/** The store's price for a tier, or undefined when the store has not said. */
export const priceOf = (plans: StorePlan[] | null, tier: PaidTier): string | undefined =>
  plans?.find((p) => p.tier === tier)?.price;
