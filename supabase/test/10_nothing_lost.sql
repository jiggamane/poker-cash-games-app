-- =============================================================================
-- Nothing lost when a night moves, and the code is enough — 0017
-- =============================================================================
-- Two things, played through as the accounts involved:
--
--   A PHONE WITH NO ACCOUNT TAKES A NIGHT BY ITS CODE, writes that night, and
--   writes nothing else — not another night, not a new one, not the book.
--
--   THE HOST TAKES IT BACK while that phone still has changes it had not sent.
--   The phone hands them in; they are kept, once each, with a status; the host
--   adds one and leaves one out; neither is deleted, and the phone that made
--   them can read which happened. Nobody else can hand in or decide.
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
-- Fixtures — two live nights in one book
-- =============================================================================

insert into auth.users (id, email) values
  ('81000000-0000-0000-0000-000000000001', 'lost-host@example.com'),
  ('81000000-0000-0000-0000-000000000002', null),                     -- the dealer's phone
  ('81000000-0000-0000-0000-000000000003', 'lost-stranger@example.com');

insert into book (id, host_user_id, group_name) values
  ('82000000-0000-0000-0000-000000000001',
   '81000000-0000-0000-0000-000000000001', 'Friday game');

insert into player (id, book_id, display_name) values
  ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Petr'),
  ('83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', 'Dana');

insert into session (id, book_id, default_buyin, seat_count, started_at, status) values
  ('84000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
   500, 6, now() - interval '2 hours', 'live'),
  -- The club's other table tonight. Not passed; the dealer's phone never gets it.
  ('84000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001',
   500, 6, now() - interval '2 hours', 'live');

create temporary table code (c text);
grant all on code to authenticated;

set role authenticated;

-- =============================================================================
-- 1. THE CODE IS ENOUGH — AND ONLY FOR THE NIGHT IT NAMES
-- =============================================================================

select as_user('81000000-0000-0000-0000-000000000001');
insert into code select create_night_handover('84000000-0000-0000-0000-000000000001');

select as_user('81000000-0000-0000-0000-000000000002', true);
select expect_text(redeem_night_handover((select c from code))::text,
  '84000000-0000-0000-0000-000000000001',
  'a phone with no account takes a night with its code');

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('85000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001',
        1, 'buyin', '83000000-0000-0000-0000-000000000001', 500, now());

insert into player (id, book_id, display_name) values
  ('83000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000001', 'Guest');

select expect_rejected($q$
  insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
  values ('85000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-000000000002',
          1, 'buyin', '83000000-0000-0000-0000-000000000001', 500, now())
$q$, 'but not the other table, which nobody passed it');

select expect_rejected($q$
  insert into session (id, book_id, default_buyin, seat_count, started_at, status)
  values ('84000000-0000-0000-0000-000000000009', '82000000-0000-0000-0000-000000000001',
          500, 6, now(), 'live')
$q$, 'and it cannot open a night of its own in the host''s book');

update book set group_name = 'Mine now' where id = '82000000-0000-0000-0000-000000000001';

-- =============================================================================
-- 2. TAKEN BACK — AND WHAT THE PHONE HAD NOT SENT IS KEPT
-- =============================================================================

select as_user('81000000-0000-0000-0000-000000000001');
select expect_text((select group_name from book), 'Friday game',
  'the book is the host''s: the dealer''s phone could not rename it');
select take_back_night('84000000-0000-0000-0000-000000000001');

select as_user('81000000-0000-0000-0000-000000000002', true);

select expect_rejected($q$
  insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
  values ('85000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000001',
          2, 'rebuy', '83000000-0000-0000-0000-000000000001', 500, now())
$q$, 'its unsent rebuy is refused by the ledger, as it must be');

select expect_eq(hand_in_late_changes('84000000-0000-0000-0000-000000000001', $j$[
  {"op_id": "entry:85000000-0000-0000-0000-000000000002", "kind": "entry.append",
   "payload": {"id": "85000000-0000-0000-0000-000000000002", "seq": 2, "type": "rebuy",
               "playerId": "83000000-0000-0000-0000-000000000001", "amount": 500}},
  {"op_id": "count:x:dana", "kind": "count.upsert",
   "payload": {"playerId": "83000000-0000-0000-0000-000000000002", "amount": 300}}
]$j$::jsonb), 2, 'so it hands both in instead, and both are kept');

select expect_eq(hand_in_late_changes('84000000-0000-0000-0000-000000000001', $j$[
  {"op_id": "entry:85000000-0000-0000-0000-000000000002", "kind": "entry.append",
   "payload": {}}
]$j$::jsonb), 0, 'handing the same one in again lands nothing new');

select expect_eq((select count(*) from night_late_change where status = 'waiting'), 2,
  'the phone that made them can see them, waiting');

select expect_rejected($q$
  select decide_late_change((select id from night_late_change limit 1), true)
$q$, 'but cannot decide them — it does not hold the night any more');

select expect_rejected($q$
  select hand_in_late_changes('84000000-0000-0000-0000-000000000002',
    '[{"op_id": "x", "kind": "entry.append", "payload": {}}]'::jsonb)
$q$, 'nor hand anything in for a night it never held');

select as_user('81000000-0000-0000-0000-000000000003');
select expect_rejected($q$
  select hand_in_late_changes('84000000-0000-0000-0000-000000000001',
    '[{"op_id": "y", "kind": "entry.append", "payload": {}}]'::jsonb)
$q$, 'a stranger hands in nothing');
select expect_eq((select count(*) from night_late_change), 0, 'and sees nothing');

-- The host decides.
select as_user('81000000-0000-0000-0000-000000000001');
select expect_eq((select count(*) from night_late_change), 2,
  'the phone recording the night sees what was handed in');

select decide_late_change(
  (select id from night_late_change where kind = 'entry.append'), true);
select decide_late_change(
  (select id from night_late_change where kind = 'count.upsert'), false);
select decide_late_change(
  (select id from night_late_change where kind = 'count.upsert'), true);

select expect_text(
  (select status from night_late_change where kind = 'count.upsert'), 'left_out',
  'a decision stands — deciding again changes nothing');

select as_user('81000000-0000-0000-0000-000000000002', true);
select expect_text(
  (select string_agg(status, ',' order by kind) from night_late_change),
  'left_out,added',
  'and the phone that made them reads what became of each — nothing was deleted');

reset role;
select set_config('request.jwt.claims', '', false);

\o
select '--------------------------------------------------' as " ";
select 'NOTHING LOST TESTS PASSED' as " ";
select '--------------------------------------------------' as " ";
