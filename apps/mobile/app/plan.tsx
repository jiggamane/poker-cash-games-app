import { useEffect, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen } from '../src/components/Screen';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Spot } from '../src/components/Spot';
import { Has, Price, Tag } from '../src/components/PlanParts';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { myPlan, type Plan } from '../src/lib/plan';
import { membershipOf } from '../src/lib/membership';
import { useMemberships } from '../src/lib/membershipStore';
import { useClub } from '../src/lib/clubStore';
import { useNight } from '../src/lib/nightStore';
import { buy, NoStore, priceOf, restore, storePlans, storeReady, type PaidTier, type StorePlan } from '../src/lib/purchases';

/**
 * YOUR PLAN — the full board's `plan-*` screens (approved 24–26 November), from
 * Settings → Plan. What you are on, as the card at the head; on Regular, how
 * the host night stands; the other plans; how to move up (the bar), down or out
 * (a row's action, which opens `plan-change`).
 *
 * ⚠ EVERY WORD HERE IS THE BOARD'S DRAFT, flagged as such on every phone, and
 * the purchases are the store's: `src/lib/purchases.ts` is the one seam, and
 * today it says there is no store (the owner's call, 27 November — screens
 * now, store later). So no price is printed until the store gives one, and
 * the bar and every Get stay faint until purchases open.
 */

const FULL = ['Run games as often as you like', 'Every night in the book, the missed ones too', 'Pass a game to anyone, or take one'];
const REGULAR = ['One night as host each month', 'Every night in the book, the missed ones too', 'Take a game passed to you, once a month'];
const FREE = ['Tonight, and the last three games', 'Watch any game and see its money live', 'Your place in the group'];
const FULL_ADDS = ['Run games as often as you like', 'Pass a game to anyone, or take one'];

