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
  email text
);

-- Mirrors Supabase: reads the current request's JWT claims, which the test
-- harness sets with `set local request.jwt.claims = '...'`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
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
