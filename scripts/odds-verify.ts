/**
 * The odds engine, held to the facts about poker that nobody disputes.
 *
 *   npm run odds:verify                 a few minutes
 *   npm run odds:verify -- --spots=60   more random tables per street (default 30)
 *
 * `npm run check` proves the engine against a slow second implementation, and
 * against every five-card hand there is. This goes the rest of the way and is
 * too slow to run on every commit — which is why it has a name of its own, the
 * way `db:verify` has. Run it before a merge that touched `packages/core/src/odds`.
 *
 * 1. THE SEVEN-CARD CENSUS. All 133,784,560 hands of seven cards, each
 *    evaluated once by the engine and once by the slow reference. How many are
 *    a flush, a full house, a straight flush is a fact printed in every poker
 *    text, and the engine has to hit every one exactly.
 *
 *    The category counts cannot see a tie-break gone wrong — a kicker read
 *    that does not play, or one that does and is skipped, leaves every
 *    category count where it was. So each hand is also ranked by the reference,
 *    through a table of all 2,598,960 five-card hands ranked by the slow
 *    five-card ranker and the best of a hand's twenty-one fives taken, and the
 *    two are required to agree on EVERYTHING: every strength the engine gives
 *    is one strength to the reference and the other way round (a one-to-one
 *    match, not a total), and the order of the strengths is the same.
 *
 *    (An earlier version of this file expected 7,462 distinct strengths, which
 *    is the five-card figure. Seven cards cannot reach all of them — a hand
 *    whose best five is 7-5-4-3-2 needs two more cards that improve nothing,
 *    and there are none — so the count is lower, and what it is comes from the
 *    reference rather than from anyone's memory.)
 *
 * 2. PRE-FLOP INVARIANCE. The whole 1.7 million boards, dealt for real, with
 *    the suits renamed, the seats reordered, and the hands mirrored. Poker says
 *    none of it can change an answer, so none of it may change a count.
 *
 * 3. RANDOM TABLES, EVERY BOARD. Thirty tables on each street — before the
 *    flop, on the flop, the turn and the river — two to nine players, with up to
 *    three dead cards, each calculated by the engine and again by a reference
 *    that shares nothing with it: boards enumerated by plain recursion, each
 *    hand ranked through the five-card table above. Boards, wins and ties must
 *    match for every seat. Before the flop that is up to 1.7 million boards a
 *    table, every one of them counted twice.
 */

import { DECK, cardText, parseCards, type Card } from '../packages/core/src/odds/cards';
import { evaluate } from '../packages/core/src/odds/evaluate';
import { odds, type Hand } from '../packages/core/src/odds/odds';
import { dealRandom, rankFive, rng } from '../packages/core/src/odds/reference';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
let failed = 0;
const say = (ok: boolean, line: string) => {
  if (!ok) failed++;
  console.log(`${ok ? '  ok ' : ' FAIL'}  ${line}`);
};
const seconds = (t: number) => ((Date.now() - t) / 1000).toFixed(1) + 's';
const n = (x: number) => x.toLocaleString('en-US');

/* ── 1 · the census ───────────────────────────────────────────────────── */

/** Published, and summing to C(52,7). Royal flush is a straight flush to the ace. */
const PUBLISHED_SEVEN: Record<string, number> = {
  'High card': 23_294_460,
  Pair: 58_627_800,
  'Two pair': 31_433_400,
  'Three of a kind': 6_461_620,
  Straight: 6_180_020,
  Flush: 4_047_644,
  'Full house': 3_473_184,
  'Four of a kind': 224_848,
  'Straight flush': 37_260,
  'Royal flush': 4_324,
};
const NAMES = Object.keys(PUBLISHED_SEVEN);

/** The slow ranker's answer as one integer that sorts the way `compareRanked` does. */
const refKey = (cards: readonly Card[]): number => {
  const r = rankFive(cards);
  let k = r.category;
  for (let i = 0; i < 5; i++) k = k * 13 + (r.tiebreak[i] ?? 0);
  return k;
};

