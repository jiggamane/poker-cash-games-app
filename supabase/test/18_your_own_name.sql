-- =============================================================================
-- A player names their own seat — 0030
-- =============================================================================
--   Kuba   the admin of "Fridays", with a name and a plan
--   Petr   anonymous, claimed the seat Kuba typed as "Petr"
--   Ola    anonymous, claimed "Ola"
--   Mira   anonymous, claimed "Mira" — she will delete her account
--
-- What it holds:
--   * only the person behind a seat renames it; the admin's name is kept
--   * the admin's phone re-sending the old name, or renaming the seat, changes
--     the name to come back to — never the name the group sees
--   * nobody sets the kept name directly
--   * a name already in the group is refused; blank and over-long are refused
--   * renaming back to the admin's name makes it the admin's again
--   * the admin can put their own name back; a member cannot
--   * leaving — deleting the account, or a reset — puts the admin's name back
--   * the name the group sees is the player's: night_header, the plan
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

-- Both names on a seat, as "shown / kept".
create or replace function names_of(seat uuid)
returns text
language sql
as $$
  select display_name || ' / ' || coalesce(admin_name, '-') from player where id = seat;
$$;

\o /dev/null

insert into auth.users (id, email, invited_at) values
  ('41000000-0000-0000-0000-000000000001', 'kuba@example.com', now()),
  ('41000000-0000-0000-0000-000000000002', null, null),
  ('41000000-0000-0000-0000-000000000003', null, null),
  ('41000000-0000-0000-0000-000000000004', null, null);

insert into entitlement (user_id, plan, source, note)
values ('41000000-0000-0000-0000-000000000001', 'full', 'grant', 'test host');
insert into profile (user_id, name) values ('41000000-0000-0000-0000-000000000001', 'Kuba');

insert into book (id, host_user_id, group_name) values
  ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Fridays');

insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Kuba', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'Petr', '41000000-0000-0000-0000-000000000002'),
  ('43000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000001', 'Ola',  '41000000-0000-0000-0000-000000000003'),
  ('43000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000001', 'Mira', '41000000-0000-0000-0000-000000000004');

set role authenticated;

-- =============================================================================
-- 1. Only the person behind a seat renames it
-- =============================================================================

select as_user('41000000-0000-0000-0000-000000000003', true);
select expect_rejected($$select rename_my_seat('43000000-0000-0000-0000-000000000002', 'Pete')$$,
  'a member cannot rename somebody else''s seat');
select as_user('41000000-0000-0000-0000-000000000001');
select expect_rejected($$select rename_my_seat('43000000-0000-0000-0000-000000000002', 'Pete')$$,
  'nor can the admin, through this door');

select as_user('41000000-0000-0000-0000-000000000002', true);
select expect_rejected($$select rename_my_seat('43000000-0000-0000-0000-000000000002', 'Ola')$$,
  'a name somebody in the group already has is refused');
select expect_rejected($$select rename_my_seat('43000000-0000-0000-0000-000000000002', '   ')$$,
  'a blank name is refused');
select expect_rejected($$select rename_my_seat('43000000-0000-0000-0000-000000000002', repeat('p', 41))$$,
  'a name over 40 characters is refused');
select rename_my_seat('43000000-0000-0000-0000-000000000002', '  Pete  ');

reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002'), 'Pete / Petr',
  'an anonymous member renamed their own seat, and the admin''s name is kept');
set role authenticated;

-- =============================================================================
-- 2. The admin's phone cannot write over it
-- =============================================================================

select as_user('41000000-0000-0000-0000-000000000001');
-- The roster sync, sending the name the admin's phone still holds.
insert into player (id, book_id, display_name) values
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'Petr')
on conflict (id) do update set display_name = excluded.display_name;
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002'), 'Pete / Petr',
  'the admin''s phone re-sending the old name changes nothing the group sees');
set role authenticated;

select as_user('41000000-0000-0000-0000-000000000001');
update player set display_name = 'Peter' where id = '43000000-0000-0000-0000-000000000002';
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002'), 'Pete / Peter',
  'the admin renaming it changes the name to come back to; their choice wins');
set role authenticated;

select as_user('41000000-0000-0000-0000-000000000001');
update player set admin_name = null where id = '43000000-0000-0000-0000-000000000002';
update player set admin_name = 'Sneaky' where id = '43000000-0000-0000-0000-000000000003';
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002') || ' · ' || names_of('43000000-0000-0000-0000-000000000003'),
  'Pete / Peter · Ola / -', 'nobody sets the kept name directly');
set role authenticated;

-- =============================================================================
-- 3. The admin puts their own name back; a member cannot
-- =============================================================================

select as_user('41000000-0000-0000-0000-000000000003', true);
select expect_rejected($$select use_admin_name('43000000-0000-0000-0000-000000000002')$$,
  'a member cannot put the admin''s name back');
select as_user('41000000-0000-0000-0000-000000000001');
select use_admin_name('43000000-0000-0000-0000-000000000002');
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002'), 'Peter / -',
  'the admin''s name is back, and the seat is the admin''s to name again');
set role authenticated;

-- Renaming back to exactly the admin's name makes it theirs again.
select as_user('41000000-0000-0000-0000-000000000002', true);
select rename_my_seat('43000000-0000-0000-0000-000000000002', 'Pete');
select rename_my_seat('43000000-0000-0000-0000-000000000002', 'peter');
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000002'), 'peter / -',
  'choosing the admin''s own name again leaves nothing to come back to');
set role authenticated;

-- =============================================================================
-- 4. Leaving puts the admin's name back
-- =============================================================================

select as_user('41000000-0000-0000-0000-000000000004', true);
select rename_my_seat('43000000-0000-0000-0000-000000000004', 'Mira K');
select delete_my_account();
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000004') || ' · ' ||
                   coalesce((select claimed_by_user_id::text from player where id = '43000000-0000-0000-0000-000000000004'), 'free'),
  'Mira / - · free', 'deleting the account puts the admin''s name back on the seat');
set role authenticated;

select as_user('41000000-0000-0000-0000-000000000003', true);
select rename_my_seat('43000000-0000-0000-0000-000000000003', 'Olka');
select as_user('41000000-0000-0000-0000-000000000001');
select revoke_player_invite('43000000-0000-0000-0000-000000000003');
reset role;
select expect_text(names_of('43000000-0000-0000-0000-000000000003') || ' · ' ||
                   coalesce((select claimed_by_user_id::text from player where id = '43000000-0000-0000-0000-000000000003'), 'free'),
  'Ola / - · free', 'a reset puts the admin''s name back too');

select expect_text(
  (select (has_function_privilege('anon', 'rename_my_seat(uuid,text)', 'execute')
        or has_function_privilege('anon', 'use_admin_name(uuid)', 'execute')
        or has_function_privilege('authenticated', 'clean_name(text)', 'execute'))::text),
  'false', 'nothing here is reachable without an account, and the helper not at all');

-- =============================================================================

select set_config('request.jwt.claims', '', false);

\o

select '--------------------------------------------------' as " ";
select 'YOUR OWN NAME TESTS PASSED' as " ";
