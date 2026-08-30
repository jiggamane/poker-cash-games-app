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
  formatMoney,
  money,
  ROUNDING_CHOICES,
  roundingLabel,
  roundingSentence,
  ruleDetail,
  stakesLabel,
  stakesSummary,
  straddleLabel,
  withStraddle,
  type Money,
  type MoneyRule,
  type PlayerId,
  type RoundingMode,
  type Stakes,
  type StraddleMode,
} from '@poker-club/core';
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
import { clockLabel, useNow } from '../src/lib/elapsed';
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
 * multi-step flow — O2 replaces O1's content, O5 replaces the rules step's —
 * and it is also the only thing that can work: a sheet may not push, so the
 * old "Change the house rules" row had to dismiss this sheet and push the
 * CLUB's rules instead, which threw away every player already ticked and
 * edited the wrong layer of the chain into the bargain.
 *
 * WHICH LAYER THE RULES ON THIS SCREEN BELONG TO is the point of the fix. Rev
 * 18: "the group carries defaults; the game carries its own, seeded from the
 * group's, overriding it for that game only and never writing back." Editing
 * here therefore changes tonight and only tonight — nothing is written until
 * the table opens, and the club's own setting is untouched by all of it.
 *
 * The rules row must not be the thing your thumb lands on. Every rule arrives
 * pre-filled from last night, so opening a night stays what it is: adding
 * players and confirming their first buy-ins.
 */
type Step =
  | 'game'
  | 'players'
  | 'rules'
  | 'rule'
  | 'stakes'
  | 'buy-in'
  | 'rounding'
  | 'currency';

