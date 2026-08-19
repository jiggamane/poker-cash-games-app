# What is new since the last handoff

Last handoff: **rev 17**, cut 18 August 2026. This one: **rev 18**, cut 19 August 2026.
If you have read rev 17, this file is the whole delta. Nothing in rev 17 is reversed.

## 1 · Two new boards

**`boards/Journey Map 5 - Flow logic.dc.html`** — every scenario as screens and transitions, no frames.
A node is a screen from the spec, an arrow is what the user does. Four node types: screen in the spec ·
return to a screen already shown (dashed) · state, not a screen (black) · missing or undecided (amber).
Read it before wiring navigation: it is the check that every path has a way in, a way out, and a defined
end state.

**`boards/Test Version.dc.html`** — the cut that can actually be tested on one table in one evening.
10 screens, both themes. One fixed club, so the nav never asks which club you are in. Nobody signs in.
Players are names typed at the table as they arrive.

* In: buy-ins, rebuys, the piggy bank, the bill, the host fee — the full money model, resolved at the close.
* Out: club switching · accounts · invites and claiming · the roster · Sessions · My stats.

⚠ Its screens are numbered **T1–T10 in their own namespace** (T1 Home · first run … T10 Settings).
They are **not** the app's T-series (T1 Tonight · resting … T5 nobody in yet). Same letter, different
namespace — build the test round from that board's own numbers.

## 2 · One new frame

**`T1v Tonight · tighter`** (board 2, section 07) — drawn to be tested, not to be approved.

| | T1 | T1v |
|---|---|---|
| Player row | 68 (padding 22) | 50 (padding 13) |
| Rebuy / Bill pair | 75 | 63 (Rebuy padding 20 → 13, Bill 14 → 9, glyph 20 → 18) |
| Admin strip | 14 between parts | 10 |

Type, colour and copy are identical. It buys 12 points from the dock and 18 per row: **eight visible
players before the list scrolls instead of six** on 393 × 852. **T1 stays the current design until the
variant wins.** What to watch in the test: Rebuy is tapped mid-conversation, often without looking; at 63
it still clears the 44 minimum but is no longer the one obviously oversized target on the screen.

## 3 · Three comments closed

* **`GR8` money rules is rebuilt in the `O4` idiom** — one hairline list: caption, title with chevron, one
  detail line, toggle right, "Add a rule" last. Group and game now present money rules identically; only
  the level being edited differs (rev 17, S103).
* **"people" is out of the `GR7` Settings subtitle.** Copy only.
* **Board layout pass on boards 1–4** — caption cards share one height per tier, so every mockup sits on
  one baseline; row gaps 22, section spacing 52 above the section rule. No frame content changed.

## 4 · Still not decided — unchanged from rev 17, still unsigned

1. **The group switch** at the top of home, for admins and players in more than one group. Not drawn.
   Build the group scope and leave the control's slot.
2. **Navigation order** — recommendation on the table: keep groups above home.
3. **The H format for the top-screen sections.**
4. Two instructions blocked for want of a screen name: "the new layout used in code", and
   "these two screens in navigation".
5. **`T3` / `T3b`** classify as push screens today (white base in light). If they should read as drawers
   over the live table they need the grey base and the dim layer.

Plus, new with this cut: whether the test-version board keeps its own **T1–T10** numbering (§1).
