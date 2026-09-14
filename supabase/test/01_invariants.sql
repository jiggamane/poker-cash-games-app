-- =============================================================================
-- Schema invariant tests
-- =============================================================================
-- These assert the promises the build plan makes about money. Each test either
-- passes silently or aborts the whole run with 'TEST FAILED: ...'.
--
-- Run with: npm run db:verify
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

-- Helper: run a statement and require that it is REJECTED.
create or replace function expect_rejected(stmt text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute stmt;
  exception
    when others then
      return;  -- rejected as intended
  end;
  raise exception 'TEST FAILED: % — statement was accepted but should have been rejected', label;
end;
$$;

create or replace function expect_eq(actual bigint, expected bigint, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'TEST FAILED: % — expected %, got %', label, expected, actual;
  end if;
end;
$$;

-- Silence per-statement result rows. Errors still surface and still abort the
-- run, so a quiet run means everything passed.
\o /dev/null

-- =============================================================================
-- Fixtures
-- =============================================================================

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'host@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

insert into book (id, host_user_id, group_name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Thursday game'),
  ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Someone else''s game');

insert into player (id, book_id, display_name) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Petr'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Dana'),
  -- a collector who never sits at the table
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Radka');

insert into session (id, book_id, default_buyin, seat_count, started_at, share_token) values
  ('50000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   500, 8, now(), 'test-token-session-one'),
  ('50000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   500, 8, now(), 'test-token-session-two');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
        1, 'buyin', 'c0000000-0000-0000-0000-000000000001', 500, now(),
        '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- 1. THE LEDGER IS APPEND-ONLY
-- =============================================================================

select expect_rejected(
  $$update ledger_entry set amount = 999 where id = 'e0000000-0000-0000-0000-000000000001'$$,
  'UPDATE on ledger_entry');

select expect_rejected(
  $$delete from ledger_entry where id = 'e0000000-0000-0000-0000-000000000001'$$,
  'DELETE on ledger_entry');

-- ...even a no-op UPDATE that matches zero rows must fail (statement-level trigger)
select expect_rejected(
  $$update ledger_entry set amount = 1 where id = '00000000-0000-0000-0000-00000000dead'$$,
  'UPDATE matching no rows');

-- The original entry is untouched
select expect_eq(
  (select amount from ledger_entry where id = 'e0000000-0000-0000-0000-000000000001'),
  500, 'original entry amount preserved');

-- A correction is the sanctioned way to fix a mistake, and it ADDS a row
insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at,
                          corrects_entry_id, created_by_user_id)
values ('e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
        2, 'correction', 'c0000000-0000-0000-0000-000000000001', 300, now(),
        'e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

select expect_eq((select count(*) from ledger_entry
                  where session_id = '50000000-0000-0000-0000-000000000001'),
                 2, 'correction adds a row rather than replacing one');

-- =============================================================================
-- 2. MONEY SHAPE CONSTRAINTS
-- =============================================================================

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 90, 'buyin',
            'c0000000-0000-0000-0000-000000000001', -100, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'negative buy-in amount');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 91, 'buyin',
            'c0000000-0000-0000-0000-000000000001', 0, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'zero buy-in amount');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 92, 'buyin',
            500, now(), '11111111-1111-1111-1111-111111111111')$$,
  'buy-in with no player');

-- an expense has a PAYER, never a player
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 93, 'expense',
            'c0000000-0000-0000-0000-000000000001', 200, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'expense attributed to a player instead of a payer');

-- ...and it names exactly one of a payer and a cover. "Nobody yet" is a real
-- answer, but it has to be written down rather than left as a missing column.
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 96, 'expense',
            200, now(), '11111111-1111-1111-1111-111111111111')$$,
  'expense with neither a payer nor a cover');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, payer_id, covered_by, amount,
                              occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 97, 'expense',
            'c0000000-0000-0000-0000-000000000001', 'kitty', 200, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'expense with both a payer and a cover');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, covered_by, amount,
                              occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 98, 'expense',
            'somebody', 200, now(), '11111111-1111-1111-1111-111111111111')$$,
  'expense covered by something that is not the kitty or nobody');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, amount, occurred_at, corrects_entry_id, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 94, 'void',
            50, now(), 'e0000000-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111')$$,
  'void with a non-zero amount');

