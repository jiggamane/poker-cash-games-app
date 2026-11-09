-- =============================================================================
-- A player names their own seat; a group needs a named admin
-- =============================================================================
-- Owner, 9 November, approving `design/handoff-account-and-names/` (R1–R3,
-- N1–N5). Two things, both about names:
--
--   1. A PLAYER MAY RENAME THEIR OWN SEAT. Until now a seat's name was
--      whatever the admin typed, and only the admin could change it. Now the
--      person behind a claimed seat can change it from their own phone. The
--      rule it must keep, from deletion (0024, owner 28 September): the admin's
--      original is never lost. If the player deletes their account, or the
--      seat is reset, it goes back to the name the admin gave it.
--
--   2. NO NAME, NO NEW GROUP. The app now asks an email account for its name
--      at first sign-in (N1). This is the server half that makes it required:
--      a group cannot be created by an account with no name (`profile`, 0029).
--      Switched on in the same change as N1, as 0029 said — never before,
--      when it would have stopped the owner's own phone.
--
-- HOW A NAME TRAVELS. Names go UP: the admin's phone sends the roster, and a
-- pull never renames a row on the phone (`importRoster`). A name the player
-- chose is the one exception, and it has to survive the admin's phone, which
-- still holds the old name and sends it on its next sync. So:
--
--   player.admin_name   null while the seat carries the admin's name. Set
--                       when the PLAYER names it: then it holds what the admin
--                       typed, and `display_name` holds the player's choice.
--                       The pull reads it, and a row with it set comes down.
--
--   a trigger           when anybody but the player changes `display_name` on
--                       a seat the player named, the change goes to
--                       `admin_name` instead — the admin's phone renaming it,
--                       or re-sending the old name, changes the name to come
--                       back to, never the name the group sees. Their choice
--                       wins, as R3 says.
--
--   rename_my_seat      the claimant, and only the claimant, renames.
--   use_admin_name      the admin puts their own name back (R3).
--   release_seat        (0024) puts the admin's name back first.
--
-- The flag that lets a function through the trigger is `poker.seat_name`,
-- transaction-local, set only inside these functions — the same pattern as
-- `poker.handover` and `poker.erasing`.
-- =============================================================================

alter table player add column admin_name text;

comment on column player.admin_name is
  'Null while the seat carries the name its admin typed. Set when the player renamed their own seat (0030): it holds the admin''s name, which comes back when they leave, are reset, or the admin says so.';

-- --- One rule for a name ------------------------------------------------------

create or replace function clean_name(raw text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g'));
begin
  if length(clean) = 0 then
    raise exception 'A name cannot be empty.';
  end if;
  if length(clean) > 40 then
    raise exception 'A name is at most 40 characters.';
  end if;
  return clean;
end;
$$;

revoke execute on function clean_name(text) from public, anon, authenticated;

-- --- The admin's phone cannot write over a player's choice ---------------------

create or replace function seat_name_stays_the_players()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('poker.seat_name', true), '') = 'on' then
    return new;
  end if;
  if old.admin_name is not null then
    if new.display_name is distinct from old.display_name then
      -- The admin's phone renaming the seat, or re-sending the old name:
      -- that is the name to come back to, not the name the group sees.
      new.admin_name := new.display_name;
      new.display_name := old.display_name;
    else
      new.admin_name := old.admin_name;
    end if;
  else
    -- Nobody but the functions above sets it.
    new.admin_name := null;
  end if;
  return new;
end;
$$;

create trigger player_seat_name
  before update of display_name, admin_name on player
  for each row execute function seat_name_stays_the_players();

revoke execute on function seat_name_stays_the_players() from public, anon, authenticated;

-- --- The player renames their own seat ---------------------------------------

