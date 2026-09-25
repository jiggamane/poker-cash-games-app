-- =============================================================================
-- Who may start a group, and what an account is entitled to — 0018
-- =============================================================================
-- Named 11 because 09 and 10 belong to the parked pass-the-book branch.
--
-- What it holds:
--   · an account with no plan cannot create a book, whatever the app sends;
--   · everybody already in, and a dashboard invite, is a founder — once;
--   · a promo code spent on an anonymous phone is a plan, and opens a group
--     only once the account has an email;
--   · losing the plan stops a NEW group, never an existing one;
--   · my_plan() reads the best live grant; a revoke ends it;
--   · promo codes are counted and once per account;
--   · the admin functions refuse anybody signed in who is not an admin.
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

\o /dev/null

-- =============================================================================
-- Fixtures
-- =============================================================================
--   ac…01  the admin, invited from the dashboard
--   ac…02  a stranger with an email who signed up by calling the API directly
--   ac…03  a friend, anonymous on the phone, who will be given a code
--   ac…04  a second friend, anonymous
--   ac…05  a friend with an email, for grants

insert into auth.users (id, email, invited_at) values
  ('ac000000-0000-0000-0000-000000000001', 'admin@example.com', now()),
  ('ac000000-0000-0000-0000-000000000002', 'stranger@example.com', null),
  ('ac000000-0000-0000-0000-000000000003', null, null),
  ('ac000000-0000-0000-0000-000000000004', null, null),
  ('ac000000-0000-0000-0000-000000000005', 'friend@example.com', null);

insert into app_admin (user_id) values ('ac000000-0000-0000-0000-000000000001');

-- =============================================================================
-- 1. The door
-- =============================================================================

select expect_text(
  (select source from entitlement where user_id = 'ac000000-0000-0000-0000-000000000001'),
  'founder', 'a dashboard invite is a founder');

select expect_text(
  (select count(*)::text from entitlement where user_id = 'ac000000-0000-0000-0000-000000000002'),
  '0', 'a signup nobody invited is not');

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000002"}';

select expect_rejected(
  $$insert into book (host_user_id, group_name)
    values ('ac000000-0000-0000-0000-000000000002', 'Uninvited')$$,
  'an account with no plan cannot start a group');

select expect_text(my_plan.plan, 'free', 'and its plan is free')
  from my_plan();

select expect_rejected(
  $$select admin_create_promo('pro', null, 1, 'LETMEIN')$$,
  'a signed-in account that is not an admin cannot make a code');

select expect_rejected(
  $$select admin_grant('stranger@example.com')$$,
  'nor grant itself a plan');

reset role;
reset request.jwt.claims;

-- The admin, signed in, makes a code. And from the SQL editor — no role, no
-- JWT — a second one.
set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000001"}';

create temporary table made (c text);
grant all on made to authenticated;
insert into made select admin_create_promo('pro', null, 1, 'friday', null, 'for the Friday group');

select expect_text((select c from made), 'FRIDAY', 'a chosen code is kept, uppercased');

insert into book (host_user_id, group_name)
values ('ac000000-0000-0000-0000-000000000001', 'The admin''s own');

reset role;
reset request.jwt.claims;

select expect_text(
  length(admin_create_promo())::text, '10',
  'the SQL editor can make a code too, ten characters when none is chosen');

-- =============================================================================
-- 2. A friend spends the code on a phone that has nothing yet
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000003","is_anonymous":true}';

select expect_rejected(
  $$select * from redeem_promo_code('NOT-A-CODE')$$,
  'a wrong code opens nothing');

select expect_text(promo_code_opens('Friday')::text, 'true', 'a live code says so before it is spent');
select expect_text(promo_code_opens('NOT-A-CODE')::text, 'false', 'and a wrong one says not');

select * from redeem_promo_code('  friday ');

select expect_text(promo_code_opens('FRIDAY')::text, 'false', 'a used-up code no longer opens');

select expect_text(can_start_group()::text, 'true', 'a spent code is a plan, typed any old way');

