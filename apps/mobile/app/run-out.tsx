import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../src/components/Text';
import { useLocalSearchParams } from 'expo-router';
import { RunOutEnumeration, oddsProblem, type RunOutProgress } from '@poker-club/core';
import { RunOutCard } from '../src/components/RunOutCard';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
import { parseRunOutParams } from '../src/lib/runOut';

/**
 * How it ran out — the same hands on every street, as one picture.
 *
 * A PUSH from the odds calculator (Chrome A, back → Poker calculator): a place
 * you look at, with nothing to save and nothing to confirm. It is board 19 of
 * `design/handoff-odds-calculator/`, the one-card summary of the run-out —
 * pre-flop, flop, turn and river in four columns, the board filling in, Player
 * 1's figure on each street and the verdict at the foot — drawn by
 * `RunOutCard` from the engine's `RunOutEnumeration`. The screen adds nothing
 * to the arithmetic.
 *
 * THE TABLE ARRIVES IN THE URL — `?h=AhKh,2c2d&b=QhJh3s7cKc&d=` — because that
 * is also what a shared link will carry (§ 7 of the handoff, when sharing
 * resumes): twenty cards at most, no figures, and the engine recounts them
 * exactly on the far phone. What cannot be read is refused with a sentence.
 *
 * COUNTED IN SLICES, like the calculator: the river, turn and flop land at
 * once and the pre-flop column — up to 1.7 million boards — fills a bar while
 * it counts. Leaving the screen cancels it.
 *
 * ⚠ COPY NOT DRAWN: *How it ran out* and *All in before the flop* are board
 * 19's; the line shown when the link carries no table is mine.
 *
 * In the full board's look (`run-out`, approved): the title and the line under
 * it on the ink, the picture on the sheet, no bar — a place, not a
 * confirmation. The line with no table is the kit's note at the page's side.
 */
export default function RunOut() {
  const t = useTheme();
  const params = useLocalSearchParams<{ h?: string; b?: string; d?: string }>();
  const input = useMemo(
    () => parseRunOutParams(params),
    // The three strings ARE the table.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.h, params.b, params.d],
  );
  const problem = input === null ? 'Deal two hands on the odds calculator first.' : oddsProblem(input);

  const [progress, setProgress] = useState<RunOutProgress>({ streets: new Map(), counting: null, progress: 0 });
  const run = useRef(0);
  useEffect(() => {
    const id = ++run.current;
    if (input === null || problem !== null) return;
    const e = new RunOutEnumeration(input);
    setProgress(e.result());
    const slice = () => {
      if (run.current !== id) return;
      const done = e.step(30_000);
      setProgress(e.result());
      if (!done) setTimeout(slice, 0);
    };
    slice();
    return () => {
      run.current++;
    };
  }, [input, problem]);

  return (
    <Screen title="How it ran out" backTo="Poker calculator" meta="All in before the flop">
      {input === null || problem !== null ? (
        <Text style={[styles.problem, { color: t.muted }]}>{problem}</Text>
      ) : (
        <RunOutCard input={input} progress={progress} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  problem: { fontSize: z(13), lineHeight: z(19), marginHorizontal: z(18), marginTop: z(12) },
});
