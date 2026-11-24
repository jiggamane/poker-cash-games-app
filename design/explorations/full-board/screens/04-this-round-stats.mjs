/**
 * This round: options the owner asked for, at the top of the board until one is picked.
 *
 * 24 November, on My stats (`stats-book`): "try smth different for '6 games, 25h' in terms of font
 * color/style". The same screen three times, only that line changed. The words are the app's own.
 */
import { statsBookHtml } from './70-sessions-stats-group.mjs';

export const section = {
  title: 'This round: the games-and-hours line on My stats',
  blurb: 'Three ways to set “6 games · 25 h” beside the month’s result, on the fuller book. Everything else on the screen is as before; the break-even night has lost its $0.',
};

export default [
  { id: 'stats-meta-a', route: '/stats', name: 'A · the counts as figures', nav: 'push',
    note: 'The two counts in the figure face and the text colour, their words muted: read as numbers at a glance, like the W and L below.',
    html: statsBookHtml('figures') },
  { id: 'stats-meta-b', route: '/stats', name: 'B · each count after its icon', nav: 'push',
    note: 'A calendar and a clock, as the night rows under the chart write players and hours; the words in the text colour.',
    html: statsBookHtml('icons') },
  { id: 'stats-meta-c', route: '/stats', name: 'C · two pills', nav: 'push',
    note: 'The two facts as raised pills, the way the settled night carries its terms: the line reads as tags on the month, not as a sentence.',
    html: statsBookHtml('pills') },
];
