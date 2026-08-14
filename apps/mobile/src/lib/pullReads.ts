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
  book: 'id, group_name',
  session: 'id, started_at, ended_at, status, stakes, default_buyin',
  /**
   * A name and nothing else — `claimed_by_user_id` is deliberately absent. A
   * member reading the roster has no business knowing which of the others have
   * accounts.
   */
  player: 'id, display_name',
  money_rule: '*',
  session_seat: 'session_id, player_id',
  ledger_entry: '*',
  final_count: 'session_id, player_id, counted_chips',
  /** Whole, because the shortfall columns are what rebuild the acknowledgement. */
  settlement: '*',
} as const;
