-- =============================================================================
-- Local test shim — NOT part of the real migrations, never runs on Supabase.
-- =============================================================================
-- Supabase hosts provide the `auth` schema, the `anon`/`authenticated` roles,
-- and auth.uid()/auth.jwt() for us. A bare Postgres container does not, so this
-- file recreates just enough of them to prove the migration's DDL is valid.
--
-- Used by `npm run db:verify`.
-- =============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  -- Set by a dashboard invite and by nothing else. DEFAULTED HERE, and only
  -- here. Until 0028 an invite made a founder, and the suites before 11 leaned
  -- on that for their hosts' plans; since 0028 an invite is Free, and each of
  -- those suites gives its invited hosts a plan by hand, keyed on this column.
  invited_at timestamptz default now()
);

-- Mirrors Supabase: reads the current request's JWT claims, which the test
-- harness sets with `set local request.jwt.claims = '...'`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  -- Written as Supabase writes it: an unset claim is null, not a JSON error.
  -- 0018's admin functions are called from the SQL editor, where there is no
  -- JWT at all, and the old `''::jsonb` here failed where Supabase does not.
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''
  )::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  -- The role Supabase's auth server runs as. 0004 grants it the access-token
  -- hook and a read of share_grant, so the migration needs it to exist here too.
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin;
  end if;
end;
$$;

-- Supabase's realtime publication. Created here so the migrations' guarded
-- `alter publication supabase_realtime add table …` blocks actually run under
-- `db:verify`, and `12_live_feed.sql` can assert what is on the feed.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

-- Supabase's default privileges: every function, table and sequence made in
-- `public` is granted to `anon` and `authenticated` BY NAME. So a migration's
-- `revoke … from public` does not close a function on a real project — it has
-- to name the two roles. Without this the local database was more private
-- than the real one, and B108 (`release_seat` callable by anybody) passed
-- db:verify on the day it went live.
alter default privileges in schema public grant execute on functions to anon, authenticated;
