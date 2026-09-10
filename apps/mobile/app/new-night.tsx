import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  money,
  roundingClause,
  roundingSteps,
  sum,
  withStraddle,
  type Money,
  type MoneyRule,
  type PlayerId,
  type RoundingMode,
  type Stakes,
  type StraddleMode,
} from '@poker-club/core';
import {
  formatMoney,
  ruleDetail,
  stakesLabel,
  stakesSummary,
  straddleLabel,
  useMoneySymbol,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { RuleFields, ruleProblem } from '../src/components/RuleFields';
import { RuleList } from '../src/components/RuleList';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import {
  COMMON_CURRENCIES,
  CURRENCIES,
  currencyFor,
  searchCurrencies,
  type Currency,
} from '../src/data/currencies';
import {
  addMember,
  inheritedFor,
  playHistory,
  rememberLastGame,
  setClubCurrency,
  useClub,
  type Inherited,
  type PlayHistory,
} from '../src/lib/clubStore';
import { draftRule, startNight, tableNameProblem, useOpenGames } from '../src/lib/nightStore';

/**
 * Opening a night — O1, and every detour off it.
 *
 * ONE SHEET, NOT A WIZARD. `01-product-logic.md` § 5: "O1 holds every setting
 * and one button confirms them; seating and the money rules are edited on
 * their own screens and return." So this is one route whose CONTENT IS
 * REPLACED per step, which is what `09-navigation.md` prescribes for a
 * multi-step flow — O1d replaces O1's content, O5 replaces O1d's — and it is
 * also the only thing that can work: a sheet may not push, so the old "Change
 * the house rules" row had to dismiss this sheet and push the CLUB's rules
 * instead, which threw away every player already ticked and edited the wrong
 * layer of the chain into the bargain.
 *
 * THE SETTINGS COLLAPSE AND THE SEATING LEADS — `design/handoff-game-settings/`,
 * cut 10 September, frames O1c-2 and O1d, and it is the shape of this screen
 * now. Everything the sheet used to spend five list rows on is one reviewable
 * line with a *Change* pill beside it, because the settings are inherited from
 * last time and rarely move; the space that buys goes on the job the sheet is
 * actually for, which is getting the regulars seated at the amounts they are
 * putting in. `Change` opens **Game details** (O1d), where stakes, buy-in,
 * currency, rounding and the money rules are all edited in one place.
 *
 * WHICH LAYER THE RULES ON THIS SCREEN BELONG TO has not changed with the
 * layout. Rev 18: "the group carries defaults; the game carries its own,
 * seeded from the group's, overriding it for that game only and never writing
 * back." Editing here therefore changes tonight and only tonight — nothing is
 * written until the table opens, and the club's own setting is untouched by
 * all of it.
 */
type Step = 'game' | 'details' | 'players' | 'rule' | 'currency';

/** Where the close and a completed step return to. The flow is one level deep. */
const PARENT: Record<Step, Step | null> = {
  game: null,
  details: 'game',
  players: 'game',
  rule: 'details',
  currency: 'details',
};

export default function NewNight() {
  const t = useTheme();
  const club = useClub();
  const open = useOpenGames();

  const [inherited, setInherited] = useState<Inherited | null>(null);
  const [history, setHistory] = useState<Map<PlayerId, PlayHistory>>(new Map());

  /*
   * TONIGHT'S OWN COPY OF EVERY SETTING, held here until the table opens.
   *
   * `null` means "still whatever was inherited" — the difference matters,
   * because the summary says which layer answered and "same as last time" stops
   * being true the moment a host has changed something.
   */
  const [rules, setRules] = useState<MoneyRule[] | null>(null);
  const [buyIn, setBuyIn] = useState<Money | null>(null);
  const [stakes, setStakes] = useState<Stakes | null>(null);
  /*
   * Tonight's rounding. `undefined` is this sheet's "still whatever was
   * inherited" — it cannot be `null` like the three above it, because `null`
   * is a rounding rule in its own right: it is how whole dollars are stored,
   * and how `RoundingMode` has always said "the default every night has had".
   */
  const [rounding, setRounding] = useState<RoundingMode | undefined>(undefined);

  const [picked, setPicked] = useState<Record<PlayerId, string>>({});
  /*
   * WHOSE BUY-IN IS OPEN FOR TYPING — O1c-3, and the state that gives the sheet
   * its second face. A seat carries the standard buy-in the moment it is
   * filled; tapping the figure opens that one row, replaces the primary with
   * *Done* and puts the digits under the reader's thumb. `null` is every other
   * moment, which is nearly all of them.
   */
  const [editing, setEditing] = useState<PlayerId | null>(null);
  const [busy, setBusy] = useState(false);
  /** O2: a name typed into the field creates a player and seats them. */
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  /** What has been typed into the currency search — a code, a symbol or a name. */
  const [currencyQuery, setCurrencyQuery] = useState('');
  /** What to call this table, asked only when it is not the club's only one. */
  const [tableName, setTableName] = useState('');

  const [step, setStep] = useState<Step>('game');
  /** +1 going deeper, −1 coming back — the direction the content slides from. */
  const direction = useRef<1 | -1>(1);
  /** The rule being edited, and whether Save adds it or replaces it. */
  const [draft, setDraft] = useState<{ rule: MoneyRule; isNew: boolean } | null>(null);

  useEffect(() => {
    if (club === null) return;
    void inheritedFor(club).then(setInherited).catch(() => {});
    void playHistory().then(setHistory).catch(() => {});
  }, [club]);

  const go = (next: Step, dir: 1 | -1 = 1) => {
    direction.current = dir;
    /* A step change closes any open amount: the row it belonged to is gone. */
    setEditing(null);
    setStep(next);
  };
  const back = () => {
    const parent = PARENT[step];
    if (parent === null) router.back();
    else go(parent, -1);
  };

  if (club === null || inherited === null) return <Sheet title="New session">{null}</Sheet>;

  const currency = currencyFor(club.currency);
  const liveRules = rules ?? inherited.rules;
  const liveBuyIn = buyIn ?? inherited.buyIn;
  const liveStakes = stakes ?? inherited.stakes;
  /* Never null here: the chips offer 'dollars' as a value of its own, and the
     night stores it back as null, which is the same rule written the way the
     server column has always spelled it. */
  const liveRounding: RoundingMode = rounding ?? inherited.roundingMode ?? 'dollars';
  const storedRounding: RoundingMode | null = liveRounding === 'dollars' ? null : liveRounding;
  /** The straddle in words, or null when there is none — O1d draws no line. */
  const straddle = straddleLabel(liveStakes);

  /*
   * TWO LISTS, AND THE DIFFERENCE IS A ROW MID-EDIT.
   *
   * `seated` is what the screen draws — every name with a seat, whatever is
   * currently typed into it. `seats` is what the table opens with, which is the
   * same list less anybody sitting at nothing.
   *
   * They were one list filtered on `buyIn > 0`, and that was fine while an
   * amount was typed on a sheet of its own. It is not fine now that the figure
   * is edited in the row: the first backspace that empties the field takes the
   * amount to zero, the row out of the list, and the keyboard down with it.
   */
  const seated = club.members
    .filter((m) => picked[m.id] !== undefined)
    .map((m) => ({
      playerId: m.id,
      name: m.name,
      buyIn: money(Number(picked[m.id]) || 0),
    }));
  const seats = seated.filter((s) => s.buyIn > 0);

  /*
   * WHAT IS ON THE TABLE, off the engine and not off this screen. `CLAUDE.md`:
   * a screen that adds up its own column is a second, untested implementation
   * of the same sum. `sum` is `add`, which is where `Money`'s refusal of a
   * fractional amount lives.
   */
  const onTable = sum(seated.map((s) => s.buyIn));

  /*
   * A SECOND TABLE IS A NORMAL THING TO OPEN.
   *
   * This sheet used to refuse: with a game running its only button read "A
   * night is already running" and led back to it. A club that puts eight people
   * round one table and four round another had nowhere to go, and the refusal
   * was not protecting anything — the ledger has always been per night.
   *
   * What a second table does need is a name. While there is one game it is
   * "Tonight"; the moment there are two, both cards on home are told apart by
   * nothing else, so this asks — and `tableNameProblem` is the same rule the
   * store enforces when it writes the row.
   */
  const others = open.map((g) => g.tableName);
  const second = others.length > 0;
  const nameProblem = second ? tableNameProblem(tableName, others) : null;

  /*
   * Which seat is the host's own. It is stamped onto the night at birth and it
   * is the only thing that lets a results screen say "You" and My stats say
   * what you won — nothing in the money depends on it.
   *
   * A club normally has exactly one admin, seeded from the sample night. A
   * host who removes that name while making the roster their own can leave
   * none at all, and the consequence used to arrive four hours later as an
   * empty stats screen with nothing on it explaining why. Naming yourself is a
   * row on the player sheet; this says so before the night starts rather than
   * after it ends.
   */
  const me = club.members.find((m) => m.standing === 'admin');

  /*
   * THE PRIMARY SAYS HOW MANY ARE SEATED — O1c-2, cut 10 September, and it
   * replaces the clock this button carried since 29 August.
   *
   * The clock was there because *Start time* had come off the sheet and the
   * stamp was worth stating; the seat count is what the new frame draws, and
   * on a screen whose whole body is now the seating it is the figure the
   * button is confirming. Nothing about the stamp changed — `startNight` still
   * stamps the night with the clock at the moment the table opens.
   */
  const openLabel =
    seats.length === 0
      ? 'Pick who is playing'
      : nameProblem !== null
        ? 'Name this table'
        : `Open the table · ${seats.length} seated`;

  async function openTable() {
    if (seats.length === 0 || busy || club === null || inherited === null) return;
    setBusy(true);
    try {
      await startNight({
        clubId: club.id,
        groupName: club.name,
        rules: liveRules,
        // Snapshotted at birth like everything else on this sheet, and in
        // words, because the blinds are the one setting nothing computes with
        // — see `startNight`. What the night states it was played at can never
        // move afterwards, however the group is reconfigured.
        stakes: stakesSummary(liveStakes),
        // Copied at birth like the rules, and for the same reason: a night is
        // settled with what it opened with. It is SET here now as well as
        // inherited: how coarsely the table settles is a thing a group decides
        // about the game it is about to play, and sending a host to tonight's
        // money rules to change it meant opening the table first, on the wrong
        // setting. Editing here changes tonight and only tonight; the club's
        // own default is untouched, exactly as the rules and the buy-in are.
        roundingMode: storedRounding,
        seats,
        buyIn: liveBuyIn,
        // No start time goes on: `startNight` stamps the night with the clock
        // at the moment the table opens, which is this instant.
        ...(second ? { tableName: tableName.trim() } : {}),
        // The club's roster is where a non-playing collector gets their name.
        nameOfCollector: (id) => club.members.find((m) => m.id === id)?.name,
        ...(me === undefined ? {} : { meId: me.id }),
      });
      // What the night actually ran with becomes the next night's suggestion,
      // and only that — the club's own setting is untouched.
      await rememberLastGame(
        club.id,
        liveBuyIn,
        liveRules,
        storedRounding,
        liveStakes,
      );
      router.dismissTo('/');
      router.push('/session');
    } finally {
      setBusy(false);
    }
  }

  /*
   * ADDING SOMEBODY IS PART OF SETTING UP THE GAME, not an errand before it.
   *
   * A name typed here does both halves at once: it joins the club's roster for
   * good, and it is ticked for tonight at the inherited buy-in — which is what
   * O2 means by "a name typed into the field creates a player and seats them".
   */
  async function add() {
    const name = newName.trim();
    if (club === null || name === '' || adding) return;
    if (club.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return;
    setAdding(true);
    try {
      const id = await addMember(club.id, name);
      setPicked((p) => ({ ...p, [id]: String(liveBuyIn) }));
      setNewName('');
    } finally {
      setAdding(false);
    }
  }

  const toggleSeat = (id: PlayerId) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[id] !== undefined) delete next[id];
      else next[id] = String(liveBuyIn);
      return next;
    });

  /** Empty the seat this row is drawing, and close the amount if it was open. */
  const unseat = (id: PlayerId) => {
    if (editing === id) setEditing(null);
    setPicked((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const editRule = (rule: MoneyRule, isNew: boolean) => {
    setDraft({ rule, isNew });
    go('rule');
  };

  function saveDraft() {
    if (draft === null) return;
    const saved = { ...draft.rule, name: draft.rule.name.trim() };
    setRules(
      draft.isNew
        ? [...liveRules, saved]
        : liveRules.map((r) => (r.id === saved.id ? saved : r)),
    );
    setDraft(null);
    go('details', -1);
  }

  function removeDraft() {
    if (draft === null) return;
    setRules(liveRules.filter((r) => r.id !== draft.rule.id));
    setDraft(null);
    go('details', -1);
  }

  const sorted = [...liveRules].sort((a, b) => a.sortOrder - b.sortOrder);
  const active = sorted.filter((r) => r.active);
  const nextOrder = sorted.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
  /* What the button and the header count is what the table will open with —
     a seat sitting at nothing is drawn, and is not somebody who is playing. */
  const seatedCount = seats.length;
  const rest = club.members.filter((m) => picked[m.id] === undefined);

  /*
   * THE TWO LINES THE FIVE ROWS COLLAPSE TO — O1c-2.
   *
   * The first is the game: what it is played at, what a seat costs, and the
   * money the book is kept in. The second is what comes off the table, which
   * is the rules that are ON tonight — a rule switched off takes nothing and
   * naming it here would say it does — with the rounding as the last clause,
   * off `roundingClause` in core so the step is written once.
   */
  const terms = `${stakesLabel(liveStakes)} · ${formatMoney(liveBuyIn)} in · ${currency.code}`;
  const deductions = [
    ...active.map((r) => r.name),
    roundingClause(liveRounding),
  ].filter((part): part is string => part !== null);

  // -------------------------------------------------------------------------
  // The header, the footer and the body, chosen by step. One sheet, one close.
  // -------------------------------------------------------------------------

  const title =
    step === 'game'
      ? 'New session'
      : step === 'details'
        ? 'Game details'
        : step === 'players'
          ? 'Add players'
          : step === 'rule'
            ? draft === null || draft.rule.name.trim() === ''
              ? 'New rule'
              : draft.rule.name
            : 'Currency';

  const problem = draft === null ? null : ruleProblem(draft.rule, money(0));

  const footer =
    step === 'game' ? (
      /*
       * O1c-3 · WITH AN AMOUNT OPEN THE PRIMARY IS REPLACED BY *Done*, on a bar
       * that keeps the running total in view. Opening the table is not the
       * action in front of a person mid-figure, and a primary that stayed put
       * would be the thing their thumb reaches for on the way back from the
       * keypad.
       */
      editing !== null ? (
        <View style={[styles.accessory, { borderTopColor: t.hairline }]}>
          <Text style={[styles.onTable, { color: t.muted }]} numberOfLines={1}>
            {`${formatMoney(onTable)} on the table`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditing(null)}
            style={({ pressed }) => [
              styles.done,
              { backgroundColor: t.text, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.doneLabel, { color: t.onFill }]}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {seatedCount > 0 && (
            <Text style={[styles.onTable, styles.onTableCentred, { color: t.muted }]}>
              {`${formatMoney(onTable)} on the table`}
            </Text>
          )}
          <Button
            label={openLabel}
            variant="primary"
            disabled={seats.length === 0 || nameProblem !== null || busy}
            onPress={() => void openTable()}
          />
        </>
      )
    ) : step === 'details' ? (
      <Button label="Save details" variant="primary" onPress={() => go('game', -1)} />
    ) : step === 'players' ? (
      <Button
        label={`Done · ${seatedCount} seated`}
        variant="primary"
        onPress={() => go('game', -1)}
      />
    ) : step === 'rule' ? (
      <>
        <Button
          label={problem ?? 'Save rule'}
          variant="primary"
          disabled={problem !== null}
          onPress={saveDraft}
        />
        {draft?.isNew === false && (
          <Button label="Remove this rule" variant="destructive" onPress={removeDraft} />
        )}
      </>
    ) : (
      // Nothing is held back to be saved here: picking a row writes the group
      // and returns, so this button is the way out for somebody who opened the
      // list and did not want anything from it.
      <Button label="Done" variant="primary" onPress={() => go('details', -1)} />
    );

  return (
    <Sheet
      title={title}
      {...(step === 'game' || step === 'details' ? { sub: club.name } : {})}
      /* O1c-3 · with the keypad up the count moves off the button and into the
         header, which is the only place left for it. */
      {...(step === 'players' || editing !== null ? { meta: `${seatedCount} seated` } : {})}
      onClose={back}
      footer={footer}
    >
      <StepBody step={step} direction={direction.current}>
        {step === 'game' && (
          <>
            {/* A second table is named before it is opened: two cards on home
                with money on both are told apart by nothing else. The first
                table is not asked — while it is the only one it is "Tonight". */}
            {second && (
              <View style={styles.tableName}>
                <Field
                  label="This table"
                  value={tableName}
                  onChangeText={setTableName}
                  placeholder="Kitchen table"
                  autoCapitalize="sentences"
                  hint={
                    nameProblem === 'reserved'
                      ? 'Tonight is both tables now — this one needs a name of its own'
                      : nameProblem === 'taken'
                        ? 'That name is taken by a table already open'
                        : others.length === 1
                          ? `${others[0]} is already open`
                          : `${others.length} tables are already open`
                  }
                />
              </View>
            )}

            <Summary
              terms={terms}
              deductions={
                deductions.length === 0 ? 'Nothing comes off the table' : deductions.join(', ')
              }
              onChange={() => go('details')}
            />

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: t.muted }]}>Who is playing</Text>

              {/*
                ⚠ COPY NOT DRAWN. The design has no state for a club with no
                admin, because it was written for one that always has exactly
                one. Flagged rather than left silent: the alternative is a host
                finding out after the night that it was recorded against nobody.
              */}
              {me === undefined && club.members.length > 0 && <NoHost />}

              <View style={styles.seats}>
                {seated.map((s) => (
                  <Seat
                    key={s.playerId}
                    name={s.name}
                    host={s.playerId === me?.id}
                    amount={picked[s.playerId] ?? ''}
                    standard={liveBuyIn}
                    editing={editing === s.playerId}
                    onEdit={() => setEditing(s.playerId)}
                    onAmount={(v) =>
                      setPicked((p) => ({ ...p, [s.playerId]: v.replace(/[^0-9]/g, '') }))
                    }
                    onUnseat={() => unseat(s.playerId)}
                  />
                ))}
              </View>

              {/*
                ⚠ COPY NOT DRAWN. O1c-2 is drawn with three people already
                seated, so it has no empty state and no words for one. Flagged
                rather than left blank: a bare heading over a grid of names
                explains neither what the grid is nor why the button is off.
              */}
              {seatedCount === 0 && (
                <Text style={[styles.empty, { color: t.muted }]}>
                  {club.members.length === 0
                    ? 'Nobody on the roster yet. Add the first name and they can play tonight.'
                    : 'Tap a name to seat them at the standard buy-in.'}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              {/* The heading is only true once somebody is seated: with an
                  empty table "the rest" is the whole group, and the grid is
                  already under the heading that asks who is playing. */}
              {seatedCount > 0 && rest.length > 0 && (
                <Text style={[styles.sectionLabel, { color: t.muted }]}>Rest of the group</Text>
              )}

              <View style={styles.grid}>
                {rest.map((m) => (
                  <FreeChip key={m.id} name={m.name} onPress={() => toggleSeat(m.id)} />
                ))}
                <NewChip onPress={() => go('players')} />
              </View>
            </View>
          </>
        )}

        {step === 'details' && (
          <Details
            stakes={liveStakes}
            onStakes={setStakes}
            buyIn={liveBuyIn}
            onBuyIn={setBuyIn}
            currencyCode={currency.code}
            onCurrency={() => go('currency')}
            rounding={liveRounding}
            onRounding={setRounding}
            straddle={straddle}
            rules={sorted}
            describeRule={(rule) =>
              ruleDetail(rule, {
                collectorName: club.members.find((m) => m.id === rule.collectorPlayerId)?.name,
              })
            }
            onOpenRule={(rule) => editRule(rule, false)}
            onToggleRule={(rule, on) =>
              setRules(liveRules.map((r) => (r.id === rule.id ? { ...r, active: on } : r)))
            }
            onAddRule={(destination) => editRule(draftRule(destination, nextOrder), true)}
            from={inherited.from}
          />
        )}

        {step === 'players' && (
          <Players
            members={club.members.map((m) => ({
              id: m.id,
              name: m.name,
              host: m.id === me?.id,
            }))}
            history={history}
            picked={picked}
            search={search}
            onSearch={setSearch}
            onToggle={toggleSeat}
            onAmount={(id, v) => setPicked((p) => ({ ...p, [id]: v.replace(/[^0-9]/g, '') }))}
            newName={newName}
            onNewName={setNewName}
            onAdd={() => void add()}
            adding={adding}
          />
        )}

        {step === 'rule' && draft !== null && (
          <RuleFields
            rule={draft.rule}
            onChange={(patch) =>
              setDraft((d) => (d === null ? d : { ...d, rule: { ...d.rule, ...patch } }))
            }
            people={seats.map((s) => ({ id: s.playerId, name: s.name }))}
            // The whole roster holds money, not only the seats — O6, and the
            // treasurer who never plays. `startNight` writes a collector who is
            // not seated onto the night as a player who is not at the table,
            // so naming one here is a thing the night can actually honour.
            collectors={club.members.map((m) => ({ id: m.id, name: m.name }))}
            spent={money(0)}
          />
        )}

        {step === 'currency' && (
          <Currencies
            picked={currency.code}
            query={currencyQuery}
            onQuery={setCurrencyQuery}
            onPick={(code) => {
              void setClubCurrency(club.id, code);
              setCurrencyQuery('');
              go('details', -1);
            }}
          />
        )}
      </StepBody>
    </Sheet>
  );
}

/**
 * The five settings rows, collapsed to two lines and a pill — O1c-2.
 *
 * THE POINT OF THE CUT IS WHAT THIS BUYS. Stakes, buy-in, currency, money
 * rules and rounding were five tall list rows at the top of the sheet, above
 * the seating, and all five are inherited from last time: a host reads them,
 * agrees with them and scrolls past them, every night. Two lines say the same
 * thing in a fifth of the height, and the second of them is the line the old
 * *Money rules* row truncated — it wraps here rather than ending in an ellipsis
 * halfway through the second rule's name.
 */
function Summary({
  terms,
  deductions,
  onChange,
}: {
  terms: string;
  deductions: string;
  onChange: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.summary, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <View style={styles.summaryText}>
        <Text style={[styles.summaryTerms, { color: t.text }]}>{terms}</Text>
        <Text style={[styles.summaryDeductions, { color: t.muted }]}>{deductions}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change the game details"
        onPress={onChange}
        style={({ pressed }) => [
          styles.change,
          { backgroundColor: t.raised, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.changeLabel, { color: t.text }]}>Change</Text>
      </Pressable>
    </View>
  );
}

/**
 * A seat, at the amount that seat is being filled with — O1c-2 and O1c-3.
 *
 * THREE STATES AND THE BORDER IS WHAT SAYS WHICH: filled at the standard
 * buy-in, filled at an amount somebody changed, and open for typing. The
 * figure carries a dashed underline in the first two, because it is the one
 * thing on the row that can be tapped into rather than tapped through, and a
 * row where everything looks equally live is a row where nobody finds the
 * amount.
 *
 * The line under the name is the difference from the standard, not the amount
 * again: `₾300 above the standard` is the sentence a table actually says out
 * loud, and it is why a row that agrees with the buy-in says nothing at all.
 */
function Seat({
  name,
  host,
  amount,
  standard,
  editing,
  onEdit,
  onAmount,
  onUnseat,
}: {
  name: string;
  host: boolean;
  /** The digits as typed — this is a field, not a figure. */
  amount: string;
  standard: Money;
  editing: boolean;
  onEdit: () => void;
  onAmount: (v: string) => void;
  onUnseat: () => void;
}) {
  const t = useTheme();
  const symbol = useMoneySymbol();
  const value = money(Number(amount) || 0);
  const gap = value - standard;
  const sub = editing
    ? // ⚠ COPY NOT DRAWN AS WRITTEN. O1c-2 reads "Type the amount she is
      // putting in" of the one player it draws. Nothing in this app knows a
      // player's pronoun, so the line is the same sentence in the one form
      // that is right for everybody.
      'buying in for'
    : [
        host ? 'host' : null,
        gap === 0
          ? null
          : `${formatMoney(money(Math.abs(gap)))} ${gap > 0 ? 'above' : 'below'} the standard`,
      ]
        .filter((part): part is string => part !== null)
        .join(' · ');

  return (
    <View
      style={[
        styles.seat,
        { backgroundColor: t.surface },
        editing
          ? { borderColor: t.text, borderWidth: 1.5 }
          : { borderColor: t.quietOutline, borderWidth: 1 },
      ]}
    >
      <View style={styles.seatRow}>
        <View style={[styles.monogram, { backgroundColor: t.text }]}>
          <Text style={[styles.monogramText, { color: t.onFill }]}>{monogram(name)}</Text>
        </View>

        <View style={styles.seatText}>
          <Text style={[styles.seatName, { color: t.text }]} numberOfLines={1}>
            {name}
          </Text>
          {sub !== '' && (
            <Text style={[styles.seatSub, { color: t.muted }]} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>

        {editing ? (
          <View style={[styles.typing, { backgroundColor: t.ground }]}>
            <Text style={[styles.typingSymbol, { color: t.text }]}>{symbol}</Text>
            <TextInput
              value={amount}
              onChangeText={onAmount}
              autoFocus
              selectTextOnFocus
              // A8: this is money. `scripts/ui-audit.mjs` holds every one of
              // these to a digits-only keyboard.
              testID="amount"
              keyboardType="number-pad"
              returnKeyType="done"
              accessibilityLabel={`${name} is buying in for`}
              style={[styles.typingValue, { color: t.text, width: fieldWidth(amount, 10.4, 2) }]}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change what ${name} is putting in`}
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [styles.figureTap, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text
              style={[styles.seatFigure, { color: t.text, borderBottomColor: t.quietOutline }]}
              numberOfLines={1}
            >
              {formatMoney(value)}
            </Text>
          </Pressable>
        )}

        {!editing && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Take ${name} off the table`}
            onPress={onUnseat}
            hitSlop={10}
            style={({ pressed }) => [
              styles.seated,
              { backgroundColor: t.text, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name="check" color={t.onFill} size={12} />
          </Pressable>
        )}
      </View>

      {editing && (
        <Text style={[styles.seatHint, { color: t.muted }]}>
          {`Type the amount ${name.split(/\s+/)[0]} is putting in`}
        </Text>
      )}
    </View>
  );
}

/** Somebody in the group who is not at the table yet. One tap seats them. */
function FreeChip({ name, onPress }: { name: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Seat ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.free,
        { backgroundColor: t.surface, borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.freeMonogram, { backgroundColor: t.raised }]}>
        <Text style={[styles.freeMonogramText, { color: t.text }]}>{monogram(name)}</Text>
      </View>
      <Text style={[styles.freeName, { color: t.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Icon name="plus" color={t.muted} size={13} />
    </Pressable>
  );
}

/** Dashed, because dashed always means "creates something". */
function NewChip({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.free,
        styles.newChip,
        { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="plus" color={t.text} size={13} />
      <Text style={[styles.freeName, { color: t.text }]}>Someone new</Text>
    </Pressable>
  );
}

/**
 * The two letters in a seat's circle — `MK`, `LN`, `PT`.
 *
 * O1c-2 draws a monogram rather than the single initial the shared `Avatar`
 * carries, and it draws two of them side by side at 34 and 26 points, which is
 * why this is here and not in that component: `Avatar` is on eleven other
 * screens and none of them is asking for a second letter.
 *
 * Two words give their two initials. A single name gives its first letter and
 * its last consonant, which is what the board's own eight are — Marek MK, Ivo
 * IV, Lena LN, Petr PT, Nino NN, Giorgi GG, Dato DT — and it reads as a
 * monogram rather than as the first two letters of a name, which is the thing
 * that makes two people called Sandro and Sandra tell apart at a glance.
 */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w !== '');
  if (words.length >= 2) {
    return `${[...words[0]][0] ?? ''}${[...words[1]][0] ?? ''}`.toUpperCase();
  }
  const letters = [...(words[0] ?? '')];
  if (letters.length === 0) return '?';
  if (letters.length === 1) return letters[0].toUpperCase();
  const tail = letters.slice(1);
  const consonant = [...tail].reverse().find((c) => /[bcdfghjklmnpqrstvwxz]/i.test(c));
  return `${letters[0]}${consonant ?? tail[tail.length - 1]}`.toUpperCase();
}

/**
 * How wide a typed figure needs to be — digits are tabular, so this is exact.
 *
 * A `TextInput` has no intrinsic width: left to itself it takes the whole row
 * on the phone and collapses to nothing on the web. A fixed width instead
 * clips the moment a group plays for six digits, which is the one thing every
 * check in this repo exists to catch. The advance of a tabular digit is what
 * both of those get wrong, so it is measured here and the field is sized to
 * the digits actually in it.
 *
 * `floor` is one digit for a field holding a `Money`, which is never empty —
 * the smallest thing it can say is `0` — and two for the one that is being
 * typed into, where a backspace can empty it and a field with no width is a
 * cursor with nowhere to sit.
 */
function fieldWidth(text: string, advance: number, floor = 1): number {
  return Math.max(floor, [...text].length) * advance;
}

function NoHost() {
  const t = useTheme();
  return (
    <Text style={[styles.warn, { color: t.amber }]}>
      Nobody on this roster is marked as you, so this night will not count towards your stats. Open
      your own name in Settings · Players and tap Standing.
    </Text>
  );
}

/**
 * O1d · Game details — everything the summary line collapses, edited in place.
 *
 * `design/handoff-game-settings/`, frame O1d: one card for the money, one for
 * the rules, and a Save that returns to the seating. The four settings were
 * four sheets of their own — a 56-point figure and a preset row each — reached
 * by four taps and four returns, and none of the four was a decision worth a
 * screen: the blinds are two numbers a group settled on once, the buy-in is
 * one, the rounding is a pick from four, and the currency is the only one of
 * them with a hundred and fifty-six answers, so it is the only one that still
 * opens a list.
 */
function Details({
  stakes,
  onStakes,
  buyIn,
  onBuyIn,
  currencyCode,
  onCurrency,
  rounding,
  onRounding,
  straddle,
  rules,
  describeRule,
  onOpenRule,
  onToggleRule,
  onAddRule,
  from,
}: {
  stakes: Stakes;
  onStakes: (s: Stakes) => void;
  buyIn: Money;
  onBuyIn: (v: Money) => void;
  currencyCode: string;
  onCurrency: () => void;
  rounding: RoundingMode;
  onRounding: (mode: RoundingMode) => void;
  /** The straddle in words, or null when there is none. */
  straddle: string | null;
  rules: readonly MoneyRule[];
  describeRule: (rule: MoneyRule) => string;
  onOpenRule: (rule: MoneyRule) => void;
  onToggleRule: (rule: MoneyRule, on: boolean) => void;
  onAddRule: (destination: MoneyRule['destination']) => void;
  /** Which layer these settings arrived from — "last game", "group". */
  from: string;
}) {
  const t = useTheme();
  const symbol = useMoneySymbol();
  const modes: ReadonlyArray<{ mode: StraddleMode; label: string }> = [
    { mode: 'none', label: 'No' },
    { mode: 'optional', label: 'Optional' },
    { mode: 'mandatory', label: 'Mandatory' },
  ];

  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The money</Text>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: t.text }]}>Stakes</Text>
              {/* ⚠ COPY NOT DRAWN. O1d draws a game with no straddle, so it
                  draws no line here. A straddle that is being played is not a
                  thing to leave a host to find out at the table. */}
              {straddle !== null && (
                <Text style={[styles.cardSub, { color: t.muted }]} numberOfLines={1}>
                  {straddle}
                </Text>
              )}
            </View>
            <View style={styles.pair}>
              <MoneyField
                value={stakes.small}
                symbol={symbol}
                label="Small blind"
                onChange={(small) => onStakes({ ...stakes, small })}
              />
              <Text style={[styles.slash, { color: t.muted }]}>/</Text>
              <MoneyField
                value={stakes.big}
                symbol={symbol}
                label="Big blind"
                onChange={(big) => onStakes({ ...stakes, big })}
              />
            </View>
          </View>

          <View style={[styles.cardRow, styles.divided, { borderTopColor: t.hairline }]}>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: t.text }]}>Standard buy-in</Text>
              <Text style={[styles.cardSub, { color: t.muted }]}>
                what each seat is filled with
              </Text>
            </View>
            <MoneyField
              value={buyIn}
              symbol={symbol}
              label="Standard buy-in"
              onChange={onBuyIn}
            />
          </View>

          {/*
           * A NIGHT DOES NOT PICK A CURRENCY — the money a book is written in
           * belongs to the GROUP (`12-the-group.md` § 2, the top row of its
           * settings table), and a book whose column changed money halfway
           * through would be unreadable. The sub-line says which layer this
           * writes; the chevron is here because setting the game up is the one
           * moment a host is thinking about what the table plays for, and a
           * club created in dollars by a default nobody chose had no obvious
           * way out.
           */}
          <Pressable
            accessibilityRole="button"
            onPress={onCurrency}
            style={({ pressed }) => [
              styles.cardRow,
              styles.divided,
              { borderTopColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: t.text }]}>Currency</Text>
              <Text style={[styles.cardSub, { color: t.muted }]}>the group’s book</Text>
            </View>
            <Text style={[styles.cardValue, { color: t.text }]}>{currencyCode}</Text>
            <Icon name="chevron" color={t.muted} size={13} />
          </Pressable>

          {/*
           * HOW COARSELY THE TABLE SETTLES, on the screen that opens the game.
           *
           * A money rule, not a display setting — it changes what people
           * actually pay — and it governs every rule above it at once. The
           * steps come off `roundingSteps()` in core so this row and the one on
           * `/rounding` can never come to offer different settings.
           */}
          <View style={[styles.cardBlock, styles.divided, { borderTopColor: t.hairline }]}>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: t.text }]}>Round to the nearest</Text>
              <Text style={[styles.cardSub, { color: t.muted }]}>
                applied to what a rule takes
              </Text>
            </View>
            <View style={styles.steps}>
              {roundingSteps().map((c) => {
                const on = c.mode === rounding;
                return (
                  <Pressable
                    key={c.mode}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Round to the nearest ${c.step}`}
                    onPress={() => onRounding(c.mode)}
                    hitSlop={7}
                    style={({ pressed }) => [
                      styles.step,
                      { backgroundColor: on ? t.text : t.raised, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.stepLabel, { color: on ? t.onFill : t.text }]}>
                      {c.step}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/*
           * ⚠ NOT DRAWN ON THIS CARD, and here rather than nowhere.
           *
           * O1d draws the stakes as two figures and stops. `03-data-model.md`
           * carries the straddle beside them and rev 18 § 5.2 fixes its
           * control — "pill segmented pick (straddle)", No / Optional /
           * Mandatory — so the setting exists, is stamped onto the night, and
           * had a screen until this cut folded that screen into this card.
           * Dropping it with the screen would have been the cut deciding
           * something it does not speak about. It takes the shape of the
           * rounding row above it, which IS drawn, so the layout is copied
           * rather than invented.
           */}
          <View style={[styles.cardBlock, styles.divided, { borderTopColor: t.hairline }]}>
            <Text style={[styles.cardLabel, { color: t.text }]}>Straddle</Text>
            {/* The row of steps above, exactly: three of the sheet's width
                rather than three pills pushed right, because "Mandatory" beside
                a label is 287 points of a 290-point card at the reader's larger
                text setting. */}
            <View style={styles.steps}>
              {modes.map(({ mode, label }) => {
                const on = stakes.straddle === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => onStakes(withStraddle(stakes, mode))}
                    hitSlop={7}
                    style={({ pressed }) => [
                      styles.step,
                      { backgroundColor: on ? t.text : t.raised, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.pillLabel, { color: on ? t.onFill : t.text }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* The figure only exists while there is a straddle to have one —
                see `withStraddle`, which keeps the two in step. */}
            {stakes.straddle !== 'none' && (
              <View style={styles.straddleRow}>
                {/* "Amount", not "Straddle" — it sits under the row whose own
                    label already says it, and the word twice in twelve points
                    reads as two settings rather than one. */}
                <Text style={[styles.cardSub, { color: t.muted }]}>Amount</Text>
                <View style={styles.amountAtEnd}>
                  <MoneyField
                    value={stakes.straddleAmount ?? money(0)}
                    symbol={symbol}
                    label="Straddle amount"
                    onChange={(straddleAmount) => onStakes({ ...stakes, straddleAmount })}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {rules.length === 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Money rules</Text>
          <NoRules onStart={onAddRule} />
        </View>
      ) : (
        <>
          <RuleList
            caption="Money rules"
            boxed
            rules={rules}
            describe={describeRule}
            onOpen={onOpenRule}
            onToggle={(rule, on) => onToggleRule(rule, on)}
            onAdd={() => onAddRule('kitty')}
          />
          <Text style={[styles.footnote, { color: t.muted }]}>
            These belong to tonight. They are copied from the {from} and changing one here changes
            this game only — the group keeps its own.
          </Text>
        </>
      )}
    </>
  );
}

/**
 * A figure typed straight into the row it belongs to — O1d's black field.
 *
 * The symbol is drawn beside the digits rather than inside them, because the
 * digits are what is being edited: a field pre-filled with "₾500" is a field
 * whose first backspace takes a zero and whose second takes the currency.
 */
function MoneyField({
  value,
  symbol,
  label,
  onChange,
}: {
  value: Money;
  symbol: string;
  /** What a screen reader calls it — the row's label does not reach the field. */
  label: string;
  onChange: (v: Money) => void;
}) {
  const t = useTheme();
  const text = String(value);
  return (
    <View style={[styles.moneyField, { backgroundColor: t.ground, borderColor: t.hairline }]}>
      <Text style={[styles.moneySymbol, { color: t.text }]}>{symbol}</Text>
      <TextInput
        value={text}
        onChangeText={(v) => onChange(money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)))}
        // A8: this is money. `scripts/ui-audit.mjs` holds every one of these to
        // a digits-only keyboard.
        testID="amount"
        keyboardType="number-pad"
        accessibilityLabel={label}
        style={[styles.moneyValue, { color: t.text, width: fieldWidth(text, 9.8) }]}
      />
    </View>
  );
}

/**
 * O2 · Add players.
 *
 * SINCE THE GAME-SETTINGS CUT THIS IS THE SECOND DOOR, not the only one. The
 * group is on O1 itself now — every unseated name as a one-tap chip — so what
 * is left for this screen is the two things a grid of chips cannot do: find a
 * name in a roster of thirty, and create somebody who is not on it at all,
 * which is what O1c-2's dashed *Someone new* opens.
 *
 * Search, then the roster most-recent-first, each row saying when they last
 * played and how many nights they have — the six people who played last week
 * are the six about to play tonight, and a host should not scroll past a name
 * from March to find them.
 *
 * ⚠ ONE DEPARTURE FROM THE DRAWING, flagged rather than quiet: a seated row
 * carries its buy-in as a field where O2 draws the word SEATED. Per-player
 * amounts are editable at exactly this moment and nowhere else — after this
 * they are ledger entries — and the board has no other place for them.
 */
function Players({
  members,
  history,
  picked,
  search,
  onSearch,
  onToggle,
  onAmount,
  newName,
  onNewName,
  onAdd,
  adding,
}: {
  members: ReadonlyArray<{ id: PlayerId; name: string; host: boolean }>;
  history: Map<PlayerId, PlayHistory>;
  picked: Record<PlayerId, string>;
  search: string;
  onSearch: (v: string) => void;
  onToggle: (id: PlayerId) => void;
  onAmount: (id: PlayerId, v: string) => void;
  newName: string;
  onNewName: (v: string) => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const t = useTheme();
  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    const listed = members.filter((m) => query === '' || m.name.toLowerCase().includes(query));
    return [...listed].sort((a, b) => {
      const la = history.get(a.id)?.last ?? '';
      const lb = history.get(b.id)?.last ?? '';
      if (la !== lb) return la < lb ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [members, history, query]);

  const typed = newName.trim();
  const taken = members.some((m) => m.name.toLowerCase() === typed.toLowerCase());

  return (
    <>
      <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search by name"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchText, { color: t.text }]}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Most recent first</Text>

        {rows.map((m) => {
          const on = picked[m.id] !== undefined;
          return (
            <View
              key={m.id}
              style={[
                styles.row,
                { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => onToggle(m.id)}
                style={({ pressed }) => [styles.rowText, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>
                  {played(history.get(m.id), m.host)}
                </Text>
              </Pressable>

              {on ? (
                <>
                  <Icon name="check" color={t.win} size={16} />
                  <TextInput
                    value={picked[m.id]}
                    onChangeText={(v) => onAmount(m.id, v)}
                    // A8: this is money. `scripts/ui-audit.mjs` holds every one of
                    // these to a digits-only keyboard.
                    testID="amount"
                    keyboardType="number-pad"
                    style={[
                      styles.amount,
                      { color: t.text, backgroundColor: t.surface, borderColor: t.hairline },
                    ]}
                  />
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onToggle(m.id)}
                  style={({ pressed }) => [
                    styles.addPill,
                    { backgroundColor: t.text, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.addPillLabel, { color: t.onFill }]}>Add</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {rows.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {query === ''
              ? 'Nobody on the roster yet. Add the first name below and they can play tonight.'
              : `Nobody called “${search.trim()}” — type the name below to add them.`}
          </Text>
        )}
      </View>

      {/* At the foot of the roster, where O2 puts it. */}
      <View style={styles.add}>
        <TextInput
          value={newName}
          onChangeText={onNewName}
          onSubmitEditing={onAdd}
          placeholder="New player — type a name"
          placeholderTextColor={t.muted}
          autoCapitalize="words"
          returnKeyType="done"
          style={[
            styles.addField,
            {
              color: t.text,
              backgroundColor: t.surface,
              borderColor: typed === '' ? t.dashed : t.hairline,
              borderStyle: typed === '' ? 'dashed' : 'solid',
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: typed === '' || taken || adding }}
          disabled={typed === '' || taken || adding}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addButton,
            { borderColor: t.quietOutline, opacity: typed === '' || taken ? 0.4 : pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.addLabel, { color: t.text }]}>Add</Text>
        </Pressable>
      </View>

      {taken && <Text style={[styles.empty, { color: t.muted }]}>{`${typed} is already here`}</Text>}
    </>
  );
}

/** "played 28 July · 26 nights", "host", or nothing they have ever done. */
function played(h: PlayHistory | undefined, host: boolean): string {
  const nights =
    h === undefined || h.nights === 0
      ? 'has not played yet'
      : `${h.nights} ${h.nights === 1 ? 'night' : 'nights'}`;
  const last =
    h?.last == null
      ? null
      : new Date(h.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return [last === null ? null : `played ${last}`, host ? 'host' : nights]
    .filter((p) => p !== null)
    .join(' · ');
}

/**
 * O3 · Money rules, empty.
 *
 * Three starting points, each of which creates a pre-filled rule rather than an
 * empty form — nobody knows what a "destination" is until they have seen one —
 * and it is stated out loud that a group can have none, because a group that
 * deducts nothing is a normal group and not an unfinished setup.
 *
 * THE SKIP IS GONE, and the sentence it carried is not. It was a button
 * reading "Skip — no deductions" and it existed because this was a step of its
 * own with a way out to find; the rules are a section of Game details now, the
 * footer says Save details, and a second way off the screen beside it would be
 * two buttons doing one thing.
 */
function NoRules({ onStart }: { onStart: (destination: MoneyRule['destination']) => void }) {
  const t = useTheme();
  const starters = [
    { destination: 'bill' as const, name: 'Food & drinks', detail: 'a bill, split between the winners' },
    { destination: 'kitty' as const, name: 'Group piggy bank', detail: 'a share of each win, saved up' },
    { destination: 'host_fee' as const, name: 'Host fee', detail: 'a flat amount for the house' },
  ];

  return (
    <>
      <View style={[styles.blank, { borderColor: t.dashed }]}>
        <Text style={[styles.blankTitle, { color: t.text }]}>No rules yet</Text>
        <Text style={[styles.blankBody, { color: t.muted }]}>
          A rule takes money off the table at settle-up — a bill to split, a piggy bank that carries
          over, a fee for the host. Most clubs set these once and never touch them again.
        </Text>
        <Button label="Add the first rule" variant="secondary" onPress={() => onStart('kitty')} />
      </View>

      {starters.map((s) => (
        <Pressable
          key={s.destination}
          accessibilityRole="button"
          onPress={() => onStart(s.destination)}
          style={({ pressed }) => [
            styles.row,
            {
              borderBottomColor: t.hairline,
              borderBottomWidth: StyleSheet.hairlineWidth,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.rowName, { color: t.text }]}>{s.name}</Text>
            <Text style={[styles.rowSub, { color: t.muted }]}>{s.detail}</Text>
          </View>
          <Text style={[styles.use, { color: t.muted }]}>USE</Text>
        </Pressable>
      ))}
    </>
  );
}

/**
 * Picking the money this group keeps its book in.
 *
 * ⚠ LAYOUT NOT DRAWN. No board opens this — O1d states the currency and draws
 * a chevron, and nothing draws what is behind it — so it is assembled from the
 * two things on this sheet that are drawn: O2's search box, and the sheet row
 * underneath it.
 *
 * SEARCH IS THE LIST'S FRONT DOOR, not a filter bolted onto it. There are a
 * hundred and fifty-six of these and nobody scrolls to Zambia: a code, a
 * symbol or the name of the money all match, and `searchCurrencies` ranks the
 * exact code first so three letters land on the one that was meant. The whole
 * list is still underneath, in the order the table is written, because "pick
 * from the list" is what a person who does not know the code needs.
 */
function Currencies({
  picked,
  query,
  onQuery,
  onPick,
}: {
  /** The code the group is on now. */
  picked: string;
  query: string;
  onQuery: (v: string) => void;
  onPick: (code: string) => void;
}) {
  const t = useTheme();
  const q = query.trim();

  /** `null` while nothing is typed — which is a different thing from no matches. */
  const matches = useMemo(() => (q === '' ? null : searchCurrencies(q, 12)), [q]);
  /** The four that were chips, plus whichever one the group is actually on. */
  const common = useMemo(
    () => CURRENCIES.filter((c) => COMMON_CURRENCIES.includes(c.code) || c.code === picked),
    [picked],
  );
  const rest = useMemo(
    () => CURRENCIES.filter((c) => !common.some((k) => k.code === c.code)),
    [common],
  );

  const row = (c: Currency) => (
    <Pressable
      key={c.code}
      accessibilityRole="button"
      accessibilityLabel={`${c.code} · ${c.name}`}
      accessibilityState={{ selected: c.code === picked }}
      onPress={() => onPick(c.code)}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: t.hairline,
          borderBottomWidth: StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: t.text }]}>{c.code}</Text>
        <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>
          {c.name}
        </Text>
      </View>
      <Text style={[styles.symbol, { color: t.muted }]} numberOfLines={1}>
        {c.symbol}
      </Text>
      {c.code === picked && <Icon name="check" color={t.win} size={16} />}
    </Pressable>
  );

  return (
    <>
      <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Code, symbol or name — USD, €, koruna"
          placeholderTextColor={t.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => {
            const first = matches?.[0];
            if (first !== undefined) onPick(first.code);
          }}
          style={[styles.searchText, { color: t.text }]}
        />
      </View>

      <Text style={[styles.note, { color: t.muted }]}>
        The group keeps one book, so this is the money every night in it is counted in — past ones
        included. It renames the column; no figure is converted.
      </Text>

      {matches === null ? (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>Common</Text>
            {common.map(row)}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>Every currency</Text>
            {rest.map(row)}
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>
            {matches.length === 0 ? 'Nothing found' : 'Best match first'}
          </Text>
          {matches.map(row)}
          {matches.length === 0 && (
            <Text style={[styles.empty, { color: t.muted }]}>
              {`No currency called “${q}”. Three letters of the code, the symbol, or the name of the money all find one.`}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

/**
 * One step's content, sliding in from the direction it came from.
 *
 * The transition is the only thing telling a person that the sheet changed
 * rather than the whole screen: nothing moves at the top — grabber, title and
 * close stay exactly where they were — so without it a tap on a row reads as a
 * redraw. 22 points and 180ms, which is a step and not a journey.
 */
function StepBody({
  step,
  direction,
  children,
}: {
  step: Step;
  direction: 1 | -1;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, anim]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [direction * 22, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: space.page, marginBottom: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  tableName: { marginHorizontal: space.card, marginBottom: 14 },

  // doc 15 § 3: a sheet's rows are 15 / 4 with a hairline between them.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 13, fontWeight: '400' },
  // What a figure in this money is written with — "Kč", or the code again
  // where CLDR has no glyph. Quiet: the code above it is what identifies it.
  symbol: { fontSize: 15, fontWeight: '500', flexShrink: 0, textAlign: 'right' },

  /* -----------------------------------------------------------------------
   * O1c-2 · the summary, the seats and the group. Every figure below is the
   * board's own, at `design/handoff-game-settings/boards/Game Settings.dc.html`.
   * ------------------------------------------------------------------- */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
  },
  summaryText: { flex: 1, minWidth: 0, gap: 5 },
  summaryTerms: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  summaryDeductions: { fontSize: 13, fontWeight: '400', lineHeight: 18.85 },
  change: { flexShrink: 0, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 8 },
  changeLabel: { fontSize: 13, fontWeight: '700' },

  seats: { gap: 8, paddingTop: 2 },
  seat: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, gap: 11 },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seatText: { flexShrink: 1, minWidth: 0, gap: 2 },
  seatName: { fontSize: 16, fontWeight: '600' },
  seatSub: { fontSize: 12.5, fontWeight: '400' },
  seatHint: { fontSize: 12.5, fontWeight: '400' },
  figureTap: { marginLeft: 'auto', flexShrink: 0 },
  seatFigure: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    paddingBottom: 1,
  },
  seated: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monogram: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontSize: 13, fontWeight: '700' },

  typing: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
  },
  typingSymbol: { fontSize: 17, fontWeight: '700' },
  typingValue: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    padding: 0,
  },

  // Two to a row, and a lone last one stays half-width rather than stretching
  // across the sheet — the board's grid is 1fr 1fr and does the same.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 2 },
  free: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
  },
  newChip: { justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  freeMonogram: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  freeMonogramText: { fontSize: 11, fontWeight: '700' },
  freeName: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },

  /* The footer, in both its faces — the total over the primary, and the
     accessory bar that replaces them while an amount is open. */
  onTable: { fontSize: 13, fontWeight: '400', fontVariant: ['tabular-nums'] },
  onTableCentred: { textAlign: 'center' },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  done: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  doneLabel: { fontSize: 14, fontWeight: '700' },

  /* -----------------------------------------------------------------------
   * O1d · Game details. One card, hairlines inside it, no box in a box.
   * ------------------------------------------------------------------- */
  card: { borderRadius: 13, borderWidth: 1, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  cardBlock: { gap: 9, paddingTop: 11, paddingBottom: 13, paddingHorizontal: 15 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  cardText: { flexShrink: 1, minWidth: 0, gap: 2 },
  cardLabel: { fontSize: 16, fontWeight: '500' },
  cardSub: { fontSize: 12.5, fontWeight: '400' },
  cardValue: { marginLeft: 'auto', fontSize: 16, fontWeight: '600' },

  pair: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 7 },
  slash: { fontSize: 14, fontWeight: '400' },
  moneyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  moneySymbol: { fontSize: 16, fontWeight: '600' },
  moneyValue: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    padding: 0,
  },
  amountAtEnd: { marginLeft: 'auto' },

  steps: { flexDirection: 'row', gap: 5 },
  step: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  stepLabel: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

  straddleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillLabel: { fontSize: 13, fontWeight: '600' },

  empty: { ...type.footnote, paddingHorizontal: 4, paddingTop: 8 },
  warn: { ...type.footnote, paddingHorizontal: 4, paddingBottom: 10, lineHeight: 18 },
  footnote: { ...type.footnote, marginHorizontal: space.page, marginTop: 18 },
  // The same words as a footnote, said before the thing instead of after it.
  note: { ...type.footnote, marginHorizontal: space.page, marginBottom: 18 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: space.card,
    marginBottom: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchText: { flex: 1, fontSize: 16, fontWeight: '400', padding: 0 },

  amount: {
    ...type.figure,
    // A FIXED WIDTH, not a minimum. A TextInput with no width of its own takes
    // whatever the row will give it, which on a seated row is everything the
    // name was using — "Lena" rendered as "L." beside a field three times the
    // size it needs.
    width: 104,
    flexGrow: 0,
    flexShrink: 0,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addPill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 },
  addPillLabel: { fontSize: 13, fontWeight: '700' },

  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: space.page,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  addField: {
    ...type.body,
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButton: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  addLabel: { fontSize: 15, fontWeight: '700' },

  blank: {
    marginHorizontal: 0,
    marginBottom: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
  },
  blankTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  blankBody: { ...type.footnote, paddingBottom: 4 },
  use: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 },
});