select expect_rejected(
  $$insert into book (host_user_id, group_name)
    values ('ac000000-0000-0000-0000-000000000003', 'Too early')$$,
  'but while the account is anonymous it still cannot hold a book');

-- The email is confirmed: the same user id, no longer anonymous.
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000003","is_anonymous":false}';

insert into book (id, host_user_id, group_name)
values ('ac200000-0000-0000-0000-000000000003',
        'ac000000-0000-0000-0000-000000000003', 'The friend''s group');

reset role;
reset request.jwt.claims;

-- The code was for one person. The second friend is refused.
set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000004","is_anonymous":true}';

select expect_rejected(
  $$select * from redeem_promo_code('FRIDAY')$$,
  'a used-up code opens nothing');

reset role;
reset request.jwt.claims;

-- The friend's plan is taken away. Their group is not.
update entitlement set revoked_at = now()
 where user_id = 'ac000000-0000-0000-0000-000000000003';

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000003","is_anonymous":false}';

select expect_rejected(
  $$insert into book (host_user_id, group_name)
    values ('ac000000-0000-0000-0000-000000000003', 'A second group')$$,
  'without a plan, no new group');

update book set group_name = 'Still the friend''s group'
 where id = 'ac200000-0000-0000-0000-000000000003';

reset role;
reset request.jwt.claims;

select expect_text(
  (select group_name from book where id = 'ac200000-0000-0000-0000-000000000003'),
  'Still the friend''s group', 'but the group they have is still theirs to write');

-- =============================================================================
-- 3. Plans: grants, promo codes, the best live one
-- =============================================================================

-- A comp given by hand, for thirty days, from the SQL editor.
create temporary table granted (id uuid);
insert into granted select admin_grant('FRIEND@example.com', 'pro', 30, 'plays Fridays');

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000005"}';

select expect_text(my_plan.source, 'grant', 'a hand grant is a plan')
  from my_plan();

select expect_text(
  (select count(*)::text from entitlement), '1',
  'and an account reads its own grants and nobody else''s');

reset role;
reset request.jwt.claims;

select admin_revoke((select id from granted), 'moved away');

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000005"}';

select expect_text(my_plan.plan, 'free', 'a revoked grant is no plan')
  from my_plan();

reset role;
reset request.jwt.claims;

select admin_create_promo('pro', 365, 2, 'year-on-me', null, 'Christmas');
select admin_create_promo('club', null, 1, 'CLUB-FOREVER');

set role authenticated;
set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000005"}';

select expect_text(r.plan, 'pro', 'a promo code grants its plan')
  from redeem_promo_code('year-on-me') r;

select expect_rejected(
  $$select * from redeem_promo_code('YEAR-ON-ME')$$,
  'once per account');

select expect_text(my_plan.source, 'promo', 'and my_plan reads it')
  from my_plan();

select * from redeem_promo_code('club-forever');

select expect_text(my_plan.plan, 'club', 'club outranks pro')
  from my_plan();
select expect_text(my_plan.ends_at::text, null, 'and lasts for ever')
  from my_plan();

set request.jwt.claims = '{"sub":"ac000000-0000-0000-0000-000000000003","is_anonymous":false}';

select expect_rejected(
  $$select * from redeem_promo_code('CLUB-FOREVER')$$,
  'a single-use code is used up');

select * from redeem_promo_code('YEAR-ON-ME');

select expect_text(my_plan.plan, 'pro', 'the friend is back on a plan')
  from my_plan();

select expect_rejected(
  $$insert into entitlement (user_id, plan, source)
    values ('ac000000-0000-0000-0000-000000000003', 'club', 'grant')$$,
  'nobody writes a plan for themselves');

reset role;
reset request.jwt.claims;

select expect_text(
  (select redeemed_count::text from promo_code where code = 'YEAR-ON-ME'),
  '2', 'the two-use code counted both');

select expect_rejected(
  $$select admin_grant('nobody@example.com')$$,
  'a grant to an address with no account is refused, not silently dropped');

\o
select '--------------------------------------------------' as " ";
select ' ACCOUNT AND PLAN TESTS PASSED' as " ";
select '--------------------------------------------------' as " ";
