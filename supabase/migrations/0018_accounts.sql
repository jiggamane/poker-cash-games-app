-- =============================================================================
-- Who may start a group, and what their account is entitled to
-- =============================================================================
-- Stage 1 of `docs/accounts-roadmap.md`, on the owner's answer of 25 September:
-- *a group can be started by anyone with the minimum paid plan and above.*
--
--   1. THE PLAN. One row per grant of a plan, from any source — a founder, a
--      comp given by hand, a promo code, and later a store purchase — and one
--      function, `my_plan()`, that reads the best live one.
--
--   2. THE PLAN IS THE HOST RIGHT. Until now the only thing standing between
--      the internet and a book of its own was `shouldCreateUser: false` in the
--      app — a word in a client, which anybody holding the public key can leave
--      out of their own request. The project has signups ON (anonymous sign-in,
--      which every watcher and every member needs, will not work otherwise), so
--      the real gate has to be here: a book can only be CREATED by an account
--      whose plan is not `free`. Only created — a book that exists keeps every
--      write it had, whatever happens to the plan afterwards, because a lapsed
--      subscription must never stop a night that is running
--      (`pricing-model.md` §7, rule 1).
--
-- Who has a plan the day this runs: everybody who could already sign in, as a
-- founder, for ever. A dashboard invite still makes a founder, so step 7 of
-- `auth-test-period.md` keeps working unchanged.
--
-- 0016 and 0017 are taken by the pass-the-book branch, which is parked, not
-- abandoned. This file does not touch anything that branch rewrites: it adds a
-- RESTRICTIVE insert policy on `book` beside `book_host_all` rather than
-- replacing it, and leaves every session policy alone.
-- =============================================================================

-- =============================================================================
-- Admins — you
-- =============================================================================
-- Seeded by hand, once, in the SQL editor:
--   insert into app_admin (user_id) select id from auth.users where email = '…';
-- Not seeded here: the address would be in a public repository.

create table app_admin (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  added_at   timestamptz not null default now()
);

alter table app_admin enable row level security;
-- No policies: nobody reads it directly. `am_i_admin()` answers for the caller.

create or replace function is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not is_anonymous_caller()
     and exists (select 1 from app_admin where user_id = auth.uid());
$$;

create or replace function am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_app_admin();
$$;

-- =============================================================================
-- The plan
-- =============================================================================

create table entitlement (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  plan           text not null check (plan in ('pro', 'club')),
  source         text not null check (source in ('founder', 'grant', 'promo', 'apple', 'google', 'web')),
  starts_at      timestamptz not null default now(),
  -- Null is forever. A founder and a hand comp are usually forever; a store
  -- subscription is its period end, pushed forward by each renewal.
  ends_at        timestamptz,
  granted_by     uuid references auth.users (id) on delete set null,
  promo_code_id  uuid,
  provider_ref   text,
  note           text,
  created_at     timestamptz not null default now(),
  -- A revoke is a timestamp, never a delete — same rule as the ledger's voids.
  revoked_at     timestamptz,

  constraint entitlement_period_is_forward check (ends_at is null or ends_at > starts_at)
);

create index entitlement_user_idx on entitlement (user_id);

-- One founder row per account. The thing that makes granting it idempotent.
create unique index entitlement_one_founder
  on entitlement (user_id) where source = 'founder';

comment on table entitlement is
  'One row per grant of a plan, from any source. my_plan() reads the best live row. Revoked, never deleted.';

alter table entitlement enable row level security;

create policy entitlement_own_read on entitlement
  for select to authenticated
  using (user_id = auth.uid());

grant select on entitlement to authenticated;

