import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { RoundTick } from '../src/components/RoundTick';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, tabular, type } from '../src/design/tokens';
import { decideLate, readLate, readLateSources, type LateChange } from '../src/lib/handover';
import { formatMoney } from '../src/lib/money';
import { carriesLate, nameOf, useNight } from '../src/lib/nightStore';
import { explainServerError } from '../src/lib/supabase';

/**
 * Late changes — what another phone recorded on this night after it came
 * back. `design/handoff-game-admin/` state 12b.
 *
 * `0017_nothing_lost.sql` has the why. A phone that held the night and could
 * not send before the night came back hands its changes in instead of losing
 * them, and this is where the phone recording the night decides each one.
 * A PERSON DECIDES because the host may already have recorded the same rebuy
 * again by hand, and adding both is a rebuy nobody made.
 *
 * Undecided rows on top, each with the plan list's round tick; *Tick all* at
 * the section's right, reading *Untick all* once every row is ticked. The
 * primary adds the ticked ones — re-recorded here, in this phone's numbering —
 * and marks the rest LEFT OUT. Decided rows sit below, muted, saying when and
 * which way. Neither is deleted: what is left out stays on record, and the
 * phone that made it reads the same answer.
 *
 * A SHEET, because it ends in a confirm.
 *
 * ⚠ The board's sub-line is marked UNSURE, and so is the title when the
 * changes came from more than one phone, which the board does not draw.
 */
