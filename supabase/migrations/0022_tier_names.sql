-- =============================================================================
-- One set of names: Free, Regular, Full — on the server as on the phone
-- =============================================================================
-- Owner, 27 October: "lets unify them — Free, Regular, Full."
--
-- Until now the server spoke a different language from every screen. 0018
-- stored an account's plan as `pro` or `club`, 0021 added `regular` beside
-- them and translated pro and club into "full" on the way out, and the phone
-- translated again for the Settings row. Two words for one thing is how a
-- grant gets made with the wrong one from the SQL editor, and how a document
-- written next month says "Pro" about somebody every screen calls Full.
--
-- So the stored values become the names: `regular` and `full`. No plan is
-- still the absence of a row, and reads `free`. Every `pro` and `club` row
-- becomes `full` — a rename, not a change of what anybody holds: both already
-- read as Full everywhere since 0021. Nothing is revoked, re-dated or
-- re-sourced; a founder is still a founder.
--
-- `club` meant one thing 0018 never built — a plan for a whole group
-- (`accounts-roadmap.md` Stage 5). If that is ever built it is a new thing
-- with a new name, held on a book rather than a person, and not a fourth
-- value here.
--
-- WHAT CHANGES, in order:
--   1. the two check constraints, and the rows, on `entitlement` and
--      `promo_code`
--   2. `my_plan()` — returns free / regular / full
--   3. `membership_of()` — reads `full` directly
--   4. `grant_founder()` — gives `full`
--   5. `admin_grant()` and `admin_create_promo()` — default to `full`
-- Nothing on the phone reads `pro` or `club` after this; the app moves in the
-- same commit.
-- =============================================================================

-- --- 1. The stored values -------------------------------------------------------

alter table entitlement drop constraint entitlement_plan_check;
update entitlement set plan = 'full' where plan in ('pro', 'club');
alter table entitlement
  add constraint entitlement_plan_check check (plan in ('regular', 'full'));

alter table promo_code drop constraint promo_code_plan_check;
update promo_code set plan = 'full' where plan in ('pro', 'club');
alter table promo_code
  add constraint promo_code_plan_check check (plan in ('regular', 'full'));

-- --- 2. The one reader ------------------------------------------------------------
-- Full over Regular; among equals, the one that lasts longest (forever first).

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
       order by case e.plan when 'full' then 0 else 1 end,
                e.ends_at desc nulls first
       limit 1
    ) best on true;
$$;

-- --- 3. Membership, with nothing left to translate --------------------------------

create or replace function membership_of(target_user uuid, target_session uuid default null)
returns table (
  tier                   text,
  host_night_used        boolean,
  host_night_renews_on   timestamptz,
  spent_on_this          boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  best         record;
  period_start timestamptz;
  period_end   timestamptz;
  months       int;
begin
  if target_user is null then
    return query select 'free'::text, false, null::timestamptz, false;
    return;
  end if;

  select e.plan, e.starts_at, e.ends_at into best
    from entitlement e
   where e.user_id = target_user
     and e.revoked_at is null
     and e.starts_at <= now()
     and (e.ends_at is null or e.ends_at > now())
   order by case e.plan when 'full' then 0 else 1 end,
            e.ends_at desc nulls first
   limit 1;

  if best.plan is null then
    return query select 'free'::text, false, null::timestamptz, false;
    return;
  end if;

  if best.plan = 'full' then
    return query select 'full'::text, false, null::timestamptz, false;
    return;
  end if;

  -- Regular. Whole months since the plan started, so the period containing
  -- now() is [start + n months, start + n+1 months).
  months := (extract(year from age(now(), best.starts_at)) * 12
             + extract(month from age(now(), best.starts_at)))::int;
  period_start := best.starts_at + make_interval(months => months);
  if period_start > now() then
    months := months - 1;
    period_start := best.starts_at + make_interval(months => months);
  end if;
  period_end := best.starts_at + make_interval(months => months + 1);
  if best.ends_at is not null and best.ends_at < period_end then
    period_end := best.ends_at;
  end if;

  return query
    select 'regular'::text,
           exists (select 1 from host_night h
                    where h.user_id = target_user
                      and h.spent_at >= period_start
                      and h.spent_at <  period_end),
           period_end,
           target_session is not null
             and exists (select 1 from host_night h
                          where h.user_id = target_user and h.session_id = target_session);
end;
$$;

-- --- 4. Founders are Full ---------------------------------------------------------

create or replace function grant_founder(target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  insert into entitlement (user_id, plan, source, note)
  values (target, 'full', 'founder', 'here before there was a price')
  on conflict (user_id) where source = 'founder' do nothing;
end;
$$;

-- --- 5. The admin's tools default to Full ------------------------------------------

create or replace function admin_grant(
  email text, plan text default 'full', days int default null, note text default null)
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

create or replace function admin_create_promo(
  plan text default 'full', grants_days int default null, max_redemptions int default 1,
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

-- --- And nothing left behind ------------------------------------------------------

do $$
begin
  if exists (select 1 from entitlement where plan not in ('regular', 'full'))
     or exists (select 1 from promo_code where plan not in ('regular', 'full')) then
    raise exception '0022: a plan row still carries an old name';
  end if;
end;
$$;