create or replace function rename_my_seat(target_player_id uuid, name text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  seat   player%rowtype;
  clean  text := clean_name(name);
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select * into seat from player where id = target_player_id for update;
  if seat.id is null or seat.claimed_by_user_id is distinct from me then
    raise exception 'That seat is not yours to rename.';
  end if;

  if exists (select 1 from player p
              where p.book_id = seat.book_id and p.id <> seat.id
                and lower(btrim(p.display_name)) = lower(clean)) then
    raise exception 'Somebody in this group is already called %.', clean;
  end if;

  perform set_config('poker.seat_name', 'on', true);
  update player
     set admin_name   = case
                          -- Back to exactly what the admin typed: it is theirs again.
                          when seat.admin_name is not null and lower(seat.admin_name) = lower(clean) then null
                          else coalesce(seat.admin_name, seat.display_name)
                        end,
         display_name = clean
   where id = seat.id;
  perform set_config('poker.seat_name', '', true);

  return clean;
end;
$$;

revoke execute on function rename_my_seat(uuid, text) from public, anon;
grant  execute on function rename_my_seat(uuid, text) to authenticated;

comment on function rename_my_seat(uuid, text) is
  'The person behind a claimed seat renames it. The admin''s name is kept in admin_name and comes back when they leave (0030).';

-- --- The admin puts their own name back (R3) ---------------------------------

create or replace function use_admin_name(target_player_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  seat player%rowtype;
begin
  select * into seat from player where id = target_player_id for update;
  if seat.id is null or not is_book_host(seat.book_id) then
    raise exception 'Only the group''s admin can do that.';
  end if;
  if seat.admin_name is null then
    return seat.display_name;
  end if;
  if exists (select 1 from player p
              where p.book_id = seat.book_id and p.id <> seat.id
                and lower(btrim(p.display_name)) = lower(btrim(seat.admin_name))) then
    raise exception 'Somebody in this group is already called %.', seat.admin_name;
  end if;

  perform set_config('poker.seat_name', 'on', true);
  update player set display_name = seat.admin_name, admin_name = null where id = seat.id;
  perform set_config('poker.seat_name', '', true);
  return seat.admin_name;
end;
$$;

revoke execute on function use_admin_name(uuid) from public, anon;
grant  execute on function use_admin_name(uuid) to authenticated;

-- --- Leaving puts the admin's name back (0024's release_seat) ----------------

create or replace function release_seat(target_player_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  update player_invite
     set revoked_at = now()
   where player_id = target_player_id
     and claimed_at is null
     and revoked_at is null;

  -- The admin's name comes back. If somebody else in the group has taken it
  -- meanwhile, the seat keeps the player's name rather than fail the delete:
  -- a delete must never be refused over a name.
  perform set_config('poker.seat_name', 'on', true);
  update player p
     set display_name = p.admin_name, admin_name = null
   where p.id = target_player_id
     and p.admin_name is not null
     and not exists (select 1 from player q
                      where q.book_id = p.book_id and q.id <> p.id
                        and lower(btrim(q.display_name)) = lower(btrim(p.admin_name)));
  perform set_config('poker.seat_name', '', true);

  update player
     set claimed_by_user_id = null
   where id = target_player_id
     and claimed_by_user_id is not null;
end;
$$;

revoke execute on function release_seat(uuid) from public, anon, authenticated;

-- Reset (0012) releases a claimed seat too, and the same rule holds: the seat
-- goes back to being the admin's name. As 0012 wrote it, plus that.
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

  perform release_seat(target_player_id);
end;
$$;

-- --- No name, no new group ----------------------------------------------------

create policy book_insert_needs_name on book
  as restrictive
  for insert to authenticated
  with check (exists (select 1 from profile pr where pr.user_id = auth.uid()));

-- --- The delete sheet says when a seat's name will change back (S3) ----------
-- deletion_plan_for as 0029 left it, with each seat's admin_name: set, the
-- player renamed it and leaving puts the admin's name back, which the sheet
-- says before the hold.
create or replace function deletion_plan_for(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with hosted as (
    select b.id, b.group_name, b.created_at,
           (
             exists (select 1 from player p
                      where p.book_id = b.id
                        and p.claimed_by_user_id is not null
                        and p.claimed_by_user_id <> target)
             or exists (select 1 from night_handover h
                          join session s on s.id = h.session_id
                         where s.book_id = b.id
                           and h.redeemed_by is not null
                           and h.redeemed_by <> target)
             or exists (select 1 from night_pass np
                          join session s on s.id = np.session_id
                         where s.book_id = b.id
                           and np.to_user is not null
                           and np.to_user <> target)
             or exists (select 1 from share_grant g
                          join session s on s.id = g.session_id
                         where s.book_id = b.id
                           and g.revoked_at is null
                           and g.user_id <> target)
           ) as others_in_it,
           (select count(distinct p.claimed_by_user_id)
              from player p
             where p.book_id = b.id
               and p.claimed_by_user_id is not null
               and p.claimed_by_user_id <> target) as members
      from book b
     where b.host_user_id = target
  ),
  seats as (
    select p.id as player_id, p.display_name, p.admin_name, b.id as book_id, b.group_name,
           name_in_book(b.id, b.host_user_id) as host_name
      from player p
      join book b on b.id = p.book_id
     where p.claimed_by_user_id = target
       and b.host_user_id is distinct from target
  ),
  running as (
    select s.id as session_id, b.id as book_id, b.group_name, s.started_at
      from session s
      join book b on b.id = s.book_id
     where s.status <> 'settled'
       and (coalesce(s.writer_user_id, b.host_user_id) = target
            or b.host_user_id = target)
     order by s.started_at desc
     limit 1
  )
  select jsonb_build_object(
    'running', (select to_jsonb(r) from running r),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
               'book_id', h.id,
               'group_name', h.group_name,
               'outcome', case when h.others_in_it then 'closed' else 'deleted' end,
               'members', h.members)
             order by h.created_at)
        from hosted h), '[]'::jsonb),
    'seats', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player_id', st.player_id,
               'display_name', st.display_name,
               'admin_name', st.admin_name,
               'book_id', st.book_id,
               'group_name', st.group_name,
               'host_name', st.host_name)
             order by st.group_name)
        from seats st), '[]'::jsonb),
    'store_subscription', exists (
      select 1 from entitlement e
       where e.user_id = target
         and e.source in ('apple', 'google')
         and e.revoked_at is null
         and (e.ends_at is null or e.ends_at > now()))
  );
$$;

revoke execute on function deletion_plan_for(uuid) from public, anon, authenticated;
