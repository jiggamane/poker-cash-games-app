import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { block, space, type } from '../design/tokens';
import type { Membership, Tier } from '../lib/membership';
import { RoundTick } from './RoundTick';

/**
 * The membership gates on opening a game — `design/handoff-game-admin/` § 04,
 * states 13, 14 and 15. All three are drawn in O1's slot: 13 and 15 replace
 * the sheet's content, 14 is one note block on top of O1 as it is.
 *
 * NONE OF THIS IS REACHABLE TODAY. The seam (`membership.ts`) answers Full for
 * everybody, so `/new-night` never draws a gate; the screens exist so the day
 * it answers otherwise the app already says the right thing. What the primary
 * would do — buy a plan — is Stage 4 of `docs/accounts-roadmap.md` and is not
 * built; the button is drawn in its blocked state and says so in the code.
 *
 * THE PLAN LIST is X2b's rule 17: ascending, the reader's own plan first,
 * muted, an outline check, INCLUDED — nothing paid pre-ticked, so the primary
 * starts disabled. State 15 breaks it once, on purpose: Free is left out
 * because it sits below what the reader already pays for, and Regular is
 * drawn as already theirs with a YOURS tag, because INCLUDED would read as
 * free. ⚠ "YOURS", "Wait for 1 October", Full's second clause and the lapsed
 * line on home are UNSURE on the board.
 */
export type Gate = 'free' | 'regular_used';

const PLANS: Array<{ tier: Tier; name: string; price: string; body: string }> = [
  { tier: 'free', name: 'Free', price: '$0', body: 'Tonight, and the last three games.' },
  {
    tier: 'regular',
    name: 'Regular',
    price: '$2.49 / mo',
    body: 'Every night in the book, the ones you missed included, and one night as host each month.',
  },
  {
    tier: 'full',
    name: 'Full',
    price: '$9.99 / mo',
    body: 'Everything in Regular, and you run games as often as you like.',
  },
];

export function PlanGate({
  gate,
  own,
  passedGames,
  picked,
  onPick,
}: {
  gate: Gate;
  /** The reader's own membership, drawn as already theirs. */
  own: Membership;
  /** How many games other people have passed to this phone — state 13's lead. */
  passedGames: number;
  picked: Tier | null;
  onPick: (t: Tier) => void;
}) {
  const t = useTheme();
  const rows = gate === 'regular_used' ? PLANS.filter((p) => p.tier !== 'free') : PLANS;
  return (
    <View style={styles.page}>
      {gate === 'free' && passedGames > 0 && (
        <Text style={[styles.lead, { color: t.text }]}>
          {`You’ve recorded ${count(passedGames)} ${passedGames === 1 ? 'game' : 'games'} others passed to you. Full lets you open your own.`}
        </Text>
      )}

      <View style={styles.list}>
        {rows.map((p, i) => {
          const yours = p.tier === own.tier;
          const on = picked === p.tier;
          return (
            <Pressable
              key={p.tier}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: yours }}
              disabled={yours}
              onPress={() => onPick(p.tier)}
              style={[
                styles.row,
                { borderBottomColor: t.hairline, borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth },
              ]}
            >
              <View style={styles.rowText}>
                <View style={styles.nameLine}>
                  <Text style={[styles.name, { color: yours ? t.muted : t.text }]}>{p.name}</Text>
                  {yours && (
                    <View style={[styles.tag, { borderColor: t.quietOutline }]}>
                      <Text style={[styles.tagLabel, { color: t.muted }]}>
                        {gate === 'regular_used' ? 'YOURS' : 'INCLUDED'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.price, { color: yours ? t.muted : t.text }]}>{p.price}</Text>
                </View>
                <Text style={[styles.body, { color: t.muted }]}>{p.body}</Text>
              </View>
              <RoundTick on={on} />
            </Pressable>
          );
        })}
      </View>

      {gate === 'regular_used' && (
        <Text style={[styles.foot, { color: t.muted }]}>
          You can still watch any game and see its money live.
        </Text>
      )}
    </View>
  );
}

/**
 * State 14 — the one note block on top of O1 for a Regular whose host night
 * is free: what opening costs, when it comes back, and what Full adds.
 */
export function PlanNote({
  renewsOn,
  onSeeFull,
}: {
  renewsOn: Date | null;
  onSeeFull: () => void;
}) {
  const t = useTheme();
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const back = renewsOn === null ? '—' : renewsOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return (
    <View style={[styles.note, { backgroundColor: t.surface }]}>
      <Text style={[styles.noteText, { color: t.text }]}>
        {`This game uses your host night for ${month}. The next one comes back on ${back}.`}
      </Text>
      <Text style={[styles.noteText, { color: t.muted }]}>
        Full runs a game any night, $9.99 / mo.{' '}
        <Text accessibilityRole="link" style={[styles.link, { color: t.text }]} onPress={onSeeFull}>
          See Full
        </Text>
      </Text>
    </View>
  );
}

const count = (n: number): string => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 16 },
  lead: { ...type.lede },
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600' },
  price: { fontSize: 15, fontWeight: '600', marginLeft: 'auto', ...({ fontVariant: ['tabular-nums'] } as const) },
  body: { fontSize: 12.5, fontWeight: '400', lineHeight: 18 },
  tag: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 7, borderWidth: 1 },
  tagLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
  foot: { ...type.footnote },
  note: {
    marginHorizontal: space.card,
    marginBottom: 14,
    padding: block.padV,
    paddingHorizontal: block.padH,
    borderRadius: block.radius,
    gap: block.gap,
  },
  noteText: { fontSize: 13.5, fontWeight: '400', lineHeight: 20 },
  link: { fontWeight: '600' },
});
