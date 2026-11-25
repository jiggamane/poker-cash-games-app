/**
 * Home's first three tiles: Sessions (/games), My stats (/stats), The group
 * (/players) and one member of it (/member).
 *
 * Sessions and My stats are places: nothing to confirm, so no bar. The group
 * ends in "Add a player by name", the member sheet in "Done".
 */
import { push, sheet, bar, label, card, row, note, quiet, field, seg, toggle, ico, topDropdown } from '../kit.mjs';

/* ── parts the kit does not have (see the report) ─────────────────────── */

/** The group control when there is one group or none: the app draws it as a label, not a menu. */
const scopeLabel = (text) => `<span class="tdd">${text}</span>`;

/** One night in a list (the app's GameRow): date and result, then the annotation line. No rule between rows, no chevron. */
const night = ({ date, net, tone, group = '', players, time }) =>
  `<div style="padding:9px 0">
    <div class="split" style="align-items:center"><span style="font-size:15.5px;font-weight:600">${date}</span><b class="num ${tone}" style="font-size:16.5px">${net}</b></div>
    <div class="muted" style="display:flex;align-items:center;gap:7px;font-size:11.5px;margin-top:4px;white-space:nowrap">${group ? `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${group}</span>` : ''}<span style="display:inline-flex;align-items:center;gap:3px;flex:none">${ico('people', 12)}${players} players</span><span style="display:inline-flex;align-items:center;gap:3px;flex:none">${ico('clock', 12)}${time}</span></div>
  </div>`;
const nights = (list) => card(list.map(night), { style: 'padding:4px 12px' });

/** The figure card: the stretch, the period tabs, the net, and the two stat pairs. */
/*
 * The games-and-hours line beside the net. 'plain' is the muted line as first drawn; the owner, 24
 * November: "try smth different for '6 games, 25h' in terms of font color/style". Three options:
 *   'figures'  the counts in the figure face and the text colour, the words muted
 *   'icons'    each count after its icon, in the text colour, as the night rows below write them
 *   'pills'    the two facts as raised pills
 */
export const META_STYLES = ['figures', 'icons', 'pills'];
const metaLine = (meta, style) => {
  const [games, hours] = meta.split(' · ');
  const split = (t) => t.replace(/^(\S+)\s*(.*)$/, (_, n, w) => `<b class="num" style="font:700 15px/1 var(--head);color:var(--text)">${n}</b>${w ? ` <span class="muted">${w}</span>` : ''}`);
  if (style === 'figures') return `<span style="font-size:12.5px;white-space:nowrap">${split(games)}<span class="muted"> · </span>${split(hours.replace(/^(\d+)\s*h$/, '$1 h'))}</span>`;
  if (style === 'icons') return `<span style="display:flex;gap:10px;font:600 12.5px/1 var(--body);color:var(--text);white-space:nowrap"><span style="display:inline-flex;gap:4px;align-items:center">${ico('calendar', 14)}${games}</span><span style="display:inline-flex;gap:4px;align-items:center">${ico('clock', 14)}${hours}</span></span>`;
  if (style === 'pills') return `<span style="display:flex;gap:6px">${[games, hours].map((t) => `<span style="font:600 12px/1 var(--body);padding:6px 9px;border-radius:999px;background:var(--raised);color:var(--text);white-space:nowrap">${t}</span>`).join('')}</span>`;
  return `<span class="muted num" style="font-size:12px;white-space:nowrap">${meta}</span>`;
};

export const figureCard = ({ eyebrow, net, tone = '', meta, won, lost, avg, avgTone = '', metaStyle = 'plain' }) => {
  const tab = (t, on) => `<span style="font-size:11.5px;padding-bottom:3px;${on ? 'font-weight:700;color:var(--text);box-shadow:inset 0 -1.5px 0 var(--text)' : 'font-weight:500;color:var(--muted)'}">${t}</span>`;
  const cap = (t) => `<div class="muted" style="font:700 10px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${t}</div>`;
  return card([
    `<div class="split" style="align-items:flex-start"><span class="muted" style="font:700 11px/1.2 var(--body);letter-spacing:.12em;text-transform:uppercase">${eyebrow}</span><span style="display:flex;gap:12px">${tab('Month', true)}${tab('Year')}${tab('All time')}</span></div>`,
    `<div class="split" style="margin-top:10px"><span class="fig ${tone}" style="font-size:34px">${net}</span>${metaLine(meta, metaStyle)}</div>`,
    `<div class="hr" style="margin:12px 0"></div>`,
    `<div class="split" style="align-items:flex-end"><div>${cap('Won / lost')}<b class="num" style="font-size:18px"><span class="win">${won} W</span><span class="muted"> · </span><span class="red">${lost} L</span></b></div>
      <div style="text-align:right">${cap('Avg / night')}<b class="num ${avgTone}" style="font-size:18px">${avg}</b></div></div>`,
  ], { pad: true, style: 'padding:16px' });
};

