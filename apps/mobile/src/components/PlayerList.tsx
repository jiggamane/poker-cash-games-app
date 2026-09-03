import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Money } from '@poker-club/core';
import { formatSignedToFit } from '../lib/money';
import { Icon } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, radius, unscaledLabel } from '../design/tokens';

/**
 * The mixed player list — `design/handoff-player-list/`, cut 3 September.
 *
 * Six screens show a list where some players still have money on the table and
 * some are finished, and until this rule they each drew that division their own
 * way: a muted name here, a green check there, a qualifier bolted onto a section
 * label somewhere else. One flag decides it now, and it is the only thing either
 * treatment depends on:
 *
 *     isFinished = counted != null || cashedOut != null
 *
 * **ACTIVE** — still has chips — is a plain hairline row. Full-strength name,
 * the fact beside it, and something to do at the right edge.
 *
 * **FINISHED** — counted or cashed out — is an opaque slab. Muted name, the
 * fact on the same line, the signed result at the right, and NOTHING TAPPABLE:
 * no chevron, no press state, no glyph of any kind — except on the two rows
 * that are this app's only door to a correction, which `FinishedSlab`'s `opens`
 * names and explains.
 *
 * THE SLAB IS WHAT SAYS SETTLED, which is the whole reason the rule pays for
 * itself. The label used to carry the meaning in words — `COUNTED · 3 · RESULT
 * BEFORE DEDUCTIONS`, because the right-hand column changes meaning between an
 * active row and a finished one and nothing else on the row said so. The slab
 * says it, so the label is a name and a count.
 *
 * AND IT DOES NOT RE-OPEN B23. That entry took the win/loss wash off result
 * rows: a translucent green or red band behind a signed figure says in colour
 * what the sign already says. This fill is OPAQUE SURFACE and carries no opinion
 * about winning — `ui-audit.mjs`'s `tinted-result-row` guard fires on a
 * translucent ancestor and skips an opaque one, so the rule and the check agree
 * rather than needing an exception written for it.
 *
 * A SLAB IS 39 TALL AND A ROW IS 44, and that is deliberate rather than
 * incidental: 44 is the minimum hit target and nothing on a slab is a target.
 * The heights say which is which before a word is read.
 */

/** A group header — `COUNTED · 3`. Name and count, and never more. */
export function PlayerGroup({
  label,
  count,
  first = false,
  children,
}: {
  label: string;
  count: number;
  /** No top padding above the first group on a screen. */
  first?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View>
      <Text
        style={[styles.label, first && styles.labelFirst, { color: t.muted }]}
        {...unscaledLabel}
      >
        {`${label} · ${count}`}
      </Text>
      {children}
    </View>
  );
}

/**
 * Somebody who still has chips.
 *
 * THE FACT SITS BESIDE THE NAME, never stacked under it. A two-line row is what
 * a settled row used to look like, and the two treatments have to be told apart
 * at a glance in a list that mixes them.
 */
