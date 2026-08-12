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
