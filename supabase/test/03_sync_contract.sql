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

insert into session (id, book_id, default_buyin, seat_count, started_at, stakes, status)
values ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
        500, 6, '2026-08-13T20:05:00Z', '$5 / $5', 'live');

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
   discrepancy_note, discrepancy_absorbed_by, frozen)
values
  ('c4000000-0000-0000-0000-000000000001', 'settlement-v1', '[]'::jsonb, '{}'::jsonb,
   '[{"fromPlayerId":"x","toPlayerId":"y","amount":320}]'::jsonb,
   212, 0, null, null, null, null, true)
on conflict (session_id) do nothing;

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

reset role;
reset request.jwt.claims;

\o

\echo '--------------------------------------------------'
\echo ' SYNC CONTRACT HOLDS'
\echo '--------------------------------------------------'
