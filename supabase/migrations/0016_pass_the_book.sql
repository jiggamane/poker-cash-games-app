-- =============================================================================
-- Pass the book — another phone records tonight
-- =============================================================================
-- Until now the night's writer was the book's host, full stop: every write
-- policy asked `is_book_host`, so the only phone that could record money was the
-- one signed in as the person who created the group. A host who wanted somebody
-- else to run the game had to have them open the night on their own phone at the
-- start of the evening — you could not pass the book across the table at
-- midnight. `docs/somebody-elses-phone.md` Step 3 said so in as many words.
--
-- THIS KEEPS ONE WRITER PER NIGHT. It moves which one. That is the whole design,
-- and it is why nothing about sync changes: `ledger_entry` is still unique on
-- (session_id, seq), there is still exactly one device numbering entries, and
-- the merge rule is still "there is nothing to merge". Two phones writing the
-- same night at once was considered and not built — see
-- `docs/storage-and-sync.md` § Passing the book.
--
-- The shape:
--
--   session.writer_user_id   null  → the book's host writes it (every night
--                                    ever recorded, unchanged)
--                            a uid → that account writes it, and the host
--                                    does not, until it comes back
--
--   night_handover           a ten-character code, minted by whoever holds the
--                            night, good for ten minutes and one use. Redeeming
--                            it moves the night to the redeemer. The host
--                            redeeming one is the night coming home, and sets
--                            the column back to null.
--
--   take_back_night()        the host's own way back, with no code — for the
--                            phone that went flat with the night on it. The
--                            host created the group; a night in it is never
--                            out of their reach.
--
-- The column only moves inside those functions. A trigger refuses every other
-- change to it, because the writer is also allowed to UPDATE the session row
-- (status, table name, rounding) and a policy cannot compare old to new.
-- =============================================================================

alter table session
  add column writer_user_id uuid references auth.users (id) on delete set null;

comment on column session.writer_user_id is
  'Who records this night, when it is not the book''s host. Null — every night recorded before 0016, and every night not passed — is the host. Moves only through redeem_night_handover and take_back_night.';

-- --- Who may write a night ----------------------------------------------------
-- The one question every write policy below asks. Anonymous callers never: an
-- anonymous account is a phone that opened a share link or claimed a seat, and
-- the ledger is not something it records. Same rule as `is_book_host` (0005).

create or replace function can_write_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not is_anonymous_caller() and exists (
    select 1
      from session s
      join book b on b.id = s.book_id
     where s.id = target_session_id
       and coalesce(s.writer_user_id, b.host_user_id) = auth.uid()
  );
$$;

comment on function can_write_session(uuid) is
  'True when the caller records this night: its writer, or the book''s host while it has none. Every session-scoped write policy asks this.';

