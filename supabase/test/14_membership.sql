-- =============================================================================
-- Membership — the plan is a tier, and Regular's host night is counted — 0021
-- =============================================================================
-- Owner, 26 October: pro and club are Full; Regular has one host night a
-- billing period, checked and spent before the game is passed to them.
--
-- What it holds, one line each:
--   * full reads as full; regular as regular; no plan as free; full
--     outranks regular when an account holds several (0022 renamed pro
--     and club to full)
--   * a Regular's period is their own month, anchored to the day the plan
--     started — never the calendar month — and a plan that ends sooner
--     renews when it ends
--   * a Free account cannot be passed a game; a Regular can once a period;
--     the same game coming back to them costs nothing; a second game that
--     period is refused, naming the day the night comes back
--   * passing a game away does not refund the night; a night spent in the
--     previous period does not count in this one
--   * taking a game back is not checked
--   * a Regular opening a night spends the host night; a second night that
--     period is refused; a host with no plan at all cannot open one; a
--     founder opens as many as they like
--   * who may read the roster's memberships: the host and the recorder of a
--     night of the book; a member and a stranger get no rows
--   * a promo code can give Regular
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

create or replace function message_of(stmt text)
returns text
language plpgsql
as $$
begin
  execute stmt;
  return null;
exception
  when others then
    return sqlerrm;
end;
$$;

create or replace function expect_true(actual boolean, label text)
returns void
language plpgsql
as $$
begin
  if actual is not true then
    raise exception 'TEST FAILED: %', label;
  end if;
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
--   Marek   the host; emailed, so the shim invited him: a founder, Full
--   Lena    a claimed seat with an email; given Full by hand
--   Ivo     a claimed seat, anonymous; Regular since 40 days ago, so his
--           current period began 10 days ago and renews in 20
--   Tomáš   a claimed seat, anonymous, no plan: Free
--   Petr    a name the host typed
--   Eva     hosts a group of her own on Regular (emailed, NOT invited)
--   Dana    hosts a group of her own whose plan has lapsed (emailed, NOT invited)
--   a stranger

insert into auth.users (id, email, invited_at) values
  ('1a000000-0000-0000-0000-000000000001', 'marek@example.com', now()),
  ('1a000000-0000-0000-0000-000000000002', 'lena@example.com', null),
  ('1a000000-0000-0000-0000-000000000003', null, null),
  ('1a000000-0000-0000-0000-000000000004', null, null),
  ('1a000000-0000-0000-0000-000000000006', 'eva@example.com', null),
  ('1a000000-0000-0000-0000-000000000007', 'dana@example.com', null),
  ('1a000000-0000-0000-0000-000000000009', 'stranger@example.com', null);

insert into entitlement (user_id, plan, source, starts_at, note) values
  ('1a000000-0000-0000-0000-000000000002', 'full', 'grant', now() - interval '1 day', 'Lena'),
  ('1a000000-0000-0000-0000-000000000003', 'regular', 'grant', now() - interval '40 days', 'Ivo'),
  ('1a000000-0000-0000-0000-000000000006', 'regular', 'grant', now() - interval '3 days', 'Eva');

insert into book (id, host_user_id, group_name) values
  ('1b000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'The poker club'),
  ('1b000000-0000-0000-0000-000000000007', '1a000000-0000-0000-0000-000000000007', 'Dana''s, lapsed');

insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Marek',
   '1a000000-0000-0000-0000-000000000001'),
  ('1c000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000001', 'Lena',
   '1a000000-0000-0000-0000-000000000002'),
  ('1c000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000001', 'Ivo',
   '1a000000-0000-0000-0000-000000000003'),
  ('1c000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000001', 'Tomáš',
   '1a000000-0000-0000-0000-000000000004'),
  ('1c000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000001', 'Petr', null);

-- Two live nights of Marek's, and one settled last month.
insert into session (id, book_id, default_buyin, seat_count, started_at, status, ended_at) values
  ('1d000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001',
   500, 6, now() - interval '2 hours', 'live', null),
  ('1d000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000001',
   500, 6, now() - interval '1 hour', 'live', null),
  ('1d000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000001',
   500, 6, now() - interval '35 days', 'settled', now() - interval '35 days' + interval '4 hours');

-- Ivo's host night in his PREVIOUS period, on the settled night.
insert into host_night (user_id, session_id, spent_at) values
  ('1a000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003',
   now() - interval '35 days');

create temporary table made (id uuid);
grant all on made to authenticated;

-- The roster's ids, as the phone asks — `seatStatuses` asks by id too.
create or replace function roster()
returns uuid[]
language sql
as $$
  select array_agg(id) from player where book_id = '1b000000-0000-0000-0000-000000000001';
$$;

-- =============================================================================
-- 1. PLAN → TIER
-- =============================================================================

set role authenticated;

