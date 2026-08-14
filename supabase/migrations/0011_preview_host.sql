-- =============================================================================
-- The preview names the host
-- =============================================================================
-- X2b's first line is "{host} added you as {name}" — the sentence that makes
-- the screen work, because it says who is vouching for the code before the
-- reader spends it. `preview_player_invite` returned a name and a group and
-- could not answer it.
--
-- The narrowness of the preview is deliberate and stays: 0007 calls it "a name,
-- a group, and nothing about the money", and that is the right line. A host's
-- display name sits on the same side of it as the group's — both are facts
-- about whose table this is, neither is a figure, and a holder of a live code
-- was given it by that person. What stays out is everything the reader has not
-- yet been granted: the ledger, the nights, the roster, the amounts.
--
-- The night count X2b also draws is NOT added here, and that is a decision
-- rather than an omission — see the note in `app/claim.tsx`.
--
-- The return type changes, so this is a DROP and CREATE. The constant-time
-- behaviour 0009 gave it is preserved verbatim; the only difference is one more
-- column on the way out and one more join on the way in, and the join sits
-- INSIDE the padded path so it cannot become a timing difference of its own.
-- =============================================================================

drop function if exists preview_player_invite(text);

create function preview_player_invite(code text)
returns table (player_name text, group_name text, host_name text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  started timestamptz := clock_timestamp();
  hit     boolean := false;
begin
  for player_name, group_name, host_name in
    select p.display_name,
           b.group_name,
           (select h.display_name
              from player h
             where h.book_id = b.id
               and h.claimed_by_user_id = b.host_user_id
             limit 1)
    from player_invite i
    join player p on p.id = i.player_id
    join book b on b.id = i.book_id
    where upper(trim(i.code)) = upper(trim(preview_player_invite.code))
      and i.claimed_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  loop
    hit := true;
    return next;
  end loop;

  if not hit then
    perform pad_refusal(started);
  end if;
end;
$$;

comment on function preview_player_invite(text) is
  'A name, a group and the host, for a live code only. Zero rows for unknown, spent, revoked and expired alike, in constant time — S80.';