/** C(n, k) for k = 1..5, n = 0..51 — the combinatorial number system's own table. */
const BINOM: Int32Array[] = (() => {
  const t = [new Int32Array(52)];
  for (let k = 1; k <= 5; k++) {
    const row = new Int32Array(52);
    for (let m = 0; m < 52; m++) {
      let c = 1;
      for (let i = 1; i <= k; i++) c = (c * (m - k + i)) / i;
      row[m] = m < k ? 0 : Math.round(c);
    }
    t.push(row);
  }
  return t;
})();

/** Every five-card hand's reference key, indexed by its sorted cards' combinadic. */
function fiveCardTable(): Int32Array {
  const table = new Int32Array(2_598_960).fill(-1);
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let d = c + 1; d < 51; d++)
          for (let e = d + 1; e < 52; e++) {
            const at = BINOM[1]![a]! + BINOM[2]![b]! + BINOM[3]![c]! + BINOM[4]![d]! + BINOM[5]![e]!;
            if (table[at] !== -1) throw new Error('combinadic index collided');
            table[at] = refKey([a, b, c, d, e]);
          }
  return table;
}

let TABLE: Int32Array | null = null;
const fiveTable = (): Int32Array => (TABLE ??= fiveCardTable());

function census() {
  console.log('\n1 · every hand of seven cards');
  const t = Date.now();
  const table = fiveTable();
  console.log(`    all 2,598,960 five-card hands ranked by the slow ranker (${seconds(t)})`);

  /* The 21 ways to leave two of seven cards out: positions of the five kept. */
  const keep: number[] = [];
  for (let i = 0; i < 7; i++)
    for (let j = i + 1; j < 7; j++) for (let p = 0; p < 7; p++) if (p !== i && p !== j) keep.push(p);
  const [B1, B2, B3, B4, B5] = [BINOM[1]!, BINOM[2]!, BINOM[3]!, BINOM[4]!, BINOM[5]!];

  const got = new Array<number>(10).fill(0);
  const engineToRef = new Int32Array(9 << 20).fill(-1);
  const refToEngine = new Int32Array(9 * 13 ** 5 + 13 ** 5).fill(-1);
  let merged = 0; // an engine strength that is two different strengths to the reference
  let split = 0; // a reference strength that is two different strengths to the engine
  const h: Card[] = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  for (let a = 0; a < 46; a++) {
    h[0] = a;
    for (let b = a + 1; b < 47; b++) {
      h[1] = b;
      for (let c = b + 1; c < 48; c++) {
        h[2] = c;
        for (let d = c + 1; d < 49; d++) {
          h[3] = d;
          for (let e = d + 1; e < 50; e++) {
            h[4] = e;
            for (let f = e + 1; f < 51; f++) {
              h[5] = f;
              for (let g = f + 1; g < 52; g++) {
                h[6] = g;
                const v = evaluate(h);
                const cat = v >> 20;
                got[cat === 8 && ((v >> 16) & 15) === 12 ? 9 : cat]!++;

                /* The reference's strength: the best of the twenty-one fives. */
                let r = -1;
                for (let s = 0; s < 105; s += 5) {
                  const at =
                    B1[h[keep[s]!]!]! + B2[h[keep[s + 1]!]!]! + B3[h[keep[s + 2]!]!]! +
                    B4[h[keep[s + 3]!]!]! + B5[h[keep[s + 4]!]!]!;
                  const k = table[at]!;
                  if (k > r) r = k;
                }
                const seenR = engineToRef[v]!;
                if (seenR === -1) engineToRef[v] = r;
                else if (seenR !== r) merged++;
                const seenV = refToEngine[r]!;
                if (seenV === -1) refToEngine[r] = v;
                else if (seenV !== v) split++;
                total++;
              }
            }
          }
        }
      }
    }
    if (a % 9 === 0) process.stdout.write(`    …first card ${a} of 45, ${seconds(t)}\r`);
  }
  console.log(`    ${n(total)} hands in ${seconds(t)}${' '.repeat(30)}`);
  say(total === 133_784_560, `${n(total)} hands dealt, C(52,7) = 133,784,560`);
  NAMES.forEach((name, i) => {
    const want = PUBLISHED_SEVEN[name]!;
    say(got[i]! === want, `${name.padEnd(16)} ${n(got[i]!).padStart(11)}   published ${n(want)}`);
  });

  let engineStrengths = 0;
  let refStrengths = 0;
  for (let i = 0; i < engineToRef.length; i++) if (engineToRef[i] !== -1) engineStrengths++;
  for (let i = 0; i < refToEngine.length; i++) if (refToEngine[i] !== -1) refStrengths++;
  say(
    engineStrengths === refStrengths,
    `${n(engineStrengths)} distinct strengths by the engine, ${n(refStrengths)} by the reference`,
  );
  say(merged === 0, `no two hands the reference ranks differently get the same engine strength (${n(merged)} found)`);
  say(split === 0, `no two hands the reference ranks alike get different engine strengths (${n(split)} found)`);

  /* And the order: as the engine's strengths rise, so do the reference's. */
  let out = 0;
  let last = -1;
  for (let v = 0; v < engineToRef.length; v++) {
    const r = engineToRef[v]!;
    if (r === -1) continue;
    if (r <= last) out++;
    last = r;
  }
  say(out === 0, `the strengths are in the same order (${n(out)} out of place)`);
}

