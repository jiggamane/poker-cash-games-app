-- =============================================================================
-- Deleting an account — the person leaves, the record stays
-- =============================================================================
-- App Review refuses an app that creates accounts and cannot delete them
-- (5.1.1 (v); `docs/app-store-launch.md` A1). The mechanics were worked out in
-- `docs/design-request-account-deletion.md` against 0020; this file is them,
-- against 0023. B107 in `docs/bugs.md` is the fault it closes.
--
-- THE RULE. Deleting an account removes the person — their email, their
-- sign-in, every link from their user id to a seat, a grant, a plan. It never
-- removes a figure from a night somebody else played in. The one exception is
-- a group nobody else is in: a private ledger with no other reader goes with
-- its owner.
--
-- WHAT IT ADDS:
--
--   account_deletion_plan()   what deleting would do, for the caller, as one
--                             jsonb — the sheet reads this before the hold, so
--                             it can name every group and what happens to it.
--                             Changes nothing.
--   delete_my_account()       does it. Keyed on auth.uid() and nothing else:
--                             nobody deletes anybody but themselves. Returns
--                             the same shape, with `deleted: true`, or a
--                             refusal naming the night that is running.
--   release_seat()            the one write that turns a claimed seat back into
--                             a name. Internal: deletion calls it for every seat
--                             the person holds, and B57's "Remove from the
--                             group" is meant to be its second caller — one
--                             write, two callers, never a third copy.
--
-- WHAT IT CHANGES — eight things, each of which made a delete fail or lose a
-- record somebody else needs. The design doc found five; the other three are
-- marked ✱ and B107 says how they were found.
--
--   1. book.host_user_id             nullable. A group with members is CLOSED
--                                    and kept with no host. A new check says
--                                    only a closed group may have none.
--                                    `restrict` stays: nothing but this
--                                    function may empty it.
--   2. player_invite.created_by      nullable, `set null`.
--   3. settlement.discrepancy_confirmed_by   `set null`, and ✱ the check that
--                                    says a shortfall has a signer now allows
--                                    a signer whose account is gone.
--   4. player_invite.claimed_by      the claim stays whole unless the claimant
--   5. night_handover.redeemed_by    is gone: same guard as 3.
--   6. night_pass.from_user/to_user  nullable, `set null` — was `cascade`,
--      night_late_change.from_user   which deleted the row that says "passed
--      night_handover.created_by     to Lena at 23:10" and, for the handover,
--                                    the redeemer's membership with it.
--   7. ✱ session_writer_guard        lets the foreign key's own `set null`
--                                    through, inside this function only.
--   8. ✱ ledger_entry_no_delete      lets the cascade of a group deleted with
--                                    its host through, inside this function
--                                    only. Nothing else may delete a ledger row.
--
-- NOT HERE: handing a group to somebody before leaving (not built, and
-- deletion does not wait for it); cancelling an App Store subscription (only
-- Apple can — the plan says when the account has one, so the sheet can say so).
-- =============================================================================

-- =============================================================================
-- 1. A group with no host is a closed group
-- =============================================================================

alter table book alter column host_user_id drop not null;

alter table book
  add constraint book_hostless_is_closed
  check (host_user_id is not null or status = 'closed');

comment on column book.host_user_id is
  'Who runs the group. Null only on a closed group whose host deleted their account while other people had seats in it (0024): kept, read-only, for its members.';

-- =============================================================================
-- 2–5. A record that names a person keeps its shape when the person goes
-- =============================================================================
-- Three checks say "both facts or neither": a claim has a time and a claimant,
-- a redeemed code has a time and a redeemer, a shortfall has a time and a
-- signer. `set null` on the person breaks every one of them. The rule each
-- check was guarding is that nobody writes the time WITHOUT the person — so
-- that is what stays forbidden. A row may lose its person only when the
-- account behind it no longer exists, which is the foreign key acting, never
-- a client.

create or replace function person_stays_unless_gone()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  at_col text := tg_argv[0];
  by_col text := tg_argv[1];
  new_at text := to_jsonb(new) ->> at_col;
  new_by text := to_jsonb(new) ->> by_col;
  old_by text;
