/**
 * The content lint — `docs/rulings.md` § 4 and § 11.
 *
 * It holds the shape of the library rather than its truth: every id unique,
 * every cash answer present and short enough to read aloud, a tournament note
 * only where one is written, every placeholder bound to a real key and
 * resolvable both with the group's rules set and unset, every `related` id
 * real, and the twelve on the Rulings sheet exactly twelve.
 */

import { describe, expect, it } from 'vitest';
import { EMPTY_TABLE_RULES, TABLE_RULE_KEYS, boundKeys, isTableRuleKey, resolveAnswer, type TableRules } from './tableRules';
import { AREAS, RULES_EDITION, SITUATIONS, atTheTable, inArea, situationById } from './situations';

const paragraphs = (body: string) => body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

const ALL_SET: TableRules = {
  buyIn: { min: 500 as never, max: 1_500 as never },
  shortBuy: 'one',
  rebuyCap: { kind: 'largestStack', percent: 50 },
  goingSouth: 'forbidden',
  leaveNotice: 'oneOrbit',
  returnWithin: 'oneHour',
  runItTwice: 'byAgreement',
  chops: 'never',
  straddle: 'underTheGun',
  button: 'dead',
  rabbitHunt: 'never',
  checkRaise: 'allowed',
  shortBank: 'hostAbsorbs',
  credit: { kind: 'deadlineDays', days: 3 },
};

describe('the library', () => {
  it('has an edition', () => {
    expect(RULES_EDITION).toMatch(/^\d{4}\.\d+$/);
  });

  it('gives every situation an id of its own, in its area', () => {
    const ids = SITUATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SITUATIONS) {
      expect(s.id, s.id).toMatch(/^[a-z]+\.[a-z0-9-]+$/);
      expect(s.id.split('.')[0], s.id).toBe(s.area);
      expect(AREAS.some((a) => a.id === s.area), s.id).toBe(true);
    }
  });

  it('orders each area without gaps or ties', () => {
    for (const area of AREAS) {
      const orders = inArea(area.id).map((s) => s.order);
      expect(orders, area.id).toEqual(orders.map((_, i) => i + 1));
    }
  });

  it('puts exactly twelve situations on the Rulings sheet', () => {
    expect(atTheTable()).toHaveLength(12);
  });

  it('always has a cash answer, at most three paragraphs, read aloud', () => {
    for (const s of SITUATIONS) {
      const ps = paragraphs(s.cash.body);
      expect(ps.length, s.id).toBeGreaterThan(0);
      expect(ps.length, s.id).toBeLessThanOrEqual(3);
      expect(s.cash.body, s.id).not.toMatch(/^\s*[-*•]/m);
      expect(s.cash.source.length, s.id).toBeGreaterThan(0);
      expect(s.title.trim().length, s.id).toBeGreaterThan(0);
    }
  });

  it('carries a tournament note only where one is written', () => {
    for (const s of SITUATIONS) {
      if (s.tournament === undefined) continue;
      expect(s.tournament.note.trim().length, s.id).toBeGreaterThan(0);
      expect(s.tournament.source.length, s.id).toBeGreaterThan(0);
    }
  });

  it('binds every placeholder to a real key and resolves it set and unset', () => {
    for (const s of SITUATIONS) {
      const keys = boundKeys(s.cash.body);
      for (const k of keys) expect(isTableRuleKey(k), `${s.id} binds ${k}`).toBe(true);
      const unset = resolveAnswer(s.cash.body, EMPTY_TABLE_RULES);
      const set = resolveAnswer(s.cash.body, ALL_SET);
      expect(unset, s.id).not.toMatch(/\{\{/);
      expect(set, s.id).not.toMatch(/\{\{/);
      if (keys.length > 0) {
        expect(unset, s.id).toMatch(/has not/);
        expect(set, s.id).not.toMatch(/has not (set|said|decided)/);
        /* A bound key is cited as the group's own rule. */
        expect(s.cash.source.some((c) => c.work === 'house'), s.id).toBe(true);
      }
    }
  });

  it('declares `binds` only as the body reads', () => {
    for (const s of SITUATIONS) {
      if (s.binds === undefined) continue;
      expect([...s.binds].sort(), s.id).toEqual([...boundKeys(s.cash.body)].sort());
    }
  });

  it('points `related` at situations that exist, never itself', () => {
    for (const s of SITUATIONS) {
      for (const r of s.related) {
        expect(situationById(r), `${s.id} → ${r}`).toBeDefined();
        expect(r, s.id).not.toBe(s.id);
      }
    }
  });

  it('marks nothing verified without a date and a name', () => {
    for (const s of SITUATIONS) {
      expect(['verified', 'draft'], s.id).toContain(s.status);
      if (s.status === 'verified') {
        expect(s.verified?.on, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(s.verified?.by.trim().length, s.id).toBeGreaterThan(0);
      } else {
        expect(s.verified, s.id).toBeUndefined();
      }
    }
  });

  it('names every TableRules key in at least one answer', () => {
    const read = new Set(SITUATIONS.flatMap((s) => boundKeys(s.cash.body)));
    const unread = TABLE_RULE_KEYS.filter((k) => !read.has(k) && k !== 'buyIn');
    expect(unread).toEqual([]);
  });
});