select as_user('1a000000-0000-0000-0000-000000000001');
select expect_text((select tier from my_membership()), 'full', 'a founder is Full');
select expect_text((select host_night_used::text from my_membership()), 'false',
  'and has no host night to use');
select expect_text((select host_night_renews_on::text from my_membership()), null,
  'nor a day it renews on');

select as_user('1a000000-0000-0000-0000-000000000002');
select expect_text((select tier from my_membership()), 'full', 'a Full grant is Full');

select as_user('1a000000-0000-0000-0000-000000000004', true);
select expect_text((select tier from my_membership()), 'free', 'no plan is Free');

select as_user('1a000000-0000-0000-0000-000000000003', true);
select expect_text((select tier from my_membership()), 'regular', 'regular is Regular');
select expect_text((select host_night_used::text from my_membership()), 'false',
  'a night spent in the previous period does not count in this one');
select expect_text(
  (select host_night_renews_on::date::text from my_membership()),
  ((now() - interval '40 days') + interval '2 months')::date::text,
  'the period is anchored to the day the plan started, a month at a time');
select expect_text((select plan from my_plan()), 'regular', 'my_plan() says regular too');

reset role;

-- Several plans at once: the best live one answers.
insert into entitlement (user_id, plan, source, ends_at, note) values
  ('1a000000-0000-0000-0000-000000000003', 'full', 'grant', now() + interval '1 day', 'a full day');
set role authenticated;
select as_user('1a000000-0000-0000-0000-000000000003', true);
select expect_text((select plan from my_plan()), 'full', 'full outranks regular');
select expect_text((select tier from my_membership()), 'full', 'and reads as Full');
reset role;
update entitlement set revoked_at = now() where note = 'a full day';

-- A Regular whose plan ends before the period does: it renews when it ends.
insert into entitlement (user_id, plan, source, ends_at, note) values
  ('1a000000-0000-0000-0000-000000000004', 'regular', 'promo', now() + interval '5 days', 'five days');
set role authenticated;
select as_user('1a000000-0000-0000-0000-000000000004', true);
select expect_text((select tier from my_membership()), 'regular', 'Tomáš is Regular for five days');
select expect_text(
  (select host_night_renews_on::date::text from my_membership()),
  (now() + interval '5 days')::date::text,
  'and the night "renews" on the day the plan ends');
reset role;
update entitlement set revoked_at = now() where note = 'five days';

-- =============================================================================
-- 2. WHO MAY READ THE ROSTER'S MEMBERSHIPS
-- =============================================================================

set role authenticated;

select as_user('1a000000-0000-0000-0000-000000000001');
select expect_text(
  (select string_agg(p.display_name || ':' || m.tier, ' ' order by p.display_name)
     from roster_membership(roster()) m
     join player p on p.id = m.player_id),
  'Ivo:regular Lena:full Marek:full Tomáš:free',
  'the host reads every claimed seat''s tier; a name-only row is not there');

select as_user('1a000000-0000-0000-0000-000000000002');
select expect_eq((select count(*) from roster_membership(roster())),
  0, 'a member who records nothing reads none of it');

select as_user('1a000000-0000-0000-0000-000000000009');
select expect_eq((select count(*) from roster_membership(roster())),
  0, 'nor a stranger');

-- =============================================================================
-- 3. PASSING: FREE NEVER, REGULAR ONCE A PERIOD, THE SAME GAME FOR NOTHING
-- =============================================================================

select as_user('1a000000-0000-0000-0000-000000000001');

select expect_true(
  message_of($$select pass_night('1d000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000004')$$)
    ilike '%on Free%',
  'a Free account cannot be passed a game');
select expect_eq((select count(*) from night_pass), 0, 'and nothing moved');

-- Marek → Ivo: his host night, spent on night 1.
insert into made select pass_night('1d000000-0000-0000-0000-000000000001',
                                   '1c000000-0000-0000-0000-000000000003');

select as_user('1a000000-0000-0000-0000-000000000003', true);
select expect_text((select host_night_used::text from my_membership()), 'true',
  'the pass spent Ivo''s host night');
select expect_text(
  (select spent_on_this::text from my_membership('1d000000-0000-0000-0000-000000000001')),
  'true', 'on this game');
select expect_text(
  (select spent_on_this::text from my_membership('1d000000-0000-0000-0000-000000000002')),
  'false', 'not on the other');

-- Ivo, recording night 1, reads the roster's tiers for the pass sheet.
select expect_text(
  (select string_agg(m.tier, ' ' order by m.tier)
     from roster_membership(roster(), '1d000000-0000-0000-0000-000000000001') m),
  'free full full regular', 'the recorder of a night reads the roster''s tiers');
select expect_text(
  (select m.spent_on_this::text
     from roster_membership(roster(), '1d000000-0000-0000-0000-000000000001') m
    where m.player_id = '1c000000-0000-0000-0000-000000000003'),
  'true', 'and which seat this game already landed on');