export function ActiveRow({
  name,
  fact,
  right,
  lead,
  avatar,
  onPress,
  accessibilityLabel,
  last = false,
}: {
  name: string;
  /** What they have in — `in $1,500`, `in $1,000 · 2 buy-ins`. */
  fact: string;
  /** The affordance: a pencil, a figure and a chevron, or a chevron alone. */
  right?: ReactNode;
  /** A rank column's placeholder, where the screen has one. */
  lead?: ReactNode;
  /** An initial in a circle, on the one sheet that draws them. */
  avatar?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** The list closes on the group below it rather than on a rule. */
  last?: boolean;
}) {
  const t = useTheme();

  const body = (
    <>
      {lead}
      {avatar !== undefined && (
        <View style={[styles.avatar, { backgroundColor: t.surface }]}>
          <Text style={[styles.initial, { color: t.muted }]}>{avatar}</Text>
        </View>
      )}
      <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.fact, { color: t.dim }]} numberOfLines={1}>
        {fact}
      </Text>
      {right}
    </>
  );

  const frame = [
    styles.row,
    { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
  ];

  /* Not a Pressable when there is nothing to press. A disabled one still
     announces itself to a screen reader as a control that is unavailable, and
     these rows are not controls at all on the screens that read them. */
  if (onPress === undefined) return <View style={frame}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      onPress={onPress}
      style={({ pressed }) => [...frame, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/**
 * Somebody who is finished — counted, or gone.
 *
 * NOTHING ON IT IS TAPPABLE unless the screen asks, and `opens` is how it asks
 * — a prop passed by name on two rows in the whole app rather than a default
 * any list can fall into.
 *
 * THE HANDOFF SAYS NEVER, on the grounds that a finished row has nothing left
 * to open, and it is right about the rows it was drawn against: a ranked player
 * on E2b, a name in a picker that has already been picked, a stack whose figure
 * belongs to another screen. It was not drawn against THIS app's corrections.
 * The ledger is append-only, so a wrong figure is fixed by entering it again,
 * and two rows are the only door to the screen that does that:
 *
 *   - **a counted stack on E2** reopens the keypad it was typed on. Without it
 *     E5's `Fix` — the app's one recovery path — hands the host back to a
 *     screen with every row counted and nothing on it to change.
 *   - **a cashed-out player on Tonight** reopens their card. `/player` is the
 *     only route to `/entry` anywhere, and the roster opens `/member`, the club
 *     record, not the night's card.
 *
 * The rule the two share is A FIGURE IS FIXED WHERE IT WAS ENTERED, which is
 * also why `CASHED OUT EARLIER` on E2 does *not* open: that figure was typed on
 * Tonight, and Tonight's slab is the one that reopens it.
 *
 * A SLAB THAT OPENS SOMETHING KEEPS THE CHEVRON AND GROWS TO 44. Both, or
 * neither: 39 is under the hit minimum precisely because nothing on a slab is a
 * target, and a tap area with no glyph over it is worse than the chevron the
 * rule was trying to remove. `docs/screens.md` carries both deviations and the
 * question they are waiting on.
 */
export function FinishedSlab({
  name,
  fact,
  result,
  lead,
  fits,
  opens,
  accessibilityLabel,
}: {
  name: string;
  /** Whatever finished them — `counted $960`, `23:15`, `23:15 · out $2,120`. */
  fact: string;
  result: Money;
  /** A rank numeral, where the screen ranks them. */
  lead?: ReactNode;
  /** Where the figure starts abbreviating, from the screen's own measurement. */
  fits: number;
  /** Two rows in the app — see above. Brings a chevron and the 44 with it. */
  opens?: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();

  const body = (
    <>
      {lead}
      <Text style={[styles.name, { color: t.muted }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.fact, { color: t.dim }]} numberOfLines={1}>
        {fact}
      </Text>
      {/* Never shrinks: the name and the fact may give, a figure may not — B16
          is a result that came apart across two lines on a list like this. */}
      <Text
        style={[styles.result, { color: moneyColor(t, result) }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {formatSignedToFit(result, fits)}
      </Text>
      {opens !== undefined && <Icon name="chevron" color={t.muted} />}
    </>
  );

  if (opens === undefined) {
    return <View style={[styles.slab, { backgroundColor: t.surface }]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      onPress={opens}
      style={({ pressed }) => [
        styles.slab,
        styles.slabOpens,
        { backgroundColor: t.surface, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {body}
    </Pressable>
  );
}

/** The fixed 16-point column a rank numeral or its em dash sits in. */
export function Rank({ n }: { n?: number }) {
  const t = useTheme();
  return (
    <Text style={[styles.rank, { color: t.dim }]} numberOfLines={1}>
      {n === undefined ? '—' : n}
    </Text>
  );
}

const styles = StyleSheet.create({
  /* `10 0 4`, and nothing above the first group on the screen. */
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingTop: 10,
    paddingBottom: 4,
  },
  labelFirst: { paddingTop: 0 },

  /* `10 0`, 44 tall, a hairline under each row. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
    minHeight: 44,
  },

  /*
   * `8 14`, radius 8, 5 between slabs, 39 tall — under the 44 minimum on
   * purpose, because nothing on a slab is a hit target.
   */
  slab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 5,
    minHeight: 39,
    borderRadius: radius.pressable,
  },
  /* The one slab that is a target takes the target's height. See `opens`. */
  slabOpens: { minHeight: 44 },

  /*
   * THE NAME IS THE ONLY THING ON THE ROW THAT GIVES, and that is the same
   * order of priority `ledger.tsx` states for its columns: a figure may not
   * ellipsise, a name may. Both used to shrink, which meant a long fact took
   * its shortfall out of the fact — `counted $12,880` came to 116 points in a
   * 109-point box at 120% text and lost its last digit, on the screen whose
   * job is stacks. A truncated name is legible; a truncated stack is a
   * different number.
   */
  name: { fontSize: 17, fontWeight: '700', flexShrink: 1, minWidth: 0 },
  fact: { fontSize: 13, fontWeight: '400', flexShrink: 0 },
  result: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 19,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rank: { width: 16, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 15, fontWeight: '700' },
});
