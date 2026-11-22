/**
 * Round 29, 22 November: more sets for the Table admin drawer's four icons.
 *
 * The owner, with the app's own icons on the board: the seat icon "can have +
 * to its left", and "make an iteration on all of these 4 icons - stay within
 * that simple concept/approach but provide more options (sets)".
 *
 * So these stay in the app's hand: a 24 grid, one 1.8 stroke, round ends, no
 * fill, one colour. A set is four icons that share an idea, so the drawer reads
 * as one family. `today` is not here: it comes from `app-icons.json`.
 */
const S = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const personPlus = S(`<path d="M2.5 9.500h5M5 7v5"/><circle cx="14.500" cy="8.500" r="3.600"/><path d="M7.300 20c.9-3.400 3.600-5.300 7.200-5.300s6.300 1.900 7.200 5.300"/>`);

export const DRAWER_SETS = [
  { key: 'plus', name: 'Today, with the plus', note: 'The smallest change, and the one you named: the same four, and Seat a player gains a plus on its left.',
    icons: { seat: personPlus } },
  { key: 'a', name: 'A · the things on the table', note: 'Each row is an object: a player to add, a banknote, the rule book, the dealer button that changes hands.',
    icons: {
      seat: personPlus,
      cashOut: S(`<rect x="2.500" y="6.500" width="19" height="11" rx="2.200"/><circle cx="12" cy="12" r="2.600"/><path d="M5.800 12h.01M18.200 12h.01"/>`),
      rules: S(`<path d="M6.500 3.500H17a1.500 1.500 0 0 1 1.500 1.500v15.500h-11A2 2 0 0 1 5.500 18.500V4.500a1 1 0 0 1 1-1Z"/><path d="M5.500 18.500a2 2 0 0 1 2-2h11M9.500 7.500h5.500M9.500 11h3.500"/>`),
      pass: S(`<circle cx="12" cy="12" r="8.700"/><path d="M10 8.200v7.600h1.900a3.800 3.800 0 0 0 0-7.600Z"/>`),
    } },
  { key: 'b', name: 'B · seats and chips', note: 'The table itself: a chair to fill, chips leaving the table, the rules as a page with a percent, the game handed from one player to the next.',
    icons: {
      seat: S(`<path d="M2.500 7.500h5M5 5v5"/><path d="M11 4v16M11 13h8v7"/>`),
      cashOut: S(`<rect x="3.500" y="16.500" width="11" height="3.600" rx="1.800"/><rect x="3.500" y="11.700" width="11" height="3.600" rx="1.800"/><path d="M14 8.500l6-5M15.800 3.500H20v4.200"/>`),
      rules: S(`<path d="M7 3.500h7l4.500 4.500V19a1.500 1.500 0 0 1-1.500 1.500H7A1.500 1.500 0 0 1 5.500 19V5A1.500 1.500 0 0 1 7 3.500Z"/><path d="M14 3.500V8h4.500M9.300 16.700l5.400-5.400"/><path d="M9.600 11.800h.01M14.400 16.200h.01" stroke-width="2.400"/>`),
      pass: S(`<circle cx="5.800" cy="7.500" r="2.500"/><path d="M2 16.500c.4-2.500 1.900-3.800 3.800-3.800 1 0 1.900.3 2.600 1"/><circle cx="18.200" cy="7.500" r="2.500"/><path d="M22 16.500c-.4-2.500-1.900-3.800-3.800-3.800-1 0-1.900.3-2.600 1"/><path d="M8.500 19.500h7M13 17l2.500 2.500L13 22"/>`),
    } },
  { key: 'c', name: 'C · in, out, and across', note: 'One idea, three arrows: a player comes in to a seat, a player goes out, the game goes across. Money rules is the one row that is not a movement, so it is a set of dials.',
    icons: {
      seat: S(`<path d="M10.500 4.500h8v15h-8"/><path d="M3.500 12H12M9 8.500l3.500 3.500L9 15.500"/>`),
      cashOut: S(`<path d="M13.500 4.500H5.500v15h8"/><path d="M11 12h8.500M16.500 8.500l3.500 3.500-3.500 3.500"/>`),
      rules: S(`<path d="M4 7h7.500M16.500 7H20M4 12h2.500M11.500 12H20M4 17h9.500M18.500 17H20"/><circle cx="14" cy="7" r="2.300"/><circle cx="9" cy="12" r="2.300"/><circle cx="16" cy="17" r="2.300"/>`),
      pass: S(`<circle cx="5.500" cy="16.500" r="2.800"/><path d="M7 12c1.500-4.500 7.500-5.500 11-1.500"/><path d="M18.500 6v4.800h-4.800"/>`),
    } },
];
export const DRAWER_ROWS = [['seat', 'person', 'Seat a player'], ['cashOut', 'cashOut', 'Cash out a player'], ['rules', 'rules', 'Money rules'], ['pass', 'pass', 'Pass the game']];