select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 95, 'correction',
            'c0000000-0000-0000-0000-000000000001', 100, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'correction that points at nothing');

-- seq is unique per session, so a retry cannot silently double-count
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 1, 'buyin',
            'c0000000-0000-0000-0000-000000000002', 500, now(),
            '11111111-1111-1111-1111-111111111111')$$,
  'duplicate seq within a session');

-- =============================================================================
-- 3. IDEMPOTENT RETRY
-- =============================================================================
-- The offline outbox re-sends entries after a dropped connection. The
-- client-generated id makes that a no-op rather than a double buy-in.

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
        1, 'buyin', 'c0000000-0000-0000-0000-000000000001', 500, now(),
        '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

select expect_eq((select count(*) from ledger_entry
                  where session_id = '50000000-0000-0000-0000-000000000001'),
                 2, 'replayed entry does not duplicate');

-- =============================================================================
-- 4. MONEY RULE CONSTRAINTS
-- =============================================================================

select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id)
    values ('b0000000-0000-0000-0000-000000000001', 'Impossible', 'percent', 150,
            'gross', 'winners_only', 'kitty', 'evenly',
            'c0000000-0000-0000-0000-000000000003')$$,
  'percentage rule above 100%');

-- a collector who is not playing is perfectly legal
insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                        destination, split, collector_player_id)
values ('b0000000-0000-0000-0000-000000000001', 'Kitchen & drinks', 'percent', 10,
        'gross', 'winners_only', 'bill', 'by_percent',
        'c0000000-0000-0000-0000-000000000003');

select expect_eq((select count(*) from money_rule
                  where book_id = 'b0000000-0000-0000-0000-000000000001'),
                 1, 'rule with a non-playing collector is allowed');

-- =============================================================================
-- 5. ROW LEVEL SECURITY — the host
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select expect_eq((select count(*) from book), 1, 'host sees only their own book');
select expect_eq((select count(*) from session), 1, 'host sees only their own sessions');
select expect_eq((select count(*) from ledger_entry), 2, 'host sees their own ledger');

-- even as the host, the ledger cannot be rewritten
select expect_rejected(
  $$update ledger_entry set amount = 1 where id = 'e0000000-0000-0000-0000-000000000001'$$,
  'host UPDATE on ledger_entry');

reset role;
reset request.jwt.claims;

-- =============================================================================
-- 6. ROW LEVEL SECURITY — the watcher
-- =============================================================================
-- A watcher token is scoped to exactly one session and grants read only.

set role authenticated;
set request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","share_session_id":"50000000-0000-0000-0000-000000000001"}';

select expect_eq((select count(*) from session), 1, 'watcher sees exactly one session');
select expect_eq((select count(*) from ledger_entry), 2, 'watcher reads that session''s ledger');
select expect_eq((select count(*) from player), 3, 'watcher sees the players of that book');

-- ...and cannot reach the other book's session
select expect_eq(
  (select count(*) from session where id = '50000000-0000-0000-0000-000000000002'),
  0, 'watcher cannot see an unrelated session');

-- a watcher can never write
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 300, 'buyin',
            'c0000000-0000-0000-0000-000000000001', 500, now(),
            '99999999-9999-9999-9999-999999999999')$$,
  'watcher INSERT into ledger_entry');

reset role;
reset request.jwt.claims;

-- =============================================================================
-- 7. ROW LEVEL SECURITY — a stranger
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';

select expect_eq((select count(*) from session), 0, 'stranger sees no sessions');
select expect_eq((select count(*) from ledger_entry), 0, 'stranger sees no ledger entries');
select expect_eq((select count(*) from book), 0, 'stranger sees no books');

reset role;
reset request.jwt.claims;

\o

\echo '--------------------------------------------------'
\echo ' ALL SCHEMA INVARIANT TESTS PASSED'
\echo '--------------------------------------------------'

-- =============================================================================
-- 8. THE CLOSE GATE (0002)
-- =============================================================================
-- A night may be settled only if the money balances, or if a host confirmed the
-- exact shortfall. The database is the last line of that check.

