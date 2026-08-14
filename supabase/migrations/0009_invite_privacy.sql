-- =============================================================================
-- The dead invite is one string for four causes
-- =============================================================================
-- Rev 15, S80. X2c renders identically whether a code is unknown, already
-- spent, revoked or expired: same title, same sentence, same single control.
-- The design is explicit that this is a SECURITY PROPERTY AND NOT A COPY
-- PREFERENCE, and it names three build requirements that live down here rather
-- than on the screen:
--
--   1. ONE ERROR SHAPE ON THE WIRE. No cause code the client can read, and no
--      field that differs in length or presence between the four.
--   2. CONSTANT RESPONSE TIME. Pad all four to the slowest path, or the timing
--      is the tell — a revoked code that resolves a member row is otherwise
--      measurably slower than an unknown one that does not.
--   3. NO CAUSE IN ANY CLIENT-REACHABLE LOG. The distinction is kept
--      server-side; nothing returned to the device carries it.
--
-- Why this is worth the trouble: a ten-character code is a bearer credential
-- for somebody's history, and the alphabet is small enough to enumerate given
-- an oracle. "Unknown" versus "expired" IS that oracle — it partitions the
-- guess space, and a guesser who can tell the two apart has been told which
-- half of their list to keep. Timing is the same oracle with the answer
-- arriving a few milliseconds later.
--
-- § 3 of `14-invite-and-watcher.md` recommends governing the share link by the
-- same rule ("a live-feed URL is as enumerable as an invite code"), so
-- redeem_share_token is brought under it here too.
--
-- Nothing about who may do what changes in this file. The policies, the
-- one-live-code index and the one-seat-per-person rule are all as 0007 left
-- them; this is about what a refusal is allowed to say.
-- =============================================================================

-- --- The padding -------------------------------------------------------------
-- Hold a refusal open until a fixed floor has passed since the caller arrived.
--
-- The floor has to sit above the SLOWEST refusal, not the average one, or the
-- padding just moves the tell rather than removing it. The slow path is a
-- revoked or spent code: it matches a row, joins player, and then decides
-- against it, where an unknown code stops at the first index probe. 150ms is
-- comfortably above both on a free-tier instance and is imperceptible to
-- somebody who has just typed ten characters.
--
-- pg_sleep holds the backend, so this costs a connection for the duration. At
-- the scale this app runs at — a handful of claims per group, ever — that is
-- the right trade against an enumeration oracle. If invites are ever issued in
-- volume, this is the line to revisit.

create or replace function invite_refusal_floor()
returns int
language sql
immutable
as $$ select 150 $$;

comment on function invite_refusal_floor() is
  'Milliseconds every invite refusal is padded to, so the four dead causes cannot be told apart by timing. S80.';

create or replace function pad_refusal(started timestamptz)
returns void
language plpgsql
volatile
as $$
declare
  elapsed_ms numeric := extract(epoch from (clock_timestamp() - started)) * 1000;
  floor_ms   int     := invite_refusal_floor();
begin
  if elapsed_ms < floor_ms then
    perform pg_sleep((floor_ms - elapsed_ms) / 1000.0);
  end if;
end;
$$;

comment on function pad_refusal(timestamptz) is
  'Sleep until invite_refusal_floor() ms have passed since `started`. Called on every refusing path before it raises.';

-- --- Where the cause goes instead --------------------------------------------
-- Requirement 3 says the distinction survives server-side. RAISE LOG is what
-- carries it: it is written to the Postgres log, which the project owner reads
-- in the dashboard, and it is NOT sent to the client — LOG sits below NOTICE in
-- the client_min_messages ordering, and a PostgREST caller cannot raise their
-- own client_min_messages to fish it out.
--
-- A table would be the obvious alternative and is the wrong one: every refusing
-- path raises, an exception rolls its transaction back, and the audit row would
-- roll back with it. A log line survives the rollback, which is exactly the
-- property wanted here.

-- =============================================================================
-- Redeeming an invite
-- =============================================================================
-- The four dead causes now raise ONE message, and the message says nothing a
-- guesser would be paid for: not the group, not the host, not the inviter, and
-- not which of the four it was.
--
-- Two conditions stay distinguishable ON PURPOSE, and neither is a code oracle:
--
--   * NOT SIGNED IN is decided before the code is looked at at all. It is a
--     fact about the caller, tells them nothing about any code, and a caller
--     who cannot tell "I have no session" from "your code is dead" cannot be
--     helped by the screen.
--   * ALREADY HAVE A SEAT IN THIS BOOK only fires when the code resolves to a
--     book the caller is ALREADY A MEMBER OF — which they can already read.
--     Learning the code is real tells them nothing they did not have, and the
--     honest message is the difference between a person re-tapping an old link
--     and a person believing their seat has been taken.

