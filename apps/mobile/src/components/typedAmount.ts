import { useState } from 'react';

/** Append digits to a typed amount, refusing a leading zero and silly lengths. */
export function appendDigits(current: string, digits: string): string {
  const next = (current === '0' ? '' : current) + digits;
  const trimmed = next.replace(/^0+(?=\d)/, '');
  return trimmed.length > 9 ? current : trimmed;
}

/**
 * WHOSE FIGURE IS ON THE KEYPAD — the half of this control that is not drawn.
 *
 * Every amount screen opens with a number already showing: the standard buy-in,
 * this player's last rebuy, what the split would charge them, the amount an
 * entry was logged at. That number is an OFFER, not text the host typed, and
 * the keypad has to treat the two differently. Against a suggested $500, the
 * key `7` means seven — the host is replacing a figure they did not write.
 * Against a typed $7 it means seventy-five when `5` follows, because now they
 * are building a number. So the first key pressed clears the suggestion — a
 * digit replaces it, delete wipes it — and every key after that appends.
 * Tapping a preset makes it a suggestion again, because that is what it is.
 *
 * IT LIVES HERE BECAUSE IT LIVED IN ONE SCREEN AND FOUR SCREENS NEEDED IT.
 * `log.tsx` had it inline; `/entry`, which is where a mistyped buy-in is put
 * right, appended to the logged amount instead — so correcting a $500 rebuy to
 * $50 by tapping 5 and 0 wrote $50,050 and the host had to clear nine digits by
 * hand to reach a number smaller than the one they were fixing. See B20 in
 * `docs/bugs.md`. Money has one implementation in `packages/core` for exactly
 * this reason; the rule holds for the thing money is typed on.
 */
export type Typed = {
  /** The digits on screen; `null` when nothing has been offered or typed yet. */
  readonly digits: string | null;
  /** True once a key has been pressed against whatever was showing. */
  readonly touched: boolean;
};

/** Nothing offered and nothing typed — the caller's own figure stands. */
export const nothingTyped: Typed = { digits: null, touched: false };

/** Put a figure up as an offer. `null` empties the field — the Custom chip. */
export const offer = (value: number | null): Typed => ({
  digits: value === null ? '' : String(value),
  touched: false,
});

/** A key. The first one against an offer replaces it; the rest append. */
export const withDigits = (typed: Typed, digits: string): Typed => ({
  digits: appendDigits(typed.touched ? (typed.digits ?? '') : '', digits),
  touched: true,
});

/** Delete. Against an offer it wipes the whole figure rather than a digit of it. */
export const withBackspace = (typed: Typed): Typed => ({
  digits: typed.touched ? (typed.digits ?? '').slice(0, -1) : '',
  touched: true,
});

/**
 * What the screen should show and commit. `fallback` is for the screen whose
 * opening figure is not known when the state is made — /share reads it off the
 * engine on every render, so an empty state means "whatever they are on now".
 */
export const amountOf = (typed: Typed, fallback = 0): number =>
  typed.digits === null ? fallback : typed.digits === '' ? 0 : Number(typed.digits);

/**
 * The state above, wired to a `Keypad`. Spread `keys` onto it:
 *
 *     const field = useTypedAmount(standard);
 *     <Keypad {...field.keys} />
 */
export function useTypedAmount(initial?: number) {
  const [typed, setTyped] = useState<Typed>(() =>
    initial === undefined ? nothingTyped : offer(initial),
  );

  return {
    typed,
    /** Put a figure up as an offer — a preset, or the figure a step opens on. */
    offer: (value: number | null) => setTyped(offer(value)),
    keys: {
      onDigits: (d: string) => setTyped((cur) => withDigits(cur, d)),
      onBackspace: () => setTyped(withBackspace),
    },
  };
}

/**
 * HOW BIG THE FIGURE BEING TYPED MAY BE DRAWN.
 *
 * All four amount screens set the figure at the size their board drew it — 68
 * on the amount sheet, 60 on the share sheet — and the board was drawn with
 * $500 in it. `$99,000,000` at 68 is 347 points wide before the reader's text
 * setting touches it, on a phone 360 wide; at the 120% this app is measured at
 * it is 416 and hangs off both edges of the glass. B18 capped the figures that
 * sit in a fixed card, but the typed figure is not in a card — it is the widest
 * single string the app ever draws, and it grows with the table rather than
 * with the phone.
 *
 * So it steps down as it lengthens, the way a calculator's display does, and
 * only past the length the board itself drew. `$500` and `$14,900` are
 * untouched at every step; nine digits and three commas come down to seven
 * tenths, which fits at 360 with the text turned up. Spread `cappedFigure`
 * beside it — the step keeps the figure on the glass, the cap stops the
 * reader's text setting from putting it back off.
 *
 * Ellipsis is not an option here and neither is a second line: an abbreviated
 * figure in the field you are typing into is a lie about the number you are
 * about to commit. See B20.
 */
export function typedFigureSize(
  shown: string,
  board: number,
): { fontSize: number; letterSpacing: number } | null {
  if (shown.length <= 8) return null;
  const size = Math.round(board * (shown.length <= 10 ? 0.85 : 0.7));
  // The boards set -.05em on both figures — 3.4 at 68 and 3 at 60. Rounded to
  // the hundredth so the number is the one a person would write down.
  return { fontSize: size, letterSpacing: Math.round(size * -5) / 100 };
}
