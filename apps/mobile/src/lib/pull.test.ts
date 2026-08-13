import { describe, expect, it } from 'vitest';
import { READS } from './pullReads';

/**
 * The columns a claimed player reads back.
 *
 * The same tripwire as `syncRows.test.ts`, for the other direction. These are
 * assertions about somebody else's schema, so they can only be kept true by
 * being stated in two places that fail together: here, and in
 * `supabase/test/05_member_read.sql`, which runs the same lists through RLS as
 * an actual claimed member against a real Postgres.
 *
 * IF ONE OF THESE FAILS, change the SQL file in the same commit. A wrong column
 * name here does not break a night — it means a player who claims their place
 * and finds an empty app, which is worse, because nothing about it looks like a
 * failure.
 */
describe('what the pull reads', () => {
  it('names the book by id and group name', () => {
    expect(READS.book).toBe('id, group_name');
  });

  it('takes everything a night is opened with, and how it ended', () => {
    expect(READS.session).toBe('id, started_at, ended_at, status, stakes, default_buyin');
  });

  it('takes only a player’s id and name — never who claimed them', () => {
    // `claimed_by_user_id` is deliberately absent. A member reading the roster
    // has no business knowing which of the others have accounts.
    expect(READS.player).toBe('id, display_name');
    expect(READS.player).not.toContain('claimed_by');
  });

  it('takes the seat, the count and the whole ledger', () => {
    expect(READS.session_seat).toBe('session_id, player_id');
    expect(READS.final_count).toBe('session_id, player_id, counted_chips');
    expect(READS.ledger_entry).toBe('*');
  });

  it('takes the whole settlement, because the shortfall columns rebuild the acknowledgement', () => {
    expect(READS.settlement).toBe('*');
    expect(READS.money_rule).toBe('*');
  });

  it('covers every table a night is made of', () => {
    expect(Object.keys(READS).sort()).toEqual([
      'book',
      'final_count',
      'ledger_entry',
      'money_rule',
      'player',
      'session',
      'session_seat',
      'settlement',
    ]);
  });
});
