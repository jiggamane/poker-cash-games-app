-- =============================================================================
-- Deleting an account — 0024, B107
-- =============================================================================
-- The person leaves; the record stays. Played through as five accounts, each
-- holding the things that made a raw delete fail before 0024:
--
--   Hana    host of two groups — "Hana's club", which other people are in, and
--           "Hana's notebook", which nobody else ever claimed a seat in — and a
--           member of Kuba's game. She signed a shortfall, issued an invite
--           nobody spent, minted a handover code, and passed a night.
--   Olek    anonymous, a claimed seat in Hana's club and in Kuba's game; was
--           passed a night (settled since) and redeemed a code; has a late
--           change waiting.
--   Lior    a claimed seat in Hana's club. Stays, and keeps reading it.
--   Kuba    host of "Kuba's game", which is running tonight.
--   Wren    a watcher: an anonymous phone holding a share grant on Kuba's night.
--
-- What it holds, one line each:
--   * the plan the sheet reads says, per group, deleted or closed, and names
--     every seat held elsewhere — and changes nothing
--   * a running game refuses the delete and names it; nothing moves
--   * nobody can call the internals, or delete anybody but themselves
--   * a member deleted: seats become names, every night and hand-off stays
--   * a host deleted: the private group goes with every row in it; the group
--     with members is closed, kept, hostless, and its members still read it
--   * the shortfall keeps its amount and its time, with the signer gone
--   * a watcher deleted: the grant goes, nothing else was theirs
--   * the guards still refuse every client: a hostless open group, a shortfall
--     or a claim stored without its person, a ledger row deleted
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
-- Fixtures
-- =============================================================================
--   71…01 Hana   71…02 Olek (anon)   71…03 Lior   71…04 Kuba   71…05 Wren (anon)
--   72…01 Hana's club   72…02 Hana's notebook   72…03 Kuba's game
--   74…01 club, settled, passed to Olek, a signed shortfall
--   74…02 notebook, settled                74…03 Kuba's game, live

insert into auth.users (id, email) values
  ('71000000-0000-0000-0000-000000000001', 'hana@example.com'),
  ('71000000-0000-0000-0000-000000000002', null),
  ('71000000-0000-0000-0000-000000000003', 'lior@example.com'),
  ('71000000-0000-0000-0000-000000000004', 'kuba@example.com'),
  ('71000000-0000-0000-0000-000000000005', null);

insert into book (id, host_user_id, group_name) values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Hana''s club'),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001', 'Hana''s notebook'),
  ('72000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000004', 'Kuba''s game');

insert into player (id, book_id, display_name, claimed_by_user_id) values
  -- Hana's club
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Hana', '71000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'Olek', '71000000-0000-0000-0000-000000000002'),
  ('73000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000001', 'Lior', '71000000-0000-0000-0000-000000000003'),
  ('73000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000001', 'Pia',  null),
  -- Hana's notebook: names only, one of them Hana's own
  ('73000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000002', 'Hana', '71000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000006', '72000000-0000-0000-0000-000000000002', 'Dad',  null),
  -- Kuba's game
  ('73000000-0000-0000-0000-000000000007', '72000000-0000-0000-0000-000000000003', 'Kuba', '71000000-0000-0000-0000-000000000004'),
  ('73000000-0000-0000-0000-000000000008', '72000000-0000-0000-0000-000000000003', 'Hana', '71000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000009', '72000000-0000-0000-0000-000000000003', 'Olek', '71000000-0000-0000-0000-000000000002');

-- The invites behind the claims, as they really are: spent, with a claimant.
insert into player_invite (book_id, player_id, code, created_by, claimed_at, claimed_by) values
  ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', 'DELTEST001',
   '71000000-0000-0000-0000-000000000001', now(), '71000000-0000-0000-0000-000000000002'),
  ('72000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000008', 'DELTEST002',
   '71000000-0000-0000-0000-000000000004', now(), '71000000-0000-0000-0000-000000000001');
