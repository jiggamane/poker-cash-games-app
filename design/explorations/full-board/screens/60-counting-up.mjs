/**
 * Ending the night, steps 1 and 2 of 3: Count up (with the sheet a stack is
 * typed on) and Deductions. Words and figures are the app's, from
 * `apps/mobile/app/count-up.tsx`, `log.tsx`, `deductions.tsx` and the seeded
 * night played through.
 */
import { push, sheet, bar, label, card, row, note, para, pill, button, ico, terms } from '../kit.mjs';

/* ── Count up ─────────────────────────────────────────────────────────── */

/**
 * The block from `design/handoff-count-up-header/`, kept on the ink: the signed
 * gap as the headline, the percentage beside it, the bar to scale, and the two
 * sums in full underneath. No eyebrow, no verdict strip. Type is the top's own
 * white; the quieter words are the same white at reduced opacity.
 */
const sum = (caption, amount) =>
  `<div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span style="flex:1;min-width:0;font-size:12.5px;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${caption}</span><b class="num" style="font-size:16px;flex:none">${amount}</b></div>`;

const block = ({ gap, pct, shares, accounted, amount }) =>
  `<div class="thero" style="padding-top:8px"><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px"><div class="big" style="margin-top:0">${gap}</div><b class="num" style="font-size:15px;padding-bottom:3px">${pct}</b></div>
   <div class="tbar" style="height:5px;margin-bottom:10px">${shares.map((s) => `<i style="flex:${s}"></i>`).join('')}</div>${sum('In play · 6 players', '$5,000')}${sum(`${accounted[0].toUpperCase()}${accounted.slice(1)}`, amount)}</div>`;

/** The one line the block keeps once the night balances. */
const balancedLine = `<div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding:0 2px">${ico('check', 18)}<b style="font:700 20px/1 var(--head);flex:1">Balanced</b><b class="num" style="font-size:18px">$5,000</b><span style="font-size:12.5px;opacity:.72">in play</span></div>`;

/** The night's two terms, set on this screen: one card, two rows, nothing pointing. */
const termsCard = card([row({ name: 'Rounding · off', value: 'to the dollar' }), row({ name: 'Ended · 17:23', value: 'same night' })]);

/** Name and its fact on one line, as the app's player rows have them. */
const factIcon = (fact) => (fact.startsWith('cashed') ? 'cashOut' : fact.startsWith('in ') ? 'chipsIn' : 'chipsOut');
/* Two lines, as the settled night's rows (owner, 24 November: “apply the player list style we have”): the name, and under it the fact with its icon. */
const who = (name, fact) => `${name}<small style="display:flex;align-items:center;gap:4px;margin-top:4px"><span style="display:inline-flex;opacity:.8">${ico(factIcon(fact), 13)}</span>${fact}</small>`;

const waiting = (name, bought) =>
  row({ name: who(name, `in ${bought}`), trail: `<span class="dimt num" style="font-size:16px">—</span><span class="muted">${ico('pencil', 16)}</span>` });
const counted = (name, fact, amount) => row({ name: who(name, fact), amount, tone: amount.startsWith('+') ? 'win' : 'loss' });

const dana = counted('Dana', 'cashed out 17:17', '+$1,620');
const andro = counted('Andro', 'counted $960', '+$460');
const lena = counted('Lena', 'counted $1,430', '+$430');
const tomas = counted('Tomáš', 'counted $0', '−$500');
const ivo = counted('Ivo', 'counted $220', '−$780');

const countTop = { title: 'Count up', trailing: '1 of 3' };

/* Balanced, round two (owner, 24 November: “more styles for the status, a little more visible”). */
/* Balanced, more vivid (owner, 23 November: “try more styles for balanced, a bit more vivid”). */
const balancedA = `<div style="display:flex;align-items:center;gap:10px;margin-top:12px;padding:0 2px"><span style="width:26px;height:26px;border-radius:50%;background:#7BE3AE;color:#0A2A1A;display:grid;place-items:center">${ico('check', 16)}</span><b style="font:800 22px/1 var(--head);flex:1;color:#7BE3AE">Balanced</b><b class="num" style="font-size:18px">$5,000</b><span style="font-size:12.5px;opacity:.72">in play</span></div>`;