/**
 * The result-per-night graph. cols: [dateLabel, height in px (+ above the line, − below, 0 = break-even)].
 * Up to eight columns, left-aligned at a fixed width. Losses red (owner, 23 November); wins green (owner, 24 November,
 * on this chart: "green" — it replaces the earlier ink bars and is the one green fill on the board).
 */
export const chart = (caption, cols) => {
  const W = 266, CW = W / 8, BAND = 38, BW = 15;
  const marks = cols.map(([lbl, h], i) => {
    const cx = i * CW + CW / 2, x = (cx - BW / 2).toFixed(1);
    /* Every bar stands on the line with no gap (owner, 24 November: "put this on the line, no gap"): square
       where it meets the line, rounded only at its free end, and drawn through the line's own pixel. */
    const bar = (h, fill) => {
      const L = Math.max(8, Math.abs(h)), r = 3, x0 = +x, x1 = x0 + BW, base = BAND + 0.5;
      const end = h > 0 ? base - L : base + L, s = h > 0 ? 1 : -1;
      return `<path d="M${x0} ${base}V${end + s * r}Q${x0} ${end} ${x0 + r} ${end}H${x1 - r}Q${x1} ${end} ${x1} ${end + s * r}V${base}Z" style="fill:${fill}"/>`;
    };
    const b = h > 0 ? bar(h, 'var(--win)')
      /* A loss is a red bar at least 8 tall, so a small one still reads as a bar and as red, not as a dash
         (owner, 24 November: "the graph should also use red for losses"). */
      : h < 0 ? bar(h, 'var(--red)')
      /* Break-even: one grey pill as wide as a bar, centred on the line — one piece, not the two marks the
         owner called a hamburger, and as wide as the others and thin, 3 tall (owner, 24 November). */
      : `<rect x="${x}" y="${BAND + 0.5 - 1.5}" width="${BW}" height="3" rx="1.5" style="fill:var(--muted)"/>`;
    return `${b}<text x="${cx}" y="${BAND * 2 + 15}" text-anchor="middle" style="fill:var(--muted);font:500 9.5px var(--body)">${lbl}</text>`;
  }).join('');
  return card([
    `<div class="muted" style="font:700 11px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px">${caption}</div>`,
    `<svg viewBox="0 0 ${W} ${BAND * 2 + 20}" width="100%" style="display:block" role="img" aria-label="${caption}"><rect x="0" y="${BAND}" width="${W}" height="1" style="fill:var(--line)"/>${marks}</svg>`,
  ], { pad: true, style: 'padding:14px 14px 10px' });
};

const lastGames = label('Last games', { quiet: true, right: '<span class="muted" style="font:500 12.5px/1 var(--body)">See all</span>' });

/** The small outlined action at the end of a roster row. */
const invite = `<span style="flex:none;height:32px;padding:0 12px;border-radius:10px;display:inline-flex;align-items:center;font:600 13px/1 var(--body);box-shadow:inset 0 0 0 1.5px var(--outline)">Invite</span>`;
const person = (name, meta, canInvite = false) => row({ name, meta, trail: canInvite ? invite : '' });

const filter = (on) => seg(['Everyone', 'Who can run a game'], on);
const nameOnly = ['Dana', 'Lena', 'Tomáš', 'Ivo', 'Petr', 'Radka'];
const runsTheGames = [label('Runs the games', { quiet: true }), card(person('You, Andro', 'admin · opens and records'))];

const SEEDED = 'The app keeps the seeded night out of the book (it is demo data), so on the seeded app this screen is the empty state. The night drawn is the seeded one as the app would list it for Andro: Fri 20 Nov, +$526, 6 players, 3h 16m.';

const said = (t) => `<span class="muted" style="flex:none;font-size:13.5px;white-space:nowrap">${t}</span>`;
const memberRows = card([
  row({ name: 'Standing', trail: said('Name only · this is me') }),
  row({ name: 'App', value: 'no app · invite' }),
  row({ name: 'Pays into the piggy bank', trail: toggle(true) }),
  row({ name: 'Their nights', value: 'stats and history' }),
]);
const memberNote = note('Removing somebody keeps every night they played. The ledger keeps what they already played, and anything unsettled stays on the night it came from.');
const memberSheet = (nameField, foot) => sheet({ behind: 'Players', title: 'Dana',
  body: [label('Name', { quiet: true }), nameField, memberRows, memberNote, quiet('Remove from the group', { red: true })], bar: foot });

