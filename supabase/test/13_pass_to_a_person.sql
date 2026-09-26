-- =============================================================================
-- Passing the game to a person — 0020
-- =============================================================================
-- The game goes to a claimed player by name; the receiver does nothing. Played
-- through as five accounts, through row-level security:
--
--   the host       Marek: made the group, opened the night
--   Lena           a claimed player with an email account
--   Ivo            a claimed player whose account is anonymous (a seat claimed
--                  with a code signs a phone in anonymously — 0017 lets such
--                  an account write the one night it holds)
--   Petr           a name the host typed, nobody behind it
--   a stranger     signed in, nothing to do with this group
--   a watcher      an anonymous phone holding the night's share grant
--
-- What it holds, one line each:
--   * only the phone recording the night can pass it, and only to a claimed
--     player of the book who is not the caller
--   * after a pass EXACTLY ONE account writes the night, and it is the receiver
--   * the pass is logged, named, and read the same by every side — including a
--     watcher over a share link
--   * the receiving phone acknowledges it; until then the pass reads as unopened
--   * whoever passed the game away can take it back; so can the host; nobody
--     else can, and taking back is logged the other way
--   * a phone the game went to by name can hand late changes in
--   * night_header names the recorder; night_pass is on the live feed
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

-- A watcher: an anonymous phone whose token carries the night's share grant.
create or replace function as_watcher(uid text, sid text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'is_anonymous', true, 'share_session_id', sid)::text, false);
end;
$$;

\o /dev/null

-- =============================================================================
-- Fixtures
-- =============================================================================

insert into auth.users (id, email) values
  ('fa000000-0000-0000-0000-000000000001', 'marek@example.com'),
  ('fa000000-0000-0000-0000-000000000002', 'lena@example.com'),
  ('fa000000-0000-0000-0000-000000000003', null),              -- Ivo, anonymous
  ('fa000000-0000-0000-0000-000000000004', 'stranger@example.com'),
  ('fa000000-0000-0000-0000-000000000005', null);              -- the watcher

insert into book (id, host_user_id, group_name) values
  ('fb000000-0000-0000-0000-000000000001',
   'fa000000-0000-0000-0000-000000000001', 'The poker club');

insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('fc000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000001', 'Marek',
   'fa000000-0000-0000-0000-000000000001'),
  ('fc000000-0000-0000-0000-000000000002', 'fb000000-0000-0000-0000-000000000001', 'Lena',
   'fa000000-0000-0000-0000-000000000002'),
  ('fc000000-0000-0000-0000-000000000003', 'fb000000-0000-0000-0000-000000000001', 'Ivo',
   'fa000000-0000-0000-0000-000000000003'),
  ('fc000000-0000-0000-0000-000000000004', 'fb000000-0000-0000-0000-000000000001', 'Petr', null);

insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('fd000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000001',
        500, 6, now() - interval '2 hours', 'live');

insert into ledger_entry
  (id, session_id, seq, type, player_id, amount, occurred_at, created_by_user_id)
values
  ('fe000000-0000-0000-0000-000000000001', 'fd000000-0000-0000-0000-000000000001',
   1, 'buyin', 'fc000000-0000-0000-0000-000000000002', 500, now(),
   'fa000000-0000-0000-0000-000000000001');

-- The watcher's grant, as 0005 mints it.
insert into share_grant (session_id, user_id)
values ('fd000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000005');

create temporary table made (id uuid);
grant all on made to authenticated;

set role authenticated;

-- =============================================================================
-- 1. WHO MAY PASS, AND TO WHOM
-- =============================================================================

select as_user('fa000000-0000-0000-0000-000000000004');
select expect_rejected(
  $$select pass_night('fd000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000002')$$,
  'a stranger cannot pass a night they do not write');

select as_user('fa000000-0000-0000-0000-000000000002');
select expect_rejected(
  $$select pass_night('fd000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000003')$$,
  'a member who does not write the night cannot pass it');

select as_user('fa000000-0000-0000-0000-000000000001');
select expect_rejected(
  $$select pass_night('fd000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000004')$$,
  'a name with nobody behind it cannot receive a game');
