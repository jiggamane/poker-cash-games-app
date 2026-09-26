import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * B95 — A WATCHER'S SCREEN HEARS EVERY CHANGE IT DEPENDS ON.
 *
 * The screen re-reads the night when Supabase Realtime says a row changed, and
 * two separate things have to be true for that to happen: the screen has to be
 * listening for the table, and a migration has to have put the table on the
 * `supabase_realtime` publication. Either one missing is silent — the watcher
 * just sees the night late. Both were missing for `final_count` in opposite
 * ways for a month.
 *
 * So this reads the sources rather than running them, in the manner of
 * `storageCoverage.test.ts`: the tables `loadWatchedNight` reads, the tables
 * `WATCH_FEED` listens to, and the tables the migrations publish. The database
 * half is asserted again, against a real migrated Postgres, by
 * `supabase/test/12_live_feed.sql`.
 */

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url).href);
const watch = readFileSync(here('./watchNight.ts'), 'utf8');

/** Every table `loadWatchedNight` reads with `rows<…>('table', …)`, plus the header's. */
const read = new Set([
  ...[...watch.matchAll(/rows<[^>]*>\(\s*'(\w+)'/g)].map((m) => m[1]!),
  // `night_header` reads the session row; its status is what ends the night.
  'session',
]);

const feedBlock = watch.slice(watch.indexOf('export const WATCH_FEED'));
const listened = new Set(
  [...feedBlock.slice(0, feedBlock.indexOf('];')).matchAll(/table: '(\w+)'/g)].map((m) => m[1]!),
);

/** Every table any migration adds to `supabase_realtime`. */
const migrations = here('../../../../supabase/migrations/');
const published = new Set<string>();
for (const file of readdirSync(migrations)) {
  const sql = readFileSync(migrations + file, 'utf8');
  if (!sql.includes('supabase_realtime')) continue;
  for (const m of sql.matchAll(/supabase_realtime add table (?:public\.)?(\w+)/g)) published.add(m[1]!);
  for (const block of sql.matchAll(/array\s*\[([^\]]*)\]/g)) {
    for (const t of block[1]!.matchAll(/'(\w+)'/g)) published.add(t[1]!);
  }
}

describe('the watch screen’s live feed (B95)', () => {
  it('reads what it listens for, and listens for everything it reads', () => {
    expect([...read].sort()).toEqual([...listened].sort());
  });

  it('listens only to tables a migration puts on the realtime publication', () => {
    const unpublished = [...listened].filter((t) => !published.has(t));
    expect(unpublished).toEqual([]);
  });
});
