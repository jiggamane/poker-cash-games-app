/**
 * Getting in: signing in, the link landing, naming the account, the groups,
 * claiming a place from an invite, and the host's side of that invite.
 *
 * Two of these routes (`/auth-callback`, `/claim`) are STANDALONE in the app: a
 * link lands on them cold, so they have no back and no close. Here that is an
 * ink top with the title and nothing else on it.
 */
import { push, pushRaw, sheet, bar, label, card, row, note, para, pill, button, quiet, field, chips, ico } from '../kit.mjs';
import { slotArt } from '../kit.mjs';
import { qrSvg, inviteLink } from '../qr.mjs';
import { chip, shadow, PALETTES, GROUND } from '../../icon-system/art.mjs';

/* Parts the kit does not have, built from tokens. Listed in the report. */

/** The app's `Pill` sets its word in caps (ADMIN, OFFLINE). */
const capsPill = (text) => `<span class="pill" style="text-transform:uppercase;letter-spacing:.09em;font-size:10px;color:var(--muted);vertical-align:middle">${text}</span>`;
/** A caps eyebrow inside the content (the app's `type.label`), optionally centred. */
const eyebrow = (text, centre = false) => `<div class="lbl q" style="margin:0;${centre ? 'justify-content:center' : ''}">${text}</div>`;
/** A standalone screen: no back, no close. The title is the top. */
/*
 * Signing you in: a chip riffle, as a player does it at the table (owner, 22 November: "as natural as
 * possible, as if a person had shuffled it"). Modelled on the real move, since the video the owner
 * linked could not be opened from here:
 *
 *   1. The hand lifts the top half of the stack and sets it beside the rest, the two stacks touching.
 *   2. Thumbs press the near edges up: both stacks lean in a few degrees and rise at the seam.
 *   3. The chips fall in from the bottom, one from each side in turn, not quite evenly timed.
 *   4. The hand squares the new stack: a short side-to-side nudge and it settles.
 *
 * It is a true repeated shuffle, so the colours move from round to round the way real chips would:
 * three ink over three red splits into one stack of each colour, which riffle to alternate, and so
 * on; after four rounds the stack is back where it began (a perfect out-shuffle of six has order 4).
 * Each chip is its own layer so the stacking order can change between rounds. 2.6 seconds a round;
 * reduced motion shows the stack, still.
 */
const RIFFLE = { cx: 48, r: 21, h: 7, dx: 21, round: 2.7, rounds: 4, vb: [-6, 18, 108, 82] };
/*
 * What makes it read as a hand rather than a machine (owner, 22 November: "generally right, but it
 * should look natural"):
 *   - every move has weight: a lift eases out, a fall eases in like gravity, a slide eases both ways,
 *     and a chip that lands dips a fraction and comes back;
 *   - the two stacks lean as columns, not as loose chips: each tips about its outer foot, so the
 *     higher a chip, the further it leans toward the seam, and the seam side rises;
 *   - the stacks close toward each other as the chips fall, so the riffle happens where they touch;
 *   - the chips land a little out of line, and the squaring pushes them true;
 *   - nothing is evenly timed: each round, each chip, its own small offset.
 *
 * Then held against the owner's frames from the video (22 November). What they show, and what this
 * now does: the two stacks never leave each other, they stand touching (dx = r); the fingers press
 * the seam up, so each stack tips on its OUTER foot and the two make a peak where they meet, about
 * ten degrees each; the chips drop into one stack right there, a short fall, not a slide across; and
 * the top half is moved over low and close, not lifted high.
 */
