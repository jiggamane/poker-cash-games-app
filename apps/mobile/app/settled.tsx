import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { gameResults, resolveLedger, settle } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { NightResult } from '../src/components/NightResult';
import { Screen } from '../src/components/Screen';
import { space } from '../src/design/tokens';
import { settlementInput, useNight } from '../src/lib/nightStore';

/**
 * The night, settled — `R1 · Results`, from
 * `design_handoff_rebuy_and_results/Game Results Breakdown.dc.html`, cut
 * 5 September, which supersedes `design/handoff-four-screens/` on this screen.
 *
 * ONE screen for two situations: the night you have just closed, and a night
 * you open from a list three weeks later. They are the same facts, so they are
 * the same screen.
 *
 * WHAT THE NEW CUT CHANGED is in `NightResult.tsx`, which draws the body: the
 * deductions are folded back into each person's figure and the working is
 * printed under their name. What is left here is the frame — the date, when the
 * night ran, and the one way onward.
 *
 * The screen is a PUSH and stays one: a settled night is a place you stay and
 * read rather than something you confirm and dismiss, and `09-navigation.md`
 * puts exactly that on the push side of the line.
 *
 * ⚠ THE BOARD DRAWS A **Share** CONTROL IN THE TOP-RIGHT, AND IT IS NOT BUILT.
 * `09-navigation.md` is unambiguous — *"Right corner: **Empty.** No actions, no
 * overflow menu, no icons"* — and it says why: which chrome is on screen is the
 * only thing telling a person whether to swipe down or tap back, so a pushed
 * screen with a control up there is a screen speaking both vocabularies at
 * once. Two icons that used to sit in that corner on the night screen were
 * removed for exactly this. It is a behaviour rule, the spec wins on behaviour,
 * and where a control may live is not layout. So the corner stays empty —
 * `Screen` has no way to put a control there in any case, and its `trailing`
 * slot forbids one by name — and sharing a settled night has no door drawn
 * anywhere else. Recorded in `docs/screens.md` as open, rather than invented as
 * a footer button no board draws.
 */
export default function NightResults() {
  const night = useNight();

  const ledger = useMemo(
    () => (night === null ? null : resolveLedger(night.entries)),
    [night],
  );

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  if (night === null || ledger === null) {
    return (
      <Screen title="The night" backTo="the club">
        {null}
      </Screen>
    );
  }

  if (result === null) {
    return (
      <Screen
        title="Not settled"
        backTo="the club"
        lede="This night was never closed. Count everyone up and settle it to see the record."
        footer={
          <Button label="Open the night" variant="primary" onPress={() => router.replace('/session')} />
        }
      >
        {null}
      </Screen>
    );
  }

  return (
    <Screen
      title={nightDate(night.startedAt)}
      meta={metaLine(night, result)}
      backTo="the club"
      /*
       * ONE BUTTON, FULL WIDTH — the board's footer, and the whole of it.
       * R1 ends by handing the room over to R2, which is `/payments`.
       *
       * IT REPLACES A PAIR AND A CHIP, and all three of those moved rather than
       * vanishing:
       *
       *   · `Who has paid` IS THIS BUTTON. It was a chip above the footer
       *     because E6 took the disclosure row off and said payments lived
       *     "elsewhere" without drawing elsewhere; R1 draws the door, in the
       *     footer, as the one thing this screen leads to.
       *   · `Close` GOES. A push carries a back button on its title row, R1
       *     draws no second way out, and a footer holding two buttons cannot
       *     hold the one the board draws full width.
       *   · `Full ledger` IS A CHIP BELOW THE BLOCKS — see the body. It is not
       *     orphaned and it is not in the footer either.
       *
       * ⚠ NO ARROW GLYPH. The board draws `Who pays whom →` with a 15px chevron
       * after the label. `Button` takes a label and nothing else, it is an
       * app-wide shared component, and `CLAUDE.md` says anything app-wide runs
       * in a session with nothing else in flight — which this is not. The word
       * is the board's; the glyph waits for that session.
       */
      footer={
        <Button
          label="Who pays whom"
          variant="primary"
          onPress={() => router.push('/payments')}
        />
      }
    >
      {/*
       * THE WHOLE NIGHT, IN THREE BLOCKS, AND NOTHING BEHIND A TAP — see
       * `NightResult.tsx`, which draws it and carries the argument for folding
       * the deductions back into the figure.
       *
       * THE STEP IS SHOWN AND NOT SETTABLE. `E2-rounding.md` rule 8 locks it
       * once the night is closed, and this screen only ever draws a closed one —
       * so the row states what the night settled at and opens nothing.
       */}
      <NightResult
        result={result}
        ledger={ledger}
        loggedBy={null}
        roundingMode={night.roundingMode}
      />

      {/*
       * FULL LEDGER, AS A CHIP.
       *
       * ⚠ NOT DRAWN ON R1, and it is here because the alternative is orphaning
       * a screen. `/ledger` is format `7e` — the four-column table, `name game
       * food piggy net` — and until today the footer of this screen was its only
       * door in the app. R1's footer is one button and it is not this one.
       *
       * IT IS ALSO NOT REDUNDANT, which is the test for whether it should have
       * survived at all. The FINAL caption above says a person's night as a
       * sentence, on one line, truncating; `7e` says the same decomposition as
       * columns, at full width, with the rounding step in a column of its own —
       * and it is the same `resultColumns` call, so the two cannot disagree.
       * A night whose rules reach past the bill and the piggy bank has no four
       * columns to draw, and `/ledger` says so rather than drawing a term short.
       *
       * Delete the chip the day R1's *Share* corner or some other screen gives
       * the ledger a door the board actually draws.
       */}
      <Button
        label="Full ledger"
        variant="chip"
        style={styles.toLedger}
        onPress={() => router.push('/ledger')}
      />
    </Screen>
  );
}

