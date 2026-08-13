-- =============================================================================
-- Claiming your place
-- =============================================================================
-- A player is a NAME in the host's book first and an account only later, if
-- ever. This is the "later": the host issues a code bound to one member row,
-- and whoever redeems it becomes the person that row has always described.
-- Their seat and their nights are already there — nothing is created, only
-- attached. See `docs/player-identity.md` and X2 on the After-the-night board.
--
-- THE CODE IS THE PRIMITIVE, not the link. A link is a convenience wrapper
-- around the same ten characters, because a link cannot be relied on to arrive:
-- during development it points at a laptop on somebody's wifi, and forever
-- after it is at the mercy of whatever chat app mangles it. A code can be read
-- down a phone.
--
-- WHAT THIS BUYS A PLAYER: read access to the books they belong to. Nothing
-- else. Only the host writes to a book, before and after claiming — that is the
-- single-writer rule the whole sync model rests on, and claiming does not
-- weaken it.
-- =============================================================================

-- --- The code ----------------------------------------------------------------
-- Ten characters from an alphabet with no 0/O, 1/I/L or U in it, because this
-- gets read aloud across a table and typed by somebody who has had a drink.
-- 32^10 is about 50 bits: not guessable, and short enough to say.
--
-- SECURITY DEFINER for the same reason new_share_token is — gen_random_bytes
-- lives in the extensions schema, and whether the CALLER can see it should not
-- decide whether an invite can be made.

create or replace function new_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes    bytea := gen_random_bytes(10);
  out      text := '';
  i        int;
begin
  for i in 0..9 loop
    out := out || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return out;
end;
$$;

-- --- The invite --------------------------------------------------------------
-- One row per code. Kept after it is claimed rather than deleted: who was
-- invited, by whom, when, and whether it was ever used is exactly the history a
-- host wants when somebody says "I never got it".

create table player_invite (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references book (id) on delete cascade,
  player_id      uuid not null references player (id) on delete cascade,
  code           text not null unique,

  created_by     uuid not null references auth.users (id) on delete restrict,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '7 days',

  claimed_at     timestamptz,
  claimed_by     uuid references auth.users (id) on delete set null,
  revoked_at     timestamptz,

  -- A claim records both facts or neither.
  constraint player_invite_claim_is_whole
    check ((claimed_at is null) = (claimed_by is null))
);

create index player_invite_player_idx on player_invite (player_id);
create index player_invite_book_idx on player_invite (book_id);

comment on table player_invite is
  'A one-use code binding a person to a member row. Kept after use as the record of who was invited and when.';

-- Only ONE live invite per player at a time. Issuing a new one replaces the
-- old, which is what "re-issue" means and what stops two codes for one seat
-- floating around a group chat.
create unique index player_invite_one_live
  on player_invite (player_id)
  where claimed_at is null and revoked_at is null;

-- =============================================================================
-- Issuing
-- =============================================================================

create or replace function create_player_invite(target_player_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_book uuid;
  already     uuid;
  code        text;
begin
  select p.book_id into target_book from player p where p.id = target_player_id;
  if target_book is null then
    raise exception 'No such player.';
  end if;

  -- The host of the book, and nobody else. Written out rather than left to a
  -- policy because this function runs as its owner.
  if not is_book_host(target_book) then
    raise exception 'Only the host can invite somebody to their book.';
  end if;

  select p.claimed_by_user_id into already from player p where p.id = target_player_id;
  if already is not null then
    raise exception 'That player has already been claimed.';
  end if;

  -- Re-issuing retires whatever was outstanding, so exactly one code is live.
  update player_invite
     set revoked_at = now()
   where player_id = target_player_id
     and claimed_at is null
     and revoked_at is null;

  code := new_invite_code();

  insert into player_invite (book_id, player_id, code, created_by)
  values (target_book, target_player_id, code, auth.uid());

  return code;
end;
$$;

comment on function create_player_invite(uuid) is
  'Issue a one-use code for a member row. Retires any code still outstanding for that player.';

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

  update player_invite
     set revoked_at = now()
   where player_id = target_player_id
     and claimed_at is null
     and revoked_at is null;
end;
$$;

-- =============================================================================
-- Redeeming
-- =============================================================================
-- SECURITY DEFINER because the caller can see nothing about the book until this
-- succeeds — that is the point of a code. It reports one message for every kind
-- of failure, so somebody holding a guess learns nothing from which way it
-- fails.

create or replace function redeem_player_invite(code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  claimant   uuid := auth.uid();
  invite     player_invite;
  mine       uuid;
begin
  if claimant is null then
    raise exception 'Sign in first — a claim has to belong to somebody.';
  end if;

  select * into invite
  from player_invite i
  where upper(trim(i.code)) = upper(trim(redeem_player_invite.code))
    and i.claimed_at is null
    and i.revoked_at is null
    and i.expires_at > now();

  if invite.id is null then
    raise exception 'That code does not open anything.';
  end if;

  -- Somebody else may have been bound to this row in the meantime.
  perform 1 from player p where p.id = invite.player_id and p.claimed_by_user_id is not null;
  if found then
    raise exception 'That code does not open anything.';
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
  'Attach the signed-in user to the member row a code names. One seat per person per book.';

/**
 * What a code says before it is spent.
 *
 * X2 greets somebody with "Ivo added you as Petr" and the group's name BEFORE
 * they commit to anything, which means reading two strings out of a book they
 * cannot otherwise see. Deliberately narrow: a name, a group, and nothing about
 * the money.
 */
create or replace function preview_player_invite(code text)
returns table (player_name text, group_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.display_name, b.group_name
  from player_invite i
  join player p on p.id = i.player_id
  join book b on b.id = i.book_id
  where upper(trim(i.code)) = upper(trim(preview_player_invite.code))
    and i.claimed_at is null
    and i.revoked_at is null
    and i.expires_at > now();
$$;

-- =============================================================================
-- What a claimed player can see
-- =============================================================================
-- Read, and only read. The host is still the only writer.

create or replace function is_book_member(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from player p
    where p.book_id = target_book_id
      and p.claimed_by_user_id = auth.uid()
  );
$$;

/** The book behind a session, for policies that only hold a session id. */
create or replace function session_book_id(target_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.book_id from session s where s.id = target_session_id;
$$;

create policy book_member_read on book
  for select to authenticated
  using (is_book_member(id));

create policy player_member_read on player
  for select to authenticated
  using (is_book_member(book_id));

create policy session_member_read on session
  for select to authenticated
  using (is_book_member(book_id));

create policy session_seat_member_read on session_seat
  for select to authenticated
  using (is_book_member(session_book_id(session_id)));

create policy ledger_entry_member_read on ledger_entry
  for select to authenticated
  using (is_book_member(session_book_id(session_id)));

create policy money_rule_member_read on money_rule
  for select to authenticated
  using (is_book_member(book_id));

create policy final_count_member_read on final_count
  for select to authenticated
  using (is_book_member(session_book_id(session_id)));

create policy settlement_member_read on settlement
  for select to authenticated
  using (is_book_member(session_book_id(session_id)));

-- --- The invites themselves --------------------------------------------------
-- The host sees who has been invited and whether they came. A player never
-- reads this table: everything they need arrives through the two functions
-- above, which is what keeps a code from being discoverable by anyone holding
-- an account.

alter table player_invite enable row level security;

create policy player_invite_host_read on player_invite
  for select to authenticated
  using (is_book_host(book_id));

grant select on player_invite to authenticated;
