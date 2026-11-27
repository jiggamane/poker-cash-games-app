import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/Text';
import type { TextInputInstance } from 'react-native';
import { Button } from '../src/components/Button';
import type { BarAction } from '../src/components/Bar';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import {
  previewInvite,
  readClaimFailure,
  redeemInvite,
  type InvitePreview,
} from '../src/lib/invites';
import { pullBooks } from '../src/lib/pull';
import { explainServerError, isNoAnswer, isSupabaseConfigured } from '../src/lib/supabase';

/**
 * X2 — claiming your place. Rev 15, `14-invite-and-watcher.md`.
 *
 * STANDALONE, NO WAY BACK. It arrives from a link, the reader has not been
 * anywhere, and there is nothing to go back to: no chevron, no grabber, and
 * deliberately no close. That classification is unchanged by S77 — only X1
 * moved. On the full board (approved) it has the ink top every screen has,
 * with the title on it and nothing else, and a bar when a state has a primary.
 *
 * Four states, one screen:
 *
 *   X2a  checking      a 2px hairline, no spinner glyph, held 400ms minimum
 *   X2b  ready         whose place it is, and what they are joining
 *   X2c  dead          one string for four causes — see below
 *   X2d  typing        ten characters, because a link cannot always arrive
 *
 * And two more, B47's siblings and B50's fix — states the server had always
 * been able to describe and this screen answered for with the dead string:
 *
 *   2c Still checking      the server did not answer; the code is fine
 *   2c Already a member    a live code for a seat in a book you already sit in
 *
 * THE PLAN BLOCK IS NOT BUILT. S85 draws Free / Regular / Full on X2b and marks
 * it "drawn, not scheduled": `01-product-logic.md` § 4 says build none of the
 * tier system, the § 4 seam holds, and X2b ships without it. Removing it leaves
 * a working screen because nothing paid was ever ticked — the card, the three
 * statements, and a primary reading "Claim your place".
 */
export default function Claim() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  const [code, setCode] = useState(c ?? '');
  const [stage, setStage] = useState<Stage>(c === undefined ? 'typing' : 'checking');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [claiming, setClaiming] = useState(false);
  /** What went wrong, for the one screen that is allowed to say. */
  const [trouble, setTrouble] = useState<string>(NO_ANSWER);

  const check = useCallback(async (raw: string) => {
    setStage('checking');
    /*
     * X2a is held a minimum of 400ms even when the answer is instant. Without
     * it a good code produces a single frame of this screen, which reads as a
     * flash of an error rather than as work being done.
     */
    const floor = new Promise((r) => setTimeout(r, 400));
    try {
      const [found] = await Promise.all([previewInvite(raw.trim()), floor]);
      if (found === null) {
        setStage('dead');
        return;
      }
      setPreview(found);
      setStage('ready');
    } catch (e) {
      /*
       * A network failure is NOT a dead code — B50. § 4 is explicit that this
       * screen "only becomes X2c when the server has actually spoken", and the
       * comment that used to sit here said exactly that three lines above the
       * line that set `dead` anyway. A person in a tunnel was told to go and
       * ask for a replacement for a code that works.
       *
       * ZERO ROWS IS THE ONLY THING THAT MEANS DEAD. `previewInvite` answers
       * null for all four dead causes and throws for everything else, so a
       * throw is never evidence about the code.
       */
      await floor;
      setTrouble(isNoAnswer(e) ? NO_ANSWER : explainServerError(e));
      setStage('unreachable');
    }
  }, []);

  useEffect(() => {
    if (c !== undefined) void check(c);
  }, [c, check]);

  async function claim() {
    if (preview === null) return;
    setClaiming(true);
    try {
      await redeemInvite(code.trim());
      /*
       * Fill the phone on the way in. X2b promises the nights are already
       * there, and they are — on the server, with this name on them. A failure
       * here is not a failed claim: the seat is bound either way, and Settings
       * can fetch again.
       */
      await pullBooks().catch(() => undefined);
      // Done lands on the club root, this group already selected. No
      // interstitial and no confirmation screen — the roster with their name in
      // it IS the confirmation.
      router.replace('/');
    } catch (e) {
      /*
       * Three outcomes, not one — B50. Spent between the preview and the tap,
       * or taken by somebody else, is dead and says so with the one string the
       * four causes share. The other two are not refusals of a code at all, and
       * `readClaimFailure` is where the reasoning lives.
       */
      const why = readClaimFailure(e);
      if (why === 'unreachable') {
        setTrouble(isNoAnswer(e) ? NO_ANSWER : explainServerError(e));
        setStage('unreachable');
      } else {
        setStage(why === 'already-a-member' ? 'member' : 'dead');
      }
    } finally {
      setClaiming(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Standalone title="Not connected">
        <Body>
          This build has no Supabase project configured, so there is nothing to claim against.
        </Body>
      </Standalone>
    );
  }

  if (stage === 'checking') return <Checking />;
  if (stage === 'unreachable') {
    return <Unreachable trouble={trouble} onRetry={() => void check(code)} />;
  }
  if (stage === 'member') return <AlreadyAMember group={preview?.groupName ?? null} />;
  if (stage === 'dead') return <Dead onType={() => setStage('typing')} />;
  if (stage === 'typing') {
    return <Typing code={code} setCode={setCode} onCheck={() => void check(code)} />;
  }
  return <Ready preview={preview!} busy={claiming} onClaim={() => void claim()} />;
}

