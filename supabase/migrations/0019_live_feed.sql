-- =============================================================================
-- Every table a watcher's screen reads, on the live feed — B95
-- =============================================================================
-- The watch screen (X1, `apps/mobile/src/lib/watchNight.ts`) re-reads the night
-- whenever Supabase Realtime says a row it depends on changed. Realtime only
-- says so for tables in the `supabase_realtime` publication, and 0001 added
-- three: ledger_entry, session, session_seat. The screen reads six. Counting a
-- stack (final_count), a guest joining (player), a rule changed mid-game
-- (money_rule) — none of them reached a watcher until something else happened
-- to.
--
-- Realtime still goes through row-level security for inserts and updates, so
-- publishing a table shows a watcher nothing the policies do not already let
-- them read (the *_watcher_read policies in 0001).
--
-- Settlement and the payment ticks are published too. The watch screen does not
-- read them today, and a night's status moving to settled already arrives
-- through `session`; they are here so the next screen that shows either — E7 on
-- a member's phone — is live the day it is built, rather than rediscovering this.
--
-- DELETES. A count cleared by a cash-out, and an un-ticked payment, are
-- deletes. Realtime cannot apply a filter or a policy to a row that no longer
-- exists, so the app listens for deletes on those tables unfiltered and simply
-- re-reads; the event carries only the deleted row's key. REPLICA IDENTITY FULL
-- is not needed for that and is not set.
--
-- Idempotent, and guarded like 0001, so it runs on a plain Postgres too.
-- =============================================================================

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach t in array array[
    'ledger_entry', 'session', 'session_seat',        -- 0001, restated so this
                                                      -- list is the whole feed
    'final_count', 'player', 'money_rule',
    'settlement', 'transfer_payment'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
