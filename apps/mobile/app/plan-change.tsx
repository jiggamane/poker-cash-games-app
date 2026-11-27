import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Sheet } from '../src/components/Sheet';
import { Card, SectionLabel } from '../src/components/Card';
import { Has, Price } from '../src/components/PlanParts';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { myPlan, type Plan } from '../src/lib/plan';
import { buy, manage, NoStore, priceOf, storePlans, storeReady, type StorePlan } from '../src/lib/purchases';

/**
 * A CHANGE OF PLAN, as one sheet over Your plan — the full board's
 * `plan-upgrade`, `plan-store-wait`, `plan-store-failed`, `plan-downgrade`
 * and `plan-cancel` (approved, draft words throughout).
 *
 *   to=full     moving up starts now; the bar opens the store's purchase sheet
 *               and waits on it, and says so if the store does not confirm.
 *   to=regular  moving down waits for the end of what is paid; the bar opens
 *               the store's subscription management, where iOS does it.
 *   to=free     stopping the subscription, the same shape with more struck.
 *
 * Every price is the store's (`src/lib/purchases.ts`); with no store yet the
 * sheet prints none and its bar stays faint.
 */
export default function PlanChange() {
  const t = useTheme();
  const { to } = useLocalSearchParams<{ to?: 'full' | 'regular' | 'free' }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<StorePlan[] | null>(null);
  const [state, setState] = useState<'rest' | 'waiting' | 'failed'>('rest');
  const ready = storeReady();

  useEffect(() => {
    let live = true;
    void myPlan().then((p) => live && setPlan(p)).catch(() => undefined);
    void storePlans().then((p) => live && setPlans(p));
    return () => {
      live = false;
    };
  }, []);

  const until = plan?.endsAt == null ? null : day(plan.endsAt);
  const current = plan?.plan === 'regular' ? 'Regular' : 'Full';

  if (to === 'full') {
    const price = priceOf(plans, 'full');
    const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
    async function upgrade() {
      setState('waiting');
      try {
        const answer = await buy('full');
        if (answer === 'bought') router.back();
        else setState('rest');
      } catch (e) {
        setState(e instanceof NoStore ? 'rest' : 'failed');
      }
    }
    return (
      <Sheet
        title="Move up to Full"
        sub={`Starts today. You pay the difference for the rest of ${month}.`}
        bar={[
          state === 'waiting'
            ? { label: 'Waiting for the App Store…', disabled: true }
            : state === 'failed'
              ? { label: 'Try again', disabled: !ready, onPress: () => void upgrade() }
              : { label: price === undefined ? 'Upgrade' : `Upgrade · ${price} a month`, disabled: !ready, onPress: () => void upgrade() },
        ]}
      >
        <View style={styles.body}>
          {state === 'failed' && (
            <Text style={[styles.alarm, { color: t.red }]}>The App Store did not confirm. Nothing was charged.</Text>
          )}
          <View style={[styles.inkCard, { backgroundColor: t.text }]}>
            <View style={styles.nameRow}>
              <Text style={[styles.inkName, { color: t.onFill }]}>Full</Text>
              {price !== undefined && <Price price={price} onInk />}
            </View>
            <View style={styles.list}>
              <Has text="Run games as often as you like" onInk />
              <Has text="Pass a game to anyone, or take one" onInk />
            </View>
          </View>
          <SectionLabel text="Keeps everything in Regular" quiet />
          <View style={styles.list}>
            <Has text="Every night in the book, the missed ones too" />
          </View>
        </View>
      </Sheet>
    );
  }

  const free = to === 'free';
  const regularPrice = priceOf(plans, 'regular');
  const sub = free
    ? `${until === null ? '' : `You keep ${current} until ${until}. `}Nothing is deleted.`
    : `${until === null ? '' : `You keep Full until ${until}. `}${regularPrice === undefined ? 'Then Regular starts.' : `Then Regular starts at ${regularPrice} a month.`}`;

  return (
    <Sheet
      title={free ? 'Move to Free' : 'Move down to Regular'}
      sub={sub}
      bar={[
        {
          label: free
            ? until === null ? 'Move to Free' : `Move to Free on ${until}`
            : until === null ? 'Switch to Regular' : `Switch on ${until}`,
          disabled: !ready,
          onPress: () => void manage().catch((e) => { if (!(e instanceof NoStore)) throw e; }),
        },
      ]}
    >
      <View style={styles.body}>
        {until !== null && <SectionLabel text={`From ${until}`} quiet />}
        <Card pad style={styles.list}>
          {free ? (
            <>
              <Has text="Running games" on={false} />
              <Has text="Nights older than the last three" on={false} />
              <Has text="Watch any game and see its money live" />
              <Has text="Your place in the group" />
            </>
          ) : (
            <>
              <Has text="Run games as often as you like" on={false} />
              <Has text="Pass a game to anyone" on={false} />
              <Has text="One night as host each month" />
              <Has text="Every night in the book, the missed ones too" />
            </>
          )}
        </Card>
        {free && (
          <Text style={[styles.alarm, { color: t.red }]}>
            Older nights stay in the book but are hidden until you have a plan again.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const styles = StyleSheet.create({
  body: { paddingHorizontal: z(20), paddingTop: z(2), paddingBottom: z(6), gap: z(12) },
  inkCard: { borderRadius: L.cardRadius, padding: z(12), gap: z(10) },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: z(8) },
  inkName: { fontFamily: 'head', fontSize: z(24), fontWeight: '800', letterSpacing: -0.48 },
  list: { gap: z(8) },
  alarm: { fontSize: z(13), lineHeight: z(18.85) },
});
