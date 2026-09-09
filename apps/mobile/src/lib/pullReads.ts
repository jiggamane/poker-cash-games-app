/**
 * Every column a claimed player reads back, named once and kept pure.
 *
 * In its own file for the same reason `syncRows.ts` is separate from `sync.ts`:
 * nothing here touches the network or React Native, so a test can reach it. A
 * wrong column name would otherwise be an assertion made by reading the schema
 * rather than a fact — and in this direction it fails silently, which is the
 * dangerous kind. Somebody claims their place, lands on an empty My stats, and
 * nothing anywhere looks broken.
 *
 * KEPT IN STEP by two files that fail together: `pull.test.ts` asserts these
 * lists from the TypeScript side, and `supabase/test/05_member_read.sql` runs
 * the same lists as an actual claimed member against a real Postgres, through
 * row-level security.
 */
export const READS = {
  /**
   * The group's settings as well as its name. Reading the nights back and not
   * what they were played under is what a reinstalled phone used to get: every
   * figure correct, and the group's currency, buy-in, blinds and rounding
   * silently at the app's defaults — which looks right and is not.
   */
  book: 'id, group_name, currency_code, default_buyin, stakes, rounding_mode',
  /**
   * `rounding_mode` is how the night settles, not how it is displayed.
   * `table_name` is the only thing telling two nights of one group apart.
   */
  session:
    'id, started_at, ended_at, status, stakes, default_buyin, rounding_mode, table_name',
  /**
   * A name and the terms they are on the roster under — `claimed_by_user_id` is
   * deliberately absent. A member reading the roster has no business knowing
   * which of the others have accounts.
   *
   * `removed_at` matters more here than anywhere: without it the phone that
   * reads the book keeps offering a seat to somebody the admin took off the
   * roster a month ago, and nothing on either screen says why they disagree.
   */
  player: 'id, display_name, pays_kitty, removed_at',
  money_rule: '*',
  session_seat: 'session_id, player_id',
  ledger_entry: '*',
  final_count: 'session_id, player_id, counted_chips',
  /** Whole, because the shortfall columns are what rebuild the acknowledgement. */
  settlement: '*',
  /** Who has handed over the money. Changes no figure; answers the one question E7 asks. */
  transfer_payment: 'session_id, from_player_id, to_player_id, paid_at',
} as const;
