import { describe, expect, it } from 'vitest';
import { DECK, cardText, parseCards, type Card } from './cards';
import { odds, type Hand } from './odds';
import { OUT_KIND, groupOuts, outsToCome } from './outs';
import { bestOfSeven, compareRanked, dealRandom, rng } from './reference';
import { standings } from './standing';

const cards = (s: string) => parseCards(s)!;
const hand = (s: string): Hand => cards(s) as unknown as Hand;
const text = (cs: readonly Card[]) => cs.map(cardText).sort().join(' ');

describe('the canvas example: A♥K♥ against 2♣2♦ on Q♥ J♥ 3♠ 7♣', () => {
  const input = { hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') };
  const outs = outsToCome(input)!;

  it('Player 1 wins on 18 river cards of 44, and Player 2 on 26', () => {
    expect(outs[0]!.wins).toHaveLength(18);
    expect(outs[1]!.wins).toHaveLength(26);
    expect(outs[0]!.splits).toHaveLength(0);
    expect(outs[1]!.splits).toHaveLength(0);
  });

  /*
   * THE CANVAS SAID "FLUSH 9", AND UNDER THE OWNER'S RULE IT IS RIGHT. The ten of
   * hearts makes A♥ K♥ Q♥ J♥ T♥, the royal — but a plain ace-high flush would have
   * beaten a pair of deuces just the same, so the ten is a heart like the other
   * eight and the group reads "Flush 9". "Straight flush" is a group of its own
   * only where a flush would not have won (the full house below).
   */
  it('Player 1: a flush on nine hearts — the ten of hearts among them, royal or not — a straight on three tens, one pair on six aces and kings', () => {
    const groups = groupOuts(outs[0]!.wins);
    expect(groups.map((g) => [g.kind, g.cards.length])).toEqual([
      ['Flush', 9],
      ['Straight', 3],
      ['One pair', 6],
    ]);
    expect(text(groups[0]!.cards)).toBe('2h 3h 4h 5h 6h 7h 8h 9h Th');
    expect(text(groups[1]!.cards)).toBe('Tc Td Ts');
    expect(text(groups[2]!.cards)).toBe('Ac Ad As Kc Kd Ks');
    expect(groups.some((g) => g.kind === 'Straight flush')).toBe(false);
  });

  it('Player 2: three of a kind on the last deuce, two pair on ten, a pair that holds on fifteen', () => {
    const groups = groupOuts(outs[1]!.wins);
    expect(groups.map((g) => [g.kind, g.cards.length])).toEqual([
      ['Three of a kind', 1],
      ['Two pair', 10],
      ['One pair', 15],
    ]);
    expect(text(groups[0]!.cards)).toBe('2s');
    expect(text(groups[1]!.cards)).toBe('3c 3d 7d 7s Jc Jd Js Qc Qd Qs');
    expect(text(groups[2]!.cards)).toBe('4c 4d 4s 5c 5d 5s 6c 6d 6s 8c 8d 8s 9c 9d 9s');
  });

  it('the groups are the strongest hand first, and the best rank first inside one', () => {
    const groups = groupOuts(outs[0]!.wins);
    expect(groups[2]!.cards.map(cardText)).toEqual(['Ac', 'Ad', 'As', 'Kc', 'Kd', 'Ks']);
    expect(groups[0]!.cards.map(cardText)).toEqual(['Th', '9h', '8h', '7h', '6h', '5h', '4h', '3h', '2h']);
  });

  it('every pair is one group, whatever its rank: an ace and a king are both One pair', () => {
    expect(OUT_KIND.Pair).toBe('One pair');
    expect(groupOuts(outs[0]!.wins).filter((g) => g.kind === 'One pair')).toHaveLength(1);
  });

  it('where Player 1 is the underdog and Player 2 the favourite', () => {
    const r = odds(input);
    expect(standings(r.seats).map((s) => s.kind)).toEqual(['behind', 'ahead']);
  });
});

describe('a straight flush is named only where a flush would not win: T♥J♥ against 9♠8♠ on 9♥ 8♥ 9♣ 8♣', () => {
  /* The other hand holds nines full of eights. A heart gives Player 1 a flush,
     which loses to it; only the seven and the queen of hearts — 7 8 9 T J and
     8 9 T J Q, straight flushes — win. So here the combination is the group. */
  const input = { hands: [hand('ThJh'), hand('9s8s')], board: cards('9h 8h 9c 8c') };
  const outs = outsToCome(input)!;

  it('wins on exactly the two straight-flush cards, and they read Straight flush', () => {
    expect(text(outs[0]!.wins.map((o) => o.card))).toBe('7h Qh');
    expect(groupOuts(outs[0]!.wins).map((g) => [g.kind, g.cards.length])).toEqual([['Straight flush', 2]]);
    expect(outs[0]!.splits).toHaveLength(0);
  });

  it('a plain heart is not a win: a flush loses to the full house', () => {
    const won = new Set(outs[0]!.wins.map((o) => cardText(o.card)));
    for (const h of ['2h', '3h', '4h', '5h', '6h', 'Ah', 'Kh']) expect(won.has(h)).toBe(false);
  });

  it('is still the engine’s own count', () => {
    const r = odds(input);
    expect(outs[0]!.wins).toHaveLength(r.seats[0]!.wins);
    expect(r.seats[0]!.wins).toBe(2);
  });
});

describe('what is and is not answered', () => {
  it('only with exactly one card to come', () => {
    const two = [hand('AhKh'), hand('2c2d')];
    expect(outsToCome({ hands: two, board: [] })).toBeNull();
    expect(outsToCome({ hands: two, board: cards('Qh Jh 3s') })).toBeNull();
    expect(outsToCome({ hands: two, board: cards('Qh Jh 3s 7c Kc') })).toBeNull();
    expect(outsToCome({ hands: two, board: cards('Qh Jh 3s 7c') })).not.toBeNull();
  });

  it('refuses a table the engine refuses, with the engine’s sentence', () => {
    expect(() => outsToCome({ hands: [hand('AhKh'), hand('AhQd')], board: cards('2c 3c 4c 5d') })).toThrow(/twice/);
  });

  it('a dead card is never an out', () => {
    const outs = outsToCome({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c'), dead: cards('Th 9h') })!;
    const all = [...outs[0]!.wins, ...outs[1]!.wins].map((o) => cardText(o.card));
    expect(all).not.toContain('Th');
    expect(all).not.toContain('9h');
    expect(outs[0]!.wins).toHaveLength(16);
  });
});

describe('a split is never a win', () => {
  /* Both hands play the board: a royal flush in spades on the board is shared by
     whatever the river is, except where a hand makes a better one — none can. */
  it('the board plays: every river card splits, none wins', () => {
    const outs = outsToCome({ hands: [hand('2c3d'), hand('2d3c')], board: cards('As Ks Qs Js') })!;
    const unseen = 52 - 8;
    expect(outs[0]!.wins).toHaveLength(0);
    expect(outs[1]!.wins).toHaveLength(0);
    expect(outs[0]!.splits).toHaveLength(unseen);
    expect(outs[1]!.splits).toHaveLength(unseen);
  });

  it('a card that wins for one hand is not in the other’s splits', () => {
    const outs = outsToCome({ hands: [hand('AsKd'), hand('AdKs')], board: cards('2c 3d 4h 9s') })!;
    const winners = new Set([...outs[0]!.wins, ...outs[1]!.wins].map((o) => o.card));
    for (const s of [...outs[0]!.splits, ...outs[1]!.splits]) expect(winners.has(s.card)).toBe(false);
    /* Mirror hands: whatever one wins the other would, so neither wins anything. */
    expect(outs[0]!.wins).toHaveLength(0);
    expect(outs[1]!.wins).toHaveLength(0);
  });
});

describe('the outs are the engine’s own wins, on random tables', () => {
  it('a seat’s wins and splits are its win and tie counts in odds()', () => {
    const next = rng(20251025);
    for (let n = 0; n < 150; n++) {
      const players = 2 + Math.floor(next() * 8);
      const dead = Math.floor(next() * 4);
      const dealt = dealRandom(next, players * 2 + 4 + dead);
      const hands: Hand[] = Array.from({ length: players }, (_, p) => [dealt[p * 2]!, dealt[p * 2 + 1]!]);
      const board = dealt.slice(players * 2, players * 2 + 4);
      const deadCards = dealt.slice(players * 2 + 4);
      const input = { hands, board, dead: deadCards };
      const outs = outsToCome(input)!;
      const r = odds(input);
      expect(outs.map((o) => o.wins.length)).toEqual(r.seats.map((s) => s.wins));
      expect(outs.map((o) => o.splits.length)).toEqual(r.seats.map((s) => s.ties));
      /* and the groups add up to the wins. */
      outs.forEach((o) => expect(groupOuts(o.wins).reduce((a, g) => a + g.cards.length, 0)).toBe(o.wins.length));
    }
  });

  it('agrees with the slow reference ranking, card by card', () => {
    const next = rng(777);
    for (let n = 0; n < 60; n++) {
      const players = 2 + Math.floor(next() * 4);
      const dealt = dealRandom(next, players * 2 + 4);
      const hands: Hand[] = Array.from({ length: players }, (_, p) => [dealt[p * 2]!, dealt[p * 2 + 1]!]);
      const board = dealt.slice(players * 2);
      const outs = outsToCome({ hands, board })!;
      const used = new Set<Card>(dealt);
      for (const card of DECK) {
        if (used.has(card)) continue;
        const ranked = hands.map((h) => bestOfSeven([...h, ...board, card]));
        let top = ranked[0]!;
        for (const x of ranked) if (compareRanked(x, top) > 0) top = x;
        const winners = ranked.flatMap((x, p) => (compareRanked(x, top) === 0 ? [p] : []));
        winners.forEach((p) => {
          const list = winners.length === 1 ? outs[p]!.wins : outs[p]!.splits;
          const other = winners.length === 1 ? outs[p]!.splits : outs[p]!.wins;
          expect(list.some((o) => o.card === card)).toBe(true);
          expect(other.some((o) => o.card === card)).toBe(false);
        });
        outs.forEach((o, p) => {
          if (!winners.includes(p)) {
            expect(o.wins.some((x) => x.card === card)).toBe(false);
            expect(o.splits.some((x) => x.card === card)).toBe(false);
          }
        });
      }
    }
  });
});

describe('where a hand stands', () => {
  const eq = (...e: number[]) => standings(e.map((equity) => ({ equity })));

  it('heads-up level is close for both, and a clear lead is ahead and behind', () => {
    expect(eq(0.5008, 0.4992).map((s) => s.kind)).toEqual(['close', 'close']);
    expect(eq(0.6475, 0.3525).map((s) => s.kind)).toEqual(['ahead', 'behind']);
    expect(eq(0.4091, 0.5909).map((s) => s.kind)).toEqual(['behind', 'ahead']);
  });

  it('8 points is the edge: inside it close, at it ahead and behind', () => {
    expect(eq(0.539, 0.461).map((s) => s.kind)).toEqual(['close', 'close']);
    expect(eq(0.54, 0.46).map((s) => s.kind)).toEqual(['ahead', 'behind']);
  });

  it('the colour deepens from 8 points to 70 and stops there', () => {
    expect(eq(0.54, 0.46)[0]!.depth).toBeCloseTo(0, 6);
    expect(eq(0.85, 0.15)[0]!.depth).toBeCloseTo(1, 6);
    expect(eq(1, 0).map((s) => s.depth)).toEqual([1, 1]);
    expect(eq(0.6475, 0.3525)[0]!.depth).toBeCloseTo((0.295 - 0.08) / 0.62, 6);
  });

  it('three hands: each against the best other — 42.9 / 47.6 / 9.5 is close, close, behind', () => {
    expect(eq(0.4286, 0.4762, 0.0952).map((s) => s.kind)).toEqual(['close', 'close', 'behind']);
  });

  it('a lone seat has nothing to be ahead of', () => {
    expect(eq(1).map((s) => s.kind)).toEqual(['close']);
  });
});
