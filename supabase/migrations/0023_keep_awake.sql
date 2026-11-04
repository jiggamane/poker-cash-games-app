-- =============================================================================
-- Keep awake — one row the daily workflow writes, so the project is not idle
-- =============================================================================
-- Owner, 4 November: Supabase emailed that eciozeeqywpgqlxqmprl "has not seen
-- sufficient activity for more than 7 days" and is scheduled to be paused.
--
-- `.github/workflows/keep-awake.yml` had run every day since 26 September and
-- passed every time. What it did was read `book` with the public key and no
-- sign-in, which row-level security answers with an empty list. Whatever
-- Supabase counts as activity, that did not count. Its heuristic is not
-- published, so this does the least ambiguous thing a client can do: a write.
--
-- WHAT IT ADDS:
--   * `keep_awake`, a table of exactly one row — when the last beat landed and
--     how many there have been. RLS on, no policies: nobody reads it through
--     the API, and the state check's row 91 stays true.
--   * `keep_awake()`, which upserts that row and returns the time. Security
--     definer, so the anon key can call it without being able to touch the
--     table. It takes no argument, so the most a stranger with the public key
--     can do is move one timestamp — and the public key is in every copy of
--     the app already.
--
-- Not money, not the ledger, nothing the phone reads. If it is never applied
-- the workflow falls back to the old read and says so in its log.
-- =============================================================================

create table keep_awake (
  id     smallint    primary key default 1 check (id = 1),
  at     timestamptz not null default now(),
  beats  bigint      not null default 1
);

alter table keep_awake enable row level security;
-- Supabase's default privileges grant anon and authenticated everything on a
-- new public table; RLS would then answer them nothing, but there is no reason
-- for them to hold the grant at all.
revoke all on keep_awake from anon, authenticated;

create or replace function keep_awake()
returns timestamptz
language sql
volatile
security definer
set search_path = public
as $$
  insert into keep_awake (id, at, beats) values (1, now(), 1)
  on conflict (id) do update set at = now(), beats = keep_awake.beats + 1
  returning at;
$$;

revoke execute on function keep_awake() from public;
grant execute on function keep_awake() to anon, authenticated;