/* ── The count sheet ──────────────────────────────────────────────────── */

/** The app's count keypad has a `00` key where the kit's keypad has a blank. */
const keypad00 = `<div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<span>${k}</span>`).join('')}<span class="muted">00</span><span>0</span><span>${ico('backspace', 22)}</span></div>`;

/* ── Deductions ───────────────────────────────────────────────────────── */

const dedTop = { title: 'Deductions', trailing: '2 of 3' };

const after = (name, amount, working = '') =>
  `<div class="row" style="min-height:40px"><span class="n">${name}${working ? `<small class="wrap">${working}</small>` : ''}</span><span class="a ${amount.startsWith('+') ? 'win' : 'loss'}">${amount}</span></div>`;

/** In the new look (owner, 24 November): a lifted card like every other group, the provisional state said by a quiet tag and the line under it, and each player's terms as the settled night writes them. */
const termsLine = (parts) => `<span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">${parts.map(([icon, v]) => `<span class="muted" style="display:inline-flex;align-items:center;gap:3px;font:500 11.5px/1 var(--head)">${ico(icon, 12)}${v}</span>`).join('')}</span>`;
/* The settled night's own row (owner, 25 November: the same UI as other parts): the game result under the name, the deductions as one terms pill under it, the net on the right. */
const after2 = (name, amount, parts = []) => row({ name, meta: parts.length ? `<span style="display:inline-flex;align-items:center;gap:4px">${ico(parts[0][0], 12)}${parts[0][1]}</span>` : '', amount, tone: amount.startsWith('+') ? 'win' : 'loss', under: parts.length > 1 ? terms(parts.slice(1).map(([icon, v]) => `${ico(icon, 12)} ${v}`).join(' ')) : '' });
const preview = [
  `<div class="lbl" style="white-space:nowrap;letter-spacing:.08em">Everyone after deductions<span class="r"><span style="font:700 10px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--raised);color:var(--muted)">Preview</span></span></div>`,
  card([after2('Dana', '+$1,429', [['chipsOut', '+1,620'], ['food', '−110'], ['piggy', '−81']]), after2('Andro', '+$526', [['chipsOut', '+460'], ['food', '+89'], ['piggy', '−23']]), after2('Lena', '+$429', [['chipsOut', '+430'], ['food', '+21'], ['piggy', '−22']]),
    after2('Tomáš', '−$500'), after2('Ivo', '−$780'), after2('Petr', '−$1,230')].join('')),
  note('Provisional until you settle. Tap any figure below to change it.'),
].join('');

/* Each rule can be changed here too (owner, 26 November): a Change pill in its head opens its editor. */
const blockHead = (name, total, change = true) => `<div style="display:flex;align-items:center;gap:8px;padding:12px 0 4px"><b style="font:700 16px/1.2 var(--head);flex:1;min-width:0">${name}</b>${change ? `<span style="display:inline-flex;align-items:center;gap:5px;font:600 12.5px/1 var(--body);padding:6px 10px;border-radius:999px;background:var(--raised);color:var(--text)">${ico('pencil', 12)}Change</span>` : ''}<b class="num" style="font-size:16.5px">${total}</b></div>`;
/* The same rows as the rest of the app (owner, 25 November): a share is a player row with its working under the name and its pencil; a spend is the bill's own row. */
const share = (name, amount, working = 'share of the bill') =>
  `<div class="row"><span class="n">${name}<small>${working}</small></span><span class="a">${amount}</span><span class="muted">${ico('pencil', 15)}</span></div>`;
const worked = (name, working, amount) =>
  `<div class="row"><span class="n">${name}<small>${working}</small></span><span class="a">${amount}</span></div>`;
