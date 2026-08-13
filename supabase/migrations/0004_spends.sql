-- 0004 · A spend can be split between fronters, or paid by nobody
--
-- Rev 12 of the handoff (`11-bill-and-kitty.md`) makes "covered by" a first
-- class question with four answers: one player, several players, the kitty, or
-- nobody yet. The first two need a way to say that several reimbursements are
-- one line on the bill; the last two need an expense with no player behind it.
--
-- Both are additive. Every row written before this migration is a
-- single-fronter spend with spend_id null, which reads exactly as it did.

create type spend_cover as enum ('kitty', 'unpaid');

alter table ledger_entry
  -- Groups the fronters of ONE spend. Two people split a pizza, each is paid
  -- back exactly what they put in, and this is what keeps them one line.
  add column spend_id uuid,
  -- Set instead of payer_id when no player fronted it.
  --   kitty  — the kitty paid directly and is repaid at settle-up
  --   unpaid — on the bill, nobody named yet; the night cannot settle
  add column covered_by spend_cover;

comment on column ledger_entry.spend_id is
  'Groups the fronter rows of one spend. Null on a spend with a single fronter.';
comment on column ledger_entry.covered_by is
  'Only on expenses with no payer_id. The settlement engine repays the kitty its own spends and refuses to settle while anything is unpaid.';

create index ledger_entry_spend_idx on ledger_entry (session_id, spend_id);

-- An expense now names EXACTLY ONE of payer_id and covered_by. Everything else
-- in the shape check is unchanged; the whole constraint is restated because
-- Postgres has no way to edit one branch of it.
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
      when 'expense' then player_id is null and amount > 0
                          and corrects_entry_id is null
                          and (payer_id is not null) <> (covered_by is not null)
      -- a correction restates an amount; the original stays in the table
      when 'correction' then corrects_entry_id is not null and covered_by is null
      -- a void cancels an entry to nothing
      when 'void'       then corrects_entry_id is not null and amount = 0
                          and covered_by is null
    end
  );

-- --- M-rev12: a rule can leave somebody out for one night --------------------
--
-- Per-night, never the group's own setting: somebody brought the food, so the
-- kitty leaves them alone this once. The night carries its own snapshot of the
-- rules, which is what makes the exception safe to write here.
alter table money_rule
  add column exempt_player_ids uuid[] not null default '{}';

comment on column money_rule.exempt_player_ids is
  'Players this rule does not charge tonight. A per-night exception; it never propagates to the group''s next session.';
