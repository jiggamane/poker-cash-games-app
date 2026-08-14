-- =============================================================================
-- One string for four causes
-- =============================================================================
-- S80 calls the dead-invite line "a security property, not a copy preference"
-- and hangs three build requirements off it. A property nobody asserts is a
-- property that lasts until the next person finds the refusal unhelpful and
-- makes it specific, which is a one-line change that quietly reopens an
-- enumeration oracle. So it is asserted here:
--
--   1. one error shape on the wire   — same message, four causes
--   2. constant response time        — all four padded to the same floor
--   3. no cause in a client-reachable log — nothing returned names it
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

/** What a statement refuses with, or null if it did not refuse. */
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

/** How long a statement took, refusal included. */
create or replace function ms_of(stmt text)
returns numeric
language plpgsql
as $$
declare
  t0 timestamptz := clock_timestamp();
begin
  begin
    execute stmt;
  exception
    when others then null;
  end;
  return extract(epoch from (clock_timestamp() - t0)) * 1000;
end;
$$;

\o /dev/null

-- =============================================================================
-- Fixtures — one book, four seats, one dead invite each, and one live one
-- =============================================================================

insert into auth.users (id, email) values
  ('f1000000-0000-0000-0000-000000000001', 'privacy-host@example.com'),
  ('f1000000-0000-0000-0000-000000000002', null),  -- the person who spent one
  ('f1000000-0000-0000-0000-000000000003', null);  -- a stranger doing the trying

insert into book (id, host_user_id, group_name) values
  ('f2000000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000001', 'Thursday game');

