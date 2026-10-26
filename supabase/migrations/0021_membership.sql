-- =============================================================================
-- Membership — the plan becomes a tier, and Regular's host night is counted
-- =============================================================================
-- Owner, 26 October: pro and club are both Full; the first paid tier,
-- Regular, has ONE host night a billing period, and it is checked and spent
-- before a game is passed to that person — on the server, not on the phone.
--
-- Until now there were two vocabularies and nothing joined them. `0018` named
-- an account's plan free / pro / club and enforced it for one thing, starting
-- a group. `design/handoff-game-admin/` named the tiers Free / Regular / Full
-- and gated TAKING a game — opening one, or being passed one — and the app
-- built every screen against one seam, `apps/mobile/src/lib/membership.ts`,
-- that answered Full for everybody. This file is the join:
--
--   plan → tier       free → free · regular → regular · pro, club → full
--
--   host_night        one row per (person, night) the first time a game lands
--                     on a Regular: opened by them, or passed to them. The
--                     same game coming back to them later costs nothing (the
--                     row already exists); a different game that period is
--                     refused. Passing it away does not refund it.
--
--   The billing period is the person's own, anchored to the day their Regular
--   started, one month at a time — never the calendar month. "Renews on" is
--   the end of the current period; a store subscription (Stage 4) pushes
--   `ends_at` forward and the anchor does not move.
--
--   my_membership()           the caller's tier, whether this period's host
--                             night is spent, and when it comes back. Home's
--                             start card and O1's gate read this.
--   roster_membership(ids)    the same for the roster's claimed seats, by
--                             player id, to whoever hosts the book or records
--                             a night of it — the pass sheet and GR4's "Who
--                             can run a game". Takes the night too, so a row
--                             can say whether THIS game already spent that
--                             person's night.
--
--   pass_night()              now refuses Free, refuses a Regular whose night
--                             is spent (unless it was spent on this very
--                             game), and spends it otherwise — in the same
--                             transaction as the move, so a refused pass moves
--                             nothing and a pass that moves is paid for.
--   opening a night           a trigger on `session` does the same for the
--                             phone opening it. A night a Regular opens is
--                             their host night; a night the host of a book
--                             with no plan at all tries to open is refused.
--                             Taking a game BACK is still unchecked: the night
--                             finishes on the membership it started with.
--
-- WHAT DOES NOT CHANGE. Watching, claiming a seat, reading your own money and
-- settlement are not gated (README § 1). A night that exists keeps every write
-- whatever happens to the plan. Starting a group still needs any plan at all
-- (`book_insert_needs_plan`), and Regular is a plan.
--
-- Starting a group on Regular: allowed, as `can_start_group()` already reads
-- it — a Regular can open one night a month, which is a group. The owner has
-- not said otherwise; the day they do it is one edit to that function.
-- =============================================================================

-- --- Regular is a plan a grant, a code or a store can give ------------------

alter table entitlement drop constraint entitlement_plan_check;
alter table entitlement
  add constraint entitlement_plan_check check (plan in ('regular', 'pro', 'club'));

alter table promo_code drop constraint promo_code_plan_check;
alter table promo_code
  add constraint promo_code_plan_check check (plan in ('regular', 'pro', 'club'));