type Stage = 'checking' | 'ready' | 'dead' | 'typing' | 'unreachable' | 'member';

/**
 * ⚠ COPY DRAWN, NOT SIGNED OFF. Both strings below are `handoff-invites-3`'s,
 * taken verbatim off `2c Still checking` and `2c Already a member` rather than
 * written here — the handoff lists them as wanting sign-off, and the rule is to
 * flag a string rather than invent one. They are the drawn answer to states the
 * screen previously had no words for at all.
 */
const NO_ANSWER =
  'This is taking longer than it should. The code is fine — the phone cannot reach the club.';


/** X2a. A 2px hairline with a 38% segment — no spinner glyph, no logo. */
function Checking() {
  return (
    <Standalone title="Checking your invite">
      <Body>This takes a second.</Body>
      <Track />
    </Standalone>
  );
}

/**
 * `2c Still checking` · the server did not answer.
 *
 * THE SAME FRAME AS X2a, deliberately: the reader is still where they were,
 * and nothing has been decided about their code. It gains one line saying so
 * and a retry, and it names NEITHER THE GROUP NOR THE HOST — an unspent code
 * has not bought the right to read either, and this screen is reachable by
 * anybody who types ten characters.
 *
 * The action is secondary, and there is no bar (the full board,
 * `claim-checking`): there is nothing to complete here, and the bar would say
 * there was.
 */
function Unreachable({ trouble, onRetry }: { trouble: string; onRetry: () => void }) {
  return (
    <Standalone title="Checking your invite">
      <Body>{trouble}</Body>
      <Track />
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </Standalone>
  );
}

/**
 * `2c Already a member` · a seat in this book is already theirs.
 *
 * NOT A RE-TAPPED LINK, whatever it looks like. A spent code fails the liveness
 * test in `redeem_player_invite` before seats are looked at, so it lands on the
 * dead screen. What reaches here is a LIVE code for a different row in a group
 * the reader already sits in — the host sent it to the wrong person.
 *
 * THE ONE REFUSAL ALLOWED TO NAME THE GROUP. `0009_invite_privacy.sql` argues
 * it: this fires only for a book the caller can already read, so the name is
 * not a fact they were missing. That is also why it gets a primary — the bar —
 * and a way in, where the dead screen gets neither.
 */
function AlreadyAMember({ group }: { group: string | null }) {
  return (
    <Standalone
      title={group === null ? 'You already have a place here' : `You are already in ${group}`}
      bar={[{ label: 'Open the club', onPress: () => router.replace('/') }]}
    >
      <Body>This link is for a different place at that table, and you already have one.</Body>
    </Standalone>
  );
}

/**
 * X2c · Dead code.
 *
 * ONE STRING FOR FOUR CAUSES — unknown, spent, revoked, expired. Nothing here
 * names the group, the host, the inviter or the code that was tried, because
 * each is a fact a guesser would be paid for. S80 calls this a security
 * property rather than a copy preference, and the server holds up its half in
 * `0009_invite_privacy.sql`: one message, one duration, cause in the log only.
 *
 * The one control is SECONDARY and there is no bar. There is no primary act
 * available here, and the bar would imply there is. It used to centre on the
 * page with a lift, having no chrome to hang from; the full board
 * (`claim-dead`) gives it the ink top every standalone frame has, and it sits
 * at the top of the sheet like the others.
 */
