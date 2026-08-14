import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { previewInvite, redeemInvite, type InvitePreview } from '../src/lib/invites';
import { pullBooks } from '../src/lib/pull';
import { isSupabaseConfigured } from '../src/lib/supabase';

/**
 * X2 — claiming your place. Rev 15, `14-invite-and-watcher.md`.
 *
 * STANDALONE, NO CHROME. It arrives from a link, the reader has not been
 * anywhere, and there is nothing to go back to: no chevron, no grabber, and
 * deliberately no close. That classification is unchanged by S77 — only X1
 * moved.
 *
 * Four states, one screen:
 *
 *   X2a  checking      a 2px hairline, no spinner glyph, held 400ms minimum
 *   X2b  ready         whose place it is, and what they are joining
 *   X2c  dead          one string for four causes — see below
 *   X2d  typing        ten characters, because a link cannot always arrive
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
    } catch {
      /*
       * A network failure is NOT a dead code, and X2a says so by staying: § 4
       * is explicit that this screen "only becomes X2c when the server has
       * actually spoken". Retried behind the same frame.
       */
      await floor;
      setStage('dead');
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
    } catch {
      // Spent between the preview and the tap, or taken by somebody else. Same
      // screen as every other way a code can be dead.
      setStage('dead');
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
  if (stage === 'dead') return <Dead onType={() => setStage('typing')} />;
  if (stage === 'typing') {
    return <Typing code={code} setCode={setCode} onCheck={() => void check(code)} />;
  }
  return <Ready preview={preview!} busy={claiming} onClaim={() => void claim()} />;
}

type Stage = 'checking' | 'ready' | 'dead' | 'typing';

/** X2a. A 2px hairline with a 38% segment — no spinner glyph, no logo. */
function Checking() {
  const t = useTheme();
  return (
    <Standalone title="Checking your invite">
      <Body>This takes a second.</Body>
      <View style={[styles.track, { backgroundColor: t.hairline }]}>
        <View style={[styles.fill, { backgroundColor: t.text }]} />
      </View>
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
 * The one control is SECONDARY. There is no primary act available here, and a
 * filled button would imply there is.
 */
function Dead({ onType }: { onType: () => void }) {
  return (
    <Standalone title="This invite can’t be used" centred>
      <Body>Ask whoever invited you for a new link.</Body>
      <View style={styles.deadAction}>
        <Button label="Type a code instead" variant="secondary" onPress={onType} />
      </View>
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
    <Standalone title="Claim your place">
      {preview.hostName !== null && (
        <Text style={[styles.body, { color: t.muted }]}>
          {preview.hostName} added you as{' '}
          <Text style={[styles.bodyStrong, { color: t.text }]}>{preview.playerName}</Text>
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.cardName, { color: t.text }]}>{preview.playerName}</Text>
        <View style={[styles.cardRule, { backgroundColor: t.hairline }]} />
        <Text style={[styles.cardGroup, { color: t.text }]}>{preview.groupName}</Text>
      </View>

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

      <View style={styles.readyAction}>
        {/*
         * Claiming keeps the label and drops to .55 with a hairline under it.
         * Never a full-screen spinner: the card behind it is the thing being
         * confirmed, and covering it would hide the answer to "is this me".
         */}
        <View style={busy ? styles.busy : undefined}>
          <Button label="Claim your place" variant="primary" onPress={onClaim} disabled={busy} />
        </View>
        {busy && (
          <View style={[styles.track, { backgroundColor: t.hairline }]}>
            <View style={[styles.fill, { backgroundColor: t.text }]} />
          </View>
        )}
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
  const second = useRef<TextInput>(null);

  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const first = code.slice(0, 5);
  const rest = code.slice(5, 10);

  return (
    <Standalone title="Type your invite code">
      <Body>Ten characters, from the invite.</Body>

      <View style={styles.fields}>
        <TextInput
          style={[styles.field, { backgroundColor: t.surface, borderColor: t.hairline, color: t.text }]}
          value={first}
          onChangeText={(v) => {
            const next = clean(v).slice(0, 5) + rest;
            setCode(next);
            if (clean(v).length >= 5) second.current?.focus();
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          autoFocus
          accessibilityLabel="First five characters"
        />
        <TextInput
          ref={second}
          style={[styles.field, { backgroundColor: t.surface, borderColor: t.text, color: t.text }]}
          value={rest}
          onChangeText={(v) => setCode(first + clean(v).slice(0, 5))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          accessibilityLabel="Last five characters"
        />
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        Letters and numbers. No I, O, 0 or 1 — they are not in the alphabet a code is drawn from.
      </Text>

      <View style={styles.readyAction}>
        <Button
          label="Check the code"
          variant={code.length === 10 ? 'primary' : 'blocked'}
          disabled={code.length !== 10}
          onPress={onCheck}
        />
      </View>
    </Standalone>
  );
}

/**
 * The container the four states share.
 *
 * A bare safe area and nothing else — this is the one screen in the app with no
 * chrome of either kind, and adding a close or a chevron here would be telling
 * a person there is somewhere to go back to when there is not.
 */
function Standalone({
  title,
  centred = false,
  children,
}: {
  title: string;
  centred?: boolean;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={[styles.page, centred && styles.centred]}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.body, { color: t.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 22, paddingTop: 28, gap: 14 },
  /* X2c has no chrome above it to hang from, so it centres with a 40px lift. */
  centred: { justifyContent: 'center', paddingBottom: 60 },

  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31.8 },
  body: { fontSize: 14.5, fontWeight: '400', lineHeight: 21.75 },
  bodyStrong: { fontSize: 14.5, fontWeight: '700' },
  footnote: { ...type.footnote },

  track: { height: 2, borderRadius: 1, overflow: 'hidden', marginTop: 8 },
  fill: { width: '38%', height: 2, borderRadius: 1 },

  deadAction: { marginTop: 10 },

  card: {
    marginTop: 6,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.55 },
  cardRule: { height: StyleSheet.hairlineWidth },
  cardGroup: { fontSize: 17, fontWeight: '600' },

  statements: { marginTop: 6, gap: 10 },
  statement: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8 },
  statementText: { fontSize: 14.5, fontWeight: '400', lineHeight: 21, flexShrink: 1 },

  readyAction: { marginTop: 'auto', paddingBottom: 6, gap: 12 },
  busy: { opacity: 0.55 },

  fields: { flexDirection: 'row', gap: 10, marginTop: 6 },
  field: {
    flex: 1,
    height: 62,
    borderRadius: 8,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3.36,
    paddingHorizontal: space.rowInset,
  },
});
