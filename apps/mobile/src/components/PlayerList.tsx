import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import type { Money } from '@poker-club/core';
import { formatSignedToFit } from '../lib/money';
import { Card, SectionLabel } from './Card';
import { Icon, type IconName } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { z } from '../design/scale';
import { cappedFigure } from '../design/tokens';

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
 *
 * ⚠ THE FULL BOARD (`design/explorations/full-board/`, `count-up*`, approved
 * 24 November) REDRAWS ALL OF THE ABOVE, and this file now draws the board.
 * Each group is a section label over ONE LIFTED CARD, and every row
 * in it — still to count or counted — is the settled night's two-line row
 * (owner, 24 November: "apply the player list style we have"): the name, and
 * under it the fact with its icon (chips in, chips out, cashed out). There is
 * no slab and no chevron anywhere; what says a row is finished is the group it
 * sits in and the signed result at its right, where a row still to count has
 * an em dash and a pencil. Every row is 44 at least, so the tap target rule
 * holds for the rows that open the keypad without a second height. The
 * component names are kept (`FinishedSlab` is no longer a slab) so the one
 * screen that uses them reads as it did.
 */

/** A group header — `COUNTED · 3` — over the card its rows sit in. */
export function PlayerGroup({
  label,
  count,
  first: _first = false,
  children,
}: {
  label: string;
  count: number;
  /** Kept for the callers; the column's own gap spaces the groups now. */
  first?: boolean;
  children: ReactNode;
}) {
  /* GROUPS NEVER DISAPPEAR: an empty one keeps its `· 0` label, and only the
     card goes, since an empty lifted card is a box with nothing in it. */
  const empty = Children.toArray(children).length === 0;
  return (
    <View style={styles.group}>
      <SectionLabel text={`${label} · ${count}`} />
      {!empty && <Card>{children}</Card>}
    </View>
  );
}

/**
 * The fact under the name, with its icon — the settled night's second line.
 * The icon says which kind of fact it is (chips in, chips out, cashed out) at
 * the board's 13 and a little under the muted colour's strength.
 */
function Fact({ icon, fact }: { icon: IconName; fact: string }) {
  const t = useTheme();
  return (
    <View style={styles.factLine}>
      <View style={styles.factIcon}>
        <Icon name={icon} color={t.muted} size={z(13)} />
      </View>
      {/* The fact gives before anything at the right does; on its own line it
          has the row's width less the figure, which is more than the longest
          `counted $2.4M` at 360 and 120% text needs. */}
      <Text style={[styles.fact, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
        {fact}
      </Text>
    </View>
  );
}

/**
 * Somebody who still has chips.
 *
 * TWO LINES since the full board (owner, 24 November): the name, and the fact
 * under it. It used to sit beside the name so an active row and a slab could
 * be told apart at a glance; the card and the em dash at the right do that now.
 */
export function ActiveRow({
  name,
  fact,
  icon = 'chipsIn',
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
  /** The fact's icon. Chips in, unless the screen says otherwise. */
  icon?: IconName;
  /** The affordance: a pencil, a figure, or an em dash and a pencil. */
  right?: ReactNode;
  /** A rank column's placeholder, where the screen has one. */
  lead?: ReactNode;
  /** An initial in a circle, on the one sheet that draws them. */
  avatar?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** The last row in its card draws no hairline under it. */
  last?: boolean;
}) {
  const t = useTheme();

  const body = (
    <>
      {lead}
      {avatar !== undefined && (
        <View style={[styles.avatar, { backgroundColor: t.raised }]}>
          <Text style={[styles.initial, { color: t.muted }]}>{avatar}</Text>
        </View>
      )}
      <View style={styles.words}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Fact icon={icon} fact={fact} />
      </View>
      {right}
    </>
  );

  const frame = [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }];

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
 * — a prop passed by name rather than a default any list can fall into.
 *
 * THE HANDOFF SAYS NEVER, on the grounds that a finished row has nothing left
 * to open, and it is right about the rows it was drawn against. It was not
 * drawn against THIS app's corrections. The ledger is append-only, so a wrong
 * figure is fixed by entering it again, and a counted stack on E2 reopens the
 * keypad it was typed on. Without it E5's `Fix` — the app's one recovery path
 * — hands the host back to a screen with every row counted and nothing on it
 * to change.
 *
 * The rule is A FIGURE IS FIXED WHERE IT WAS ENTERED, which is also why a
 * cashed-out row on E2 does *not* open: that figure was typed on Tonight, and
 * Tonight is where it is retyped. The row says which kind it is in its fact —
 * `counted $960` against `cashed out 17:17`, each with its own icon.
 *
 * NO CHEVRON ON THE ONE THAT OPENS, since the full board: nothing in the look
 * points (Fresh Deck, kept by the board). It was a chevron and a taller slab
 * until 24 November; every row is 44 now, so the target rule holds without it.
 */
export function FinishedSlab({
  name,
  fact,
  icon,
  result,
  lead,
  fits,
  opens,
  accessibilityLabel,
  last = false,
}: {
  name: string;
  /** Whatever finished them — `counted $960`, `cashed out 23:15`. */
  fact: string;
  /** The fact's icon. Read off the fact when left out: cashed out, or chips out. */
  icon?: IconName;
  result: Money;
  /** A rank numeral, where the screen ranks them. */
  lead?: ReactNode;
  /** Where the figure starts abbreviating, from the screen's own measurement. */
  fits: number;
  /** Reopens where the figure was entered — see above. */
  opens?: () => void;
  accessibilityLabel?: string;
  /** The last row in its card draws no hairline under it. */
  last?: boolean;
}) {
  const t = useTheme();

  const body = (
    <>
      {lead}
      {/* THE NAME IS IN FULL TEXT COLOUR, NOT MUTED — owner, 17 November, on
          E2 Count up and then on Tonight. Once a night is mostly or wholly
          finished the list is all finished rows, and a column of muted names
          left nothing on it to read by. */}
      <View style={styles.words}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Fact icon={icon ?? (fact.startsWith('cashed') ? 'cashOut' : 'chipsOut')} fact={fact} />
      </View>
      {/* Never shrinks: the name and the fact may give, a figure may not — B16
          is a result that came apart across two lines on a list like this. */}
      <Text
        style={[styles.result, { color: moneyColor(t, result) }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {formatSignedToFit(result, fits)}
      </Text>
    </>
  );

  const frame = [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }];

  if (opens === undefined) return <View style={frame}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      onPress={opens}
      style={({ pressed }) => [...frame, { opacity: pressed ? 0.6 : 1 }]}
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
  /* The label and its card, the board's 12 apart. */
  group: { gap: z(12) },

  /* The kit's `.row`: 44 at least, `8 0`, a hairline under every row but the last. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    paddingVertical: z(8),
    minHeight: z(44),
  },

  /*
   * THE WORDS ARE THE ONLY THING ON THE ROW THAT GIVES, and that is the same
   * order of priority every list here states: a figure may not ellipsise, a
   * name may. A truncated name is legible; a truncated stack is a different
   * number.
   */
  words: { flex: 1, minWidth: 0 },
  name: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6) },
  /* The board's `who()`: 4 under the name, the icon 4 from the words. */
  factLine: { flexDirection: 'row', alignItems: 'center', gap: z(4), marginTop: z(4) },
  factIcon: { opacity: 0.8 },
  fact: { fontSize: z(12), fontWeight: '400', lineHeight: z(15), flexShrink: 1 },
  result: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    lineHeight: z(18.2),
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  rank: { width: 16, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  avatar: { width: z(36), height: z(36), borderRadius: z(18), alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: z(15), fontWeight: '700' },
});