const spend = (at, what, who, amount) =>
  `<div class="row"><span class="muted num" style="flex:none;width:38px;font-size:12.5px;font-weight:600">${at}</span><span class="n">${what}<small>${who}</small></span><span class="a">${amount}</span></div>`;

export const section = { title: 'Ending the night: count and deductions', blurb: 'Steps 1 and 2 of the three that close a night: every stack is counted until the money adds up, then the group’s rules take their shares before anyone is told who pays whom.' };

export default [
  { id: 'count-up', route: '/count-up', name: 'Count up', nav: 'push', allowOverflow: true,
    note: 'The gap, its bar and the two sums sit on the ink top, where Tonight keeps the pot; the bar under the gap is the pot’s own share bar read as progress. Next is the bar and stays faint until every stack is in.',
    flags: [
      'On the ink the block is white in every state. The app turns it to the loss colour when every stack is in and the money is off, and to the win colour when it balances; the kit has no win or loss tone that reads on the ink in the light theme. Decide: white only (as drawn), or add on-ink tones to the kit.',
      'Clock times (17:17, 17:23) follow the board’s Tonight and settled screens, not the reference capture, whose clock is whenever it was taken.',
    ],
    html: push({ ...countTop, extra: block({ gap: '−$490', pct: '90%', shares: [4510, 490], accounted: '3 counted, 3 still to count', amount: '$4,510' }),
      body: [label('Still to count · 3'), card([waiting('Tomáš', '$500'), waiting('Ivo', '$1,000'), waiting('Petr', '$1,500')]),
        label('Counted · 3'), card([dana, andro, lena]), termsCard],
      bar: bar('Next', { blocked: true }) }) },

  { id: 'count-up-empty', route: '/count-up', name: 'Count up · nothing counted yet', nav: 'push', allowOverflow: true,
    note: 'As it opens from End this poker night: only the player who cashed out is in.',
    html: push({ ...countTop, extra: block({ gap: '−$2,880', pct: '42%', shares: [2120, 2880], accounted: '1 counted, 5 still to count', amount: '$2,120' }),
      body: [label('Still to count · 5'), card([waiting('Andro', '$500'), waiting('Lena', '$1,000'), waiting('Tomáš', '$500'), waiting('Ivo', '$1,000'), waiting('Petr', '$1,500')]),
        label('Counted · 1'), card([dana]), termsCard],
      bar: bar('Next', { blocked: true }) }) },

  { id: 'count-up-entry', route: '/log', name: 'Count up · counting a stack', nav: 'sheet',
    note: 'The sheet a Still to count row opens (and a counted row reopens, prefilled). Its primary, Save Andro’s count, is the bar.',
    flags: ['The kit’s keypad() has a blank where the app’s count keypad has 00; drawn inline here with the 00.'],
    html: sheet({ behind: 'Count up', title: `Andro <span style="vertical-align:middle;margin-left:4px">${pill('COUNT')}</span>`, sub: 'in for $500 · buy-in',
      body: [
        `<div class="fig" style="text-align:center;font-size:46px;margin:8px 0 4px">$960</div>`,
        card(row({ name: 'Andro’s night', amount: '+$460', tone: 'win' })),
        `<div style="display:flex;align-items:center;gap:10px;font-weight:500;font-size:14px;padding:2px 2px 4px"><span class="muted">${ico('clock', 16)}</span>Stamped 17:23</div>`,
        keypad00,
      ],
      bar: bar('Save Andro’s count') }) },

  { id: 'count-up-off', route: '/count-up', name: 'Count up · every stack in, $20 short', nav: 'push', allowOverflow: true,
    note: 'Out of balance does not block: the gate is the count, so Next is live and leads to It doesn’t add up, where the $20 is named.',
    html: push({ ...countTop, extra: block({ gap: '−$20', pct: '99%', shares: [4980, 20], accounted: '6 counted', amount: '$4,980' }),
      body: [label('Counted · 6'), card([dana, andro, lena, tomas, ivo, counted('Petr', 'counted $250', '−$1,250')]), termsCard],
      bar: bar('Next') }) },

  { id: 'count-up-balanced', route: '/count-up', name: 'Count up · balanced', nav: 'push',
    note: 'Balanced as you approved it (A, 24 November): the word in green, the tick in a green disc, the sum in white. Once the sums agree the block folds to its one line, as the app does after a beat, and the sheet rises to take the room.',
    html: push({ ...countTop, extra: balancedA,
      body: [label('Counted · 6'), card([dana, andro, lena, tomas, ivo, counted('Petr', 'counted $270', '−$1,230')]), termsCard],
      bar: bar('Next') }) },


  { id: 'deductions', route: '/deductions', name: 'Deductions', nav: 'push',
    note: 'In the new look (owner, 24 November: “check with the new UI guide”): the preview is a lifted card under its label, Preview a quiet tag, each winner’s game, food and piggy as icons and figures like the settled night. See who pays whom is the bar. In the app it is an outlined button, deliberately not the filled primary, because this step is a look before a decision; on the board the bar is the only place a screen’s way forward lives. The preview keeps its dashed outline instead of a lifted card: it is provisional.',
    flags: ['The app draws See who pays whom as a secondary (outlined) button on purpose. Putting it in the bar makes it read as a primary; confirm that is wanted.'],
    html: push({ ...dedTop,
      body: [preview,
        card(row({ name: 'Rounding · off', value: 'to the dollar' })),
        note('$120 back to Andro, $50 to Lena · $126 to the piggy bank')],
      bar: bar('See who pays whom') }) },

  { id: 'deductions-rules', route: '/deductions', name: 'Deductions · the rules and the bill', nav: 'push', allowOverflow: true,
    note: 'The same screen scrolled on, in the app’s own rows (owner, 25 November): each rule’s shares as player rows with their working under the name, the bill’s spends as the bill draws them, Add a spend as a lifted chip and the way back to the rules as a lifted row.',
    html: push({ ...dedTop,
      body: [
        card([blockHead('Kitchen &amp; drinks', '$170'),
          `<p class="note" style="font-size:12.5px;margin-bottom:4px">Split between the winners, by the size of each win · Andro fronted $120, Lena $50.</p>`,
          share('Dana', '$110'), share('Andro', '$31'), share('Lena', '$29')]),
        card([blockHead('Group piggy bank · 5%', '$126'),
          worked('Dana', '5% of 1,620', '$81'), worked('Andro', '5% of 460', '$23'), worked('Lena', '5% of 430', '$22')]),
        label('The bill', { right: '$170', quiet: true }),
        card([spend('15:21', 'Pizza', 'Andro fronted it', '$120'), spend('15:53', 'Drinks', 'Lena fronted it', '$50')]),
        `<div style="display:flex"><span class="chip">Add a spend<span class="muted">${ico('plus', 13)}</span></span></div>`,
        `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border-radius:12px;background:var(--card);box-shadow:var(--lift)"><span class="muted">${ico('restart', 17)}</span><span style="flex:1;font:600 14.5px/1.2 var(--body)">Change a rule and look again</span><span class="muted">${ico('chevron', 14)}</span></div>`,
      ],
      bar: bar('See who pays whom') }) },

  { id: 'deductions-not-yet', route: '/deductions', name: 'Deductions · Not yet', nav: 'push',
    html: push({ title: 'Not yet', trailing: '2 of 3',
      body: [para('No rule can take its share until every stack has been counted, because there is nothing yet to take a share of.')],
      bar: bar('Back to the count') }) },

  { id: 'deductions-rule-fails', route: '/deductions', name: 'Deductions · A rule will not settle', nav: 'push',
    flags: ['Under the lede the app prints the engine’s own error message for the rule that failed. It is not a fixed string and was not reproduced, so it is not drawn.'],
    html: push({ title: 'A rule will not settle', trailing: '2 of 3',
      body: [para('Every stack is counted. One of tonight\'s rules cannot be applied, so nothing can be worked out until it is changed or switched off.')],
      bar: bar('Open tonight\'s rules') }) },
];
