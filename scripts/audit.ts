/**
 * =============================================================================
 * audit — re-check every settled night on the server, and report the failure
 * rate.
 * =============================================================================
 *
 * Run it with:  npm run audit
 *
 * WHAT IT IS FOR. The target for broken calculations is zero, and the only way
 * to know whether you are at zero is to measure it over real nights rather than
 * over the nights somebody thought to write a test for. This is that
 * measurement. It prints one number that matters — the percentage of stored
 * nights whose arithmetic does not hold — and names every failure.
 *
 * WHY IT RUNS HERE AND NOT ON THE PHONE. The phone verifies its own work at
 * close, which catches most things and catches them immediately. But the phone
 * that computed the settlement also computed that verdict, so a device that is
 * wrong about the money can be wrong about the check. This re-derives
 * everything from the SNAPSHOTS stored with each settlement, on a machine that
 * was nowhere near the table, using the same versioned engine. A night the
 * phone passed and this fails is the most interesting row in the system: it
 * means what was computed and what was stored are not the same thing.
 *
 * CREDENTIALS. Reads two environment variables and stores neither:
 *
 *   SUPABASE_URL                 https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    from Dashboard → Settings → API
 *
 * The service key bypasses row-level security, which is what lets one command
 * audit every host's book. It must NEVER be written into .env, into apps/, or
 * into a commit — export it in the shell for the length of the run:
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   npm run audit
 *
 * Without a service key it still runs against whatever the anon key can see,
 * which during testing is nothing — so it will say so rather than reporting a
 * cheerful 0 failures over 0 nights.
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import {
  inputFromSnapshot,
  settle,
  summarise,
  verifyNight,
  type Money,
  type MoneyRule,
  type NightSnapshot,
  type SettlementInput,
  type StoredVerification,
} from '@poker-club/core';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

if (url === '' || key === '') {
  console.error(
    'audit: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell first.\n' +
      '       Never write the service key into a file — export it for the run.',
  );
  process.exit(2);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** What a settlement row carries, and everything needed to re-derive it. */
interface SettlementRow {
  session_id: string;
  algorithm_version: string;
  rules_snapshot: MoneyRule[];
  inputs_snapshot: NightSnapshot;
  computed_transfers: unknown;
  total_off_table: number;
  discrepancy_amount: number;
  discrepancy_confirmed_by: string | null;
  discrepancy_confirmed_at: string | null;
  discrepancy_note: string | null;
  discrepancy_absorbed_by: string | null;
  verification: StoredVerification | null;
  computed_at: string;
}

interface Row {
  sessionId: string;
  group: string;
  when: string;
  ok: boolean;
  codes: string[];
  detail: string[];
  /** What the phone said at close. Null for a night settled before checks existed. */
  claimed: boolean | null;
}

async function main(): Promise<void> {
  const { data, error } = await db
    .from('settlement')
    .select('*')
    .order('computed_at', { ascending: true });

  if (error) {
    console.error(`audit: could not read settlements — ${error.message}`);
    process.exit(1);
  }

  const settlements = (data ?? []) as SettlementRow[];

  // Group names, so a failure can be chased to a real table rather than a uuid.
  const { data: sessions } = await db.from('session').select('id, book_id, started_at');
  const { data: books } = await db.from('book').select('id, group_name');
  const bookOf = new Map((sessions ?? []).map((s) => [s.id as string, s.book_id as string]));
  const nameOf = new Map((books ?? []).map((b) => [b.id as string, b.group_name as string]));
  const startedOf = new Map((sessions ?? []).map((s) => [s.id as string, s.started_at as string]));

  if (settlements.length === 0) {
    console.log(
      'audit: no settled nights on the server yet.\n' +
        '       (If you expected some, the key in use may not be the service role key —\n' +
        '        row-level security hides other hosts’ books from anything else.)',
    );
    return;
  }

  const rows: Row[] = [];
  const unauditable: string[] = [];

  for (const s of settlements) {
    const input = inputOf(s);
    if (input === null) {
      unauditable.push(s.session_id);
      continue;
    }

    // Re-settle from the snapshot, then check THAT against the same snapshot.
    // Re-settling is safe and meaningful because the engine is pure and
    // versioned: the same inputs must give the same answer on any machine, and
    // a night that no longer reproduces is exactly what this is looking for.
    let verdict;
    try {
      verdict = verifyNight(input, settle(input));
    } catch (e) {
      rows.push({
        sessionId: s.session_id,
        group: nameOf.get(bookOf.get(s.session_id) ?? '') ?? '—',
        when: startedOf.get(s.session_id) ?? s.computed_at,
        ok: false,
        codes: ['night.unsettleable'],
        detail: [`Re-settling the stored night throws: ${e instanceof Error ? e.message : String(e)}`],
        claimed: s.verification?.ok ?? null,
      });
      continue;
    }

    rows.push({
      sessionId: s.session_id,
      group: nameOf.get(bookOf.get(s.session_id) ?? '') ?? '—',
      when: startedOf.get(s.session_id) ?? s.computed_at,
      ok: verdict.ok,
      codes: verdict.findings.map((f) => f.code),
      detail: verdict.findings.map((f) => f.detail),
      claimed: s.verification?.ok ?? null,
    });

    if (!verdict.ok) console.error(`  ${s.session_id}: ${summarise(verdict)}`);
  }

  report(rows, unauditable);
  // A non-zero exit is what lets this be wired into anything that watches.
  process.exit(rows.some((r) => !r.ok) ? 1 : 0);
}