-- And one Hana issued to Pia that nobody has spent.
insert into player_invite (book_id, player_id, code, created_by) values
  ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000004', 'DELTEST003',
   '71000000-0000-0000-0000-000000000001');

insert into session (id, book_id, default_buyin, seat_count, started_at, status, ended_at) values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 500, 6,
   now() - interval '3 days', 'settled', now() - interval '3 days' + interval '5 hours'),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 200, 4,
   now() - interval '2 days', 'settled', now() - interval '2 days' + interval '3 hours'),
  ('74000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000003', 500, 6,
   now() - interval '1 hour', 'live', null);

-- The club's night was passed to Olek, who recorded the end of it.
select set_config('poker.handover', 'on', false);
update session set writer_user_id = '71000000-0000-0000-0000-000000000002'
 where id = '74000000-0000-0000-0000-000000000001';
select set_config('poker.handover', '', false);

insert into night_pass (session_id, kind, from_user, to_user, to_player_id, passed_at, opened_at) values
  ('74000000-0000-0000-0000-000000000001', 'passed',
   '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002',
   '73000000-0000-0000-0000-000000000002', now() - interval '3 days' + interval '4 hours', now() - interval '3 days' + interval '4 hours');

insert into night_handover (session_id, code, created_by, redeemed_at, redeemed_by) values
  ('74000000-0000-0000-0000-000000000001', 'HANDDEL01',
   '71000000-0000-0000-0000-000000000001', now() - interval '3 days', '71000000-0000-0000-0000-000000000002');

insert into night_late_change (session_id, op_id, kind, payload, from_user) values
  ('74000000-0000-0000-0000-000000000001', 'op-late-1', 'entry.append', '{}',
   '71000000-0000-0000-0000-000000000002');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id) values
  ('75000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 1, 'buyin',
   '73000000-0000-0000-0000-000000000003', 500, now() - interval '3 days', '71000000-0000-0000-0000-000000000001'),
  ('75000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001', 2, 'buyin',
   '73000000-0000-0000-0000-000000000002', 500, now() - interval '3 days', '71000000-0000-0000-0000-000000000001'),
  ('75000000-0000-0000-0000-000000000003', '74000000-0000-0000-0000-000000000002', 1, 'buyin',
   '73000000-0000-0000-0000-000000000006', 200, now() - interval '2 days', '71000000-0000-0000-0000-000000000001'),
  ('75000000-0000-0000-0000-000000000004', '74000000-0000-0000-0000-000000000003', 1, 'buyin',
   '73000000-0000-0000-0000-000000000008', 500, now() - interval '1 hour', '71000000-0000-0000-0000-000000000004');

-- The club's night came up $50 short, and Hana signed for it.
insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                        computed_transfers, total_off_table,
                        discrepancy_amount, discrepancy_confirmed_by, discrepancy_confirmed_at, discrepancy_note)
values ('74000000-0000-0000-0000-000000000001', 'settlement-v1', '{}', '{}', '[]', 0,
        -50, '71000000-0000-0000-0000-000000000001', now() - interval '3 days', 'Short at the count.');
-- The notebook's night settled clean.
insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                        computed_transfers, total_off_table)
values ('74000000-0000-0000-0000-000000000002', 'settlement-v1', '{}', '{}', '[]', 0);

-- A rule in the notebook naming one of its players as collector — `restrict`,
-- which is what a single cascade from `book` would trip over.
insert into money_rule (book_id, name, amount_kind, amount, basis, charge, destination, split, collector_player_id)
values ('72000000-0000-0000-0000-000000000002', 'Pizza', 'fixed', 10, 'gross', 'winners_only', 'bill', 'evenly',
        '73000000-0000-0000-0000-000000000006');

-- Wren watches Kuba's night.
insert into share_grant (session_id, user_id)
values ('74000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000005');

-- =============================================================================
-- 0. The guards refuse every client, before anybody is deleted
-- =============================================================================

select expect_rejected(
  $$insert into book (host_user_id, group_name) values (null, 'Nobody''s')$$,
  'an open group must have a host');