\o /dev/null

-- balanced night: no discrepancy, no confirmation needed
insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                        computed_transfers, total_off_table)
values ('50000000-0000-0000-0000-000000000001', 'settlement-v1', '{}', '{}', '[]', 0);

-- missing money with nobody's name on it must be refused
select expect_rejected(
  $$insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                            computed_transfers, total_off_table, discrepancy_amount)
    values ('50000000-0000-0000-0000-000000000002', 'settlement-v1', '{}', '{}', '[]', 0, -50)$$,
  'unconfirmed discrepancy');

-- a confirmation with no discrepancy is equally wrong
select expect_rejected(
  $$insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                            computed_transfers, total_off_table,
                            discrepancy_amount, discrepancy_confirmed_by, discrepancy_confirmed_at)
    values ('50000000-0000-0000-0000-000000000002', 'settlement-v1', '{}', '{}', '[]', 0,
            0, '11111111-1111-1111-1111-111111111111', now())$$,
  'confirmation without a discrepancy');

-- confirmed shortfall is allowed, and recorded
insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                        computed_transfers, total_off_table,
                        discrepancy_amount, discrepancy_confirmed_by, discrepancy_confirmed_at, discrepancy_note)
values ('50000000-0000-0000-0000-000000000002', 'settlement-v1', '{}', '{}', '[]', 0,
        -50, '11111111-1111-1111-1111-111111111111', now(), 'Chips came up short.');

select expect_eq(
  (select discrepancy_amount from settlement where session_id = '50000000-0000-0000-0000-000000000002'),
  -50, 'confirmed discrepancy is stored');

-- a frozen settlement's figures cannot be rewritten
select expect_rejected(
  $$update settlement set total_off_table = 999
    where session_id = '50000000-0000-0000-0000-000000000001'$$,
  'editing a frozen settlement');

-- ...but the room may still redistribute who physically pays whom
update settlement set final_transfers = '[{"from":"a","to":"b","amount":10}]'
where session_id = '50000000-0000-0000-0000-000000000001';


-- =============================================================================
-- 9. MONEY RULE SHAPE (0003)
-- =============================================================================

-- a percentage may only ever be charged to winners
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id)
    values ('b0000000-0000-0000-0000-000000000001', 'Bad percent', 'percent', 5,
            'gross', 'everyone_flat', 'kitty', 'evenly',
            'c0000000-0000-0000-0000-000000000003')$$,
  'percentage charged to everyone');

-- a custom split must carry its amounts
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id)
    values ('b0000000-0000-0000-0000-000000000001', 'Custom, empty', 'fixed', 170,
            'gross', 'winners_only', 'bill', 'custom',
            'c0000000-0000-0000-0000-000000000003')$$,
  'custom split with no amounts');

-- ...and a non-custom split must not
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id, custom_shares)
    values ('b0000000-0000-0000-0000-000000000001', 'Evenly, with shares', 'fixed', 170,
            'gross', 'winners_only', 'bill', 'evenly',
            'c0000000-0000-0000-0000-000000000003', '[]'::jsonb)$$,
  'non-custom split carrying amounts');

-- a valid custom split is accepted
insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                        destination, split, collector_player_id, custom_shares, sort_order)
values ('b0000000-0000-0000-0000-000000000001', 'Dana covers it', 'fixed', 170,
        'gross', 'winners_only', 'bill', 'custom',
        'c0000000-0000-0000-0000-000000000003',
        '[{"playerId":"c0000000-0000-0000-0000-000000000001","amount":170}]'::jsonb, 5);

-- =============================================================================
-- 9b. FEES THAT ARE NOT A SHARE OF A WIN (0015)
-- =============================================================================
-- A time rule with no period would charge nothing and say nothing, which is the
-- one way money goes missing without anybody seeing it happen.
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id)
    values ('b0000000-0000-0000-0000-000000000001', 'Timeless time', 'per_player_time', 5,
            'gross', 'everyone_flat', 'host_fee', 'evenly',
            'c0000000-0000-0000-0000-000000000003')$$,
  'a fee charged by time with no period');

