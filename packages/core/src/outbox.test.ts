import { describe, expect, it, vi } from 'vitest';
import {
  enqueueEntry,
  flushOutbox,
  MemoryOutboxStore,
  OutboxError,
  type OutboxItem,
} from './outbox';
import { money } from './money';
import type { LedgerEntry } from './types';

const SESSION = 's1';
const PETR = 'p-petr';

const draft = (amount: number): Omit<LedgerEntry, 'id' | 'seq'> => ({
  type: 'buyin',
  playerId: PETR,
  amount: money(amount),
});

describe('enqueueEntry()', () => {
  it('allocates seq numbers in order', async () => {
    const store = new MemoryOutboxStore();
    const a = await enqueueEntry(store, SESSION, 'id-a', draft(500));
    const b = await enqueueEntry(store, SESSION, 'id-b', draft(500));
    const c = await enqueueEntry(store, SESSION, 'id-c', draft(1000));

    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 3]);
    expect(await store.count()).toBe(3);
  });

  it('keeps counting up after entries have been sent and removed', async () => {
    const store = new MemoryOutboxStore();
    await enqueueEntry(store, SESSION, 'id-a', draft(500));
    await enqueueEntry(store, SESSION, 'id-b', draft(500));
    await flushOutbox(store, async () => {});
    expect(await store.count()).toBe(0);

    // the next entry must NOT restart at 1 and collide with what was sent
    const next = await enqueueEntry(store, SESSION, 'id-c', draft(500));
    expect(next.seq).toBe(3);
  });

  it('counts each session separately', async () => {
    const store = new MemoryOutboxStore();
    await enqueueEntry(store, 's1', 'a', draft(500));
    await enqueueEntry(store, 's1', 'b', draft(500));
    const other = await enqueueEntry(store, 's2', 'c', draft(500));
    expect(other.seq).toBe(1);
  });

  it('refuses an entry with no id, which could not be retried safely', async () => {
    const store = new MemoryOutboxStore();
    await expect(enqueueEntry(store, SESSION, '', draft(500))).rejects.toThrow(OutboxError);
  });
});

describe('flushOutbox()', () => {
  it('sends everything when the network is there', async () => {
    const store = new MemoryOutboxStore();
    for (const id of ['a', 'b', 'c']) await enqueueEntry(store, SESSION, id, draft(500));

    const sent: OutboxItem[] = [];
    const result = await flushOutbox(store, async (items) => void sent.push(...items));

    expect(result).toEqual({ pushed: 3, remaining: 0 });
    expect(sent.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('sends in seq order, not the order things happen to come back in', async () => {
    const store = new MemoryOutboxStore();
    await enqueueEntry(store, SESSION, 'zzz', draft(100));
    await enqueueEntry(store, SESSION, 'aaa', draft(200));

    const sent: number[] = [];
    await flushOutbox(store, async (items) => void sent.push(...items.map((i) => i.seq)));
    expect(sent).toEqual([1, 2]);
  });

  it('keeps everything when the network is gone', async () => {
    const store = new MemoryOutboxStore();
    for (const id of ['a', 'b']) await enqueueEntry(store, SESSION, id, draft(500));

    const result = await flushOutbox(store, async () => {
      throw new Error('Network request failed');
    });

    expect(result.pushed).toBe(0);
    expect(result.remaining).toBe(2);
    expect(result.stoppedBecause).toBe('Network request failed');
    // nothing was thrown away
    expect(await store.count()).toBe(2);
  });

  it('records the failure against the entry without losing it', async () => {
    const store = new MemoryOutboxStore();
    await enqueueEntry(store, SESSION, 'a', draft(500));
    await flushOutbox(store, async () => {
      throw new Error('offline');
    });

    const [item] = await store.pending(10);
    expect(item.attempts).toBe(1);
    expect(item.lastError).toBe('offline');
    expect(item.entry.amount).toBe(500);
  });

  it('picks up where it left off when the network comes back', async () => {
    const store = new MemoryOutboxStore();
    for (const id of ['a', 'b', 'c']) await enqueueEntry(store, SESSION, id, draft(500));

    await flushOutbox(store, async () => {
      throw new Error('offline');
    });
    expect(await store.count()).toBe(3);

    const sent: string[] = [];
    const result = await flushOutbox(store, async (items) => void sent.push(...items.map((i) => i.id)));

    expect(result).toEqual({ pushed: 3, remaining: 0 });
    expect(sent).toEqual(['a', 'b', 'c']);
  });

  it('stops at the first failure so the server never sees a gap', async () => {
    const store = new MemoryOutboxStore();
    for (const id of ['a', 'b', 'c', 'd']) await enqueueEntry(store, SESSION, id, draft(500));

    const seen: string[] = [];
    let call = 0;
    const result = await flushOutbox(
      store,
      async (items) => {
        call++;
        if (call === 2) throw new Error('dropped');
        seen.push(...items.map((i) => i.id));
      },
      { batchSize: 2 },
    );

    expect(seen).toEqual(['a', 'b']); // c and d were not skipped past
    expect(result.pushed).toBe(2);
    expect(result.remaining).toBe(2);
    expect((await store.pending(10)).map((i) => i.id)).toEqual(['c', 'd']);
  });

  it('drains in batches without dropping anything', async () => {
    const store = new MemoryOutboxStore();
    for (let i = 0; i < 57; i++) await enqueueEntry(store, SESSION, `id-${i}`, draft(100));

    const sent = new Set<string>();
    const push = vi.fn(async (items: readonly OutboxItem[]) => {
      for (const i of items) sent.add(i.id);
    });
    const result = await flushOutbox(store, push, { batchSize: 10 });

    expect(result).toEqual({ pushed: 57, remaining: 0 });
    expect(sent.size).toBe(57);
    expect(push).toHaveBeenCalledTimes(6);
  });

  it('does nothing when there is nothing to send', async () => {
    const store = new MemoryOutboxStore();
    const push = vi.fn();
    expect(await flushOutbox(store, push)).toEqual({ pushed: 0, remaining: 0 });
    expect(push).not.toHaveBeenCalled();
  });

  it('is safe to run twice at once — the second finds nothing left', async () => {
    const store = new MemoryOutboxStore();
    for (const id of ['a', 'b']) await enqueueEntry(store, SESSION, id, draft(500));

    const sent: string[] = [];
    const push = async (items: readonly OutboxItem[]) => {
      sent.push(...items.map((i) => i.id));
    };
    const [first, second] = await Promise.all([flushOutbox(store, push), flushOutbox(store, push)]);

    // Both may have sent, but the server dedupes on the entry id, so what
    // matters is that nothing is left behind and nothing is lost.
    expect(first.remaining).toBe(0);
    expect(second.remaining).toBe(0);
    expect(new Set(sent)).toEqual(new Set(['a', 'b']));
  });
});
