import { randomUUID } from 'expo-crypto';

/**
 * What is allowed to leave the phone.
 *
 * Every id the server stores is a uuid column, so an id that is not a uuid can
 * never be written there — and the queue HALTS AT ITS FIRST FAILURE, on purpose,
 * because the log has to arrive in order. Those two facts together are the whole
 * hazard: one unsendable row at the head of the line blocks every real night
 * behind it, for ever, on a queue that retries by design.
 *
 * So an id that cannot be sent must never be queued in the first place. That is
 * a decision about a string, which is why it is out here as one pure function
 * with a test rather than a regex repeated down `sync.ts`.
 *
 * THE SAMPLE NIGHT IS THE CASE THIS WAS WRITTEN FOR — B56. The app seeds itself
 * with a demo night so there is a club to start from and a screen to hold
 * against the canonical frame, and on a fresh install that seeded night is the
 * ACTIVE one: `openNight()` loads it, and every screen, `/count-up` included,
 * is pointed at it. It is also the one night that never queued a `session.open`,
 * because `seedNight` writes local rows and calls nothing. So a host who counted
 * a demo stack, signed in, and drained would send a count for a session the
 * server has never heard of, take a foreign-key refusal, and stop the queue on
 * the spot — with their real nights sitting behind it.
 *
 * It is fixed by giving the sample night an id the server could not accept
 * anyway, so it is refused HERE, at the one gate that already existed for it:
 * *"such a night stays on the phone and works completely. It simply never
 * leaves."*
 */

/** Anchored: a prefix is enough to keep a string out, which is the point. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * May a row about this id be queued for the server?
 *
 * False for the sample night, and for nights from before ids were uuids. Both
 * work completely on the phone; neither is ever sent.
 */
export const leavesThePhone = (id: string): boolean => UUID.test(id);

/**
 * An id for the sample night: unique, stable for as long as the seed lives, and
 * deliberately NOT a uuid.
 *
 * The prefix is the whole mechanism, and it is doing real work rather than
 * labelling — `leavesThePhone` is anchored, so `sample:` in front of a perfectly
 * good uuid is what makes the id unsendable. It reads as what it is in a
 * database browser too, which is worth something at 1am.
 */
export const sampleSessionId = (): string => `sample:${randomUUID()}`;

/** Is this the app's own demo data, judged by the id alone? */
export const isSampleId = (id: string): boolean => id.startsWith('sample:');
