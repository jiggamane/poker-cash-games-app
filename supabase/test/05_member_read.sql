-- =============================================================================
-- What a claimed player can read back
-- =============================================================================
-- The mirror of 03_sync_contract.sql. That one replays every row the app SENDS;
-- this replays every read `apps/mobile/src/lib/pull.ts` makes to fill a phone
-- that has just claimed a seat — as that claimant, through row-level security,
-- with the exact column lists the app asks for.
--
-- WHY THIS EXISTS. A wrong column name in a WRITE fails loudly: the night never
-- leaves the phone and the host sees "waiting". A wrong column name in a READ
-- fails silently — the player claims their place, lands on an empty My stats,
-- and nothing anywhere looks broken. The only way to know is to run the reads.
--
-- It asserts two things at once, and they pull in opposite directions:
--   EVERYTHING THEY SHOULD SEE — their book, its nights, the whole ledger, the
--   counts, the frozen settlement. Without all of it their nights do not add up
--   to the figures they were paid on.
--   NOTHING ELSE — not another book, not who else has claimed a seat, and not
--   anybody's invite codes.
--
-- KEEP IN STEP with `apps/mobile/src/lib/pull.test.ts`, which asserts the same
-- column lists from the TypeScript side. If one changes, the other fails.
--
-- Run with: npm run db:verify
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

