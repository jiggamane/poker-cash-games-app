import { describe, expect, it } from 'vitest';
import { backupLine, backupTrouble, type BackupState } from './backupLine';

/**
 * THE THREE STATES OF THE BACKUP LINE — B84.
 *
 * The fault was not a wrong string, it was a CONSTANT one: Settings said
 * `On this phone` whether or not the book was anywhere else, and never showed
 * why a send had failed. So the thing worth pinning is that each state is
 * distinguishable from the others, and that the reassuring one is only reachable
 * by actually being backed up.
 */
const state = (waiting: number, lastError: string | null = null): BackupState => ({
  waiting,
  lastError,
});

describe('what the host is told about the queue', () => {
  it('says Backed up only when nothing is waiting', () => {
    expect(backupLine(state(0))).toBe('Backed up');
    expect(backupLine(state(1))).not.toBe('Backed up');
  });

  it('counts what is waiting, in the handoff’s own wording', () => {
    expect(backupLine(state(12))).toBe('Saved on this phone · 12 waiting');
    expect(backupLine(state(1))).toBe('Saved on this phone · 1 waiting');
  });

  /*
   * NOT ASKED YET IS NOT THE SAME AS BACKED UP, and this is the whole bug in
   * one line: the old screen printed something reassuring without having
   * checked anything at all.
   */
  it('never claims to be backed up before it has looked', () => {
    expect(backupLine(null)).toBe('—');
  });

  it('gives the reason while something is stuck', () => {
    expect(backupTrouble(state(3, 'ledger_entry: duplicate key'))).toBe(
      'ledger_entry: duplicate key',
    );
  });

  it('and no reason when there is nothing to explain', () => {
    expect(backupTrouble(state(3))).toBeNull();
    expect(backupTrouble(null)).toBeNull();
  });

  /*
   * A drained queue that still carries an old error would otherwise draw
   * "Backed up" with a network failure underneath it — `remove()` deletes the
   * row the error belonged to and does not clear the column.
   */
  it('drops a stale error once the queue is empty', () => {
    expect(backupLine(state(0, 'Network request failed'))).toBe('Backed up');
    expect(backupTrouble(state(0, 'Network request failed'))).toBeNull();
  });
});
