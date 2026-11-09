-- =============================================================================
-- Every group's admin has a name — B48, and the account's own name
-- =============================================================================
-- Owner, 9 November: an email account is asked "Your name" the first time it
-- signs in — by an invite or with a promo code — and it is required. And the
-- admin of a group must never read as a blank: not on the invite screen ("Andro
-- added you as Petr"), not under a past night ("kept by Andro"), not on the
-- delete-account sheet.
--
-- Until now it read as a blank EVERYWHERE, not in a corner case. B48: nothing
-- ever bound the admin's own seat to their account, so every lookup of "the
-- host's seat" — `name_in_book(book, host)`, `preview_player_invite` — found
-- nothing, on every group. On the live project on 9 November: one group, seven
-- seats, none of them the admin's as far as the server knew.
--
-- THE GUARANTEE, in three parts:
--
--   1. Only an email account can run a group (`is_book_host` refuses an
--      anonymous caller; 0018 refuses a group to an account with no plan).
--   2. Every email account has a name — `profile`, asked for at first sign-in.
--      The database cannot refuse the ACCOUNT for having none: a dashboard
--      invite makes it before the person has opened the app. The app refuses to
--      go past sign-in without one; the server-side gate (a group cannot be
--      started without a name) is the next step, switched on once the app can
--      ask — before then it would stop the owner's own phone.
--   3. The admin's name is their SEAT in the group (as they typed it for
--      themselves), and their account name only when they hold no seat in it —
--      an admin who runs the game without playing.
--
-- So, once the app asks: an admin's name is never blank.
--
-- WHAT IT ADDS:
--   profile             one row per account that has told us its name
--   set_my_name(name)   an email account sets or changes its own name
--   my_name()           this account's name, or null
--   bind_my_seat(id)    the admin binds their own seat in their own group — B48.
--                       The phone knows which roster row is the admin's; the
--                       server checks it is the caller's group and a free seat.
--
-- WHAT IT CHANGES:
--   name_in_book        falls back to the account's name for the group's ADMIN
--                       only — never for anybody else, so a member is still
--                       known by the name the admin typed and nothing more
--   preview_player_invite   names the admin through name_in_book
--   deletion_plan_for   the same, for the delete-account sheet
--
-- NOT HERE: a player changing their own seat's name. Owner, 9 November: they
-- should be able to, and it is in the design request with the rule it must keep
-- — deletion puts the admin's original back — because it needs a board, and
-- the sync has to stop the admin's phone writing over it.
-- =============================================================================

create table profile (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  updated_at  timestamptz not null default now(),
  constraint profile_name_is_a_name
    check (length(btrim(name)) between 1 and 40 and name = btrim(name))
);

comment on table profile is
  'An account''s own name, asked for at first sign-in (owner, 9 November). Read for a group''s admin when they hold no seat in it; never shown in place of a seat''s name.';

alter table profile enable row level security;

create policy profile_own_read on profile
  for select to authenticated
  using (user_id = auth.uid());

grant select on profile to authenticated;

-- --- Set it, read it ---------------------------------------------------------

create or replace function set_my_name(name text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  clean text := btrim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if is_anonymous_caller() then
    raise exception 'A name belongs to an account with an email.';
  end if;
  if length(clean) = 0 then
    raise exception 'A name cannot be empty.';
  end if;
  if length(clean) > 40 then
    raise exception 'A name is at most 40 characters.';
  end if;

  insert into profile (user_id, name) values (auth.uid(), clean)
  on conflict (user_id) do update set name = excluded.name, updated_at = now();

  return clean;
end;
$$;

create or replace function my_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.name from profile p where p.user_id = auth.uid();
$$;

revoke execute on function set_my_name(text) from public, anon;
revoke execute on function my_name()         from public, anon;
grant  execute on function set_my_name(text) to authenticated;
grant  execute on function my_name()         to authenticated;

-- --- B48: the admin's own seat is theirs -------------------------------------
-- True when the seat is now the caller's. False, changing nothing, when it is
-- not theirs to take: not their group, somebody else's claimed seat, or they
-- already hold another seat in this group. Never raises for those — the phone
-- calls it on every sync of the admin row and a "no" is an ordinary answer.

create or replace function bind_my_seat(target_player_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  b       uuid;
  holder  uuid;
begin
  if me is null or is_anonymous_caller() then
    return false;
  end if;

  select p.book_id, p.claimed_by_user_id into b, holder
    from player p where p.id = target_player_id
    for update;

  if b is null or not is_book_host(b) then
    return false;
  end if;
  if holder = me then
    return true;
  end if;
  if holder is not null then
    return false;
  end if;
  if exists (select 1 from player p
              where p.book_id = b and p.claimed_by_user_id = me) then
    return false;
  end if;

  -- Any code still out for this seat dies: it is somebody's now.
  update player_invite
     set revoked_at = now()
   where player_id = target_player_id and claimed_at is null and revoked_at is null;

  update player set claimed_by_user_id = me where id = target_player_id;
  return true;
end;
$$;

revoke execute on function bind_my_seat(uuid) from public, anon;
grant  execute on function bind_my_seat(uuid) to authenticated;

comment on function bind_my_seat(uuid) is
  'The admin binds their own seat in their own group, so the group knows its admin by name — B48. False, changing nothing, for anything else.';

-- --- The admin's name: their seat, else their account -------------------------

create or replace function name_in_book(target_book_id uuid, target_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.display_name
       from player p
      where p.book_id = target_book_id
        and p.claimed_by_user_id = target_user
      order by p.created_at
      limit 1),
    -- Only for the group's admin. Anybody else is known in a group by the seat
    -- the admin typed for them, or not at all.
    (select pr.name
       from profile pr
       join book b on b.id = target_book_id and b.host_user_id = pr.user_id
      where pr.user_id = target_user)
  );
$$;

create or replace function preview_player_invite(code text)
returns table (player_name text, group_name text, host_name text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  started timestamptz := clock_timestamp();
  hit     boolean := false;
begin
  for player_name, group_name, host_name in
    select p.display_name,
           b.group_name,
           name_in_book(b.id, b.host_user_id)
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

  if not hit then
    perform pad_refusal(started);
  end if;
end;
$$;

-- deletion_plan_for, as 0024 wrote it, with the admin named through
-- name_in_book (seat, else account) instead of the seat alone.
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
    select p.id as player_id, p.display_name, b.id as book_id, b.group_name,
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

-- create or replace keeps a function's grants; this one stays closed (0026).
revoke execute on function deletion_plan_for(uuid) from public, anon, authenticated;
