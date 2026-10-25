import { standings, type SeatOdds, type Standing } from '@poker-club/core';
import type { Theme } from '../design/tokens';

/**
 * The colour and the word a hand's figure takes on the odds screen — decided
 * 24 October (the canvas's "ODDS COLOUR" note, palette A of "Six greens and
 * reds"), and built 25 October with the player cards.
 *
 *   ahead    green   Favourite    (Winner, once the board is complete)
 *   behind   red     Underdog     (Beaten)
 *   close    amber   Too close
 *
 * Which of the three a hand is, and how far, is `standings()` in core — the
 * rule is arithmetic and lives with the engine. This turns that into ink:
 *
 *   dark   green hsl(142, 38 → 66%, 64 → 58%)   red hsl(6, 45 → 80%, 68 → 62%)   amber `amber`
 *   light  green hsl(142, 55 → 65%, 33 → 27%)   red hsl(6, 55 → 75%, 46 → 38%)   amber `amber`
 *
 * pale at an 8-point lead and full strength at 70 (`depth` 0 → 1). Amber is the
 * theme's own `amber` token, which is also the app's "waiting" colour; here it
 * means "too close", and the word beside it is what says so.
 *
 * ⚠ THE LIGHT GREEN STARTS AT 33%, NOT 36%. The canvas's own note says so: at 36
 * the palest light green is 4.1 : 1 against white, under what small text needs,
 * and at 33 it is 4.8 : 1 with no visible change.
 *
 * ⚠ AN EXCEPTION TO THE APP'S RULE. `tokens.ts` says green and red mean money
 * won and money lost and nothing else. On this screen they also mean "ahead" and
 * "behind" — the owner's decision, 24 October — and that is the only place they
 * do. The colour is never alone: every figure carries its word.
 */
export interface Tone {
  color: string;
  word: string;
}

const hsl = (h: number, s: number, l: number): string => `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;

export function oddsTone(standing: Standing, theme: Pick<Theme, 'name' | 'amber'>, boardComplete: boolean): Tone {
  const dark = theme.name === 'dark';
  const d = standing.depth;
  switch (standing.kind) {
    case 'ahead':
      return {
        color: dark ? hsl(142, 38 + 28 * d, 64 - 6 * d) : hsl(142, 55 + 10 * d, 33 - 6 * d),
        word: boardComplete ? 'Winner' : 'Favourite',
      };
    case 'behind':
      return {
        color: dark ? hsl(6, 45 + 35 * d, 68 - 6 * d) : hsl(6, 55 + 20 * d, 46 - 8 * d),
        word: boardComplete ? 'Beaten' : 'Underdog',
      };
    case 'close':
      return { color: theme.amber, word: 'Too close' };
  }
}

/**
 * The whole rule in one call: a tone per seat from the seats' equities, the way
 * the screen applies it. `standings()` does the arithmetic; the chasing test
 * for the outs control is the same call — a hand is chasing when it is not
 * `ahead`, i.e. its word is Underdog (Beaten) or Too close.
 */
export function oddsTones(
  seats: readonly Pick<SeatOdds, 'equity'>[],
  theme: Pick<Theme, 'name' | 'amber'>,
  boardComplete: boolean,
): Tone[] {
  return standings(seats).map((s) => oddsTone(s, theme, boardComplete));
}
