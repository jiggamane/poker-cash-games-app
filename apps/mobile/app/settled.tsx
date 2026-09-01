import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
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
    <Screen title={nightDate(night.startedAt)} meta={metaLine(night, ledger)} backTo="the club">
      {/*
       * A ROW OPENS INTO ITSELF, not into another screen — the receipt, per
       * `E6-row-formula.md`, cut 31 August.
       *
       * IT USED TO PUSH THE PLAYER CARD, because the question a settled night
       * gets asked a week later is *why is my number this* and no screen in
       * the app could answer it. The receipt answers it in place: cash out,
       * buy-in, every term of the bill, the piggy bank, and the same `Net` the
       * row was already showing. The door existed for a question that now has
       * an answer where the question is asked.
       *
       * The addendum leaves open "whether the expanded receipt is also the
       * route into the individual entries, or whether that stays with Full
       * ledger". Neither is drawn, so neither is built: a row does one thing,
       * and the entry list is reachable from the night while it is being
       * played. `docs/screens.md` carries this as an open item.
       */}
      {/*
       * THE STEP IS SHOWN AND NOT SETTABLE. `E2-rounding.md` rule 8 locks it
       * once the night is closed, and this screen only ever draws a closed one
       * — so the row states what the night settled at and opens nothing.
       */}
      {/*
       * FULL LEDGER — format `7e`, which `7a` replaced in the list above and
       * which `02-E6-results-row.md` keeps "as the full-screen variant behind
       * the *Full ledger* button". `/ledger` reads THIS night off the store,
       * which is why the chip is wired from here and not from `NightResult`
       * itself: `watch.tsx` draws somebody else's night from a different
       * source, and a button there would open the reader's own.
       */}
      <NightResult
        result={result}
        ledger={ledger}
        loggedBy={null}
        roundingMode={night.roundingMode}
        onFullLedger={() => router.push('/ledger')}
      />

      {/*
       * DELIBERATE DEVIATION, and the only one on this screen.
       *
       * E6 removes the `Who has paid` disclosure row and says payments live on
       * E7, "reached from elsewhere". Elsewhere is not drawn and does not
       * exist: this screen is the only route into `/payments` in the whole
       * app, and taking the row off without putting the route back would leave
       * a host with no way to reach the screen they chase the week's money on.
       *
       * So the row is gone as E6 asks — no disclosure, no chevron, nothing
       * that reads as a block of its own — and what is left is a chip in the
       * flexible space at the end, which is the same thing E5 does two screens
       * earlier for the same reason: the corner of a pushed screen is empty,
       * so the way through sits at the bottom where somebody who has finished
       * reading is already looking. Delete it the moment E7 has a door drawn
       * somewhere else.
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
 * "20:05 → 06:38 · 10h 46m · 7 players".
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
  return (
    `${clock(night.startedAt)} → ${ended === null ? '—' : clock(ended)} · ` +
    `${elapsed(night.startedAt, ended)} · ${players} ${players === 1 ? 'player' : 'players'}`
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
  toPayments: { marginHorizontal: space.card, marginTop: 20 },
});
