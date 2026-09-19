import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  balanceCheck,
  resolveLedger,
  ruleOutcomes,
  settledRows,
  type SettledMode,
  type StoredVerification,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import {
  ChipsBlock,
  DeductionsBlock,
  MENU_DIM,
  SessionRow,
  ViewControl,
} from '../src/components/SessionViews';
import { useTheme } from '../src/design/useTheme';
import { radius, space, unscaledLabel } from '../src/design/tokens';
import { nightSpan } from '../src/lib/elapsed';
import { setSessionView, useSessionView } from '../src/lib/sessionViewStore';
import { settlementOf, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * THE PAST SESSION — `design/handoff-session-views/`, frames `10a`–`10d`, cut
 * 9 September. It supersedes the 8 September score-breakdown cut and the
 * 6 September game-end cut on this screen, and nothing else on any other.
 *
 * ONE screen for two situations, and that has not changed: the night you have
 * just closed, and a night you open from Sessions three weeks later. They are
 * the same facts, so they are the same screen. It is a PUSH and stays one.
 *
 * ONE LIST READ THREE WAYS, and the control that switches them sits on the meta
 * line. The rank line never moves between views — only the annotation under
 * each name, the block under the table and the footer button. That is the
 * cut's central claim and `SessionViews.tsx` is where it is kept.
 *
 *   FINAL, DETAILED  the settled net over `game` and every spend itemised.
 *                    Default, and the one view that does not draw the two
 *                    stacks — see `GameTerm` in `SessionViews.tsx`.
 *   FINAL, GROUPED   the same nets, spends collapsed to one figure.
 *   ON TABLE         cash-out less buy-in, before any spend. Sums to zero.
 *
 * WHAT CAME OFF THE SCREEN TO MAKE ROOM, because eight players have to fit
 * without scrolling and the cut says so:
 *
 *   · THE TOTALS CARD. `Money in play $5,000` with the amount still to move
 *     beside it. Its two figures are both on the screen still — the money in is
 *     the `CHIPS` block's own `In` row, and what is left to move is the whole
 *     subject of `/payments`, which the footer button opens. A card at the top
 *     of a ranked list is 96 points spent on a heading.
 *   · THE DEDUCTIONS LEDGER, which became the block under the table: the same
 *     rows, one line each instead of three, under the list instead of over it.
 *   · THE SEGMENTED CONTROL, which held two of the three views and could not
 *     hold the third.
 *
 * WHAT IS NOT DRAWN THAT THE HANDOFF DRAWS: `Share`, in the top-right. The cut
 * argues the slot is allowed here because the screen is a destination rather
 * than a wizard step. `docs/09-navigation.md` is FINAL on chrome and says a
 * pushed screen has nothing at all in that corner — and `CLAUDE.md` gives it
 * the last word over anything drawn. It is also a control with nowhere to
 * point: `/share` is one person's share of one rule, and the watcher link
 * lives in Settings. Recorded in `docs/screens.md`.
 */
export default function NightResults() {
  const night = useNight();
  /*
   * THE VIEW IS THE READER'S, NOT THE NIGHT'S — the handoff's own rule:
   * *"the chosen view persists per user, not per session"*. Somebody who reads
   * their nights one way reads all of them that way, so it comes off a store
   * rather than a `useState` that forgets between sessions.
   */
  const view = useSessionView();
  /* The menu's own state, held here rather than in the control: while it is up
     the list and the block drop to 32%, and neither is the control's to dim. */
  const [menuOpen, setMenuOpen] = useState(false);
  /* Both Final views print the same nets off the same rows; only the
     annotation differs, so the engine is asked for two modes and not three. */
  const mode: SettledMode = view === 'onTable' ? 'table' : 'final';

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settlementOf(night);
    } catch {
      return null;
    }
  }, [night]);

  const rows = useMemo(
    () => (result === null ? [] : settledRows(result, mode)),
    [result, mode],
  );

  /*
   * THE CHIPS BLOCK'S FIGURES AND COUNTS, and every one of them is
   * `balanceCheck`'s — the same call E2 draws its own block from, so the two
   * screens cannot disagree about what went in and what came back. `seated` is
   * who still had chips in front of them, which the ledger alone cannot say.
   */
  const balance = useMemo(() => {
    if (night === null) return null;
    const ledger = resolveLedger(night.entries);
    const seated = standingsOf(night, ledger).filter((s) => s.played && s.atTable);
    return balanceCheck(
      ledger,
      night.finalCounts,
      seated.map((s) => s.id),
    );
  }, [night]);

  if (night === null) {
    return (
      <Screen title="The night" backTo="the club" headScroll="all">
        {null}
      </Screen>
    );
  }

  if (result === null || balance === null) {
    return (
      <Screen
        title="Not settled"
        backTo="the club"
        headScroll="all"
        lede="This night was never closed. Count everyone up and settle it to see the record."
        footer={
          <Button label="Open the night" variant="primary" onPress={() => router.replace('/session')} />
        }
      >
        {null}
      </Screen>
    );
  }

  const onTable = view === 'onTable';
  const outcomes = ruleOutcomes(result);

  return (
    <Screen
      title={nightDate(night.startedAt)}
      meta={metaLine(night)}
      /* THE CONTROL SHARES THE META LINE — the handoff puts it there rather
         than under it, because it is the state of the list rather than a
         heading for it. */
      metaTrailing={
        <ViewControl
          view={view}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onPick={setSessionView}
        />
      }
      backTo="the club"
      /*
       * THE HEAD GOES DOWN WITH THE BODY — `headScroll="all"`, the same one
       * `/players` is on, and for the same reason it was built.
       *
       * This screen is a ranked list and the ranking is the content. The head
       * is 97 points of it — a 32-point date, the meta line under it, and the
       * back button — pinned over a list that at eight players wants every
       * point there is. Nothing in those 97 changes while you read: the date is
       * the one thing you already knew when you opened the night, and back is
       * one flick away rather than gone.
       *
       * Registered in `ui-audit.mjs`'s `HEAD_SCROLLS`, which is a two-way
       * check: a route on that map has to actually scroll its head, and a route
       * off it may not. Doc 15 § 5 check 1 is the rule this is the documented
       * exception to.
       */
      headScroll="all"
      /*
       * THE FOOTER BUTTON IS THE VIEW'S. On Final it is the one thing this
       * screen leads to; on At table it leads back to the answer, because a
       * column that sums to zero is a check rather than a result and the cut
       * gives the reader the way out of it.
       *
       * OUTLINED, NOT FILLED — `10a`'s own 1px at 16% white. This screen is a
       * record being read rather than a step being completed, and a filled
       * button on it reads as the next thing to do.
       */
      footer={
        onTable ? (
          <Button
            label="See the final result"
            variant="secondary"
            onPress={() => setSessionView('finalDetailed')}
          />
        ) : (
          <Button
            label="Who pays whom"
            variant="secondary"
            onPress={() => router.push('/payments')}
          />
        )
      }
    >
      <DidNotCheckOut verdict={night.verification} />

      {/*
       * THE LIST, AND NOTHING BETWEEN ITS ROWS. No hairline, no chevron, no
       * fill — separation is the 60-point row alone, which is the cut's own
       * central point about the version this replaces.
       *
       * THE RANK IS THE LIST'S POSITION and not a figure anybody computed:
       * `settledRows` sorts on the figure the row prints, so the order differs
       * between Final and At table by design and the number simply follows it.
       */}
      {/*
       * EVERYTHING BEHIND THE MENU DROPS TO 32% — the handoff's own figure, and
       * it stops at the chrome: the title, the meta line and the control keep
       * full brightness, because the control is what the menu belongs to and a
       * dimmed control would read as disabled at the moment it is being used.
       *
       * AND THE DIMMED HALF STOPS ANSWERING TAPS. A row under an open menu is
       * still a row, and tapping one would open a player from behind a control
       * the reader was in the middle of using.
       *
       * WHAT CLOSES IT IS THE CONTROL'S OWN BACKDROP — `Dropdown`, B77 — and
       * not anything on this screen. This block used to lay a `Pressable` over
       * its own list for that, which covered the list and nothing else: not the
       * meta line, not the title row, not the band under the table. It could
       * not have worked where it was either, because `box-only` above is what
       * makes the dimmed half deaf and a child of a deaf box is deaf too — the
       * computed `pointer-events` on it was `none`. It is gone; the 32% and the
       * deafness are this screen's, and dismissal is the control's.
       */}
      <View style={menuOpen && { opacity: MENU_DIM }} pointerEvents={menuOpen ? 'box-only' : 'auto'}>
        <View style={styles.list}>
          {rows.map((row, i) => (
            <SessionRow
              key={row.player.playerId}
              rank={i + 1}
              row={row}
              view={view}
              onPress={() =>
                router.push({ pathname: '/player', params: { id: row.player.playerId } })
              }
              onSpends={() => router.push('/deductions')}
            />
          ))}
        </View>

        {onTable ? (
          <ChipsBlock balance={balance} offTable={result.totalOffTable} />
        ) : (
          <DeductionsBlock outcomes={outcomes} total={result.totalOffTable} />
        )}
      </View>

      {/*
       * THE STEP IS SHOWN AND NOT SETTABLE. It is locked once the night is
       * closed — every figure above was derived at it, and a record that could
       * be re-rounded afterwards is a record that does not say what anybody
       * paid. No `onPress`, so `RoundingBar` draws no chevron.
       *
       * FINAL ONLY. At table is `out − in`, which the step does not reach.
       */}
      {!onTable && night.roundingMode !== null && night.roundingMode !== undefined && (
        <RoundingBar mode={night.roundingMode} style={styles.rounding} />
      )}
    </Screen>
  );
}