-- A night being played brings a few book-level writes with it: a guest seated
-- for the first time is a new `player` row, and tonight's rules are the book's
-- `money_rule` rows (a night carries its own copy on the phone; on the server the
-- current rules ARE the open night's rules). So whoever holds an unsettled night
-- of a book may write those two tables for it — and only while the night is
-- live. Settled, they go back to the host alone.

create or replace function holds_live_night(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not is_anonymous_caller() and exists (
    select 1 from session s
     where s.book_id = target_book_id
       and s.writer_user_id = auth.uid()
       and s.status <> 'settled'
  );
$$;

comment on function holds_live_night(uuid) is
  'True when the caller has been passed an unsettled night of this book. Grants the roster and rule writes a night in progress needs, and nothing else at book level.';

-- --- The column moves only by handover ---------------------------------------

create or replace function session_writer_moves_only_by_handover()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('poker.handover', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.writer_user_id is not null then
    raise exception 'A night opens with its host as the writer. It is passed with a code.';
  end if;

  if tg_op = 'UPDATE' and new.writer_user_id is distinct from old.writer_user_id then
    raise exception 'The writer of a night changes only by a handover code or the host taking it back.';
  end if;

  return new;
end;
$$;

create trigger session_writer_guard
  before insert or update of writer_user_id on session
  for each row execute function session_writer_moves_only_by_handover();

-- =============================================================================
-- night_handover — the code
-- =============================================================================

create table night_handover (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references session (id) on delete cascade,
  code         text not null unique,
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- Ten minutes. A code is read across a table and typed straight in; one that
  -- is still live an hour later is one somebody forgot to use, and the phone
  -- that issued it has been recording ever since.
  expires_at   timestamptz not null default now() + interval '10 minutes',
  revoked_at   timestamptz,
  redeemed_at  timestamptz,
  redeemed_by  uuid references auth.users (id) on delete set null,

  constraint night_handover_redeemed_whole
    check ((redeemed_at is null) = (redeemed_by is null))
);

-- Is it redeemable right now? Asked by the functions below and nowhere else.
-- It needs `now()`, which is not immutable, so it cannot be the predicate of the
-- partial index — which is why issuing a code revokes the live one first.
create unique index night_handover_one_live
  on night_handover (session_id)
  where redeemed_at is null and revoked_at is null;

create index night_handover_redeemer_idx on night_handover (redeemed_by);

comment on table night_handover is
  'A code that moves a night to another account: one use, ten minutes, one live per night. Kept after use — who recorded which part of a night is exactly what somebody will ask afterwards.';

alter table night_handover enable row level security;

-- --- A member of the book, for reading ---------------------------------------
-- Whoever holds a night has to be able to read the book it is in — the roster,
-- the rules, the ledger they are about to continue. They need not have claimed a
-- seat: claiming is done anonymously, and recording is not (see above), so the
-- account a night is passed to is usually NOT the one that claimed.
--
-- Read access follows the grant for as long as the account has ever held a night
-- of the book. It is not withdrawn when the night is passed back: they recorded
-- part of it, and the same reasoning as a claimed player's applies — a night you
-- were part of is one you can read.

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
  ) or exists (
    select 1 from night_handover h
      join session s on s.id = h.session_id
     where s.book_id = target_book_id
       and h.redeemed_by = auth.uid()
  );
$$;

-- Nobody reads the table. Everything goes through the functions, which say only
-- what the caller needs: whether their own code is still waiting.

-- --- Issue --------------------------------------------------------------------

create or replace function create_night_handover(target_session_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  fresh text;
begin
  if not can_write_session(target_session_id) then
    raise exception 'Only the phone recording this night can pass it on.';
  end if;

  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and redeemed_at is null
     and revoked_at is null;

  fresh := new_invite_code();
  insert into night_handover (session_id, code, created_by)
  values (target_session_id, fresh, auth.uid());

  return fresh;
end;
$$;

-- --- Watch it, and withdraw it -----------------------------------------------
-- The phone that issued the code asks these two, and nothing else can: the
-- answer is about the caller's own most recent code for the night.
--
--   waiting — live, unexpired, unused
--   taken   — redeemed: the night is on another phone now
--   gone    — withdrawn, expired, or there never was one

create or replace function night_handover_state(target_session_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when h.redeemed_at is not null then 'taken'
             when h.revoked_at is null and h.expires_at > now() then 'waiting'
             else 'gone'
           end
      from night_handover h
     where h.session_id = target_session_id
       and h.created_by = auth.uid()
     order by h.created_at desc
     limit 1
  ), 'gone');
$$;

create or replace function revoke_night_handover(target_session_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and created_by = auth.uid()
     and redeemed_at is null
     and revoked_at is null;

  -- 'taken' if it was redeemed before this arrived: the sheet closing and the
  -- other phone typing the last character are a race, and the answer to it is
  -- whatever the database says happened first.
  return night_handover_state(target_session_id);
end;
$$;

-- --- Redeem -------------------------------------------------------------------

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
  -- Recording is an account's job. The phone has to be signed in.
  if auth.uid() is null or is_anonymous_caller() then
    perform pad_refusal(started);
    raise exception 'Sign in to take over a night.';
  end if;

  select * into h
    from night_handover n
   where n.code = wanted
     and n.redeemed_at is null
     and n.revoked_at is null
     and n.expires_at > now()
   for update;

  -- One sentence for every dead code — unknown, used, withdrawn, expired — for
  -- the same reason invites have one (0009): the difference is only worth
  -- anything to somebody guessing.
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
     -- The host redeeming is the night coming home: null, not their own uid, so
     -- there is one way of saying "the host writes this" and not two.
     set writer_user_id = case when auth.uid() = host then null else auth.uid() end
   where id = h.session_id;
  perform set_config('poker.handover', '', true);

  return h.session_id;
end;
$$;

-- --- The host takes it back ---------------------------------------------------
-- No code, because the case it exists for is the one where there is nobody to
-- ask for one: the phone the night was passed to is flat, lost, or gone home.
-- Anything that phone recorded and had not sent is lost with it, and its next
-- send is refused — the app says so on that phone. That is the cost, and it is
-- the only way a night can ever be stranded on a device the group cannot reach.

create or replace function take_back_night(target_session_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from session s where s.id = target_session_id and is_book_host(s.book_id)
  ) then
    raise exception 'Only the host of this group can take a night back.';
  end if;

  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and redeemed_at is null
     and revoked_at is null;

  perform set_config('poker.handover', 'on', true);
  update session set writer_user_id = null where id = target_session_id;
  perform set_config('poker.handover', '', true);
end;
$$;

-- --- Where a night is ---------------------------------------------------------
-- What a phone asks to find out whether the night it holds is still its to
-- write. Null when the caller cannot see the night at all — a night that never
-- reached the server, or an account that has nothing to do with it — and the
-- app then leaves its own answer alone rather than guessing.

create or replace function night_hold(target_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'yours', can_write_session(s.id),
           'host',  is_book_host(s.book_id),
           'book',  s.book_id
         )
    from session s
   where s.id = target_session_id
     and (is_book_host(s.book_id) or is_book_member(s.book_id) or s.writer_user_id = auth.uid());
$$;

grant execute on function can_write_session(uuid)       to authenticated;
grant execute on function create_night_handover(uuid)   to authenticated;
grant execute on function night_handover_state(uuid)    to authenticated;
grant execute on function revoke_night_handover(uuid)   to authenticated;
grant execute on function redeem_night_handover(text)   to authenticated;
grant execute on function take_back_night(uuid)         to authenticated;
grant execute on function night_hold(uuid)              to authenticated;

-- =============================================================================
-- The write policies, re-pointed from the host to the writer
-- =============================================================================
-- Each `*_host_all` below was one policy for reading and writing. It becomes two:
-- the host still READS everything in their book, whoever is writing it, and the
-- WRITE goes to whoever holds the night. While nobody has been passed a night
-- the two are the same person and nothing about any existing night changes.

-- --- session --------------------------------------------------------------
-- Creating a night is the host's (a night opens on the host's phone and is
-- passed from there). Changing one — status, table name, rounding, the close —
-- is the writer's.

drop policy session_host_all on session;

create policy session_host_read on session
  for select to authenticated
  using (is_book_host(book_id));

create policy session_host_insert on session
  for insert to authenticated
  with check (is_book_host(book_id));

create policy session_host_delete on session
  for delete to authenticated
  using (is_book_host(book_id));

create policy session_writer_update on session
  for update to authenticated
  using (can_write_session(id))
  with check (can_write_session(id));

-- --- session_seat -------------------------------------------------------------

drop policy session_seat_host_all on session_seat;

create policy session_seat_host_read on session_seat
  for select to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy session_seat_writer_all on session_seat
  for all to authenticated
  using (can_write_session(session_id))
  with check (can_write_session(session_id));

-- --- ledger_entry -------------------------------------------------------------
-- Insert only, as ever. The ledger is append-only for everybody.

drop policy ledger_entry_host_insert on ledger_entry;

create policy ledger_entry_writer_insert on ledger_entry
  for insert to authenticated
  with check (can_write_session(session_id));

-- --- final_count --------------------------------------------------------------

drop policy final_count_host_all on final_count;

create policy final_count_host_read on final_count
  for select to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy final_count_writer_all on final_count
  for all to authenticated
  using (can_write_session(session_id))
  with check (can_write_session(session_id));

-- --- settlement ---------------------------------------------------------------
-- Whoever holds the night closes it. The frozen-once trigger from 0002 still
-- stands over all of them.

drop policy settlement_host_all on settlement;

create policy settlement_host_read on settlement
  for select to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy settlement_writer_all on settlement
  for all to authenticated
  using (can_write_session(session_id))
  with check (can_write_session(session_id));

-- --- transfer_payment ---------------------------------------------------------

drop policy transfer_payment_host_all on transfer_payment;

create policy transfer_payment_host_read on transfer_payment
  for select to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy transfer_payment_writer_all on transfer_payment
  for all to authenticated
  using (can_write_session(session_id))
  with check (can_write_session(session_id));

-- --- player and money_rule: the book-level writes a live night needs ---------
-- Added beside the host's policies, not in place of them. The host keeps every
-- power over the roster and the rules; the writer gets what a night in progress
-- needs — a guest seated, a name fixed, tonight's rules changed — and never
-- takes a person off the roster.

create policy player_writer_insert on player
  for insert to authenticated
  with check (holds_live_night(book_id));

create policy player_writer_update on player
  for update to authenticated
  using (holds_live_night(book_id))
  with check (holds_live_night(book_id));

create policy money_rule_writer_insert on money_rule
  for insert to authenticated
  with check (holds_live_night(book_id));

create policy money_rule_writer_update on money_rule
  for update to authenticated
  using (holds_live_night(book_id))
  with check (holds_live_night(book_id));

-- A rule taken off tonight is a delete, on the phone that holds the night as on
-- the host's. Unlike a person, a rule has no history hanging off it: a settled
-- night carries the rules it was settled with in its own snapshot.
create policy money_rule_writer_delete on money_rule
  for delete to authenticated
  using (holds_live_night(book_id));
