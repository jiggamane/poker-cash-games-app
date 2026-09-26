-- =============================================================================
-- Passing the book — 0016
-- =============================================================================
-- One writer per night, and which one moves by a code. This plays a night
-- through four accounts, as each of them, through row-level security:
--
--   the host       made the group; writes a night until they pass it
--   the taker      a signed-in account the host hands the night to
--   an anonymous   a phone that opened a share link or claimed a seat (and,
--                  since 0017, may take a night with a code — see 10)
--   a stranger     signed in, nothing to do with this group
--
-- What it holds, in one line each:
--   * after a handover EXACTLY ONE account can write the night, and it is the
--     one that redeemed the code — the host included in "cannot"
--   * the writer column moves by the functions and never by an UPDATE
--   * a code is one use, ten minutes, and withdrawn when a new one is issued
--   * the host can always take a night back, with no code, and nobody else can
--   * the taker's book-level powers end when the night settles
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

-- Switch who is asking. `set local` would not outlive the statement in psql's
-- autocommit, so these are session-level and every block resets first.
create or replace function as_user(uid text, anonymous boolean default false)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'is_anonymous', anonymous)::text, false);
end;
$$;

\o /dev/null

-- =============================================================================
-- Fixtures — one live night, one entry on it
-- =============================================================================

insert into auth.users (id, email) values
  ('91000000-0000-0000-0000-000000000001', 'pass-host@example.com'),
  ('91000000-0000-0000-0000-000000000002', 'pass-taker@example.com'),
  ('91000000-0000-0000-0000-000000000003', null),
  ('91000000-0000-0000-0000-000000000004', 'pass-stranger@example.com');

insert into book (id, host_user_id, group_name) values
  ('92000000-0000-0000-0000-000000000001',
   '91000000-0000-0000-0000-000000000001', 'Thursday game');

insert into player (id, book_id, display_name) values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'Petr'),
  ('93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', 'Dana');

insert into money_rule
  (id, book_id, name, active, amount_kind, amount, basis, charge, destination,
   split, collector_player_id, sort_order)
values
  ('96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001',
   'Group kitty', true, 'percent', 5, 'gross', 'winners_only', 'kitty',
   'evenly', '93000000-0000-0000-0000-000000000002', 1);

insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001',
        500, 6, now() - interval '2 hours', 'live');

insert into ledger_entry
  (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values
  ('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001',
   1, 'buyin', '93000000-0000-0000-0000-000000000001', 500, now(),
   '91000000-0000-0000-0000-000000000001');

create temporary table code (c text);
grant all on code to authenticated;

set role authenticated;

-- =============================================================================
-- 1. BEFORE ANYTHING IS PASSED, NOTHING HAS CHANGED
-- =============================================================================

select as_user('91000000-0000-0000-0000-000000000001');

select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'true',
  'the host writes a night nobody has passed — every night before 0016');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('95000000-0000-0000-0000-000000000002', '94000000-0000-0000-0000-000000000001',
        2, 'buyin', '93000000-0000-0000-0000-000000000002', 500, now());

select as_user('91000000-0000-0000-0000-000000000002');

select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'false',
  'the taker writes nothing yet');

select expect_rejected($q$
  insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
  values ('95000000-0000-0000-0000-00000000000a', '94000000-0000-0000-0000-000000000001',
          3, 'buyin', '93000000-0000-0000-0000-000000000001', 500, now())
$q$, 'an account that has not been passed the night cannot record on it');

select expect_eq((select count(*) from ledger_entry), 0,
  'and cannot read it either — not a member, not a writer');

select expect_rejected($q$
  select create_night_handover('94000000-0000-0000-0000-000000000001')
$q$, 'only the phone recording a night can issue its code');

-- =============================================================================
-- 2. THE HOST PASSES IT
-- =============================================================================

select as_user('91000000-0000-0000-0000-000000000001');
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');

select expect_eq(length((select c from code)), 10, 'a code is ten characters');
select expect_text(night_handover_state('94000000-0000-0000-0000-000000000001'), 'waiting',
  'the issuing phone sees its code waiting');

-- An anonymous phone taking a night is 0017's, and 10_nothing_lost.sql has it.

select as_user('91000000-0000-0000-0000-000000000002');
select expect_rejected($q$
  select redeem_night_handover('AAAAAAAAAA')
$q$, 'a code that was never issued is refused');