select expect_rejected(
  $$insert into settlement (session_id, algorithm_version, rules_snapshot, inputs_snapshot,
                            computed_transfers, total_off_table,
                            discrepancy_amount, discrepancy_confirmed_at)
    values ('74000000-0000-0000-0000-000000000003', 'settlement-v1', '{}', '{}', '[]', 0, -20, now())$$,
  'a shortfall is never stored without a signer');

select expect_rejected(
  $$update settlement set discrepancy_confirmed_by = null
     where session_id = '74000000-0000-0000-0000-000000000001'$$,
  'a signer whose account exists cannot be emptied');

select expect_rejected(
  $$update player_invite set claimed_by = null where code = 'DELTEST001'$$,
  'a claimant whose account exists cannot be emptied');

select expect_rejected(
  $$update night_handover set redeemed_by = null where code = 'HANDDEL01'$$,
  'a redeemer whose account exists cannot be emptied');

select expect_rejected(
  $$delete from ledger_entry where id = '75000000-0000-0000-0000-000000000003'$$,
  'the ledger is still append-only');

create temporary table answer (who text, body jsonb);
grant all on answer to authenticated;

set role authenticated;

-- =============================================================================
-- 1. Nobody reaches the internals, or anybody else
-- =============================================================================

select as_user('71000000-0000-0000-0000-000000000003');
select expect_rejected(
  $$select deletion_plan_for('71000000-0000-0000-0000-000000000001')$$,
  'nobody reads another account''s plan');
select expect_rejected(
  $$select release_seat('73000000-0000-0000-0000-000000000002')$$,
  'nobody releases a seat through the API');

reset role;
select expect_text(
  (select (has_function_privilege('anon', 'delete_my_account()', 'execute'))::text),
  'false', 'a caller with no account at all cannot reach the delete');
set role authenticated;

-- =============================================================================
-- 2. The plan, read before the hold, changes nothing
-- =============================================================================

select as_user('71000000-0000-0000-0000-000000000001');
insert into answer select 'hana-plan', account_deletion_plan();

select expect_text((select jsonb_typeof(body -> 'running') from answer where who = 'hana-plan'),
  'null', 'nothing is running on Hana''s account');
select expect_text(
  (select g ->> 'outcome' from answer, jsonb_array_elements(body -> 'groups') g
    where who = 'hana-plan' and g ->> 'group_name' = 'Hana''s club'),
  'closed', 'a group other people are in will be closed');
select expect_text(
  (select g ->> 'members' from answer, jsonb_array_elements(body -> 'groups') g
    where who = 'hana-plan' and g ->> 'group_name' = 'Hana''s club'),
  '2', 'and it counts the people who keep it');
select expect_text(
  (select g ->> 'outcome' from answer, jsonb_array_elements(body -> 'groups') g
    where who = 'hana-plan' and g ->> 'group_name' = 'Hana''s notebook'),
  'deleted', 'a group nobody else is in will be deleted');
select expect_text(
  (select s ->> 'group_name' || ' / ' || (s ->> 'host_name')
     from answer, jsonb_array_elements(body -> 'seats') s where who = 'hana-plan'),
  'Kuba''s game / Kuba', 'her seat elsewhere is named, with its host');
select expect_text((select body ->> 'store_subscription' from answer where who = 'hana-plan'),
  'false', 'no store subscription');

reset role;
select expect_eq((select count(*) from book where id::text like '72000000%'), 3,
  'reading the plan changed nothing');
set role authenticated;

-- =============================================================================
-- 3. A running game refuses, names the night, and nothing moves
-- =============================================================================

select as_user('71000000-0000-0000-0000-000000000004');
insert into answer select 'kuba-refused', delete_my_account();

select expect_text((select body ->> 'deleted' from answer where who = 'kuba-refused'),
  'false', 'Kuba is not deleted while his night runs');
select expect_text((select body ->> 'refused' from answer where who = 'kuba-refused'),
  'game_running', 'and the reason is the running game');
