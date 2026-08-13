-- =============================================================================
-- The Poker Club — complete schema
-- =============================================================================
-- GENERATED FILE. Do not edit.
--   Regenerate with:  npm run db:bundle
--   Source of truth:  supabase/migrations/*.sql
--
-- Every migration, concatenated in order, so a fresh project can be set up in
-- one paste. Run this ONCE in the Supabase SQL Editor.
--
-- Applying it twice will fail on "type already exists" — that is correct
-- behaviour, not a problem to work around. If you need to change the schema
-- later, add a new numbered migration and run only that.
-- =============================================================================


-- ===== 0001_init.sql =============================================

-- =============================================================================
-- The Poker Club — initial schema
-- =============================================================================
-- Design rules this file enforces (see docs/build-plan.md §2 and §5):
--
--   1. ALL MONEY IS BIGINT, in whole currency units. No cents, no floats,
--      no NUMERIC. If you ever find yourself reaching for a decimal type here,
--      something has gone wrong upstream.
--   2. THE LEDGER IS APPEND-ONLY. ledger_entry rows are INSERTed and never
--      UPDATEd or DELETEd. A mistake is fixed by inserting a correction that
--      points back at the original, so history stays complete and visible.
--      This is enforced three ways: revoked privileges, a blocking trigger,
--      and the absence of any UPDATE/DELETE row-level policy.
--   3. AUTHORIZATION LIVES IN THE DATABASE. The host writes; watchers read a
--      single session via a scoped token claim. Never rely on the app hiding
--      a button.
-- =============================================================================

-- A hosted Supabase project already has an `extensions` schema with pgcrypto in
-- it, so both of these are no-ops there. On a bare Postgres neither exists yet,
-- hence creating the schema first. Functions below put both schemas on their
-- search_path so gen_random_bytes resolves either way.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- =============================================================================
-- Enumerated types
-- =============================================================================

create type book_status    as enum ('open', 'closed');
create type session_status as enum ('setup', 'live', 'counting', 'settled');

-- buyin/rebuy/cashout/expense are money events.
-- correction restates a previous entry's amount; void cancels one to zero.
create type entry_type as enum
  ('buyin', 'rebuy', 'cashout', 'expense', 'correction', 'void');

create type rule_amount_kind as enum ('percent', 'fixed');
create type rule_basis       as enum ('gross', 'net_after_others');
create type rule_charge      as enum ('winners_only', 'everyone_flat');
create type rule_destination as enum ('bill', 'kitty', 'host_fee', 'next_pot');
create type rule_split       as enum ('equal', 'by_win_size', 'across_everyone');

-- =============================================================================
-- Helper: unguessable share tokens
-- =============================================================================
-- 24 random bytes -> 32 url-safe characters, no padding.

create or replace function new_share_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
$$;

-- =============================================================================
-- book — a group's ledger, opened once and closed manually by the host
-- =============================================================================

create table book (
  id                uuid primary key default gen_random_uuid(),
  host_user_id      uuid not null references auth.users (id) on delete restrict,
  group_name        text not null check (length(trim(group_name)) > 0),
  currency_symbol   text not null default '$',
  status            book_status not null default 'open',
  opened_at         timestamptz not null default now(),
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),

  -- closed_at is set exactly when the book is closed, never otherwise
  constraint book_closed_at_matches_status
    check ((status = 'closed') = (closed_at is not null))
);

create index book_host_idx on book (host_user_id);

-- =============================================================================
-- player — a NAME on a book, not an account
-- =============================================================================
-- The host types "Petr" and a row appears. No invite, no email, no signup.
-- claimed_by_user_id is the v2 hook for a player linking their own account;
-- leaving the column here now means v2 needs no migration.
-- A collector is an ordinary player row that a rule names as its payee — they
-- need not ever sit at a table.

create table player (
  id                  uuid primary key default gen_random_uuid(),
  book_id             uuid not null references book (id) on delete cascade,
  display_name        text not null check (length(trim(display_name)) > 0),
  claimed_by_user_id  uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- One "Petr" per book, however it was capitalised
create unique index player_unique_name_per_book
  on player (book_id, lower(trim(display_name)));

create index player_book_idx on player (book_id);

-- =============================================================================
-- session — one night
-- =============================================================================

create table session (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references book (id) on delete cascade,
  stakes         text,
  default_buyin  bigint not null check (default_buyin > 0),
  seat_count     int    not null check (seat_count > 0 and seat_count <= 30),
  status         session_status not null default 'setup',
  started_at     timestamptz not null,
  ended_at       timestamptz,
  -- the watcher's credential: unguessable, per-session, revocable
  share_token    text not null unique default new_share_token(),
  created_at     timestamptz not null default now(),

  constraint session_ended_at_matches_status
    check ((status = 'settled') = (ended_at is not null))
);

create index session_book_idx on session (book_id);
create index session_share_token_idx on session (share_token);

-- =============================================================================
-- session_seat — who is at THIS table
-- =============================================================================
-- left_at is set when a player cashes out and leaves.

create table session_seat (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references session (id) on delete cascade,
  player_id   uuid not null references player (id) on delete restrict,
  seated_at   timestamptz not null default now(),
  left_at     timestamptz,

  unique (session_id, player_id)
);

create index session_seat_session_idx on session_seat (session_id);

-- =============================================================================
-- ledger_entry — THE APPEND-ONLY RECORD OF MONEY
-- =============================================================================
-- id is generated by the CLIENT so that a retry after a dropped connection
-- collapses to the same row (idempotency key). seq is the host's local
-- monotonic counter, giving a stable order independent of arrival time.
--
-- occurred_at is when the money moved (the host can back-date it).
-- created_at is when the row was actually written. Both are kept: the feed
-- shows one, the audit trail needs the other.

create table ledger_entry (
  id                 uuid primary key,
  session_id         uuid not null references session (id) on delete cascade,
  seq                int  not null,
  type               entry_type not null,

  -- the player the money concerns (buy-in/rebuy/cash-out)
  player_id          uuid references player (id) on delete restrict,
  -- who fronted a shared expense
  payer_id           uuid references player (id) on delete restrict,

  amount             bigint not null check (amount >= 0),
  note               text,

  occurred_at        timestamptz not null,
  created_at         timestamptz not null default now(),

  -- set on correction/void: the entry being restated
  corrects_entry_id  uuid references ledger_entry (id) on delete restrict,

  created_by_user_id uuid not null default auth.uid(),

  unique (session_id, seq),

  -- Each entry type has a different shape, and the database enforces it.
  constraint ledger_entry_shape check (
    case type
      when 'buyin'   then player_id is not null and payer_id is null
                          and amount > 0 and corrects_entry_id is null
      when 'rebuy'   then player_id is not null and payer_id is null
                          and amount > 0 and corrects_entry_id is null
      when 'cashout' then player_id is not null and payer_id is null
                          and corrects_entry_id is null
      when 'expense' then payer_id  is not null and player_id is null
                          and amount > 0 and corrects_entry_id is null
      -- a correction restates an amount; the original stays in the table
      when 'correction' then corrects_entry_id is not null
      -- a void cancels an entry to nothing
      when 'void'       then corrects_entry_id is not null and amount = 0
    end
  )
);

create index ledger_entry_session_seq_idx on ledger_entry (session_id, seq);
create index ledger_entry_player_idx      on ledger_entry (player_id);
create index ledger_entry_corrects_idx    on ledger_entry (corrects_entry_id);

-- --- Append-only enforcement -------------------------------------------------
-- Belt and braces: privileges are revoked below, and this trigger makes an
-- UPDATE or DELETE fail loudly even if someone connects as a wider role.

create or replace function ledger_entry_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'ledger_entry is append-only: % is not permitted. Insert a correction or void entry instead.',
    tg_op;
end;
$$;

create trigger ledger_entry_no_update
  before update on ledger_entry
  for each statement execute function ledger_entry_is_append_only();

create trigger ledger_entry_no_delete
  before delete on ledger_entry
  for each statement execute function ledger_entry_is_append_only();

-- =============================================================================
-- money_rule — what comes off the table at settle-up (never during play)
-- =============================================================================
-- For percent rules, `amount` is a whole percent (10 means 10%).
-- For fixed rules, `amount` is whole currency units.
-- Rules apply in sort_order, which is what makes 'net_after_others' well-defined
-- and the whole settlement reproducible.

create table money_rule (
  id                   uuid primary key default gen_random_uuid(),
  book_id              uuid not null references book (id) on delete cascade,
  name                 text not null check (length(trim(name)) > 0),
  active               boolean not null default true,

  amount_kind          rule_amount_kind not null,
  amount               bigint not null check (amount > 0),
  basis                rule_basis       not null,
  charge               rule_charge      not null,
  destination          rule_destination not null,
  split                rule_split       not null,

  -- exactly one person physically holds this money; need not be playing
  collector_player_id  uuid not null references player (id) on delete restrict,

  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),

  constraint money_rule_percent_in_range
    check (amount_kind <> 'percent' or amount between 1 and 100)
);

create index money_rule_book_idx on money_rule (book_id, sort_order);

-- =============================================================================
-- final_count — the host's end-of-night chip count
-- =============================================================================
-- Only for players still seated. Anyone who cashed out keeps what they left
-- with. The app blocks settlement until counted chips reconcile exactly.

create table final_count (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references session (id) on delete cascade,
  player_id      uuid not null references player (id) on delete restrict,
  counted_chips  bigint not null check (counted_chips >= 0),
  created_at     timestamptz not null default now(),

  unique (session_id, player_id)
);

-- =============================================================================
-- settlement — the frozen, auditable result of the night's math
-- =============================================================================
-- Snapshots the exact rules and inputs alongside the output, plus the version
-- of the algorithm that produced it. Re-running that version against
-- inputs_snapshot must reproduce computed_transfers exactly — that is what
-- "reproducible and auditable" means in practice.
--
-- computed_transfers is what the app calculated.
-- final_transfers is what the room agreed, if they overrode it.
-- Both are kept. Neither is ever overwritten by the other.

create table settlement (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null unique references session (id) on delete cascade,

  algorithm_version   text not null,
  rules_snapshot      jsonb not null,
  inputs_snapshot     jsonb not null,
  computed_transfers  jsonb not null,
  final_transfers     jsonb,

  total_off_table     bigint not null check (total_off_table >= 0),
  computed_at         timestamptz not null default now(),
  frozen              boolean not null default true
);

-- =============================================================================
-- Authorization helpers
-- =============================================================================
-- SECURITY DEFINER so a policy can check book ownership without the caller
-- needing to read the book table directly (which would recurse through RLS).

create or replace function is_book_host(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from book
    where book.id = target_book_id
      and book.host_user_id = auth.uid()
  );
$$;

-- A watcher's token is exchanged (by an edge function) for a scoped JWT
-- carrying share_session_id. Reading it from the JWT — rather than from a
-- request header — means the SAME rule governs REST reads and realtime
-- websocket subscriptions.

create or replace function watcher_session_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'share_session_id', '')::uuid;
$$;

-- Can the caller read this session? Either they host its book, or they hold a
-- watcher token scoped to it.
create or replace function can_read_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_session_id = watcher_session_id()
    or exists (
      select 1 from session s
      where s.id = target_session_id
        and is_book_host(s.book_id)
    );
$$;

-- The book behind the caller's watcher token, if any.
create or replace function watcher_book_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.book_id from session s where s.id = watcher_session_id();
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table book          enable row level security;
alter table player        enable row level security;
alter table session       enable row level security;
alter table session_seat  enable row level security;
alter table ledger_entry  enable row level security;
alter table money_rule    enable row level security;
alter table final_count   enable row level security;
alter table settlement    enable row level security;

-- --- book --------------------------------------------------------------------
create policy book_host_all on book
  for all to authenticated
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

-- --- player ------------------------------------------------------------------
create policy player_host_all on player
  for all to authenticated
  using (is_book_host(book_id))
  with check (is_book_host(book_id));

create policy player_watcher_read on player
  for select to authenticated, anon
  using (book_id = watcher_book_id());

-- --- session -----------------------------------------------------------------
create policy session_host_all on session
  for all to authenticated
  using (is_book_host(book_id))
  with check (is_book_host(book_id));

create policy session_watcher_read on session
  for select to authenticated, anon
  using (id = watcher_session_id());

-- --- session_seat ------------------------------------------------------------
create policy session_seat_host_all on session_seat
  for all to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)))
  with check (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy session_seat_watcher_read on session_seat
  for select to authenticated, anon
  using (session_id = watcher_session_id());

-- --- ledger_entry ------------------------------------------------------------
-- NOTE: only SELECT and INSERT policies exist. There is deliberately no
-- UPDATE or DELETE policy, because the ledger is append-only.

create policy ledger_entry_read on ledger_entry
  for select to authenticated, anon
  using (can_read_session(session_id));

create policy ledger_entry_host_insert on ledger_entry
  for insert to authenticated
  with check (
    exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id))
  );

-- --- money_rule --------------------------------------------------------------
create policy money_rule_host_all on money_rule
  for all to authenticated
  using (is_book_host(book_id))
  with check (is_book_host(book_id));

create policy money_rule_watcher_read on money_rule
  for select to authenticated, anon
  using (book_id = watcher_book_id());

-- --- final_count -------------------------------------------------------------
create policy final_count_host_all on final_count
  for all to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)))
  with check (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy final_count_watcher_read on final_count
  for select to authenticated, anon
  using (session_id = watcher_session_id());

-- --- settlement --------------------------------------------------------------
create policy settlement_host_all on settlement
  for all to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)))
  with check (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy settlement_watcher_read on settlement
  for select to authenticated, anon
  using (session_id = watcher_session_id());

-- =============================================================================
-- Privileges
-- =============================================================================
-- RLS decides WHICH rows; these decide WHICH VERBS are possible at all.
-- ledger_entry never gets UPDATE or DELETE, by anyone, ever.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on book, player, session, session_seat, money_rule, final_count, settlement
  to authenticated;

grant select on
  book, player, session, session_seat, money_rule, final_count, settlement
  to anon;

grant select, insert on ledger_entry to authenticated;
grant select            on ledger_entry to anon;
revoke update, delete   on ledger_entry from authenticated, anon;

-- =============================================================================
-- Realtime
-- =============================================================================
-- Watchers subscribe to the ledger of the session they hold a token for.
-- Wrapped in a guard so this migration also runs on a plain Postgres without
-- Supabase's realtime publication.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table ledger_entry;
    alter publication supabase_realtime add table session;
    alter publication supabase_realtime add table session_seat;
  end if;
end;
$$;

-- ===== 0002_close_gate.sql =============================================

-- =============================================================================
-- The close gate
-- =============================================================================
-- A night may be settled only if the money balances, OR if the host looked at
-- the exact shortfall and confirmed it. This is enforced in three places, on
-- purpose: the UI shows the mismatch live and blocks the button, the settlement
-- engine refuses to compute, and the database refuses to store. The first two
-- can be bypassed by a stale client; this one cannot.
-- =============================================================================

alter table settlement
  -- counted − expected, signed. Negative means money is missing, positive means
  -- there is more on the table than the ledger accounts for. Zero is a night
  -- that balanced, which is the overwhelmingly common case.
  add column discrepancy_amount        bigint not null default 0,
  add column discrepancy_confirmed_by  uuid references auth.users (id) on delete restrict,
  add column discrepancy_confirmed_at  timestamptz,
  add column discrepancy_note          text;

-- A discrepancy exists if and only if somebody put their name to it. This is
-- the rule that stops missing money being recorded quietly, and it is why the
-- confirmation is stored rather than being a transient UI acknowledgement.
alter table settlement
  add constraint settlement_discrepancy_is_confirmed check (
    (discrepancy_amount = 0
      and discrepancy_confirmed_by is null
      and discrepancy_confirmed_at is null)
    or
    (discrepancy_amount <> 0
      and discrepancy_confirmed_by is not null
      and discrepancy_confirmed_at is not null)
  );

comment on column settlement.discrepancy_amount is
  'Counted chips minus the money the ledger says is on the table. Non-zero only with a recorded host confirmation.';

-- A night that has been settled cannot quietly become unsettled, and a frozen
-- settlement's numbers must not move. Corrections are made by adding ledger
-- entries and re-settling, exactly like the ledger itself.
create or replace function settlement_is_immutable_once_frozen()
returns trigger
language plpgsql
as $$
begin
  if old.frozen then
    -- The room is allowed to redistribute who physically pays whom; nothing
    -- else about a frozen settlement may change.
    if new.computed_transfers is distinct from old.computed_transfers
       or new.inputs_snapshot   is distinct from old.inputs_snapshot
       or new.rules_snapshot    is distinct from old.rules_snapshot
       or new.total_off_table   is distinct from old.total_off_table
       or new.algorithm_version is distinct from old.algorithm_version
       or new.discrepancy_amount is distinct from old.discrepancy_amount then
      raise exception
        'This settlement is frozen. Add a correcting ledger entry and settle again rather than editing it.';
    end if;
  end if;
  return new;
end;
$$;

create trigger settlement_frozen_guard
  before update on settlement
  for each row execute function settlement_is_immutable_once_frozen();

-- ===== 0003_split_rules.sql =============================================

-- =============================================================================
-- Money rules, as re-specified by the 12 August handoff
-- =============================================================================
--   M1  bill splits become by_percent / evenly / custom
--   M2  one person covering a bill is a custom split with one non-zero row
--   M3  a percentage may only ever be charged to winners
--   M5  rule order is host-editable
--   M7  rounding granularity is a group rule, now including 1k
--   M7b settlement due — a reminder, never an automatic settlement
-- =============================================================================

-- --- M1/M2: the split values ------------------------------------------------
-- `across_everyone` is gone rather than renamed: it duplicated
-- charge = 'everyone_flat', and two settings competing to decide who pays is
-- how a rule ends up meaning something nobody intended. Existing rows carrying
-- it become an even split, with `charge` left to say who pays.

alter type rule_split rename to rule_split_old;
create type rule_split as enum ('by_percent', 'evenly', 'custom');

alter table money_rule
  alter column split drop default,
  alter column split type rule_split using (
    case split::text
      when 'by_win_size'     then 'by_percent'
      when 'equal'           then 'evenly'
      when 'across_everyone' then 'evenly'
      else 'evenly'
    end::rule_split
  );

drop type rule_split_old;

-- Per-person amounts, only for a custom split. Stored as jsonb rather than a
-- child table: it is written and read whole, always alongside its rule, and
-- never queried across rules.
alter table money_rule
  add column custom_shares jsonb;

alter table money_rule
  add constraint money_rule_custom_shares_match_split check (
    (split = 'custom' and custom_shares is not null)
    or (split <> 'custom' and custom_shares is null)
  );

comment on column money_rule.custom_shares is
  'Only when split = custom: [{"playerId":uuid,"amount":int}]. Must sum to the rule''s resolved amount — for a bill, to the real expense total. Enforced in the settlement engine, which is the only thing that knows the expense total.';

-- --- M3: a percentage is a cut of a win, so only winners can pay it ---------
alter table money_rule
  add constraint money_rule_percent_charges_winners check (
    amount_kind <> 'percent' or charge = 'winners_only'
  );

-- --- M7: rounding granularity, now including 1k -----------------------------
create type rounding_mode as enum
  ('cents', 'dollars', 'tens', 'fifties', 'hundreds', 'thousands');

alter table book
  add column rounding_mode rounding_mode;

comment on column book.rounding_mode is
  'Null means dollars. This changes what people actually pay, so it belongs in the rules snapshot a night settles with — it is not a display setting. cents additionally requires amounts in minor units, which is not built.';

-- --- M7b: settlement due ----------------------------------------------------
-- A reminder only. Nothing in the database or the engine settles a night
-- because a date passed; this exists so the app can nudge.

create type settlement_due_kind as enum
  ('same_night', 'after_days', 'weeks_end', 'months_end');

alter table book
  add column settlement_due_kind      settlement_due_kind not null default 'same_night',
  add column settlement_due_days      int,
  add column settlement_due_next_working_day boolean not null default false,
  -- a night may override the group's default
  add constraint book_settlement_due_days_present check (
    (settlement_due_kind = 'after_days' and settlement_due_days is not null and settlement_due_days > 0)
    or (settlement_due_kind <> 'after_days' and settlement_due_days is null)
  );

alter table session
  add column settlement_due_kind      settlement_due_kind,
  add column settlement_due_days      int,
  add column settlement_due_next_working_day boolean,
  add column settlement_due_at        timestamptz;

comment on column session.settlement_due_kind is
  'Null means inherit the group''s rule. settlement_due_at is the resolved date, computed when the night opens so the reminder does not shift if the group rule changes later.';

-- --- M5: rule order is host-editable ----------------------------------------
-- sortOrder was always stored; it is now user-writable and shown in the list,
-- so ties would surface as rules silently swapping places.
create unique index money_rule_order_unique
  on money_rule (book_id, sort_order);

-- --- E5: what happens to money that is missing -------------------------------
-- Two ways to close a short night, both legitimate:
--
--   RECORD  — the gap is confirmed and noted, nobody is assigned it, and the
--             payouts get adjusted by hand afterwards. This is the default.
--   ABSORB  — somebody takes it on the spot: a player, or whoever holds the
--             kitty. Available, but never the automatic choice; the app must
--             not decide on its own that the kitty eats a shortfall.
alter table settlement
  add column discrepancy_absorbed_by uuid references player (id) on delete restrict;

alter table settlement
  add constraint settlement_absorber_needs_a_discrepancy check (
    discrepancy_absorbed_by is null or discrepancy_amount <> 0
  );

comment on column settlement.discrepancy_absorbed_by is
  'Null means the gap was recorded but left unassigned — the note explains it and the payouts are adjusted by hand. Set means this person took it at settle-up.';

-- ===== 0004_watcher_access.sql =============================================

-- =============================================================================
-- The watcher's credential
-- =============================================================================
-- 0001 built the read side of this and left the write side unbuilt: every
-- *_watcher_read policy asks watcher_session_id(), which reads a
-- `share_session_id` claim out of the caller's JWT, and nothing yet puts that
-- claim there. The build plan's answer was an edge function that mints a
-- custom-signed token. This file does the same job entirely inside Postgres:
--
--   1. The watcher signs in ANONYMOUSLY. Supabase issues them a real user and a
--      real JWT with no email, no password and no sign-up.
--   2. They call redeem_share_token() with the token from the link. It records
--      a row in share_grant — the only way such a row can ever be created.
--   3. custom_access_token_hook() runs whenever a token is issued for them and
--      stamps their live grant into the JWT as share_session_id.
--
-- The claim ends up in exactly the place 0001 already expects, which matters
-- for one specific reason: a claim inside the JWT governs the realtime
-- websocket as well as ordinary REST reads. A token passed in a header would
-- have authorized only the latter, and a watcher who cannot subscribe is a
-- watcher who cannot watch.
--
-- No edge function, no signing key, and the service_role key stays out of it.
-- =============================================================================

-- =============================================================================
-- share_grant — one watcher, one night
-- =============================================================================
-- Written only by redeem_share_token (below); the table carries no INSERT
-- privilege for anybody, so possession of a valid token is the only route in.
-- Revoking is an UPDATE the host may make, never a delete, so "this phone was
-- let in on the 4th and cut off on the 11th" stays legible afterwards.

create table share_grant (
  user_id     uuid not null references auth.users (id) on delete cascade,
  session_id  uuid not null references session (id) on delete cascade,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  primary key (user_id, session_id)
);

-- The hook reads this on every token issue and refresh, so it is the one query
-- here that has to stay cheap.
create index share_grant_live_idx
  on share_grant (user_id, granted_at desc)
  where revoked_at is null;

create index share_grant_session_idx on share_grant (session_id);

comment on table share_grant is
  'A watcher device that redeemed a session''s share link. Created only by redeem_share_token; revoked by the host.';

-- =============================================================================
-- Redeeming a link
-- =============================================================================
-- SECURITY DEFINER because the caller cannot see the session they are asking
-- about — that is the entire point of the token. It looks up by share_token and
-- nothing else, so the token alone decides, and a caller who guesses wrong
-- learns nothing beyond "no".

create or replace function redeem_share_token(token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  watcher uuid := auth.uid();
  target  uuid;
begin
  if watcher is null then
    raise exception 'Sign in first — even a watcher needs a device identity to hold the grant.';
  end if;

  -- Only sessions in an open book. Closing the book ends the room's access to
  -- it, which is what a host means by closing a book.
  select s.id into target
  from session s
  join book b on b.id = s.book_id
  where s.share_token = redeem_share_token.token
    and b.status = 'open';

  if target is null then
    -- Deliberately one message for "no such token" and "book is closed": a
    -- stranger holding a guess should not be able to tell those apart.
    raise exception 'That link does not open anything.';
  end if;

  insert into share_grant (user_id, session_id)
  values (watcher, target)
  on conflict (user_id, session_id) do update
    set granted_at = now(),
        revoked_at = null;

  return target;
end;
$$;

comment on function redeem_share_token(text) is
  'Exchange a session share link for a read-only grant. The new claim reaches the JWT on the next token refresh.';

-- =============================================================================
-- Revoking
-- =============================================================================
-- Rotating the token as well as revoking the grants is what makes this final —
-- revoking alone would leave every watcher free to redeem the same link again.
--
-- SECURITY DEFINER, with the ownership check written out in full rather than
-- left to the policies. Rotation calls new_share_token(), which reaches into
-- the extensions schema for gen_random_bytes, and that is not reliably visible
-- to the caller's role. Since the check has to be explicit, it is the first
-- thing the function does and it fails closed.
--
-- One honest gap: a watcher's current access token keeps its claim until it
-- expires (an hour at most). Revocation stops the next refresh, not the current
-- token. For a home game that is the right trade; anything stricter means
-- checking a table on every read.

create or replace function revoke_share_access(target_session_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  owned boolean;
begin
  select is_book_host(s.book_id) into owned
  from session s
  where s.id = target_session_id;

  if not coalesce(owned, false) then
    raise exception 'That night is not yours to revoke.';
  end if;

  update share_grant
     set revoked_at = now()
   where session_id = target_session_id
     and revoked_at is null;

  update session
     set share_token = new_share_token()
   where id = target_session_id;
end;
$$;

comment on function revoke_share_access(uuid) is
  'Cut off every watcher of a night and rotate its link. Existing access tokens keep working until they expire.';

-- =============================================================================
-- The access token hook
-- =============================================================================
-- Supabase calls this each time it issues or refreshes a token, handing it the
-- user and the claims it is about to sign, and signs whatever comes back. It
-- must be enabled once in the dashboard: Authentication -> Hooks -> Customize
-- Access Token. Until it is, this function is inert and watchers read nothing —
-- see docs/auth-test-period.md.
--
-- The claim is a single session: the most recent live grant. A watcher opens
-- tonight's link and sees tonight. Reading back through old nights would need
-- an array claim and a rewrite of the policies in 0001, and no screen asks for
-- it yet.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  watched uuid;
  claims  jsonb := event -> 'claims';
begin
  select session_id into watched
  from share_grant
  where user_id = (event ->> 'user_id')::uuid
    and revoked_at is null
  order by granted_at desc
  limit 1;

  if watched is null then
    -- Strip rather than leave alone: a host who is not watching anything must
    -- never carry a stale claim, and nor must a watcher who has been cut off.
    claims := claims - 'share_session_id';
  else
    claims := jsonb_set(claims, '{share_session_id}', to_jsonb(watched::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Stamps the caller''s live share grant into their JWT so RLS and realtime both see it. Enabled in Authentication -> Hooks.';

-- Only the auth server may run the hook, and only it may read the table behind
-- the hook's back. Everyone else goes through the policies below.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant  execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant  usage   on schema public to supabase_auth_admin;
grant  select  on table share_grant to supabase_auth_admin;

-- =============================================================================
-- A watcher is not a host
-- =============================================================================
-- An anonymous user holds the `authenticated` role like anybody else, so
-- without this they could create a book of their own and write into it. Nobody
-- would see it, but it is still a stranger writing rows into the database, and
-- the test period is exactly when that gets discovered by accident.
--
-- Every host policy in 0001 except book's own routes through is_book_host, so
-- teaching that one function to refuse anonymous callers covers all of them.

create or replace function is_anonymous_caller()
returns boolean
language sql
stable
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous')::boolean,
    false
  );
$$;

create or replace function is_book_host(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not is_anonymous_caller() and exists (
    select 1 from book
    where book.id = target_book_id
      and book.host_user_id = auth.uid()
  );
$$;

drop policy book_host_all on book;

create policy book_host_all on book
  for all to authenticated
  using (host_user_id = auth.uid() and not is_anonymous_caller())
  with check (host_user_id = auth.uid() and not is_anonymous_caller());

-- =============================================================================
-- Row Level Security on the grants themselves
-- =============================================================================

alter table share_grant enable row level security;

-- A watcher can see that they were let in, and to what. Nothing else.
create policy share_grant_own_read on share_grant
  for select to authenticated
  using (user_id = auth.uid());

-- The host of the night can list its watchers and revoke them. INSERT is in the
-- policy for completeness but unreachable: the table grants no INSERT to anyone.
create policy share_grant_host_all on share_grant
  for all to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)))
  with check (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

-- The auth server, reading for the hook.
create policy share_grant_auth_admin_read on share_grant
  for select to supabase_auth_admin
  using (true);

-- No INSERT, by anyone. redeem_share_token is the only door.
grant select, update, delete on share_grant to authenticated;

-- ===== 0005_sync_contract_fixes.sql =============================================

-- =============================================================================
-- What replaying the app's own writes turned up
-- =============================================================================
-- `supabase/test/03_sync_contract.sql` sends exactly what the phone sends, in
-- the order it sends it, as the host. Two things in the schema turned out to be
-- reachable only by a caller with privileges the app does not have.
-- =============================================================================

-- --- Minting a share token ---------------------------------------------------
-- Every session row defaults share_token to new_share_token(), which reaches
-- into the extensions schema for gen_random_bytes. Whether the CALLER can see
-- that schema then decides whether a night can be created at all — and the app
-- inserts sessions as `authenticated`, not as the owner.
--
-- Hosted Supabase grants that usage, so this would probably have worked in
-- production and definitely not in any test. "Probably" is the wrong word for
-- the statement that opens a night: SECURITY DEFINER runs it as the function's
-- owner, so the token is minted the same way no matter who asks.

create or replace function new_share_token()
returns text
language sql
volatile
security definer
set search_path = public, extensions
as $$
  select replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
$$;

-- --- Rule order --------------------------------------------------------------
-- 0003 made (book_id, sort_order) unique so that a host reordering rules could
-- not leave two sharing a position.
--
-- The intent is right and the constraint is in the wrong place. Rules are held
-- PER NIGHT on the phone — a night is settled with the rules it opened with, so
-- each night carries its own copy — while money_rule is per BOOK. Any ordinary
-- act that gives a rule a new id at the same position (deleting one and adding
-- another in its place, or a rule carried forward from a night that predates
-- proper ids) collides with a row that is still holding that position for an
-- older night. The insert fails, and because the outbox halts at its first
-- failure, it takes the whole queue down with it — every subsequent night stops
-- reaching the server, silently.
--
-- The order is still meaningful and still shown; it is now the app's business
-- to keep it contiguous, which it can, rather than the database's to enforce
-- across nights that legitimately disagree.

drop index if exists money_rule_order_unique;

create index money_rule_order_idx on money_rule (book_id, sort_order);

comment on column money_rule.sort_order is
  'The order rules are applied and listed in. Not unique per book: nights carry their own copy of the rules, so two nights can hold the same position with different rows.';

-- ===== 0006_player_identity.sql =============================================

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