/**
 * "20:05 → 06:38 · 10h 46m · 7 players · settled".
 *
 * BOTH WALL-CLOCK TIMES, 24-hour, and then the duration. A night that crosses
 * midnight ends at a smaller number than it started at, which reads as wrong
 * until the duration resolves it — which is why the frame asks for all three
 * and not for the elapsed time alone. R1's own meta line is the same shape:
 * `20:05 → 23:45 · 3h 40m · 8 players`.
 *
 * The local night's `endedAt` is set the moment counting starts. Where it is
 * missing — a night imported, or one closed before the field existed — the last
 * entry's own timestamp IS the moment the last chip moved. Using the clock
 * instead would make a night settled in March grow longer every time somebody
 * opened it.
 *
 * THE PLAYER COUNT IS THE RESULT'S OWN, and it is the count of rows the screen
 * below actually draws. It used to be the prize pool's, off the ledger; R1
 * draws no prize-pool card any more, and a header saying eight players over a
 * list of seven would be the header disagreeing with the block under it. B27's
 * collector — an envelope that never sat down — is not a player, and
 * `gameResults` is where that is decided.
 */
function metaLine(
  night: NonNullable<ReturnType<typeof useNight>>,
  result: ReturnType<typeof settle>,
): string {
  const stamps = Object.values(night.occurredAt);
  const last = stamps.length === 0 ? null : stamps.reduce((a, b) => (a > b ? a : b));
  const ended = night.endedAt ?? last;
  const players = gameResults(result).length;
  /*
   * AND IT ENDS WITH THE STATE — the frame's own line, and the only place on
   * this screen the word `settled` appears. A confirmed result carries no
   * status pill of its own and this is what is left: a fact about the night, in
   * the line of facts about the night, beside when it ran and how many played.
   * A night still being counted says so instead, which is the one other state
   * this screen can be reached in.
   */
  return (
    `${clock(night.startedAt)} → ${ended === null ? '—' : clock(ended)} · ` +
    `${elapsed(night.startedAt, ended)} · ${players} ${players === 1 ? 'player' : 'players'}` +
    ` · ${night.status === 'settled' ? 'settled' : 'not closed yet'}`
  );
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

function elapsed(startedAt: string, endedAt: string | null): string {
  const end = endedAt === null ? Date.now() : new Date(endedAt).getTime();
  const mins = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

/*
 * "Sat 29 Aug". SHORT, so the title holds one line at full width — the long
 * weekday put "Wednesday 29 Aug" against the back button at 32/800 and wrapped
 * it, and the frame asks for one line because nothing sits to the right of it
 * to absorb the second.
 */
const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  /* The chip's own gutter, and 20 between it and the block above. */
  toLedger: { marginHorizontal: space.card, marginTop: 20 },
});