select expect_text((select body -> 'running' ->> 'group_name' from answer where who = 'kuba-refused'),
  'Kuba''s game', 'which is named');

reset role;
select expect_eq((select count(*) from auth.users where id = '71000000-0000-0000-0000-000000000004'), 1,
  'his account is still there');
select expect_eq((select count(*) from player where claimed_by_user_id = '71000000-0000-0000-0000-000000000004'), 1,
  'and still holds its seat');
set role authenticated;

-- =============================================================================
-- 4. A member leaves: Olek
-- =============================================================================

select as_user('71000000-0000-0000-0000-000000000002', true);
insert into answer select 'olek', delete_my_account();
select expect_text((select body ->> 'deleted' from answer where who = 'olek'),
  'true', 'an anonymous member can delete their own account');

reset role;

select expect_eq((select count(*) from auth.users where id = '71000000-0000-0000-0000-000000000002'), 0,
  'Olek''s account is gone');
select expect_eq((select count(*) from player where display_name = 'Olek' and claimed_by_user_id is null), 2,
  'both his seats are names again');
select expect_eq((select count(*) from ledger_entry where player_id = '73000000-0000-0000-0000-000000000002'), 1,
  'and the club still has his buy-in');
select expect_text(
  (select coalesce(writer_user_id::text, 'host') from session where id = '74000000-0000-0000-0000-000000000001'),
  'host', 'the night passed to him reads as the host''s again');
select expect_eq((select count(*) from night_pass where session_id = '74000000-0000-0000-0000-000000000001'
                    and to_user is null and from_user = '71000000-0000-0000-0000-000000000001'), 1,
  'the hand-off to him is still on the night, with the receiver gone');
select expect_eq((select count(*) from night_handover where code = 'HANDDEL01'
                    and redeemed_by is null and redeemed_at is not null), 1,
  'the code he redeemed is still on record');
select expect_eq((select count(*) from night_late_change where op_id = 'op-late-1'
                    and from_user is null and status = 'waiting'), 1,
  'his waiting late change is still there to be decided');
select expect_eq((select count(*) from player_invite where code = 'DELTEST001'
                    and claimed_by is null and claimed_at is not null), 1,
  'the invite he spent keeps when it was spent');

-- =============================================================================
-- 5. A host leaves: Hana
-- =============================================================================

-- She pays through the App Store. The plan says so, because deleting does not
-- stop Apple charging her.
insert into entitlement (user_id, plan, source, note)
values ('71000000-0000-0000-0000-000000000001', 'full', 'apple', 'a test');

set role authenticated;
select as_user('71000000-0000-0000-0000-000000000001');
select expect_text((account_deletion_plan() ->> 'store_subscription'),
  'true', 'a store subscription is named before the hold');

insert into answer select 'hana', delete_my_account();
select expect_text((select body ->> 'deleted' from answer where who = 'hana'),
  'true', 'Hana is deleted');

reset role;

select expect_eq((select count(*) from auth.users where id = '71000000-0000-0000-0000-000000000001'), 0,
  'her account is gone');
select expect_eq((select count(*) from entitlement where user_id = '71000000-0000-0000-0000-000000000001'), 0,
  'and her plan with it');

-- The notebook, which nobody else was in, is gone with every row in it.
select expect_eq((select count(*) from book where id = '72000000-0000-0000-0000-000000000002'), 0,
  'the private group is deleted');
select expect_eq((select count(*) from session where id = '74000000-0000-0000-0000-000000000002'), 0,
  'with its night');
select expect_eq((select count(*) from ledger_entry where id = '75000000-0000-0000-0000-000000000003'), 0,
  'and its ledger');
select expect_eq((select count(*) from player where book_id = '72000000-0000-0000-0000-000000000002'), 0,
  'and its names');

