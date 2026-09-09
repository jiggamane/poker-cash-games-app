-- =============================================================================
-- The sync contract
-- =============================================================================
-- Replays what the app actually sends, in the order it sends it, against the
-- real schema — as the host, through row-level security, exactly as the phone
-- would.
--
-- WHY THIS EXISTS. Every row in `apps/mobile/src/lib/syncRows.ts` was written by
-- reading the schema and had never once been executed against it. A wrong
-- column name, a stale enum value or a constraint nobody remembered means a
-- night that records perfectly on the phone and silently never leaves it — and
-- the only person who would find out is a host at 1am.
--
-- This cannot check auth or the network. It checks the half that fails first.
--
-- KEEP IN STEP with `syncRows.test.ts`, which asserts the same column sets from
-- the TypeScript side. If one changes, the other fails.
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

create or replace function expect_rejected(stmt text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute stmt;
  exception
    when others then
      return;
  end;
  raise exception 'TEST FAILED: % — statement was accepted but should have been rejected', label;
end;
$$;

create or replace function expect_eq(actual bigint, expected bigint, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'TEST FAILED: % — expected %, got %', label, expected, actual;
  end if;
end;
$$;

\o /dev/null

-- The host, and the ids the phone would have generated.
insert into auth.users (id, email) values
  ('c1000000-0000-0000-0000-000000000001', 'sync-host@example.com');

set role authenticated;
set request.jwt.claims = '{"sub":"c1000000-0000-0000-0000-000000000001"}';

-- =============================================================================
-- 1. OPENING A NIGHT — book, session, players, seats, rules
-- =============================================================================
-- In this order, because that is the order the queue drains in and the order
-- the foreign keys require.

insert into book (id, host_user_id, group_name)
values ('c2000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001', 'The poker club');

insert into player (id, book_id, display_name) values
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'Marek'),
  ('c3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'Dana'),
  ('c3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000001', 'Ivo');

insert into session (id, book_id, default_buyin, seat_count, started_at, stakes, status,
                    rounding_mode, table_name)
values ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
        500, 6, '2026-08-13T20:05:00Z', '$5 / $5', 'live', null, 'Tonight');

insert into session_seat (session_id, player_id) values
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001'),
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002'),
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003');

insert into money_rule
  (id, book_id, name, active, amount_kind, amount, basis, charge, destination, split,
   custom_shares, collector_player_id, sort_order)
values
  ('c5000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
   'Kitchen & drinks', true, 'fixed', 170, 'gross', 'winners_only', 'bill', 'by_percent',
   null, 'c3000000-0000-0000-0000-000000000001', 1),
  ('c5000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001',
   'Group kitty', true, 'percent', 5, 'gross', 'winners_only', 'kitty', 'evenly',
   null, 'c3000000-0000-0000-0000-000000000002', 2);

select expect_eq((select count(*) from session_seat), 3, 'three seats accepted');
select expect_eq((select count(*) from money_rule), 2, 'both rules accepted');

-- Every night mints its own link, as the host, without seeing the extensions
-- schema. This is what 0005 made SECURITY DEFINER — before it, opening a night
-- failed here rather than in production.
select expect_eq(
  (select count(*) from session
    where id = 'c4000000-0000-0000-0000-000000000001' and length(share_token) > 20),
  1, 'the session got a share token');

-- --- rules that take a new id at the same position --------------------------
-- Deleting a rule and adding another in its place, or carrying a rule forward
-- from a night that predates proper ids: a NEW row at an order some older row
-- still holds. Before 0005 this collided, failed, and halted the whole queue.
insert into money_rule
  (id, book_id, name, active, amount_kind, amount, basis, charge, destination, split,
   custom_shares, collector_player_id, sort_order)
values
  ('c5000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000001',
   'Kitchen & drinks', true, 'fixed', 200, 'gross', 'winners_only', 'bill', 'by_percent',
   null, 'c3000000-0000-0000-0000-000000000001', 1);

select expect_eq((select count(*) from money_rule where sort_order = 1), 2,
  'a rule can take a position an older night still holds');

-- An edit to a rule REPLACES it, unlike everything else the queue sends.
insert into money_rule
  (id, book_id, name, active, amount_kind, amount, basis, charge, destination, split,
   custom_shares, collector_player_id, sort_order)
values
  ('c5000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001',
   'Group kitty', true, 'percent', 10, 'gross', 'winners_only', 'kitty', 'evenly',
   null, 'c3000000-0000-0000-0000-000000000002', 2)
on conflict (id) do update set
  name = excluded.name, active = excluded.active, amount_kind = excluded.amount_kind,
  amount = excluded.amount, basis = excluded.basis, charge = excluded.charge,
  destination = excluded.destination, split = excluded.split,
  custom_shares = excluded.custom_shares, collector_player_id = excluded.collector_player_id,
  sort_order = excluded.sort_order;

select expect_eq(
  (select amount from money_rule where id = 'c5000000-0000-0000-0000-000000000002'),
  10, 'editing a rule updates it rather than adding a second');

-- --- the roster, between nights ---------------------------------------------
-- A player added on GR4 with no game running. There is no session behind this
-- one: a person belongs to the BOOK, and the roster is the group, not a night.
-- Until the queue carried these, somebody added between games reached the
-- server only if a later night happened to seat them.
insert into player (id, book_id, display_name)
values ('c3000000-0000-0000-0000-000000000004',
        'c2000000-0000-0000-0000-000000000001', 'Kuba')
on conflict (id) do update set display_name = excluded.display_name;

select expect_eq((select count(*) from player), 4,
  'a player added between nights reaches the book');

-- A rename REPLACES the name, unlike a night or an entry. GR5 wrote it to the
-- phone and nowhere else, and every member who pulled the book saw the old one.
insert into player (id, book_id, display_name)
values ('c3000000-0000-0000-0000-000000000004',
        'c2000000-0000-0000-0000-000000000001', 'Kuba N.')
on conflict (id) do update set display_name = excluded.display_name;

select expect_eq((select count(*) from player), 4, 'a rename does not add a second person');
select expect_eq(
  (select count(*) from player
    where id = 'c3000000-0000-0000-0000-000000000004' and display_name = 'Kuba N.'),
  1, 'a rename is what the book ends up holding');

-- Two people cannot share a name in one book: the ledger could not tell them
-- apart. The app refuses it on the way in; this is the backstop.
select expect_rejected(
  $$insert into player (id, book_id, display_name)
    values ('c3000000-0000-0000-0000-000000000005',
            'c2000000-0000-0000-0000-000000000001', '  kuba n. ')$$,
  'a second player with a name the book already holds');

-- =============================================================================
-- 2. THE MONEY — entries as the queue sends them
-- =============================================================================
-- created_by_user_id is deliberately absent: the app never sends it and the
-- column defaults to auth.uid(). If that default ever went away, this insert
-- would fail here rather than on somebody's phone.

insert into ledger_entry
  (id, session_id, seq, type, player_id, payer_id, amount, note, corrects_entry_id, occurred_at)
values
  ('c6000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   1, 'buyin', 'c3000000-0000-0000-0000-000000000001', null, 1000, null, null, '2026-08-13T20:07:00Z'),
  ('c6000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000001',
   2, 'buyin', 'c3000000-0000-0000-0000-000000000002', null, 500, null, null, '2026-08-13T20:09:00Z'),
  ('c6000000-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000001',
   3, 'buyin', 'c3000000-0000-0000-0000-000000000003', null, 1000, null, null, '2026-08-13T20:11:00Z'),
  -- an expense carries its note and a payer rather than a player
  ('c6000000-0000-0000-0000-000000000004', 'c4000000-0000-0000-0000-000000000001',
   4, 'expense', null, 'c3000000-0000-0000-0000-000000000001', 170, 'Pizza', null, '2026-08-13T21:48:00Z'),
  ('c6000000-0000-0000-0000-000000000005', 'c4000000-0000-0000-0000-000000000001',
   5, 'cashout', 'c3000000-0000-0000-0000-000000000002', null, 930, null, null, '2026-08-13T23:15:00Z');

-- The app never sends created_by_user_id; the column defaults to auth.uid().
-- If that default were ever dropped, this would fail here rather than on
-- somebody's phone.
select expect_eq(
  (select count(*) from ledger_entry
    where created_by_user_id = 'c1000000-0000-0000-0000-000000000001'),
  5, 'the host is recorded as the writer without the app saying so');

-- A correction points at the entry it restates.
insert into ledger_entry
  (id, session_id, seq, type, player_id, payer_id, amount, note, corrects_entry_id, occurred_at)
values
  ('c6000000-0000-0000-0000-000000000006', 'c4000000-0000-0000-0000-000000000001',
   6, 'correction', null, null, 900, null,
   'c6000000-0000-0000-0000-000000000003', '2026-08-13T23:20:00Z');

select expect_eq((select count(*) from ledger_entry), 6, 'every entry shape accepted');

-- Re-sending is a no-op, which is what makes "retry until it works" safe.
insert into ledger_entry
  (id, session_id, seq, type, player_id, payer_id, amount, note, corrects_entry_id, occurred_at)
values
  ('c6000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   1, 'buyin', 'c3000000-0000-0000-0000-000000000001', null, 1000, null, null, '2026-08-13T20:07:00Z')
on conflict (id) do nothing;

select expect_eq((select count(*) from ledger_entry), 6, 'a replayed entry does not duplicate');

-- --- The four shapes a spend has ---------------------------------------------
-- Until this block existed, every expense this file sent had a payer, which is
-- the one shape of four that 0001 already allowed. The other three arrived on
-- somebody's phone and were refused here, and because the queue drains in order
-- and halts at its first failure, the refused row stopped every entry behind it
-- as well. Nothing could see it: the app's column list, the test asserting that
-- column list, and this file all left `covered_by` out together.
--
-- The columns below are exactly what `entryRow` in syncRows.ts now sends. If
-- one is added there and not here, `syncRows.test.ts` fails and names this file.

insert into ledger_entry
  (id, session_id, seq, type, player_id, payer_id, amount, note,
   corrects_entry_id, occurred_at, covered_by, spend_group)
values
  -- the piggy bank paid, so nobody is owed anything back
  ('c6000000-0000-0000-0000-000000000007', 'c4000000-0000-0000-0000-000000000001',
   7, 'expense', null, null, 230, 'Beer', null, '2026-08-13T22:10:00Z', 'kitty', null),
  -- nobody has been named yet: it counts towards the bill and owes no one
  ('c6000000-0000-0000-0000-000000000008', 'c4000000-0000-0000-0000-000000000001',
   8, 'expense', null, null, 80, 'Taxi', null, '2026-08-13T22:40:00Z', 'unpaid', null),
  -- two people split the tab; one spend, one row each, tied by spend_group
  ('c6000000-0000-0000-0000-000000000009', 'c4000000-0000-0000-0000-000000000001',
   9, 'expense', null, 'c3000000-0000-0000-0000-000000000001', 60, 'Cake', null,
   '2026-08-13T22:55:00Z', null, 'c7000000-0000-0000-0000-000000000001'),
  ('c6000000-0000-0000-0000-00000000000a', 'c4000000-0000-0000-0000-000000000001',
   10, 'expense', null, 'c3000000-0000-0000-0000-000000000002', 40, 'Cake', null,
   '2026-08-13T22:56:00Z', null, 'c7000000-0000-0000-0000-000000000001');

select expect_eq((select count(*) from ledger_entry), 10, 'all four spend shapes accepted');

select expect_eq(
  (select count(*) from ledger_entry
    where spend_group = 'c7000000-0000-0000-0000-000000000001'),
  2, 'the two fronters of one spend are findable as one spend');

-- A spend says who is owed for it, and "nobody" is an answer that gets written
-- down. Both columns null is the shape the app used to send for a kitty spend.
select expect_rejected(
  $$insert into ledger_entry
      (id, session_id, seq, type, player_id, payer_id, amount, occurred_at, covered_by)
    values (gen_random_uuid(), 'c4000000-0000-0000-0000-000000000001', 95, 'expense',
            null, null, 100, '2026-08-13T23:00:00Z', null)$$,
  'a spend with neither a payer nor a cover');

-- And never both: a spend the kitty paid for cannot also owe a person.
select expect_rejected(
  $$insert into ledger_entry
      (id, session_id, seq, type, player_id, payer_id, amount, occurred_at, covered_by)
    values (gen_random_uuid(), 'c4000000-0000-0000-0000-000000000001', 96, 'expense',
            null, 'c3000000-0000-0000-0000-000000000001', 100, '2026-08-13T23:00:00Z',
            'kitty')$$,
  'a spend with both a payer and a cover');

-- =============================================================================
-- 3. COUNTING UP — one row per seated player, replaceable
-- =============================================================================

insert into final_count (session_id, player_id, counted_chips) values
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 1300),
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', 620)
on conflict (session_id, player_id) do update set counted_chips = excluded.counted_chips;

-- Counting somebody twice replaces the first count rather than adding to it.
insert into final_count (session_id, player_id, counted_chips)
values ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 1250)
on conflict (session_id, player_id) do update set counted_chips = excluded.counted_chips;

select expect_eq((select count(*) from final_count), 2, 'a recount replaces rather than adds');
select expect_eq(
  (select counted_chips from final_count
    where player_id = 'c3000000-0000-0000-0000-000000000001'),
  1250, 'the recount is what is stored');

-- =============================================================================
-- 4. CLOSING — the frozen settlement, then the session
-- =============================================================================

insert into settlement
  (session_id, algorithm_version, rules_snapshot, inputs_snapshot, computed_transfers,
   total_off_table, discrepancy_amount, discrepancy_confirmed_by, discrepancy_confirmed_at,
   discrepancy_note, discrepancy_absorbed_by, verification, frozen)
values
  ('c4000000-0000-0000-0000-000000000001', 'settlement-v1', '[]'::jsonb, '{}'::jsonb,
   '[{"fromPlayerId":"x","toPlayerId":"y","amount":320}]'::jsonb,
   212, 0, null, null, null, null,
   '{"ok":true,"checked":41,"algorithmVersion":"settlement-v1","codes":[],"detail":[],"at":"2026-08-14T00:15:00Z"}'::jsonb,
   true)
on conflict (session_id) do nothing;

-- The night's own verdict on its arithmetic arrives WITH the settlement, so a
-- night that failed its check cannot land on the server looking clean.
select expect_eq(
  (select count(*) from settlement where verification ->> 'ok' = 'true'),
  1, 'the settlement carries the verification verdict');

update session
   set status = 'settled', ended_at = '2026-08-14T00:15:00Z'
 where id = 'c4000000-0000-0000-0000-000000000001';

select expect_eq((select count(*) from settlement), 1, 'the settlement is accepted');
select expect_eq(
  (select count(*) from session
    where id = 'c4000000-0000-0000-0000-000000000001' and status = 'settled'),
  1, 'the session closes with an ended_at');

-- Frozen means frozen: the trigger refuses to let the figures move.
select expect_rejected(
  $$update settlement set total_off_table = 999
     where session_id = 'c4000000-0000-0000-0000-000000000001'$$,
  'restating a frozen settlement');

-- A replayed close is a no-op rather than a second settlement.
insert into settlement
  (session_id, algorithm_version, rules_snapshot, inputs_snapshot, computed_transfers,
   total_off_table, discrepancy_amount, frozen)
values
  ('c4000000-0000-0000-0000-000000000001', 'settlement-v1', '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
   999, 0, true)
on conflict (session_id) do nothing;

select expect_eq((select total_off_table from settlement), 212, 'a replayed close changes nothing');

-- =============================================================================
-- 6. WHAT THE GROUP AND THE NIGHT ARE SET UP AS
-- =============================================================================
-- Everything above this line is what HAPPENED. This is what it happened under,
-- and none of it left the phone until 0014 gave it somewhere to land: a group's
-- own settings, which table is which, who is still on the roster, and who has
-- since handed over the money.
--
-- Every one of these is a PATCH, replayed here exactly as `sync.ts` sends it —
-- an update against a row, never an upsert — so that a setting arriving before
-- the row it describes is a no-op rather than a refused insert at the head of
-- a queue that halts.

-- --- the group's own settings, from GR7 -------------------------------------
update book
   set group_name    = 'The poker club',
       currency_code = 'CHF',
       default_buyin = 500,
       stakes        = '{"small":5,"big":5}',
       rounding_mode = 'hundreds'
 where id = 'c2000000-0000-0000-0000-000000000001';

select expect_eq(
  (select count(*) from book
    where id = 'c2000000-0000-0000-0000-000000000001'
      and currency_code = 'CHF' and default_buyin = 500 and rounding_mode = 'hundreds'),
  1, 'the group''s settings reach the book');

-- The ISO code is checked, so a glyph in the wrong column is refused here
-- rather than read back as a currency nobody has.
select expect_rejected(
  $$update book set currency_code = 'CHF '
     where id = 'c2000000-0000-0000-0000-000000000001'$$,
  'a currency code that is not three upper-case letters');

-- --- a group renamed --------------------------------------------------------
-- The phone never learns a book's id, so `ensureBook` finds it by name and the
-- rename carries the old one with it. What matters here is only that the name
-- moves; `sync.ts` holds the lookup.
update book set group_name = 'Friday' where id = 'c2000000-0000-0000-0000-000000000001';
select expect_eq(
  (select count(*) from book where group_name = 'Friday'), 1, 'a group can be renamed');
update book set group_name = 'The poker club' where id = 'c2000000-0000-0000-0000-000000000001';

-- --- which table this is, and how far through it is --------------------------
-- A SECOND NIGHT, because the first is settled by now and a settled night is
-- exactly what these patches must never be sent for: its status, its ending and
-- its result are one operation, written at the close.
insert into session (id, book_id, default_buyin, seat_count, started_at, stakes, status,
                     rounding_mode, table_name)
values ('c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001',
        500, 4, '2026-08-20T20:00:00Z', '$5 / $5', 'live', null, 'Tonight');

update session set table_name = 'Main table'
 where id = 'c4000000-0000-0000-0000-000000000002';

select expect_eq(
  (select count(*) from session
    where id = 'c4000000-0000-0000-0000-000000000002' and table_name = 'Main table'),
  1, 'a table can be renamed when a second one opens');

update session set rounding_mode = 'tens'
 where id = 'c4000000-0000-0000-0000-000000000002';
select expect_eq(
  (select count(*) from session
    where id = 'c4000000-0000-0000-0000-000000000002' and rounding_mode = 'tens'),
  1, 'rounding changed mid-night reaches the server');

-- WITHOUT AN ended_at, which is the whole point of `sessionPatch` leaving that
-- column out: the server checks that a night has one exactly when it is
-- settled, so stamping it here would be a refused row at the head of the queue.
update session set status = 'counting' where id = 'c4000000-0000-0000-0000-000000000002';
select expect_eq(
  (select count(*) from session
    where id = 'c4000000-0000-0000-0000-000000000002' and status = 'counting'),
  1, 'a night can reach counting before it settles');

select expect_rejected(
  $$update session set ended_at = '2026-08-20T23:52:00Z'
     where id = 'c4000000-0000-0000-0000-000000000002'$$,
  'stamping the end on a night that is still counting');

-- --- the roster's standing answers ------------------------------------------
update player set pays_kitty = false, removed_at = null
 where id = 'c3000000-0000-0000-0000-000000000004';
select expect_eq(
  (select count(*) from player where pays_kitty = false), 1,
  'somebody who does not pay the kitty is recorded as such');

update player set pays_kitty = true, removed_at = '2026-09-09T18:00:00Z'
 where id = 'c3000000-0000-0000-0000-000000000004';
select expect_eq(
  (select count(*) from player where removed_at is not null), 1,
  'removing somebody keeps the row every night points at');

-- A patch against a player who is not there yet is a no-op, not an error. That
-- is why the terms are an update: the alternative halts the queue.
update player set pays_kitty = false
 where id = 'c3000000-0000-0000-0000-00000000ffff';

-- --- a rule the group deleted -----------------------------------------------
delete from money_rule where id = 'c5000000-0000-0000-0000-000000000003'
   and book_id = 'c2000000-0000-0000-0000-000000000001';
select expect_eq((select count(*) from money_rule), 2, 'a deleted rule leaves the book');

-- --- who has actually paid --------------------------------------------------
insert into transfer_payment (session_id, from_player_id, to_player_id, paid_at)
values ('c4000000-0000-0000-0000-000000000001',
        'c3000000-0000-0000-0000-000000000003',
        'c3000000-0000-0000-0000-000000000002', '2026-08-15T09:00:00Z')
on conflict (session_id, from_player_id, to_player_id) do update
  set paid_at = excluded.paid_at;

select expect_eq((select count(*) from transfer_payment), 1, 'a tick reaches the server');

-- Ticking again is the same tick, not a second one.
insert into transfer_payment (session_id, from_player_id, to_player_id, paid_at)
values ('c4000000-0000-0000-0000-000000000001',
        'c3000000-0000-0000-0000-000000000003',
        'c3000000-0000-0000-0000-000000000002', '2026-08-15T10:00:00Z')
on conflict (session_id, from_player_id, to_player_id) do update
  set paid_at = excluded.paid_at;
select expect_eq((select count(*) from transfer_payment), 1, 'ticking twice is one row');

-- Nobody pays themselves.
select expect_rejected(
  $$insert into transfer_payment (session_id, from_player_id, to_player_id, paid_at)
    values ('c4000000-0000-0000-0000-000000000001',
            'c3000000-0000-0000-0000-000000000002',
            'c3000000-0000-0000-0000-000000000002', '2026-08-15T09:00:00Z')$$,
  'a transfer from somebody to themselves');

-- THE DOOR GOES BOTH WAYS — B21. Un-ticking deletes the row, which is why this
-- is the one table besides the invites that takes a DELETE policy at all.
delete from transfer_payment
 where session_id = 'c4000000-0000-0000-0000-000000000001'
   and from_player_id = 'c3000000-0000-0000-0000-000000000003'
   and to_player_id = 'c3000000-0000-0000-0000-000000000002';
select expect_eq((select count(*) from transfer_payment), 0, 'a tick can be taken back');

reset role;
reset request.jwt.claims;

\o

\echo '--------------------------------------------------'
\echo ' SYNC CONTRACT HOLDS'
\echo '--------------------------------------------------'
