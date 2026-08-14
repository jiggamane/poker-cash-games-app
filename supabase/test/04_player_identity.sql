-- =============================================================================
-- Claiming your place
-- =============================================================================
-- A code is a bearer credential: whoever holds it becomes the person it names.
-- That is acceptable in a trusted room and only because of the properties
-- asserted below — one use, one live code per seat, an expiry, and a host who
-- can take it back. Each of these is the difference between "a friend claimed
-- their seat" and "somebody in a group chat took Petr's history".
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
-- Fixtures — a host, a book, three seats, and two strangers with accounts
-- =============================================================================

insert into auth.users (id, email) values
  ('d1000000-0000-0000-0000-000000000001', 'invite-host@example.com'),
  ('d1000000-0000-0000-0000-000000000002', null),   -- Petr, once he claims
  ('d1000000-0000-0000-0000-000000000003', null),   -- somebody else entirely
  ('d1000000-0000-0000-0000-000000000004', 'other-host@example.com');

insert into book (id, host_user_id, group_name) values
  ('d2000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001', 'Saturday game'),
  ('d2000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000004', 'Office game');

insert into player (id, book_id, display_name) values
  ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Petr'),
  ('d3000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001', 'Dana'),
  ('d3000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000002', 'Petr');

insert into session (id, book_id, default_buyin, seat_count, started_at) values
  ('d4000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
   500, 6, now());

insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values ('d5000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001',
        1, 'buyin', 'd3000000-0000-0000-0000-000000000001', 500, now(),
        'd1000000-0000-0000-0000-000000000001');

-- =============================================================================
-- 1. ONLY THE HOST INVITES
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000003"}';

select expect_rejected(
  $$select create_player_invite('d3000000-0000-0000-0000-000000000001')$$,
  'a stranger inviting somebody to a book that is not theirs');

-- Another host, with a book of their own, is still a stranger here.
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000004"}';
select expect_rejected(
  $$select create_player_invite('d3000000-0000-0000-0000-000000000001')$$,
  'a different host inviting into somebody else''s book');

-- =============================================================================
-- 2. THE CODE
-- =============================================================================

set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000001"}';

create temporary table t (code text);
insert into t select create_player_invite('d3000000-0000-0000-0000-000000000001');

select expect_eq(length((select code from t))::bigint, 10, 'a code is ten characters');

-- Nothing in it can be misread across a table or over the phone.
select expect_eq(
  (select count(*) from t where code ~ '^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$'),
  1, 'the alphabet excludes 0/O, 1/I/L and U');

-- Re-issuing retires the old one rather than leaving two live codes for a seat.
create temporary table t2 (code text);
insert into t2 select create_player_invite('d3000000-0000-0000-0000-000000000001');

select expect_eq(
  (select count(*) from player_invite
    where player_id = 'd3000000-0000-0000-0000-000000000001'
      and claimed_at is null and revoked_at is null),
  1, 're-issuing leaves exactly one live code');

-- =============================================================================
-- 3. WHAT A CODE SHOWS BEFORE IT IS SPENT
-- =============================================================================
-- X2 greets somebody by name before they commit to anything, which means
-- reading out of a book they cannot otherwise see. It must show that and no
-- more — never a figure.

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_text(
  (select player_name from preview_player_invite((select code from t2))),
  'Petr', 'the preview names the seat');
select expect_text(
  (select group_name from preview_player_invite((select code from t2))),
  'Saturday game', 'the preview names the group');

-- A retired code shows nothing at all.
select expect_eq(
  (select count(*) from preview_player_invite((select code from t))),
  0, 'a re-issued code previews nothing');

-- The book itself is still invisible until the claim happens.
select expect_eq((select count(*) from book), 0, 'no book is readable before claiming');
select expect_eq((select count(*) from ledger_entry), 0, 'no money is readable before claiming');

-- =============================================================================
-- 4. REDEEMING
-- =============================================================================

-- The retired code is dead.
select expect_rejected(
  $$select redeem_player_invite((select code from t))$$,
  'redeeming a re-issued code');

select expect_rejected(
  $$select redeem_player_invite('ZZZZZZZZZZ')$$,
  'redeeming a code nobody issued');

-- Typed back in lower case, with the whitespace a paste leaves behind.
select expect_text(
  (select redeem_player_invite(lower('  ' || (select code from t2) || '  ')))::text,
  'd3000000-0000-0000-0000-000000000001',
  'a code survives being typed in lower case with stray spaces');

-- Checked as the HOST: a player cannot read this table at all, which is
-- asserted further down. The record of who was invited and whether they came
-- belongs to the person who sent it.
reset role;
select expect_eq(
  (select count(*) from player_invite
    where code = (select code from t2) and claimed_at is not null),
  1, 'the invite records that it was used');

set role authenticated;

-- =============================================================================
-- 5. WHAT CLAIMING BUYS — READ, AND ONLY READ
-- =============================================================================

