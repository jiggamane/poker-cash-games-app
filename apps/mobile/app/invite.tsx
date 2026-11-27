import { useCallback, useEffect, useState } from 'react';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Icon, type IconName } from '../src/components/Icon';
import { QrCode } from '../src/components/QrCode';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { L, T, z } from '../src/design/scale';
import { createInvite, inviteLinkFor, revokeInvite, seatStatuses } from '../src/lib/invites';
import { nameOf, useNight } from '../src/lib/nightStore';
import { explainServerError, isSupabaseConfigured } from '../src/lib/supabase';
import { useSession } from '../src/lib/useSession';

/**
 * C3 — inviting a player. Rev 15, `14-invite-and-watcher.md`.
 *
 * A SHEET over Players, and the reset and the QR REPLACE ITS CONTENT rather
 * than opening a second one (S79). Two sheets is the floor of this app's depth
 * and it is reserved for a player sheet raising an amount keypad; a reset
 * warning is the same sheet asking a different question, so it keeps the same
 * close and swiping down leaves the whole thing.
 *
 * THE CODE IS THE HERO because the code is the primitive. C3 draws a link
 * because a link is what a designer draws, but what gets issued is ten
 * characters and the link is one of two ways they can travel — a link is
 * undeliverable in Expo Go and at the mercy of whatever chat app mangles it,
 * and ten characters survive being read down a phone.
 */
