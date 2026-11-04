/**
 * What a seat on the odds calculator is called — the owner, 4 November. The
 * first seat is the person holding the phone, *Me*; heads-up the other is
 * *Opponent*; with three or more they are *Opponent 1*, *Opponent 2* and on,
 * numbered from the first of them. So the second seat is *Opponent* at two
 * and *Opponent 1* at three: the name follows the table, not the seat alone.
 *
 * One function, because the seat's label, its two places' spoken names and the
 * chevron's all say it, and `scripts/odds-*-cases.ts` deal by those names.
 */
export function seatName(seat: number, seats: number): string {
  if (seat === 0) return 'Me';
  return seats <= 2 ? 'Opponent' : `Opponent ${seat}`;
}

/** The status sentence for a seat holding one card. *Me needs* is not a sentence. */
export function needsSecondCard(seat: number, seats: number): string {
  return seat === 0 ? 'My hand needs a second card' : `${seatName(seat, seats)} needs a second card`;
}
