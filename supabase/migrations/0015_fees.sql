-- =============================================================================
-- Fees that are not a share of a win
-- =============================================================================
-- A private game charges for more than the pot. The two rules this schema could
-- express — a percentage of each win and a fixed sum for the table — cannot say
-- the two things hosts actually charge most often:
--
--   BY THE HOUR   "five an hour each" (a rake on time), "twenty an hour for
--                 the room" (the rent, the dealer's shift, the hire of a set).
--   PER HEAD      "ten off everybody for the cards", "five out of every
--                 buy-in" — a stated amount per person, not a pot divided
--                 between them.
--
-- So `rule_amount_kind` gains four values, and they fall into two families that
-- decide everything else about a rule (`packages/core/src/fees.ts`):
--
--   PER PERSON — percent, per_player, per_player_time, per_buyin. `amount` is
--                what ONE person pays, or the rate they pay at. There is no
--                total to divide, so `split` is not read and a split by hand is
--                refused.
--   ROOM TOTAL — fixed, per_time. `amount` (times the periods the table ran) is
--                what the TABLE pays, and `split` decides who carries how much.
--
-- `percent` and `fixed` are unchanged in name and in meaning. Every rule ever
-- stored is one of them and none of them moves.

-- --- The kinds ---------------------------------------------------------------
-- Rebuilt rather than extended with `alter type ... add value`, which cannot
-- run in the same transaction as the constraints below that read it. This is
-- the shape `0003_split_rules.sql` used on `rule_split`, for the same reason.

-- Both existing checks read `amount_kind`, so they are bound to the old type
-- and have to stand aside while the column is retyped. They go back exactly as
-- they were: a percentage is still 1–100 and still charged to winners only.
alter table money_rule drop constraint money_rule_percent_in_range;
alter table money_rule drop constraint money_rule_percent_charges_winners;

alter type rule_amount_kind rename to rule_amount_kind_old;

create type rule_amount_kind as enum (
  'percent',
  'fixed',
  'per_player',
  'per_player_time',
  'per_buyin',
  'per_time'
);

alter table money_rule
  alter column amount_kind type rule_amount_kind
    using amount_kind::text::rule_amount_kind;

drop type rule_amount_kind_old;

alter table money_rule
  add constraint money_rule_percent_in_range
    check (amount_kind <> 'percent' or amount between 1 and 100),
  add constraint money_rule_percent_charges_winners
    check (amount_kind <> 'percent' or charge = 'winners_only');

-- --- What a part period costs ------------------------------------------------
-- Every one of these is in use at some table, and a group that has argued about
-- a time charge has argued about exactly this. None of them is a default the
-- app may pick silently, so a rule charged by time states it.

create type rule_period_rounding as enum ('up', 'nearest', 'down', 'prorate');

alter table money_rule
  -- Minutes in one chargeable period: 60 an hour, 30 a half hour.
  add column period_minutes  int,
  add column period_rounding rule_period_rounding,
  -- Never take more than this off one person. The half of a rake that is always
  -- stated second: "five percent" is never agreed on its own, it is agreed as
  -- "five percent, fifty at most".
  add column max_per_player  bigint check (max_per_player > 0);

comment on column money_rule.period_minutes is
  'Minutes in one chargeable period — 60 an hour, 30 a half hour. Set only on per_player_time and per_time.';
comment on column money_rule.period_rounding is
  'How a part period is charged: up (every period begun, what "time" means in a card room), nearest, down (whole periods only), prorate (the exact fraction, landed on the group''s step).';
comment on column money_rule.max_per_player is
  'Never take more than this off one person. Per-person kinds only — a total for the table has no per-person figure to clamp. The engine applies it to what the RULE works out, never to a share the host typed by hand.';

-- --- The pairs that must hold ------------------------------------------------
-- A time rule with no period would charge nothing and say nothing, which is the
-- one way money goes missing without anybody seeing it happen. A period on a
-- rule that is not charged by time is a setting that does not apply to it,
-- which is how a rule comes to mean two things at once.

alter table money_rule
  add constraint money_rule_period_matches_kind check (
    (amount_kind in ('per_player_time', 'per_time')
       and period_minutes is not null and period_minutes > 0
       and period_rounding is not null)
    or
    (amount_kind not in ('per_player_time', 'per_time')
       and period_minutes is null and period_rounding is null)
  );

-- A ceiling on a total for the table could mean either half of it — the share
-- or the sum — so it is refused rather than guessed at.
alter table money_rule
  add constraint money_rule_cap_is_per_person check (
    max_per_player is null
    or amount_kind in ('percent', 'per_player', 'per_player_time', 'per_buyin')
  );

-- A stated amount per head and an amount typed against a name are two answers
-- to one question. `manual_charges` — which rides on the night's own snapshot,
-- not here — is still the way to overrule one person.
alter table money_rule
  add constraint money_rule_per_person_is_not_split_by_hand check (
    split <> 'custom'
    or amount_kind not in ('per_player', 'per_player_time', 'per_buyin')
  );

comment on type rule_amount_kind is
  'What a rule''s amount means. Per person: percent, per_player, per_player_time, per_buyin — the amount is what ONE person pays and split is not read. For the table: fixed, per_time — the amount is the total and split divides it.';

-- --- The watcher settles the same night --------------------------------------
-- A watcher computes the settlement on their own device from what they can
-- read. A rule whose amount they can read but whose period they cannot would
-- settle an hourly rake as though it charged once, and two people looking at
-- the same night would see two different sets of figures with nothing on
-- either screen to explain it — the exact failure this app exists to prevent.
--
-- Nothing to do: `money_rule_watcher_read` (0001) and `money_rule_member_read`
-- (0007) are row policies over the whole table, so the three columns added
-- above are readable by everyone who could already read the rule. This note is
-- here so that the next person adding a column checks, rather than assuming.