-- The club, which others are in, is closed, kept and hostless.
select expect_text(
  (select status::text || ' / ' || coalesce(host_user_id::text, 'no host') || ' / ' || (closed_at is not null)::text
     from book where id = '72000000-0000-0000-0000-000000000001'),
  'closed / no host / true', 'the group with members is closed and kept, with no host');
select expect_eq((select count(*) from ledger_entry where session_id = '74000000-0000-0000-0000-000000000001'), 2,
  'every figure on its night stays');
select expect_text(
  (select discrepancy_amount::text || ' / ' || coalesce(discrepancy_confirmed_by::text, 'gone')
          || ' / ' || (discrepancy_confirmed_at is not null)::text
     from settlement where session_id = '74000000-0000-0000-0000-000000000001'),
  '-50 / gone / true', 'the shortfall stays, signed, with the signer gone');
select expect_eq((select count(*) from player where book_id = '72000000-0000-0000-0000-000000000001'
                    and display_name = 'Hana' and claimed_by_user_id is null), 1,
  'her own seat in it is a name again');
select expect_eq((select count(*) from player where id = '73000000-0000-0000-0000-000000000008'
                    and claimed_by_user_id is null), 1,
  'and so is her seat in Kuba''s game');
select expect_eq((select count(*) from player_invite where code = 'DELTEST003'
                    and revoked_at is not null and created_by is null), 1,
  'the invite she issued and nobody spent is dead');

-- Lior keeps reading the club, every night of it.
set role authenticated;
select as_user('71000000-0000-0000-0000-000000000003');
select expect_eq((select count(*) from book where id = '72000000-0000-0000-0000-000000000001'), 1,
  'a member still reads the closed group');
select expect_eq((select count(*) from ledger_entry where session_id = '74000000-0000-0000-0000-000000000001'), 2,
  'and every figure on its night');
select expect_rejected(
  $$insert into session (book_id, default_buyin, seat_count, started_at)
    values ('72000000-0000-0000-0000-000000000001', 500, 6, now())$$,
  'nobody can start a night in a hostless group');
-- Row-level security answers an update of a row you do not host with nothing,
-- not an error — so the assertion is on what is left afterwards.
update book set host_user_id = '71000000-0000-0000-0000-000000000003', status = 'open', closed_at = null
 where id = '72000000-0000-0000-0000-000000000001';
reset role;
select expect_text(
  (select coalesce(host_user_id::text, 'no host') from book where id = '72000000-0000-0000-0000-000000000001'),
  'no host', 'it is still nobody''s');

-- =============================================================================
-- 6. A watcher leaves: Wren
-- =============================================================================

set role authenticated;
select as_user('71000000-0000-0000-0000-000000000005', true);
insert into answer select 'wren', delete_my_account();
reset role;

select expect_eq((select count(*) from share_grant where user_id = '71000000-0000-0000-0000-000000000005'), 0,
  'the watcher''s grant is gone');
select expect_eq((select count(*) from session where id = '74000000-0000-0000-0000-000000000003'), 1,
  'and the night they watched is untouched');

-- =============================================================================
-- 7. Kuba settles, and then he can go — and his group, with nobody left, goes too
-- =============================================================================

update session set status = 'settled', ended_at = now() where id = '74000000-0000-0000-0000-000000000003';

set role authenticated;
select as_user('71000000-0000-0000-0000-000000000004');
insert into answer select 'kuba', delete_my_account();
reset role;

select expect_text((select body ->> 'deleted' from answer where who = 'kuba'),
  'true', 'with the night settled, the refusal ended');
select expect_eq((select count(*) from book where id = '72000000-0000-0000-0000-000000000003'), 0,
  'everybody else had left, so the group went with him');

-- And the ledger is append-only again the moment the delete is over.
select expect_rejected(
  $$delete from ledger_entry where id = '75000000-0000-0000-0000-000000000001'$$,
  'the erasing flag does not outlive the delete');

-- =============================================================================

drop table answer;
select set_config('request.jwt.claims', '', false);

\o

select '--------------------------------------------------' as " ";
select 'DELETE ACCOUNT TESTS PASSED' as " ";