/**
 * The night failed its own arithmetic check.
 *
 * ABOVE EVERYTHING, IN RED, AND IT DOES NOT BLOCK ANYTHING —
 * `docs/verification.md`, *What happens when a night fails*, which is where
 * both the behaviour and this exact sentence come from. The room is standing up
 * to leave; refusing to draw the night would leave the host with no result at
 * all and nowhere to put the evening. So the figures are shown, and they are
 * shown with the thing that says not to act on them.
 *
 * A wrong number that announces itself is recoverable. A wrong number that
 * looks right is not, and that is the whole of the reasoning.
 *
 * `verifyNight()` re-derives every identity from the raw ledger rather than
 * asking the engine whether the engine was right, so a verdict here is not "the
 * figures look odd" — it is an identity that cannot be false about a correct
 * night. Absent on a night closed before the check was wired up (B54), which is
 * why this draws nothing rather than reassuring anybody about a night it knows
 * nothing about.
 */
function DidNotCheckOut({ verdict }: { verdict?: StoredVerification }) {
  const t = useTheme();
  if (verdict === undefined || verdict.ok) return null;

  return (
    <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
      <Text style={[styles.alertLabel, { color: t.danger }]} {...unscaledLabel}>
        Did not check out
      </Text>
      <Text style={[styles.alertBody, { color: t.text }]}>
        These figures did not check out — do not settle up from this screen.
      </Text>
      {/* The codes, not the prose: they are what a bug report is filed on, and
          `Finding.code` is stable and greppable for exactly that. The full
          detail is stored with the night and read by `npm run audit`. */}
      <Text style={[styles.alertCodes, { color: t.muted }]} numberOfLines={2}>
        {verdict.codes.join(' · ')}
      </Text>
    </View>
  );
}