/** Where the close and a completed step return to. The flow is one level deep. */
const PARENT: Record<Step, Step | null> = {
  game: null,
  players: 'game',
  rules: 'game',
  rule: 'rules',
  stakes: 'game',
  'buy-in': 'game',
  rounding: 'game',
  currency: 'game',
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
  /** What the primary says the table will be stamped at, kept on the minute. */
  const now = useNow();

  const [picked, setPicked] = useState<Record<PlayerId, string>>({});
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
  /** The straddle in words, or null when there is none — O1 draws no line. */
  const straddle = straddleLabel(liveStakes, currency.symbol);

  const seats = Object.entries(picked)
    .map(([playerId, amount]) => ({
      playerId,
      name: club.members.find((m) => m.id === playerId)?.name ?? 'Someone',
      buyIn: money(Number(amount) || 0),
    }))
    .filter((s) => s.buyIn > 0);

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

  /** The one primary, on the two steps that carry it. */
  const openLabel =
    seats.length === 0
      ? 'Pick who is playing'
      : nameProblem !== null
        ? 'Name this table'
        : `Open the table · ${clockLabel(now)}`;

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
        stakes: stakesSummary(liveStakes, currency.symbol),
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
    go('rules', -1);
  }

  function removeDraft() {
    if (draft === null) return;
    setRules(liveRules.filter((r) => r.id !== draft.rule.id));
    setDraft(null);
    go('rules', -1);
  }

  const sorted = [...liveRules].sort((a, b) => a.sortOrder - b.sortOrder);
  const active = sorted.filter((r) => r.active);
  const nextOrder = sorted.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
  const seatedCount = Object.keys(picked).length;

  // -------------------------------------------------------------------------
  // The header, the footer and the body, chosen by step. One sheet, one close.
  // -------------------------------------------------------------------------

  const title =
    step === 'game'
      ? 'New session'
      : step === 'players'
        ? 'Add players'
        : step === 'rules'
          ? 'Money rules'
          : step === 'rule'
            ? draft === null || draft.rule.name.trim() === ''
              ? 'New rule'
              : draft.rule.name
            : step === 'stakes'
              ? 'Stakes'
              : step === 'buy-in'
                ? 'Default buy-in'
                : step === 'rounding'
                  ? 'Rounding'
                  : 'Currency';

  const problem = draft === null ? null : ruleProblem(draft.rule, money(0));

  const footer =
    step === 'game' || step === 'rules' ? (
      <Button
        label={openLabel}
        variant="primary"
        disabled={seats.length === 0 || nameProblem !== null || busy}
        onPress={() => void openTable()}
      />
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
    ) : step === 'currency' ? (
      // Nothing is held back to be saved here: picking a row writes the group
      // and returns, so this button is the way out for somebody who opened the
      // list and did not want anything from it.
      <Button label="Done" variant="primary" onPress={() => go('game', -1)} />
    ) : (
      <Button label="Save" variant="primary" onPress={() => go('game', -1)} />
    );

  return (
    <Sheet
      title={title}
      {...(step === 'game' ? { sub: club.name } : {})}
      {...(step === 'players' ? { meta: `${seatedCount} seated` } : {})}
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

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: t.muted }]}>The game</Text>

              {/*
               * THE FIRST ROW THE BOARD DRAWS, and for a long time the one row
               * that was not here. `03-data-model.md` carries `{ small, big }`
               * on the Group and on the Session, rev 18 § 5.2 adds the straddle
               * beside them, and none of it existed — so the row was flagged
               * out rather than drawn against nothing, which was right at the
               * time and stopped being right once home started promising
               * "you'll set the buy-in and blinds once, here".
               *
               * It reads the same three layers as the buy-in and the rules —
               * this game → last game → club default → app default — and, like
               * them, editing it here changes tonight and only tonight.
               */}
              <SettingRow
                label="Stakes"
                // ⚠ COPY NOT DRAWN. O1 draws no line under this row, because it
                // draws a game with no straddle. A straddle that is being
                // played is not a thing to leave a host to find out at the
                // table, so it is said here in the row's own sub-line.
                {...(straddle === null ? {} : { sub: straddle })}
                value={stakesLabel(liveStakes, currency.symbol)}
                onPress={() => go('stakes')}
              />
              <SettingRow
                label="Default buy-in"
                value={formatMoney(liveBuyIn, currency.symbol)}
                onPress={() => go('buy-in')}
              />
              {/*
               * A NIGHT DOES NOT PICK A CURRENCY — the money a book is written
               * in belongs to the GROUP (`12-the-group.md` § 2, the top row of
               * its settings table), and a book whose column changed money
               * halfway through would be unreadable.
               *
               * What used to follow from that was a row with no chevron: the
               * currency stated here and changed only in the group. It was the
               * wrong half of the rule to enforce. Setting the game up is the
               * one moment a host is thinking about what the table plays for,
               * and the club was created in dollars by a default nobody chose
               * — so this row opens the picker, and the sub-line says which
               * layer it writes, because that part is still true.
               */}
              <SettingRow
                label="Currency"
                sub="the group's book"
                value={`${currency.code} · ${currency.name}`}
                onPress={() => go('currency')}
              />
              <SettingRow
                label="Money rules"
                // What will actually come off, which is not the same as what
                // was inherited: a rule switched off for tonight takes nothing,
                // and naming it here would say it does.
                sub={
                  active.length === 0
                    ? 'nothing comes off the table'
                    : active.map((r) => r.name).join(' · ')
                }
                value={rules === null ? sameAs(inherited) : 'set for tonight'}
                quiet
                onPress={() => go('rules')}
              />
              {/*
               * HOW COARSELY THE TABLE SETTLES, on the screen that opens it.
               *
               * A money rule, not a display setting — it changes what people
               * actually pay — and it governs every rule above it at once,
               * which is why it is its own row rather than a field inside one.
               * It was reachable only from tonight's money rules or from the
               * club's, both of which are places you go AFTER the table is
               * open; a group playing for thousands therefore played the first
               * hand on whole dollars and found out at settle-up. The same four
               * choices as `/rounding`, off `ROUNDING_CHOICES` in core, so the
               * list is written once.
               */}
              <SettingRow
                label="Rounding"
                sub="what a rule takes is worked out to this"
                value={roundingLabel(liveRounding)}
                onPress={() => go('rounding')}
                last
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: t.muted }]}>
                {`Seated · ${seatedCount} of ${club.members.length}`}
              </Text>

              {/*
                ⚠ COPY NOT DRAWN. The design has no state for a club with no
                admin, because it was written for one that always has exactly
                one. Flagged rather than left silent: the alternative is a host
                finding out after the night that it was recorded against nobody.
              */}
              {me === undefined && club.members.length > 0 && <NoHost />}

              <View style={styles.chips}>
                {club.members
                  .filter((m) => picked[m.id] !== undefined)
                  .map((m) => (
                    <SeatChip
                      key={m.id}
                      name={m.name}
                      host={m.id === me?.id}
                      amount={formatMoney(money(Number(picked[m.id]) || 0), currency.symbol)}
                      onPress={() => go('players')}
                    />
                  ))}

                <FindChip onPress={() => go('players')} />
              </View>

              {/*
                ⚠ COPY NOT DRAWN. O1 is drawn with four people already seated,
                so it has no empty state and no words for one. Flagged rather
                than left blank: an empty chip row with nothing but a dashed
                "Find a player" beside a button reading "Pick who is playing"
                is a screen that says the same thing twice and explains neither.
              */}
              {seatedCount === 0 && (
                <Text style={[styles.empty, { color: t.muted }]}>
                  {club.members.length === 0
                    ? 'Nobody on the roster yet. Add the first name and they can play tonight.'
                    : 'Nobody is seated yet. Find a player to start the table.'}
                </Text>
              )}
            </View>
          </>
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

        {step === 'rules' &&
          (sorted.length === 0 ? (
            <NoRules
              onStart={(destination) => editRule(draftRule(destination, nextOrder), true)}
              onSkip={() => go('game', -1)}
            />
          ) : (
            <>
              <RuleList
                caption="Tonight’s rules"
                rules={sorted}
                describe={(rule) =>
                  ruleDetail(rule, {
                    collectorName: club.members.find((m) => m.id === rule.collectorPlayerId)?.name,
                  })
                }
                onOpen={(rule) => editRule(rule, false)}
                onToggle={(rule, active) =>
                  setRules(liveRules.map((r) => (r.id === rule.id ? { ...r, active } : r)))
                }
                onAdd={() => editRule(draftRule('kitty', nextOrder), true)}
              />
              <Text style={[styles.footnote, { color: t.muted }]}>
                These belong to tonight. They are copied from the {inherited.from} and changing one
                here changes this game only — the group keeps its own.
              </Text>
            </>
          ))}

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

        {step === 'stakes' && (
          <Blinds stakes={liveStakes} symbol={currency.symbol} onChange={setStakes} />
        )}

        {step === 'buy-in' && (
          <Amount
            value={liveBuyIn}
            symbol={currency.symbol}
            presets={[200, 500, 1000]}
            onChange={setBuyIn}
            note="What a seat costs tonight. Everyone is seated at this figure and any of them can be typed over before the table opens."
          />
        )}

        {step === 'rounding' && <Rounding picked={liveRounding} onPick={setRounding} />}

        {step === 'currency' && (
          <Currencies
            picked={currency.code}
            query={currencyQuery}
            onQuery={setCurrencyQuery}
            onPick={(code) => {
              void setClubCurrency(club.id, code);
              setCurrencyQuery('');
              go('game', -1);
            }}
          />
        )}
      </StepBody>
    </Sheet>
  );
}

