/**
 * This round: what the owner asked for on the first cut of the board (22 November).
 *   Home     — "here we can try a more regular footer. let's try several options"
 *   Settled  — "good. but let's explore the footer further in terms of the fonts/sizes"
 * Each option is the approved screen with only its footer changed, so the rest of the board stays as reviewed.
 */
import { barMenu, ico } from '../kit.mjs';
import base from './10-home-tonight.mjs';

const by = Object.fromEntries(base.map((s) => [s.id, s.html]));
const theme = `<span class="inkl">${ico('sun', 20)}</span><span class="inkd">${ico('moon', 20)}</span>`;
const homeWith = (foot, { top = '' } = {}) => {
  let h = by.home.replace(barMenu(), foot);
  if (top) h = h.replace('<div class="eyebrow">', `${top}<div class="eyebrow">`);
  return h;
};

/* Home's footer, five ways. Inline styles use tokens only. */
const pillRow = (bg, extra = '') => `<div style="flex:none;display:flex;gap:10px;align-items:center;padding:12px 18px 24px;background:var(--sheet);${extra}">
  <span style="display:flex;align-items:center;gap:9px;height:44px;padding:0 18px;border-radius:999px;font-weight:700;font-size:15px;color:var(--text);${bg}">${ico('settings', 20)}Settings</span>
  <span style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--text);${bg}">${ico('invite', 20)}</span>
  <span style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--text);margin-left:auto;${bg}">${theme}</span></div>`;
const tab = (icon, word) => `<div class="act" style="flex-direction:column;gap:5px;height:58px;font:600 11.5px/1 var(--body)">${icon}<span>${word}</span></div>`;

const TYPE = [
  ['a', 'As drawn', 'Libre Franklin bold, 18 points, on a 62-point bar. What every screen on the board has now.', ''],
  ['b', 'Larger', 'The same face at 21 points on a 68-point bar. Reads from further away; takes more of the screen.', 'font-size:21px;height:68px'],
  ['c', 'Smaller and lighter', 'Semibold, 16.5 points, on a 56-point bar. Quieter; gives the content 6 points back.', 'font:600 16.5px/1 var(--head);height:56px'],
  ['d', 'The body face', 'Inter semibold at 17, the face the rows are set in, so the action reads as part of the content’s voice rather than a title.', 'font:600 17px/1 var(--body);letter-spacing:-.01em'],
  ['e', 'Small capitals', 'Inter bold at 13, capitals, tracked wide: the section labels’ voice. The most like a label, the least like a sentence.', 'font:700 13px/1 var(--body);letter-spacing:.14em;text-transform:uppercase'],
  ['f', 'Heavy', 'Libre Franklin extra-bold at 19, set tight. The strongest of the six.', 'font:800 19px/1 var(--head);letter-spacing:-.02em'],
];

export const section = { title: 'This round: the type on the bar',
  blurb: 'Still open from your notes: the words on the bar in six sizes and faces, each shown on the settled night and on Tonight. Approve one. Home’s footer is settled: you approved it as drawn, the ink bar with its three controls, so the four alternatives are off the board.' };

export default [
  ...TYPE.map(([k, name, note, css]) => ({ id: `bar-type-${k}`, route: '/settled', name: `Bar type ${k.toUpperCase()} · ${name}`, nav: 'push', wide: true, note,
    html: `<style>.bt-${k} .fb .bar .act:not(.sec){${css}}</style><div class="bt-${k}" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center">${by.settled}${by.session}</div>` })),
];