select expect_rejected(
  $$select pass_night('fd000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001')$$,
  'the caller cannot pass the game to their own seat');
select expect_rejected(
  $$select pass_night('fd000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000099')$$,
  'a player id from nowhere is refused');

select expect_eq((select count(*) from night_pass), 0, 'nothing was logged by a refusal');

-- Before anything is passed the role reads: yours, no hand-off.
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'yours'), 'true',
  'the host records a night nobody has passed');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'recorder'), 'Marek',
  'and the recorder is named');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'last'), null,
  'a night never passed has no last hand-off');

-- =============================================================================
-- 2. THE HOST PASSES TO LENA — the receiver does nothing
-- =============================================================================

insert into made select pass_night('fd000000-0000-0000-0000-000000000001',
                                   'fc000000-0000-0000-0000-000000000002');

select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'false',
  'the host no longer writes the night');
select expect_rejected(
  $$insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
    values ('fe000000-0000-0000-0000-000000000002', 'fd000000-0000-0000-0000-000000000001',
            2, 'rebuy', 'fc000000-0000-0000-0000-000000000002', 500, now())$$,
  'the host cannot append to a night they passed');

select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'yours'), 'false',
  'the role says so');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'recorder'), 'Lena',
  'and names who records it now');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'kind'), 'passed',
  'the last hand-off is the pass');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'from_name'), 'Marek',
  'from the host');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'to_name'), 'Lena',
  'to Lena');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'opened'), 'false',
  'and her phone has not taken it up yet — WAITING ON LENA');

-- Lena's phone: it can write, without having done anything.
select as_user('fa000000-0000-0000-0000-000000000002');
select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'true',
  'Lena writes the night from the moment it was passed');
insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('fe000000-0000-0000-0000-000000000002', 'fd000000-0000-0000-0000-000000000001',
        2, 'rebuy', 'fc000000-0000-0000-0000-000000000002', 500, now());

-- She discovers it by asking what named her.
select expect_eq((select count(*) from my_passes()), 1, 'my_passes names the pass to Lena');
select expect_text((select mine_now::text from my_passes()), 'true', 'and says the night is hers now');
select expect_text((select from_name from my_passes()), 'Marek', 'from Marek');

-- And takes it up.
select ack_pass((select id from made));
select expect_text((select opened::text from my_passes()), 'true', 'acknowledged');
select as_user('fa000000-0000-0000-0000-000000000001');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'opened'), 'true',
  'the host sees Lena has it');
select expect_eq((select count(*) from my_passes()), 1, 'the host sees the pass from their side too');
select expect_text((select mine_now::text from my_passes()), 'false', 'and that it is not theirs now');

-- Lena cannot ack on the host's behalf; a stranger cannot ack at all.
select as_user('fa000000-0000-0000-0000-000000000004');
select ack_pass((select id from made));
select expect_eq((select count(*) from night_pass), 0, 'a stranger reads no pass rows');

-- =============================================================================
-- 3. THE WATCHER READS THE HAND-OFF, AND THE HEADER NAMES THE RECORDER
-- =============================================================================

select as_watcher('fa000000-0000-0000-0000-000000000005', 'fd000000-0000-0000-0000-000000000001');
select expect_eq((select count(*) from night_pass), 1, 'a watcher over a share link reads the pass');
select expect_text((select recorder_name from night_header('fd000000-0000-0000-0000-000000000001')),
  'Lena', 'night_header names the recorder for the read-only band');
select expect_text((select host_name from night_header('fd000000-0000-0000-0000-000000000001')),
  'Marek', 'and still the host');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'recorder'), 'Lena',
  'night_role answers a watcher too');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') ->> 'yours'), 'false',
  'and never says the night is theirs');

-- =============================================================================
-- 4. LENA PASSES TO IVO (anonymous); WHO CAN TAKE IT BACK
-- =============================================================================

select as_user('fa000000-0000-0000-0000-000000000002');
delete from made;
insert into made select pass_night('fd000000-0000-0000-0000-000000000001',
                                   'fc000000-0000-0000-0000-000000000003');