create or replace function expect_rejected(stmt text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute stmt;
  exception
    when others then
      return;
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

create or replace function expect_text(actual text, expected text, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'TEST FAILED: % — expected %, got %',
      label, coalesce(expected, 'null'), coalesce(actual, 'null');
  end if;
end;
$$;

\o /dev/null

-- =============================================================================
-- Fixtures — one settled night in one book, and a second book to stay out of
-- =============================================================================

insert into auth.users (id, email) values
  ('e1000000-0000-0000-0000-000000000001', 'read-host@example.com'),
  ('e1000000-0000-0000-0000-000000000002', null),                    -- Petr
  ('e1000000-0000-0000-0000-000000000003', 'other-read@example.com');

insert into book (id, host_user_id, group_name) values
  ('e2000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001', 'Saturday game'),
  ('e2000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000003', 'Somebody else''s game');

insert into player (id, book_id, display_name) values
  ('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Petr'),
  ('e3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', 'Dana'),
  ('e3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000002', 'Nobody');

insert into money_rule
  (id, book_id, name, active, amount_kind, amount, basis, charge, destination,
   split, collector_player_id, sort_order)
values
  ('e6000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001',
   'Group kitty', true, 'percent', 5, 'gross', 'winners_only', 'kitty',
   'evenly', 'e3000000-0000-0000-0000-000000000002', 1);

insert into session (id, book_id, default_buyin, seat_count, started_at, ended_at, status)
values ('e4000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001',
        500, 6, now() - interval '5 hours', now(), 'settled'),
       -- A night in the other book, to prove it never comes back.
       ('e4000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002',
        500, 6, now(), null, 'live');

insert into session_seat (session_id, player_id) values
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001'),
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000002');

insert into ledger_entry
  (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values
  ('e5000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001',
   1, 'buyin', 'e3000000-0000-0000-0000-000000000001', 500, now(),
   'e1000000-0000-0000-0000-000000000001'),
  ('e5000000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000001',
   2, 'buyin', 'e3000000-0000-0000-0000-000000000002', 500, now(),
   'e1000000-0000-0000-0000-000000000001');

insert into final_count (session_id, player_id, counted_chips) values
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 800),
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000002', 200);

insert into settlement
  (session_id, algorithm_version, rules_snapshot, inputs_snapshot, computed_transfers,
   total_off_table)
values
  ('e4000000-0000-0000-0000-000000000001', 'settlement-v1',
   '[{"id":"e6000000-0000-0000-0000-000000000001","name":"Group kitty"}]'::jsonb,
   '{}'::jsonb, '[]'::jsonb, 0);

-- Petr claims his seat, exactly as the app does it.
set role authenticated;
set request.jwt.claims = '{"sub":"e1000000-0000-0000-0000-000000000001"}';

create temporary table code (c text);
insert into code select create_player_invite('e3000000-0000-0000-0000-000000000001');

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"e1000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_text(
  redeem_player_invite((select c from code))::text,
  'e3000000-0000-0000-0000-000000000001',
  'the claim lands on the seat the code names');

-- =============================================================================
-- 1. THE READS, IN THE ORDER THE PULL MAKES THEM
-- =============================================================================
-- Each SELECT below is the column list from `READS` in pull.ts, verbatim. If a
-- column has been renamed, this file fails to parse — which is the entire
-- point of writing them out rather than counting rows.

select expect_eq(
  (select count(*) from (select id, group_name from book) x),
  1, 'a claimed player sees exactly one book — their own');

select expect_text(
  (select group_name from book),
  'Saturday game',
  'and it is the book they were invited to');

select expect_eq(
  (select count(*) from (
     select id, started_at, ended_at, status, stakes, default_buyin from session
   ) x),
  1, 'every night of that book, and no night of any other');

select expect_eq(
  (select count(*) from (select id, display_name from player) x),
  2, 'the roster of their book');

select expect_eq(
  (select count(*) from (select * from money_rule) x),
  1, 'the money rules the group plays by');

select expect_eq(
  (select count(*) from (select session_id, player_id from session_seat) x),
  2, 'who was at the table');

select expect_eq(
  (select count(*) from (select * from ledger_entry) x),
  2, 'the whole ledger — a player who cannot read it cannot check their own net');

select expect_eq(
  (select count(*) from (
     select session_id, player_id, counted_chips from final_count
   ) x),
  2, 'the end-of-night count');

select expect_eq(
  (select count(*) from (select * from settlement) x),
  1, 'the frozen settlement, which is what the night actually paid');

-- The shortfall columns the acknowledgement is rebuilt from must all exist:
-- without them a night closed over missing money cannot be imported at all,
-- because settle() refuses to run on one that does not add up.
select expect_eq(
  (select count(*) from (
     select discrepancy_amount, discrepancy_confirmed_by, discrepancy_confirmed_at,
            discrepancy_note, discrepancy_absorbed_by, rules_snapshot
       from settlement
   ) x),
  1, 'the settlement carries everything needed to rebuild the night');

-- =============================================================================
-- 2. AND NOTHING ELSE
-- =============================================================================

select expect_eq(
  (select count(*) from book where id = 'e2000000-0000-0000-0000-000000000002'),
  0, 'the other host''s book is invisible');

select expect_eq(
  (select count(*) from session where book_id = 'e2000000-0000-0000-0000-000000000002'),
  0, 'and so are its nights');

select expect_eq(
  (select count(*) from player where book_id = 'e2000000-0000-0000-0000-000000000002'),
  0, 'and its players');

-- Codes are never discoverable by somebody holding an account. A member who
-- could read this table could take any unclaimed seat in the book.
select expect_eq(
  (select count(*) from player_invite),
  0, 'a claimed player reads no invite codes at all');

-- =============================================================================
-- 3. READ, AND ONLY READ
-- =============================================================================
-- The single-writer rule, from the other side. Claiming a place grants seeing
-- the book; it never grants touching it.
--
-- Refused at the GRANT, before row-level security is consulted at all — the
-- member policies added by 0006 are SELECT only, so `authenticated` holds no
-- write privilege on these tables to be filtered. Both facts are asserted: that
-- the attempt is rejected, and that the ledger is untouched afterwards.

select expect_rejected(
  $$update ledger_entry set amount = 999999
     where id = 'e5000000-0000-0000-0000-000000000001'$$,
  'a member restating an entry');

select expect_rejected(
  $$insert into ledger_entry
      (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values ('e5000000-0000-0000-0000-000000000009',
            'e4000000-0000-0000-0000-000000000001', 3, 'buyin',
            'e3000000-0000-0000-0000-000000000001', 100, now(),
            'e1000000-0000-0000-0000-000000000002')$$,
  'a member adding an entry of their own');

-- These two are refused a step later: the privilege exists, but no member
-- policy admits a row to it, so the statement succeeds over nothing. Asserted
-- as "unchanged afterwards" rather than "threw", because that is what actually
-- protects the money — a silent no-op and a refusal are the same outcome here,
-- and only one of them is observable.
update final_count set counted_chips = 999999
 where session_id = 'e4000000-0000-0000-0000-000000000001';

update session set status = 'live'
 where id = 'e4000000-0000-0000-0000-000000000001';

reset role;
reset request.jwt.claims;

select expect_eq(
  (select amount from ledger_entry where id = 'e5000000-0000-0000-0000-000000000001'),
  500, 'and the entry still says what the host recorded');

select expect_eq(
  (select count(*) from ledger_entry where session_id = 'e4000000-0000-0000-0000-000000000001'),
  2, 'and the ledger is exactly as long as it was');

select expect_text(
  (select status::text from session where id = 'e4000000-0000-0000-0000-000000000001'),
  'settled', 'and the night is still settled');

select expect_eq(
  (select counted_chips from final_count
    where session_id = 'e4000000-0000-0000-0000-000000000001'
      and player_id = 'e3000000-0000-0000-0000-000000000001'),
  800, 'and the count is still what was counted');

\o

\echo '--------------------------------------------------'
\echo ' MEMBER READ TESTS PASSED'
\echo '--------------------------------------------------'