/** "same as last time" — the board's string, and only for the layer it is true of. */
const sameAs = (inherited: Inherited): string =>
  inherited.from === 'last game'
    ? 'same as last time'
    : // ⚠ COPY NOT DRAWN. O1 draws the last-game case only; a club that has
      // never played reads its own layer rather than a promise that is false.
      `the ${inherited.from}`;

/**
 * A row in *The game* — label, an optional line under it, the value at the
 * right, and a chevron when there is somewhere to go.
 *
 * A row without a chevron does not move: the currency is stated here and
 * changed in the group, and a chevron on it would be a promise this sheet
 * cannot keep.
 */
function SettingRow({
  label,
  sub,
  value,
  quiet = false,
  last = false,
  onPress,
}: {
  label: string;
  sub?: string;
  value: string;
  /** A value that is a state rather than a figure sets lighter — "same as last time". */
  quiet?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const body = (
    <>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
        {sub !== undefined && (
          <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      <Text
        style={[quiet ? styles.rowQuiet : styles.rowValue, { color: quiet ? t.muted : t.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {onPress !== undefined && <Icon name="chevron" color={t.muted} size={13} />}
    </>
  );

  const style = [
    styles.row,
    { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
  ];

  if (onPress === undefined) return <View style={style}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/** A seated player. The buy-in rides on the chip, because that is what was agreed. */
function SeatChip({
  name,
  host,
  amount,
  onPress,
}: {
  name: string;
  host: boolean;
  amount: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: t.surface, borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.chipName, { color: t.text }]}>{name}</Text>
      {host && <Text style={[styles.chipHost, { color: t.muted }]}>HOST</Text>}
      <Text style={[styles.chipAmount, { color: t.muted }]}>{amount}</Text>
    </Pressable>
  );
}

/** Dashed, because dashed always means "creates something". */
function FindChip({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        styles.findChip,
        { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="plus" color={t.text} size={15} />
      <Text style={[styles.chipName, { color: t.text }]}>Find a player</Text>
    </Pressable>
  );
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
 * O2 · Add players.
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
 * and the skip stated out loud, because a group that deducts nothing is a
 * normal group and not an unfinished setup.
 */
function NoRules({
  onStart,
  onSkip,
}: {
  onStart: (destination: MoneyRule['destination']) => void;
  onSkip: () => void;
}) {
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

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Start from a common one</Text>
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
      </View>

      <Button label="Skip — no deductions" variant="text" onPress={onSkip} style={styles.skip} />
    </>
  );
}

/**
 * The stakes — the blinds, and whether a straddle is played.
 *
 * ⚠ THE EDITOR ITSELF IS NOT DRAWN. O1 draws the ROW and its chevron; no board
 * anywhere draws what opens. What rev 18 § 6 does specify is the two controls
 * this is made of, by name and to the point, because they were drawn for
 * exactly this setting on group creation:
 *
 *   · "Numeric cell (blinds)" — flex 1, 11 × 12, radius 8, hairline border,
 *     caption 700 10 letterspaced and uppercase over a 600 18 tabular value.
 *   · "Pill segmented pick (straddle)" — 6 × 10, radius 6, 600 12, inactive
 *     transparent with a hairline border, active filled with the foreground
 *     and its label inverted; sitting in a 9 × 12 hairline field under a
 *     700 10 uppercase label.
 *
 * So this is assembled from drawn parts rather than invented, which is the
 * most the handoff allows without a board. Flagged here rather than left
 * unbuilt: the row is the first thing on the screen and a chevron that opens
 * nothing is worse than either.
 *
 * NO PRESETS, unlike the buy-in beside it. A buy-in has three figures a room
 * argues between; blinds are two numbers a group settled on once and will type
 * once, and a preset row of guesses would be four controls pretending to be a
 * decision.
 */
function Blinds({
  stakes,
  symbol,
  onChange,
}: {
  stakes: Stakes;
  symbol: string;
  onChange: (s: Stakes) => void;
}) {
  const t = useTheme();
  const modes: ReadonlyArray<{ mode: StraddleMode; label: string }> = [
    { mode: 'none', label: 'No' },
    { mode: 'optional', label: 'Optional' },
    { mode: 'mandatory', label: 'Mandatory' },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.figureRow}>
        <Text style={[styles.figure, { color: t.text }]}>{stakesLabel(stakes, symbol)}</Text>
      </View>

      <View style={styles.cells}>
        <Cell
          caption="Small blind"
          value={stakes.small}
          symbol={symbol}
          onChange={(small) => onChange({ ...stakes, small })}
        />
        <Cell
          caption="Big blind"
          value={stakes.big}
          symbol={symbol}
          onChange={(big) => onChange({ ...stakes, big })}
        />
      </View>

      <View style={[styles.straddle, { borderColor: t.hairline }]}>
        <Text style={[styles.straddleLabel, { color: t.muted }]}>Straddle</Text>
        <View style={styles.pills}>
          {modes.map(({ mode, label }) => {
            const on = stakes.straddle === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => onChange(withStraddle(stakes, mode))}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: on ? t.text : 'transparent',
                    borderColor: on ? t.text : t.hairline,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.pillLabel, { color: on ? t.onFill : t.muted }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* The figure only exists while there is a straddle to have one — see
          `withStraddle`, which is where the two are kept in step. */}
      {stakes.straddle !== 'none' && (
        <View style={styles.cells}>
          <Cell
            // "Amount", not "Straddle" — it sits directly under the field
            // whose own label already says STRADDLE, and the word twice in
            // twelve points reads as two settings rather than one.
            caption="Amount"
            value={stakes.straddleAmount ?? money(0)}
            symbol={symbol}
            onChange={(straddleAmount) => onChange({ ...stakes, straddleAmount })}
          />
        </View>
      )}

      <Text style={[styles.explain, { color: t.muted }]}>
        What tonight is played at. Nothing in the ledger is worked out from the blinds — they are
        recorded so the night says what it was, and so the next one opens at the same game.
      </Text>
    </View>
  );
}

/** Rev 18 § 6's "numeric cell": a caption over a figure you can type into. */
function Cell({
  caption,
  value,
  symbol,
  onChange,
}: {
  caption: string;
  value: Money;
  symbol: string;
  onChange: (v: Money) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.cell, { borderColor: t.hairline }]}>
      <Text style={[styles.cellCaption, { color: t.muted }]}>{caption}</Text>
      <View style={styles.cellFigure}>
        <Text style={[styles.cellSymbol, { color: t.muted }]}>{symbol}</Text>
        <TextInput
          value={String(value)}
          onChangeText={(v) => onChange(money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)))}
          // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
          // to a digits-only keyboard.
          testID="amount"
          keyboardType="number-pad"
          style={[styles.cellValue, { color: t.text }]}
        />
      </View>
    </View>
  );
}

/**
 * A figure being set — the buy-in, in the O5 idiom: the number large, then the
 * presets, then a box to type one that is not on the list.
 */
function Amount({
  value,
  symbol,
  presets,
  onChange,
  note,
}: {
  value: Money;
  symbol: string;
  presets: readonly number[];
  onChange: (v: Money) => void;
  note: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.figureRow}>
        <Text style={[styles.figure, { color: t.text }]}>{formatMoney(value, symbol)}</Text>
        <Text style={[styles.figureUnit, { color: t.muted }]}>a seat</Text>
      </View>

      <View style={styles.presets}>
        {presets.map((v) => (
          <Button
            key={v}
            label={formatMoney(money(v), symbol)}
            variant="preset"
            selected={value === v}
            onPress={() => onChange(money(v))}
            style={styles.preset}
          />
        ))}
        <View style={[styles.setBox, { borderColor: t.quietOutline }]}>
          <TextInput
            value={String(value)}
            onChangeText={(v) => onChange(money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)))}
            // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
            // to a digits-only keyboard.
            testID="amount"
            keyboardType="number-pad"
            style={[styles.setText, { color: t.text }]}
          />
        </View>
      </View>

      <Text style={[styles.explain, { color: t.muted }]}>{note}</Text>
    </View>
  );
}

