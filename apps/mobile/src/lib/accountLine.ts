import type { Who } from './who';

/**
 * WHERE THIS BOOK LIVES — one line, one answer, B90.
 *
 * Settings used to answer that question in three places that could not see each
 * other. `Where it lives` read the queue and nothing else. `Signed in as` read
 * auth and nothing else. `Connection` read the server, only when tapped, and
 * landed as a third note further down the same list. A host with a full queue
 * and no account read *Saved on this phone · 12 waiting* under one heading and
 * *Sign in to keep a copy on the server* under another, and had to work out for
 * themselves that those are the same sentence.
 *
 * Worse, the two could contradict each other outright. `backupLine()` said
 * **Backed up** whenever the queue was empty — and the queue is empty on a
 * phone that has never signed in and never sent a byte, because the seeded
 * night is kept out of it by `queueable.ts` on purpose. So the most reassuring
 * string in the app was reachable by having nothing to reassure anybody about.
 * That is B84's own fault — *"not asked yet must never read as Backed up"* —
 * one axis over.
 *
 * So the two axes are answered together or not at all. This is that function:
 * it takes every fact the screen has and returns the line, the sentence under
 * it, and whether either is reporting a fault. Pure, for the same reason
 * `backupLine` was pure and this replaces it — the states are worth a test and
 * a test should not need a queue, a network or a screen.
 *
 * ⚠ TWO STRINGS HERE ARE NEW AND NO BOARD DREW THEM. Settings is governed by no
 * handoff cut, which `docs/screens.md` records. Everything else below is
 * verbatim from where it already lived — `docs/storage-and-sync.md`'s three
 * backup states, Settings' own signed-out invitation, and `connection.ts`'s
 * verdict on a refused sign-in. The two that are mine are marked NEW COPY where
 * they are written, and both are flagged in `docs/screens.md`.
 */

export interface BackupState {
  /** Operations still queued, across every night this phone holds. */
  waiting: number;
  /** What the server said the last time the head of the queue was tried. */
  lastError: string | null;
}

/**
 * What the connection probe found, where it bears on the account.
 *
 * Structurally a `ConnectionReport`, and deliberately not imported as one: this
 * function uses exactly one of its verdicts — the sign-in the server no longer
 * accepts — and passing the whole report keeps `connection.ts` the only owner
 * of those sentences. Every other verdict is about the build or the network and
 * still renders as its own note.
 */
export interface Probe {
  headline: string;
  detail: string;
  staleSignIn: boolean;
}

export interface AccountFacts {
  /** Whether this build has a Supabase project at all. */
  configured: boolean;
  /** True until the stored session has been read back off disk. */
  loading: boolean;
  who: Who;
  /** Null is NOT asked yet, which is not the same as an empty queue. */
  backup: BackupState | null;
  /** Null until somebody taps Connection. */
  probe: Probe | null;
}

export interface AccountLine {
  /** The value of the row: where this book lives, in four words or so. */
  where: string;
  /** The sentence under it, or null when the row is the whole answer. */
  detail: string | null;
  /** What the server said, while something is actually stuck. */
  trouble: string | null;
  /** Whether the line is reporting a fault, for colour. */
  wrong: boolean;
}

/** Verbatim from Settings, where it was the signed-out note. */
const SIGN_IN =
  'Sign in to keep a copy on the server, so a night survives a lost phone and other people can ' +
  'watch it. Nothing recorded so far is lost either way — it is queued and sent the moment you do.';

/**
 * NEW COPY. There was no string for this state because nothing in the app
 * believed the state existed: a watcher's phone answered "signed in" and was
 * handed the host's controls.
 */
const WATCHER =
  'This phone holds a watch link or a claimed seat, not an account — it can read somebody ' +
  'else’s night, and it cannot keep your own. Sign in to put your nights on the server.';

/** Verbatim from Settings, where it was the not-configured note. */
const NO_SERVER = 'No server is configured for this build, so nothing leaves the phone.';

/**
 * The line the host reads.
 *
 * The order of the questions is the point of it. Whether there is a server at
 * all comes before who is signed in, which comes before whether the server
 * still accepts them, which comes before how much is queued — because each one
 * makes the ones after it meaningless, and the old screen asked them in the
 * opposite order and drew all three at once.
 */
export function accountLine(facts: AccountFacts): AccountLine {
  const { configured, loading, who, backup, probe } = facts;

  if (!configured) {
    return { where: 'Saved on this phone', detail: NO_SERVER, trouble: null, wrong: false };
  }

  /* Auth has not answered yet. Saying anything about an account here flashes it
     at a host who signed in weeks ago — see `useSession`. */
  if (loading) return { where: 'Checking…', detail: null, trouble: null, wrong: false };

  /*
   * A SIGN-IN THE SERVER HAS STOPPED ACCEPTING is the state where every other
   * line on this screen lies in the same direction: auth still holds a session,
   * the queue is still counting, and not one request will be honoured. It
   * survives a restart and `autoRefreshToken` cannot mend it, so it outranks
   * the queue entirely.
   */
  if (who.kind === 'person' && probe !== null && probe.staleSignIn) {
    return { where: probe.headline, detail: probe.detail, trouble: null, wrong: true };
  }

  const waiting = backup?.waiting ?? null;
  /* ONLY WHILE SOMETHING IS ACTUALLY WAITING — B84. `remove()` does not clear
     `last_error`, so a drained queue still carries the complaint that emptied
     it, and "Backed up" over a network failure tells a host to believe two
     things at once. */
  const trouble = waiting === null || waiting === 0 ? null : (backup?.lastError ?? null);

  if (who.kind !== 'person') {
    const detail = who.kind === 'anonymous' ? WATCHER : SIGN_IN;
    /*
     * NOT "Backed up", at any queue depth. Nothing here can send, so an empty
     * queue means nothing was ever queued — which on a fresh phone is exactly
     * what the seeded night looks like.
     *
     * AND NO TROUBLE LINE. `last_error` outlives the session that earned it, so
     * a host who signs out with something stuck would read the server's
     * complaint under a sentence explaining that nothing is being sent. The
     * reason nothing is moving is the sentence; the error is the last account's
     * and comes back with it.
     */
    return { where: onPhone(waiting), detail, trouble: null, wrong: false };
  }

  /* Not asked yet. The one string that must never be optimistic. */
  if (waiting === null) return { where: '—', detail: null, trouble: null, wrong: false };

  if (waiting === 0) return { where: 'Backed up', detail: null, trouble: null, wrong: false };

  return { where: onPhone(waiting), detail: null, trouble, wrong: trouble !== null };
}

/**
 * The phone's half, with the count when there is one.
 *
 * `docs/storage-and-sync.md`'s own wording. NEW COPY only in that the count can
 * now be absent: a phone that cannot send does not gain a queue depth by being
 * asked, and `Saved on this phone · 0 waiting` reads as a failure to send
 * nothing.
 */
const onPhone = (waiting: number | null): string =>
  waiting === null || waiting === 0
    ? 'Saved on this phone'
    : `Saved on this phone · ${waiting} waiting`;
