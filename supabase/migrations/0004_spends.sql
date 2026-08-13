-- 0004 · A spend is covered by somebody, by the kitty, or by nobody yet
--
-- Rev 12 replaces the B-series bill screens with L1–L6, and with them the idea
-- that every expense has exactly one person to pay back. A spend now has four
-- shapes, and this migration is what makes the last three representable:
--
--   one player       payer_id set. Repaid exactly what they fronted.
--   several players  one row each, sharing spend_group. Each repaid their own.
--   the kitty        payer_id null, covered_by 'kitty'. Nobody is repaid; the
--                    money left the kitty.
--   nobody yet       payer_id null, covered_by 'unpaid'. On the bill, owed to
--                    nobody, and tagged amber until someone is named.
--
-- The money consequence is contained: an expense with no payer still counts
-- towards the bill the winners split, and simply creates no credit at
-- settle-up. That is why the two cases can share one shape.

alter table ledger_entry
  add column covered_by  text,
  add column spend_group uuid;

comment on column ledger_entry.covered_by is
  'Expenses with no person behind them: ''kitty'' or ''unpaid''. Mutually exclusive with payer_id.';
comment on column ledger_entry.spend_group is
  'Ties the several fronters of one spend together. Null when one entry is the whole spend.';

alter table ledger_entry
  add constraint ledger_entry_covered_by_known
  check (covered_by is null or covered_by in ('kitty', 'unpaid'));

-- The shape check is replaced wholesale rather than amended: the expense arm
-- is the only line that changes, but a CHECK constraint cannot be edited in
-- place, and restating it keeps the whole shape readable in one query.
alter table ledger_entry drop constraint ledger_entry_shape;

alter table ledger_entry
  add constraint ledger_entry_shape check (
    case type
      when 'buyin'   then player_id is not null and payer_id is null
                          and amount > 0 and corrects_entry_id is null
                          and covered_by is null
      when 'rebuy'   then player_id is not null and payer_id is null
                          and amount > 0 and corrects_entry_id is null
                          and covered_by is null
      when 'cashout' then player_id is not null and payer_id is null
                          and corrects_entry_id is null
                          and covered_by is null
      -- Exactly one of payer_id and covered_by. A spend always says who is
      -- owed for it, and "nobody" is an answer that has to be written down
      -- rather than left as a missing column.
      when 'expense' then player_id is null
                          and amount > 0 and corrects_entry_id is null
                          and ((payer_id is not null and covered_by is null)
                            or (payer_id is null and covered_by is not null))
      when 'correction' then corrects_entry_id is not null and covered_by is null
      when 'void'       then corrects_entry_id is not null and amount = 0
                          and covered_by is null
    end
  );

create index ledger_entry_spend_group_idx on ledger_entry (spend_group)
  where spend_group is not null;
