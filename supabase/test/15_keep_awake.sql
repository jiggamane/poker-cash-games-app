-- =============================================================================
-- Keep awake — the daily write lands, and gives nothing else away — 0023
-- =============================================================================
-- What it holds, one line each:
--   * the public key (anon) can call keep_awake(), and it writes the one row
--   * a second call moves the same row on; there is never a second row
--   * anon cannot read, insert into or update the table directly
--
-- Run with: npm run db:verify
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on

create or replace function expect_rejected(stmt text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute stmt;
  exception
    when others then
      return;
  end;
  raise exception 'TEST FAILED: % — statement was accepted but should have been rejected', label;
end;
$$;

\o /dev/null

set role anon;
select keep_awake();
select keep_awake();
reset role;

select expect_eq((select count(*) from keep_awake), 1, 'keep_awake holds exactly one row');
select expect_eq((select beats from keep_awake), 2, 'each call is a beat on that row');

set role anon;
select expect_rejected('select * from keep_awake', 'anon cannot read keep_awake directly');
select expect_rejected('update keep_awake set beats = 0', 'anon cannot update keep_awake directly');
select expect_rejected('insert into keep_awake (id) values (1)', 'anon cannot insert into keep_awake');
reset role;

\o

select '--------------------------------------------------' as " ";
select 'KEEP AWAKE TESTS PASSED' as " ";