begin
  if new_at is null or new_by is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_by := to_jsonb(old) ->> by_col;
    -- Emptied just now, by the foreign key, because the account is gone.
    if old_by is not null
       and not exists (select 1 from auth.users u where u.id = old_by::uuid) then
      return new;
    end if;
    -- Emptied earlier and left as it was: some other column of the row is
    -- changing (another person on it is being deleted, say).
    if old_by is null and (to_jsonb(old) ->> at_col) is not distinct from new_at then
      return new;
    end if;
  end if;

  raise exception '%.% is set, so %.% must be too — it may be emptied only when that account has been deleted.',
    tg_table_name, at_col, tg_table_name, by_col;
end;
$$;

comment on function person_stays_unless_gone() is
  'Guard for a time-and-person pair: the person may be null with the time set only after the account was deleted (0024).';

-- 2. Who issued an invite
alter table player_invite alter column created_by drop not null;
alter table player_invite drop constraint player_invite_created_by_fkey;
alter table player_invite
  add constraint player_invite_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- 4. Who claimed it
alter table player_invite drop constraint player_invite_claim_is_whole;
alter table player_invite
  add constraint player_invite_claim_is_whole
  check (claimed_by is null or claimed_at is not null);

create trigger player_invite_claimant_stays
  before insert or update on player_invite
  for each row execute function person_stays_unless_gone('claimed_at', 'claimed_by');

-- 5. Who redeemed a handover code, and who minted it
alter table night_handover drop constraint night_handover_redeemed_whole;
alter table night_handover
  add constraint night_handover_redeemed_whole
  check (redeemed_by is null or redeemed_at is not null);

create trigger night_handover_redeemer_stays
  before insert or update on night_handover
  for each row execute function person_stays_unless_gone('redeemed_at', 'redeemed_by');

alter table night_handover alter column created_by drop not null;
alter table night_handover drop constraint night_handover_created_by_fkey;
alter table night_handover
  add constraint night_handover_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- 3. Who signed for a shortfall
alter table settlement drop constraint settlement_discrepancy_confirmed_by_fkey;
alter table settlement
  add constraint settlement_discrepancy_confirmed_by_fkey
  foreign key (discrepancy_confirmed_by) references auth.users (id) on delete set null;

alter table settlement drop constraint settlement_discrepancy_is_confirmed;
alter table settlement
  add constraint settlement_discrepancy_is_confirmed check (
    (discrepancy_amount = 0
      and discrepancy_confirmed_by is null
      and discrepancy_confirmed_at is null)
    or
    (discrepancy_amount <> 0
      and discrepancy_confirmed_at is not null)
  );

-- The signer half of the old check, now a guard: a shortfall is never STORED
-- without a signer. It can only lose one, to a deleted account.
create trigger settlement_signer_stays
  before insert or update on settlement
  for each row execute function person_stays_unless_gone('discrepancy_confirmed_at', 'discrepancy_confirmed_by');

-- =============================================================================
-- 6. Who passed a night, to whom, and who handed in a late change
-- =============================================================================
-- Were `cascade`: deleting Lena deleted "passed to Lena at 23:10" out of a
-- night's feed, and deleted Lena's waiting late changes before the recording
-- phone had decided them. The row stays; the person is a gap. Every function
-- that reads these compares to auth.uid(), and null equals nobody.

alter table night_pass alter column from_user drop not null;
alter table night_pass alter column to_user drop not null;
alter table night_pass drop constraint night_pass_from_user_fkey;
alter table night_pass drop constraint night_pass_to_user_fkey;
alter table night_pass
  add constraint night_pass_from_user_fkey
  foreign key (from_user) references auth.users (id) on delete set null,
  add constraint night_pass_to_user_fkey
  foreign key (to_user) references auth.users (id) on delete set null;

alter table night_late_change alter column from_user drop not null;
alter table night_late_change drop constraint night_late_change_from_user_fkey;
alter table night_late_change
  add constraint night_late_change_from_user_fkey
  foreign key (from_user) references auth.users (id) on delete set null;

-- =============================================================================
-- 8. The append-only ledger, and the one delete it allows
-- =============================================================================
-- Unchanged for everybody, always, except inside delete_my_account() erasing a
-- group nobody else was in — where the whole group goes, every row of it, and
-- a ledger row left behind would belong to a night that no longer exists.
-- `poker.erasing` is transaction-local and set only there, the same way
-- `poker.handover` is set only inside the handover functions. Updates are
-- never allowed.