select expect_eq((select count(*) from book), 1, 'the group is now readable');
select expect_eq((select count(*) from session), 1, 'the nights are now readable');
select expect_eq((select count(*) from ledger_entry), 1, 'the money is now readable');
select expect_eq((select count(*) from player), 2, 'the other names in the book are readable');

-- The single-writer rule survives claiming. This is the one that matters: a
-- claimed player is a reader, and the host is still the only writer.
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
    values (gen_random_uuid(), 'd4000000-0000-0000-0000-000000000001', 99, 'buyin',
            'd3000000-0000-0000-0000-000000000001', 500, now(),
            'd1000000-0000-0000-0000-000000000002')$$,
  'a claimed player writing money');

-- An UPDATE they are not allowed to make does not throw — row-level security
-- simply gives them no rows to update. Both outcomes are safe and they are not
-- the same shape, so this asserts the one that actually happens: the night is
-- untouched afterwards. Asserting an error here would have passed for the wrong
-- reason the day somebody granted them the write.
update session set status = 'settled' where id = 'd4000000-0000-0000-0000-000000000001';

reset role;
select expect_eq(
  (select count(*) from session
    where id = 'd4000000-0000-0000-0000-000000000001' and status = 'setup'),
  1, 'a claimed player cannot close a night');
set role authenticated;

select expect_rejected(
  $$insert into player (book_id, display_name)
    values ('d2000000-0000-0000-0000-000000000001', 'A friend of mine')$$,
  'a claimed player adding somebody to the roster');

-- Reading is scoped to the books they are actually in.
select expect_eq(
  (select count(*) from book where id = 'd2000000-0000-0000-0000-000000000002'),
  0, 'a claimed player cannot see a book they are not in');

-- The invite table is the host's record, not a directory of live codes.
select expect_eq((select count(*) from player_invite), 0, 'a player cannot read invites');

-- =============================================================================
-- 6. A SEAT IS CLAIMED ONCE
-- =============================================================================

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000001"}';

-- The host cannot issue a code for a seat somebody already holds.
select expect_rejected(
  $$select create_player_invite('d3000000-0000-0000-0000-000000000001')$$,
  'inviting somebody to a seat that is already claimed');

-- A second seat in the same book, for the person who already has one.
create temporary table t3 (code text);
insert into t3 select create_player_invite('d3000000-0000-0000-0000-000000000002');

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_rejected(
  $$select redeem_player_invite((select code from t3))$$,
  'one person holding two seats in one book');

-- But a different person may take it.
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000003","is_anonymous":true}';

select expect_text(
  (select redeem_player_invite((select code from t3)))::text,
  'd3000000-0000-0000-0000-000000000002',
  'a free seat goes to whoever redeems it');

-- =============================================================================
-- 7. ONE PERSON, TWO GROUPS
-- =============================================================================
-- The thing "across every group you play in" rests on: one user, a member row
-- in each book, and both books readable.

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000004"}';

create temporary table t4 (code text);
insert into t4 select create_player_invite('d3000000-0000-0000-0000-000000000003');

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000002","is_anonymous":true}';

select redeem_player_invite((select code from t4));

select expect_eq((select count(*) from book), 2, 'one person, both groups readable');
select expect_eq(
  (select count(*) from player where claimed_by_user_id = 'd1000000-0000-0000-0000-000000000002'),
  2, 'a member row in each, pointing at one user');

-- =============================================================================
-- 8. EXPIRY, AND TAKING IT BACK
-- =============================================================================

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000001"}';

insert into player (id, book_id, display_name)
values ('d3000000-0000-0000-0000-000000000004',
        'd2000000-0000-0000-0000-000000000001', 'Lena');

create temporary table t5 (code text);
insert into t5 select create_player_invite('d3000000-0000-0000-0000-000000000004');

-- Age it past its week.
reset role;
update player_invite set expires_at = now() - interval '1 day'
 where code = (select code from t5);

set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000003","is_anonymous":true}';

select expect_rejected(
  $$select redeem_player_invite((select code from t5))$$,
  'redeeming a code that has expired');
select expect_eq(
  (select count(*) from preview_player_invite((select code from t5))),
  0, 'an expired code previews nothing');

-- The host takes one back before anybody uses it.
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000001"}';

create temporary table t6 (code text);
insert into t6 select create_player_invite('d3000000-0000-0000-0000-000000000004');
select revoke_player_invite('d3000000-0000-0000-0000-000000000004');

reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"d1000000-0000-0000-0000-000000000003","is_anonymous":true}';

select expect_rejected(
  $$select redeem_player_invite((select code from t6))$$,
  'redeeming a code the host took back');

reset role;
reset request.jwt.claims;

\o

\echo '--------------------------------------------------'
\echo ' PLAYER IDENTITY TESTS PASSED'
\echo '--------------------------------------------------'
