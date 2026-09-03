-- =============================================================================
-- The Poker Club — what has actually been applied to this project?
-- =============================================================================
-- READ-ONLY. Paste the whole file into the Supabase SQL Editor and run it.
-- It writes nothing, locks nothing, and is safe on a live project.
--
-- One row per migration in supabase/migrations/, plus four rows for the things
-- that are not a migration but break the app just as completely. Every row says
-- either `ok` or exactly which file to run next.
--
-- Each probe looks for something that migration is the ONLY source of, so a
-- half-applied file shows up as missing rather than as applied.
--
-- Regenerate the file list with:  ls supabase/migrations/
-- Last checked against migrations 0001–0013.
-- =============================================================================

with c as (
  select table_name, column_name, column_default
    from information_schema.columns
   where table_schema = 'public'
),
p as (
  select pr.proname, pr.oid, pr.proacl
    from pg_proc pr
    join pg_namespace n on n.oid = pr.pronamespace
   where n.nspname = 'public'
),
probe as (
  select
    -- 0001 the eight tables, the append-only trigger, the policies
    (to_regclass('public.ledger_entry') is not null
     and exists (select 1 from pg_trigger where tgname = 'ledger_entry_no_update')) as m01,

    -- 0002 the close gate: a shortfall exists only if somebody signed for it
    (exists (select 1 from c where table_name = 'settlement'
                               and column_name = 'discrepancy_amount')
     and exists (select 1 from pg_constraint
                  where conname = 'settlement_discrepancy_is_confirmed')) as m02,

    -- 0003 rule_split rewritten, rounding_mode on the book
    (exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
              where t.typname = 'rule_split' and e.enumlabel = 'by_percent')
     and exists (select 1 from c where table_name = 'book'
                                   and column_name = 'rounding_mode')) as m03,

    -- 0004 spends: who covered it, and which group of them
    exists (select 1 from c where table_name = 'ledger_entry'
                              and column_name = 'spend_group') as m04,

    -- 0005 watcher access: the grant table and the JWT hook
    (to_regclass('public.share_grant') is not null
     and exists (select 1 from p where proname = 'custom_access_token_hook')
     and exists (select 1 from p where proname = 'redeem_share_token')) as m05,

    -- 0006 sync contract: the unique index on rule order became a plain one
    (exists (select 1 from pg_indexes where schemaname = 'public'
                                        and indexname = 'money_rule_order_idx')
     and not exists (select 1 from pg_indexes where schemaname = 'public'
                                        and indexname = 'money_rule_order_unique')) as m06,

    -- 0007 player identity: invites, and the member read policies
    (to_regclass('public.player_invite') is not null
     and exists (select 1 from p where proname = 'redeem_player_invite')
     and exists (select 1 from pg_policies where schemaname = 'public'
                                             and policyname = 'book_member_read')) as m07,

    -- 0008 verification: the audit verdict on a settled night
    exists (select 1 from c where table_name = 'settlement'
                              and column_name = 'verification') as m08,

    -- 0009 invite privacy: every refusal padded to the same floor
    (exists (select 1 from p where proname = 'pad_refusal')
     and exists (select 1 from p where proname = 'invite_refusal_floor')) as m09,

    -- 0010 night_header: the header a watcher is allowed to read
    exists (select 1 from p where proname = 'night_header') as m10,

    -- 0011 preview shows the host's name as well
    exists (select 1 from p where proname = 'preview_player_invite'
                              and pg_get_function_result(oid) like '%host_name%') as m11,

    -- 0012 a per-player code lasts a month; revoke resets the seat
    exists (select 1 from c where table_name = 'player_invite'
                              and column_name = 'expires_at'
                              and column_default like '%mon%') as m12,

    -- 0013 the night carries its own rounding, and night_header hands it out
    (exists (select 1 from c where table_name = 'session'
                               and column_name = 'rounding_mode')
     and exists (select 1 from p where proname = 'night_header'
                                   and pg_get_function_result(oid) like '%rounding_mode%')) as m13,

    -- not a migration, but the app is broken without them
    (select count(*) from information_schema.tables
      where table_schema = 'public'
        and table_name in ('book','player','session','session_seat','ledger_entry',
                           'money_rule','final_count','settlement','share_grant',
                           'player_invite')) = 10 as tables_ok,

    not exists (select 1 from pg_tables
                 where schemaname = 'public' and not rowsecurity) as rls_ok,

    exists (select 1 from p where proname = 'custom_access_token_hook'
                              and array_to_string(proacl, ',') like '%supabase_auth_admin=X%') as hook_grant_ok
)
select v.n,
       v.item,
       case when v.n = 93 then 'by hand'
            when v.ok    then 'ok'
            else              'MISSING' end as state,
       v.fix
  from probe x,
  lateral (values
    ( 1, '0001 schema, append-only ledger, policies', x.m01, 'run supabase/migrations/0001_init.sql'),
    ( 2, '0002 close gate',                           x.m02, 'run supabase/migrations/0002_close_gate.sql'),
    ( 3, '0003 split rules, rounding, due kind',      x.m03, 'run supabase/migrations/0003_split_rules.sql'),
    ( 4, '0004 spends',                               x.m04, 'run supabase/migrations/0004_spends.sql'),
    ( 5, '0005 watcher access + JWT hook',            x.m05, 'run supabase/migrations/0005_watcher_access.sql'),
    ( 6, '0006 sync contract fixes',                  x.m06, 'run supabase/migrations/0006_sync_contract_fixes.sql'),
    ( 7, '0007 player identity + member reads',       x.m07, 'run supabase/migrations/0007_player_identity.sql'),
    ( 8, '0008 verification column',                  x.m08, 'run supabase/migrations/0008_verification.sql'),
    ( 9, '0009 invite privacy (timing floor)',        x.m09, 'run supabase/migrations/0009_invite_privacy.sql'),
    (10, '0010 night_header',                         x.m10, 'run supabase/migrations/0010_night_header.sql'),
    (11, '0011 preview shows the host',               x.m11, 'run supabase/migrations/0011_preview_host.sql'),
    (12, '0012 invite lifetime + seat reset',         x.m12, 'run supabase/migrations/0012_invite_lifetime_and_reset.sql'),
    (13, '0013 the night carries its rounding',       x.m13, 'run supabase/migrations/0013_night_rounding.sql'),
    (90, 'all ten tables present',                    x.tables_ok,     'a migration above is missing — fix those first'),
    (91, 'row-level security on every public table',  x.rls_ok,        'STOP. Some table is readable by anyone. Do not put real money in this project until it is fixed.'),
    (92, 'JWT hook executable by supabase_auth_admin', x.hook_grant_ok, 'run supabase/migrations/0005_watcher_access.sql'),
    (93, 'CHECK BY HAND — Auth > Hooks > Customize Access Token > public.custom_access_token_hook, and Auth > Sign In/Providers > Anonymous sign-ins', false, 'neither toggle is visible from SQL. See docs/auth-test-period.md steps 2 and 3.')
  ) as v(n, item, ok, fix)
 where not v.ok or v.n < 90
 order by v.n;
