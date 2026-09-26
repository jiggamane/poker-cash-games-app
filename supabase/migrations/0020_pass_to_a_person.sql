-- =============================================================================
-- Passing the game to a person — the receiver does nothing
-- =============================================================================
-- `design/handoff-game-admin/`, cut 26 September. 0016 moved a night between
-- phones by a ten-character code that the receiver had to type. The owner's
-- decision since (`docs/design-request-game-admin.md`, 25 September): the admin
-- PICKS A PERSON from the group, and the game arrives on that person's phone as
-- an announcement — no code, no confirm, no tap. This file is that mechanism.
--
-- WHAT DOES NOT CHANGE. One writer per night, named by `session.writer_user_id`
-- (null is the book's host); every write policy from 0016 still asks
-- `can_write_session`; the column still moves only inside these functions,
-- under the `session_writer_guard` trigger. Late changes (0017) are kept
-- exactly as they were: a phone that recorded on a night after it moved hands
-- them in, and the phone recording the night decides each one.
--
-- WHAT DOES.
--
--   night_pass         one row every time a night changes hands by name —
--                      passed, or taken back — with who, to whom, and when.
--                      It is the role line on every phone ("passed to Lena at
--                      23:10"), the announcement on the receiving phone, the
--                      hand-off row on a watcher's feed, and the answer to
--                      "who may take it back".
--
--   pass_night()       whoever writes the night hands it to a CLAIMED player of
--                      the book — a name the host typed has nobody behind it to
--                      receive anything, and the sheet says so before this is
--                      ever called. The game moves on the server the moment
--                      this returns; the receiving phone learns on its next
--                      look (`my_passes`) or, if it is open, from the realtime
--                      feed `night_pass` is on.
--
--   take_back_night()  widened from 0016. The person who passed the game away
--                      can take it back, and so can the book's host, who opened
--                      it — with no code and no membership check: taking a game
--                      BACK is running the game, not taking a new one.
--
--   ack_pass()         the receiving phone saying it has taken the game up, so
--                      the phone that passed it can stop saying WAITING ON LENA.
--
--   night_role()       what one night is, from the caller's side: whether this
--                      phone records it, who does, and the last hand-off.
--
--   my_passes()        every hand-off in the last week that named the caller,
--                      either side — how a phone that has never held a night
--                      discovers one that was just passed to it.
--
-- THE MEMBERSHIP CHECK IS NOT HERE. The handoff gates who may take a game by
-- membership (Free never; Regular once a billing period; Full always), and rev
-- 18 § 4 says to build none of it and keep one policy seam that answers yes —
-- `apps/mobile/src/lib/membership.ts`. `0018_accounts.sql` enforces a plan for
-- STARTING a group and nothing else, so passing to an account with no plan is
-- not refused by the database yet. When it is, it is one check at the top of
-- `pass_night`, against `my_plan()`'s answer for the receiver.
--
-- THE CODE PATH (0016) IS LEFT IN PLACE and no longer called by the app. Its
-- functions are harmless — a code needs the phone recording the night to mint
-- it — and dropping them is a separate, deliberate migration once nothing in
-- the field can still be holding one.
-- =============================================================================

-- --- The log ----------------------------------------------------------------

create table night_pass (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references session (id) on delete cascade,
  kind          text not null check (kind in ('passed', 'taken_back')),
  -- Who held the night before this row, and who holds it after.
  from_user     uuid not null references auth.users (id) on delete cascade,
  to_user       uuid not null references auth.users (id) on delete cascade,
  -- The roster row the game went to, when it went by name. Null on a take-back
  -- by somebody with no seat in the book (the host, usually).
  to_player_id  uuid references player (id) on delete set null,
  passed_at     timestamptz not null default now(),
  -- When the phone it went to took it up. Null until it has: the passing phone
  -- reads WAITING ON <name> off this, and nothing is recorded in the gap.
  opened_at     timestamptz
);

create index night_pass_session_idx on night_pass (session_id, passed_at desc);
create index night_pass_to_idx on night_pass (to_user, passed_at desc);
create index night_pass_from_idx on night_pass (from_user, passed_at desc);

comment on table night_pass is
  'Every time a night changed hands by name: passed to a claimed player, or taken back by the previous admin or the host. Kept for ever — who recorded which part of a night is exactly what somebody will ask afterwards.';

alter table night_pass enable row level security;

-- Read: either end of the hand-off, anyone who can read the night (a watcher
-- over a share link, a claimed member, the host), and the phone writing it.
create policy night_pass_read on night_pass
  for select to authenticated
  using (
    from_user = auth.uid()
    or to_user = auth.uid()
    or can_read_session(session_id)
    or is_book_member(session_book_id(session_id))
    or can_write_session(session_id)
  );

grant select on night_pass to authenticated;

-- On the live feed, so an open phone hears the game arrive the moment it does
-- and a watcher's feed gains the row as it happens. Guarded like 0019: realtime
-- goes through the read policy above, so nobody hears a hand-off they could
-- not read.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'night_pass'
     ) then
    execute 'alter publication supabase_realtime add table public.night_pass';
  end if;
end;
$$;

-- --- A name for an account, inside one book -----------------------------------
-- The only place a uid becomes a word. A person who claimed no seat in this
-- book has no name here and the caller says so in its own words.

create or replace function name_in_book(target_book_id uuid, target_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.display_name
    from player p
   where p.book_id = target_book_id
     and p.claimed_by_user_id = target_user
   order by p.created_at
   limit 1;
$$;

-- --- Pass it ------------------------------------------------------------------

create or replace function pass_night(target_session_id uuid, to_player_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  book_of   uuid;
  host      uuid;
  receiver  uuid;
  made      uuid;
begin
  if not can_write_session(target_session_id) then
    raise exception 'Only the phone recording this night can pass it on.';
  end if;

  select s.book_id, b.host_user_id into book_of, host
    from session s join book b on b.id = s.book_id
   where s.id = target_session_id;

  select p.claimed_by_user_id into receiver
    from player p
   where p.id = to_player_id
     and p.book_id = book_of
     and p.removed_at is null;

  if not found then
    raise exception 'That person is not in this group.';
  end if;
  -- Copy for the state the sheet already refuses before asking (state 3's
  -- "Name only · no app to send it to"); this is the floor under it.
  if receiver is null then
    raise exception 'That name has no app to send the game to.';
  end if;
  if receiver = auth.uid() then
    raise exception 'The game is already on this phone.';
  end if;

  -- A code out for this night (0016) is withdrawn: the game is going by name.
  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and redeemed_at is null
     and revoked_at is null;

  perform set_config('poker.handover', 'on', true);
  update session
     -- The host receiving it is the night coming home: null, not their uid,
     -- so there is one way of saying "the host writes this" and not two.
     set writer_user_id = case when receiver = host then null else receiver end
   where id = target_session_id;
  perform set_config('poker.handover', '', true);

  insert into night_pass (session_id, kind, from_user, to_user, to_player_id)
  values (target_session_id, 'passed', auth.uid(), receiver, to_player_id)
  returning id into made;

  return made;
end;
$$;

comment on function pass_night(uuid, uuid) is
  'Hand the night to a claimed player of its book. Moves the writer on the server at once; the receiving phone does nothing. Refuses a name with nobody behind it, and the caller''s own seat.';

-- --- Take it back -------------------------------------------------------------
-- Replaces 0016's, which let the host alone. The person who passed the game
-- away — the previous admin — can take it back too, and neither is checked for
-- anything: the night finishes on the membership it started with.

create or replace function take_back_night(target_session_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  book_of   uuid;
  host      uuid;
  holder    uuid;
  previous  uuid;
begin
  select s.book_id, b.host_user_id, coalesce(s.writer_user_id, b.host_user_id)
    into book_of, host, holder
    from session s join book b on b.id = s.book_id
   where s.id = target_session_id;

  if book_of is null then
    raise exception 'Only the host of this group, or whoever passed the game away, can take it back.';
  end if;

  -- Whoever last PASSED it away, if it is still where they passed it. A
  -- take-back is not a pass: the person a game was taken back from does not
  -- become somebody who can take it again, or a night would have two people
  -- with a button (`12-the-group.md` § 4.1's argument, kept).
  select case when p.kind = 'passed' then p.from_user end into previous
    from night_pass p
   where p.session_id = target_session_id
   order by p.passed_at desc
   limit 1;

  -- Spelled out against NULL: with no pass on record `previous` is null, and
  -- `auth.uid() = null` is neither true nor false, which `if not` would let
  -- through. Every clause here is a real boolean.
  if not (coalesce(auth.uid() = host, false)
          or (previous is not null
              and coalesce(auth.uid() = previous, false)
              and previous is distinct from holder)) then
    raise exception 'Only the host of this group, or whoever passed the game away, can take it back.';
  end if;

  -- Already here: nothing to move, nothing to log.
  if auth.uid() = holder then
    return;
  end if;

  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and redeemed_at is null
     and revoked_at is null;

  perform set_config('poker.handover', 'on', true);
  update session
     set writer_user_id = case when auth.uid() = host then null else auth.uid() end
   where id = target_session_id;
  perform set_config('poker.handover', '', true);

  insert into night_pass (session_id, kind, from_user, to_user, to_player_id, opened_at)
  values (target_session_id, 'taken_back', holder, auth.uid(),
          (select p.id from player p where p.book_id = book_of and p.claimed_by_user_id = auth.uid()
            order by p.created_at limit 1),
          -- The phone taking it back is, by definition, the phone that opened it.
          now());
end;
$$;

comment on function take_back_night(uuid) is
  'The host, or whoever passed the game away, takes it back with no code and no check. Logged as a hand-off the other way.';

-- --- The receiving phone has it ----------------------------------------------

create or replace function ack_pass(target_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update night_pass
     set opened_at = now()
   where id = target_id
     and to_user = auth.uid()
     and opened_at is null;
$$;

-- --- Where a night stands, from this phone ------------------------------------
-- Null when the caller cannot see the night at all, as `night_hold` (0016).
--
--   yours      this phone records it
--   host       this phone hosts the book
--   book       the book's id, for the queue
--   recorder   the name of whoever records it — null when they claimed no seat
--   last       the most recent hand-off: kind, the two names, when, and whether
--              the phone it went to has taken it up. Null on a night that has
--              never changed hands.

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
                      'from_name', name_in_book(s.book_id, p.from_user),
                      'to_name', name_in_book(s.book_id, p.to_user),
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

grant execute on function name_in_book(uuid, uuid)  to authenticated;
grant execute on function pass_night(uuid, uuid)    to authenticated;
grant execute on function take_back_night(uuid)     to authenticated;
grant execute on function ack_pass(uuid)            to authenticated;
grant execute on function night_role(uuid)          to authenticated;

-- --- Every hand-off that named this phone ------------------------------------
-- One row per hand-off in the last `since`, either side, newest last. A phone
-- polls this to find a night it has never held; `mine_now` says whether the
-- night is this phone's at the moment of asking, which is what decides whether
-- to take it up or merely to announce that it went.

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
         name_in_book(s.book_id, p.from_user),
         name_in_book(s.book_id, p.to_user),
         p.passed_at,
         p.opened_at is not null,
         can_write_session(p.session_id)
    from night_pass p
    join session s on s.id = p.session_id
   where (p.to_user = auth.uid() or p.from_user = auth.uid())
     and p.passed_at > now() - since
   order by p.passed_at asc;
$$;

grant execute on function my_passes(interval) to authenticated;

-- --- Names for the accounts on a night's hand-offs ----------------------------
-- A watcher's feed draws every hand-off by name ("23:10 · Marek passed the game
-- to Lena", state 21), and a watcher cannot read who claimed which seat. So
-- the names are given, inside the book and only to somebody who may read the
-- night, for exactly the accounts asked about.

create or replace function names_in_night(target_session_id uuid, user_ids uuid[])
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select u, name_in_book(s.book_id, u)
    from session s, unnest(user_ids) as u
   where s.id = target_session_id
     and (is_book_host(s.book_id)
          or is_book_member(s.book_id)
          or s.writer_user_id = auth.uid()
          or can_read_session(s.id));
$$;

grant execute on function names_in_night(uuid, uuid[]) to authenticated;

-- --- Whose phone a late change came from ------------------------------------
-- The review sheet is titled by the phone the changes came from ("From Lena's
-- phone"). A member cannot read `claimed_by_user_id`, so the name is resolved
-- here for whoever may decide the changes.

create or replace function late_change_sources(target_session_id uuid)
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct c.from_user, name_in_book(session_book_id(target_session_id), c.from_user)
    from night_late_change c
   where c.session_id = target_session_id
     and (can_write_session(target_session_id)
          or is_book_host(session_book_id(target_session_id)));
$$;

grant execute on function late_change_sources(uuid) to authenticated;

-- --- Handing in, for a phone the game went to by name -------------------------
-- 0017 let a phone hand changes in if it had redeemed a code for the night or
-- hosted the book. A phone the game went to by name did neither, so its changes
-- would have been refused — the one way this design could lose something.

create or replace function hand_in_late_changes(target_session_id uuid, changes jsonb)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  stored int;
begin
  if auth.uid() is null or not (
       exists (select 1 from night_handover h
                where h.session_id = target_session_id and h.redeemed_by = auth.uid())
       or exists (select 1 from night_pass p
                   where p.session_id = target_session_id
                     and (p.to_user = auth.uid() or p.from_user = auth.uid()))
       or exists (select 1 from session s
                   where s.id = target_session_id and is_book_host(s.book_id))
     ) then
    raise exception 'Only a phone that recorded this night can hand changes in for it.';
  end if;

  if jsonb_typeof(changes) <> 'array' then
    raise exception 'Changes arrive as a list.';
  end if;

  insert into night_late_change (session_id, op_id, kind, payload, queued_at, from_user)
  select target_session_id,
         c ->> 'op_id',
         c ->> 'kind',
         coalesce(c -> 'payload', '{}'::jsonb),
         coalesce((c ->> 'queued_at')::timestamptz, now()),
         auth.uid()
    from jsonb_array_elements(changes) c
   where c ->> 'op_id' is not null and c ->> 'kind' is not null
  on conflict (session_id, op_id) do nothing;

  get diagnostics stored = row_count;
  return stored;
end;
$$;

-- --- The watcher's header names the recorder ---------------------------------
-- X1's band reads "Read-only. Only Marek can write to the ledger", and since
-- 0016 the person who can is not always the host. The header gains the
-- recorder's name beside the host's; the app draws the recorder.

drop function if exists night_header(uuid);

create function night_header(target_session_id uuid)
returns table (
  group_name     text,
  host_name      text,
  player_count   int,
  started_at     timestamptz,
  ended_at       timestamptz,
  status         text,
  rounding_mode  text,
  recorder_name  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.group_name,
    name_in_book(b.id, b.host_user_id),
    (select count(*)::int from session_seat ss where ss.session_id = s.id),
    s.started_at,
    s.ended_at,
    s.status::text,
    s.rounding_mode::text,
    name_in_book(b.id, coalesce(s.writer_user_id, b.host_user_id))
  from session s
  join book b on b.id = s.book_id
  where s.id = target_session_id
    and (
      s.id = watcher_session_id()
      or is_book_member(s.book_id)
      or is_book_host(s.book_id)
      or s.writer_user_id = auth.uid()
    );
$$;

comment on function night_header(uuid) is
  'The group, the host''s name, the recorder''s name, the seat count, the times and the rounding rule for ONE night, to somebody already entitled to read it. Feeds X1''s meta line and read-only band. Zero rows for anybody else.';

grant execute on function night_header(uuid) to authenticated;