/**
 * HOW COARSELY THE TABLE SETTLES — the four chips, before the night exists.
 *
 * S14 draws this control as an open chip row and `ROUNDING_CHOICES` in core is
 * the list — Dollar · 10s · 100s · 1k — so it is written once and both screens
 * that offer it read the same four.
 *
 * The chips are this sheet's own preset row at `flex: 1`, the same object the
 * buy-in uses. B2 is why that is worth saying: the row on `/rounding` is drawn
 * for the board's six, and at 24 points of padding a side a 52-point slot left
 * four for a word that needed thirty-eight, so "100s" came out through the side
 * of its own box. Four across this sheet at 393 is about 85 a slot with no
 * horizontal padding at all, which "Dollar" clears twice over.
 *
 * IT SAYS WHAT IT DOES NOT TOUCH, because that is the first thing a host asks
 * and the answer is not obvious. Nothing anybody counted moves: buy-ins,
 * cash-outs and every result are exactly what they were. What is rounded is a
 * DIVISION — what a rule takes off the winners — and the parts still add back
 * up to the whole, so the bar is owed what the bar is owed. Said in the same
 * words as `/rounding`, off `roundingSentence` in core rather than written
 * twice.
 *
 * ⚠ LAYOUT NOT DRAWN on this sheet. No board puts rounding on O1 — it was a row
 * on tonight's money rules and nowhere else. Assembled from the two things here
 * that are drawn: the preset row, and the sentence under it.
 */