const rand = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };  /* fixed, so the board does not change between builds */
const EASE = { lift: 'cubic-bezier(.2,.7,.35,1)', fall: 'cubic-bezier(.55,0,.85,.4)', slide: 'cubic-bezier(.45,.05,.3,1)', settle: 'cubic-bezier(.3,.6,.4,1)', hold: 'linear' };
const stackWait = (px = 168) => {
  const P = PALETTES.freshDeckOnInk;
  const { cx, r, h, dx, round, rounds, vb } = RIFFLE;
  const sc = px / vb[2], H = (px * vb[3]) / vb[2];
  const mats = ['ink', 'ink', 'ink', 'red', 'red', 'red'];          /* chip identities */
  const orders = [[0, 1, 2, 3, 4, 5]];                                 /* three ink under three red, then out-shuffles */
  for (let k = 0; k < rounds; k++) { const m = orders[k]; orders.push([m[0], m[3], m[1], m[4], m[2], m[5]]); }
  const T = (x, y, rot = 0, z = 0) => ({ x, y, rot, z });
  const css = (t) => `transform:translate(${(t.x * sc).toFixed(2)}px,${(t.y * sc).toFixed(2)}px) rotate(${t.rot.toFixed(2)}deg);z-index:${t.z}`;
  const layers = mats.map((mat, c) => {
    const frames = [];
    const put = (f, t, ease = EASE.slide) => frames.push([Math.min(100, f * 100), t, ease]);
    for (let k = 0; k < rounds; k++) {
      const R = (f) => (k + f) / rounds;
      const from = orders[k].indexOf(c), to = orders[k + 1].indexOf(c);
      const top = from >= 3, ht = top ? from - 3 : from, dir = top ? 1 : -1;
      const j = (n) => (rand(k * 31 + c * 7 + n) - 0.5);                 /* -0.5 … 0.5, per round, chip and step */
      const sx = dir * dx;
      const tilt = 10 + j(1) * 2.5;                                      /* degrees each stack tips up at the seam */
      /*
       * The stack tips on its outer foot, so its inner edge rises and the two make a peak at the seam.
       * Rotating the chip's base point (r in from the foot, ht chips up) about that foot gives where it
       * moves to; the chip itself turns by the same angle about its own base.
       */
      const th = (tilt * Math.PI) / 180, bx = r, by = -ht * h;
      const rx = bx * Math.cos(th) + by * Math.sin(th), ry = -bx * Math.sin(th) + by * Math.cos(th);
      const leanX = sx + dir * (bx - rx), leanY = ry;                      /* the foot is r outside the stack centre; the right stack mirrors the left */
      const peakRot = dir * tilt;                                         /* left turns back (inner edge up), right turns forward */
      const off = j(2) * 1.6;                                            /* how far out of line it lands */
      /* 0: the stack as it stands, squared */
      put(R(0), T(0, -from * h, 0, from), EASE.hold);
      put(R(0.05 + j(3) * 0.02), T(0, -from * h, 0, from), top ? EASE.lift : EASE.hold);
      /* 1: the top half is picked up, carried over with a slight tip, set down beside */
      if (top) {
        put(R(0.13), T(sx * 0.45, -from * h - 3.5, dir * 2.5, 20 + ht), EASE.slide);
        put(R(0.22), T(sx * 0.96, -ht * h - 2, dir * 1, 20 + ht), EASE.fall);
        put(R(0.255), T(sx, -ht * h + 0.4, 0, ht), EASE.settle);
        put(R(0.28), T(sx, -ht * h, 0, ht), EASE.hold);
      } else {
        put(R(0.2), T(0, -from * h, 0, from), EASE.slide);
        put(R(0.28), T(sx, -ht * h, 0, ht), EASE.hold);             /* the hand slides the rest over a touch */
      }
      put(R(0.33 + j(4) * 0.02), T(sx, -ht * h, 0, ht), EASE.lift);
      /* 2: thumbs press the seam up: both columns lean in */
      put(R(0.41), T(leanX, leanY, peakRot, ht), EASE.hold);
      /* 3: the chips fall in from the bottom, one side then the other, a little unevenly */
      const go = 0.44 + to * 0.042 + j(5) * 0.018;
      put(R(go), T(leanX, leanY, peakRot, ht), EASE.fall);
      put(R(go + 0.04), T(off * 0.5 + dir * 0.8, -to * h + 0.8, peakRot * 0.2, to), EASE.settle);
      put(R(go + 0.075), T(off, -to * h, 0, to), EASE.hold);
      /* 4: the hand squares the stack: pushed true from the sides, a last small rock */
      put(R(0.76 + j(6) * 0.015), T(off, -to * h, 0, to), EASE.slide);
      put(R(0.82), T(-off * 0.25, -to * h, 0, to), EASE.settle);
      put(R(0.88), T(0, -to * h, 0, to), EASE.hold);
    }
    put(1, T(0, -orders[rounds].indexOf(c) * h, 0, orders[rounds].indexOf(c)));
    frames.sort((a, b) => a[0] - b[0]);
    const kf = `@keyframes fb-rf${c}{${frames.map(([pct, t, e]) => `${pct.toFixed(3)}%{${css(t)};animation-timing-function:${e}}`).join('')}}`;
    const origin = `${((cx - vb[0]) * sc).toFixed(1)}px ${((GROUND - 1 - vb[1]) * sc).toFixed(1)}px`;
    const svg = `<svg viewBox="${vb.join(' ')}" width="${px}" height="${H.toFixed(1)}" style="position:absolute;left:0;top:0;overflow:visible;animation:fb-rf${c} ${(round * rounds).toFixed(1)}s infinite;transform-origin:${origin};${css(T(0, -orders[0].indexOf(c) * h, 0, orders[0].indexOf(c)))}">${chip(P, { cx, by: GROUND - 1, r, h, mat, face: true, seam: true, phase: (c * 17) % 45 })}</svg>`;
    return { kf, svg };
  });
  return `<style>
${layers.map((l) => l.kf).join('\n')}
@keyframes fb-dots{0%,20%{opacity:.25}40%{opacity:1}100%{opacity:.25}}
.fb .dots i{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;margin:0 3px;animation:fb-dots 1.2s infinite}
.fb .dots i:nth-child(2){animation-delay:.2s}.fb .dots i:nth-child(3){animation-delay:.4s}
@media (prefers-reduced-motion:reduce){.fb .riffle svg,.fb .dots i{animation:none!important}}
</style><div class="riffle" style="position:relative;width:${px}px;height:${H.toFixed(1)}px"><svg viewBox="${vb.join(' ')}" width="${px}" height="${H.toFixed(1)}" style="position:absolute;left:0;top:0;overflow:visible">${shadow(P, 48, 50)}</svg>${layers.map((l) => l.svg).join('')}</div>`;
};
/** One group on Your groups: standing above, the name as the headline; the current group is the ink card. */
const headlineGroup = (name, standing, line, current = false, live = false) => `<div class="card" style="padding:14px 16px;display:grid;gap:8px;${current ? 'background:var(--pri);color:var(--onpri)' : ''}">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span style="font:700 10px/1 var(--body);letter-spacing:.09em;text-transform:uppercase;padding:4px 7px;border-radius:999px;${current ? 'background:rgba(127,127,127,.22);color:inherit' : 'background:var(--raised);color:var(--muted)'};white-space:nowrap">${standing}</span>${live ? `<span class="${current ? 'live-pri' : 'win'}" style="display:inline-flex;align-items:center;gap:6px;font-size:12px"><i style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block"></i>a night is running</span>` : `<span style="font-size:12px;opacity:.6">${line}</span>`}</div>
  <div style="font:800 22px/1.1 var(--head);letter-spacing:-.02em">${name}</div></div>`;
/** One group on Your groups (earlier, with a drawing): its drawing, name, line and standing. `current` edges it in ink. */
const groupCard = (name, line, standing, place, current = false) => `<div class="card" style="padding:12px 14px 12px 8px;display:flex;align-items:center;gap:10px;${current ? 'box-shadow:var(--lift),inset 0 0 0 2px var(--text)' : ''}">
  ${slotArt(place, 'rows', 60, 52)}
  <div style="flex:1;min-width:0"><div style="font:700 18px/1.15 var(--head);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px"><span style="font-size:12.5px;color:var(--muted);white-space:nowrap">${line}</span>${capsPill(standing)}</div></div></div>`;
const standalone = ({ title, body, bar: foot }) => pushRaw({ topHtml: `<h1 class="home" style="margin-top:22px">${title}</h1>`, body, bar: foot });
/** X2a's hairline: a 2px track with a 38% segment. No spinner. */
const track = () => `<div style="height:2px;border-radius:1px;background:var(--line);overflow:hidden"><div style="width:38%;height:2px;background:var(--text)"></div></div>`;
/** Four share controls in a line: icon over word. `dead` when there is no code to send. */
const shareRow = (items, dead = false) => `<div style="display:flex;gap:8px">${items.map(([icon, text]) =>
  `<div style="flex:1;display:grid;justify-items:center;gap:6px;padding:11px 0;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--${dead ? 'line' : 'outline'});color:var(--${dead ? 'dim' : 'text'});font:600 11.5px/1 var(--body)">${ico(icon, 18)}${text}</div>`).join('')}</div>`;
/** The invite code as the hero: six characters, a dash after the third (owner, 22 November). */
const codeHero = (text, { muted = false } = {}) => `<div class="num" style="font-weight:800;font-size:31px;letter-spacing:.05em;text-align:center;padding:4px 0;color:var(--${muted ? 'muted' : 'text'})">${text}</div>`;
/** One of the two five-character boxes on "Type your invite code". */
const codeBox = (text, focus = false) => `<div class="fi${focus ? ' focus' : ''}" style="flex:1;height:62px;justify-content:center;font:700 24px/1 var(--head);letter-spacing:.14em">${text}</div>`;
/** A bulleted statement: one 5px dot, never an icon. */
const statement = (text) => `<div style="display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45"><span style="width:5px;height:5px;border-radius:50%;background:var(--muted);margin-top:8px;flex:none"></span><span>${text}</span></div>`;

const redirectNote = `<div style="display:grid;gap:5px;font-size:12px;line-height:1.4;color:var(--muted)"><span>Redirects to</span><b style="font-weight:600">pokerclub://auth-callback</b><span>This must appear in Supabase → Authentication → URL Configuration → Redirect URLs.</span></div>`;

