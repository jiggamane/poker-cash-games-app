-- =============================================================================
-- What replaying the app's own writes turned up
-- =============================================================================
-- `supabase/test/03_sync_contract.sql` sends exactly what the phone sends, in
-- the order it sends it, as the host. Two things in the schema turned out to be
-- reachable only by a caller with privileges the app does not have.
-- =============================================================================

-- --- Minting a share token ---------------------------------------------------
-- Every session row defaults share_token to new_share_token(), which reaches
-- into the extensions schema for gen_random_bytes. Whether the CALLER can see
-- that schema then decides whether a night can be created at all — and the app
-- inserts sessions as `authenticated`, not as the owner.
--
-- Hosted Supabase grants that usage, so this would probably have worked in
-- production and definitely not in any test. "Probably" is the wrong word for
-- the statement that opens a night: SECURITY DEFINER runs it as the function's
-- owner, so the token is minted the same way no matter who asks.

create or replace function new_share_token()
returns text
language sql
volatile
security definer
set search_path = public, extensions
as $$
  select replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
$$;

-- --- Rule order --------------------------------------------------------------
-- 0003 made (book_id, sort_order) unique so that a host reordering rules could
-- not leave two sharing a position.
--
-- The intent is right and the constraint is in the wrong place. Rules are held
-- PER NIGHT on the phone — a night is settled with the rules it opened with, so
-- each night carries its own copy — while money_rule is per BOOK. Any ordinary
-- act that gives a rule a new id at the same position (deleting one and adding
-- another in its place, or a rule carried forward from a night that predates
-- proper ids) collides with a row that is still holding that position for an
-- older night. The insert fails, and because the outbox halts at its first
-- failure, it takes the whole queue down with it — every subsequent night stops
-- reaching the server, silently.
--
-- The order is still meaningful and still shown; it is now the app's business
-- to keep it contiguous, which it can, rather than the database's to enforce
-- across nights that legitimately disagree.

drop index if exists money_rule_order_unique;

create index money_rule_order_idx on money_rule (book_id, sort_order);

comment on column money_rule.sort_order is
  'The order rules are applied and listed in. Not unique per book: nights carry their own copy of the rules, so two nights can hold the same position with different rows.';
