-- =============================================================================
-- The night's header — who may read it, and what it says
-- =============================================================================
-- `night_header` exists so X1a and X1c can say "kept by Marek" without opening
-- the `book` table to watchers. The thing worth asserting is the boundary: it
-- must answer for the three readers who can already read the night, and it must
-- say NOTHING to anybody else — including saying nothing about whether the
-- night exists.
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
-- Fixtures — a host who plays, a member, a watcher, and a stranger
-- =============================================================================

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'header-host@example.com'),
  ('a1000000-0000-0000-0000-000000000002', null),  -- Lena, a claimed member
  ('a1000000-0000-0000-0000-000000000003', null),  -- a watcher, anonymous
  ('a1000000-0000-0000-0000-000000000004', null);  -- a stranger

insert into book (id, host_user_id, group_name) values
  ('a2000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001', 'The poker club');

-- The host sits at their own table, which is how they have a name to show.
insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001',
   'Marek', 'a1000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001',
   'Lena', 'a1000000-0000-0000-0000-000000000002'),
  ('a3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001',
   'Dana', null);

insert into session (id, book_id, default_buyin, seat_count, started_at, share_token)
values ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001',
        500, 6, now() - interval '4 hours', 'header-share-token');

insert into session_seat (session_id, player_id) values
  ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'),
  ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002'),
  ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003');

-- =============================================================================
-- 1. THE HOST READS THEIR OWN NIGHT
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000001"}';

select expect_text(
  (select host_name from night_header('a4000000-0000-0000-0000-000000000001')),
  'Marek', 'the host is named by their own player row');

select expect_text(
  (select group_name from night_header('a4000000-0000-0000-0000-000000000001')),
  'The poker club', 'and the group is named');

select expect_eq(
  (select player_count from night_header('a4000000-0000-0000-0000-000000000001'))::bigint,
  3, 'and the seat count is the seats, not the roster');

-- The rounding rule travels with the header so a watcher settles the night to
-- the host's figures rather than to their own. Null here, which is whole
-- dollars, and the point of asserting it is that the column is THERE.
select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000001')
    where rounding_mode is null),
  1, 'and the night carries its rounding rule — unset, which is whole dollars');

update session set rounding_mode = 'hundreds'
 where id = 'a4000000-0000-0000-0000-000000000001';

select expect_text(
  (select rounding_mode from night_header('a4000000-0000-0000-0000-000000000001')),
  'hundreds', 'and a group that settles in hundreds says so through the header');

update session set rounding_mode = null
 where id = 'a4000000-0000-0000-0000-000000000001';

-- =============================================================================
-- 2. A CLAIMED MEMBER READS IT
-- =============================================================================

set request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000002"}';

select expect_text(
  (select host_name from night_header('a4000000-0000-0000-0000-000000000001')),
  'Marek', 'a claimed member gets the same header');

-- =============================================================================
-- 3. A WATCHER READS IT — AND ONLY AFTER REDEEMING
-- =============================================================================
-- Before the grant, the same call says nothing at all. This is the assertion
-- that matters: the function is not a way around 0001's policies.

set request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000003"}';

select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000001')),
  0, 'a device with no grant reads nothing');

select redeem_share_token('header-share-token');

-- The grant reaches a real watcher inside their next token. The test harness
-- has no auth server to mint one, so the claim is set the way the hook would.
set request.jwt.claims =
  '{"sub":"a1000000-0000-0000-0000-000000000003","share_session_id":"a4000000-0000-0000-0000-000000000001"}';

select expect_text(
  (select host_name from night_header('a4000000-0000-0000-0000-000000000001')),
  'Marek', 'a watcher holding the claim can name the host');

select expect_text(
  (select group_name from night_header('a4000000-0000-0000-0000-000000000001')),
  'The poker club', 'and can name the group, which no table would have told them');

-- =============================================================================
-- 4. A STRANGER READS NOTHING, AND LEARNS NOTHING FROM THE SHAPE OF IT
-- =============================================================================
-- Zero rows for a night that exists, and zero rows for one that does not, so
-- the answer cannot be used to test whether a session id is real.

set request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000004"}';

select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000001')),
  0, 'a stranger reads nothing about a night that exists');

select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000009')),
  0, 'and exactly as much about one that does not');

-- A watcher holding a grant for ONE night learns nothing about another.
reset role;
insert into session (id, book_id, default_buyin, seat_count, started_at)
values ('a4000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001',
        500, 6, now());

set request.jwt.claims =
  '{"sub":"a1000000-0000-0000-0000-000000000003","share_session_id":"a4000000-0000-0000-0000-000000000001"}';
set role authenticated;

select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000002')),
  0, 'and a watcher of one night reads nothing about the next one');

-- =============================================================================
-- 5. A HOST WHO DOES NOT PLAY HAS NO NAME TO GIVE
-- =============================================================================
-- Null rather than a guess. The screens drop the "kept by" segment; inventing
-- a name here would put a wrong one in front of a reader who cannot check it.

reset role;

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000005', 'absent-host@example.com');
insert into book (id, host_user_id, group_name) values
  ('a2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000005', 'Office game');
insert into session (id, book_id, default_buyin, seat_count, started_at)
values ('a4000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000002',
        500, 6, now());

set request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000005"}';
set role authenticated;

select expect_text(
  (select host_name from night_header('a4000000-0000-0000-0000-000000000003')),
  null, 'a host who never sat down has no name on the meta line');

select expect_eq(
  (select count(*) from night_header('a4000000-0000-0000-0000-000000000003')),
  1, 'but the header is still there, with the rest of it');

reset role;

\o

\echo '--------------------------------------------------'
\echo ' NIGHT HEADER TESTS PASSED'
\echo '--------------------------------------------------'