-- ...and a period on a rule that is not charged by time is a setting that does
-- not apply to it, which is how a rule comes to mean two things at once.
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id, period_minutes,
                            period_rounding)
    values ('b0000000-0000-0000-0000-000000000001', 'Hourly flat', 'fixed', 100,
            'gross', 'everyone_flat', 'host_fee', 'evenly',
            'c0000000-0000-0000-0000-000000000003', 60, 'up')$$,
  'a period on a rule not charged by time');

-- A ceiling on a total for the table could mean either half of it.
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id, max_per_player)
    values ('b0000000-0000-0000-0000-000000000001', 'Capped total', 'fixed', 100,
            'gross', 'everyone_flat', 'host_fee', 'evenly',
            'c0000000-0000-0000-0000-000000000003', 20)$$,
  'a per-player ceiling on a total for the table');

-- A stated amount per head and an amount typed against a name are two answers
-- to one question.
select expect_rejected(
  $$insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                            destination, split, collector_player_id, custom_shares)
    values ('b0000000-0000-0000-0000-000000000001', 'Per head, by hand', 'per_player', 10,
            'gross', 'everyone_flat', 'host_fee', 'custom',
            'c0000000-0000-0000-0000-000000000003', '[]'::jsonb)$$,
  'a per-head fee also split by hand');

-- The shape a host actually sets: five an hour each, every hour begun, forty a
-- night at most.
insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                        destination, split, collector_player_id, period_minutes,
                        period_rounding, max_per_player, sort_order)
values ('b0000000-0000-0000-0000-000000000001', 'Time', 'per_player_time', 5,
        'gross', 'everyone_flat', 'host_fee', 'evenly',
        'c0000000-0000-0000-0000-000000000003', 60, 'up', 40, 8);

select expect_eq(
  (select count(*) from money_rule where amount_kind = 'per_player_time'),
  1, 'a rake by the hour, capped, is accepted');

-- The room, by the hour, split across the table: a total rather than a rate
-- per head, and it takes no ceiling.
insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                        destination, split, collector_player_id, period_minutes,
                        period_rounding, sort_order)
values ('b0000000-0000-0000-0000-000000000001', 'The room', 'per_time', 20,
        'gross', 'everyone_flat', 'host_fee', 'evenly',
        'c0000000-0000-0000-0000-000000000003', 60, 'prorate', 9);

select expect_eq(
  (select count(*) from money_rule where amount_kind = 'per_time'),
  1, 'a room charged by the hour is accepted');

-- Two rules MAY share a position, and 0006 is where that changed.
--
-- The old rule was that they may not, so a host reordering rules could never
-- leave two in the same slot. Right for one night's rules; wrong for this
-- table, which is per BOOK while the rules themselves are per NIGHT — each
-- night is settled with the copy it opened with. Deleting a rule and adding
-- another in its place gives a new row a position an older night's row still
-- holds, and the unique index refused it. That refusal halted the outbox, which
-- halts at its first failure, which silently stopped every later night from
-- reaching the server at all.
--
-- The order still means what it meant; keeping it contiguous is now the app's
-- job rather than something the database can enforce across nights that
-- legitimately disagree.
insert into money_rule (book_id, name, amount_kind, amount, basis, charge,
                        destination, split, collector_player_id, sort_order)
values ('b0000000-0000-0000-0000-000000000001', 'Same slot', 'fixed', 10,
        'gross', 'winners_only', 'kitty', 'evenly',
        'c0000000-0000-0000-0000-000000000003', 5);

select expect_eq(
  (select count(*) from money_rule
    where book_id = 'b0000000-0000-0000-0000-000000000001' and sort_order = 5),
  2, 'two rules may hold one position, across nights that each carry their own');

-- settlement due: after_days needs a number of days
select expect_rejected(
  $$update book set settlement_due_kind = 'after_days'
    where id = 'b0000000-0000-0000-0000-000000000001'$$,
  'after_days with no day count');

\o
\echo ' CLOSE GATE TESTS PASSED'
\echo ' MONEY RULE TESTS PASSED'