-- Typed the way people type it: lower case, a space in the middle.
select expect_text(
  redeem_night_handover(lower(substr((select c from code), 1, 5)) || ' ' ||
                        substr((select c from code), 6))::text,
  '94000000-0000-0000-0000-000000000001',
  'the taker redeems the code and is told which night it was');

-- =============================================================================
-- 3. ONE WRITER — THE TAKER, AND NOT THE HOST
-- =============================================================================

select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'true',
  'the taker now writes the night');

select expect_eq((select count(*) from ledger_entry), 2,
  'and reads the ledger they are continuing, both entries of it');
select expect_eq((select count(*) from player), 2, 'and the roster');
select expect_eq((select count(*) from money_rule), 1, 'and the rules');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('95000000-0000-0000-0000-000000000003', '94000000-0000-0000-0000-000000000001',
        3, 'rebuy', '93000000-0000-0000-0000-000000000001', 500, now());

select expect_text(
  (select created_by_user_id::text from ledger_entry
    where id = '95000000-0000-0000-0000-000000000003'),
  '91000000-0000-0000-0000-000000000002',
  'every entry says which account wrote it — the handover is on the record');

-- A guest seated for the first time, and tonight's rules changed.
insert into player (id, book_id, display_name) values
  ('93000000-0000-0000-0000-000000000003', '92000000-0000-0000-0000-000000000001', 'Guest');
insert into session_seat (session_id, player_id) values
  ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000003');
update money_rule set amount = 10 where id = '96000000-0000-0000-0000-000000000001';
select expect_eq((select amount from money_rule where id = '96000000-0000-0000-0000-000000000001'),
  10, 'the taker can change tonight''s rules');

update session set status = 'counting' where id = '94000000-0000-0000-0000-000000000001';
insert into final_count (session_id, player_id, counted_chips) values
  ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 700);

select expect_rejected($q$
  update session set writer_user_id = null where id = '94000000-0000-0000-0000-000000000001'
$q$, 'the writer cannot hand the night on with an UPDATE');

select expect_rejected($q$
  select take_back_night('94000000-0000-0000-0000-000000000001')
$q$, 'only the host takes a night back');

select expect_rejected($q$
  select redeem_night_handover((select c from code))
$q$, 'a code is one use');

select expect_text(
  (night_hold('94000000-0000-0000-0000-000000000001') ->> 'yours'), 'true',
  'night_hold tells the taker the night is theirs');

-- The host, now.
select as_user('91000000-0000-0000-0000-000000000001');

select expect_text(night_handover_state('94000000-0000-0000-0000-000000000001'), 'taken',
  'the issuing phone learns its code was taken');
select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'false',
  'and the host no longer writes the night');
select expect_text(
  (night_hold('94000000-0000-0000-0000-000000000001') ->> 'yours'), 'false',
  'night_hold tells the host the same');

select expect_rejected($q$
  insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
  values ('95000000-0000-0000-0000-00000000000b', '94000000-0000-0000-0000-000000000001',
          4, 'buyin', '93000000-0000-0000-0000-000000000002', 500, now())
$q$, 'THE HOST CANNOT RECORD ON A NIGHT THEY PASSED — one writer, not two');

update session set status = 'live' where id = '94000000-0000-0000-0000-000000000001';
select expect_text(
  (select status::text from session where id = '94000000-0000-0000-0000-000000000001'),
  'counting', 'nor move its status — the update touches nothing');

select expect_eq((select count(*) from ledger_entry), 3,
  'the host still reads everything in their book, whoever is writing it');

select expect_rejected($q$
  insert into session (id, book_id, default_buyin, seat_count, started_at, status, writer_user_id)
  values ('94000000-0000-0000-0000-000000000009', '92000000-0000-0000-0000-000000000001',
          500, 6, now(), 'live', '91000000-0000-0000-0000-000000000002')
$q$, 'a night cannot open already handed to somebody');

-- A stranger sees none of it.
select as_user('91000000-0000-0000-0000-000000000004');
select expect_eq((select count(*) from session), 0, 'a stranger sees no night');
select expect_text(night_hold('94000000-0000-0000-0000-000000000001')::text, null,
  'and night_hold says nothing to them');

