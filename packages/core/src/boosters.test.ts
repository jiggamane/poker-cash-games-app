import { describe, expect, it } from 'vitest';
import { BOOSTERS, BOOSTER_SECTIONS, boosterById, boostersIn } from './boosters';

/**
 * The shape of the boosters list — the copy rules in `boosters.ts`. Nothing
 * here is money; it is held so a booster added later cannot break the list
 * row or the sheet it opens.
 */
describe('game boosters', () => {
  it('has a stable, unique id per booster', () => {
    const ids = BOOSTERS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    for (const b of BOOSTERS) expect(boosterById(b.id)).toBe(b);
  });

  it('puts every booster in a listed section, and lists every section', () => {
    const listed = BOOSTER_SECTIONS.flatMap((s) => boostersIn(s.id));
    expect(listed).toHaveLength(BOOSTERS.length);
    for (const s of BOOSTER_SECTIONS) expect(boostersIn(s.id).length).toBeGreaterThan(0);
  });

  it('keeps a summary to one short line under the name', () => {
    for (const b of BOOSTERS) {
      expect(b.summary.length, b.id).toBeLessThanOrEqual(52);
      expect(b.summary, b.id).not.toMatch(/\.$/);
    }
  });

  it('describes every booster in full: what, how, and what to agree', () => {
    for (const b of BOOSTERS) {
      expect(b.what.length, b.id).toBeGreaterThan(0);
      expect(b.how.length, b.id).toBeGreaterThanOrEqual(2);
      expect(b.agree.length, b.id).toBeGreaterThanOrEqual(1);
      const options = (b.choices ?? []).flatMap((c) => c.options.map((o) => o.text));
      for (const line of [b.what, ...b.how, ...b.agree, ...(b.variations ?? []), ...options, b.worth ?? '.']) {
        expect(line.trim(), b.id).toBe(line);
        expect(line, b.id).toMatch(/[.!?]$/);
      }
    }
  });

  it('offers at least two named options for every choice', () => {
    for (const b of BOOSTERS) {
      for (const c of b.choices ?? []) {
        expect(c.options.length, `${b.id}: ${c.label}`).toBeGreaterThanOrEqual(2);
        const names = c.options.map((o) => o.name);
        expect(new Set(names).size, `${b.id}: ${c.label}`).toBe(names.length);
        expect(c.label, b.id).not.toMatch(/[.?]$/);
      }
    }
  });

  it('carries the four the owner named: button game, stand-up game, and the bomb pots', () => {
    for (const id of ['button-game', 'stand-up', 'bomb-pot', 'double-board']) {
      expect(boosterById(id), id).toBeDefined();
    }
  });
});
