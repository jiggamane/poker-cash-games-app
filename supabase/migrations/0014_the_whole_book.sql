-- =============================================================================
-- The rest of what the phone knows
-- =============================================================================
-- `docs/storage-and-sync.md` says the server is the record and the phone is a
-- write-ahead log. That was true of the money and of nothing else. Six things
-- the app collects had no column anywhere on the server to land in, so they
-- lived on one device and were lost with it:
--
--   1. WHAT THE GROUP IS SET UP AS. `book` carries a name, a currency GLYPH and
--      a rounding mode. The phone's club carries an ISO code, a default buy-in
--      and the blinds — the three settings GR7 actually writes — and none of
--      them had anywhere to go. A host who reinstalls gets their nights back
--      (0007 saw to that) and their group's settings back at the app defaults,
--      which is worse than an empty screen: it looks right and is not.
--
--   2. WHICH TABLE IS WHICH. A club can run two nights at once and `night`
--      grew `table_name` for exactly that, so the two cards on Home can be told
--      apart. The server had one name for the group and none for the table, so
--      a pulled night comes back called "Tonight" — including the one that is
--      not.
--
--   3. WHO IS ON THE ROSTER, AND ON WHAT TERMS. Removing somebody keeps every
--      night they played and stops them being offered a seat; `pays_kitty` is
--      the same kind of standing answer about one person. Both were flags on
--      `club_member` and nowhere else, so the second phone to read the book
--      seats people the admin took off it a month ago.
--
--   4. WHO HAS ACTUALLY PAID. E7 is a screen in this app: the host taps a name
--      when the cash arrives, over the week after the night. It has always been
--      stored — `night_payment` — and it has never left the phone. See the note
--      on the table below for why storing it does not contradict principle 4.
--
-- Nothing here changes a figure. Every column is nullable or defaulted, so
-- every row already on a project stays exactly as it is, and a phone that never
-- sends any of it is a phone that behaves as it does today.

-- --- 1. The group's own settings ---------------------------------------------
-- `currency_symbol` is a GLYPH ('$', 'CHF', 'zł') and stays what it is: the
-- watcher's page renders with it and nothing on the phone writes it. The club
-- stores an ISO 4217 CODE, which is a different fact — 'USD' and '$' are not
-- interchangeable, and four countries' dollars share the glyph. So the code
-- gets its own column rather than being crammed into the symbol's.

alter table book
  add column currency_code text,
  add column default_buyin bigint,
  add column stakes        text;

alter table book
  add constraint book_currency_code_is_iso
    check (currency_code is null or currency_code ~ '^[A-Z]{3}$');

alter table book
  add constraint book_default_buyin_positive
    check (default_buyin is null or default_buyin > 0);

comment on column book.currency_code is
  'ISO 4217, three upper-case letters. What the group KEEPS ITS BOOK IN, which is the fact the phone stores; currency_symbol is the glyph drawn in front of a figure. Null on every book written before the phone had anywhere to send it.';
comment on column book.default_buyin is
  'What a new night is offered, in whole currency units. The GROUP''s standing answer — a night copies it at birth and settles with its own copy, so changing this never touches a game already played.';
comment on column book.stakes is
  'The blinds and the straddle, as the phone''s Stakes value serialised. Text rather than three columns because it is one setting: a row holding a small blind and no big one is not a state the app has words for.';

-- --- 2. Which table this is --------------------------------------------------
-- Null reads as "Tonight", which is what every night recorded before tables had
-- names was called and still is.

alter table session
  add column table_name text;

comment on column session.table_name is
  'What this table is called, when a group runs two at once. The group''s name is not enough to tell them apart and it is the only thing that does. Null reads as "Tonight".';

-- --- 3. The roster's standing answers ----------------------------------------
-- REMOVING IS NOT DELETING, and the column shape says so: a removed player
-- keeps their id, their name and every entry that points at them. All the flag
-- does is stop them being offered a seat. That is why it is a timestamp and not
-- a delete — `docs/storage-and-sync.md` is explicit that the book keeps the row
-- every night still points at.

alter table player
  add column pays_kitty boolean not null default true,
  add column removed_at timestamptz;

comment on column player.pays_kitty is
  'Whether this person is charged the group''s kitty rule. A standing answer about one player, set on the member screen. True is the answer for almost everybody, which is why it is the default.';
comment on column player.removed_at is
  'When the admin took this person off the roster, or null. They keep every night they played and every entry that names them; this only stops them being offered a seat. Never a delete: the ledger still points here.';

-- --- 4. Who has handed over the money ----------------------------------------
-- WHY THIS DOES NOT CONTRADICT PRINCIPLE 4.
--
-- "The settlement is guidance, not a workflow" is a statement about the
-- FIGURES: a night is final the moment it is counted, deducted and settled, and
-- nothing about payment can move a single number afterwards. That still holds,
-- and this table cannot break it — it is not read by `settle()`, it is not in
-- any snapshot, and a night with every row here and a night with none of them
-- settle identically.
--
-- What was actually being argued in that principle is that the app does not
-- CHASE anybody. It does not. But the host taps these ticks on E7 today, they
-- are the answer to "who still owes me", and they were being kept in one
-- device's SQLite where a reinstall took them. Recording a fact the app already
-- collects is not a workflow; losing it is just a bug with a principle in front
-- of it.
--
-- Keyed on the pair, exactly as the phone is, and safe for the same reason: the
-- settlement gives any debtor and creditor at most one transfer between them,
-- because paying somebody either finishes the debtor or empties the creditor.
--
-- A tick GOES BOTH WAYS — B21 — so un-ticking deletes the row. That is why this
-- table takes a DELETE policy where the ledger never does: it carries one fact,
-- the time of a tap, and it is the tap that was wrong.

create table transfer_payment (
  session_id      uuid not null references session (id) on delete cascade,
  from_player_id  uuid not null references player (id) on delete restrict,
  to_player_id    uuid not null references player (id) on delete restrict,
  paid_at         timestamptz not null,
  created_at      timestamptz not null default now(),

  primary key (session_id, from_player_id, to_player_id),

  constraint transfer_payment_not_to_self
    check (from_player_id <> to_player_id)
);

create index transfer_payment_session_idx on transfer_payment (session_id);

comment on table transfer_payment is
  'Who has actually handed over the money, per settled transfer. Changes no figure and is read by nothing in packages/core: a night settles the same with every row here and with none. It is the E7 ticks, kept somewhere other than one phone.';

alter table transfer_payment enable row level security;

create policy transfer_payment_host_all on transfer_payment
  for all to authenticated
  using (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)))
  with check (exists (select 1 from session s where s.id = session_id and is_book_host(s.book_id)));

create policy transfer_payment_member_read on transfer_payment
  for select to authenticated
  using (is_book_member(session_book_id(session_id)));

create policy transfer_payment_watcher_read on transfer_payment
  for select to authenticated, anon
  using (session_id = watcher_session_id());

grant select, insert, update, delete on transfer_payment to authenticated;
grant select                        on transfer_payment to anon;