/**
 * The night, rebuilt from what was stored with its settlement.
 *
 * The snapshot is the point of the whole design: a settled night can be
 * re-derived years later even if every rule in the group has changed since,
 * because the rules it was settled under travelled with it.
 */
function inputOf(s: SettlementRow): SettlementInput | null {
  const shortfall = s.discrepancy_amount !== 0;

  return inputFromSnapshot(
    s.inputs_snapshot,
    s.rules_snapshot,
    shortfall && s.discrepancy_confirmed_by !== null && s.discrepancy_confirmed_at !== null
      ? {
          amount: s.discrepancy_amount as Money,
          confirmedByUserId: s.discrepancy_confirmed_by,
          confirmedAt: s.discrepancy_confirmed_at,
          ...(s.discrepancy_note === null ? {} : { note: s.discrepancy_note }),
          ...(s.discrepancy_absorbed_by === null
            ? {}
            : { absorbedByPlayerId: s.discrepancy_absorbed_by }),
        }
      : undefined,
  );
}

function report(rows: Row[], unauditable: string[]): void {
  const failed = rows.filter((r) => !r.ok);
  const rate = rows.length === 0 ? 0 : (failed.length / rows.length) * 100;

  const line = '─'.repeat(64);
  console.log(`\n${line}`);
  console.log(' SETTLEMENT AUDIT');
  console.log(line);
  console.log(` Nights checked        ${rows.length}`);
  console.log(` Broken calculations   ${failed.length}`);
  console.log(` Failure rate          ${rate.toFixed(2)}%   (target: 0.00%)`);

  if (unauditable.length > 0) {
    // Never folded into the pass count. A night that cannot be checked is not
    // a night that passed, and reporting it as one is how a number reaches
    // zero without the software getting any better.
    console.log(` Could not be checked  ${unauditable.length}  (no usable inputs snapshot)`);
  }

  // Where the phone and this disagree. Either direction is a real signal: the
  // phone passing something this fails means the device's own check is wrong
  // too, and the reverse means something happened between the table and here.
  const disagreed = rows.filter((r) => r.claimed !== null && r.claimed !== r.ok);
  const unclaimed = rows.filter((r) => r.claimed === null).length;
  if (disagreed.length > 0) {
    console.log(` Phone disagreed       ${disagreed.length}  ← the device's own verdict differs`);
  }
  if (unclaimed > 0) {
    console.log(` No verdict stored     ${unclaimed}  (settled before checks existed)`);
  }

  console.log(line);

  if (failed.length === 0) {
    console.log(' Every stored night re-derives exactly. Nothing to fix.\n');
    return;
  }

  console.log('\n BROKEN NIGHTS\n');
  for (const r of failed) {
    console.log(`  ${r.when.slice(0, 10)}  ${r.group}`);
    console.log(`  session ${r.sessionId}`);
    console.log(`  ${r.codes.join(', ')}`);
    for (const d of r.detail) console.log(`    · ${d}`);
    if (r.claimed === true) {
      console.log('    · THE PHONE PASSED THIS NIGHT. Its own check is wrong as well.');
    }
    console.log('');
  }

  // The codes, counted, so a pattern across nights is visible at a glance —
  // one broken night is an incident, the same code on nine is a bug.
  const counts = new Map<string, number>();
  for (const r of failed) for (const c of r.codes) counts.set(c, (counts.get(c) ?? 0) + 1);

  console.log(' BY CHECK\n');
  for (const [code, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${code}`);
  }
  console.log('');
}

void main().catch((e) => {
  console.error(`audit: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
