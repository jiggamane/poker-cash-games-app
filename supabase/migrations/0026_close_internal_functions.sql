-- =============================================================================
-- The functions 0024 and 0025 meant to keep private, kept private on Supabase
-- =============================================================================
-- B108. 0024 and 0025 closed their internal functions with
-- `revoke execute … from public`, which is enough on a bare Postgres and NOT
-- enough on Supabase: a Supabase project's default privileges grant EXECUTE on
-- every new function in `public` to `anon` and `authenticated` by name, and a
-- revoke from PUBLIC leaves those two grants standing. Applied on 9 November,
-- the live project let anybody holding the app's public key call
-- `release_seat` — unclaim any seat in any group — and `deletion_plan_for` —
-- read any account's groups and seats by its id. Closed the same session,
-- minutes after 0024 went in; nothing had called them.
--
-- `db:verify` could not see it, because its Postgres had no such default. The
-- shim (`00_supabase_shim.sql`) now sets the same default privileges Supabase
-- does, and `16_delete_account.sql` asserts that `anon` and `authenticated`
-- cannot execute any of these.
--
-- delete_my_account and account_deletion_plan stay callable by
-- `authenticated` — every signed-in phone, anonymous ones included — and are
-- closed to `anon`, which is a request with no account at all.
-- =============================================================================

revoke execute on function release_seat(uuid)                     from public, anon, authenticated;
revoke execute on function deletion_plan_for(uuid)                from public, anon, authenticated;
revoke execute on function seat_in_book(uuid, uuid)               from public, anon, authenticated;
revoke execute on function seat_or_account_name(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function person_stays_unless_gone()             from public, anon, authenticated;
revoke execute on function delete_my_account()                    from anon;
revoke execute on function account_deletion_plan()                from anon;
