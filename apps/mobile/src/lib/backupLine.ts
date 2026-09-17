/**
 * WHETHER THIS PHONE'S BOOK IS ANYWHERE ELSE — B84.
 *
 * Settings drew `Where it lives: On this phone`, a hard-coded string, on a
 * phone whose every night was on the server and on one that had never reached
 * it. The queue depth was beside it and the queue's ERROR was nowhere: a send
 * stuck behind a row the server refuses looks exactly like a send that is merely
 * waiting, and the reason — already recorded against the operation by
 * `markAttempt` — was read by nothing.
 *
 * Pure, and takes the status rather than fetching it, for the reason every
 * other helper in this folder is: the three states are worth a test and a test
 * should not need a queue, a network or a screen.
 *
 * The wording is `docs/storage-and-sync.md`'s own, which specified it and was
 * never built against. Per CLAUDE.md, no copy here was invented.
 */

export interface BackupState {
  /** Operations still queued, across every night this phone holds. */
  waiting: number;
  /** What the server said the last time the head of the queue was tried. */
  lastError: string | null;
}

/**
 * The line the host reads.
 *
 * Null is "not asked yet", which is not the same as zero and must not read as
 * `Backed up` — the whole fault this replaces was a line that said something
 * reassuring without having checked.
 */
export function backupLine(status: BackupState | null): string {
  if (status === null) return '—';
  if (status.waiting === 0) return 'Backed up';
  return `Saved on this phone · ${status.waiting} waiting`;
}

/**
 * The reason, when there is one, for the line underneath.
 *
 * ONLY WHILE SOMETHING IS ACTUALLY WAITING. An error left over from a failure
 * that has since drained is a stale complaint about a queue that is now empty,
 * and `remove()` does not clear `last_error` because the row it belonged to is
 * gone. A host reading "Backed up" and a network error together would not know
 * which to believe.
 */
export function backupTrouble(status: BackupState | null): string | null {
  if (status === null || status.waiting === 0) return null;
  return status.lastError;
}