/* ── 2 · pre-flop invariance ──────────────────────────────────────────── */

const same = (a: ReturnType<typeof odds>, b: ReturnType<typeof odds>) =>
  a.boards === b.boards &&
  a.seats.every((s, i) => s.wins === b.seats[i]!.wins && s.ties === b.seats[i]!.ties && s.equity === b.seats[i]!.equity);

function invariance() {
  console.log('\n2 · pre-flop, every board, under changes that cannot matter');
  const t = Date.now();
  const base = [hand('AsKs'), hand('QdQc')];
  const r = odds({ hands: base, board: [] });
  say(r.boards === 1_712_304, `heads-up  ${n(r.boards)} boards   (${seconds(t)})`);

  /* Rename the suits: spades→hearts→clubs→diamonds→spades. */
  const rot = (c: Card): Card => (c >> 2) * 4 + [3, 0, 1, 2][c & 3]!;
  say(
    same(r, odds({ hands: base.map(([a, b]) => [rot(a), rot(b)] as unknown as Hand), board: [] })),
    'suits renamed: every count identical',
  );
  say(same(r, { ...odds({ hands: [base[1]!, base[0]!], board: [] }), seats: [...odds({ hands: [base[1]!, base[0]!], board: [] }).seats].reverse() }), 'seats swapped: each seat keeps its counts');

  const mirror = odds({ hands: [hand('AsKs'), hand('AhKh')], board: [] });
  say(
    mirror.seats[0]!.wins === mirror.seats[1]!.wins && mirror.seats[0]!.ties === mirror.seats[1]!.ties,
    `A♠K♠ against A♥K♥: level (${n(mirror.seats[0]!.wins)} each, ${n(mirror.seats[0]!.ties)} split)`,
  );

  const four = [hand('AsKs'), hand('QdQc'), hand('7h6h'), hand('JdTd')];
  const f = odds({ hands: four, board: [] });
  const shuffled = [2, 0, 3, 1];
  const g = odds({ hands: shuffled.map((i) => four[i]!), board: [] });
  say(
    shuffled.every((from, to) => g.seats[to]!.wins === f.seats[from]!.wins && g.seats[to]!.ties === f.seats[from]!.ties) &&
      Math.abs(f.seats.reduce((s, x) => s + x.equity, 0) - 1) < 1e-15,
    `four-handed ${n(f.boards)} boards: reordered seats keep their counts, equity sums to 1`,
  );
  console.log(`    (${seconds(t)})`);
}

/* ── 3 · random tables, every board, counted twice ──────────────────── */

