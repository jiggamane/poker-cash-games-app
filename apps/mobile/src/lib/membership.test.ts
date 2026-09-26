import { describe, expect, it } from 'vitest';
import type { Member } from './clubStore';
import {
  canTakeGame,
  membershipOf,
  passTargets,
  runsLine,
  willSpendHostNight,
  type Membership,
} from './membership';

/**
 * THE SEAM, HELD TO THE HANDOFF'S RULES — `design/handoff-game-admin/README.md`
 * § 1 and § 2.
 *
 * Two halves. The first holds the rules as written, against memberships built
 * by hand, so the day `membershipOf` returns real answers the screens already
 * do the right thing with them. The second holds what the seam answers TODAY —
 * Full for everybody — because a screen that starts gating people is the
 * regression this file exists to catch, and rev 18 § 4 says it must not happen
 * until membership ships.
 */

const member = (id: string, standing: Member['standing'] = 'member'): Member => ({
  id,
  name: id,
  standing,
  invited: false,
  paysKitty: true,
});

const free: Membership = { tier: 'free', hostNightUsed: false, hostNightRenewsOn: null };
const regularFree: Membership = {
  tier: 'regular',
  hostNightUsed: false,
  hostNightRenewsOn: new Date('2026-10-01'),
};
const regularUsed: Membership = { ...regularFree, hostNightUsed: true };
const full: Membership = { tier: 'full', hostNightUsed: false, hostNightRenewsOn: null };

describe('who can take a game (README § 1)', () => {
  it('Full always, Regular while the host night is unused, Free never', () => {
    expect(canTakeGame(full)).toBe(true);
    expect(canTakeGame(regularFree)).toBe(true);
    expect(canTakeGame(regularUsed)).toBe(false);
    expect(canTakeGame(free)).toBe(false);
  });

  it('spends a Regular host night once per game per person', () => {
    const fresh = { hostNightSpentBy: new Set<string>() };
    const already = { hostNightSpentBy: new Set(['ivo']) };
    expect(willSpendHostNight(regularFree, fresh, 'ivo')).toBe(true);
    // The same game coming back to Ivo later that night costs nothing.
    expect(willSpendHostNight(regularFree, already, 'ivo')).toBe(false);
    // Full never spends anything.
    expect(willSpendHostNight(full, fresh, 'lena')).toBe(false);
  });
});

describe('GR4’s "who can run a game" line never prints a tier name (state 18)', () => {
  const day = (d: Date) => `${d.getDate()} Oct`;
  it('says what each person can do, in the handoff’s words', () => {
    expect(runsLine(member('lena'), full, day)).toBe('any night');
    expect(runsLine(member('ivo'), regularFree, day)).toBe('one night left');
    expect(runsLine(member('petr'), regularUsed, day)).toBe('host night used · back on 1 Oct');
    expect(runsLine(member('tomas'), free, day)).toBe('watches for free');
    expect(runsLine(member('honza', 'name_only'), full, day)).toBe('no app yet');
  });
  it('contains no tier name', () => {
    // The tier NAMES — capitalised, as a price sits next to them. "watches for
    // free" is the handoff's own line and the word is not the tier.
    for (const m of [full, regularFree, regularUsed, free]) {
      expect(runsLine(member('x'), m, day)).not.toMatch(/\b(Full|Regular|Free)\b/);
    }
  });
});

describe('the pass sheet’s two lists (README § 2, passTargets)', () => {
  it('runs the checks in order: claimed, membership, not the current admin', () => {
    const marek = member('marek');
    const lena = member('lena');
    const honza = member('honza', 'name_only');
    const { can, cannot } = passTargets([marek, lena, honza], marek.id, {
      hostNightSpentBy: new Set(),
    });
    // The current admin is not listed at all.
    expect([...can, ...cannot].some((r) => r.member.id === 'marek')).toBe(false);
    expect(can.map((r) => r.member.id)).toEqual(['lena']);
    expect(cannot.map((r) => r.member.id)).toEqual(['honza']);
    expect(cannot[0]).toMatchObject({ kind: 'cannot', why: 'name_only' });
  });
});

describe('what the seam answers today (rev 18 § 4)', () => {
  it('is Full, for everybody with the app', () => {
    expect(membershipOf(member('anyone'))).toEqual(full);
    expect(canTakeGame(membershipOf(member('anyone')))).toBe(true);
  });

  it('never spends a host night', () => {
    expect(
      willSpendHostNight(membershipOf(member('ivo')), { hostNightSpentBy: new Set() }, 'ivo'),
    ).toBe(false);
  });

  it('so the only person a game cannot go to is a name with nobody behind it', () => {
    const { can, cannot } = passTargets(
      [member('a'), member('b'), member('c', 'name_only')],
      null,
      { hostNightSpentBy: new Set() },
    );
    expect(can).toHaveLength(2);
    expect(cannot.map((r) => (r.kind === 'cannot' ? r.why : null))).toEqual(['name_only']);
  });
});