create or replace function ledger_entry_is_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('poker.erasing', true), '') = 'on' then
    return null;
  end if;
  raise exception
    'ledger_entry is append-only: % is not permitted. Insert a correction or void entry instead.',
    tg_op;
end;
$$;

-- =============================================================================
-- The seat, released — one write, two callers
-- =============================================================================
-- What Reset already does to a claimed seat (0012): an unspent code dies, the
-- binding is released, the ledger is untouched. Not granted to anybody: it
-- checks nothing, and its callers are the ones that decide who may.

create or replace function release_seat(target_player_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  update player_invite
     set revoked_at = now()
   where player_id = target_player_id
     and claimed_at is null
     and revoked_at is null;

  update player
     set claimed_by_user_id = null
   where id = target_player_id
     and claimed_by_user_id is not null;
end;
$$;

revoke execute on function release_seat(uuid) from public;

comment on function release_seat(uuid) is
  'Turn a claimed seat back into a name: retire its unspent code, release the binding, leave every night on it. Called by delete_my_account(); meant for B57''s removal too. Not callable from the API.';

-- =============================================================================
-- What deleting would do — read by the sheet, and by the delete itself
-- =============================================================================
-- One answer, so the sheet cannot describe a different deletion from the one
-- that happens. For a given account:
--
--   running   the first night that stops it: an unsettled night this account
--             records, or one in a group it hosts (somebody it passed the game
--             to is recording). Null when nothing does.
--   groups    every group it hosts, each `deleted` or `closed`. Closed when
--             anybody else is in it: holds a seat, redeemed a handover code,
--             was passed a night, or watches over a share link still live.
--   seats     every seat it holds in somebody else's group, with the group
--             and that group's host's name for it.
--   store_subscription   whether a plan came from Apple or Google — deleting
--             does not stop the store charging, and the sheet has to say so.

create or replace function deletion_plan_for(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with hosted as (
    select b.id, b.group_name, b.created_at,
           (
             exists (select 1 from player p
                      where p.book_id = b.id
                        and p.claimed_by_user_id is not null
                        and p.claimed_by_user_id <> target)
             or exists (select 1 from night_handover h
                          join session s on s.id = h.session_id
                         where s.book_id = b.id
                           and h.redeemed_by is not null
                           and h.redeemed_by <> target)
             or exists (select 1 from night_pass np
                          join session s on s.id = np.session_id
                         where s.book_id = b.id
                           and np.to_user is not null
                           and np.to_user <> target)
             or exists (select 1 from share_grant g
                          join session s on s.id = g.session_id
                         where s.book_id = b.id
                           and g.revoked_at is null
                           and g.user_id <> target)
           ) as others_in_it,
           (select count(distinct p.claimed_by_user_id)
              from player p
             where p.book_id = b.id
               and p.claimed_by_user_id is not null
               and p.claimed_by_user_id <> target) as members
      from book b
     where b.host_user_id = target
  ),
  seats as (
    select p.id as player_id, p.display_name, b.id as book_id, b.group_name,
           (select hp.display_name from player hp
             where hp.book_id = b.id and hp.claimed_by_user_id = b.host_user_id
             order by hp.created_at limit 1) as host_name
      from player p
      join book b on b.id = p.book_id
     where p.claimed_by_user_id = target
       and b.host_user_id is distinct from target
  ),
  running as (
    select s.id as session_id, b.id as book_id, b.group_name, s.started_at
      from session s
      join book b on b.id = s.book_id
     where s.status <> 'settled'
       and (coalesce(s.writer_user_id, b.host_user_id) = target
            or b.host_user_id = target)
     order by s.started_at desc
     limit 1
  )
  select jsonb_build_object(
    'running', (select to_jsonb(r) from running r),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
               'book_id', h.id,
               'group_name', h.group_name,
               'outcome', case when h.others_in_it then 'closed' else 'deleted' end,
               'members', h.members)
             order by h.created_at)
        from hosted h), '[]'::jsonb),
    'seats', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player_id', st.player_id,
               'display_name', st.display_name,
               'book_id', st.book_id,
               'group_name', st.group_name,
               'host_name', st.host_name)
             order by st.group_name)
        from seats st), '[]'::jsonb),
    'store_subscription', exists (
      select 1 from entitlement e
       where e.user_id = target
         and e.source in ('apple', 'google')
         and e.revoked_at is null
         and (e.ends_at is null or e.ends_at > now()))
  );
