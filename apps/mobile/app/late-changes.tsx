import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { decideLate, readLate, type LateChange } from '../src/lib/handover';
import { formatMoney } from '../src/lib/money';
import { carriesLate, nameOf, useNight } from '../src/lib/nightStore';
import { explainServerError } from '../src/lib/supabase';

/**
 * Late changes — what another phone recorded on this night after it moved.
 * NOT DRAWN.
 *
 * ⚠ NO HANDOFF HAS THIS SCREEN, and every string on it is mine. Flagged in
 * `docs/screens.md`.
 *
 * `0017_nothing_lost.sql` has the why. A phone that held the night and could
 * not send before the night came back hands its changes in instead of losing
 * them, and this is where the phone recording the night now decides each one.
 * A PERSON DECIDES because the host may already have recorded the same rebuy
 * again by hand, and adding both is a rebuy nobody made.
 *
 * Every waiting change starts ticked if it can be added. The footer adds the
 * ticked ones — re-recorded here, in this phone's numbering — and marks the rest
 * left out. Neither is deleted: the list below keeps showing what was decided,
 * and the phone that made them reads the same answer.
 *
 * A SHEET, because it ends in a confirm.
 */
export default function LateChanges() {
  const t = useTheme();
  const night = useNight();
  const sessionId = night?.sessionId ?? null;

  const [rows, setRows] = useState<LateChange[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    try {
      const all = await readLate(sessionId);
      setRows(all);
      setPicked(new Set(all.filter((r) => r.status === 'waiting' && carriesLate(r.kind)).map((r) => r.id)));
    } catch (e) {
      setTrouble(explainServerError(e));
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Everybody the other phone added, by id, for the rows that name them. */
  const joined = new Map(
    (rows ?? [])
      .filter((r) => r.kind === 'player.upsert')
      .map((r) => r.payload.player as { id: string; name: string } | undefined)
      .filter((x): x is { id: string; name: string } => x !== undefined)
      .map((x) => [x.id, x.name]),
  );
  const waiting = (rows ?? []).filter((r) => r.status === 'waiting');
  const decided = (rows ?? []).filter((r) => r.status !== 'waiting');
  const settled = night?.status === 'settled';
  const adding = waiting.filter((r) => picked.has(r.id)).length;

  async function decide() {
    if (busy || sessionId === null) return;
    setBusy(true);
    setTrouble(null);
    try {
      await decideLate(sessionId, picked);
      router.back();
    } catch (e) {
      setTrouble(explainServerError(e));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setPicked((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Sheet
      title="Late changes"
      sub="Recorded on another phone after the night moved."
      footer={
        waiting.length === 0 ? (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            label={
              adding === 0
                ? `Leave ${waiting.length === 1 ? 'it' : 'them'} out`
                : `Add ${adding} to the night`
            }
            variant="primary"
            disabled={busy || settled}
            onPress={() => void decide()}
          />
        )
      }
    >
      <View style={styles.page}>
        {settled && waiting.length > 0 && (
          <Text style={[styles.note, { color: t.text }]}>
            This night is settled, so nothing more can join it. They stay here, waiting, with who
            made them and when.
          </Text>
        )}
        {trouble !== null && <Text style={[styles.note, { color: t.loss }]}>{trouble}</Text>}
        {rows === null && trouble === null && (
          <Text style={[styles.note, { color: t.muted }]}>Reading them off the server…</Text>
        )}

        {waiting.map((r) => {
          const can = carriesLate(r.kind) && !settled;
          const on = picked.has(r.id);
          return (
            <Pressable
              key={r.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: !can }}
              disabled={!can || busy}
              onPress={() => toggle(r.id)}
              style={[styles.row, { borderBottomColor: t.hairline }]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.what, { color: t.text }]}>{describe(r, night, joined)}</Text>
                <Text style={[styles.when, { color: t.muted }]}>
                  {can ? clock(r.queuedAt) : `${clock(r.queuedAt)} · a setting, redo it by hand if it is wanted`}
                </Text>
              </View>
              <View style={[styles.box, { borderColor: on ? t.text : t.dashed }]}>
                {on && <View style={[styles.tick, { backgroundColor: t.text }]} />}
              </View>
            </Pressable>
          );
        })}

        {decided.length > 0 && (
          <Text style={[styles.eyebrow, { color: t.muted }]}>DECIDED</Text>
        )}
        {decided.map((r) => (
          <View key={r.id} style={[styles.row, { borderBottomColor: t.hairline }]}>
            <View style={styles.rowText}>
              <Text style={[styles.what, { color: t.muted }]}>{describe(r, night, joined)}</Text>
              <Text style={[styles.when, { color: t.muted }]}>
                {`${clock(r.queuedAt)} · ${r.status === 'added' ? 'added' : 'left out'}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const ENTRY: Record<string, string> = {
  buyin: 'bought in',
  rebuy: 'rebought',
  cashout: 'cashed out',
  expense: 'paid for',
  correction: 'correction',
  void: 'an entry voided',
};

const SETTING: Record<string, string> = {
  'session.patch': 'The night’s settings changed',
  'rule.upsert': 'A money rule changed',
  'rule.delete': 'A money rule removed',
  'payment.set': 'A payment ticked',
  'count.delete': 'A count cleared',
  'book.upsert': 'The group’s settings changed',
  'player.terms': 'A player’s terms changed',
};

/** One line for one change, in the words Tonight uses for the same thing. */
function describe(
  r: LateChange,
  night: ReturnType<typeof useNight>,
  joined: ReadonlyMap<string, string>,
): string {
  const p = r.payload;
  /* A guest who joined on the other phone is in the list above their buy-in,
     not yet at this table — so their name comes from that row. B94. */
  const who = (id: unknown) =>
    typeof id === 'string' && joined.has(id) && !night?.players.some((x) => x.id === id)
      ? joined.get(id)!
      : nameOf(night, typeof id === 'string' ? id : null);
  switch (r.kind) {
    case 'entry.append': {
      const amount = formatMoney(Number(p.amount ?? 0) as Money);
      const kind = String(p.type);
      if (kind === 'expense') return `${who(p.payerId)} paid ${amount}${p.note ? ` for ${String(p.note)}` : ''}`;
      if (kind === 'void') return 'An entry voided';
      if (kind === 'correction') return `An entry corrected to ${amount}`;
      return `${who(p.playerId)} ${ENTRY[kind] ?? kind} ${amount}`;
    }
    case 'player.upsert': {
      const name = (p.player as { name?: string } | undefined)?.name ?? 'Someone';
      return `${name} joined the group`;
    }
    case 'seat.upsert':
      return `${who(p.playerId)} took a seat`;
    case 'count.upsert':
      return `${who(p.playerId)} counted ${formatMoney(Number(p.amount ?? 0) as Money)}`;
    default:
      return SETTING[r.kind] ?? 'A change';
  }
}

const clock = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 4 },
  note: { ...type.footnote, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, paddingTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  what: { ...type.body },
  when: { ...type.footnote },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 12, height: 12, borderRadius: 3 },
});