function Dead({ onType }: { onType: () => void }) {
  return (
    <Standalone title="This invite can’t be used">
      <Body>Ask whoever invited you for a new link.</Body>
      <Button label="Type a code instead" variant="secondary" onPress={onType} />
    </Standalone>
  );
}

/**
 * X2b · Ready.
 *
 * Card order is deliberate: who you are, then a hairline, then what you are
 * joining. The name comes first because it is the surprise — the reader expects
 * an empty account and is shown a seat that has been theirs for months.
 *
 * NOT DRAWN HERE, and deliberately: X2b shows "4 nights on the book · since
 * January" under the name. `preview_player_invite` is specified to return a
 * name and a group and nothing about the money, and a night count is a fact
 * about somebody's history that an unspent code should not be able to read out.
 * The nights appear the moment the claim lands, which is one tap away. Raised
 * rather than invented, per the handoff's rule on missing strings.
 */
function Ready({
  preview,
  busy,
  onClaim,
}: {
  preview: InvitePreview;
  busy: boolean;
  onClaim: () => void;
}) {
  const t = useTheme();
  return (
    <Standalone
      title="Claim your place"
      /*
       * Claiming keeps the label and goes faint, with the hairline in the
       * content above the footnote. Never a full-screen spinner: the card
       * behind it is the thing being confirmed, and covering it would hide the
       * answer to "is this me". (The app dimmed the button to .55 with a
       * hairline under it; on the bar the board leaves this undrawn and asks
       * for a decision — the blocked bar is the nearest thing the bar has.)
       */
      bar={[{ label: 'Claim your place', onPress: onClaim, disabled: busy }]}
    >
      {preview.hostName !== null && (
        <Text style={[styles.body, { color: t.muted }]}>
          {preview.hostName} added you as{' '}
          <Text style={[styles.bodyStrong, { color: t.text }]}>{preview.playerName}</Text>
        </Text>
      )}

      <Card>
        <Text style={[styles.cardName, { color: t.text, borderBottomColor: t.hairline }]}>
          {preview.playerName}
        </Text>
        <Text style={[styles.cardGroup, { color: t.text }]}>{preview.groupName}</Text>
      </Card>

      {/* Decided copy. One 5px dot each — do not turn them into icons. */}
      <View style={styles.statements}>
        {[
          'You see the table live.',
          'Your net carries across every night.',
          'Only the host writes to the book.',
        ].map((line) => (
          <View key={line} style={styles.statement}>
            <View style={[styles.dot, { backgroundColor: t.muted }]} />
            <Text style={[styles.statementText, { color: t.text }]}>{line}</Text>
          </View>
        ))}
      </View>

      <View style={styles.foot}>
        {busy && <Track />}
        {preview.hostName !== null && (
          <Text style={[styles.footnote, { color: t.muted }]}>
            Not {preview.playerName}? Ask {preview.hostName} to send the right link.
          </Text>
        )}
      </View>
    </Standalone>
  );
}

/**
 * X2d · Typing a code.
 *
 * Two fields of five, because that is how a ten-character code is written down
 * and read back. A wrong code lands on X2c and NOT on an inline field error —
 * same string, same screen, same four causes, and an inline error would be a
 * fifth answer that told a guesser their code was the right shape.
 *
 * THE FULL BOARD (`claim-typing`) draws two boxes of THREE and says "Six
 * characters". That is the owner's six-character code, which is a server
 * change and a security decision (`new_invite_code`, 0007; 0009 rests on the
 * ten), not this screen's — so the boxes keep five each and the line keeps
 * "Ten". Its "Scan the QR code" is not built either: the app has no scanner,
 * and the board flags it as draft that needs one. Check the code is the bar,
 * faint until all ten are in.
 */
