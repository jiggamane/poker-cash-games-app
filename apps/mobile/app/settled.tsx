import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { prizePool, resolveLedger, settle } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { NightResult } from '../src/components/NightResult';
import { Screen } from '../src/components/Screen';
import { space } from '../src/design/tokens';
import { settlementInput, useNight } from '../src/lib/nightStore';

/**
 * The night, settled — E6. `design/handoff-E6/`, cut 30 August.
 *
 * ONE screen for two situations: the night you have just closed, and a night
 * you open from a list three weeks later. They are the same facts, so they are
 * the same screen.
 *
 * REBUILT FROM X1c, AND MOSTLY BY SUBTRACTION. X1c ended in the reader: their
 * own card, a SETTLEMENT panel telling them whether they were square, the
 * transfers they owed, and a way through to who had paid. E6 takes all of it
 * off, and the reasoning is one line of `START-HERE.md` — *a confirmed result
 * states no status of its own*. The status belongs to the counting screens,
 * where the figures are still being entered and the answer is still in doubt;
 * here the book is closed, and a screen that keeps saying so is a screen still
 * arguing with itself.
 *
 * WHAT IS LEFT is the record: the date, when it ran, what went through the
 * table, what each person's night came to, and what came off the top. Every
 * player is a row of the same weight — no "You," prefix, no highlighted row —
 * because the host reading this is one of seven people at a table and not the
 * subject of the page.
 *
 * The screen is a PUSH and stays one: a settled night is a place you stay and
 * read rather than something you confirm and dismiss, and `09-navigation.md`
 * puts exactly that on the push side of the line. The top-right corner is
 * empty, which E6 restates as its own rule — nothing is placed to the right of
 * the title.
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
      meta={metaLine(night, ledger)}
      backTo="the club"
      /*
       * THE PAIR AT THE FOOT, as the frame draws it — two outlined buttons of
       * equal width, `14px 20px 6px`, 14 between them. `Full ledger` beside
       * `Close`, which is the frame's own pair.
       *
       * IT HELD `Who has paid` UNTIL TODAY, and the note that put it there said
       * why and said what would replace it: "there is no full ledger anywhere
       * in this app … put `Full ledger` here the day there is a ledger to
       * open." `02-E6-results-row.md`, cut 1 September, is that day — it keeps
       * the four-column table `7e` "as the full-screen variant behind the *Full
       * ledger* button", and `/ledger` is that screen. So the slot goes back to
       * the label the frame draws on it.
       *
       * AND `Who has paid` GOES BACK TO BEING A CHIP above the footer, which is
       * where it was before it borrowed this slot. The deviation it represents
       * is unchanged and is still the same one: E6 takes the disclosure row off
       * and says payments live "elsewhere", elsewhere is not drawn, and this
       * screen is the only route into `/payments` in the app. Delete the chip
       * the day E7 has a door drawn somewhere else.
       */
      footer={
        <View style={styles.pair}>
          {/* Only where there is a table behind it — a night whose rules reach
              past the bill and the piggy bank has no four columns to draw, and
              `/ledger` says so rather than drawing a term short. */}
          <Button
            label="Full ledger"
            variant="secondary"
            style={styles.half}
            onPress={() => router.push('/ledger')}
          />
          {/* CLOSES THE RECORD, WHICH IS ALL IT DOES. The night is already
              settled — this is the way out of reading it, and it is `back`
              because the screen is a push: from the ending flow that is the
              club, and from Sessions it is Sessions. */}
          <Button
            label="Close"
            variant="secondary"
            style={styles.half}
            onPress={() => router.back()}
          />
        </View>
      }
    >
      {/*
       * THE WHOLE NIGHT IS ON THE ROW, and nothing is behind a tap.
       *
       * THE ROW USED TO OPEN — first the player card, then a receipt in place —
       * because *why is my number this* had no answer anywhere in the app. It
       * has one now, printed under the name: `game +$1,620 · food −$54 · piggy
       * −$23`, every term of the night in the order the money moved, adding up
       * to the figure beside it. A row that opened into the same terms one line
       * apiece would be the answer twice, and `E6-results-columns.md` is blunt
       * about which it wants — the deductions in open view, nothing to tap.
       *
       * What a receipt never carried either is which rebuy, which spend, at
       * what time. That is the full ledger, it is not drawn, and it is the one
       * thing the frame's footer asks for that this app cannot give — see the
       * footer above and `docs/screens.md`.
       */}
      {/*
       * THE STEP IS SHOWN AND NOT SETTABLE. `E2-rounding.md` rule 8 locks it
       * once the night is closed, and this screen only ever draws a closed one
       * — so the row states what the night settled at and opens nothing.
       */}
      <NightResult
        result={result}
        ledger={ledger}
        loggedBy={null}
        roundingMode={night.roundingMode}
      />

      {/*
       * WHO HAS PAID, back in the flexible space it occupied before the footer
       * borrowed it — see the note on the footer above. It is a chip rather
       * than a disclosure row because E6 takes the row off; it is here at all
       * because this screen is the only route into `/payments` in the app.
       */}
      {result.transfers.length > 0 && (
        <Button
          label="Who has paid"
          variant="chip"
          style={styles.toPayments}
          onPress={() => router.push('/payments')}
        />
      )}
    </Screen>
  );
}

/**
 * "20:05 → 06:38 · 10h 46m · 7 players · settled".
 *
 * BOTH WALL-CLOCK TIMES, 24-hour, and then the duration. A night that crosses
 * midnight ends at a smaller number than it started at, which reads as wrong
 * until the duration resolves it — which is why E6 asks for all three and not
 * for the elapsed time alone.
 *
 * The local night's `endedAt` is set the moment counting starts. Where it is
 * missing — a night imported, or one closed before the field existed — the last
 * entry's own timestamp IS the moment the last chip moved. Using the clock
 * instead would make a night settled in March grow longer every time somebody
 * opened it.
 *
 * The player count is the prize pool's, so the line and the block under it
 * cannot disagree about how many people were at the table.
 */
function metaLine(
  night: NonNullable<ReturnType<typeof useNight>>,
  ledger: ReturnType<typeof resolveLedger>,
): string {
  const stamps = Object.values(night.occurredAt);
  const last = stamps.length === 0 ? null : stamps.reduce((a, b) => (a > b ? a : b));
  const ended = night.endedAt ?? last;
  const players = prizePool(ledger).players;
  /*
   * AND IT ENDS WITH THE STATE — the frame's own line, and the only place on
   * this screen the word `settled` appears. `handoff-E6` takes the status pill
   * off a confirmed result and this is what is left: a fact about the night, in
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
 * weekday put "Wednesday 29 Aug" against the back button at 30/800 and wrapped
 * it, and E6 asks for one line because nothing sits to the right of it to
 * absorb the second.
 */
const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  /* The frame's `display:flex · gap:14px`. `Screen` owns the margins around a
     footer, so all this row says is that the two share the width. */
  pair: { flexDirection: 'row', gap: 14 },
  half: { flex: 1 },
  /* The chip's own gutter and the 20 above it — the same it had before the
     footer borrowed its slot. */
  toPayments: { marginHorizontal: space.card, marginTop: 20 },
});