export default function YourPlan() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  useMemberships(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<StorePlan[] | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let live = true;
    void myPlan()
      .then((p) => live && setPlan(p))
      .catch(() => live && setPlan({ plan: 'free', source: null, endsAt: null }));
    void storePlans().then((p) => live && setPlans(p));
    return () => {
      live = false;
    };
  }, []);

  const meId = night?.meId;
  const me = club?.members.find((m) => m.id === meId);
  const membership = meId === undefined ? null : membershipOf({ id: meId });
  const meta = [me?.name, club?.name].filter(Boolean).join(' · ');
  const ready = storeReady();

  if (plan === null) return <Screen title="Your plan" backTo="Settings" meta={meta}>{null}</Screen>;

  const given = plan.source === 'founder' || plan.source === 'grant' || plan.source === 'promo';
  const until = plan.endsAt === null ? null : day(plan.endsAt);
  const regularUsed = plan.plan === 'regular' && membership?.known === true && membership.hostNightUsed;
  const nextHost = membership?.hostNightRenewsOn ? day(membership.hostNightRenewsOn.toISOString()) : until;
  const fullPrice = priceOf(plans, 'full');

  const open = (to: 'full' | 'regular' | 'free') => router.push({ pathname: '/plan-change', params: { to } });

  return (
    <Screen
      title="Your plan"
      backTo="Settings"
      meta={meta}
      bar={
        plan.plan === 'regular'
          ? [{ label: fullPrice === undefined ? 'Upgrade to Full' : `Upgrade to Full · ${fullPrice} a month`, disabled: !ready, onPress: () => open('full') }]
          : undefined
      }
    >
      <View style={styles.body}>
        {/* ── the plan you are on ── */}
        {plan.plan === 'free' ? (
          <Current name="Free" line="no charge" tag="your plan" list={FREE} />
        ) : plan.plan === 'regular' ? (
          <Current name="Regular" price={priceOf(plans, 'regular')} line={until === null ? undefined : `renews ${until}`} tag="your plan" list={REGULAR} />
        ) : plan.source === 'founder' ? (
          <Current name="Full" line="for ever" tag="founder" list={FULL} />
        ) : given && plan.endsAt === null ? (
          <Current name="Full" line="for life" tag="friend" list={FULL} />
        ) : (
          <Current name="Full" price={given ? undefined : fullPrice} line={until === null ? undefined : given ? `until ${until}` : `renews ${until}`} tag="your plan" list={FULL} />
        )}

        {plan.plan === 'full' && plan.source === 'founder' && (
          <Text style={[styles.note, { color: t.muted }]}>
            Given to the people who ran the first games. There is nothing to pay and nothing to change.
          </Text>
        )}
        {plan.plan === 'full' && given && plan.source !== 'founder' && plan.endsAt === null && (
          <Text style={[styles.note, { color: t.muted }]}>
            A gift from the people who make the app: Full on your own account, for life. It is yours alone and
            cannot be passed on. There is nothing to pay and nothing to change.
          </Text>
        )}

        {/* ── Regular: the host night, once it is spent ── */}
        {regularUsed && (
          <Card pad>
            <View style={styles.hostRow}>
              <Spot place="session" level="rows" width={46} height={46} />
              <View style={styles.flex}>
                <Text style={[styles.hostTitle, { color: t.text }]}>No game left to host</Text>
                {nextHost !== null && (
                  <Text style={[styles.hostLine, { color: t.muted }]}>{`the next one comes on ${nextHost}`}</Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* ── the other plans ── */}
        {plan.plan === 'free' && (
          <>
            <SectionLabel text="Run your own games" quiet />
            <Expand tier="regular" price={priceOf(plans, 'regular')} line="One night as host each month" list={REGULAR} ready={ready} />
            <Expand tier="full" price={fullPrice} line="Run games as often as you like" list={FULL} ready={ready} startOpen />
          </>
        )}

        {plan.plan === 'regular' && (
          <>
            <SectionLabel text="Other plans" quiet />
            {/* The ink offer when the host night is spent — the news is that
                nothing is left (owner, 24 November); a plain card otherwise
                ("lets not put so much accent on the full"). */}
            <Offer
              ink={regularUsed}
              price={fullPrice}
              headline={regularUsed && nextHost !== null ? `Host again tonight, not on ${nextHost}` : 'Host as often as the table wants'}
              adds={FULL_ADDS}
            />
            <Card>
              <CardRow
                last
                name="Free"
                meta="Watch, and the last three games"
                wrapMeta
                trail={<Small label="Downgrade" onPress={() => open('free')} />}
              />
            </Card>
          </>
        )}

        {plan.plan === 'full' && !given && (
          <>
            <SectionLabel text="Other plans" quiet />
            <Card>
              <CardRow
                name="Regular"
                meta="One night as host each month"
                wrapMeta
                trail={<Small label="Downgrade" onPress={() => open('regular')} />}
              />
              <CardRow
                last
                name="Free"
                meta="Watch, and the last three games"
                wrapMeta
                trail={<Small label="Downgrade" onPress={() => open('free')} />}
              />
            </Card>
          </>
        )}

        {/* ── the store's line and Restore, wherever money is paid ── */}
        {!given && plan.plan !== 'free' && (
          <Text style={[styles.note, { color: t.muted }]}>
            Billed through the App Store. Receipts and cancelling are also there, in Settings → Apple ID →
            Subscriptions.
          </Text>
        )}
        {!given && (
          <Pressable
            accessibilityRole="button"
            disabled={!ready || restoring}
            onPress={() => {
              setRestoring(true);
              void restore()
                .catch((e) => {
                  if (!(e instanceof NoStore)) throw e;
                })
                .finally(() => setRestoring(false));
            }}
            style={({ pressed }) => [styles.quiet, { opacity: !ready ? 0.45 : pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.quietLabel, { color: t.muted }]}>Restore purchases</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });




/** The plan you are on: its name large, the store's price, its date, and what it includes. */
function Current({ name, price, line, tag, list }: { name: string; price?: string; line?: string; tag: string; list: string[] }) {
  const t = useTheme();
  return (
    <Card pad style={styles.stack}>
      <View style={styles.tagRow}>
        <Tag text={tag} />
        {line !== undefined && <Text style={[styles.line, { color: t.muted }]}>{line}</Text>}
      </View>
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        {price !== undefined && <Price price={price} />}
      </View>
      <View style={styles.list}>
        {list.map((x) => (
          <Has key={x} text={x} />
        ))}
      </View>
    </Card>
  );
}

/** Full, offered from Regular: the ink card when the host night is spent, a plain one otherwise. */
function Offer({ ink, price, headline, adds }: { ink: boolean; price?: string; headline: string; adds: string[] }) {
  const t = useTheme();
  const body: ReactNode = (
    <>
      <View style={styles.nameRow}>
        <Text style={[styles.offerName, { color: ink ? t.onFill : t.text }, !ink && styles.offerNameQuiet]}>Full</Text>
        {price !== undefined && <Price price={price} onInk={ink} />}
      </View>
      <Text style={[styles.headline, { color: ink ? t.onFill : t.text }]}>{headline}</Text>
      <View style={styles.list}>
        {adds.map((x) => (
          <Has key={x} text={x} onInk={ink} />
        ))}
      </View>
    </>
  );
  return ink ? (
    <View style={[styles.inkCard, styles.stack, { backgroundColor: t.text }]}>{body}</View>
  ) : (
    <Card pad style={styles.stack}>
      {body}
    </Card>
  );
}

/** A paid plan seen from Free: a row that opens to its list and its Get (owner, 26 November). */
function Expand({ tier, price, line, list, ready, startOpen = false }: { tier: PaidTier; price?: string; line: string; list: string[]; ready: boolean; startOpen?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(startOpen);
  const [busy, setBusy] = useState(false);
  const name = tier === 'full' ? 'Full' : 'Regular';
  return (
    <Card style={styles.expand}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[styles.expandHead, open && styles.expandHeadOpen]}
      >
        <View style={styles.nameRow}>
          <Text style={[styles.expandName, { color: t.text }]}>{name}</Text>
          {price !== undefined && <Price price={price} />}
          <View style={open ? styles.chevUp : styles.chevDown}>
            <Icon name="chevron" color={t.muted} size={z(14)} />
          </View>
        </View>
        <Text style={[styles.expandLine, { color: t.muted }]}>{line}</Text>
      </Pressable>
      {open && (
        <View style={[styles.expandBody, { borderTopColor: t.hairline }]}>
          {list.map((x) => (
            <Has key={x} text={x} />
          ))}
          {/* A filled Get inside the opened card, as drawn: the screen's one
              action for that plan. Faint until the store opens. */}
          <Pressable
            accessibilityRole="button"
            disabled={!ready || busy}
            onPress={() => {
              setBusy(true);
              void buy(tier)
                .catch((e) => {
                  if (!(e instanceof NoStore)) throw e;
                })
                .finally(() => setBusy(false));
            }}
            style={({ pressed }) => [styles.get, { backgroundColor: ready ? t.text : t.raised, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.getLabel, { color: ready ? t.onFill : t.muted }]}>
              {price === undefined ? `Get ${name}` : `Get ${name} · ${price} a month`}
            </Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

/** The small outlined action at a row's end. */
function Small({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.small, { borderColor: t.outline, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.smallLabel, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: z(18), paddingTop: z(12), paddingBottom: z(12), gap: z(12) },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: z(10) },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: z(8) },
  line: { marginLeft: 'auto', fontSize: z(12.5) },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: z(8) },
  name: { fontFamily: 'head', fontSize: z(26), fontWeight: '800', letterSpacing: -0.52 },
  list: { gap: z(7) },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: z(12) },
  hostTitle: { fontFamily: 'head', fontSize: z(15), fontWeight: '700' },
  hostLine: { fontSize: z(12.5), marginTop: z(3) },
  inkCard: { borderRadius: L.cardRadius, padding: z(12), boxShadow: '0px 1px 2px 0px rgba(20,26,42,0.25), 0px 12px 24px -12px rgba(20,26,42,0.55)' },
  offerName: { fontFamily: 'head', fontSize: z(24), fontWeight: '800', letterSpacing: -0.48 },
  offerNameQuiet: { fontSize: z(20) },
  headline: { fontFamily: 'head', fontSize: z(15), fontWeight: '700', lineHeight: z(19.5) },
  expand: { paddingHorizontal: z(16) },
  expandHead: { paddingVertical: z(14), gap: z(4) },
  expandHeadOpen: { paddingBottom: z(12) },
  expandName: { flex: 1, fontFamily: 'head', fontSize: z(17), fontWeight: '700' },
  chevDown: { transform: [{ rotate: '90deg' }] },
  chevUp: { transform: [{ rotate: '-90deg' }] },
  expandLine: { fontSize: z(13), lineHeight: z(17.5), paddingRight: z(26) },
  expandBody: { gap: z(10), paddingTop: z(14), paddingBottom: z(16), borderTopWidth: 1 },
  get: { marginTop: z(4), height: z(46), borderRadius: z(12), alignItems: 'center', justifyContent: 'center' },
  getLabel: { fontFamily: 'head', fontSize: z(15), fontWeight: '700' },
  small: { height: z(34), paddingHorizontal: z(12), borderRadius: z(10), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  smallLabel: { fontFamily: 'head', fontSize: z(13), fontWeight: '700' },
  note: { fontSize: z(13), lineHeight: z(18.85) },
  quiet: { minHeight: z(40), alignItems: 'center', justifyContent: 'center' },
  quietLabel: { fontSize: z(14), fontWeight: '600' },
});
