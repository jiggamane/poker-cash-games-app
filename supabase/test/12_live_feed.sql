-- =============================================================================
-- The live feed — 0019, B95
-- =============================================================================
-- Every table the watch screen reads must be on the `supabase_realtime`
-- publication, or a change to it never reaches a watcher until something else
-- happens to. KEEP IN STEP with WATCH_FEED in apps/mobile/src/lib/watchNight.ts
-- — `watchFeed.test.ts` fails if that list names a table no migration
-- publishes; this fails if a fully migrated database does not have it.
--
-- Run with: npm run db:verify
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

do $$
declare
  t text;
  missing text[] := '{}';
begin
  foreach t in array array[
    'ledger_entry', 'session', 'session_seat', 'final_count', 'player', 'money_rule',
    'settlement', 'transfer_payment'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      missing := missing || t;
    end if;
  end loop;

  if array_length(missing, 1) > 0 then
    raise exception 'TEST FAILED: not on the live feed — %', array_to_string(missing, ', ');
  end if;
end;
$$;

select '--------------------------------------------------' as " ";
select 'LIVE FEED TESTS PASSED' as " ";
select '--------------------------------------------------' as " ";
