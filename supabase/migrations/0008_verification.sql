-- =============================================================================
-- Did the night's arithmetic actually hold?
-- =============================================================================
-- Every settled night arrives with a verdict from `verifyNight()` — a set of
-- identities re-derived from the raw ledger, independently of the engine that
-- produced the figures. See `packages/core/src/verify.ts`.
--
-- WHY IT IS STORED RATHER THAN JUST CHECKED. A check that runs, passes and is
-- forgotten cannot answer the only question worth asking: what percentage of
-- real nights was wrong. And a check that runs and FAILS on somebody's phone at
-- 1am, with no record, is a bug report nobody will ever be able to file.
--
-- IT IS THE PHONE'S CLAIM, NOT A PROOF. The device that computed the settlement
-- also computed this verdict, so a phone that is wrong about the money may be
-- wrong about the check. That is why `npm run audit` re-verifies every stored
-- night from the snapshots, on a machine that was nowhere near the table. This
-- column is what lets the audit compare the two — and a night the phone passed
-- and the audit failed is the most interesting row in the whole system.
-- =============================================================================

alter table settlement
  add column if not exists verification jsonb;

comment on column settlement.verification is
  'The verdict verifyNight() reached on the device at close: {ok, checked, algorithmVersion, codes, detail, at}. Null for nights closed before verification existed.';

-- Finding the broken ones has to stay cheap as the table grows, and the query
-- that matters is always the same one: show me the failures.
create index if not exists settlement_verification_failed_idx
  on settlement ((verification ->> 'ok'))
  where verification is not null;
