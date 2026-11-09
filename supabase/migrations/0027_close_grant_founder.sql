-- =============================================================================
-- grant_founder closed to the API (B108, the part 0026 left open)
-- =============================================================================
-- 0018 closed `grant_founder` with `revoke execute … from public`. On Supabase
-- that leaves the default grants to `anon` and `authenticated` standing (B108),
-- so on 9 November anybody with the app's public key could give any account —
-- their own anonymous one included — a Full plan for ever, which is the gate on
-- starting a group. Owner, 9 November: close it.
--
-- Nothing in the app calls it. Its one caller is the dashboard-invite trigger
-- (`founder_on_dashboard_invite`, security definer), which runs as the
-- function's owner and keeps working.
-- =============================================================================

revoke execute on function grant_founder(uuid) from public, anon, authenticated;