insert into player (id, book_id, display_name) values
  ('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'Spent'),
  ('f3000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001', 'Revoked'),
  ('f3000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001', 'Expired'),
  ('f3000000-0000-0000-0000-000000000004', 'f2000000-0000-0000-0000-000000000001', 'Live');

-- One live code per seat is a partial unique index, so the four states have to
-- sit on four different seats — which is also how they occur in life.
insert into player_invite
  (id, book_id, player_id, code, created_by, expires_at, claimed_at, claimed_by, revoked_at)
values
  ('f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001',
   'f3000000-0000-0000-0000-000000000001', 'SPENT22222',
   'f1000000-0000-0000-0000-000000000001', now() + interval '7 days',
   now() - interval '1 day', 'f1000000-0000-0000-0000-000000000002', null),

  ('f4000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001',
   'f3000000-0000-0000-0000-000000000002', 'REVOKED222',
   'f1000000-0000-0000-0000-000000000001', now() + interval '7 days',
   null, null, now() - interval '1 hour'),

  ('f4000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001',
   'f3000000-0000-0000-0000-000000000003', 'EXPIRED222',
   'f1000000-0000-0000-0000-000000000001', now() - interval '1 day',
   null, null, null),

  ('f4000000-0000-0000-0000-000000000004', 'f2000000-0000-0000-0000-000000000001',
   'f3000000-0000-0000-0000-000000000004', 'LIVE222222',
   'f1000000-0000-0000-0000-000000000001', now() + interval '7 days',
   null, null, null);

-- The seat whose code was spent really is claimed, or "spent" would not be the
-- state being tested.
update player set claimed_by_user_id = 'f1000000-0000-0000-0000-000000000002'
 where id = 'f3000000-0000-0000-0000-000000000001';

-- =============================================================================
-- 1. ONE ERROR SHAPE ON THE WIRE
-- =============================================================================
-- A stranger with an account, trying four codes. UNKNOWN22 is not in the table
-- at all; the other three are, in the three ways a code dies.

set role authenticated;
set request.jwt.claims = '{"sub":"f1000000-0000-0000-0000-000000000003"}';

create temporary table refusal (cause text, msg text, took numeric);

insert into refusal (cause, msg) values
  ('unknown', message_of($$select redeem_player_invite('UNKNOWN222')$$)),
  ('spent',   message_of($$select redeem_player_invite('SPENT22222')$$)),
  ('revoked', message_of($$select redeem_player_invite('REVOKED222')$$)),
  ('expired', message_of($$select redeem_player_invite('EXPIRED222')$$));

select expect_eq((select count(*) from refusal where msg is null), 0,
  'every dead code is refused');

select expect_eq((select count(distinct msg) from refusal), 1,
  'all four dead causes refuse with ONE message');

select expect_text((select distinct msg from refusal), 'This invite cannot be used.',
  'and it is the one string S80 specifies');

-- Nothing in the refusal is a fact a guesser would be paid for. Each of these
-- would partition the guess space if it leaked.
select expect_eq(
  (select count(*) from refusal
    where msg ilike '%Thursday%'      -- the group
       or msg ilike '%host%'          -- who issued it
       or msg ilike '%expire%'        -- which of the four
       or msg ilike '%revoke%'
       or msg ilike '%claim%'
       or msg ilike '%SPENT%'         -- the code that was tried
       or msg ilike '%REVOKED%'
       or msg ilike '%EXPIRED%'
       or msg ilike '%UNKNOWN%'),
  0, 'and it names neither the group, the host, the cause, nor the code tried');

-- =============================================================================
-- 2. CONSTANT RESPONSE TIME
-- =============================================================================
-- Without padding an unknown code stops at the first index probe and a revoked
-- one resolves a row and a member — different work, different duration, same
-- oracle. The floor is what removes it.

update refusal set took = ms_of($$select redeem_player_invite('UNKNOWN222')$$) where cause = 'unknown';
update refusal set took = ms_of($$select redeem_player_invite('SPENT22222')$$) where cause = 'spent';
update refusal set took = ms_of($$select redeem_player_invite('REVOKED222')$$) where cause = 'revoked';
update refusal set took = ms_of($$select redeem_player_invite('EXPIRED222')$$) where cause = 'expired';

select expect_true(
  (select min(took) from refusal) >= invite_refusal_floor() * 0.9,
  format('every refusal is held to the floor (fastest was %sms, floor is %sms)',
         round((select min(took) from refusal)), invite_refusal_floor()));

-- The tell is the SPREAD, not the absolute number: what an attacker measures is
-- one cause against another. 40ms is far wider than the microseconds of real
-- work being hidden and far narrower than anything that survives network noise.
select expect_true(
  (select max(took) - min(took) from refusal) < 40,
  format('and the four are indistinguishable by duration (spread was %sms)',
         round((select max(took) - min(took) from refusal))));

-- =============================================================================
-- 3. PREVIEW IS THE SAME ORACLE, CHEAPER
-- =============================================================================
-- X2a previews before anything is spent. Zero rows was already the answer for
-- all four; it now takes the same time to give it.

select expect_eq((select count(*) from preview_player_invite('UNKNOWN222')), 0,
  'preview says nothing about an unknown code');
select expect_eq((select count(*) from preview_player_invite('SPENT22222')), 0,
  'nor about a spent one');
select expect_eq((select count(*) from preview_player_invite('REVOKED222')), 0,
  'nor about a revoked one');
select expect_eq((select count(*) from preview_player_invite('EXPIRED222')), 0,
  'nor about an expired one');

create temporary table preview_ms (cause text, took numeric);
insert into preview_ms values
  ('unknown', ms_of($$select * from preview_player_invite('UNKNOWN222')$$)),
  ('spent',   ms_of($$select * from preview_player_invite('SPENT22222')$$)),
  ('revoked', ms_of($$select * from preview_player_invite('REVOKED222')$$)),
  ('expired', ms_of($$select * from preview_player_invite('EXPIRED222')$$));

select expect_true(
  (select min(took) from preview_ms) >= invite_refusal_floor() * 0.9,
  'a preview miss is padded too');
select expect_true(
  (select max(took) - min(took) from preview_ms) < 40,
  'and the four misses are indistinguishable by duration');

-- A live code still answers, and answers quickly: the padding is on the miss
-- only, so the one path a real person waits on is not slowed down.
select expect_text(
  (select player_name from preview_player_invite('LIVE222222')),
  'Live', 'a live code still previews the name it is bound to');

select expect_text(
  (select group_name from preview_player_invite('LIVE222222')),
  'Thursday game', 'and the group it is for');

-- X2b's first line. The host of this fixture never sat down, so there is no
-- player row to name them and the sentence has to survive that.
select expect_text(
  (select host_name from preview_player_invite('LIVE222222')),
  null, 'a host with no seat of their own has no name to offer X2b');

select expect_true(
  ms_of($$select * from preview_player_invite('LIVE222222')$$) < invite_refusal_floor(),
  'and a hit is not padded — it is distinguishable by its content anyway');

-- =============================================================================
-- 4. THE HAPPY PATH STILL WORKS
-- =============================================================================
-- Everything above is about refusing. None of it may have broken claiming.

select expect_text(
  redeem_player_invite('LIVE222222')::text,
  'f3000000-0000-0000-0000-000000000004',
  'a live code still attaches the caller to the seat it names');

select expect_text(
  (select claimed_by_user_id::text from player where id = 'f3000000-0000-0000-0000-000000000004'),
  'f1000000-0000-0000-0000-000000000003',
  'and the member row now points at them');

-- Spent means spent, and it dies with the same sentence as the rest.
select expect_text(
  message_of($$select redeem_player_invite('LIVE222222')$$),
  'This invite cannot be used.',
  'and the code it just spent joins the four');

-- =============================================================================
-- 5. THE TWO CONDITIONS THAT STAY DISTINGUISHABLE
-- =============================================================================
-- Neither is a code oracle, and collapsing them would make the screen lie.

reset role;
set request.jwt.claims = '{"sub":null}';
set role authenticated;

select expect_true(
  message_of($$select redeem_player_invite('LIVE222222')$$) ilike '%Sign in first%',
  'no session is decided before the code is looked at, and says so');

-- Already holding a seat in this book only fires for a book the caller can
-- already read, so learning the code was real tells them nothing new.
--
-- f1…002 claimed the 'Spent' seat in the fixtures. Here they try a live code
-- for a DIFFERENT seat in the SAME book.
reset role;

insert into player_invite (id, book_id, player_id, code, created_by, expires_at)
values ('f4000000-0000-0000-0000-000000000005', 'f2000000-0000-0000-0000-000000000001',
        'f3000000-0000-0000-0000-000000000002', 'SECOND2222',
        'f1000000-0000-0000-0000-000000000001', now() + interval '7 days');

set request.jwt.claims = '{"sub":"f1000000-0000-0000-0000-000000000002"}';
set role authenticated;

select expect_true(
  message_of($$select redeem_player_invite('SECOND2222')$$) ilike '%already have a place%',
  'a member trying a second seat in their own book is told plainly');

-- =============================================================================
-- 6. THE SHARE LINK IS GOVERNED BY THE SAME RULE
-- =============================================================================
-- § 3: "a live-feed URL is as enumerable as an invite code."

-- A book of its own, closed, so the live one above is left as it is.
reset role;

insert into book (id, host_user_id, group_name, status, closed_at) values
  ('f2000000-0000-0000-0000-000000000002',
   'f1000000-0000-0000-0000-000000000001', 'Old game', 'closed', now());

insert into session (id, book_id, default_buyin, seat_count, started_at, share_token)
values ('f5000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002',
        500, 6, now(), 'sharetoken-closed-book');

set request.jwt.claims = '{"sub":"f1000000-0000-0000-0000-000000000003"}';
set role authenticated;

create temporary table share_refusal (cause text, msg text, took numeric);
insert into share_refusal (cause, msg, took) values
  ('unknown token',
   message_of($$select redeem_share_token('no-such-token-at-all')$$),
   ms_of($$select redeem_share_token('no-such-token-at-all')$$)),
  ('closed book',
   message_of($$select redeem_share_token('sharetoken-closed-book')$$),
   ms_of($$select redeem_share_token('sharetoken-closed-book')$$));

select expect_eq((select count(distinct msg) from share_refusal), 1,
  'a dead share link refuses with one message however it died');

select expect_text((select distinct msg from share_refusal), 'This link is not live.',
  'and it is X1b''s line, not a description of the cause');

select expect_true(
  (select min(took) from share_refusal) >= invite_refusal_floor() * 0.9,
  'and it is padded to the same floor');

reset role;

-- =============================================================================
-- 7. THE ALPHABET — S81
-- =============================================================================
-- "Ten characters, shown and entered as two groups of five, alphabet excluding
-- I, O, 0 and 1." The alphabet in 0007 excludes L and U as well, which is
-- stricter and still satisfies S81; what must never regress is that a code is
-- ten characters long and holds none of the four that get misheard.

set request.jwt.claims = '{"sub":"f1000000-0000-0000-0000-000000000001"}';
set role authenticated;

create temporary table codes (code text);
insert into codes select create_player_invite('f3000000-0000-0000-0000-000000000002');
insert into codes select create_player_invite('f3000000-0000-0000-0000-000000000003');

select expect_eq((select count(*) from codes where length(code) = 10), 2,
  'a code is ten characters — C3a''s hero size and X2d''s two fields ride on it');

select expect_eq((select count(*) from codes where code ~ '[IO01]'), 0,
  'and holds none of I, O, 0 or 1 — the four that get misheard down a phone');

-- =============================================================================
-- 8. AND WHEN THE HOST DOES SIT AT THEIR OWN TABLE
-- =============================================================================
-- "{host} added you as {name}" is X2b's first line, so a host who plays has to
-- come back from the preview.

reset role;

insert into player (id, book_id, display_name, claimed_by_user_id) values
  ('f3000000-0000-0000-0000-000000000009', 'f2000000-0000-0000-0000-000000000001',
   'Marek', 'f1000000-0000-0000-0000-000000000001');

set request.jwt.claims = '{"sub":"f1000000-0000-0000-0000-000000000003"}';
set role authenticated;

select expect_text(
  (select host_name from preview_player_invite((select code from codes limit 1))),
  'Marek', 'a live code names the host who issued it');

-- And a dead one still names nobody and nothing.
select expect_eq(
  (select count(*) from preview_player_invite('UNKNOWN222')), 0,
  'while a dead code says as little as it ever did');

reset role;

\o

\echo '--------------------------------------------------'
\echo ' INVITE PRIVACY TESTS PASSED (S80, S81)'
\echo '--------------------------------------------------'
