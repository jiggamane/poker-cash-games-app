> **Partly superseded — see `CHANGELOG.md` (12 Aug 2026) §5.** *MoneyRule* and *Session* gain fields and change enums; *Identity → The group-wide link* is dead (invites are per player); watchers now install the app and need a persistent identity.

# Data model, sync and identity

---

## Principle

**The ledger is an append-only log. Everything else is derived.**

Balances, totals, nets and the settle-up list are never stored as authoritative values — they are computed from the entries every time. A stored total that disagrees with its entries is the failure mode this design exists to prevent. Store derived values only as caches, always recomputable, never trusted over the log.

---

## Entities

### Group

```
id
name
currency          ISO code; drives the symbol and the minor unit
defaultStakes     { small, big }        minor units
defaultBuyIn      minor units
hostUserId
theme             'system' | 'dark' | 'light'
showCents         boolean, false in v1
createdAt
```

### Member

The link between a person and a group. A person's identity is global; their membership, role and money are per group.

```
id
groupId
personId          nullable — a name-only player has no person yet
displayName
role              'host' | 'player'
paysKitty         boolean, group-level default
status            'active' | 'removed'
joinedAt
```

`displayName` lives on the membership, not the person: the same human can be "Petr" in one group and "Petr Novák" in another. Renaming updates this row only, and because every entry references `memberId`, settled nights display the new name without being rewritten.

Removal sets `status`. Rows are never deleted.

### Person

Whatever the identity proposal settles on. The minimum it must support: a player who exists as nothing but a name typed by the host (`personId` null), a watcher with a link and no account, and a person who changes device without the group losing their history.

### MoneyRule

Attached to the group, snapshotted onto each session.

```
id
groupId
name
kind              'bill' | 'kitty' | 'host_fee' | 'next_pot'
amountType        'percent' | 'fixed'
amountValue       basis points if percent, minor units if fixed
basis             'gross' | 'net'
charge            'winners' | 'everyone_flat'
split             'equally' | 'by_win_size' | 'everyone'   (bill kinds)
collectorMemberId nullable
carriedBalance    minor units, kitty only
sortOrder         creation order; drives application order
active            boolean
```

### Session

```
id
groupId
bookId
stakes            { small, big }
defaultBuyIn
startedAt         editable before the table opens; entries stamp from it
endedAt
state             'open' | 'counting' | 'settled' | 'closed'
rulesSnapshot     the rules as they were when the table opened
kittyOptOuts      [memberId] — tonight only
createdBy
```

**Rules are snapshotted at open.** A group rule edited next week must not change a settled night. The snapshot is what settle-up reads.

### Entry — the ledger

```
id
sessionId
memberId          null for expenses and system entries
type              'open_table' | 'buy_in' | 'rebuy' | 'cash_out'
                | 'expense' | 'correction' | 'reversal' | 'writeoff'
amount            minor units, always positive; type carries direction
occurredAt        the money moment — back-datable by the host
loggedAt          when it was written; never editable
loggedBy          memberId
note              nullable
targets           entry id, for correction and reversal
payerMemberId     expenses only
category          expenses only: 'food' | 'drinks' | 'other'
splitOverride     expenses only, tonight-only override of the rule's split
sequence          monotonic per session; the ordering authority
clientId          uuid minted on the device; the idempotency key
```

`occurredAt` and `loggedAt` are both required and often differ. The feed sorts by `occurredAt`; the log's integrity depends on `sequence`.

**Corrections never mutate.** Changing an amount writes a `correction` entry pointing at the original; voiding writes a `reversal`. Derived state applies both; the feed shows the original with its correction beneath it.

### Count

```
id
sessionId
memberId
amount
countedAt
supersededBy      a recount writes a new row
```

Cash-outs during play are `cash_out` entries and count as that player's final figure. Counts at the end cover everyone still seated.

### Settlement

Generated once at settle-up and stored with its inputs, so a night can be reproduced exactly as it was read out.

```
id
sessionId
generatedAt
deductions        [{ ruleId, memberId, amount, basisAmount }]
balances          [{ memberId | ruleId, net }]
transfers         [{ fromMemberId, toMemberId | toRuleId, amount, order }]
edited            boolean
```

Payments are a separate, non-authoritative table: `transferId`, `paidAt`, `markedBy`. Marking paid never touches the ledger or the settlement.

### Book

```
id, groupId, openedAt, closedAt, sequence
```

Closing freezes; a new one opens with the next sequence. Sessions belong to exactly one book.

---

## Derivation

Everything is a fold over the entries:

```
moneyIn(member)   = sum(buy_in, rebuy) + corrections − reversals
cashedOut(member) = sum(cash_out)
onTable           = sum(all moneyIn) − sum(all cashedOut)
gross(member)     = finalCount(member) − moneyIn(member)
```