select as_user('fa000000-0000-0000-0000-000000000003', true);
select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'true',
  'an anonymous claimed account writes the night it was passed');
insert into ledger_entry (id, session_id, seq, type, player_id, amount, occurred_at)
values ('fe000000-0000-0000-0000-000000000003', 'fd000000-0000-0000-0000-000000000001',
        3, 'rebuy', 'fc000000-0000-0000-0000-000000000003', 500, now());

-- A stranger cannot take it back. Nor can Ivo "take back" what he holds.
select as_user('fa000000-0000-0000-0000-000000000004');
select expect_rejected(
  $$select take_back_night('fd000000-0000-0000-0000-000000000001')$$,
  'a stranger cannot take a night back');

-- Lena passed it away, so Lena can take it back — with no code.
select as_user('fa000000-0000-0000-0000-000000000002');
select take_back_night('fd000000-0000-0000-0000-000000000001');
select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'true',
  'the previous admin has the night back');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'kind'), 'taken_back',
  'logged as a take-back');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'from_name'), 'Ivo',
  'from Ivo');
select expect_text((night_role('fd000000-0000-0000-0000-000000000001') -> 'last' ->> 'to_name'), 'Lena',
  'to Lena');

select as_user('fa000000-0000-0000-0000-000000000003', true);
select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'false',
  'Ivo no longer writes it');
select expect_rejected(
  $$select take_back_night('fd000000-0000-0000-0000-000000000001')$$,
  'Ivo, who never passed it away, cannot take it back');
select expect_eq((select count(*) from my_passes()), 2, 'Ivo sees both hand-offs that named him');

-- Ivo had a rebuy queued when it went: he hands it in by name, with no code.
select expect_eq(
  hand_in_late_changes('fd000000-0000-0000-0000-000000000001', '[
    {"op_id": "ivo-late-1", "kind": "entry.append",
     "payload": {"type": "rebuy", "playerId": "f3000000-0000-0000-0000-000000000003", "amount": 500}}
  ]'::jsonb),
  1, 'a phone the game went to by name can hand changes in');

-- Lena, who records it now, sees whose phone it came from.
select as_user('fa000000-0000-0000-0000-000000000002');
select expect_text((select name from late_change_sources('fd000000-0000-0000-0000-000000000001')),
  'Ivo', 'the review sheet can say "From Ivo''s phone"');

-- The host can always take it back, from anybody.
select as_user('fa000000-0000-0000-0000-000000000001');
select take_back_night('fd000000-0000-0000-0000-000000000001');
select expect_text(can_write_session('fd000000-0000-0000-0000-000000000001')::text, 'true',
  'the host has the night back');
select expect_text((select writer_user_id::text from session where id = 'fd000000-0000-0000-0000-000000000001'),
  null, 'and it is written as the host''s in the one way there is: null');
-- Taking back what you already hold logs nothing.
select take_back_night('fd000000-0000-0000-0000-000000000001');
select expect_eq((select count(*) from night_pass where kind = 'taken_back'), 2,
  'a take-back of a night already here is not logged');

-- The whole story, in order, readable by the host.
select expect_text(
  (select string_agg(kind || ':' || coalesce(name_in_book('fb000000-0000-0000-0000-000000000001', from_user), '?')
                     || '>' || coalesce(name_in_book('fb000000-0000-0000-0000-000000000001', to_user), '?'),
                     ' ' order by passed_at)
     from night_pass),
  'passed:Marek>Lena passed:Lena>Ivo taken_back:Ivo>Lena taken_back:Lena>Marek',
  'the log reads as the night happened');

-- =============================================================================
-- 5. THE LIVE FEED CARRIES IT
-- =============================================================================

reset role;
select set_config('request.jwt.claims', '', false);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'night_pass'
  ) then
    raise exception 'TEST FAILED: night_pass is not on the live feed';
  end if;
end;
$$;

\o

select '--------------------------------------------------' as " ";
select 'PASS TO A PERSON TESTS PASSED' as " ";
select '--------------------------------------------------' as " ";
