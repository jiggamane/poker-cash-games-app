-- =============================================================================
-- The close gate
-- =============================================================================
-- A night may be settled only if the money balances, OR if the host looked at
-- the exact shortfall and confirmed it. This is enforced in three places, on
-- purpose: the UI shows the mismatch live and blocks the button, the settlement
-- engine refuses to compute, and the database refuses to store. The first two
-- can be bypassed by a stale client; this one cannot.
-- =============================================================================

alter table settlement
  -- counted − expected, signed. Negative means money is missing, positive means
  -- there is more on the table than the ledger accounts for. Zero is a night
  -- that balanced, which is the overwhelmingly common case.
  add column discrepancy_amount        bigint not null default 0,
  add column discrepancy_confirmed_by  uuid references auth.users (id) on delete restrict,
  add column discrepancy_confirmed_at  timestamptz,
  add column discrepancy_note          text;

-- A discrepancy exists if and only if somebody put their name to it. This is
-- the rule that stops missing money being recorded quietly, and it is why the
-- confirmation is stored rather than being a transient UI acknowledgement.
alter table settlement
  add constraint settlement_discrepancy_is_confirmed check (
    (discrepancy_amount = 0
      and discrepancy_confirmed_by is null
      and discrepancy_confirmed_at is null)
    or
    (discrepancy_amount <> 0
      and discrepancy_confirmed_by is not null
      and discrepancy_confirmed_at is not null)
  );

comment on column settlement.discrepancy_amount is
  'Counted chips minus the money the ledger says is on the table. Non-zero only with a recorded host confirmation.';

-- A night that has been settled cannot quietly become unsettled, and a frozen
-- settlement's numbers must not move. Corrections are made by adding ledger
-- entries and re-settling, exactly like the ledger itself.
create or replace function settlement_is_immutable_once_frozen()
returns trigger
language plpgsql
as $$
begin
  if old.frozen then
    -- The room is allowed to redistribute who physically pays whom; nothing
    -- else about a frozen settlement may change.
    if new.computed_transfers is distinct from old.computed_transfers
       or new.inputs_snapshot   is distinct from old.inputs_snapshot
       or new.rules_snapshot    is distinct from old.rules_snapshot
       or new.total_off_table   is distinct from old.total_off_table
       or new.algorithm_version is distinct from old.algorithm_version
       or new.discrepancy_amount is distinct from old.discrepancy_amount then
      raise exception
        'This settlement is frozen. Add a correcting ledger entry and settle again rather than editing it.';
    end if;
  end if;
  return new;
end;
$$;

create trigger settlement_frozen_guard
  before update on settlement
  for each row execute function settlement_is_immutable_once_frozen();
