-- =============================================================================
-- What a watcher is allowed to know ABOUT the night, as opposed to in it
-- =============================================================================
-- X1a's meta line reads "kept by Marek · 3h 17m", X1c's reads "kept by Marek ·
-- 4h 36m · 6 players", and both screens end in the band "Read-only. Only Marek
-- can write to the ledger." Three places on two screens, all naming the host.
--
-- Nothing on the server could answer that. 0001 gives a watcher row-level reads
-- of session, player, ledger_entry and the rest, and deliberately no read of
-- `book` at all — `docs/auth-test-period.md` lists that as a known limit and
-- says "adding one is a two-line policy if it turns out to matter". Rev 15 is
-- it turning out to matter, but a policy on `book` is the wrong shape for what
-- is actually needed: the host's NAME is not in `book`, it is in the host's own
-- player row, and opening the table would hand over host_user_id, the currency
-- and the open/closed state to answer a question about a string.
--
-- So: one function, returning exactly the four values the two meta lines and
-- the band need, for one night, to somebody who can already read that night.
--
-- WHO MAY CALL IT is asked in the same terms the policies use, so this cannot
-- drift away from them: a watcher holding a live grant, a claimed member of the
-- book, or the host. Anybody else gets nothing back — not an error, which would
-- itself say the night exists.
-- =============================================================================

create or replace function night_header(target_session_id uuid)
returns table (
  group_name  text,
  host_name   text,
  player_count int,
  started_at  timestamptz,
  ended_at    timestamptz,
  status      text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.group_name,
    -- The host as a person at their own table. A host who never plays has no
    -- player row and no name to give; the screens fall back rather than
    -- inventing one, because "kept by" with nothing after it is a bug a reader
    -- can see and a made-up name is one they cannot.
    (select p.display_name
       from player p
      where p.book_id = b.id
        and p.claimed_by_user_id = b.host_user_id
      limit 1),
    (select count(*)::int from session_seat ss where ss.session_id = s.id),
    s.started_at,
    s.ended_at,
    s.status::text
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
  'The group, the host''s name, the seat count and the times for ONE night, to somebody already entitled to read it. Feeds X1a and X1c''s meta lines and the read-only band. Zero rows for anybody else.';

-- Callable by signed-in users; the function decides for itself who gets an
-- answer. Anonymous watchers are `authenticated` too — an anonymous Supabase
-- user is a real user with a real JWT, which is the whole point of 0005.
grant execute on function night_header(uuid) to authenticated;
