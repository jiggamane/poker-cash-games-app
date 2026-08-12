# Prompt: requesting an updated design handoff

Paste the block below into the design tool. It asks for a **delta handoff** —
what changed since the last bundle — rather than a full re-export, and it forces
explicit confirmation of the rules the code already implements.

The section "What the build currently assumes" is the important part. Keep it in
sync with `docs/settlement-rules.md` before reusing this prompt.

---

```text
I need an updated handoff for the poker cash-game ledger app. A working build
already exists from your last bundle (Cash Game v2 / Style Guide v2 / Cash Game
Board), so what I need now is a DELTA — what has changed since then — not a
fresh explanation of the whole product.

The build so far: React Native + Expo in TypeScript, a Postgres schema with an
append-only integer-only ledger, and a fully tested settlement engine. Design
tokens, buttons and rows are already implemented from Style Guide v2. Screens
are only just starting, so screen changes are cheap right now; changes to money
rules or the ledger model are the expensive ones and I need those stated very
precisely.

Please produce:

1. CHANGELOG — what changed since the last bundle
   List every change, grouped as: money/logic rules, screens and flows, design
   system (colour, type, spacing, shape, components), and copy. For each one say
   whether it is FINAL or still exploratory. If a section of the file is old
   exploration that should be ignored, say so explicitly rather than leaving it
   in the file to be inferred — last time "newest at the top, ignore below"
   caused real ambiguity.

2. LOGIC CHANGES — with the reasoning, not just the outcome
   For each change to how money behaves, tell me:
   - the rule as it now stands, in one sentence;
   - a WORKED EXAMPLE with real numbers, including at least one awkward case
     (an amount that does not divide evenly, or someone who is both a payer and
     a charged player);
   - what it replaces, and why it changed;
   - whether it applies retroactively to nights already recorded, or only to new
     ones.
   Small changes still need this. A one-word change to a rule can invalidate a
   tested algorithm, and I would rather over-specify than guess.

3. ANSWERS TO THE OPEN QUESTIONS
   Confirm or override each of these. The current behaviour is in brackets — if
   a bracket is right, just say "correct", but please answer all of them.

   a. Can a single person — the biggest winner — cover a whole bill alone?
      [Not currently possible. A bill is always spread across a set of people:
      winners evenly, winners by size of win, or everyone at the table.]
   b. When a rule charges winners only and NOBODY won that night, should a fixed
      host fee or kitty still be collected?
      [It collects nothing. The exception is a bill covering real expenses,
      which falls back to charging everyone, since somebody really paid the bar.]
   c. Can a percentage rule be charged to "everyone at the table" rather than
      winners only? It reads as contradictory — a percentage of a loss.
      [Allowed, and anyone not in profit pays nothing. Should the UI simply
      prevent this combination?]
   d. If a player cashes out and later buys back in, they end the night holding
      what they cashed out plus whatever is in front of them at the end.
      [That is how it is calculated. Confirm this is right.]
   e. Rules apply in a defined order, which is what makes "percentage of the net
      win after other rules" meaningful. Who controls that order, and is it
      visible or editable by the host?
      [Currently a stored sort order with no UI.]
   f. Are there any new rule shapes that do not fit the existing model of
      amount / basis / who pays / how it is split / where it goes / who collects?

4. SCREENS
   For each new or changed screen: every state it can be in (first run, empty,
   loading, mid-flow, error, complete), what is interactive, what happens on
   each action, and what the user sees when something is not yet possible — for
   example the chip count not yet matching the money on the table.
   Please also cover the screens the last handoff listed as not designed yet, if
   any now exist: the book (month and all time), the watcher's own view and
   onboarding, and notifications.

5. DATA IMPLICATIONS
   Anything that implies a new field, a new kind of ledger entry, a new state, or
   a new relationship between people. Flag these clearly even if they seem
   minor — they are the changes that cost the most to retrofit.

6. DESIGN SYSTEM DELTAS
   Only what changed, at exact values: hex codes, sizes, weights, spacing,
   radii, border widths. If a component gained a state or a variant, say which.
   If nothing changed here, say so in one line.

One thing that has changed on my side since your last bundle: watchers are now
expected to INSTALL the app rather than opening a link as strangers, so a
watcher's first-run experience is a real screen now rather than just a shared
URL. Please account for that if it affects anything you have drawn.

Format: same as before — .dc.html files with support.js, drawn at 402 x 874.
Say plainly which files supersede which, and keep the changelog as plain
markdown so I can diff it against what is built.

Please don't write production code, and don't re-describe parts of the product
that have not changed.
```
