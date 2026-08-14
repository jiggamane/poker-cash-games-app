-- =============================================================================
-- S84, answered: how long a per-player code lives, and what Reset does to one
-- =============================================================================
-- Rev 15 § 6 raised two questions the drawing could not answer. Both are now
-- decided by the group, and both live here rather than in the app, because both
-- are rules about a credential and the app is not what enforces those.
--
-- 1. A PER-PLAYER CODE EXPIRES AFTER ONE MONTH.
--
--    The seven days on C3a belong to the GROUP link, which is a different
--    mechanism — it creates a member row on join, and it is handed to a room.
--    A per-player code is handed to one person who already has a seat, and the
--    realistic gap between "the host makes it at the table" and "that person
--    gets round to opening it" is weeks, not days. Seven days turned an invite
--    into a chore with a deadline; a month is long enough that it expires
--    because it was forgotten rather than because somebody was busy.
--
--    A month is still a bound, and it is the bound that matters: an
--    unclaimed code is a bearer credential for somebody's history sitting in a
--    group chat, and it should not sit there for ever.
--
-- 2. RESET WORKS ON A CLAIMED SEAT, AND IT DOES NOT DESTROY ANYTHING.
--
--    Before this, Reset only ever retired codes nobody had spent, so a seat
--    that had been claimed had no way back — a player with a new phone, or one
--    who claimed the wrong seat, was stuck, and the host had no control that
--    did anything.
--
--    Now Reset does two things, and the difference between them is exactly the
--    difference between a code and a claim:
--
--      · An UNSPENT code is revoked. The new one is the only live code, which
--        is what "reset" has always meant here and what the one-live-code index
--        has always enforced.
--
--      · A SPENT code is left exactly as it is. It stays in `player_invite`
--        with its claimed_at and its claimed_by, because that row is the record
--        of who was invited and when, and this app does not rewrite history to
--        tidy it up. What is released is the BINDING — `claimed_by_user_id` on
--        the player row — so the seat is free for the new code to attach to.
--
--    WHAT THIS COSTS, stated plainly because a host is about to be asked to
--    confirm it: the person who had the seat stops being able to read the book
--    on their phone until they redeem the new code. WHAT IT DOES NOT COST:
--    anything in the ledger. The member row keeps every night, every buy-in and
--    every settlement — those belong to the seat, never to the account behind
--    it, which is the whole reason a player is a name first and an account
--    later. Nothing here is destructive; it is a re-introduction.
-- =============================================================================

-- --- 1. One month ------------------------------------------------------------
-- The default is what create_player_invite uses; it names no expiry of its own.

alter table player_invite
  alter column expires_at set default now() + interval '1 month';

comment on column player_invite.expires_at is
  'One month for a per-player code (S84). The seven days on C3a belong to the group link, which is a different mechanism.';

-- Codes already outstanding under the old seven days are extended to the new
-- rule rather than left on the old one. They were issued under a policy the
-- group has since changed its mind about, and expiring somebody's invite by an
-- accident of timing is the outcome nobody would choose.
update player_invite
   set expires_at = created_at + interval '1 month'
 where claimed_at is null
   and revoked_at is null;

-- --- 2. Reset ----------------------------------------------------------------

create or replace function revoke_player_invite(target_player_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_book uuid;
begin
  select p.book_id into target_book from player p where p.id = target_player_id;
  if target_book is null or not is_book_host(target_book) then
    raise exception 'That invite is not yours to revoke.';
  end if;

  -- An unspent code dies, so only the next one is live. A spent one is left
  -- alone: it is the record of a claim that really happened.
  update player_invite
     set revoked_at = now()
   where player_id = target_player_id
     and claimed_at is null
     and revoked_at is null;

  -- And the seat is released, so a new code has something to attach to. The
  -- ledger is untouched — every night on this member row stays on it.
  update player
     set claimed_by_user_id = null
   where id = target_player_id
     and claimed_by_user_id is not null;
end;
$$;

comment on function revoke_player_invite(uuid) is
  'Retire any unspent code for a seat and release the seat itself, so a new code can be issued. Spent invites and the whole ledger are left untouched — S84.';