where `finalCount` is the cash-out amount for players who left, and the end-of-night count for everyone still seated.

Invariant, checked before settle-up is allowed to render: **the sum of every player's gross result is zero.** If it is not, the model is wrong; show the out-of-balance screen [E5], never a settlement.

---

## Sync

One writer, many readers. That is what makes this tractable.

**The host's device owns the session.** Every entry is written locally first, into a durable queue, and the UI updates from local state immediately. Never block a buy-in on a network round trip — the host is standing at a table with someone holding cash.

**Push model.** The queue drains to the server in `sequence` order. Each entry carries a `clientId`; the server treats it as an idempotency key, so a retried push after a timeout cannot double a buy-in. This is the single most important thing to get right: an accidentally doubled $500 rebuy destroys the night's arithmetic and the table's trust in the app.

**Readers pull.** Watchers and players receive the session as a stream of entries plus a derived-state snapshot. A few seconds of lag is acceptable; the design has no interaction that depends on being current to the second. Whatever transport gets chosen, readers must degrade to polling — someone's phone on 3G in a kitchen will not hold a socket for four hours.

**Conflicts.** With one writer there are none on the ledger. The two real cases:

1. **The host's device dies mid-night.** Another device must be able to take the pen. Proposal needed: the server can transfer the writer role to another member, at which point the old device's unsynced queue must be surrendered — offer to replay it, never merge it silently.
2. **Group settings edited from two places.** Last-write-wins on the group record is fine; these are not money.

**Offline behaviour to build explicitly:** open a night, log every entry type, correct an entry, count up, and reach settle-up — all with no connection. Only sharing and the watcher view require the network. On reconnect the queue drains, and readers converge.

---

## Identity

**A player is a name in the host's book first, and an account only later — if ever.**

The lifecycle, decided:

1. **The host adds a player by name.** A member row is created immediately, with `personId` null. That row is the identity the ledger references from its very first entry. The player needs no app, no link and no account to be in tonight's game and every night after it.
2. **The host generates an invite link for that specific player.** Not a general group link — the link is bound to one `memberId`.
3. **The player opens the link and activates.** Activation creates the person and binds it to the member row that already exists. **Their name is already there**, along with every night they have played, their net, and their place in the roster. There is no sign-up form, no name entry, no "which of these are you?" picker.

The consequences are worth stating, because they are what make this model worth having:

- **No duplicate people and no merge problem.** The link carries the row, so activation can only ever attach to the row the host meant. There is no fuzzy matching of names and no "claim your history" flow to build or support.
- **No account is ever required to play.** A regular who never installs anything stays a full participant in the ledger for years. Accounts buy one thing: seeing the group from your own phone.
- **Nothing changes in the ledger at activation.** Entries reference `memberId`, which is unchanged. Activation is purely additive — it attaches a person to a row.
- **The name is the host's to set.** `displayName` lives on the member row (see § Member). An activated player may edit their own; the host may rename anyone. Neither rewrites history.

### What CC still decides

The mechanism, not the model:

- **What a person is authenticated by.** No passwords and no registration screens in this build. Propose the smallest credential that survives a lost device — a device key with a recovery link, a magic link to a phone number or e-mail, a passkey. State what it costs to move to real accounts later.
- **Link properties.** Single-use or reusable, expiry, and how the host re-issues one when a player changes phone. The design shows a 7-day expiry and a Reset link control on C3; per-player links should follow the same rules. Assume a link will be pasted into a group chat and design accordingly.
- **Cross-group identity.** A person plays in several groups and holds a member row in each. Two invites activated with the same credential should resolve to one person, so `G4 My stats` can aggregate across groups. Say how you detect that.
- **Storage on the device**, and what happens when the same person opens a link on a second phone.

### The group-wide link

C3 also shows a group invite link — "anyone with the link can join · expires in 7 days" — with copy, message, share and QR. Keep it as the secondary path, for someone joining a group themselves rather than being seated by the host. Someone arriving that way has no member row yet, so activation **creates** one instead of binding to one, and the host sees them appear in the roster.

Per-player links are the primary path and the one to build first. The group link is a convenience for the host who would rather post one thing into a group chat.

### Watchers

A watcher link is a different object: read-only, scoped to one session, and it grants no membership and no history. Do not overload the player invite for it.

---

## What the server needs to enforce

Even in a closed test, put these in one place server-side rather than trusting the client:

- Only the session's writer may append entries.
- Only the host may mark a payment paid.
- Entries are append-only; no update or delete path exists.
- `clientId` is unique per session.
- A settled session rejects new entries.
- A closed book rejects changes to its sessions.