-- Every webhook a store or RevenueCat sends, kept whole. Nothing writes here
-- until Stage 4; the table is here so the unique key exists before the first
-- event does. Webhooks arrive twice, and the second must be a no-op.
create table billing_event (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null,
  provider_event_id  text not null,
  user_id            uuid references auth.users (id) on delete set null,
  type               text not null,
  payload            jsonb not null,
  received_at        timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table billing_event enable row level security;

-- =============================================================================
-- my_plan() — the only reader
-- =============================================================================
-- Club outranks pro; among equals, the one that lasts longest (forever first).
-- `free` when nothing is live. The app asks this and nothing else — never a
-- store, never RevenueCat.

create or replace function my_plan()
returns table (plan text, source text, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(best.plan, 'free'), best.source, best.ends_at
    from (select 1) one
    left join lateral (
      select e.plan, e.source, e.ends_at
        from entitlement e
       where e.user_id = auth.uid()
         and e.revoked_at is null
         and e.starts_at <= now()
         and (e.ends_at is null or e.ends_at > now())
       order by case e.plan when 'club' then 0 else 1 end,
                e.ends_at desc nulls first
       limit 1
    ) best on true;
$$;

-- =============================================================================
-- Founders, and the gate on starting a group
-- =============================================================================

-- The one place a founder's plan is given. Until there is a price everybody
-- who may start a group is a founder, and the day that stops being true is one
-- edit to this function.
create or replace function grant_founder(target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  insert into entitlement (user_id, plan, source, note)
  values (target, 'pro', 'founder', 'here before there was a price')
  on conflict (user_id) where source = 'founder' do nothing;
end;
$$;

revoke execute on function grant_founder(uuid) from public;

-- Everybody already in keeps what they had. `email is not null` is the
-- difference between an account somebody signs into and an anonymous watcher.
select grant_founder(u.id)
  from auth.users u
 where u.email is not null
    or exists (select 1 from book b where b.host_user_id = u.id);

-- A dashboard invite is still a way in. `invited_at` is set by an invite and by
-- nothing else — a signup made by calling the API with `create_user` left on
-- has no invite, and gets no plan.
create or replace function founder_on_dashboard_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invited_at is not null and new.email is not null then
    perform grant_founder(new.id);
  end if;
  return new;
end;
$$;

create trigger auth_user_dashboard_invite
  after insert on auth.users
  for each row execute function founder_on_dashboard_invite();

create or replace function can_start_group()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select plan from my_plan()) <> 'free';
$$;

-- RESTRICTIVE, so it narrows `book_host_all` for inserts and changes nothing
-- else it allows. `book_host_all` still refuses an anonymous account, so a plan
-- bought or redeemed on one waits for its email before it opens a group.
create policy book_insert_needs_plan on book
  as restrictive
  for insert to authenticated
  with check (can_start_group());

-- =============================================================================
-- Promo codes
-- =============================================================================

create table promo_code (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  plan             text not null check (plan in ('pro', 'club')),
  -- Null is forever.
  grants_days      int check (grants_days is null or grants_days > 0),
  max_redemptions  int not null default 1 check (max_redemptions > 0),
  redeemed_count   int not null default 0,
  expires_at       timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  note             text,
  revoked_at       timestamptz,
  constraint promo_code_count_in_range check (redeemed_count between 0 and max_redemptions)
);

create table promo_redemption (
  promo_code_id  uuid not null references promo_code (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  redeemed_at    timestamptz not null default now(),
  primary key (promo_code_id, user_id)
);

alter table promo_code enable row level security;
alter table promo_redemption enable row level security;

alter table entitlement
  add constraint entitlement_promo_code_fk
  foreign key (promo_code_id) references promo_code (id) on delete set null;

-- AN ANONYMOUS CALLER MAY REDEEM, and that is the ordinary case: it is how
-- somebody new gets in. The phone signs in anonymously, spends the code, then
-- attaches an email with `updateUser` — and the user id, with the plan on it,
-- is the same one throughout. What that costs: a code spent on a phone that
-- then never confirms its email is a plan on an account nobody can get back
-- into. Cheap at a dozen friends; revisit when codes go to strangers.
create or replace function redeem_promo_code(code text)
returns table (plan text, ends_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller  uuid := auth.uid();
  promo   promo_code;
  until   timestamptz;
begin
  if caller is null then
    raise exception 'Sign in first — a code has to belong to somebody.';
  end if;

  select * into promo
    from promo_code p
   where upper(trim(p.code)) = upper(trim(redeem_promo_code.code))
     and p.revoked_at is null
     and (p.expires_at is null or p.expires_at > now())
     and p.redeemed_count < p.max_redemptions
   for update;

  if promo.id is null then
    raise exception 'That code does not open anything.';
  end if;

  if exists (select 1 from promo_redemption r
              where r.promo_code_id = promo.id and r.user_id = caller) then
    raise exception 'That code has already been used on this account.';
  end if;

  until := case when promo.grants_days is null then null
                else now() + make_interval(days => promo.grants_days) end;

  insert into promo_redemption (promo_code_id, user_id) values (promo.id, caller);
  update promo_code set redeemed_count = redeemed_count + 1 where id = promo.id;
  insert into entitlement (user_id, plan, source, ends_at, promo_code_id, note)
  values (caller, promo.plan, 'promo', until, promo.id, promo.note);

  return query select promo.plan, until;
end;
$$;

-- Whether a code would open anything, asked BEFORE anything is spent. The
-- sign-in sheet asks this first, then attaches the email, then redeems: in that
-- order a mistyped code costs a retype, not an email and a half-made account.
-- It says no more than redeeming would, and is one bit.
create or replace function promo_code_opens(code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from promo_code p
     where upper(trim(p.code)) = upper(trim(promo_code_opens.code))
       and p.revoked_at is null
       and (p.expires_at is null or p.expires_at > now())
       and p.redeemed_count < p.max_redemptions);
$$;

-- =============================================================================
-- The admin's tools — callable from the SQL editor until Settings → Admin exists
-- =============================================================================
-- In the SQL editor you are `postgres` with no role set and no JWT, so
-- `is_app_admin()` is false there. Each of these therefore also lets through a
-- session that has not SET ROLE to one of the two API roles: that is the
-- dashboard. Every request through the API runs as `anon` or `authenticated`
-- (PostgREST sets the role before the query), and those are refused unless the
-- caller is in `app_admin`.
--
-- `current_setting('role')` and not `current_user`: inside a SECURITY DEFINER
-- function `current_user` is the owner, while the role setting is still the
-- one the request was made as.

create or replace function admin_caller_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_app_admin()
      or current_setting('role') not in ('anon', 'authenticated');
$$;

revoke execute on function admin_caller_ok() from public;

create or replace function admin_grant(
  email text, plan text default 'pro', days int default null, note text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target  uuid;
  made    uuid;
begin
  if not admin_caller_ok() then
    raise exception 'Only an admin can grant a plan.';
  end if;

  select u.id into target from auth.users u where lower(u.email) = lower(trim(admin_grant.email));
  if target is null then
    raise exception 'No account has the address %.', admin_grant.email;
  end if;

  insert into entitlement (user_id, plan, source, ends_at, granted_by, note)
  values (target, admin_grant.plan, 'grant',
          case when days is null then null else now() + make_interval(days => days) end,
          auth.uid(), admin_grant.note)
  returning id into made;
  return made;
end;
$$;

create or replace function admin_revoke(target_entitlement uuid, note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not admin_caller_ok() then
    raise exception 'Only an admin can revoke a plan.';
  end if;
  update entitlement
     set revoked_at = now(),
         note = coalesce(admin_revoke.note, entitlement.note)
   where id = target_entitlement and revoked_at is null;
end;
$$;

-- The code maker takes an optional code, so a friend can be given `FRIDAY`
-- rather than ten random characters. A random one uses `new_invite_code`, the
-- same alphabet a player invite uses — no 0/O, 1/I/L or U.

create or replace function admin_create_promo(
  plan text default 'pro', grants_days int default null, max_redemptions int default 1,
  code text default null, days int default null, note text default null)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  made text := upper(trim(coalesce(admin_create_promo.code, new_invite_code())));
begin
  if not admin_caller_ok() then
    raise exception 'Only an admin can make a promo code.';
  end if;
  insert into promo_code (code, plan, grants_days, max_redemptions, expires_at, created_by, note)
  values (made, admin_create_promo.plan, admin_create_promo.grants_days,
          admin_create_promo.max_redemptions,
          case when days is null then null else now() + make_interval(days => days) end,
          auth.uid(), admin_create_promo.note);
  return made;
end;
$$;