export const statsBookHtml = (metaStyle = 'plain') =>
  push({ title: 'My stats', trailing: topDropdown('All groups'),
      body: [
        figureCard({ eyebrow: 'August', net: '+$610', tone: 'win', meta: '6 games · 25 h', won: 4, lost: 2, avg: '+$102', avgTone: 'win', metaStyle }),
        chart('Last 8 nights', [['12 Jul', -15], ['19 Jul', 8], ['26 Jul', -6], ['1 Aug', 22], ['5 Aug', 0], ['8 Aug', -4], ['12 Aug', 13], ['15 Aug', 38]]),
        lastGames,
        nights([
          { date: 'Sat 15 Aug', net: '+$540', tone: 'win', group: 'The poker club', players: 7, time: '4h 20m' },
          { date: 'Wed 12 Aug', net: '+$180', tone: 'win', group: 'Office game', players: 5, time: '3h 00m' },
          { date: 'Fri 8 Aug', net: '−$60', tone: 'red', group: 'The poker club', players: 8, time: '5h 10m' },
          { date: 'Tue 5 Aug', net: '+$40', tone: 'win', group: 'Office game', players: 6, time: '2h 45m' },
        ]),
      ] });


/* Placeholders for a book with no nights yet: the chart's own shapes and two list rows, in the faint grey. */
const ghostChart = chart('Last 8 nights', [['', 14], ['', -8], ['', 20], ['', 6], ['', -12], ['', 26], ['', 10], ['', 32]])
  .replace(/fill:var\(--(win|red|muted)\)/g, 'fill:var(--raised)').replace(/<text[^>]*><\/text>/g, '');
const ghostLine = (w, h = 10) => `<span style="display:block;width:${w};height:${h}px;border-radius:${h / 2}px;background:var(--raised)"></span>`;
const ghostGames = card([1, 2].map(() => `<div style="padding:12px 0;display:grid;gap:8px"><div class="split" style="align-items:center">${ghostLine('42%', 12)}${ghostLine('18%', 12)}</div>${ghostLine('64%', 8)}</div>`).join('<div class="hr" style="margin:0"></div>'), { style: 'padding:2px 12px' });

export const section = { title: 'Sessions, stats and the group', blurb: 'Home’s first three tiles: the list of nights, where a player stands over a stretch, and the roster with one member’s sheet.' };