function Typing({
  code,
  setCode,
  onCheck,
}: {
  code: string;
  setCode: (v: string) => void;
  onCheck: () => void;
}) {
  const t = useTheme();
  // The instance type, not the component: React Native 0.88 (SDK 58) stopped
  // accepting the class as a ref type.
  const second = useRef<TextInputInstance>(null);
  const [focus, setFocus] = useState<0 | 1 | 2>(1);

  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const first = code.slice(0, 5);
  const rest = code.slice(5, 10);

  const box = (which: 1 | 2) => [
    styles.field,
    {
      backgroundColor: t.surface,
      borderColor: focus === which ? t.text : t.outline,
      color: t.text,
    },
    focus === which && styles.fieldFocused,
  ];

  return (
    <Standalone
      title="Type your invite code"
      bar={[{ label: 'Check the code', onPress: onCheck, disabled: code.length !== 10 }]}
    >
      <Body>Ten characters, from the invite.</Body>

      <View style={styles.fields}>
        <TextInput
          style={box(1)}
          value={first}
          onChangeText={(v) => {
            const next = clean(v).slice(0, 5) + rest;
            setCode(next);
            if (clean(v).length >= 5) second.current?.focus();
          }}
          onFocus={() => setFocus(1)}
          onBlur={() => setFocus(0)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          autoFocus
          accessibilityLabel="First five characters"
        />
        <Text style={[styles.dash, { color: t.muted }]}>–</Text>
        <TextInput
          ref={second}
          style={box(2)}
          value={rest}
          onChangeText={(v) => setCode(first + clean(v).slice(0, 5))}
          onFocus={() => setFocus(2)}
          onBlur={() => setFocus(0)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          accessibilityLabel="Last five characters"
        />
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        Letters and numbers. No I, O, 0 or 1 — they are not in the alphabet a code is drawn from.
      </Text>
    </Standalone>
  );
}

/**
 * The frame the states share.
 *
 * STANDALONE: a link lands here cold, so there is NO BACK AND NO CLOSE — and
 * adding either would be telling a person there is somewhere to go back to
 * when there is not. On the full board that is an ink top with the title and
 * nothing else on it, the sheet under it, and the bar when a state has a
 * primary: `Screen` with no `backTo`.
 */
function Standalone({
  title,
  bar,
  children,
}: {
  title: string;
  bar?: BarAction[];
  children: React.ReactNode;
}) {
  return (
    <Screen title={title} bar={bar} scroll={false}>
      <View style={styles.page}>{children}</View>
    </Screen>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.body, { color: t.muted }]}>{children}</Text>;
}

/** X2a's hairline: a 2px track with a 38% segment. No spinner. */
function Track() {
  const t = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: t.hairline }]}>
      <View style={[styles.fill, { backgroundColor: t.text }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  /* A pushed screen's content: 18 in from the edges, 12 between. */
  page: { flex: 1, paddingHorizontal: z(18), paddingTop: z(14), gap: z(12) },

  body: { fontSize: z(14.5), fontWeight: '400', lineHeight: z(21) },
  bodyStrong: { fontSize: z(14.5), fontWeight: '700' },
  footnote: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },

  track: { height: 2, borderRadius: 1, overflow: 'hidden' },
  fill: { width: '38%', height: 2, borderRadius: 1 },

  /* Who you are over what you are joining, a hairline between (the board's `claim`). */
  cardName: {
    fontFamily: 'head',
    fontSize: z(22),
    fontWeight: '800',
    letterSpacing: z(-0.44),
    lineHeight: z(25.3),
    paddingTop: z(16),
    paddingBottom: z(12),
    paddingHorizontal: z(4),
    borderBottomWidth: 1,
  },
  cardGroup: { fontSize: z(17), fontWeight: '600', paddingTop: z(12), paddingBottom: z(16), paddingHorizontal: z(4) },

  statements: { marginTop: z(4), gap: z(10) },
  statement: { flexDirection: 'row', alignItems: 'flex-start', gap: z(10) },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: z(8) },
  statementText: { fontSize: z(14.5), fontWeight: '400', lineHeight: z(21), flexShrink: 1 },

  /* The footnote sits at the foot of the sheet, just above the bar. */
  foot: { marginTop: 'auto', paddingBottom: z(14), gap: z(12) },

  fields: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  /* The kit's `.fi` at 62: outlined, a 2 in the text colour on focus. */
  field: {
    flex: 1,
    minWidth: 0,
    height: z(62),
    borderRadius: L.fieldRadius,
    borderWidth: 1.5,
    textAlign: 'center',
    fontFamily: 'head',
    fontSize: z(24),
    fontWeight: '700',
    letterSpacing: z(3.36),
    paddingHorizontal: z(8),
  },
  fieldFocused: { borderWidth: 2 },
  dash: { fontFamily: 'head', fontSize: z(24), fontWeight: '700' },
});