/*
 * WHAT WAS HERE, AND WHERE IT WENT — three helpers, all replaced by the
 * 9 September cut rather than deleted for tidiness.
 *
 *   `Deductions`  the ledger of rules above the list. It is the block UNDER
 *                 the table now, one line per rule instead of three, drawn by
 *                 `SessionViews.tsx`. `payerNote` went with it: the same
 *                 sentence is `holder()` there, in the handoff's own grammar
 *                 (`Dana fronted`).
 *   `List`        the ranked list with a hairline over every row. The rows are
 *                 `SessionRow` and the hairlines are gone on purpose — the
 *                 cut's own point about the version this replaces.
 *   `Note`        the sentence under the list. On Final the block says who
 *                 fronted each bill on its own rows, which is what the note
 *                 was promising; on At table it is the block's footnote.
 */

/**
 * "20:05 → 06:38" — when the table opened and when it closed.
 *
 * ⚠ THIS LINE HAS BEEN CUT TWICE AND THIS IS THE CUT THAT HOLDS. It read
 * `20:05 → 06:38 · 10h 46m · 7 players · settled` until 9 September, when the
 * session-views cut put the view control on this row and left the text about
 * 200 points; the two times came off and it became `Settled · 3h 40m · 8
 * players`. At a ten-hour night with eight players THAT still ran past the
 * control and lost the count mid-word — B81, photographed on a phone.
 *
 * So the fix is not a fourth arrangement of terms. Every term but a wall clock
 * grows with the night's own figures — the elapsed gains a digit at a hundred
 * hours, the count at ten seats, and a longer currency takes the rest — while
 * two clocks are thirteen characters at every night this app can record. The
 * line is the times and nothing else, and it cannot come back.
 *
 * WHAT WENT IS STILL ON THE SCREEN. The span between the two times is the
 * elapsed figure; the list underneath is the players, one row each. The status
 * word was unreachable from here — a night with no result gets the *Not
 * settled* screen above, with its own lede — so `Not closed yet` was a string
 * this line could not draw. `/log` has every stamp, entry by entry.
 *
 * `nightSpan` is the whole of it, and it is `elapsed.ts`'s so that the clock
 * here is the clock every other screen prints. This screen's own `elapsed`
 * helper went with the figure it formatted.
 */