create or replace function redeem_player_invite(code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  claimant  uuid := auth.uid();
  started   timestamptz := clock_timestamp();
  invite    player_invite;
  found_any player_invite;
  mine      uuid;
  cause     text;
begin
  if claimant is null then
    raise exception 'Sign in first — a claim has to belong to somebody.';
  end if;

  -- The live one. Every clause that can fail is here, so a code that misses on
  -- ANY of them lands on the same branch below.
  select * into invite
  from player_invite i
  where upper(trim(i.code)) = upper(trim(redeem_player_invite.code))
    and i.claimed_at is null
    and i.revoked_at is null
    and i.expires_at > now();

  if invite.id is null then
    -- Work out WHICH of the four it was, for the server log only. Doing this
    -- lookup on every refusal is also what makes the refusals cost the same:
    -- unknown and revoked now run the same queries in the same order, and the
    -- padding below covers what is left.
    select * into found_any
    from player_invite i
    where upper(trim(i.code)) = upper(trim(redeem_player_invite.code));

    cause := case
      when found_any.id is null            then 'unknown'
      when found_any.claimed_at is not null then 'already spent'
      when found_any.revoked_at is not null then 'revoked'
      else                                       'expired'
    end;

    raise log 'redeem_player_invite refused (%): user=%', cause, claimant;
    perform pad_refusal(started);
    raise exception 'This invite cannot be used.';
  end if;

  -- Somebody else may have been bound to this row in the meantime. Same
  -- message, same padding: from outside it is indistinguishable from a spent
  -- code, which is very nearly what it is.
  perform 1 from player p where p.id = invite.player_id and p.claimed_by_user_id is not null;
  if found then
    raise log 'redeem_player_invite refused (seat taken): user=%', claimant;
    perform pad_refusal(started);
    raise exception 'This invite cannot be used.';
  end if;

  -- One person holds at most one seat in a book. Claiming a second would make
  -- "my nights" ambiguous in the one place it must not be.
  select p.id into mine
  from player p
  where p.book_id = invite.book_id
    and p.claimed_by_user_id = claimant;

  if mine is not null then
    raise exception 'You already have a place in this book.';
  end if;

  update player
     set claimed_by_user_id = claimant
   where id = invite.player_id;

  update player_invite
     set claimed_at = now(), claimed_by = claimant
   where id = invite.id;

  return invite.player_id;
end;
$$;

comment on function redeem_player_invite(text) is
  'Attach the signed-in user to the member row a code names. One seat per person per book. Refuses in constant time with one message for every dead cause — S80.';

-- =============================================================================
-- Previewing an invite
-- =============================================================================
-- X2a calls this before anything is spent, which makes it the cheaper half of
-- the same oracle: it is reachable by anyone, it takes a code, and it already
-- answers "nothing" for all four dead causes. What it did not do was take the
-- same time to say so.
--
-- Zero rows stays the answer — the shape was already right. The function only
-- becomes plpgsql so it can hold that answer open.

create or replace function preview_player_invite(code text)
returns table (player_name text, group_name text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  started timestamptz := clock_timestamp();
  hit     boolean := false;
begin
  for player_name, group_name in
    select p.display_name, b.group_name
    from player_invite i
    join player p on p.id = i.player_id
    join book b on b.id = i.book_id
    where upper(trim(i.code)) = upper(trim(preview_player_invite.code))
      and i.claimed_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  loop
    hit := true;
    return next;
  end loop;

  -- Only a MISS is padded. A hit is distinguishable by its content anyway —
  -- it returns a name — so slowing it down would buy nothing and would put
  -- 150ms in front of the one path a real person is waiting on.
  if not hit then
    perform pad_refusal(started);
  end if;
end;
$$;

comment on function preview_player_invite(text) is
  'A name and a group, for a live code only. Zero rows for unknown, spent, revoked and expired alike, in constant time — S80.';

-- =============================================================================
-- Redeeming a share link
-- =============================================================================
-- § 3: "X1b is the same line in the share-link voice. Recommendation: govern it
-- by the same rule. A live-feed URL is as enumerable as an invite code."
--
-- 0005 already gave "no such token" and "book is closed" one message for the
-- same reason. What it did not give them was one duration.

create or replace function redeem_share_token(token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  watcher uuid := auth.uid();
  started timestamptz := clock_timestamp();
  target  uuid;
  cause   text;
begin
  if watcher is null then
    raise exception 'Sign in first — even a watcher needs a device identity to hold the grant.';
  end if;

  select s.id into target
  from session s
  join book b on b.id = s.book_id
  where s.share_token = redeem_share_token.token
    and b.status = 'open';

  if target is null then
    select case when exists (select 1 from session s where s.share_token = redeem_share_token.token)
                then 'book closed' else 'unknown token' end
      into cause;

    raise log 'redeem_share_token refused (%): user=%', cause, watcher;
    perform pad_refusal(started);
    raise exception 'This link is not live.';
  end if;

  insert into share_grant (user_id, session_id)
  values (watcher, target)
  on conflict (user_id, session_id) do update set granted_at = now(), revoked_at = null;

  return target;
end;
$$;

comment on function redeem_share_token(text) is
  'Grant this device read access to one night. One message and one duration for every refusal — S80.';