export default function LateChanges() {
  const t = useTheme();
  const night = useNight();
  const sessionId = night?.sessionId ?? null;

  const [rows, setRows] = useState<LateChange[] | null>(null);
  const [sources, setSources] = useState<Map<string, string | null>>(new Map());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    try {
      const [all, from] = await Promise.all([
        readLate(sessionId),
        readLateSources(sessionId).catch(() => new Map<string, string | null>()),
      ]);
      setRows(all);
      setSources(from);
      /* Nothing pre-ticked: the board's Not decided rows start unticked, and
         the primary reads the count. */
      setPicked(new Set());
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
  const tickable = waiting.filter((r) => carriesLate(r.kind) && !settled);
  const adding = tickable.filter((r) => picked.has(r.id)).length;
  const allTicked = tickable.length > 0 && adding === tickable.length;

  /* Whose phone: one name, or the fact that there was more than one. */
  const phones = [...new Set((rows ?? []).map((r) => r.fromUser))];
  const phoneName = (uid: string): string => {
    const name = sources.get(uid);
    return name === undefined || name === null ? 'another phone' : `${name}’s phone`;
  };
  const title =
    phones.length === 1 ? `From ${phoneName(phones[0]!)}` : phones.length > 1 ? 'From other phones' : 'From another phone';

  async function decide() {
    if (busy || sessionId === null || adding === 0) return;
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
      title={title}
      sub="Recorded there after you took the game back. Tick what belongs in the night. Nothing is deleted: what you leave out stays on record."
      sentence
      footer={
        waiting.length === 0 ? (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            label={`Add ${adding} to the night`}
            variant={adding === 0 || busy || settled ? 'blocked' : 'primary'}
            disabled={adding === 0 || busy || settled}
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

        {waiting.length > 0 && (
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>{`Not decided · ${waiting.length}`}</Text>
            {tickable.length > 0 && (
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setPicked(allTicked ? new Set() : new Set(tickable.map((r) => r.id)))}
                style={({ pressed }) => [styles.tickAll, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.tickAllLabel, { color: t.text }]}>{allTicked ? 'Untick all' : 'Tick all'}</Text>
              </Pressable>
            )}
          </View>
        )}
        {waiting.map((r, i) => {
          const can = carriesLate(r.kind) && !settled;
          const on = picked.has(r.id);
          const { label, amount } = describe(r, night, joined);
          return (
            <Pressable
              key={r.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: !can }}
              disabled={!can || busy}
              onPress={() => toggle(r.id)}
              style={[
                styles.row,
                { borderBottomColor: t.hairline, borderBottomWidth: i === waiting.length - 1 ? 0 : StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>{clock(r.queuedAt)}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.what, { color: t.text }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
                  {can ? logged(r, phoneName) : 'a setting · redo it by hand if it is wanted'}
                </Text>
              </View>
              {amount !== null && (
                <Text style={[styles.amount, { color: t.text }]}>{formatMoney(amount)}</Text>
              )}
              <RoundTick on={on} />
            </Pressable>
          );
        })}

        {decided.length > 0 && (
          <View style={[styles.sectionHead, waiting.length > 0 && styles.sectionAfter]}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>{`Decided · ${decided.length}`}</Text>
          </View>
        )}
        {decided.map((r, i) => {
          const { label, amount } = describe(r, night, joined);
          const added = r.status === 'added';
          return (
            <View
              key={r.id}
              style={[
                styles.row,
                { borderBottomColor: t.hairline, borderBottomWidth: i === decided.length - 1 ? 0 : StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.time, { color: t.muted }]}>{clock(r.queuedAt)}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.what, { color: t.muted }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
                  {`${added ? 'added' : 'left out'}${r.decidedAt === null ? '' : ` ${clock(r.decidedAt)}`}`}
                </Text>
              </View>
              {amount !== null && (
                <Text style={[styles.amount, { color: t.muted }]}>{formatMoney(amount)}</Text>
              )}
              <View style={[styles.tag, { borderColor: added ? t.quietOutline : t.amber }]}>
                <Text style={[styles.tagLabel, { color: added ? t.muted : t.amber }]}>
                  {added ? 'ADDED' : 'LEFT OUT'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const ENTRY: Record<string, string> = {
  buyin: 'bought in',
  rebuy: 'rebought',
  cashout: 'cashed out',
  expense: 'paid',
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

/** "logged on Lena's phone" — and for a count, what was logged. */
const logged = (r: LateChange, phone: (uid: string) => string): string =>
  r.kind === 'count.upsert' ? `stack counted on ${phone(r.fromUser)}` : `logged on ${phone(r.fromUser)}`;

/**
 * One row for one change: the label in the words Tonight uses for the same
 * thing, and the figure beside it where there is one.
 */
function describe(
  r: LateChange,
  night: ReturnType<typeof useNight>,
  joined: ReadonlyMap<string, string>,
): { label: string; amount: Money | null } {
  const p = r.payload;
  /* A guest who joined on the other phone is in the list above their buy-in,
     not yet at this table — so their name comes from that row. B94. */
  const who = (id: unknown) =>
    typeof id === 'string' && joined.has(id) && !night?.players.some((x) => x.id === id)
      ? joined.get(id)!
      : nameOf(night, typeof id === 'string' ? id : null);
  switch (r.kind) {
    case 'entry.append': {
      const amount = Number(p.amount ?? 0) as Money;
      const kind = String(p.type);
      if (kind === 'expense') return { label: `${who(p.payerId)} paid${p.note ? ` for ${String(p.note)}` : ''}`, amount };
      if (kind === 'void') return { label: 'An entry voided', amount: null };
      if (kind === 'correction') return { label: 'An entry corrected', amount };
      return { label: `${who(p.playerId)} ${ENTRY[kind] ?? kind}`, amount };
    }
    case 'player.upsert': {
      const name = (p.player as { name?: string } | undefined)?.name ?? 'Someone';
      return { label: `${name} joined the group`, amount: null };
    }
    case 'seat.upsert':
      return { label: `${who(p.playerId)} took a seat`, amount: null };
    case 'count.upsert':
      return { label: `${who(p.playerId)} counted`, amount: Number(p.amount ?? 0) as Money };
    default:
      return { label: SETTING[r.kind] ?? 'A change', amount: null };
  }
}

const clock = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 2 },
  note: { ...type.footnote, paddingBottom: 8 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 6, minHeight: 28 },
  sectionAfter: { paddingTop: 18 },
  sectionLabel: type.sectionLabel,
  /* 600 14, primary text, a 44-point hit area. */
  tickAll: { marginLeft: 'auto', minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  tickAllLabel: { fontSize: 14, fontWeight: '600' },

  /* time (44) · label 600 16 + sub 400 12.5 · amount 700 17 · tick */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  time: { width: 44, fontSize: 13, fontWeight: '600', ...tabular },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  what: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12.5, fontWeight: '400' },
  amount: { fontSize: 17, fontWeight: '700', ...tabular, flexShrink: 0 },
  /* ADDED / LEFT OUT: 700 10.5, .1em tracking, radius 7, an outline never a fill. */
  tag: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 7, borderWidth: 1, flexShrink: 0 },
  tagLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
});
