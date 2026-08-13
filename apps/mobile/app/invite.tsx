import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { roster, type Person } from '../src/lib/nightStore';
import { createInvite, inviteLinkFor, revokeInvite, seatStatuses } from '../src/lib/invites';
import { explainServerError, isSupabaseConfigured, supabase } from '../src/lib/supabase';

/**
 * C3 · Invite a player — a sheet over the roster.
 *
 * THE CODE IS THE INVITE, and the link is a wrapper around it. C3 draws a URL
 * because a URL is what a designer draws; ten characters is what actually
 * arrives. A link cannot be relied on during development (it points at a laptop
 * on somebody's wifi) and is at the mercy of whatever chat app mangles it
 * afterwards, whereas a code can be read down a phone or written on a beer mat.
 * Both are offered — Send hands over the link and the code together — but what
 * the screen shows large is the code.
 *
 * The invite belongs to ONE NAME. Whoever spends it becomes the person that
 * name already described, with their nights and their net already behind them.
 * That is the whole of what it does: it grants reading the group's book and
 * nothing else, because only the host ever writes.
 */
export default function Invite() {
  const t = useTheme();
  const { p: playerId } = useLocalSearchParams<{ p?: string }>();

  const [person, setPerson] = useState<Person | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * An invite is the one thing here that is not a local fact.
   *
   * A code is issued by the database, to a host it recognises, for a member row
   * it already holds — so unlike every other screen in the app this one cannot
   * work offline or signed out, and `blocked` is the honest version of that. It
   * is checked BEFORE the request rather than after, because "you are not
   * signed in" is a sentence with an action in it and whatever the server says
   * to an unauthenticated stranger is not.
   */
  const [blocked, setBlocked] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (playerId === undefined) return;

    const found = (await roster()).find((r) => r.id === playerId) ?? null;
    setPerson(found);

    if (!isSupabaseConfigured) {
      setBlocked(
        'This build has no server, and a code has to be issued by one. Settings → Connection says what is missing.',
      );
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session === null) {
      setBlocked(
        'Only a signed-in host can hand out a place. Sign in from Settings and come back — nothing recorded tonight is affected.',
      );
      return;
    }

    setBlocked(null);
    try {
      const [seat] = await seatStatuses([playerId]);
      setClaimed(seat?.claimed ?? false);
      setCode(seat?.liveCode ?? null);
    } catch (e) {
      setError(message(e));
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Issue one, or issue a fresh one — the same call, and the old one dies. */
  async function issue() {
    if (playerId === undefined || busy) return;
    setBusy(true);
    setError(null);
    try {
      setCode(await createInvite(playerId));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (playerId === undefined || busy) return;
    setBusy(true);
    setError(null);
    try {
      await revokeInvite(playerId);
      setCode(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Hand it over, both ways at once.
   *
   * The code first and the link second, because the code is the thing that
   * always works — somebody reading this in a chat can type ten characters even
   * if the link is dead, and on a phone with the app installed the link saves
   * them the typing.
   */
  async function send() {
    if (code === null || person === null) return;
    await Share.share({
      message: `${person.name} — your place in the poker club.\n\nCode: ${code}\n${inviteLinkFor(code)}`,
    });
  }

  const name = person?.name ?? 'this player';

  return (
    <Sheet
      title={claimed ? name : `Invite ${name}`}
      sub={
        claimed
          ? 'Somebody is already behind this name.'
          : 'The code belongs to this name. Whoever uses it becomes them.'
      }
      footer={
        blocked !== null ? (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        ) : claimed ? (
          <Button label="Done" variant="primary" onPress={() => router.back()} />
        ) : code === null ? (
          <Button
            label={busy ? 'Making a code…' : 'Make a code'}
            variant="primary"
            disabled={busy || playerId === undefined}
            onPress={() => void issue()}
          />
        ) : (
          <>
            <Button label="Send it" variant="primary" onPress={() => void send()} />
            <View style={styles.pair}>
              <Button
                label={busy ? 'Working…' : 'New code'}
                variant="secondary"
                disabled={busy}
                onPress={() => void issue()}
                style={styles.half}
              />
              <Button
                label="Cancel it"
                variant="destructive"
                disabled={busy}
                onPress={() => void revoke()}
                style={styles.half}
              />
            </View>
          </>
        )
      }
    >
      <View style={styles.page}>
        {/* Who this is about, drawn once and large. A host with six similar
            names in a chat needs to be certain which seat they are handing
            over before they hand it over. */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Avatar name={name} />
          <View style={styles.cardText}>
            <Text style={[styles.cardName, { color: t.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.cardSub, { color: t.muted }]} numberOfLines={1}>
              {person === null
                ? '—'
                : `${person.nights} ${person.nights === 1 ? 'night' : 'nights'} · in the group since ${month(person.since)}`}
            </Text>
          </View>
        </View>

        {blocked !== null ? (
          <Text style={[styles.note, { color: t.muted }]}>{blocked}</Text>
        ) : claimed ? (
          <Text style={[styles.note, { color: t.muted }]}>
            {name} has claimed this place, so they can read the group&rsquo;s book on their own
            phone. Nothing else changed: their nights, their net and everything they play from here
            are recorded by you, exactly as before.
          </Text>
        ) : code === null ? (
          <Text style={[styles.note, { color: t.muted }]}>
            A code is ten characters, works once, and expires in seven days. Read it out at the
            table or send it — either way {name} lands on their own name with every night they have
            played already there.
          </Text>
        ) : (
          <>
            <Text style={[styles.label, { color: t.muted }]}>{name}&rsquo;s code</Text>

            {/* Drawn to be READ ALOUD: wide tracking, one weight, no
                punctuation. The alphabet has no 0/O, 1/I/L or U in it for the
                same reason. */}
            <View style={[styles.codeBox, { backgroundColor: t.surface, borderColor: t.hairline }]}>
              <Text style={[styles.code, { color: t.text }]} selectable>
                {code}
              </Text>
            </View>

            <Text style={[styles.note, { color: t.muted }]}>
              Works once · seven days · make a new one any time, which kills this one. Only one code
              per person is ever live, so a group chat can never hold two.
            </Text>
          </>
        )}

        {error !== null && <Text style={[styles.note, { color: t.loss }]}>{error}</Text>}
      </View>
    </Sheet>
  );
}

/**
 * What went wrong, in the host's language.
 *
 * The database says "No such player." when a player has not reached the server
 * — which for a host means one thing only, and it is not a missing person.
 * Everything else goes through `explainServerError`, which is what keeps a
 * sentence about the build's API key off a sheet about inviting somebody.
 */
function message(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (raw.includes('No such player')) {
    return 'This player has not reached the server yet. Sign in, let the night send, and try again.';
  }
  return explainServerError(e);
}

const month = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long' });

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    marginBottom: 18,
  },
  cardText: { gap: 3, flexShrink: 1 },
  cardName: { fontSize: 19, fontWeight: '700' },
  cardSub: type.meta,

  label: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 8 },
  codeBox: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    marginBottom: 14,
  },
  code: { fontSize: 27, fontWeight: '800', letterSpacing: 3.5, fontVariant: ['tabular-nums'] },

  note: { ...type.footnote, paddingHorizontal: 4 },

  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