-- Ivo passes it to Lena (Full, nothing spent), and Lena passes it back to
-- Ivo: the same game coming back costs nothing.
select pass_night('1d000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000002');
select as_user('1a000000-0000-0000-0000-000000000002');
select pass_night('1d000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000003');
select as_user('1a000000-0000-0000-0000-000000000003', true);
select expect_text(can_write_session('1d000000-0000-0000-0000-000000000001')::text, 'true',
  'the same game came back to Ivo');
select expect_eq((select count(*) from host_night where user_id = '1a000000-0000-0000-0000-000000000003'
                                                    and spent_at > now() - interval '1 day'),
  1, 'for one host night, not two');

-- Passing it away did not refund it: night 2 cannot go to Ivo this period.
select as_user('1a000000-0000-0000-0000-000000000001');
select expect_true(
  message_of($$select pass_night('1d000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000003')$$)
    ilike '%used their host night%' || to_char((now() - interval '40 days') + interval '2 months', 'FMDD Mon') || '%',
  'a second game that period is refused, naming the day the night comes back');
select expect_text(
  (select writer_user_id::text from session where id = '1d000000-0000-0000-0000-000000000002'),
  null, 'and night 2 is still the host''s');

-- Taking a game back is not checked — the host takes night 1 back from Ivo,
-- and could pass it to him again for nothing.
select take_back_night('1d000000-0000-0000-0000-000000000001');
select expect_text(can_write_session('1d000000-0000-0000-0000-000000000001')::text, 'true',
  'the host has night 1 back');
select pass_night('1d000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000003');
select take_back_night('1d000000-0000-0000-0000-000000000001');

-- =============================================================================
-- 4. OPENING A NIGHT SPENDS IT TOO
-- =============================================================================

-- Eva, on Regular, starts a group (a plan is a plan) and opens a night.
select as_user('1a000000-0000-0000-0000-000000000006');
insert into book (id, host_user_id, group_name)
values ('1b000000-0000-0000-0000-000000000006', '1a000000-0000-0000-0000-000000000006', 'Eva''s');
insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('1d000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006',
        500, 6, now(), 'live');
select expect_text((select host_night_used::text from my_membership()), 'true',
  'opening a night on Regular is the host night');
select expect_text(
  (select spent_on_this::text from my_membership('1d000000-0000-0000-0000-000000000006')),
  'true', 'spent on the night she opened');

-- A second one this period is refused, and the refusal is recognisable.
select expect_true(
  message_of($$insert into session (id, book_id, default_buyin, seat_count, started_at, status)
               values ('1d000000-0000-0000-0000-000000000016', '1b000000-0000-0000-0000-000000000006',
                       500, 6, now(), 'live')$$)
    like 'host_night_gate:%',
  'a second night that period is refused as host_night_gate');
select expect_eq((select count(*) from session where book_id = '1b000000-0000-0000-0000-000000000006'),
  1, 'and was not stored');

-- Dana's plan lapsed: her group stands, a new night does not open.
select as_user('1a000000-0000-0000-0000-000000000007');
select expect_text((select tier from my_membership()), 'free', 'Dana has no plan');
select expect_true(
  message_of($$insert into session (id, book_id, default_buyin, seat_count, started_at, status)
               values ('1d000000-0000-0000-0000-000000000017', '1b000000-0000-0000-0000-000000000007',
                       500, 6, now(), 'live')$$)
    like 'host_night_gate:%',
  'a host with no plan cannot open a night');

-- A founder opens as many as they like.
select as_user('1a000000-0000-0000-0000-000000000001');
insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('1d000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000001',
        500, 6, now(), 'live');
insert into session (id, book_id, default_buyin, seat_count, started_at, status)
values ('1d000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000001',
        500, 6, now(), 'live');
select expect_eq((select count(*) from host_night where user_id = '1a000000-0000-0000-0000-000000000001'),
  0, 'and spends nothing');

reset role;

-- =============================================================================
-- 5. A CODE CAN GIVE REGULAR
-- =============================================================================

insert into app_admin (user_id) values ('1a000000-0000-0000-0000-000000000001');
set role authenticated;
select as_user('1a000000-0000-0000-0000-000000000001');
create temporary table code_made (c text);
grant all on code_made to authenticated;
insert into code_made select admin_create_promo('regular', 30, 1, 'ONENIGHT');
select as_user('1a000000-0000-0000-0000-000000000009');
select expect_text((select plan from redeem_promo_code('ONENIGHT')), 'regular',
  'a promo code can give Regular');
select expect_text((select tier from my_membership()), 'regular', 'and the account reads Regular');
reset role;
select set_config('request.jwt.claims', '', false);

\o

select '--------------------------------------------------' as " ";
select 'MEMBERSHIP TESTS PASSED' as " ";