const EMAIL = 'lena@example.com';
const CODE = 'K7M-4XP';
const CODEFLAG = 'Six characters with a dash after three is the owner’s request (22 November). The server issues ten today (new_invite_code, 0007): 30^6 is about 729 million codes against 30^10’s 590 trillion, which is the margin 0009’s anti-enumeration work leans on. Shortening it is a server change, and a decision about how many guesses a code must survive.';

export const section = { title: 'Getting in', blurb: 'Signing in by emailed link, naming the account, choosing or starting a group, and an invite seen from both ends.' };

export default [
  /* ── /sign-in ─────────────────────────────────────────────────────── */
  { id: 'sign-in', route: '/sign-in', name: 'Sign in', nav: 'sheet',
    flags: [
      `Sample address "${EMAIL}" is not in the app (its placeholder is you@example.com).`,
      'The redirect address shown (pokerclub://auth-callback) is the one sign-in.tsx names for a real build; the reference capture had no server so the line was not on screen.',
      'With no address typed the bar is the same words, blocked ("Email me a link"), and counts down as "Email me a link in 42s" under a throttle. Not drawn separately.',
    ],
    html: sheet({ behind: 'Settings', title: 'Sign in',
      body: [
        note('Only the host signs in. Players are names you type, and watchers open a link.'),
        field('Email', EMAIL, { focus: true }),
        note('No password. We email you a link that signs you in.'),
        redirectNote,
      ],
      bar: bar('Email me a link') }) },

  { id: 'sign-in-code', route: '/sign-in', name: 'Sign in · no account yet', nav: 'sheet',
    note: 'The address was refused, so the sheet grows a field for a code and the bar changes its words. Blocked until a code is typed.',
    flags: ['The app marks this state’s copy "COPY NOT DRAWN" (sign-in.tsx): written in code, never on a board.'],
    html: sheet({ behind: 'Settings', title: 'Sign in', tall: true,
      body: [
        note('Only the host signs in. Players are names you type, and watchers open a link.'),
        field('Email', EMAIL),
        note('No password. We email you a link that signs you in.'),
        note('That address has no account yet. If somebody gave you a code, type it here: it opens an account for this address and emails it a link.'),
        field('Code', 'FRIDAY', { placeholder: true, focus: true }),
        note('As you were given it. Capitals or not, it does not matter.'),
        redirectNote,
      ],
      bar: bar('Open an account', { blocked: true }) }) },

  { id: 'sign-in-sent', route: '/sign-in', name: 'Check your email', nav: 'sheet',
    note: 'The bar is the recovery, not the action: the action is in the mail app. It counts down, blocked, then reads "Send another link".',
    flags: ['"42s" is a sample count; the app counts down from 60.', 'README rule 2 would give a later step a back circle; the app’s way back here is the button "Use a different email", so no back circle is drawn.'],
    html: sheet({ behind: 'Settings', title: 'Check your email', tall: true,
      body: [
        para(`A sign-in link is on its way to ${EMAIL}.`),
        note('Open it on this phone and it brings you straight back here, signed in. It works once and expires shortly, so if it goes stale, send another.'),
        eyebrow('If the button does nothing'),
        note('The email prints the same address as text underneath it. Paste that into a browser on this phone — it signs you in the same way.'),
        redirectNote,
        button('Use a different email'),
      ],
      bar: bar('Send another link in 42s', { blocked: true }) }) },

  /* ── /auth-callback ───────────────────────────────────────────────── */
  { id: 'auth-callback', route: '/auth-callback', name: 'That link did not sign you in', nav: 'root',
    note: 'Standalone: a link lands here cold, so there is no back and no close. The app centres this block on the page; here the title is the ink top.',
    html: standalone({ title: 'That link did not sign you in',
      body: [
        para('The link may have already been used, or it may have expired — each one works once.'),
        note('The email prints the same address as text under the button. Pasting that into a browser on this phone signs you in the same way — a fresh email is only needed if the link has expired.'),
      ],
      bar: bar('Send myself another') }) },

  { id: 'auth-callback-wait', route: '/auth-callback', name: 'Signing you in', nav: 'root',
    note: 'Owner, 22 November: design it, with motion, using the chip stack from Start a session. The whole screen is the ink: an invisible hand riffles the chips as a player does, lifting the top half beside the rest, leaning both in so the chips fall together from the bottom, then squaring the stack; the colours mix from round to round. Three dots pulse under the words. No bar: nothing to do. "Signed in" / "Taking you back to the club." is the same frame for the moment after, the chip at rest.',
    flags: ['The stack, its motion and the three dots are new: the app shows the two words and nothing else. Motion stops for anyone who has reduced motion turned on.'],
    html: `<div class="fb"><div class="scr" style="justify-content:center;align-items:center;text-align:center;color:#fff">
      <div style="position:absolute;top:0;left:0;right:0;padding:0 18px">${pushRaw({ topHtml: '', body: '' }).match(/<div class="sb">.*?<\/svg><\/div>/)[0]}</div>
      <div style="display:grid;justify-items:center;margin-top:-40px">
        ${stackWait(168)}
        <h1 style="font:700 24px/1.15 var(--head);letter-spacing:-.015em;margin:26px 0 8px;color:#fff">Signing you in</h1>
        <div style="font-size:15px;color:rgba(255,255,255,.72)">One moment.</div>
        <div class="dots" style="margin-top:18px;color:rgba(255,255,255,.72)"><i></i><i></i><i></i></div>
      </div></div></div>` },

  /* ── /your-name ───────────────────────────────────────────────────── */
  { id: 'your-name', route: '/your-name', name: 'Your name · first sign-in', nav: 'sheet',
    note: 'Required: blocked until a name is typed, and closing the sheet signs the phone out.',
    flags: ['The app marks the line "Closing this signs the phone out again…" as UNSURE on its board (your-name.tsx).'],
    html: sheet({ behind: 'The Thursday game', title: 'Your name',
      body: [
        para('How the people you play with see you when you run a game.'),
        field('', 'Lena', { placeholder: true, focus: true }),
        note('Closing this signs the phone out again. An account needs a name.'),
      ],
      bar: bar('Save', { blocked: true }) }) },

  { id: 'your-name-edit', route: '/your-name', name: 'Your name · from Settings', nav: 'sheet',
    html: sheet({ behind: 'Settings', title: 'Your name',
      body: [
        para('How the people you play with see you when you run a game.'),
        field('', 'Lena'),
      ],
      bar: bar('Save') }) },

  /* ── /groups ──────────────────────────────────────────────────────── */
  { id: 'groups', route: '/groups', name: 'Your groups', nav: 'push',
    note: 'The owner’s pick of four (22 November): each group a card with its name large and your standing above it; no picture and no currency. The group you are in is the ink card; the others say how many play there, and a group with a night running says so instead.',
    flags: ['“Friday deep stack” and “Office game” are sample groups: the seeded phone belongs to one group only.', 'The app shows the currency on this row today; dropping it is the owner’s call.'],
    html: `<style>.fb .live-pri{color:#7BE3AE}.dark .fb .live-pri{color:#0E7A45}</style>` + push({ title: 'Your groups', sub: '3 groups',
      body: [
        headlineGroup('The Thursday game', 'admin', '', true, true),
        headlineGroup('Friday deep stack', 'member', '9 players'),
        headlineGroup('Office game', 'name only', '4 players'),
      ],
      bar: bar('New group') }) },

  { id: 'groups-empty', route: '/groups', name: 'Your groups · none yet', nav: 'push',
    html: push({ title: 'Your groups',
      body: [note('No groups yet. A group needs only a name to exist.')],
      bar: bar('New group') }) },

  /* ── /new-group ───────────────────────────────────────────────────── */
  { id: 'new-group', route: '/new-group', name: 'New group · name and currency', nav: 'sheet',
    note: 'Blocked until the group has a name. The currency box is a search; the four chips are its empty state.',
    html: sheet({ behind: 'Your groups', title: 'New group', sub: 'Name and currency',
      body: [
        eyebrow('Group name'),
        field('', 'The Thursday game', { placeholder: true, focus: true }),
        eyebrow('Currency'),
        field('', 'USD · US Dollar', { placeholder: true }),
        chips(['CZK', 'EUR', 'GBP', { text: 'USD', on: true }]),
      ],
      bar: bar('Next', { blocked: true }) }) },

  { id: 'new-group-money', route: '/new-group', name: 'New group · the money side', nav: 'sheet',
    flags: ['A back circle is drawn on steps 2 and 3 (README rule 2). The app has NO way back between these steps today: only the close.'],
    html: sheet({ behind: 'Your groups', title: 'New group', sub: 'The money side', stepBack: true,
      body: [
        eyebrow('Standard buy-in'),
        field('', '500'),
        note('It is only what a night opens with — the host can change it for one evening without changing it here. Bills, the piggy bank and fees are set in the group’s money rules once it exists; a group with none takes nothing off the table.'),
        button('Skip · defaults are fine'),
      ],
      bar: bar('Next') }) },

  { id: 'new-group-players', route: '/new-group', name: 'New group · who is in it', nav: 'sheet',
    note: 'The bar carries the group’s name. "Add players later" does the same thing in the app and stays a secondary.',
    flags: ['The group name typed ("The Thursday game") and the two names added (Petr, Lena) are sample input taken from the seeded group.', 'In the app "Create …" and "Add players later" both create the group with whatever has been added; two controls for one act.'],
    html: sheet({ behind: 'Your groups', title: 'New group', sub: 'Who is in it', stepBack: true,
      body: [
        eyebrow('Add by name'),
        field('', 'Their name', { placeholder: true, focus: true }),
        chips([{ text: 'Petr', on: true }, { text: 'Lena', on: true }]),
        note('A new group starts empty. Players you know are not carried over, and neither are their results elsewhere. Buy-ins default to $500.'),
        button('Add players later'),
      ],
      bar: bar('Create The Thursday game') }) },

  /* ── /claim ───────────────────────────────────────────────────────── */
  { id: 'claim', route: '/claim', name: 'Claim your place', nav: 'root',
    note: 'Standalone, no back and no close. Who you are, a rule, what you are joining: one card.',
    flags: ['"Lena added you as Ivo" uses seeded names as sample data; which of the six is the host is my choice.', 'While the claim is being sent the app dims the button to .55 and puts a hairline under it. On a bar that would be the blocked bar with the hairline above it: not drawn, needs a decision.'],
    html: standalone({ title: 'Claim your place',
      body: [
        `<p class="note" style="font-size:14.5px">Lena added you as <b style="color:var(--text)">Ivo</b></p>`,
        card([
          `<div style="font:800 22px/1.15 var(--head);letter-spacing:-.02em;padding:16px 4px 12px;border-bottom:1px solid var(--line)">Ivo</div>`,
          `<div style="font-weight:600;font-size:17px;padding:12px 4px 16px">The Thursday game</div>`,
        ]),
        `<div style="display:grid;gap:10px;margin-top:4px">${['You see the table live.', 'Your net carries across every night.', 'Only the host writes to the book.'].map(statement).join('')}</div>`,
        `<div class="grow"></div>`,
        `<p class="note" style="margin-bottom:14px">Not Ivo? Ask Lena to send the right link.</p>`,
      ],
      bar: bar('Claim your place') }) },

  { id: 'claim-typing', route: '/claim', name: 'Type your invite code', nav: 'root',
    note: 'Opened from Settings → "I have an invite code", or from the dead invite. Two boxes of three, the dash printed between them so nobody types it. Blocked until all six are in.',
    flags: ['"K7M" is a sample code, half typed.', '“Six characters, from the invite.” is new copy: the app says “Ten characters, from the invite.”', CODEFLAG],
    html: standalone({ title: 'Type your invite code',
      body: [
        note('Six characters, from the invite.'),
        `<div style="display:flex;gap:10px;align-items:center">${codeBox('K7M')}<span class="num muted" style="font-size:24px;font-weight:700">–</span>${codeBox('', true)}</div>`,
        note('Letters and numbers. No I, O, 0 or 1 — they are not in the alphabet a code is drawn from.'),
      ],
      bar: bar('Check the code', { blocked: true }) }) },

  { id: 'claim-dead', route: '/claim', name: 'This invite can’t be used', nav: 'root',
    note: 'One string for four causes, and no primary: there is nothing to complete, so there is no bar.',
    html: standalone({ title: 'This invite can’t be used',
      body: [
        note('Ask whoever invited you for a new link.'),
        button('Type a code instead'),
      ] }) },

  { id: 'claim-checking', route: '/claim', name: 'Checking your invite · no answer', nav: 'root',
    note: 'The checking frame ("This takes a second.") with one more line and a retry when the server does not answer. No bar in either.',
    flags: ['The app marks this line and the one on "already a member" as COPY DRAWN, NOT SIGNED OFF (claim.tsx).'],
    html: standalone({ title: 'Checking your invite',
      body: [
        note('This is taking longer than it should. The code is fine — the phone cannot reach the club.'),
        track(),
        button('Try again'),
      ] }) },

  { id: 'claim-member', route: '/claim', name: 'You are already in the group', nav: 'root',
    html: standalone({ title: 'You are already in The Thursday game',
      body: [note('This link is for a different place at that table, and you already have one.')],
      bar: bar('Open the club') }) },

  /* ── /invite ──────────────────────────────────────────────────────── */
  { id: 'invite', route: '/invite', name: 'Invite a player', nav: 'sheet',
    note: 'No bar: the sheet’s work is the four share controls, and its only button, "Reset the code", is a secondary in the app.',
    flags: [
      `Sample code "${CODE}"; Ivo is a seeded player.`, CODEFLAG,
      'The app marks "It works for a month." as its own clause wanting sign-off (invite.tsx).',
      'Open question: should one of the four (Share?) be the bar? The app gives none of them primary weight.',
      'Not drawn: the claimed seat. Same frame with a "Claimed" pill after the title, the code muted, the four controls dead, and "Ivo claimed this. It cannot be used again."',
    ],
    html: sheet({ behind: 'Players', title: 'Invite a player', sub: 'Ivo',
      body: [
        eyebrow('Ivo’s code'),
        codeHero(CODE).replace('font-size:31px;letter-spacing:.05em','font-size:40px;letter-spacing:.08em'),
        note('One person, one code — it only ever attaches to Ivo. It works for a month.'),
        shareRow([['copy', 'Copy'], ['message', 'Message'], ['share', 'Share'], ['qr', 'QR code']]),
        button('Reset the code'),
        `<div style="height:6px"></div>`,
      ] }) },

  { id: 'invite-qr', route: '/invite', name: 'Scan to join', nav: 'sheet',
    note: 'Same sheet, content replaced. The app’s text button "Back to the invite" is the back circle’s job here, and is kept as words too.',
    flags: ['Square, as you chose on 22 November. A real code: it scans to the invite’s link, pokerclub://claim?c=K7M-4XP.'],
    html: sheet({ behind: 'Players', title: 'Scan to join', sub: 'Ivo · The Thursday game', stepBack: true,
      body: [
        `<div style="display:grid;place-items:center">${qrSvg(inviteLink(CODE))}</div>`,
        `<div class="num" style="font-weight:700;font-size:17px;letter-spacing:.05em;text-align:center">${CODE}</div>`,
        `<p class="note" style="text-align:center">If the camera will not read it, the code can be typed.</p>`,
        quiet('Back to the invite'),
        `<div style="height:6px"></div>`,
      ] }) },

  { id: 'invite-reset', route: '/invite', name: 'Reset the code?', nav: 'sheet',
    note: 'The confirm is the app’s destructive button, so it stays in the content in red and the sheet has no bar.',
    flags: [
      'Open question: a confirm sheet with no bar. Rule 3 keeps a destructive action out of the bar; the alternative is the bar reading "Reset the code".',
      'invite.tsx says this confirm is "OUTLINE and never red: colour is money", yet the app draws it with the red destructive variant. README rule 3 (red quiet) is followed here.',
      'For a claimed seat the title is "Give Ivo’s seat a new code?", with three paragraphs and the tag "ALREADY USED". Not drawn. The app marks both sets of copy as wanting sign-off.',
    ],
    html: sheet({ behind: 'Players', title: 'Reset the code?', sub: 'Ivo', stepBack: true,
      body: [
        para('The code you already sent stops working. Anyone holding it sees nothing, and it cannot be undone.'),
        note('A new ten-character code takes its place, bound to Ivo in the same way.'),
        `<div style="display:grid;justify-items:center;gap:8px;margin:6px 0"><span class="num muted" style="font-weight:800;font-size:22px;letter-spacing:.05em;text-decoration:line-through">${CODE}</span><span style="font:700 10.5px/1 var(--body);letter-spacing:.1em;color:var(--muted);padding:5px 8px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--line)">DIES ON RESET</span></div>`,
        quiet('Reset the code', { red: true }),
        quiet('Keep the current code'),
        `<div style="height:6px"></div>`,
      ] }) },

  { id: 'invite-blocked', route: '/invite', name: 'Invite a player · no code', nav: 'sheet',
    note: 'Offline, signed out, or a player the server has not met. The controls are present but dead, so the host sees what will be available.',
    flags: ['Signed out, the reason reads "A code is made on the server, so you have to be signed in to make one." The app shows three dead controls here (no QR code) against four on the live sheet.'],
    html: sheet({ behind: 'Players', title: `Invite a player ${capsPill('Offline')}`, sub: 'Ivo',
      body: [
        `<div style="border:1.5px dashed var(--outline);border-radius:14px;padding:18px;display:grid;gap:8px;justify-items:center;text-align:center">${eyebrow('No code yet', true)}${note('This build has no server, so there is nothing to make a code on.')}</div>`,
        shareRow([['copy', 'Copy'], ['message', 'Message'], ['share', 'Share']], true),
        note('Adding by name still works offline — it is the invite that cannot.'),
        button('Try again'),
        `<div style="height:6px"></div>`,
      ] }) },
];