-- =============================================================================
-- 4. BACK AGAIN — BY A CODE, AND BY THE HOST TAKING IT
-- =============================================================================

select as_user('91000000-0000-0000-0000-000000000002');
delete from code;
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');

select as_user('91000000-0000-0000-0000-000000000001');
select redeem_night_handover((select c from code));

select expect_text(
  (select coalesce(writer_user_id::text, 'host') from session
    where id = '94000000-0000-0000-0000-000000000001'),
  'host', 'the host redeeming a code is the night coming home: null, not their uid');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('95000000-0000-0000-0000-000000000004', '94000000-0000-0000-0000-000000000001',
        4, 'buyin', '93000000-0000-0000-0000-000000000002', 500, now());

select as_user('91000000-0000-0000-0000-000000000002');
select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'false',
  'and the taker writes nothing once it has gone back');
select expect_eq((select count(*) from ledger_entry), 4,
  'but can still read the night they recorded part of');

-- Passed again, then taken back with no code — the flat-phone case.
select as_user('91000000-0000-0000-0000-000000000001');
delete from code;
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');
select as_user('91000000-0000-0000-0000-000000000002');
select redeem_night_handover((select c from code));
select as_user('91000000-0000-0000-0000-000000000001');
select take_back_night('94000000-0000-0000-0000-000000000001');

select expect_text(can_write_session('94000000-0000-0000-0000-000000000001')::text, 'true',
  'the host takes a night back with no code');

select as_user('91000000-0000-0000-0000-000000000002');
select expect_rejected($q$
  insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
  values ('95000000-0000-0000-0000-00000000000c', '94000000-0000-0000-0000-000000000001',
          5, 'buyin', '93000000-0000-0000-0000-000000000001', 500, now())
$q$, 'and the phone it was taken from is refused from then on');

-- =============================================================================
-- 5. A CODE THAT IS WITHDRAWN, OR REPLACED, IS DEAD
-- =============================================================================

select as_user('91000000-0000-0000-0000-000000000001');
delete from code;
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');
select expect_text(revoke_night_handover('94000000-0000-0000-0000-000000000001'), 'gone',
  'withdrawing a waiting code reports it gone');

select as_user('91000000-0000-0000-0000-000000000002');
select expect_rejected($q$
  select redeem_night_handover((select c from code))
$q$, 'a withdrawn code is refused');

select as_user('91000000-0000-0000-0000-000000000001');
delete from code;
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');
select create_night_handover('94000000-0000-0000-0000-000000000001');

select as_user('91000000-0000-0000-0000-000000000002');
select expect_rejected($q$
  select redeem_night_handover((select c from code))
$q$, 'issuing a new code retires the one before it — one live code per night');

-- =============================================================================
-- 6. THE TAKER'S BOOK-LEVEL POWERS END WITH THE NIGHT
-- =============================================================================

select as_user('91000000-0000-0000-0000-000000000001');
delete from code;
insert into code select create_night_handover('94000000-0000-0000-0000-000000000001');
select as_user('91000000-0000-0000-0000-000000000002');
select redeem_night_handover((select c from code));

insert into settlement
  (session_id, algorithm_version, rules_snapshot, inputs_snapshot, computed_transfers,
   total_off_table)
values ('94000000-0000-0000-0000-000000000001', 'settlement-v1', '[]'::jsonb, '{}'::jsonb,
        '[]'::jsonb, 0);
update session set status = 'settled', ended_at = now()
 where id = '94000000-0000-0000-0000-000000000001';

select expect_text(
  (select status::text from session where id = '94000000-0000-0000-0000-000000000001'),
  'settled', 'the taker closes the night they hold');

select expect_rejected($q$
  insert into player (id, book_id, display_name) values
    ('93000000-0000-0000-0000-000000000009', '92000000-0000-0000-0000-000000000001', 'Late')
$q$, 'with the night settled, the taker adds nobody to the roster');

-- The ticks afterwards are still the writer's: E7 happens the week after.
insert into transfer_payment (session_id, from_player_id, to_player_id, paid_at) values
  ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000002',
   '93000000-0000-0000-0000-000000000001', now());

reset role;
select set_config('request.jwt.claims', '', false);

\o
select '--------------------------------------------------' as " ";
select 'PASS THE BOOK TESTS PASSED' as " ";
select '--------------------------------------------------' as " ";
