-- =============================================================================
-- A hand-off keeps the name the admin typed, after the account is gone
-- =============================================================================
-- Owner, 28 September, and again 9 November: when somebody deletes their
-- account, their seat keeps its name AS THE ADMIN TYPED IT. The person never
-- gave us that name, and the group's record only balances with every seat in
-- it. 0024 does that for the seat and every figure on it.
--
-- It did not do it for two records that name a person by ACCOUNT rather than
-- by seat: who passed a night to whom (`night_pass`), and whose phone a late
-- change came from (`night_late_change`). Their names were looked up through
-- the account's claimed seat, and after a delete there is neither — so
-- "Marek passed the game to Lena at 23:10" would have lost Lena, and the
-- review sheet titled "From Lena's phone" would have lost its title. The design
-- doc proposed a new string for that, "a former member". This is the answer
-- that needs no new string: each row remembers the SEAT as well as the account,
-- and the name is read off the seat — the name the admin typed, the same one
-- every other screen shows for that night.
--
-- WHAT IT ADDS:
--   night_pass.from_player_id           the seat the night came from
--                                       (`to_player_id` exists since 0020)
--   night_late_change.from_player_id    the seat of the phone that handed it in
--   a trigger on each that fills the seat from the account on insert, so no
--   function that writes these rows has to change
--   a backfill of every row already there
--
-- WHAT IT CHANGES: night_role, my_passes, names_in_night (for rows that still
-- name an account) and late_change_sources read the seat's name first, and the
-- account's only when the row has no seat. A row whose person was deleted has
-- no account and still has its seat.
-- =============================================================================

alter table night_pass
  add column from_player_id uuid references player (id) on delete set null;

alter table night_late_change
  add column from_player_id uuid references player (id) on delete set null;

comment on column night_pass.from_player_id is
  'The seat the night came from, when the account that held it had one. Read for the name, which outlives the account (0025).';
comment on column night_late_change.from_player_id is
  'The seat of the phone that handed this in. Read for "From Lena''s phone", which outlives the account (0025).';

-- --- The seat behind an account, in one book ---------------------------------
-- The same lookup `name_in_book` makes, returning the row instead of the word.

create or replace function seat_in_book(target_book_id uuid, target_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
    from player p
   where p.book_id = target_book_id
     and p.claimed_by_user_id = target_user
   order by p.created_at
   limit 1;
$$;

revoke execute on function seat_in_book(uuid, uuid) from public;

-- --- Filled on the way in -----------------------------------------------------

create or replace function night_pass_remembers_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b uuid := session_book_id(new.session_id);
begin
  if new.from_player_id is null and new.from_user is not null then
    new.from_player_id := seat_in_book(b, new.from_user);
  end if;
  if new.to_player_id is null and new.to_user is not null then
    new.to_player_id := seat_in_book(b, new.to_user);
  end if;
  return new;
end;
$$;

create trigger night_pass_seats
  before insert on night_pass
  for each row execute function night_pass_remembers_seats();

create or replace function late_change_remembers_seat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.from_player_id is null and new.from_user is not null then
    new.from_player_id := seat_in_book(session_book_id(new.session_id), new.from_user);
  end if;
  return new;
end;
$$;

create trigger night_late_change_seat
  before insert on night_late_change
  for each row execute function late_change_remembers_seat();

-- --- Every row already there --------------------------------------------------

update night_pass p
   set from_player_id = seat_in_book(s.book_id, p.from_user)
  from session s
 where s.id = p.session_id
   and p.from_player_id is null
   and p.from_user is not null;

update night_pass p
   set to_player_id = seat_in_book(s.book_id, p.to_user)
  from session s
 where s.id = p.session_id
   and p.to_player_id is null
   and p.to_user is not null;

update night_late_change c
   set from_player_id = seat_in_book(s.book_id, c.from_user)
  from session s
 where s.id = c.session_id
   and c.from_player_id is null
   and c.from_user is not null;

-- --- The name of a seat, falling back to the account --------------------------

create or replace function seat_or_account_name(target_book_id uuid, seat uuid, target_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.display_name from player p where p.id = seat and p.book_id = target_book_id),
    name_in_book(target_book_id, target_user)
  );
$$;

revoke execute on function seat_or_account_name(uuid, uuid, uuid) from public;

-- --- The readers --------------------------------------------------------------
-- Each as 0020 wrote it, with the name read off the seat first.

create or replace function night_role(target_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'yours', can_write_session(s.id),
           'host',  is_book_host(s.book_id),
           'book',  s.book_id,
           'recorder', name_in_book(s.book_id, coalesce(s.writer_user_id, b.host_user_id)),
           'recorder_user', coalesce(s.writer_user_id, b.host_user_id),
           'last', (
             select jsonb_build_object(
                      'id', p.id,
                      'kind', p.kind,
                      'from_user', p.from_user,
                      'to_user', p.to_user,
                      'from_name', seat_or_account_name(s.book_id, p.from_player_id, p.from_user),
                      'to_name', seat_or_account_name(s.book_id, p.to_player_id, p.to_user),
                      'at', p.passed_at,
                      'opened', p.opened_at is not null
                    )
               from night_pass p
              where p.session_id = s.id
              order by p.passed_at desc
              limit 1
           )
         )
    from session s
    join book b on b.id = s.book_id
   where s.id = target_session_id
     and (is_book_host(s.book_id)
          or is_book_member(s.book_id)
          or s.writer_user_id = auth.uid()
          or can_read_session(s.id));
$$;

create or replace function my_passes(since interval default interval '7 days')
returns table (
  id          uuid,
  session_id  uuid,
  book_id     uuid,
  kind        text,
  from_user   uuid,
  to_user     uuid,
  from_name   text,
  to_name     text,
  passed_at   timestamptz,
  opened      boolean,
  mine_now    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.session_id,
         s.book_id,
         p.kind,
         p.from_user,
         p.to_user,
         seat_or_account_name(s.book_id, p.from_player_id, p.from_user),
         seat_or_account_name(s.book_id, p.to_player_id, p.to_user),
         p.passed_at,
         p.opened_at is not null,
         can_write_session(p.session_id)
    from night_pass p
    join session s on s.id = p.session_id
   where (p.to_user = auth.uid() or p.from_user = auth.uid())
     and p.passed_at > now() - since
   order by p.passed_at asc;
$$;

-- Whose phone each late change came from. Keyed by account, as the review
-- sheet groups them; a deleted account is the null key, named by its seat.
create or replace function late_change_sources(target_session_id uuid)
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.from_user,
         min(seat_or_account_name(session_book_id(target_session_id), c.from_player_id, c.from_user))
    from night_late_change c
   where c.session_id = target_session_id
     and (can_write_session(target_session_id)
          or is_book_host(session_book_id(target_session_id)))
   group by c.from_user;
$$;

-- --- The watcher's feed -------------------------------------------------------
-- A watcher reads `night_pass` straight from the table. It already reads every
-- name on the night's roster (`player_watcher_read`), so `watchNight.ts` names
-- a hand-off by its seat columns from that list, and asks `names_in_night`
-- only for a row that has no seat. Nothing to add here.
