import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Sheet } from '../src/components/Sheet';
import { Button } from '../src/components/Button';
import { HoldButton } from '../src/components/HoldButton';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/design/useTheme';
import { type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';
import { whoIs } from '../src/lib/who';
import { readBackup } from '../src/lib/nightStore';
import { myPlan, planLine } from '../src/lib/plan';
import { deleteMyAccount, forgetThisPhone, readDeletionPlan } from '../src/lib/account';
import {
  groupLine,
  hostSeatLine,
  memberSeatLine,
  planEndsLine,
  readingOf,
  seatTitle,
  startedAt,
  type DeletionPlan,
} from '../src/lib/accountWords';

/**
 * Deleting an account — S2–S8 of `design/handoff-account-and-names/`, approved
 * by the owner on 9 November. Chrome B, one sheet, content replaced per state.
 *
 * THE PERSON LEAVES; THE RECORD STAYS (0024). The sheet reads the server's
 * plan first and says, group by group and seat by seat, what the hold will do
 * — and the hold does exactly that plan, because `delete_my_account` carries
 * out the same answer `account_deletion_plan` gives.
 *
 * The hold is the dock's End row, the one destructive hold in the app
 * (`HoldButton` `danger`). There is no tap path to deleting, anywhere.
 */
type State =
  | { at: 'reading' }
  | { at: 'plan'; plan: DeletionPlan }
  | { at: 'refused'; plan: DeletionPlan }
  | { at: 'working' }
  | { at: 'done' }
  /* `reading` is a failure to read the plan: nothing was shown, so nothing may
     be held — its Try again reads the plan again. `deleting` is a failure of
     the delete itself, after the plan was on screen, and S8 holds again. */
  | { at: 'failed'; reason: string | null; during: 'reading' | 'deleting' };

export default function DeleteAccount() {
  const t = useTheme();
  const { session } = useSession();
  const anonymous = whoIs(session).kind === 'anonymous';
  const [state, setState] = useState<State>({ at: 'reading' });
  const [plan, setPlanLine] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function read() {
    setState({ at: 'reading' });
    void readDeletionPlan()
      .then((p) => setState(p.running !== null ? { at: 'refused', plan: p } : { at: 'plan', plan: p }))
      .catch(() => setState({ at: 'failed', reason: null, during: 'reading' }));
  }

  useEffect(() => {
    read();
    if (!anonymous) {
      void myPlan()
        .then((p) => setPlanLine(planLine(p)))
        .catch(() => setPlanLine(null));
    }
    // Read once per opening; the plan does not change while the sheet is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyBackup() {
    try {
      await Clipboard.setStringAsync(JSON.stringify(await readBackup()));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function goAhead() {
    setState({ at: 'working' });
    try {
      const done = await deleteMyAccount();
      if (done.refused === 'game_running') {
        setState({ at: 'refused', plan: done });
        return;
      }
      setState({ at: 'done' });
      await forgetThisPhone();
      // Reached only where the app could not reload itself.
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setState({
        at: 'failed',
        reason: /fetch|network/i.test(message) ? null : message || null,
        during: 'deleting',
      });
    }
  }

  const text = { color: t.text };
  const muted = { color: t.muted };

  if (state.at === 'working' || state.at === 'done') {
    return (
      <Sheet title="Delete your account" onClose={() => {}}>
        <View style={styles.body}>
          <Text style={[styles.lede, text]}>{state.at === 'working' ? 'Deleting…' : 'Done. This phone starts over.'}</Text>
          {state.at === 'working' ? (
            <View style={[styles.track, { backgroundColor: t.surface }]} />
          ) : null}
          {/* ⚠ UNSURE on the board, both. */}
          <Text style={[styles.foot, muted]}>
            {state.at === 'working'
              ? 'Keep the app open. It takes a second or two.'
              : 'Opening as a phone with nothing on it…'}
          </Text>
        </View>
      </Sheet>
    );
  }

  if (state.at === 'failed') {
    return (
      <Sheet
        title="Delete your account"
        footer={
          state.during === 'reading' ? (
            <Button label="Try again" onPress={read} />
          ) : (
            <HoldButton
              variant="danger"
              icon="trash"
              label="Try again"
              sub="Hold 1.5s · deletes now, no undo"
              onComplete={() => void goAhead()}
            />
          )
        }
      >
        <View style={styles.body}>
          <Text style={[styles.lede, text]}>
            {state.reason === null
              ? 'Nothing was deleted. There was no answer from the server.'
              : `Nothing was deleted. ${state.reason}`}
          </Text>
          <Text style={[styles.foot, muted]}>
            Your account, your groups and your seats are exactly as they were. Try again when you have a signal.
          </Text>
        </View>
      </Sheet>
    );
  }

  if (state.at === 'reading') {
    return <Sheet title="Delete your account">{null}</Sheet>;
  }

  if (state.at === 'refused' && state.plan.running !== null) {
    const r = state.plan.running;
    return (
      <Sheet
        title="A game is running"
        footer={
          <Button
            label="Go to tonight"
            onPress={() => {
              router.back();
              router.push('/session');
            }}
          />
        }
      >
        <View style={styles.body}>
          <Text style={[styles.lede, text]}>
            {`${r.group_name} is being recorded on your account. ${startedAt(r.started_at)}`.trim()}
          </Text>
          <Text style={[styles.foot, muted]}>
            Settle it, or take it back and settle it, then come back here. Nothing has been deleted.
          </Text>
        </View>
      </Sheet>
    );
  }

  const p = (state as { plan: DeletionPlan }).plan;
  const reading = readingOf(p, anonymous);

  if (reading === 'watcher') {
    return (
      <Sheet
        title="Remove this phone’s access"
        footer={<HoldButton variant="danger" icon="phoneOff" label="Remove access" sub="Hold 1.5s" onComplete={() => void goAhead()} />}
      >
        <View style={styles.body}>
          <Text style={[styles.lede, text]}>
            This phone stops seeing the night it was shown. The admin can share it again.
          </Text>
        </View>
      </Sheet>
    );
  }

  const ends = planEndsLine(plan);
  const deletesSomething = p.groups.some((g) => g.outcome === 'deleted');
  const hold = (
    <HoldButton
      variant="danger"
      icon="trash"
      label="Delete account"
      sub="Hold 1.5s · deletes now, no undo"
      onComplete={() => void goAhead()}
    />
  );

  return (
    <Sheet
      title="Delete your account"
      footer={
        <View style={styles.footer}>
          {deletesSomething && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void copyBackup()}
              style={({ pressed }) => [styles.backup, { backgroundColor: t.surface, opacity: pressed ? 0.6 : 1 }]}
            >
              <Icon name="clipboard" color={t.text} />
              <View style={styles.backupText}>
                <Text style={[styles.rowName, text]}>{copied ? 'Backup copied' : 'Copy a backup first'}</Text>
                <Text style={[styles.rowSub, muted]}>
                  {copied ? 'Copied · paste it somewhere you keep things' : 'The whole book, as text, on your clipboard'}
                </Text>
              </View>
              <Icon name="chevron" color={t.muted} />
            </Pressable>
          )}
          {hold}
        </View>
      }
    >
      <View style={styles.body}>
        {reading === 'host' && <Text style={[styles.lede, text]}>You leave. The record stays.</Text>}
        {reading === 'member' && <Text style={[styles.lede, text]}>Your seats become names again.</Text>}
        {reading === 'empty' && (
          <>
            <Text style={[styles.lede, text]}>
              Nothing is attached to this account yet — no group to run, no seat in one.
            </Text>
            <Text style={[styles.foot, muted]}>
              Deleting removes your name, your email and your sign-in from the server. Being invited again starts a
              new account.
            </Text>
          </>
        )}

        {p.groups.length > 0 && (
          <List label="Groups you run" rows={p.groups.map((g) => [g.group_name, groupLine(g)])} />
        )}
        {p.seats.length > 0 && (
          <List
            label={reading === 'host' ? 'Your seats elsewhere' : 'Your seats'}
            rows={p.seats.map((s) => [seatTitle(s), reading === 'host' ? hostSeatLine(s) : memberSeatLine(s)])}
          />
        )}

        {reading === 'member' && (
          <>
            <Text style={[styles.foot, muted]}>
              Your name, as each admin added it, and the nights you played stay in their group’s history. They are
              the record of money that changed hands.
            </Text>
            <Text style={[styles.foot, muted]}>This phone loses its nights and stats.</Text>
          </>
        )}

        {ends !== null && <Text style={[styles.foot, muted]}>{ends}</Text>}

        {p.store_subscription && (
          <View style={[styles.store, { borderTopColor: t.hairline }]}>
            <Text style={[styles.foot, muted, styles.storeText]}>
              Deleting doesn’t stop your App Store subscription. Cancel it there first.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openURL(
                  Platform.OS === 'android'
                    ? 'https://play.google.com/store/account/subscriptions'
                    : 'https://apps.apple.com/account/subscriptions',
                )
              }
              style={[styles.manage, { borderColor: t.outline }]}
            >
              <Text style={[styles.manageLabel, text]}>Manage subscription</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Sheet>
  );
}

/** A caps label over name-over-line rows — S2's groups, S3's seats. */
function List({ label, rows }: { label: string; rows: Array<[string, string]> }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[styles.caps, { color: t.muted }]}>{label}</Text>
      {rows.map(([name, line], i) => (
        <View
          key={`${name}-${i}`}
          style={[
            styles.item,
            i < rows.length - 1 && { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[styles.itemName, { color: t.text }]}>{name}</Text>
          <Text style={[styles.itemLine, { color: t.muted }]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  lede: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  foot: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
  caps: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  item: { paddingVertical: 11, gap: 3 },
  itemName: { fontSize: 16.5, fontWeight: '600', lineHeight: 21.5 },
  itemLine: { fontSize: 13, fontWeight: '400', lineHeight: 18.9 },
  track: { height: 4, borderRadius: 2 },
  footer: { gap: 10 },
  backup: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  backupText: { flex: 1, gap: 2 },
  rowName: { fontSize: 16.5, fontWeight: '600' },
  rowSub: { ...type.dockEndSub },
  store: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  storeText: { flex: 1 },
  manage: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5 },
  manageLabel: { fontSize: 13.5, fontWeight: '700' },
});