export default function Invite() {
  const { player: playerId } = useLocalSearchParams<{ player?: string }>();
  const night = useNight();
  const { who } = useSession();
  /* B91: a session is not an account. A host who has opened somebody's share
     link has one, and the RPC that mints a code refuses it — so the gate below
     asks who rather than whether, and the copy it already had is exactly
     right for both. */
  const signedIn = who.kind === 'person';

  const [stage, setStage] = useState<Stage>('code');
  const [code, setCode] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  const name = nameOf(night, playerId ?? null);

  /**
   * What the server already knows about this seat.
   *
   * Three states, and only the server knows two of them: nobody invited yet,
   * invited and waiting, already claimed. Asking first is what makes C3b and
   * C3e states BEFORE the tap rather than surprises after it.
   */
  const load = useCallback(async () => {
    if (playerId === undefined) return;
    setBusy(true);
    setBlocked(null);
    try {
      const [status] = await seatStatuses([playerId]);
      if (status === undefined) {
        setBlocked('This player has not reached the server yet.');
        return;
      }
      setClaimed(status.claimed);
      setCode(status.liveCode);
      if (!status.claimed && status.liveCode === null) {
        const fresh = await createInvite(playerId);
        setCode(fresh);
      }
    } catch (e) {
      setBlocked(explainServerError(e));
    } finally {
      setBusy(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reset() {
    if (playerId === undefined) return;
    setBusy(true);
    try {
      await revokeInvite(playerId);
      const fresh = await createInvite(playerId);
      setCode(fresh);
      setStage('code');
    } catch (e) {
      setBlocked(explainServerError(e));
    } finally {
      setBusy(false);
    }
  }

  /* C3e · Blocked. States before the tap, not after: where the code would be, a
     dashed placeholder says why there is no code, and the share chips are
     present but disabled — the host sees what WILL be available rather than
     watching controls appear. */
  if (!isSupabaseConfigured || !signedIn || blocked !== null) {
    return (
      <Blocked
        name={name}
        reason={
          !isSupabaseConfigured
            ? 'This build has no server, so there is nothing to make a code on.'
            : !signedIn
              ? 'A code is made on the server, so you have to be signed in to make one.'
              : (blocked ?? '')
        }
        onRetry={() => void load()}
      />
    );
  }

  if (stage === 'reset') {
    return (
      <Reset
        name={name}
        code={code}
        claimed={claimed}
        busy={busy}
        onConfirm={() => void reset()}
        onKeep={() => setStage('code')}
      />
    );
  }

  if (stage === 'qr' && code !== null) {
    return <Qr name={name} code={code} group={night?.groupName ?? null} onBack={() => setStage('code')} />;
  }

  return (
    <Code
      name={name}
      code={code}
      claimed={claimed}
      busy={busy}
      onReset={() => setStage('reset')}
      onQr={() => setStage('qr')}
    />
  );
}

type Stage = 'code' | 'reset' | 'qr';

/**
 * C3a, and C3b when the seat is taken.
 *
 * They are one frame with three differences: a CLAIMED pill after the title,
 * the code dropped to muted, and the share controls in their dead outline. The
 * claim date replaces the binding sentence.
 *
 * THE FULL BOARD (`invite`, approved 22 November) has NO BAR: the sheet's work
 * is the share controls, and its only button, "Reset the code", is a secondary
 * — quiet words at the foot. The code is a lifted card: whose code it is, how
 * long it lasts, and the characters as tiles in two groups.
 */
function Code({
  name,
  code,
  claimed,
  busy,
  onReset,
  onQr,
}: {
  name: string;
  code: string | null;
  claimed: boolean;
  busy: boolean;
  onReset: () => void;
  onQr: () => void;
}) {
  const t = useTheme();

  const share = async (mode: 'copy' | 'message' | 'share') => {
    if (code === null) return;
    if (mode === 'copy') {
      await Clipboard.setStringAsync(code);
      return;
    }
    // "Send it" hands over the code AND a deep link together: the code is what
    // survives the channel, the link is what saves ten characters of typing
    // when the channel happens to be kind.
    await Share.share({ message: `${code}\n${inviteLinkFor(code)}` });
  };

  const dead = claimed || code === null;

  return (
    <Sheet title="Invite a player" badge={claimed ? 'Claimed' : undefined} sub={name}>
      <View style={styles.page}>
        <Card pad style={styles.codeCard}>
          <View style={styles.codeHead}>
            <Text style={[T.lookLabel, styles.shrink, { color: t.muted }]} numberOfLines={1}>
              {name.toUpperCase()}’S CODE
            </Text>
            {/*
             * S84, answered: a per-player code lives ONE MONTH. C3a is drawn
             * with the binding sentence and no expiry line, and § 6 says that
             * sentence "gains a clause" if codes do expire. That clause is
             * MINE rather than the designer's — flagged for sign-off with the
             * rest of the proposed copy. The full board (`invite`) moves it out
             * of the sentence into this tag, in its own lower case: the app's
             * words, set where the code is. Not on a claimed seat, whose code
             * is spent.
             */}
            {!claimed && (
              <View style={[styles.tag, { backgroundColor: t.raised }]}>
                <Text style={[styles.tagText, { color: t.muted }]}>works for a month</Text>
              </View>
            )}
          </View>

          {/* Not a field and not tappable text — Copy is a control. */}
          <CodeTiles code={code} muted={claimed || busy} />
        </Card>

        <Text style={[styles.note, { color: t.muted }]}>
          {claimed
            ? `${name} claimed this. It cannot be used again.`
            : `One person, one code — it only ever attaches to ${name}.`}
        </Text>

        <View style={styles.shares}>
          <ShareControl label="Copy" icon="copy" disabled={dead} onPress={() => void share('copy')} />
          <ShareControl label="Message" icon="message" disabled={dead} onPress={() => void share('message')} />
          <ShareControl label="Share" icon="share" disabled={dead} onPress={() => void share('share')} />
        </View>

        {/*
         * The QR as a wide option under the other three (owner, 24 November:
         * "make the QR code option larger"). The board words it "Show the QR
         * code"; the app's label is "QR code" and stays until that wording is
         * signed off.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR code"
          accessibilityState={{ disabled: dead }}
          disabled={dead}
          onPress={onQr}
          style={({ pressed }) => [
            styles.qrWide,
            { borderColor: dead ? t.hairline : t.outline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="qr" color={dead ? t.dim : t.text} size={z(22)} />
          <Text style={[styles.qrWideText, { color: dead ? t.dim : t.text }]}>QR code</Text>
        </Pressable>

        <Quiet label="Reset the code" onPress={onReset} disabled={busy} />

        {/*
         * NOT BUILT, and raised rather than faked — two things C3a draws that
         * have no mechanism behind them:
         *
         *   · THE GROUP LINK. It is a different mechanism from a per-player
         *     code: it creates a member row on join, where a code attaches to
         *     one that already exists. Nothing on the server issues one — 0007
         *     builds per-player invites only — and drawing `pokerclub.app/j/…`
         *     with nothing behind it would be a control that does nothing.
         *     § 6 already lists the arrival half ("the group-wide X2b") as not
         *     drawn, so both ends of it are open.
         *
         *   · ADD BY NAME ONLY. It belongs with the group link: it is the
         *     answer to "I need this person in tonight's ledger now", and it
         *     adds somebody who is NOT the player this sheet is about. Adding a
         *     second person from inside a sheet titled with the first one's
         *     name needs a decision about where it lives.
         */}
      </View>
    </Sheet>
  );
}

/**
 * C3d · The QR.
 *
 * IT REPLACES THE SHEET'S CONTENT — same panel, same close, same margins — and
 * is not a second sheet. Two sheets is the floor of this app's depth and it is
 * reserved for a player sheet raising an amount keypad; a QR is the same invite
 * shown another way, so swiping down leaves the whole sheet rather than peeling
 * off a layer. Back to the invite is a text action, not a chevron — quiet words
 * at the foot on the full board (`invite-qr`), which has no bar.
 *
 * The screen is held awake and turned up while it is shown. Both are undone on
 * the way out — a sheet that permanently brightened somebody's phone would be a
 * worse bug than the one it fixes — and both are best-effort: `expo-brightness`
 * can be refused, and a QR at normal brightness is a QR that usually still
 * scans. Neither failure is worth showing anybody.
 */
function Qr({
  name,
  code,
  group,
  onBack,
}: {
  name: string;
  code: string;
  group: string | null;
  onBack: () => void;
}) {
  const t = useTheme();

  useEffect(() => {
    activateKeepAwakeAsync('invite-qr').catch(() => undefined);
    let restore: number | null = null;
    void Brightness.getBrightnessAsync()
      .then((current) => {
        restore = current;
        return Brightness.setBrightnessAsync(1);
      })
      .catch(() => undefined);

    return () => {
      deactivateKeepAwake('invite-qr');
      if (restore !== null) void Brightness.setBrightnessAsync(restore).catch(() => undefined);
    };
  }, []);

  return (
    <Sheet title="Scan to join" sub={group === null ? name : `${name} · ${group}`} onClose={onBack}>
      <View style={styles.page}>
        {/* Square, the owner's pick (22 November), over the same link as always. */}
        <QrCode value={inviteLinkFor(code)} />

        {/*
         * The ten characters repeat underneath, and they are not decoration: a
         * QR with no typable fallback is a dead end the moment a camera will
         * not read it, and cameras vary more than anybody designing for one
         * expects.
         */}
        <Text style={[styles.qrCode, { color: t.text }]}>{grouped(code)}</Text>
        <Text style={[styles.note, styles.centred, { color: t.muted }]}>
          If the camera will not read it, the code can be typed.
        </Text>
        <Quiet label="Back to the invite" onPress={onBack} />
      </View>
    </Sheet>
  );
}

/**
 * C3c · Reset.
 *
 * Replaces the sheet's content and keeps the same close. The warning states
 * three things IN ORDER: what stops working, that it cannot be undone, and what
 * takes its place — the last one is what stops this reading as a destruction
 * rather than a reissue.
 *
 * No hold-to-confirm — that is reserved for ending a night, and a reissued code
 * costs one message.
 *
 * THE CONFIRM IS QUIET RED TEXT, and the sheet has no bar. This said "OUTLINE
 * and never red: colour is money", while the app drew it with the red
 * destructive variant all along; the full board (`invite-reset`, approved)
 * settles it by its README rule 3 — a destructive action is never the bar, and
 * in the content it is quiet words in red.
 */
function Reset({
  name,
  code,
  claimed,
  busy,
  onConfirm,
  onKeep,
}: {
  name: string;
  code: string | null;
  claimed: boolean;
  busy: boolean;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  const t = useTheme();
  return (
    <Sheet
      title={claimed ? `Give ${name}’s seat a new code?` : 'Reset the code?'}
      sub={name}
      onClose={onKeep}
    >
      <View style={styles.page}>
        {/*
         * S84's second question, answered: Reset works on a claimed seat, and
         * it releases the seat rather than destroying anything. That is a
         * different act from retiring an unspent code, so it gets its own copy
         * — § 6 asks for exactly this. Both sets are MINE and want sign-off.
         *
         * The order is the same in both: what stops working, whether it can be
         * undone, and what takes its place. The claimed version adds the one
         * sentence a host actually needs, which is what does NOT happen.
         */}
        {claimed ? (
          <>
            <Text style={[styles.lede, { color: t.text }]}>
              {name} stops being able to open the book on their phone, until they use the new code.
            </Text>
            <Text style={[styles.note, { color: t.muted }]}>
              Nothing they have played is affected. Every night, every buy-in and every settlement
              stays on {name}’s name in this book — those belong to the seat, not to the phone.
            </Text>
            <Text style={[styles.note, { color: t.muted }]}>
              A new ten-character code takes its place. Whoever opens it takes the seat.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.lede, { color: t.text }]}>
              The code you already sent stops working. Anyone holding it sees nothing, and it cannot
              be undone.
            </Text>
            <Text style={[styles.note, { color: t.muted }]}>
              A new ten-character code takes its place, bound to {name} in the same way.
            </Text>
          </>
        )}

        {/* Shown struck through, so the host can check they are killing the
            code they think they are. */}
        <View style={styles.dying}>
          <Text style={[styles.dyingCode, { color: t.muted }]}>
            {code === null ? '—' : grouped(code)}
          </Text>
          <View style={[styles.dyingTag, { borderColor: t.hairline }]}>
            <Text style={[styles.dyingTagText, { color: t.muted }]}>
              {claimed ? 'ALREADY USED' : 'DIES ON RESET'}
            </Text>
          </View>
        </View>

        <Quiet label="Reset the code" red onPress={onConfirm} disabled={busy} />
        <Quiet label="Keep the current code" onPress={onKeep} />
      </View>
    </Sheet>
  );
}

/**
 * C3e · Blocked. Offline, signed out, or a player the server has never met.
 *
 * No bar on the full board (`invite-blocked`): "Try again" is the app's
 * secondary, so it is the outlined button in the content, under the reason.
 */
function Blocked({
  name,
  reason,
  onRetry,
}: {
  name: string;
  reason: string;
  onRetry: () => void;
}) {
  const t = useTheme();
  return (
    <Sheet title="Invite a player" badge="Offline" sub={name}>
      <View style={styles.page}>
        <View style={[styles.placeholder, { borderColor: t.outline }]}>
          <Text style={[T.lookLabel, { color: t.muted }]}>NO CODE YET</Text>
          <Text style={[styles.note, styles.centred, { color: t.muted }]}>{reason}</Text>
        </View>

        <View style={styles.shares}>
          <ShareControl label="Copy" icon="copy" disabled />
          <ShareControl label="Message" icon="message" disabled />
          <ShareControl label="Share" icon="share" disabled />
        </View>

        <Text style={[styles.note, { color: t.muted }]}>
          Adding by name still works offline — it is the invite that cannot.
        </Text>

        <Button label="Try again" variant="secondary" onPress={onRetry} />
      </View>
    </Sheet>
  );
}

/**
 * The code as tiles: each character on its own raised tile, the two groups of
 * five apart with a dash between, which is how it gets read down a phone.
 *
 * THE BOARD DRAWS SIX ("K7M-4XP", two groups of three) and the server issues
 * ten. The length is the server's and a security decision (`new_invite_code`,
 * 0007; 0009's anti-enumeration rests on it), not this screen's, so the tiles
 * draw whatever the code is — ten, in the board's card style. The tiles share
 * the card's width rather than taking the board's 32 points each, which ten of
 * would not fit.
 */
function CodeTiles({ code, muted }: { code: string | null; muted: boolean }) {
  const t = useTheme();
  const chars = code === null ? Array.from({ length: 10 }, () => '·') : [...code];
  const half = Math.ceil(chars.length / 2);
  const tile = (c: string, i: number) => (
    <View key={i} style={[styles.tile, { backgroundColor: t.raised }]}>
      <Text style={[styles.tileText, { color: muted || code === null ? t.muted : t.text }]}>{c}</Text>
    </View>
  );
  return (
    <View
      style={styles.tiles}
      accessible
      accessibilityLabel={code === null ? 'No code yet' : grouped(code)}
    >
      {chars.slice(0, half).map(tile)}
      <Text style={[styles.tileDash, { color: t.muted }]}>–</Text>
      {chars.slice(half).map((c, i) => tile(c, i + half))}
    </View>
  );
}

/** One of the share controls: icon over word, outlined; dead when there is no code to send. */
function ShareControl({
  label,
  icon,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: IconName;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.share,
        { borderColor: disabled ? t.hairline : t.outline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={disabled ? t.dim : t.text} size={z(18)} />
      <Text style={[styles.shareLabel, { color: disabled ? t.dim : t.text }]}>{label}</Text>
    </Pressable>
  );
}

/** The kit's `quiet()`: words with no box, muted — or red, for the destructive one. */
function Quiet({
  label,
  onPress,
  disabled = false,
  red = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  red?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quiet, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.quietText, { color: red ? t.red : t.muted }]}>{label}</Text>
    </Pressable>
  );
}

/** "K7M4X P29QT" — two groups of five, which is how it gets read down a phone. */
const grouped = (code: string): string => `${code.slice(0, 5)} ${code.slice(5)}`;

const styles = StyleSheet.create({
  /* Sheet content, as on every converted sheet; the extra foot clears the home indicator, as the board's 6. */
  page: { paddingHorizontal: z(20), gap: z(12), paddingBottom: z(6) },

  lede: { fontSize: z(15), fontWeight: '400', lineHeight: z(21.75) },
  note: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
  centred: { textAlign: 'center' },
  shrink: { flexShrink: 1 },

  /* The code card (the board's `codeCard`): 14 / 14 / 16, 14 between its two rows. */
  codeCard: { paddingTop: z(14), paddingHorizontal: z(14), paddingBottom: z(16), gap: z(14) },
  codeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: z(8) },
  tag: { borderRadius: 999, paddingVertical: z(5), paddingHorizontal: z(9) },
  tagText: { fontSize: z(11.5), fontWeight: '600', lineHeight: z(13) },
  tiles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(4) },
  tile: {
    flex: 1,
    maxWidth: z(32),
    height: z(40),
    borderRadius: z(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontFamily: 'head', fontSize: z(19), fontWeight: '800', lineHeight: z(22) },
  tileDash: { fontFamily: 'head', fontSize: z(18), fontWeight: '700', width: z(10), textAlign: 'center' },

  /* The board's `shareRow`: three equal outlined controls, icon over word. */
  shares: { flexDirection: 'row', gap: z(8) },
  share: {
    flex: 1,
    alignItems: 'center',
    gap: z(6),
    paddingVertical: z(11),
    borderRadius: L.chipRadius,
    borderWidth: 1.5,
  },
  shareLabel: { fontSize: z(11.5), fontWeight: '600', lineHeight: z(13) },

  /* The board's `qrWide`: 56 tall, the icon at 22, the words in the head face. */
  qrWide: {
    height: z(56),
    borderRadius: L.chipRadius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(10),
  },
  qrWideText: { fontFamily: 'head', fontSize: z(15), fontWeight: '700' },

  quiet: { minHeight: z(40), alignItems: 'center', justifyContent: 'center' },
  quietText: { fontSize: z(14), fontWeight: '600' },

  qrCode: {
    fontFamily: 'head',
    fontSize: z(17),
    fontWeight: '700',
    letterSpacing: z(0.85),
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  dying: { alignItems: 'center', gap: z(8), marginVertical: z(6) },
  dyingCode: {
    fontFamily: 'head',
    fontSize: z(22),
    fontWeight: '800',
    letterSpacing: z(1.1),
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  dyingTag: { borderWidth: 1, borderRadius: z(7), paddingVertical: z(5), paddingHorizontal: z(8) },
  dyingTagText: { fontSize: z(10.5), fontWeight: '700', letterSpacing: z(1.05) },

  /* Where the code would be: dashed, which always means "not set yet". */
  placeholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: L.cardRadius,
    padding: z(18),
    gap: z(8),
    alignItems: 'center',
  },
});
