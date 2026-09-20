-- =============================================================================
-- The end of the night, corrected after the night has closed — B87
-- =============================================================================
-- A night whose totals do not add up is not settled at the table. Everybody
-- goes home, and the host finishes it the next day — so the moment the app
-- records as the end of the game is the moment the argument finished, which on
-- a real night is a day out. The phone can now be told the real one, and on a
-- night that has already closed that correction has to reach the server.
--
-- THIS FILE IS THE PREMISE THAT MAKES THAT SAFE, asserted rather than assumed.
-- The app sends `ended_at` alone, as `session.ended`, for a settled night only
-- (`sessionEndedPatch` in `syncRows.ts`), and every clause of that sentence is
-- load-bearing:
--
--   · the column may move on a settled night          — or the feature is dead
--   · the frozen settlement beside it may not          — or it is not a record
--   · the column may NOT be set on a live night        — why `session.patch`
--                                                        still refuses to carry
--                                                        it, and why a wrong
--                                                        payload would halt the
--                                                        whole queue
--   · it may NOT be cleared on a settled night         — why the sheet has no
--                                                        way to unset it
--
-- Run with: npm run db:verify
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

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

-- A statement that MUST be rejected — byte for byte the helper the other test
-- files declare, and under its own name rather than a second one for the same
-- idea. Each file redeclares the helpers it uses because each has to run on its
-- own; two NAMES for one assertion is how a reader stops trusting either.
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

\o /dev/null

-- =============================================================================
-- Fixtures — one host, one book, one night played and settled
-- =============================================================================

insert into auth.users (id, email) values
  ('87100000-0000-0000-0000-000000000001', 'end-time-host@example.com');

insert into book (id, host_user_id, group_name) values
  ('87200000-0000-0000-0000-000000000001',
   '87100000-0000-0000-0000-000000000001', 'The late finishers');

-- The night as it stands at the close: settled, and stamped with the moment
-- the host tapped through it rather than the moment the cards stopped. That
-- wrong stamp is the fault this whole file is about.
insert into session (id, book_id, default_buyin, seat_count, started_at, status, ended_at)
values ('87400000-0000-0000-0000-000000000001', '87200000-0000-0000-0000-000000000001',
        500, 6, '2026-09-18T20:05:00Z', 'settled', '2026-09-19T14:30:00Z');

insert into settlement
  (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
   computed_transfers, total_off_table)
values
  ('87400000-0000-0000-0000-000000000001', 'settlement-v1', '{}'::jsonb, '{}'::jsonb,
   '[{"from":"a","to":"b","amount":1000}]'::jsonb, 0);

-- A second night, still being played. Nothing about it has ended.
insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('87400000-0000-0000-0000-000000000002', '87200000-0000-0000-0000-000000000001',
        500, 6, '2026-09-20T20:05:00Z', 'live');

set request.jwt.claims = '{"sub":"87100000-0000-0000-0000-000000000001"}';
set role authenticated;

-- =============================================================================
-- 1. THE CORRECTION LANDS
-- =============================================================================
-- The game finished at 03:12 and was settled at half past two the following
-- afternoon. This is the host saying so, and it is the only write the app makes
-- against a night that has already closed.

update session
   set ended_at = '2026-09-19T03:12:00Z'
 where id = '87400000-0000-0000-0000-000000000001';

select expect_eq(
  (select count(*) from session
    where id = '87400000-0000-0000-0000-000000000001'
      and ended_at = '2026-09-19T03:12:00Z'),
  1, 'a settled night may be told when it actually ended');

select expect_eq(
  (select count(*) from session
    where id = '87400000-0000-0000-0000-000000000001' and status = 'settled'),
  1, 'and it is still settled afterwards');

-- =============================================================================
-- 2. AND MOVES NO MONEY
-- =============================================================================
-- The reason an end time may be corrected at all is that it is not a figure.
-- `settlement_frozen_guard` is on the settlement table and this never touches
-- it — asserted here rather than reasoned about, because the argument for
-- allowing the edit rests entirely on it.

select expect_eq(
  (select (computed_transfers -> 0 ->> 'amount')::bigint from settlement
    where session_id = '87400000-0000-0000-0000-000000000001'),
  1000, 'the frozen settlement is untouched by a corrected end time');

select expect_rejected(
  $$update settlement
       set total_off_table = 999
     where session_id = '87400000-0000-0000-0000-000000000001'$$,
  'a frozen settlement still refuses to have its figures edited');

-- =============================================================================
-- 3. A LIVE NIGHT STILL MAY NOT CARRY ONE
-- =============================================================================
-- This is why `session.patch` does not and must not carry `ended_at`, and why
-- the correction needed an operation of its own. A patch that sent this column
-- on a night still being played would be refused — and a refused row at the
-- head of the outbox is every night behind it going nowhere.

select expect_rejected(
  $$update session
       set ended_at = '2026-09-20T23:00:00Z'
     where id = '87400000-0000-0000-0000-000000000002'$$,
  'a night still being played cannot be stamped with an end');

select expect_eq(
  (select count(*) from session
    where id = '87400000-0000-0000-0000-000000000002' and ended_at is null),
  1, 'and it still has no end time after the attempt');

-- =============================================================================
-- 4. AND A SETTLED NIGHT MAY NOT HAVE ITS END TAKEN AWAY
-- =============================================================================
-- The same constraint read from the other side, and the reason the sheet offers
-- no way to clear the field: the host may correct an end time, never unset one.

select expect_rejected(
  $$update session
       set ended_at = null
     where id = '87400000-0000-0000-0000-000000000001'$$,
  'a settled night cannot be left without an end time');

select expect_eq(
  (select count(*) from session
    where id = '87400000-0000-0000-0000-000000000001' and ended_at is not null),
  1, 'and it still has one after the attempt');

reset role;

\o

\echo '--------------------------------------------------'
\echo ' END TIME TESTS PASSED'
\echo '--------------------------------------------------'
