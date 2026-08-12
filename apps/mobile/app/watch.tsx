import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, type LedgerEntry } from '@poker-club/core';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { loadEntries, watchEntries } from '../src/lib/ledgerRepo';
import { openShareLink } from '../src/lib/shareLink';
import { isSupabaseConfigured, supabase, watchedSessionId } from '../src/lib/supabase';

/**
 * The watcher's view of a night.
 *
 * Everything on this screen arrives from the server, and the server hands it
 * over on the strength of one claim inside this device's token. There is no
 * check in this file about what may be read, and there must never be one: if
 * the policies are wrong, the correct outcome is an empty screen, not a screen
 * that fills itself in from a client-side rule about who counts as a watcher.
 *
 * It is deliberately plain. The designed watcher screen is X1 on the
 * After-the-night board and a later piece of work; what this proves is the
 * mechanism — link in, rows out, live.
 *
 * Rev 9 classifies X1 as a ROOT, "for a watcher's install" — the home screen of
 * a phone that only ever watches. This is a push instead, because the app has
 * no notion yet of an install that belongs to a watcher rather than a host, and
 * inventing one to satisfy the chrome would be the tail wagging the dog. It
 * becomes a root when that distinction is real.
 */
export default function Watch() {
  const t = useTheme();
  const { t: token } = useLocalSearchParams<{ t?: string }>();

  const [state, setState] = useState<'opening' | 'watching' | 'refused'>('opening');
  const [message, setMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const open = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState('refused');
      setMessage('This build has no Supabase project configured, so there is nothing to watch.');
      return;
    }

    try {
      // A fresh link is redeemed; without one we fall back to the last night
      // this device was let into, which is what makes the app re-openable
      // rather than only tappable-into.
      const id = token !== undefined ? await openShareLink(token) : await watchedSessionId();
      if (id === null) {
        setState('refused');
        setMessage('Open the link the host sent you, and this will show the night it points at.');
        return;
      }

      setSessionId(id);
      setNames(await loadNames());
      setEntries(await loadEntries(id));
      setState('watching');
    } catch (e) {
      setState('refused');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [token]);

  useEffect(() => {
    void open();
  }, [open]);

  // Live from here on. The subscription is authorized by the same claim as the
  // read above — which is the reason the grant lives in the token rather than
  // in a header, because a header would have carried the read and not this.
  useEffect(() => {
    if (sessionId === null || state !== 'watching') return;
    return watchEntries(sessionId, (entry) => {
      setEntries((current) =>
        current.some((e) => e.id === entry.id) ? current : [...current, entry],
      );
    });
  }, [sessionId, state]);

  if (state !== 'watching') {
    return (
      <Screen title={state === 'opening' ? 'Opening…' : 'Nothing to watch'} backTo="The group">
        <View style={styles.page}>
          <Text style={[styles.body, { color: t.muted }]}>
            {state === 'opening' ? 'Checking the link.' : message}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="The night"
      backTo="The group"
      lede="You are watching. Only the host can record anything."
    >
      <View style={styles.page}>
        {entries.length === 0 ? (
          <Text style={[styles.body, { color: t.muted }]}>
            Nothing has happened yet. It will appear here as it does.
          </Text>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={[styles.row, { borderBottomColor: t.hairline }]}>
              <Text style={[styles.name, { color: t.text }]}>
                {names.get(entry.playerId ?? '') ?? 'Someone'}
              </Text>
              <Text style={[styles.what, { color: t.muted }]}>{entry.type}</Text>
              <Text style={[styles.amount, { color: t.text }]}>{formatMoney(entry.amount)}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

/**
 * The names behind the ids in the ledger.
 *
 * No filter and no session id: the policies return the players of the watched
 * book and nothing else, so asking for "all players" is already asking for the
 * right ones. A filter here would only be a second, weaker copy of a rule the
 * database is already applying.
 */
async function loadNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('player').select('id, display_name');
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id as string, p.display_name as string]));
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page },
  body: { ...type.body, fontWeight: '400', lineHeight: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: type.rowName,
  what: { ...type.meta, marginLeft: 'auto' },
  amount: { ...type.rowName, fontVariant: ['tabular-nums'] },
});