/** The reference for one table: boards by recursion, hands by the five-card table. */
function referenceCounts(hands: readonly Hand[], board: readonly Card[], dead: readonly Card[]) {
  const table = fiveTable();
  const used = new Set<Card>([...hands.flat(), ...board, ...dead]);
  const deck = DECK.filter((c) => !used.has(c));
  const toCome = 5 - board.length;
  const wins = hands.map(() => 0);
  const ties = hands.map(() => 0);
  let boards = 0;
  const keep: number[] = [];
  for (let i = 0; i < 7; i++)
    for (let j = i + 1; j < 7; j++) for (let p = 0; p < 7; p++) if (p !== i && p !== j) keep.push(p);
  const [B1, B2, B3, B4, B5] = [BINOM[1]!, BINOM[2]!, BINOM[3]!, BINOM[4]!, BINOM[5]!];
  const seven: Card[] = [0, 0, 0, 0, 0, 0, 0];
  const strength = (full: readonly Card[], h: Hand): number => {
    for (let i = 0; i < 5; i++) seven[i] = full[i]!;
    seven[5] = h[0];
    seven[6] = h[1];
    /* Insertion sort: the five-card table is indexed by the SORTED cards. */
    for (let i = 1; i < 7; i++) {
      const x = seven[i]!;
      let j = i - 1;
      while (j >= 0 && seven[j]! > x) seven[j + 1] = seven[j--]!;
      seven[j + 1] = x;
    }
    let best = -1;
    for (let q = 0; q < 105; q += 5) {
      const at =
        B1[seven[keep[q]!]!]! + B2[seven[keep[q + 1]!]!]! + B3[seven[keep[q + 2]!]!]! +
        B4[seven[keep[q + 3]!]!]! + B5[seven[keep[q + 4]!]!]!;
      if (table[at]! > best) best = table[at]!;
    }
    return best;
  };
  const full: Card[] = [...board, 0, 0, 0, 0, 0].slice(0, 5);
  const settle = () => {
    boards++;
    let top = -1;
    let k = 0;
    const v = hands.map((h) => strength(full, h));
    for (const x of v) top = x > top ? x : top;
    for (const x of v) if (x === top) k++;
    v.forEach((x, i) => x === top && (k === 1 ? wins : ties)[i]!++);
  };
  /* Plain recursion over the cards still to come, in deck order. */
  const pick = (from: number, at: number): void => {
    if (at === 5) return settle();
    for (let i = from; i <= deck.length - (5 - at); i++) {
      full[at] = deck[i]!;
      pick(i + 1, at + 1);
    }
  };
  pick(0, board.length);
  return { boards, wins, ties };
}

function tables(perStreet: number) {
  console.log('\n3 · random tables, every board counted twice');
  const t = Date.now();
  const next = rng(20261024);
  let spots = 0;
  let boardsChecked = 0;
  let bad = 0;
  for (const boardSize of [0, 3, 4, 5]) {
    const label = { 0: 'before the flop', 3: 'on the flop', 4: 'on the turn', 5: 'on the river' }[boardSize]!;
    let ok = 0;
    for (let i = 0; i < perStreet; i++) {
      const players = 2 + (i % 8);
      const deadN = Math.floor(next() * 4);
      const dealt = dealRandom(next, players * 2 + boardSize + deadN);
      const hands: Hand[] = [];
      for (let p = 0; p < players; p++) hands.push([dealt[2 * p]!, dealt[2 * p + 1]!]);
      const board = dealt.slice(players * 2, players * 2 + boardSize);
      const dead = dealt.slice(players * 2 + boardSize);
      const mine = odds({ hands, board, dead });
      const theirs = referenceCounts(hands, board, dead);
      const same =
        mine.boards === theirs.boards &&
        mine.seats.every((x, j) => x.wins === theirs.wins[j] && x.ties === theirs.ties[j]);
      if (same) ok++;
      else {
        bad++;
        console.log(`    MISMATCH ${players} players, board ${board.map(cardText).join(' ')}, dead ${dead.map(cardText).join(' ')}`);
        console.log(`      hands ${hands.map((h) => h.map(cardText).join('')).join(' ')}`);
      }
      spots++;
      boardsChecked += theirs.boards;
    }
    say(ok === perStreet, `${label.padEnd(16)} ${ok} of ${perStreet} tables identical, every seat   (${seconds(t)})`);
  }
  say(bad === 0, `${n(spots)} tables, ${n(boardsChecked)} boards each counted twice, ${bad} disagreements`);
}

const perStreet = Number(process.argv.find((a) => a.startsWith('--spots='))?.split('=')[1] ?? 30);
census();
invariance();
tables(perStreet);

console.log(failed === 0 ? '\nthe odds engine agrees with every fact checked.' : `\n${failed} FAILED — the engine disagrees with the facts above.`);
process.exit(failed === 0 ? 0 : 1);
