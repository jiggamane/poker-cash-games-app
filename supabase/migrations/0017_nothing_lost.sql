-- =============================================================================
-- Nothing lost when a night moves, and the code is enough to take one
-- =============================================================================
-- Two changes to 0016, both about passing the book, both asked for the day it
-- shipped.
--
-- 1. LATE CHANGES ARE KEPT, NOT DROPPED.
--
--    0016 kept one writer per night, and the one place that cost something was
--    the host taking a night back: whatever the other phone had recorded and not
--    yet sent was refused by the server from then on, and the phone threw it
--    away and said how many. That is money somebody at the table handed over,
--    and "your phone says 3 changes were lost" is not an answer to it.
--
--    Now the phone hands them in instead. `hand_in_late_changes` takes the
--    operations it could not send, exactly as they were queued, and keeps them
--    on the server beside the night with a status — waiting, added, or left out.
--    The phone recording the night sees them and adds the ones that belong
--    (`decide_late_change`); adding re-records them on that phone, in its own
--    numbering, so the ledger still has one writer and one sequence. A change
--    that is left out is still there, still says who made it and when, and still
--    says it was left out. Nothing a phone recorded is ever deleted by this.
--
--    Why not append them straight to the ledger: the ledger is numbered by its
--    one writer, and a second writer's entry 7 is the collision the whole design
--    avoids. And a person has to look — the host who took the night back may
--    already have recorded the same rebuy again by hand, and adding both is a
--    second rebuy nobody made.
--
-- 2. THE CODE IS ENOUGH.
--
--    0016 refused an anonymous phone, so taking over a night meant having an
--    email account — and sign-up is closed (`shouldCreateUser: false`), so it
--    meant the owner inviting that person in the Supabase dashboard first. For
--    a friend at the table that is not a step anybody will take mid-game.
--
--    The code is a grant from the phone that holds the night, naming one night,
--    for one use, for ten minutes. That is a better credential than an account
--    for this one purpose, so an anonymous phone may now redeem one and write
--    THAT night — and nothing else. The host's own powers are untouched: every
--    book-level host policy still asks `is_book_host`, which still refuses an
--    anonymous caller (0005).
-- =============================================================================

-- --- 2. Anonymous writers, for a night they were handed ----------------------

-- The explicit grant is the check. A writer is either the account the night was
-- passed to, anonymous or not, or — while it has been passed to nobody — the
-- host, who is never anonymous because `is_book_host` says so.
create or replace function can_write_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
      from session s
     where s.id = target_session_id
       and (s.writer_user_id = auth.uid()
            or (s.writer_user_id is null and is_book_host(s.book_id)))
  );
$$;

create or replace function holds_live_night(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from session s
     where s.book_id = target_book_id
       and s.writer_user_id = auth.uid()
       and s.status <> 'settled'
  );
$$;

create or replace function redeem_night_handover(code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  started  timestamptz := clock_timestamp();
  wanted   text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  h        night_handover%rowtype;
  host     uuid;
begin
  -- Somebody has to be on the other end: the app signs a phone in anonymously
  -- before it redeems, exactly as it does for a claimed seat.
  if auth.uid() is null then
    perform pad_refusal(started);
    raise exception 'That code is not live.';
  end if;

  select * into h
    from night_handover n
   where n.code = wanted
     and n.redeemed_at is null
     and n.revoked_at is null
     and n.expires_at > now()
   for update;

  if not found then
    perform pad_refusal(started);
    raise exception 'That code is not live.';
  end if;

  select b.host_user_id into host
    from session s join book b on b.id = s.book_id
   where s.id = h.session_id;

  update night_handover
     set redeemed_at = now(), redeemed_by = auth.uid()
   where id = h.id;

  perform set_config('poker.handover', 'on', true);
  update session
     set writer_user_id = case when auth.uid() = host then null else auth.uid() end
   where id = h.session_id;
  perform set_config('poker.handover', '', true);

  return h.session_id;
end;
$$;

-- --- 1. Late changes ----------------------------------------------------------

create table night_late_change (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references session (id) on delete cascade,
  -- The queue's own id for the operation. Handing the same one in twice — the
  -- phone lost signal between the server storing it and hearing back — lands
  -- once.
  op_id        text not null,
  -- The operation exactly as it was queued: `entry.append`, `seat.upsert`, …
  -- and its payload. Nothing is interpreted on the way in; the phone that adds
  -- it reads it the way it reads its own queue.
  kind         text not null,
  payload      jsonb not null,
  -- When the phone recorded it, which is its place in the night.
  queued_at    timestamptz not null default now(),
  from_user    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  handed_in_at timestamptz not null default now(),
  status       text not null default 'waiting',
  decided_at   timestamptz,
  decided_by   uuid references auth.users (id) on delete set null,

  unique (session_id, op_id),

  constraint night_late_change_status_known
    check (status in ('waiting', 'added', 'left_out')),
  constraint night_late_change_decided_whole
    check ((status = 'waiting') = (decided_at is null))
);

create index night_late_change_session_idx on night_late_change (session_id, status);

comment on table night_late_change is
  'Changes a phone recorded on a night after the night moved to another phone, kept instead of dropped. The phone recording the night adds them (re-recording them in its own numbering) or leaves them out; neither deletes them.';

alter table night_late_change enable row level security;

-- Read: the phone that handed a change in (to show its status), and whoever may
-- write the night or hosts the book (to decide it).
create policy night_late_change_read on night_late_change
  for select to authenticated
  using (
    from_user = auth.uid()
    or can_write_session(session_id)
    or is_book_host(session_book_id(session_id))
  );

grant select on night_late_change to authenticated;

-- Hand in. Only an account that has written the night — it held it by a code,
-- or it is the book's host — can hand anything in for it. Returns how many were
-- stored, not counting ones already there.
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

-- Decide. The phone recording the night, only — adding means it has just
-- re-recorded the change, and nobody else can.
create or replace function decide_late_change(target_id uuid, added boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  select session_id into sid from night_late_change where id = target_id;
  if sid is null or not can_write_session(sid) then
    raise exception 'Only the phone recording this night can decide what joins it.';
  end if;

  update night_late_change
     set status = case when added then 'added' else 'left_out' end,
         decided_at = now(),
         decided_by = auth.uid()
   where id = target_id
     and status = 'waiting';
end;
$$;

grant execute on function hand_in_late_changes(uuid, jsonb) to authenticated;
grant execute on function decide_late_change(uuid, boolean) to authenticated;