-- Club over pro over regular; among equals, the one that lasts longest.
create or replace function my_plan()
returns table (plan text, source text, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(best.plan, 'free'), best.source, best.ends_at
    from (select 1) one
    left join lateral (
      select e.plan, e.source, e.ends_at
        from entitlement e
       where e.user_id = auth.uid()
         and e.revoked_at is null
         and e.starts_at <= now()
         and (e.ends_at is null or e.ends_at > now())
       order by case e.plan when 'club' then 0 when 'pro' then 1 else 2 end,
                e.ends_at desc nulls first
       limit 1
    ) best on true;
$$;

-- --- The host-night ledger ---------------------------------------------------

create table host_night (
  user_id     uuid not null references auth.users (id) on delete cascade,
  session_id  uuid not null references session (id) on delete cascade,
  spent_at    timestamptz not null default now(),
  -- Once per game per person. The unique key is what makes "the same game
  -- coming back costs nothing" true, the same way a webhook's event id does.
  primary key (user_id, session_id)
);

create index host_night_user_idx on host_night (user_id, spent_at desc);

comment on table host_night is
  'A Regular''s host night, spent the first time a game lands on them — opened or passed. One row per person per night, kept for ever.';

alter table host_night enable row level security;

create policy host_night_own_read on host_night
  for select to authenticated
  using (user_id = auth.uid());

grant select on host_night to authenticated;
-- Nobody inserts directly: `pass_night` and the session trigger do, as definer.

-- --- One account's membership --------------------------------------------------
-- The period is the person's own: the live Regular row's `starts_at`, stepped
-- forward a month at a time until it passes now(). Interval arithmetic clamps a
-- 31st to the month's last day, which is what a store does too.

create or replace function membership_of(target_user uuid, target_session uuid default null)
returns table (
  tier                   text,
  host_night_used        boolean,
  host_night_renews_on   timestamptz,
  spent_on_this          boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  best         record;
  period_start timestamptz;
  period_end   timestamptz;
  months       int;
begin
  if target_user is null then
    return query select 'free'::text, false, null::timestamptz, false;
    return;
  end if;

  select e.plan, e.starts_at, e.ends_at into best
    from entitlement e
   where e.user_id = target_user
     and e.revoked_at is null
     and e.starts_at <= now()
     and (e.ends_at is null or e.ends_at > now())
   order by case e.plan when 'club' then 0 when 'pro' then 1 else 2 end,
            e.ends_at desc nulls first
   limit 1;

  if best.plan is null then
    return query select 'free'::text, false, null::timestamptz, false;
    return;
  end if;

  if best.plan in ('pro', 'club') then
    return query select 'full'::text, false, null::timestamptz, false;
    return;
  end if;

  -- Regular. Whole months since the plan started, so the period containing
  -- now() is [start + n months, start + n+1 months).
  months := (extract(year from age(now(), best.starts_at)) * 12
             + extract(month from age(now(), best.starts_at)))::int;
  period_start := best.starts_at + make_interval(months => months);
  if period_start > now() then
    months := months - 1;
    period_start := best.starts_at + make_interval(months => months);
  end if;
  period_end := best.starts_at + make_interval(months => months + 1);
  -- A plan that ends before the period does renews when it ends, if at all.
  if best.ends_at is not null and best.ends_at < period_end then
    period_end := best.ends_at;
  end if;

  return query
    select 'regular'::text,
           exists (select 1 from host_night h
                    where h.user_id = target_user
                      and h.spent_at >= period_start
                      and h.spent_at <  period_end),
           period_end,
           target_session is not null
             and exists (select 1 from host_night h
                          where h.user_id = target_user and h.session_id = target_session);
end;
$$;

revoke execute on function membership_of(uuid, uuid) from public;

-- Spend it, for a Regular, once. A no-op for everybody else and for a game
-- that already landed on them. Callers check `can_take_game` first.
create or replace function spend_host_night(target_user uuid, target_session uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if (select m.tier from membership_of(target_user, target_session) m) = 'regular' then
    insert into host_night (user_id, session_id)
    values (target_user, target_session)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function spend_host_night(uuid, uuid) from public;

-- --- The readers the app calls ------------------------------------------------

create or replace function my_membership(target_session uuid default null)
returns table (
  tier                   text,
  host_night_used        boolean,
  host_night_renews_on   timestamptz,
  spent_on_this          boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select * from membership_of(auth.uid(), target_session);
$$;

grant execute on function my_membership(uuid) to authenticated;

-- The roster's claimed seats, by player id, each with its account's
-- membership — to the book's host and to whoever is recording one of its
-- nights, and nobody else. Asked by id like `seatStatuses` (the phone never
-- learns a book's id). The owner's call (26 September): the admin sees each
-- person's tier at the moment of passing, and nowhere else. A member reading
-- GR4 gets no rows, and the app keeps drawing the seam's placeholder for them.
--
-- The host's own seat may have nobody on it (`claimed_by_user_id` null — B48)
-- and is then not here: the host's phone reads its own plan off
-- `my_membership()` for that row.
create or replace function roster_membership(player_ids uuid[], target_session uuid default null)
returns table (
  player_id              uuid,
  tier                   text,
  host_night_used        boolean,
  host_night_renews_on   timestamptz,
  spent_on_this          boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, m.tier, m.host_night_used, m.host_night_renews_on, m.spent_on_this
    from player p
    cross join lateral membership_of(p.claimed_by_user_id, target_session) m
   where p.id = any (player_ids)
     and p.removed_at is null
     and p.claimed_by_user_id is not null
     and (is_book_host(p.book_id)
          or holds_live_night(p.book_id)
          or (target_session is not null
              and session_book_id(target_session) = p.book_id
              and can_write_session(target_session)));
$$;

grant execute on function roster_membership(uuid[], uuid) to authenticated;

comment on function roster_membership(uuid[], uuid) is
  'Each claimed seat''s tier and host night, by player id, to the host or the phone recording a night of the book. The pass sheet and GR4 read it; a member gets no rows.';

-- --- The check at the top of pass_night ---------------------------------------
-- 0020's function, with the membership check it said would come, and the
-- spend in the same transaction as the move.

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
  m         record;
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
  if receiver is null then
    raise exception 'That name has no app to send the game to.';
  end if;
  if receiver = auth.uid() then
    raise exception 'The game is already on this phone.';
  end if;

  -- THE MEMBERSHIP CHECK. The sheet refuses these before asking (states 3 and
  -- 5); this is the floor under it, for a phone whose list was stale. ⚠ The
  -- three sentences are mine — the board has no server-refusal state.
  select * into m from membership_of(receiver, target_session_id);
  if m.tier = 'free' then
    raise exception 'That person is on Free and can’t run a game.';
  end if;
  if m.tier = 'regular' and m.host_night_used and not m.spent_on_this then
    raise exception 'That person has used their host night. It comes back on %.',
      to_char(m.host_night_renews_on, 'FMDD Mon');
  end if;

  perform spend_host_night(receiver, target_session_id);

  update night_handover
     set revoked_at = now()
   where session_id = target_session_id
     and redeemed_at is null
     and revoked_at is null;

  perform set_config('poker.handover', 'on', true);
  update session
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
  'Hand the night to a claimed player of its book. Refuses a name with nobody behind it, the caller''s own seat, a Free account, and a Regular whose host night is spent; spends a Regular''s host night as it moves the game.';

-- --- Opening a night spends it too --------------------------------------------
-- The phone gates O1 (states 13–15); this is the floor under that. A session
-- is inserted by the book's host, from the phone's queue, so the account
-- checked is the caller's. Off the API roles (the SQL editor, a test fixture —
-- 0018's `admin_caller_ok` draws the same line) there is nobody to charge and
-- nothing is checked; RLS already refuses the insert to anybody who is not the
-- host.

create or replace function session_open_spends_host_night()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if auth.uid() is null or current_setting('role') not in ('anon', 'authenticated') then
    return new;
  end if;
  select * into m from membership_of(auth.uid(), null);
  if m.tier = 'free' then
    raise exception 'host_night_gate: this account has no plan, and opening a game needs one.';
  end if;
  if m.tier = 'regular' and m.host_night_used then
    raise exception 'host_night_gate: this account''s host night is used until %.',
      to_char(m.host_night_renews_on, 'FMDD Mon');
  end if;
  if m.tier = 'regular' then
    insert into host_night (user_id, session_id) values (auth.uid(), new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger session_open_host_night
  after insert on session
  for each row execute function session_open_spends_host_night();
