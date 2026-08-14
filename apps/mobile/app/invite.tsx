import { useCallback, useEffect, useState } from 'react';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../src/components/Button';
import { Icon, type IconName } from '../src/components/Icon';
import { QrCode } from '../src/components/QrCode';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
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
  const { session } = useSession();

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
  if (!isSupabaseConfigured || session === null || blocked !== null) {
    return (
      <Blocked
        name={name}
        reason={
          !isSupabaseConfigured
            ? 'This build has no server, so there is nothing to make a code on.'
            : session === null
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
 * the code dropped to muted, and the share chips in their disabled outline. The
 * claim date replaces the binding sentence.
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

  return (
    <Sheet
      title="Invite a player"
      badge={claimed ? 'Claimed' : undefined}
      sub={name}
      footer={
        <Button
          label={claimed ? 'Reset the code' : 'Reset the code'}
          variant="secondary"
          onPress={onReset}
          disabled={busy}
        />
      }
    >
      <View style={styles.page}>
        <Text style={[styles.eyebrow, { color: t.muted }]}>{name.toUpperCase()}’S CODE</Text>

        {/* Not a field and not tappable text — Copy is a control. */}
        <Text
          selectable
          style={[styles.hero, { color: claimed || busy ? t.muted : t.text }]}
        >
          {code === null ? '· · · · ·  · · · · ·' : grouped(code)}
        </Text>

        <Text style={[styles.note, { color: t.muted }]}>
          {claimed
            ? `${name} claimed this. It cannot be used again.`
            : /*
               * S84, answered: a per-player code lives ONE MONTH. C3a is drawn
               * with the binding sentence and no expiry line, and § 6 says that
               * sentence "gains a clause" if codes do expire. This is that
               * clause, and it is MINE rather than the designer's — flagged for
               * sign-off with the rest of the proposed copy.
               */
              `One person, one code — it only ever attaches to ${name}. It works for a month.`}
        </Text>

        <View style={styles.chips}>
          <Chip label="Copy" icon="copy" disabled={claimed || code === null} onPress={() => void share('copy')} />
          <Chip label="Message" icon="message" disabled={claimed || code === null} onPress={() => void share('message')} />
          <Chip label="Share" icon="share" disabled={claimed || code === null} onPress={() => void share('share')} />
          <Chip label="QR code" icon="qr" disabled={claimed || code === null} onPress={onQr} />
        </View>

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
 * off a layer. Back to the invite is a text action, not a chevron.
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
    <Sheet
      title="Scan to join"
      sub={group === null ? name : `${name} · ${group}`}
      onClose={onBack}
      footer={<Button label="Back to the invite" variant="text" onPress={onBack} />}
    >
      <View style={styles.page}>
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
 * Confirm is OUTLINE and never red: colour is money in this app. And no
 * hold-to-confirm — that is reserved for ending a night, and a reissued code
 * costs one message.
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
      footer={
        <>
          <Button label="Reset the code" variant="destructive" onPress={onConfirm} disabled={busy} />
          <Button label="Keep the current code" variant="text" onPress={onKeep} />
        </>
      }
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
            <Text style={[styles.warning, { color: t.text }]}>
              {name} stops being able to open the book on their phone, until they use the new code.
            </Text>
            <Text style={[styles.warning, { color: t.muted }]}>
              Nothing they have played is affected. Every night, every buy-in and every settlement
              stays on {name}’s name in this book — those belong to the seat, not to the phone.
            </Text>
            <Text style={[styles.warning, { color: t.muted }]}>
              A new ten-character code takes its place. Whoever opens it takes the seat.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.warning, { color: t.text }]}>
              The code you already sent stops working. Anyone holding it sees nothing, and it cannot
              be undone.
            </Text>
            <Text style={[styles.warning, { color: t.muted }]}>
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
      </View>
    </Sheet>
  );
}

/** C3e · Blocked. Offline, signed out, or a player the server has never met. */
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
    <Sheet
      title="Invite a player"
      badge="Offline"
      sub={name}
      footer={<Button label="Try again" variant="secondary" onPress={onRetry} />}
    >
      <View style={styles.page}>
        <View style={[styles.placeholder, { borderColor: t.dashed }]}>
          <Text style={[styles.eyebrow, { color: t.muted }]}>NO CODE YET</Text>
          <Text style={[styles.note, { color: t.muted }]}>{reason}</Text>
        </View>

        <View style={styles.chips}>
          <Chip label="Copy" icon="copy" disabled />
          <Chip label="Message" icon="message" disabled />
          <Chip label="Share" icon="share" disabled />
        </View>

        <Text style={[styles.note, { color: t.muted }]}>
          Adding by name still works offline — it is the invite that cannot.
        </Text>
      </View>
    </Sheet>
  );
}

function Chip({
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
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: disabled ? t.hairline : t.quietOutline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={disabled ? t.dim : t.text} size={18} />
      <Text style={[styles.chipLabel, { color: disabled ? t.dim : t.text }]}>{label}</Text>
    </Pressable>
  );
}

/** "K7M4X P29QT" — two groups of five, which is how it gets read down a phone. */
const grouped = (code: string): string => `${code.slice(0, 5)} ${code.slice(5)}`;

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page, gap: 12 },

  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  hero: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.7,
    textAlign: 'center',
    paddingVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  note: { ...type.footnote },

  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 11.5, fontWeight: '600' },

  qrCode: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.85,
    textAlign: 'center',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  centred: { textAlign: 'center' },

  warning: { fontSize: 14.5, fontWeight: '400', lineHeight: 21.75 },
  dying: { alignItems: 'center', gap: 8, marginTop: 8 },
  dyingCode: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.1,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  dyingTag: { borderWidth: 1, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 8 },
  dyingTagText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },

  placeholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 8,
    alignItems: 'center',
  },
});
