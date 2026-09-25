import { supabase } from './supabase';
import { CODE_OPENS_NOTHING, type Plan } from './planWords';

export { planLine, isNoPlanForGroup, CODE_OPENS_NOTHING, type Plan } from './planWords';

/**
 * The account's plan, and the one way a new person gets one on this phone.
 *
 * `0018_accounts.sql` is the whole of the rule and this file is only its
 * client: a group can be started by an account whose plan is not `free`, and
 * the plan is whatever `my_plan()` says — a founder row, a comp given by hand,
 * a promo code, later a store purchase. The app never decides it and never asks
 * a store. `docs/accounts-roadmap.md` is why.
 */


export async function myPlan(): Promise<Plan> {
  const { data, error } = await supabase.rpc('my_plan');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { plan: Plan['plan']; source: Plan['source']; ends_at: string | null }
    | undefined;
  return {
    plan: row?.plan ?? 'free',
    source: row?.source ?? null,
    endsAt: row?.ends_at ?? null,
  };
}

/**
 * A new person, a code, and an email — one account at the end of it.
 *
 * THE ORDER IS THE POINT.
 *
 *   1. Ask whether the code opens anything. A typo costs a retype, not an
 *      email and a half-made account.
 *   2. Make sure the phone holds an account to put it on: the anonymous one it
 *      already has (a member who claimed a seat keeps every seat — the user id
 *      does not change), or a new anonymous one.
 *   3. Attach the email. Supabase mails a confirmation link to it, and the
 *      link lands on `/auth-callback` like any sign-in link. Until it is
 *      opened the account is still anonymous, and the database still refuses
 *      it a book.
 *   4. Spend the code. Last, so that a refused email (already registered, a
 *      throttle) leaves the code for the next try.
 *
 * A phone already signed in with an email never comes here: `sign-in.tsx` is
 * only reachable while nobody is.
 */
export async function startWithCode(email: string, code: string, redirectTo: string): Promise<void> {
  const { data: opens, error: askError } = await supabase.rpc('promo_code_opens', { code });
  if (askError) throw askError;
  if (opens !== true) throw new Error(CODE_OPENS_NOTHING);

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session === null) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  const { error: emailError } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: redirectTo },
  );
  if (emailError) throw emailError;

  const { error: redeemError } = await supabase.rpc('redeem_promo_code', { code });
  if (redeemError) throw redeemError;
}

/**
 * Only the email again — the code is already on the account by now, and
 * spending it a second time would be refused.
 */
export async function resendConfirmation(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
  if (error) throw error;
}

