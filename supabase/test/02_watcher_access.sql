-- =============================================================================
-- Watcher access tests
-- =============================================================================
-- 01 proves that a JWT carrying share_session_id reads exactly one night. This
-- file proves the other half: that the claim can only be obtained by holding a
-- real link, that the host can take it away, and that an anonymous watcher
-- cannot turn themselves into a host.
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
      return;  -- rejected as intended
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

-- What the auth server would hand the hook for this user.
create or replace function token_claims_for(who uuid)
returns jsonb
language sql
as $$
  select custom_access_token_hook(jsonb_build_object(
    'user_id', who::text,
    'claims',  jsonb_build_object('sub', who::text, 'role', 'authenticated')
  )) -> 'claims';
$$;

\o /dev/null

-- =============================================================================
-- Fixtures — a live night, a night in a closed book, and three people
-- =============================================================================

insert into auth.users (id, email) values
  ('aa000000-0000-0000-0000-000000000001', 'watcher-host@example.com'),
  ('aa000000-0000-0000-0000-000000000002', null),   -- an anonymous watcher
  ('aa000000-0000-0000-0000-000000000003', null);   -- a stranger, also anonymous

insert into book (id, host_user_id, group_name, status, closed_at) values
  ('bb000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
   'Friday game', 'open', null),
  ('bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
   'Last winter', 'closed', now());

insert into session (id, book_id, default_buyin, seat_count, started_at, share_token) values
  ('55000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001',
   500, 8, now(), 'share-token-live-night'),
  ('55000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002',
   500, 8, now(), 'share-token-closed-book');

-- =============================================================================
-- 1. REDEEMING A LINK
-- =============================================================================

set role authenticated;

-- No identity at all: there is nobody to hold the grant.
reset request.jwt.claims;
select expect_rejected(
  $$select redeem_share_token('share-token-live-night')$$,
  'redeem with no signed-in user');

set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_rejected(
  $$select redeem_share_token('not-a-real-token')$$,
  'redeem with an unknown token');

-- A closed book is closed to watchers too, and says the same thing an unknown
-- token says.
select expect_rejected(
  $$select redeem_share_token('share-token-closed-book')$$,
  'redeem against a closed book');

select expect_text(
  (select redeem_share_token('share-token-live-night'))::text,
  '55000000-0000-0000-0000-000000000001',
  'redeeming a live link returns the session');

-- Redeeming again is the same grant, not a second one. Watchers re-open links.
select redeem_share_token('share-token-live-night');

reset role;
reset request.jwt.claims;

select expect_eq(
  (select count(*) from share_grant where user_id = 'aa000000-0000-0000-0000-000000000002'),
  1, 'redeeming twice leaves one grant');

-- =============================================================================
-- 2. THE GRANT REACHES THE JWT
-- =============================================================================

select expect_text(
  token_claims_for('aa000000-0000-0000-0000-000000000002') ->> 'share_session_id',
  '55000000-0000-0000-0000-000000000001',
  'the hook stamps the watched session into the claims');

select expect_text(
  token_claims_for('aa000000-0000-0000-0000-000000000003') ->> 'share_session_id',
  null,
  'someone with no grant gets no claim');

-- The host of the night is not a watcher of it: they read it by owning it.
select expect_text(
  token_claims_for('aa000000-0000-0000-0000-000000000001') ->> 'share_session_id',
  null,
  'the host carries no watcher claim');

-- A claim that arrives from anywhere other than a live grant is stripped.
select expect_text(
  custom_access_token_hook(jsonb_build_object(
    'user_id', 'aa000000-0000-0000-0000-000000000003',
    'claims',  jsonb_build_object('share_session_id', '55000000-0000-0000-0000-000000000001')
  )) -> 'claims' ->> 'share_session_id',
  null,
  'a claim with no grant behind it is stripped');

-- =============================================================================
-- 3. THE GRANT TABLE IS NOT WRITEABLE
-- =============================================================================
-- The only door is redeem_share_token. A watcher cannot let themselves in, and
-- cannot let themselves into a different night.

set role authenticated;
set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000003","is_anonymous":true}';

select expect_rejected(
  $$insert into share_grant (user_id, session_id)
    values ('aa000000-0000-0000-0000-000000000003', '55000000-0000-0000-0000-000000000001')$$,
  'watcher INSERT into share_grant');

select expect_eq(
  (select count(*) from share_grant),
  0, 'a stranger cannot see who is watching');

reset role;
reset request.jwt.claims;

-- The watcher can see their own grant and nothing else.
set role authenticated;
set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_eq((select count(*) from share_grant), 1, 'watcher sees their own grant');

select expect_rejected(
  $$select revoke_share_access('55000000-0000-0000-0000-000000000001')$$,
  'watcher revoking their own night');

reset role;
reset request.jwt.claims;

-- =============================================================================
-- 4. AN ANONYMOUS WATCHER IS NOT A HOST
-- =============================================================================
-- Anonymous users hold the `authenticated` role like everybody else, so this is
-- the claim — not the role — doing the work.

set role authenticated;
set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_rejected(
  $$insert into book (host_user_id, group_name)
    values ('aa000000-0000-0000-0000-000000000002', 'A book of my own')$$,
  'anonymous watcher creating a book');

select expect_eq((select count(*) from book), 0, 'anonymous watcher sees no books');

reset role;
reset request.jwt.claims;

-- =============================================================================
-- 5. THE HOST CAN TAKE IT AWAY
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001"}';

select expect_eq(
  (select count(*) from share_grant where session_id = '55000000-0000-0000-0000-000000000001'),
  1, 'the host can see who is watching their night');

select revoke_share_access('55000000-0000-0000-0000-000000000001');

reset role;
reset request.jwt.claims;

select expect_eq(
  (select count(*) from share_grant
    where user_id = 'aa000000-0000-0000-0000-000000000002' and revoked_at is not null),
  1, 'revoking marks the grant rather than deleting it');

select expect_text(
  token_claims_for('aa000000-0000-0000-0000-000000000002') ->> 'share_session_id',
  null,
  'a revoked watcher gets no claim on their next token');

-- Rotated, so the link that was shared around the room no longer opens it.
select expect_eq(
  (select count(*) from session
    where id = '55000000-0000-0000-0000-000000000001'
      and share_token = 'share-token-live-night'),
  0, 'revoking rotates the share token');

set role authenticated;
set request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","is_anonymous":true}';

select expect_rejected(
  $$select redeem_share_token('share-token-live-night')$$,
  'redeeming a rotated link');

-- ...but the new link works, and a revoked watcher may be let back in.
reset role;
reset request.jwt.claims;

do $$
declare
  fresh text;
begin
  select share_token into fresh from session
   where id = '55000000-0000-0000-0000-000000000001';

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","is_anonymous":true}';

  if redeem_share_token(fresh) is null then
    raise exception 'TEST FAILED: the rotated link does not open the night';
  end if;
end;
$$;

select expect_text(
  token_claims_for('aa000000-0000-0000-0000-000000000002') ->> 'share_session_id',
  '55000000-0000-0000-0000-000000000001',
  'a re-redeemed link restores the claim');

\o

\echo '--------------------------------------------------'
\echo ' ALL WATCHER ACCESS TESTS PASSED'
\echo '--------------------------------------------------'