function Rounding({
  picked,
  onPick,
}: {
  picked: RoundingMode;
  onPick: (mode: RoundingMode) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.presets}>
        {ROUNDING_CHOICES.map((c) => (
          <Button
            key={c.mode}
            label={c.chip}
            variant="preset"
            selected={c.mode === picked}
            onPress={() => onPick(c.mode)}
            style={styles.preset}
          />
        ))}
      </View>

      <Text style={[styles.roundValue, { color: t.text }]}>{roundingLabel(picked)}</Text>
      <Text style={[styles.explain, { color: t.muted }]}>{roundingSentence(picked)}.</Text>

      <Text style={[styles.explain, { color: t.muted }]}>
        It touches nothing anybody counts. Buy-ins, cash-outs and everyone’s result are exactly
        what they were — what is rounded is what a rule takes off the winners, and the shares
        still add up to the whole.
      </Text>

      <Text style={[styles.explain, { color: t.muted }]}>
        Tonight’s, like the rules and the buy-in. The group keeps its own default, and this game
        is settled with what it opened with.
      </Text>
    </View>
  );
}

/**
 * Picking the money this group keeps its book in.
 *
 * ⚠ LAYOUT NOT DRAWN. No board opens this — O1 states the currency and never
 * offered to change it — so it is assembled from the two things on this sheet
 * that are drawn: O2's search box, and the sheet row underneath it.
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
  rowLabel: { fontSize: 17, fontWeight: '500' },
  rowName: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 13, fontWeight: '400' },
  rowValue: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  // What a figure in this money is written with — "Kč", or the code again
  // where CLDR has no glyph. Quiet: the code above it is what identifies it.
  symbol: { fontSize: 15, fontWeight: '500', flexShrink: 0, textAlign: 'right' },
  rowQuiet: { fontSize: 15, fontWeight: '400', flexShrink: 1, textAlign: 'right' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  findChip: { borderWidth: 1.5, borderStyle: 'dashed' },
  chipName: { fontSize: 15, fontWeight: '600' },
  chipHost: { fontSize: 11, fontWeight: '600', letterSpacing: 0.66 },
  chipAmount: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

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
    marginHorizontal: space.card,
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
  skip: { marginHorizontal: space.card },

  figureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  figure: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2.24,
    lineHeight: 54,
    fontVariant: ['tabular-nums'],
  },
  figureUnit: { fontSize: 22, fontWeight: '700', paddingBottom: 5 },
  // Rev 18 § 6 · "numeric cell (blinds)" and "pill segmented pick (straddle)",
  // to the point. Both were drawn for this setting on group creation, so the
  // figures here are copied rather than chosen.
  cells: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  cell: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cellCaption: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  cellFigure: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingTop: 3 },
  cellSymbol: { fontSize: 18, fontWeight: '600' },
  cellValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  straddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  straddleLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  pills: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1 },
  pillLabel: { fontSize: 12, fontWeight: '600' },

  presets: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  preset: { flex: 1, height: 44, paddingHorizontal: 0 },
  setBox: {
    flex: 1,
    height: 44,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setText: { fontSize: 16, fontWeight: '700', textAlign: 'center', width: '100%', padding: 0 },
  explain: { ...type.footnote, paddingHorizontal: 4, paddingTop: 12 },
  /* The rounding rule in words, over its own explanation. Not the 56pt figure
     the buy-in and the blinds use: "Whole dollars" is thirteen glyphs and would
     be off the side of the sheet before the reader's text setting touched it. */
  roundValue: { fontSize: 20, fontWeight: '700', paddingHorizontal: 4, paddingTop: 4 },
});