export default [
  { id: 'games', route: '/games', name: 'Sessions', nav: 'push',
    note: 'A place, so no bar. The list is one card; the rows keep the app’s rule of no line between nights.',
    flags: [SEEDED],
    html: push({ title: 'Sessions', subRight: scopeLabel('All groups'),
      body: [nights([{ date: 'Fri 20 Nov', net: '+$526', tone: 'win', players: 6, time: '3h 16m' }])] }) },

  { id: 'games-empty', route: '/games', name: 'Sessions · no nights yet', nav: 'push',
    html: push({ title: 'Sessions', subRight: scopeLabel('All groups'),
      body: [note('No nights yet. One appears here the moment it is settled.')] }) },

  { id: 'stats', route: '/stats', name: 'My stats', nav: 'push',
    note: 'A place, so no bar. The figure card loses its green wash (no green fills) and is a lifted card like the others; win bars are ink, loss bars red.',
    flags: [SEEDED, 'Not captured, written the way the app formats them for that one night: “1 game · 3 h”, “1 W · 0 L”, “+$526” average, “Last 1 night”, “20 Nov”.',
      'The app tints the figure card with the win colour whatever the figure is. The approved look has no green fills, so the tint is gone: confirm.'],
    html: push({ title: 'My stats', trailing: scopeLabel('All groups'),
      body: [
        figureCard({ eyebrow: 'November', net: '+$526', tone: 'win', meta: '1 game · 3 h', won: 1, lost: 0, avg: '+$526', avgTone: 'win' }),
        chart('Last 1 night', [['20 Nov', 38]]),
        lastGames,
        nights([{ date: 'Fri 20 Nov', net: '+$526', tone: 'win', group: 'The Thursday game', players: 6, time: '3h 16m' }]),
      ] }) },

  { id: 'stats-book', route: '/stats', name: 'My stats · a fuller book', nav: 'push',
    note: 'The same screen with eight nights behind it, to judge the chart: wins above the line in green, losses below in red, and the break-even night as one grey bead on the line (owner, 24 November). Every bar is at least 8 tall, so a small loss still reads red. The games-and-hours line keeps its first style: the owner passed over the three options.',
    flags: ['Every figure and name here is the design handoff’s sample (design/handoff-sessions-stats, frame 2a), not the seeded night. The sample disagrees with itself about 5 Aug: $0 in the chart, +$40 in the list.',
      'The app draws the break-even night in yellow. The kit has no yellow token, so it is drawn muted: decide its colour.'],
    html: statsBookHtml() },

  { id: 'stats-empty', route: '/stats', name: 'My stats · no nights yet', nav: 'push',
    note: 'Before the first night (owner, 25 November): the chart and the list are drawn as placeholders in the faint grey, the shapes the real ones will take, so a new player sees what fills in once they play.',
    flags: ['The app draws no graph and no list until there is a night; these placeholders are new.'],
    html: push({ title: 'My stats', trailing: scopeLabel('All groups'),
      body: [
        figureCard({ eyebrow: 'November', net: '$0', meta: '0 games · 0h 00m', won: 0, lost: 0, avg: '$0' }),
        ghostChart,
        lastGames,
        ghostGames,
        note('No nights yet. Your first one shows up here the moment it is settled.'),
      ] }) },

  { id: 'players', route: '/players', name: 'Players', nav: 'push',
    note: 'The bar is the add, faint until a name is typed. Rows lose the initial circle and the chevron; Invite stays on the row as a small outlined action.',
    flags: ['Home’s tile calls this screen “The group”; the screen’s own title is “Players”. Both are the app’s.'],
    html: push({ title: 'Players', sub: '7 on the roster',
      body: [
        filter(0),
        field('', 'Their name', { placeholder: true }),
        ...runsTheGames,
        label('Name only · 6', { quiet: true }),
        card(nameOnly.map((n) => person(n, 'no app yet', true))),
      ],
      bar: bar('Add a player by name', { blocked: true }) }) },

  { id: 'players-typing', route: '/players', name: 'Players · a name typed', nav: 'push',
    note: 'The bar takes the name. A name already on the roster keeps it blocked and reads “Radka is already here”.',
    flags: ['“Honza” is a sample of typed input (the handoff’s own name-only example), not seeded data.'],
    html: push({ title: 'Players', sub: '7 on the roster',
      body: [
        filter(0),
        field('', 'Honza', { focus: true }),
        ...runsTheGames,
        label('Name only · 6', { quiet: true }),
        card(nameOnly.map((n) => person(n, 'no app yet', true))),
      ],
      bar: bar('Add Honza') }) },

  { id: 'players-runners', route: '/players', name: 'Players · Who can run a game', nav: 'push',
    note: 'The filter keeps Runs the games and Can take a game. Nobody on the seeded roster has the app, so only the admin is left.',
    html: push({ title: 'Players', sub: '7 on the roster',
      body: [filter(1), field('', 'Their name', { placeholder: true }), ...runsTheGames],
      bar: bar('Add a player by name', { blocked: true }) }) },

  { id: 'players-member', route: '/players', name: 'Players · a member reading', nav: 'push',
    note: 'Read-only: no field, no Invite, no bar. The line saying who can pass a game closes the list instead of sitting in a footer band.',
    flags: ['Illustrative roster: the seed has nobody with the app, so Tomáš and Lena are drawn as members to show “Can take a game”. Every string is the app’s.',
      'The app pins “Only Andro can pass a game…” in a footer band. With the footer now meaning the action, it is drawn as the last line of the content: confirm.'],
    html: push({ title: 'Players', sub: '7 on the roster',
      body: [
        filter(0),
        label('Runs the games', { quiet: true }),
        card(person('Andro', 'admin · opens and records')),
        label('Can take a game · 2', { quiet: true }),
        card([person('You, Tomáš', 'any night'), person('Lena', 'any night')]),
        label('Name only · 4', { quiet: true }),
        card(['Dana', 'Ivo', 'Petr', 'Radka'].map((n) => person(n, 'no app yet'))),
        note('Only Andro can pass a game. This list is for knowing who could take one.'),
      ] }) },

  { id: 'member', route: '/member', name: 'A player', nav: 'sheet',
    note: 'Done is the bar. Remove from the group was a second full-width button under it; it is now the red quiet action at the end of the content.',
    flags: ['“· this is me” on the Standing row and the borrowed “… is already here” label are marked in the app’s source as copy that was never drawn and wants review.',
      'Not drawn: the admin’s own sheet (an “admin” badge beside the name, Standing “Admin · this is you”, App “has the app”), an invited player (“invited” badge, App “invited · link out”), and the block shown when a player renamed their own seat.'],
    html: memberSheet(field('', 'Dana'), bar('Done')) },

  { id: 'member-rename', route: '/member', name: 'A player · name changed', nav: 'sheet',
    flags: ['“Danka” is a sample of typed input.'],
    html: memberSheet(field('', 'Danka', { focus: true }), bar('Save the name')) },

  { id: 'member-clash', route: '/member', name: 'A player · name already taken', nav: 'sheet',
    html: memberSheet(field('', 'Lena', { focus: true }), bar('Lena is already here', { blocked: true })) },
];
