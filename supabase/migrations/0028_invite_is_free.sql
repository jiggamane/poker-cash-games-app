-- =============================================================================
-- A dashboard invite makes an account, not a founder
-- =============================================================================
-- Owner, 9 November: somebody invited from the Supabase dashboard gets the
-- default tariff — Free — and the owner gives friends their upgrades by hand.
--
-- Until now 0018's trigger `auth_user_dashboard_invite` made every invited
-- address a founder: Full (`pro` before 0022) for ever, which is the right to
-- start a group of their own. That was the right default on 25 September, when
-- an invite was the only way in and everybody invited was a host. It is not
-- the right default now that an invite is how a friend gets an account to
-- claim a seat with.
--
-- WHAT CHANGES: the trigger and its function go. Nothing else.
-- WHAT DOES NOT: every founder plan already given stays exactly as it is —
-- this only stops new ones. `grant_founder` stays, closed to the API (0027),
-- for the SQL editor. Upgrades are what they were in 0018:
--
--   select admin_grant('friend@example.com');                  -- Full, for ever
--   select admin_grant('friend@example.com', 'regular', 365);  -- once 0021 is on
--   select admin_revoke('<entitlement id>', 'why');
--
-- (On a project without 0022, Full is still spelled `pro` — `admin_grant`'s
-- default there already is.)
-- =============================================================================

drop trigger if exists auth_user_dashboard_invite on auth.users;
drop function if exists founder_on_dashboard_invite();
