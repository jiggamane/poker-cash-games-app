# UX review of the full board, 24 November

A review of every phone against the app's journeys and its source (`apps/mobile/app`), done before the
board was split into the design and the working board. Its journeys, missing states and decisions are
carried in `journeys.mjs`, which both boards are built from; this file is the record of why.

"App has it" means the app's source has the state and no phone drew it; "App lacks" means the app does
not have it either. New words are marked draft.

## What it found, and what was done

| Finding | Done |
|---|---|
| `c-rest` is c-std-1 in the older frame | Removed |
| `c-search`, `c-nomatch`, `c-new`, `c-taken`, `c-invited` were on the older frame, and the standard frame had lost the "New player — type a name" line | Redrawn on the standard frame; the line is back on c-std-1 |
| `house-rules`, `piggy-bank-rules`, `piggy-bank-rules-changed`: no route in the app opens `/house-rules`, and only it opens `/piggy-bank-rules` | Removed |
| `rule-more` is the same scrolled half of the rule editor as `new-night-rule-rest` | Removed; `new-night-rule-rest` and `rule-edit` stay |
| `new-night-amount` duplicates `c-std-3` if seating moves into Add players | Kept until the seating decision |
| `settings-more` and `invite-blocked` were drawn with no-server build text | Redrawn signed in / signed out, with the app's own words |

## Missing states drawn (P1)

Home on the first night, while a night runs, while it is counted, and as a member; the game arriving by
pass (on Home) and being taken back (on Tonight); a rebuy written with its Undo; taking a player back out
of Add players; Restore purchases; the store's waiting and failed states; the confirm before removing a
player from the group (the app removes on one tap today). All in `screens/15-journey-states.mjs`.

## Missing states still to draw (P2, P3)

Listed per part in `journeys.mjs` and on the working board: offline and loading Home; the pass failing and
the receiver opening it; changes from another phone waiting on Tonight; a watcher while the night is
counted; sending a claim and where it lands; the camera scanner and a refused camera (only if scanning is
kept); a seat already claimed; the admin's own player sheet and an invited player; counted over; deductions
read by a player; writing a difference off; a player's card on a settled night; part paid; several
fronters on a spend; and, at P3, throttled sign-in, signed in, late changes loading, rulings with no match,
a calculator hand too close to call, a wrong backup file, and a grant ending soon.

## Decisions

1. Where seating lives: New session's seat grid, or the game line plus Add players.
2. Invite codes: six characters (a server change) or the ten issued today.
3. Buying a plan in the app at this release, or not yet.
4. No currency: a server and formatting change now, or later.
5. QR scanning: build a scanner with its permission flow, or drop "Scan the QR code".
6. (Found on the way) the Supabase redirect note under Sign in: keep it as a diagnosis, or drop it.