$$;

revoke execute on function deletion_plan_for(uuid) from public;

create or replace function account_deletion_plan()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null
              else deletion_plan_for(auth.uid()) end;
$$;

comment on function account_deletion_plan() is
  'What deleting the caller''s account would do, without doing it: the night that would stop it, each group it hosts (deleted or closed), each seat it holds elsewhere, and whether a store subscription would go on charging.';

-- =============================================================================
-- Delete my account
-- =============================================================================
-- In order, inside one transaction — it all happens or none of it does:
--
--   1. Refuse while a game is running on the account. Finite: settle the
--      night, or take it back and settle it. Returned, not raised, so the
--      sheet can name the night.
--   2. Every seat held in somebody else's group becomes a name again.
--   3. Every hosted group is deleted (nobody else in it) or closed and kept
--      with no host (anybody else is).
--   4. Invites and handover codes this account issued and nobody spent die.
--   5. `delete from auth.users`. Supabase cascades its own tables — identities,
--      sessions, refresh tokens. Here: entitlement, promo_redemption,
--      app_admin, share_grant and host_night go; billing_event, every
--      hand-off and late change, and every claim keep their row with the
--      person emptied. No service_role key anywhere.
--
-- The phone does the rest: forgets the session, drops its SQLite, starts over.

create or replace function delete_my_account()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  me     uuid := auth.uid();
  plan   jsonb;
  g      jsonb;
  s      jsonb;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  -- Hold every group this account hosts while it is decided, so a member
  -- claiming a seat in the same instant cannot land in a group being deleted.
  perform 1 from book where host_user_id = me for update;

  plan := deletion_plan_for(me);

  -- 1. A game is running.
  if plan -> 'running' is not null and jsonb_typeof(plan -> 'running') = 'object' then
    return plan || jsonb_build_object('deleted', false, 'refused', 'game_running');
  end if;

  -- 2. Seats elsewhere.
  for s in select * from jsonb_array_elements(plan -> 'seats') loop
    perform release_seat((s ->> 'player_id')::uuid);
  end loop;

  -- 3. Hosted groups.
  for g in select * from jsonb_array_elements(plan -> 'groups') loop
    if g ->> 'outcome' = 'deleted' then
      -- In dependency order, because several tables point at `player` with
      -- `restrict` and a single cascade from `book` reaches them in no
      -- promised order. The ledger rows go with their nights.
      perform set_config('poker.erasing', 'on', true);
      delete from session    where book_id = (g ->> 'book_id')::uuid;
      delete from money_rule where book_id = (g ->> 'book_id')::uuid;
      delete from player     where book_id = (g ->> 'book_id')::uuid;
      delete from book       where id      = (g ->> 'book_id')::uuid;
      perform set_config('poker.erasing', '', true);
    else
      -- The host's own seat in it, if they claimed one, becomes a name too.
      perform release_seat(p.id)
         from player p
        where p.book_id = (g ->> 'book_id')::uuid
          and p.claimed_by_user_id = me;

      update book
         set status       = 'closed',
             closed_at    = coalesce(closed_at, now()),
             host_user_id = null
       where id = (g ->> 'book_id')::uuid;
    end if;
  end loop;

  -- 4. Codes this account issued that nobody spent.
  update player_invite
     set revoked_at = now()
   where created_by = me and claimed_at is null and revoked_at is null;

  update night_handover
     set revoked_at = now()
   where created_by = me and redeemed_at is null and revoked_at is null;

  -- 5. The account. A settled night this account was passed has it as
  -- `writer_user_id`; the foreign key empties that, and the writer guard lets
  -- the foreign key through only while this flag is on.
  perform set_config('poker.handover', 'on', true);
  delete from auth.users where id = me;
  perform set_config('poker.handover', '', true);

  return plan || jsonb_build_object('deleted', true);
end;
$$;

revoke execute on function delete_my_account() from public;
revoke execute on function account_deletion_plan() from public;
grant execute on function delete_my_account() to authenticated;
grant execute on function account_deletion_plan() to authenticated;

comment on function delete_my_account() is
  'Delete the caller''s account, and only the caller''s. Refuses while a game is running on it; otherwise releases every seat, deletes each hosted group nobody else is in, closes and keeps each one somebody is, and deletes the auth user. Returns the plan it carried out — B107.';
