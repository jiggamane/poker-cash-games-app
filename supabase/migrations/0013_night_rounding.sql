-- =============================================================================
-- The night carries the rounding rule it was settled under
-- =============================================================================
-- `0003_split_rules.sql` put `rounding_mode` on BOOK: how coarsely a group
-- settles. That is the group's standing answer, and it is the right home for
-- it — but it is the wrong thing to settle a night with.
--
-- A night COPIES what it opens with. If a group moves to hundreds in November,
-- re-deriving last March's night against the book would apply November's rule
-- to March's money and "find" a discrepancy that is really just the passage of
-- time. That is exactly the argument `rules_snapshot` on SETTLEMENT already
-- makes for the rules themselves, and rounding is not a display setting: it
-- changes what people actually pay, so it belongs in the same snapshot.
--
-- Hence a column on SESSION. Null means whole dollars, which is what every
-- night recorded before this ran at, so nothing already stored moves.
--
-- WHAT IS NOT HERE, deliberately:
--
--   A hand-typed share (`MoneyRule.manualCharges`) has no column, because
--   `money_rule` belongs to the BOOK and a hand-typed share belongs to one
--   night. It reaches the server inside `settlement.rules_snapshot`, which is
--   jsonb and already carries the night's own copy of every rule — the same
--   route an exemption takes.

alter table session
  add column rounding_mode rounding_mode;

comment on column session.rounding_mode is
  'How coarsely THIS night settles, copied off the book when it opened. Null means whole dollars. It reaches the deductions only: a gross result is chips counted off a table and rounding one would be inventing money. Settling a night with the book''s current value instead of this would restate nights the group has already been paid out on.';


-- --- The watcher has to settle the night the same way -------------------------
-- X1 is "N1/N2 with canWrite: false" — the same data, a different projection —
-- and the watcher's copy of the settlement is computed on their own device from
-- what they can read. If they cannot read the rounding rule they settle in
-- whole dollars while the host settles in hundreds, and two people looking at
-- the same night see two different sets of figures with nothing on either
-- screen to explain it. That is the exact failure this app exists to prevent.
--
-- A watcher cannot read `session` — that is why `night_header` is SECURITY
-- DEFINER in the first place (`0010_night_header.sql`) — so the value goes out
-- through the same function, to the same three readers, and to nobody else.
--
-- The return type changes, so the function is dropped and rebuilt rather than
-- replaced: Postgres will not `create or replace` a function whose OUT columns
-- have moved. The body, the authorization and the grant are otherwise verbatim
-- from 0010.

drop function if exists night_header(uuid);

create function night_header(target_session_id uuid)
returns table (
  group_name    text,
  host_name     text,
  player_count  int,
  started_at    timestamptz,
  ended_at      timestamptz,
  status        text,
  rounding_mode text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.group_name,
    (select p.display_name
       from player p
      where p.book_id = b.id
        and p.claimed_by_user_id = b.host_user_id
      limit 1),
    (select count(*)::int from session_seat ss where ss.session_id = s.id),
    s.started_at,
    s.ended_at,
    s.status::text,
    s.rounding_mode::text
  from session s
  join book b on b.id = s.book_id
  where s.id = target_session_id
    and (
      -- A watcher, holding the grant 0005 mints and 0001's policies read.
      s.id = watcher_session_id()
      -- A claimed member of this book.
      or is_book_member(s.book_id)
      -- The host themselves — the same screens serve them when they open a
      -- night they kept.
      or is_book_host(s.book_id)
    );
$$;

comment on function night_header(uuid) is
  'The group, the host''s name, the seat count, the times and the rounding rule for ONE night, to somebody already entitled to read it. Feeds X1a and X1c''s meta lines and the read-only band, and lets a watcher settle the night to the same figures the host does. Zero rows for anybody else.';

grant execute on function night_header(uuid) to authenticated;