function metaLine(night: NonNullable<ReturnType<typeof useNight>>): string {
  const stamps = Object.values(night.occurredAt);
  const last = stamps.length === 0 ? null : stamps.reduce((a, b) => (a > b ? a : b));
  /* The close is the night's own stamp, and the last thing that happened at
     the table when it has none. */
  return nightSpan(night.startedAt, night.endedAt ?? last);
}

/* "Sat 29 Aug". SHORT, so the title holds one line at full width. */
const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/*
 * The net at 19/700, with the name and the spend line taking the rest of the
 * row. The same threshold `NightResult`'s rows use, and for the same reason:
 * everything under seven figures is drawn in full, and a night past that gets
 * a compact figure rather than a clipped one.
 */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  /*
   * THE FAILED-CHECK BLOCK, measured off E5's *Out of balance* alert rather
   * than drawn again: the two say the same kind of thing — this night does not
   * add up, here is what is wrong — and two shapes for one meaning is how a
   * reader stops recognising either.
   */
  alert: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  alertBody: { fontSize: 13.5, fontWeight: '400', lineHeight: 20.25 },
  alertCodes: { fontSize: 11.5, fontWeight: '400', lineHeight: 16 },

  /*
   * THE LIST, AND EVERYTHING ELSE ON THE SCREEN, IS `SessionViews.tsx`'S — the
   * row, the view control, both blocks and the geometry of all three. What is
   * left here is the two things that belong to this route rather than to the
   * cut: the alarm above the list, and the step below it.
   *
   * The list itself needs one number. Side margin 22, and no gap: the rows are
   * 60 tall and their own height is the separation, so anything added here
   * would be the fencing the cut removed, in another form.
   */
  list: { marginHorizontal: space.page },

  rounding: { marginTop: 10 },
});
