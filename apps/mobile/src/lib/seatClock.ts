import type { LedgerEntry, Player, PlayerId, SessionTiming } from '@poker-club/core';

/**
 * The little of a night this needs: when it started, when it stopped, who was
 * in it, and when each row happened.
 *
 * DELIBERATELY NOT `Night`. A watcher settles the same night on their own
 * device from a different shape — `WatchedNight`, which carries `occurredAt`
 * on each entry rather than in a map beside them — and a watcher who could not
 * time the night would settle an hourly rake as though it charged nothing.
 * Two people looking at one night and seeing two sets of figures is the exact
 * failure this app exists to prevent, so both shapes go through this.
 */
export interface TimedNight {
  startedAt: string;
  /** When the game stopped being played. Absent while it is still going. */
  endedAt?: string | null;
  players: readonly Player[];
  entries: ReadonlyArray<LedgerEntry & { occurredAt?: string }>;
  /** When each entry happened, keyed by id — the host's shape. */
  occurredAt?: Record<string, string>;
}

/**
 * How long the table ran, and how long each person sat at it.
 *
 * A fee charged by the hour is the first rule in this app that needs an answer
 * the ledger has never been asked for. The engine has no clock and must not
 * grow one — that is what lets a night frozen in September re-derive to the
 * same figures next March — so the minutes are counted HERE, passed into
 * `settle()`, and snapshotted with the night.
 *
 * NOBODY IS ASKED TO CLOCK IN. A seat time typed by a host is a seat time that
 * gets forgotten at midnight, and the rows already say it: somebody arrives
 * and buys in, and somebody who goes home cashes out. So
 *
 *   they sat down  when their first buy-in was recorded
 *   they went home when their last cash-out was, if they have not bought back in
 *
 * and anyone still holding chips is sitting there until the table stops. A
 * rebuy is not an arrival and does not restart anything; somebody who busts,
 * sits out a while and buys back in is charged for the gap, which is what a
 * table charging by the hour would do anyway — the seat was theirs.
 *
 * THE FALLBACK IS THE WHOLE NIGHT, never nothing. A player with no buy-in on
 * the record — seated by hand, or a night imported from somewhere — is timed
 * from the night's own start. Charging them for nothing would quietly move
 * money: on a room charged by the hour the rest of the table would carry their
 * share, and on a rake per head the collector would simply get less than the
 * rule says, with nothing on any screen to say why.
 */
export function timingOf(night: TimedNight, now: number = Date.now()): SessionTiming {
  const started = Date.parse(night.startedAt);
  // A night that is still being played is timed to this moment; one that has
  // stopped is timed to when it stopped, so its figures hold still.
  const stopped = night.endedAt == null ? now : Date.parse(night.endedAt);

  const minutesBetween = (from: number, to: number): number =>
    Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round((to - from) / 60_000)) : 0;

  const tableMinutes = minutesBetween(started, stopped);

  /** The seq of the last entry of a type for somebody, or -1. */
  const lastOf = (playerId: PlayerId, types: readonly string[]): number =>
    night.entries
      .filter((e) => e.playerId === playerId && types.includes(e.type))
      .reduce((a, e) => Math.max(a, e.seq), -1);

  const whenOf = (seq: number): number | undefined => {
    const entry = night.entries.find((e) => e.seq === seq);
    if (entry === undefined) return undefined;
    const at = entry.occurredAt ?? night.occurredAt?.[entry.id];
    return at === undefined ? undefined : Date.parse(at);
  };

  const minutesByPlayer = new Map<PlayerId, number>();
  for (const player of night.players) {
    if (!player.atTable) continue; // a collector who never sits down is never charged

    const buys = night.entries
      .filter((e) => e.playerId === player.id && (e.type === 'buyin' || e.type === 'rebuy'))
      .map((e) => e.seq);
    const lastBuy = buys.length === 0 ? -1 : Math.max(...buys);
    const lastOut = lastOf(player.id, ['cashout']);

    const arrived = buys.length === 0 ? started : (whenOf(Math.min(...buys)) ?? started);
    // Still holding chips — their last move was onto the table, not off it.
    const left = lastOut > lastBuy ? (whenOf(lastOut) ?? stopped) : stopped;

    minutesByPlayer.set(
      player.id,
      Math.min(minutesBetween(arrived, left), tableMinutes),
    );
  }

  return { tableMinutes, minutesByPlayer };
}
