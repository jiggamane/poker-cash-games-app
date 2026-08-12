-- =============================================================================
-- Money rules, as re-specified by the 12 August handoff
-- =============================================================================
--   M1  bill splits become by_percent / evenly / custom
--   M2  one person covering a bill is a custom split with one non-zero row
--   M3  a percentage may only ever be charged to winners
--   M5  rule order is host-editable
--   M7  rounding granularity is a group rule, now including 1k
--   M7b settlement due — a reminder, never an automatic settlement
-- =============================================================================

-- --- M1/M2: the split values ------------------------------------------------
-- `across_everyone` is gone rather than renamed: it duplicated
-- charge = 'everyone_flat', and two settings competing to decide who pays is
-- how a rule ends up meaning something nobody intended. Existing rows carrying
-- it become an even split, with `charge` left to say who pays.

alter type rule_split rename to rule_split_old;
create type rule_split as enum ('by_percent', 'evenly', 'custom');

alter table money_rule
  alter column split drop default,
  alter column split type rule_split using (
    case split::text
      when 'by_win_size'     then 'by_percent'
      when 'equal'           then 'evenly'
      when 'across_everyone' then 'evenly'
      else 'evenly'
    end::rule_split
  );

drop type rule_split_old;

-- Per-person amounts, only for a custom split. Stored as jsonb rather than a
-- child table: it is written and read whole, always alongside its rule, and
-- never queried across rules.
alter table money_rule
  add column custom_shares jsonb;

alter table money_rule
  add constraint money_rule_custom_shares_match_split check (
    (split = 'custom' and custom_shares is not null)
    or (split <> 'custom' and custom_shares is null)
  );

comment on column money_rule.custom_shares is
  'Only when split = custom: [{"playerId":uuid,"amount":int}]. Must sum to the rule''s resolved amount — for a bill, to the real expense total. Enforced in the settlement engine, which is the only thing that knows the expense total.';

-- --- M3: a percentage is a cut of a win, so only winners can pay it ---------
alter table money_rule
  add constraint money_rule_percent_charges_winners check (
    amount_kind <> 'percent' or charge = 'winners_only'
  );

-- --- M7: rounding granularity, now including 1k -----------------------------
create type rounding_mode as enum
  ('cents', 'dollars', 'tens', 'fifties', 'hundreds', 'thousands');

alter table book
  add column rounding_mode rounding_mode;

comment on column book.rounding_mode is
  'Null means dollars. This changes what people actually pay, so it belongs in the rules snapshot a night settles with — it is not a display setting. cents additionally requires amounts in minor units, which is not built.';

-- --- M7b: settlement due ----------------------------------------------------
-- A reminder only. Nothing in the database or the engine settles a night
-- because a date passed; this exists so the app can nudge.

create type settlement_due_kind as enum
  ('same_night', 'after_days', 'weeks_end', 'months_end');

alter table book
  add column settlement_due_kind      settlement_due_kind not null default 'same_night',
  add column settlement_due_days      int,
  add column settlement_due_next_working_day boolean not null default false,
  -- a night may override the group's default
  add constraint book_settlement_due_days_present check (
    (settlement_due_kind = 'after_days' and settlement_due_days is not null and settlement_due_days > 0)
    or (settlement_due_kind <> 'after_days' and settlement_due_days is null)
  );

alter table session
  add column settlement_due_kind      settlement_due_kind,
  add column settlement_due_days      int,
  add column settlement_due_next_working_day boolean,
  add column settlement_due_at        timestamptz;

comment on column session.settlement_due_kind is
  'Null means inherit the group''s rule. settlement_due_at is the resolved date, computed when the night opens so the reminder does not shift if the group rule changes later.';

-- --- M5: rule order is host-editable ----------------------------------------
-- sortOrder was always stored; it is now user-writable and shown in the list,
-- so ties would surface as rules silently swapping places.
create unique index money_rule_order_unique
  on money_rule (book_id, sort_order);
