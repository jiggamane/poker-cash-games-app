/**
 * The pure half of `plan.ts` — no client, so it is tested without one.
 */

export type Plan = {
  plan: 'free' | 'pro' | 'club';
  source: 'founder' | 'grant' | 'promo' | 'apple' | 'google' | 'web' | null;
  /** Null is for ever, or no plan at all. */
  endsAt: string | null;
};

/**
 * The words for a plan on the Settings row. Pure, so it is tested.
 *
 * ⚠ COPY NOT DRAWN — no board has an Account row for a plan. Written to the
 * grammar of the rows around it, and listed in `docs/screens.md`.
 */
export function planLine(p: Plan, now: Date = new Date()): string {
  if (p.plan === 'free') return 'Free';
  const name = p.plan === 'club' ? 'Club' : 'Pro';
  const why = p.source === 'founder' ? ' · founder' : '';
  if (p.endsAt === null) return `${name}${why}`;
  const ends = new Date(p.endsAt);
  if (Number.isNaN(ends.getTime()) || ends <= now) return `${name}${why}`;
  const date = ends.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${name}${why} · until ${date}`;
}

/* ⚠ COPY NOT DRAWN — see `sign-in.tsx`. */
export const CODE_OPENS_NOTHING = 'That code does not open anything. Check it with whoever gave it to you.';

/**
 * True when the server refused a new book because the account has no plan.
 *
 * Postgres says it as a row-level security violation naming the policy, and
 * `book_insert_needs_plan` is the only policy that can refuse a book to an
 * account that is otherwise allowed one.
 */
export function isNoPlanForGroup(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  return /book_insert_needs_plan/.test(raw);
}
