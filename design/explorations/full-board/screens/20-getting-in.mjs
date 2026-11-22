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

/* Parts the kit does not have, built from tokens. Listed in the report. */

/** The app's `Pill` sets its word in caps (ADMIN, OFFLINE). */
const capsPill = (text) => `<span class="pill" style="text-transform:uppercase;letter-spacing:.09em;font-size:10px;color:var(--muted);vertical-align:middle">${text}</span>`;
/** A caps eyebrow inside the content (the app's `type.label`), optionally centred. */
const eyebrow = (text, centre = false) => `<div class="lbl q" style="margin:0;${centre ? 'justify-content:center' : ''}">${text}</div>`;
/** A standalone screen: no back, no close. The title is the top. */
const CHIP_SPIN = `<style>
@keyframes fb-spin{to{transform:rotate(360deg)}}
@keyframes fb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes fb-shadow{0%,100%{transform:scaleX(1);opacity:.55}50%{transform:scaleX(.82);opacity:.35}}
@keyframes fb-dots{0%,20%{opacity:.25}40%{opacity:1}100%{opacity:.25}}
.fb .spin-wrap{animation:fb-bob 1.6s ease-in-out infinite}
.fb .spin-chip{animation:fb-spin 2.4s linear infinite;transform-origin:50% 50%}
.fb .spin-sh{animation:fb-shadow 1.6s ease-in-out infinite}
.fb .dots i{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;margin:0 3px;animation:fb-dots 1.2s infinite}
.fb .dots i:nth-child(2){animation-delay:.2s}.fb .dots i:nth-child(3){animation-delay:.4s}
@media (prefers-reduced-motion:reduce){.fb .spin-wrap,.fb .spin-chip,.fb .spin-sh,.fb .dots i{animation:none}}
</style>`;
/** A poker chip seen from above: red belongs to chips. Its edge stripes make the turn readable. */
const chipSvg = (size = 112) => `<svg class="spin-chip" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="47" fill="var(--red)"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="44" y="3" width="12" height="15" rx="2" fill="#fff" transform="rotate(${i * 45} 50 50)"/>`).join('')}
  <circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>
  <circle cx="50" cy="50" r="27" fill="#fff"/>
  <path d="M50 35s-11 8-11 14.5a5.7 5.7 0 0 0 9.3 4.3L46.8 62h6.4l-1.5-8.2a5.7 5.7 0 0 0 9.3-4.3C61 43 50 35 50 35z" fill="#141A2A"/>
</svg>`;
/** One group on Your groups: its drawing, name, line and standing. `current` edges it in ink. */
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
    note: 'Owner, 22 November: design it, with motion. The whole screen is the ink, because there is nothing on it to read but the wait: a chip turns and bobs over its shadow, and three dots pulse under the words. No bar: nothing to do. "Signed in" / "Taking you back to the club." is the same frame for the moment after, the chip at rest.',
    flags: ['The chip, its spin and the three dots are new: the app shows the two words and nothing else. Motion stops for anyone who has reduced motion turned on.'],
    html: `<div class="fb"><div class="scr" style="justify-content:center;align-items:center;text-align:center;color:#fff">${CHIP_SPIN}
      <div style="position:absolute;top:0;left:0;right:0;padding:0 18px">${pushRaw({ topHtml: '', body: '' }).match(/<div class="sb">.*?<\/svg><\/div>/)[0]}</div>
      <div style="display:grid;justify-items:center;gap:0;margin-top:-40px">
        <div class="spin-wrap">${chipSvg(112)}</div>
        <div class="spin-sh" style="width:84px;height:10px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent);margin-top:14px"></div>
        <h1 style="font:700 24px/1.15 var(--head);letter-spacing:-.015em;margin:34px 0 8px;color:#fff">Signing you in</h1>
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
    note: 'Owner, 22 November: design it. Each group is its own card, because tapping one swaps the whole app to it: the group’s drawing, its name at title size, the line under it, and your standing in the corner, since that is what changes when you switch. The group a night is running in says so with the live dot. The group you are in now is the first card, edged in ink.',
    flags: ['“Friday deep stack” and “Office game”, their sizes and currencies, are sample groups: the seeded phone belongs to one group only.', 'The ink edge on the current group is new: the app marks it for screen readers only.'],
    html: push({ title: 'Your groups', sub: '3 groups',
      body: [
        groupCard('The Thursday game', `<span class="win" style="display:inline-flex;align-items:center;gap:6px"><i style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block"></i>a night is running</span>`, 'admin', 'group', true),
        groupCard('Friday deep stack', '9 players · EUR', 'member', 'stats'),
        groupCard('Office game', '4 players · USD', 'name only', 'sessions'),
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
    flags: ['The QR here is a placeholder; four real, scannable styles are at the top of the board under This round.'],
    html: sheet({ behind: 'Players', title: 'Scan to join', sub: 'Ivo · The Thursday game', stepBack: true,
      body: [
        `<div style="display:grid;place-items:center;height:176px;color:var(--text)"><span style="transform:scale(8)">${ico('qr', 20)}</span></div>`,
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
