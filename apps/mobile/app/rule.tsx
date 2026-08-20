import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { resolveLedger, type MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { RuleFields, ruleProblem } from '../src/components/RuleFields';
import { Sheet } from '../src/components/Sheet';
import { setClubRules, useClub } from '../src/lib/clubStore';
import { deleteRule, draftRule, saveRule, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * The rule editor — O5, as a route: the rules sheet opened over Tonight pushes
 * this, which is the one place in the app where two sheets stack.
 *
 * The fields themselves are `RuleFields`, because the same editor is also a
 * step inside the setup sheet, where a night does not exist yet and pushing is
 * forbidden. What differs between the two is only where the saved rule lands.
 */
export default function RuleEditor() {
  const night = useNight();
  const params = useLocalSearchParams<{
    id?: string;
    destination?: MoneyRule['destination'];
    order?: string;
    draft?: string;
    /**
     * Which layer of the chain is being edited. 'club' writes the group's
     * default, which only reaches nights opened afterwards; anything else
     * writes tonight's own snapshot, which reaches nothing but tonight.
     */
    scope?: 'club' | 'night';
  }>();

  const club = useClub();
  const forClub = params.scope === 'club';
  const existing = (forClub ? club?.rules : night?.rules)?.find((r) => r.id === params.id);

  /*
   * The night loads asynchronously, so `existing` is undefined on the first
   * render even when editing a real rule. Seeding useState with it would
   * therefore turn an edit into a brand new rule roughly whenever the app was
   * opened straight onto this screen. Instead the edit buffer starts empty and
   * the rule shown falls back to whatever has arrived — the blank one is
   * memoised so its id does not change under it on every keystroke.
   */
  const blank = useMemo(
    () => draftRule(params.destination ?? 'kitty', Number(params.order ?? '1')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [edited, setEdited] = useState<MoneyRule | null>(null);
  const rule = edited ?? existing ?? blank;
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="Rule">{null}</Sheet>;
  }

  const people = standingsOf(night, ledger)
    .filter((s) => s.played)
    .map((s) => ({ id: s.id, name: s.name }));
  const problem = ruleProblem(rule, ledger.totalExpenses);

  async function save() {
    if (problem !== null || busy) return;
    setBusy(true);
    try {
      const saved = { ...rule, name: rule.name.trim() };
      if (forClub && club !== null) {
        const rest = club.rules.filter((r) => r.id !== saved.id);
        await setClubRules(club.id, [...rest, saved]);
      } else {
        await saveRule(saved);
      }
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={rule.name === '' ? 'New rule' : rule.name}
      footer={
        <>
          <Button
            label={problem ?? (existing === undefined ? 'Add this rule' : 'Save')}
            variant="primary"
            disabled={problem !== null || busy}
            onPress={save}
          />
          {existing !== undefined && (
            <Button
              label="Remove this rule"
              variant="destructive"
              onPress={() => {
                if (forClub && club !== null) {
                  void setClubRules(
                    club.id,
                    club.rules.filter((r) => r.id !== rule.id),
                  );
                } else {
                  void deleteRule(rule.id);
                }
                router.back();
              }}
            />
          )}
        </>
      }
    >
      <RuleFields
        rule={rule}
        onChange={(patch) => setEdited({ ...rule, ...patch })}
        people={people}
        // Everybody the night knows, not only the people at the table: a
        // collector who never sits down is written onto the night as a player
        // who is not at it, and dropping them here would quietly hand their
        // money to the group.
        collectors={night.players.map((p) => ({ id: p.id, name: p.name }))}
        spent={ledger.totalExpenses}
      />
    </Sheet>
  );
}
