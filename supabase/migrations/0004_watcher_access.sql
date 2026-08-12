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
