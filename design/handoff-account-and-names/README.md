# Account and names — a board drawn for review, 9 November

**Status: APPROVED by the owner on 9 November ("approved, build it"), and
built the same day.** It is the handoff for these screens now; the strings on
it are the shipped ones, UNSURE tags included. `docs/screens.md` has the
routes and the six places the build departs from it.

The owner chose, on 9 November, to have the board drawn first and reviewed
before any screen is built (rather than build from placeholders, or wait for
an outside designer). This board is that drawing, made in this repository from
`docs/design-request-account-deletion.md` Part 2, in the same format as the
other boards: every dimension, weight and colour inline on the element.

- `Screens - Account and names.dc.html` — 19 states, dark and light, 393 × 852
  (360 in Tweaks). A · deleting an account (S1–S8), B · your name at first
  sign-in (N1–N5; N4 is not drawn because the name is asked in one place),
  C · renaming your own seat (R1–R3). The six open questions are answered at
  the top of the board.
- `tools/board.py` generates it, so dark and light come from one description
  and cannot drift. Regenerate with
  `python3 tools/board.py "Screens - Account and names.dc.html"` from this
  folder. Edit the generator, not the HTML.
- `support.js` is the same file the game-admin board uses.

What it is built from, and nothing else: the sheet (Chrome B, rev 18 doc 15),
the Settings row, the drawer row, and the one destructive hold — End this
poker night, rev 18 doc 08 H3/H3b. Colours are `tokens.ts`'s, dark and light.

**When the owner has reviewed it:** strings marked UNSURE are settled or
changed here, `docs/screens.md` gains its rows, and the build starts — server
half of part C first (see the design request's *For whoever applies*).
