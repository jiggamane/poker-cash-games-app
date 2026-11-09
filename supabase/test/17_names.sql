-- =============================================================================
-- Every group's admin has a name — 0029, B48
-- =============================================================================
--   Andro   admin of "Thursday", plays, so has a seat in it
--   Mira    admin of "Mira's table", runs it without playing — no seat
--   Petr    a claimed seat in Thursday
--   Ola     an anonymous phone
--
-- What it holds:
--   * before the admin's seat is bound, the invite preview has no admin name
--     (B48 as it was); bound, it says "Andro"
--   * bind_my_seat binds only the caller's own free seat in the caller's own
--     group, once, and kills any code out for it
--   * an admin with no seat is named by their account; nobody else ever is
--   * a name is set by an email account only, trimmed, 1–40 characters, and
--     read back by that account alone
--   * the delete sheet's seat line names the admin the same way
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

insert into auth.users (id, email, invited_at) values
  ('61000000-0000-0000-0000-000000000001', 'andro@example.com', now()),
  ('61000000-0000-0000-0000-000000000002', 'mira@example.com', now()),
  ('61000000-0000-0000-0000-000000000003', null, null),
  ('61000000-0000-0000-0000-000000000004', null, null);

insert into book (id, host_user_id, group_name) values
  ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'Thursday'),
  ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002', 'Mira''s table');

insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'Andro', null),
  ('63000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000001', 'Petr',
   '61000000-0000-0000-0000-000000000003'),
  ('63000000-0000-0000-0000-000000000003', '62000000-0000-0000-0000-000000000001', 'Goga', null),
  ('63000000-0000-0000-0000-000000000004', '62000000-0000-0000-0000-000000000002', 'Rati', null);

insert into player_invite (book_id, player_id, code, created_by) values
  ('62000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'NAMESGOGA1',
   '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '63000000-0000-0000-0000-000000000004', 'NAMESRATI1',
   '61000000-0000-0000-0000-000000000002'),
  -- A code out for Andro's own seat, which binding it must kill.
  ('62000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001', 'NAMESANDR1',
   '61000000-0000-0000-0000-000000000001');

create temporary table answer (who text, ok boolean);
grant all on answer to authenticated;

set role authenticated;

-- =============================================================================
-- 1. B48 as it was: the admin has no name
-- =============================================================================

select as_user('61000000-0000-0000-0000-000000000004', true);
select expect_text((select host_name from preview_player_invite('NAMESGOGA1')), null,
  'before the admin''s seat is bound, the invite cannot name the admin');

-- =============================================================================
-- 2. Binding the admin's own seat
-- =============================================================================

select as_user('61000000-0000-0000-0000-000000000002');
insert into answer select 'mira-takes-andro', bind_my_seat('63000000-0000-0000-0000-000000000001');
select as_user('61000000-0000-0000-0000-000000000003', true);
insert into answer select 'anon-binds', bind_my_seat('63000000-0000-0000-0000-000000000001');
select as_user('61000000-0000-0000-0000-000000000001');
insert into answer select 'andro-takes-petr', bind_my_seat('63000000-0000-0000-0000-000000000002');
insert into answer select 'andro-binds', bind_my_seat('63000000-0000-0000-0000-000000000001');
insert into answer select 'andro-again', bind_my_seat('63000000-0000-0000-0000-000000000001');
insert into answer select 'andro-second-seat', bind_my_seat('63000000-0000-0000-0000-000000000003');

select expect_text((select ok::text from answer where who = 'mira-takes-andro'), 'false',
  'nobody binds a seat in somebody else''s group');
select expect_text((select ok::text from answer where who = 'anon-binds'), 'false',
  'an anonymous phone binds nothing');
select expect_text((select ok::text from answer where who = 'andro-takes-petr'), 'false',
  'the admin cannot take a seat somebody has claimed');
select expect_text((select ok::text from answer where who = 'andro-binds'), 'true',
  'the admin binds their own free seat');
select expect_text((select ok::text from answer where who = 'andro-again'), 'true',
  'and binding it again is a yes that changes nothing');
select expect_text((select ok::text from answer where who = 'andro-second-seat'), 'false',
  'and they hold one seat in their group, not two');

reset role;
select expect_text(
  (select string_agg(display_name || '=' || coalesce(claimed_by_user_id::text, '-'), ', ' order by display_name)
     from player where book_id = '62000000-0000-0000-0000-000000000001'),
  'Andro=61000000-0000-0000-0000-000000000001, Goga=-, Petr=61000000-0000-0000-0000-000000000003',
  'exactly one seat moved, and it was the admin''s own');
select expect_text(
  (select (revoked_at is not null)::text from player_invite where code = 'NAMESANDR1'),
  'true', 'the code that was out for the admin''s seat is dead');
set role authenticated;

select as_user('61000000-0000-0000-0000-000000000004', true);
select expect_text((select host_name from preview_player_invite('NAMESGOGA1')), 'Andro',
  'bound, the invite names the admin');

-- =============================================================================
-- 3. An admin with no seat is named by their account — and only an admin
-- =============================================================================

select expect_text((select host_name from preview_player_invite('NAMESRATI1')), null,
  'an admin with no seat and no name is still a blank — the app must ask');

select as_user('61000000-0000-0000-0000-000000000002');
select set_my_name('  Mira   Kova  ');
select expect_text(my_name(), 'Mira Kova', 'a name is trimmed and its spaces collapsed');

select as_user('61000000-0000-0000-0000-000000000004', true);
select expect_text((select host_name from preview_player_invite('NAMESRATI1')), 'Mira Kova',
  'an admin who does not play is named by their account');

select as_user('61000000-0000-0000-0000-000000000001');
select set_my_name('Andro the Account');
select expect_text(name_in_book('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  'Andro', 'an admin with a seat is named by the seat, not the account');
select expect_text(name_in_book('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001'),
  null, 'and nobody is named by their account in a group they do not run');

-- =============================================================================
-- 4. Setting a name
-- =============================================================================

select as_user('61000000-0000-0000-0000-000000000003', true);
select expect_rejected($$select set_my_name('Petr')$$, 'an anonymous phone has no account name');

select as_user('61000000-0000-0000-0000-000000000002');
select expect_rejected($$select set_my_name('   ')$$, 'a name cannot be blank');
select expect_rejected($$select set_my_name(repeat('x', 41))$$, 'a name is at most 40 characters');
select expect_text(my_name(), 'Mira Kova', 'a refused name leaves the old one');

select as_user('61000000-0000-0000-0000-000000000001');
select expect_text((select count(*)::text from profile), '1', 'an account reads its own name and no other');

reset role;
select expect_text(
  (select (has_function_privilege('anon', 'set_my_name(text)', 'execute')
        or has_function_privilege('anon', 'bind_my_seat(uuid)', 'execute')
        or has_function_privilege('anon', 'my_name()', 'execute'))::text),
  'false', 'a caller with no account at all reaches none of it');
select expect_text(
  (select (has_function_privilege('authenticated', 'deletion_plan_for(uuid)', 'execute'))::text),
  'false', 'redefining the delete plan did not reopen it');

-- =============================================================================
-- 5. The delete sheet names the admin the same way
-- =============================================================================

select expect_text(
  (select s ->> 'host_name'
     from jsonb_array_elements(deletion_plan_for('61000000-0000-0000-0000-000000000003') -> 'seats') s),
  'Andro', 'a member''s seat on the delete sheet names its admin');

-- =============================================================================

drop table answer;
select set_config('request.jwt.claims', '', false);

\o

select '--------------------------------------------------' as " ";
select 'NAMES TESTS PASSED' as " ";
