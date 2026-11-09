#!/usr/bin/env python3
"""Generates design/handoff-account-and-names/Screens - Account and names.dc.html.

Every frame is written once and rendered in both themes, from the same tokens
the app ships (apps/mobile/src/design/tokens.ts) and the same parts the
game-admin board draws (sheet, rows, the End-this-night hold row)."""
import html, sys

OUT = sys.argv[1]

FT = "-apple-system,'SF Pro Text','Figtree',sans-serif"
FD = "-apple-system,'SF Pro Display','Figtree',sans-serif"

DARK = dict(name='dark', ground='#0A0A0B', text='#FFFFFF', muted='#8B8D93', hair='rgba(255,255,255,.11)',
            sheet='#101013', edge='rgba(255,255,255,.12)', grab='rgba(255,255,255,.22)', btn='#FFFFFF',
            btnFg='#0C0D0F', inset='#0A0A0B', outline='rgba(255,255,255,.5)', home='rgba(255,255,255,.9)',
            chip='rgba(255,255,255,.09)', row='rgba(255,255,255,.07)', loss='#F0705C', lossEdge='#F0705C88',
            wipe='rgba(240,112,92,.34)', field='rgba(255,255,255,.07)', fieldEdge='rgba(255,255,255,.16)')
LIGHT = dict(name='light', ground='#FFFFFF', text='#0C0D0F', muted='#6B6F76', hair='rgba(12,13,15,.1)',
             sheet='#FFFFFF', edge='rgba(12,13,15,.1)', grab='rgba(12,13,15,.18)', btn='#0C0D0F',
             btnFg='#FFFFFF', inset='#FFFFFF', outline='rgba(12,13,15,.5)', home='#0C0D0F',
             chip='rgba(12,13,15,.06)', row='rgba(12,13,15,.05)', loss='#B03A28', lossEdge='#B03A2888',
             wipe='rgba(176,58,40,.28)', field='rgba(12,13,15,.04)', fieldEdge='rgba(12,13,15,.16)')

e = html.escape


def chevron(t):
    return (f'<svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="{t["muted"]}" stroke-width="2" '
            f'stroke-linecap="round" style="flex:none"><path d="M1.5 1.5L6.5 6.5l-5 5"></path></svg>')


def status(t, time='21:40'):
    return (f'<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 30px 0;'
            f'font:600 15px {FT};color:{t["text"]};opacity:.5;flex:none"><span>{time}</span>'
            f'<span style="font:400 13px {FT};color:{t["muted"]}">64%</span></div>')


def home(t):
    return (f'<div style="display:flex;justify-content:center;padding:10px 0 9px;flex:none">'
            f'<span style="width:140px;height:5px;border-radius:3px;background:{t["home"]};display:block"></span></div>')


def pushed_header(t, title, dim=False):
    op = 'opacity:.32;' if dim else ''
    return (f'<div style="{op}flex:none"><div style="display:flex;align-items:center;gap:12px;padding:26px 20px 0">'
            f'<span style="width:36px;height:36px;border-radius:18px;background:{t["chip"]};display:flex;'
            f'align-items:center;justify-content:center;flex:none"><svg width="10" height="17" viewBox="0 0 12 20" '
            f'fill="none" stroke="{t["text"]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M9 2L2 10l7 8"></path></svg></span><h2 style="margin:0;font:800 32px/1 {FD};'
            f'color:{t["text"]};letter-spacing:-.03em">{e(title)}</h2></div></div>')


def section_label(t, text, first=False):
    pad = '0' if first else '22px'
    return (f'<span style="display:block;padding:{pad} 4px 6px;font:700 12px {FT};letter-spacing:.1em;'
            f'text-transform:uppercase;color:{t["muted"]}">{e(text)}</span>')


def srow(t, label, value=None, chevron_on=True, last=False, colour=None):
    border = '' if last else f'border-bottom:1px solid {t["hair"]};'
    val = (f'<span style="margin-left:auto;font:400 13px {FT};color:{t["muted"]};white-space:nowrap;'
           f'overflow:hidden;text-overflow:ellipsis;min-width:0">{e(value)}</span>') if value else ''
    chev = f'<span style="{"" if value else "margin-left:auto;"}display:flex">{chevron(t)}</span>' if chevron_on else ''
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:15px 4px;{border}">'
            f'<span style="font:600 17px {FT};color:{colour or t["text"]};flex:none">{e(label)}</span>{val}{chev}</div>')


def note(t, text):
    return f'<span style="display:block;padding:8px 4px 0;font:400 12.5px/19px {FT};color:{t["muted"]}">{e(text)}</span>'


def frame(label, t, inner):
    return (f'<div style="background:#07080A;padding:11px;border-radius:56px;flex:none;width:max-content">'
            f'<div data-screen-label="{e(label)}{" · light" if t["name"] == "light" else ""}" style="width:var(--pw,393px);'
            f'height:852px;border-radius:46px;overflow:hidden;background:{t["ground"]};display:flex;'
            f'flex-direction:column;box-sizing:border-box">{inner}</div></div>')


def sheet(t, title, body, footer='', close=True, behind=None, body_dim=False, title_size=32):
    behind = behind if behind is not None else pushed_header(t, 'Settings', dim=True)
    x = (f'<span style="width:30px;height:30px;border-radius:15px;background:{t["chip"]};display:flex;'
         f'align-items:center;justify-content:center;flex:none;margin-left:auto"><svg width="12" height="12" '
         f'viewBox="0 0 12 12" fill="none" stroke="{t["text"]}" stroke-width="2.6" stroke-linecap="round">'
         f'<path d="M2 2l8 8M10 2l-8 8"></path></svg></span>') if close else ''
    dim = 'opacity:.4;' if body_dim else ''
    foot = (f'<div style="margin-top:auto;padding:14px 20px 0;display:flex;flex-direction:column;gap:10px;flex:none">'
            f'{footer}</div>') if footer else '<div style="margin-top:auto"></div>'
    return (status(t) + behind +
            f'<div style="margin-top:18px;flex:1;min-height:0;border-radius:26px 26px 0 0;background:{t["sheet"]};'
            f'border-top:1px solid {t["edge"]};display:flex;flex-direction:column">'
            f'<div style="{dim}display:flex;justify-content:center;padding:9px 0 2px"><span style="width:38px;height:5px;'
            f'border-radius:3px;background:{t["grab"]};display:block"></span></div>'
            f'<div style="{dim}display:flex;align-items:center;gap:11px;padding:12px 22px 0"><h2 style="margin:0;'
            f'font:800 {title_size}px/1.05 {FD};color:{t["text"]};letter-spacing:-.03em;text-wrap:balance">{e(title)}</h2>{x}</div>'
            f'<div style="{dim}padding:14px 22px 0;display:flex;flex-direction:column;gap:16px;min-height:0;overflow:hidden">{body}</div>'
            f'{foot}{home(t)}</div>')


def lede(t, text):
    return f'<span style="font:400 16px/1.5 {FT};color:{t["text"]};text-wrap:pretty">{e(text)}</span>'


def foot(t, text):
    return f'<span style="font:400 13px/1.5 {FT};color:{t["muted"]};text-wrap:pretty">{e(text)}</span>'


def caps(t, text):
    return (f'<span style="font:700 11px {FT};letter-spacing:.1em;text-transform:uppercase;'
            f'color:{t["muted"]}">{e(text)}</span>')


def item(t, name, line, last=False):
    border = '' if last else f'border-bottom:1px solid {t["hair"]};'
    return (f'<div style="display:flex;flex-direction:column;gap:3px;padding:11px 0;{border}">'
            f'<span style="font:600 16.5px/1.3 {FT};color:{t["text"]};overflow-wrap:anywhere">{e(name)}</span>'
            f'<span style="font:400 13px/1.45 {FT};color:{t["muted"]};text-wrap:pretty">{e(line)}</span></div>')


def items(t, label, rows):
    out = ''.join(item(t, n, l, i == len(rows) - 1) for i, (n, l) in enumerate(rows))
    return f'<div style="display:flex;flex-direction:column">{caps(t, label)}<div style="display:flex;flex-direction:column;padding-top:2px">{out}</div></div>'


def primary(t, label, disabled=False):
    op = 'opacity:.35;' if disabled else ''
    return (f'<span style="{op}display:block;text-align:center;padding:18px 0;border-radius:8px;background:{t["btn"]};'
            f'color:{t["btnFg"]};font:700 17px {FT};box-shadow:inset 0 0 0 2px {t["inset"]}">{e(label)}</span>')


def secondary(t, label):
    return (f'<span style="display:block;text-align:center;padding:16px 0;border-radius:8px;border:2px solid {t["outline"]};'
            f'color:{t["text"]};font:700 16px {FT}">{e(label)}</span>')


TRASH = ('<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.9" '
         'stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5"></path>'
         '<path d="M10 11v5M14 11v5"></path></svg>')
PHONE = ('<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.9" '
         'stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.5"></rect>'
         '<path d="M4 4l16 16"></path></svg>')
CLIP = ('<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.9" '
        'stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4.5" width="12" height="16" rx="2"></rect>'
        '<path d="M9.5 4.5V3h5v1.5M9.5 10h5M9.5 14h5"></path></svg>')


def hold(t, label, sub, icon=TRASH, holding=False, p=62):
    if holding:
        return (f'<span style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:10px;'
                f'border:1.5px solid {t["loss"]};box-sizing:border-box;background:linear-gradient(90deg,{t["wipe"]} 0%,'
                f'{t["wipe"]} {p}%,transparent {p}%)">{icon.format(c=t["text"])}<span style="display:flex;'
                f'flex-direction:column;gap:2px"><span style="font:700 16.5px {FT};color:{t["text"]}">Keep holding…</span>'
                f'<span style="font:400 12.5px {FT};color:{t["text"]}">Release to cancel</span></span></span>')
    return (f'<span style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:10px;'
            f'border:1.5px solid {t["lossEdge"]};box-sizing:border-box">{icon.format(c=t["loss"])}<span style="display:flex;'
            f'flex-direction:column;gap:2px"><span style="font:700 16.5px {FT};color:{t["loss"]}">{e(label)}</span>'
            f'<span style="font:400 12.5px {FT};color:{t["muted"]}">{e(sub)}</span></span></span>')


def backup_row(t, done=False):
    sub = 'Copied · paste it somewhere you keep things' if done else 'The whole book, as text, on your clipboard'
    lab = 'Backup copied' if done else 'Copy a backup first'
    return (f'<span style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:10px;background:{t["row"]}">'
            f'{CLIP.format(c=t["text"])}<span style="display:flex;flex-direction:column;gap:2px;min-width:0">'
            f'<span style="font:600 16.5px {FT};color:{t["text"]}">{lab}</span><span style="font:400 12.5px {FT};'
            f'color:{t["muted"]}">{sub}</span></span><span style="margin-left:auto;display:flex">{chevron(t)}</span></span>')


def field(t, value='', placeholder='', label=None):
    lab = caps(t, label) if label else ''
    txt = (f'<span style="font:500 17px {FT};color:{t["text"]}">{e(value)}<span style="display:inline-block;width:2px;'
           f'height:20px;background:{t["text"]};vertical-align:-4px;margin-left:1px"></span></span>') if value else \
          (f'<span style="font:500 17px {FT};color:{t["muted"]}"><span style="display:inline-block;width:2px;height:20px;'
           f'background:{t["text"]};vertical-align:-4px;margin-right:1px"></span>{e(placeholder)}</span>')
    return (f'<div style="display:flex;flex-direction:column;gap:7px">{lab}<div style="padding:16px 14px;border-radius:10px;'
            f'background:{t["field"]};border:1.5px solid {t["fieldEdge"]};overflow:hidden;white-space:nowrap">{txt}</div></div>')


def store_line(t):
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:12px 0 0;border-top:1px solid {t["hair"]}">'
            f'<span style="font:400 13px/1.45 {FT};color:{t["muted"]};flex:1;text-wrap:pretty">Deleting doesn’t stop '
            f'your App Store subscription. Cancel it there first.</span><span style="flex:none;padding:9px 12px;'
            f'border-radius:8px;border:1.5px solid {t["outline"]};font:700 13.5px {FT};color:{t["text"]}">Manage '
            f'subscription</span></div>')


# --------------------------------------------------------------------------- frames

def settings_screen(t, account_rows, extra=''):
    body = (section_label(t, 'This phone', first=True) +
            srow(t, 'Copy a backup') + srow(t, 'Restore from a backup', last=True) +
            section_label(t, 'Account') + account_rows + extra)
    return status(t) + pushed_header(t, 'Settings') + \
        f'<div style="padding:22px 22px 0;display:flex;flex-direction:column;flex:1;min-height:0">{body}</div>' + home(t)


def S1(t):
    acc = (srow(t, 'Where it lives', 'Backed up', chevron_on=False) +
           srow(t, 'Name', 'Andro') +
           srow(t, 'Signed in as', 'andro@example.com', chevron_on=False) +
           srow(t, 'Plan', 'Full · founder', chevron_on=False) +
           srow(t, 'Sync now') + srow(t, 'Sign out', last=True))
    extra = (f'<div style="padding-top:22px">{srow(t, "Delete account", last=True)}</div>' +
             note(t, 'Your groups, your seats and what happens to each are shown before anything is deleted.'))
    return settings_screen(t, acc, extra)


def S1w(t):
    acc = (srow(t, 'Where it lives', 'Watching one night', chevron_on=False) + srow(t, 'Sign in', last=True))
    extra = (f'<div style="padding-top:22px">{srow(t, "Remove this phone’s access", last=True)}</div>')
    return settings_screen(t, acc, extra)


GROUPS2 = [('The Thursday game', 'Closed and kept. 3 people keep every night they were in. Nobody can add to it.'),
           ('Andro’s notebook', 'Deleted, with every night in it. Nobody else ever had a seat.')]
SEATS2 = [('Andro in Friday cards', 'Becomes a name again. Kuba still sees every night you played.')]


def S2(t, holding=False):
    body = (lede(t, 'You leave. The record stays.') +
            items(t, 'Groups you run', GROUPS2) + items(t, 'Your seats elsewhere', SEATS2) +
            foot(t, 'Your plan, Full · founder, ends with the account. Signing up again starts on Free.') +
            store_line(t))
    if holding:
        footer = f'<div style="opacity:.4">{backup_row(t, done=True)}</div>' + hold(t, '', '', holding=True)
        return sheet(t, 'Delete your account', body, footer, body_dim=True, behind='')
    footer = backup_row(t) + hold(t, 'Delete account', 'Hold 1.5s · deletes now, no undo')
    return sheet(t, 'Delete your account', body, footer, behind='')


def S2b(t):
    groups = [('The Thursday night game at Levani’s place, upstairs', 'Closed and kept. 6 people keep every night they were in. Nobody can add to it.'),
              ('Summer league 2026 — the long one', 'Closed and kept. Nobody can add to it.'),
              ('Andro’s notebook', 'Deleted, with every night in it. Nobody else ever had a seat.'),
              ('Office cards (Fridays, when nobody is travelling)', 'Deleted, with every night in it. Nobody else ever had a seat.')]
    body = lede(t, 'You leave. The record stays.') + items(t, 'Groups you run', groups) + \
        foot(t, 'Your plan, Full · founder, ends with the account. Signing up again starts on Free.')
    footer = backup_row(t) + hold(t, 'Delete account', 'Hold 1.5s · deletes now, no undo')
    return sheet(t, 'Delete your account', body, footer, behind='')


def S3(t):
    seats = [('Petr in The Thursday game', 'Andro still sees every night you played, and can invite you back.'),
             ('Pete in Friday cards', 'You renamed this seat. It goes back to Petr, the name Kuba gave it.'),
             ('Petr in Sunday at Ola’s', 'Ola still sees every night you played, and can invite you back.')]
    body = (lede(t, 'Your seats become names again.') + items(t, 'Your seats', seats) +
            foot(t, 'Your name, as each admin added it, and the nights you played stay in their group’s history. '
                    'They are the record of money that changed hands.') +
            foot(t, 'This phone loses its nights and stats.'))
    return sheet(t, 'Delete your account', body, hold(t, 'Delete account', 'Hold 1.5s · deletes now, no undo'))


def S4(t):
    body = (lede(t, 'Nothing is attached to this account yet — no group to run, no seat in one.') +
            foot(t, 'Deleting removes your name, your email and your sign-in from the server. '
                    'Being invited again starts a new account.'))
    return sheet(t, 'Delete your account', body, hold(t, 'Delete account', 'Hold 1.5s · deletes now, no undo'))


def S5(t):
    body = lede(t, 'This phone stops seeing the night it was shown. The admin can share it again.')
    return sheet(t, 'Remove this phone’s access', body, hold(t, 'Remove access', 'Hold 1.5s', icon=PHONE))


def S6(t):
    body = (lede(t, 'The Thursday game is being recorded on your account. It started at 20:05.') +
            foot(t, 'Settle it, or take it back and settle it, then come back here. Nothing has been deleted.'))
    return sheet(t, 'A game is running', body, primary(t, 'Go to tonight'))


def S7(t, done=False):
    if done:
        body = lede(t, 'Done. This phone starts over.') + foot(t, 'Opening as a phone with nothing on it…')
    else:
        body = (lede(t, 'Deleting…') +
                f'<span style="display:block;height:4px;border-radius:2px;background:{t["row"]};overflow:hidden">'
                f'<span style="display:block;width:45%;height:4px;background:{t["muted"]}"></span></span>' +
                foot(t, 'Keep the app open. It takes a second or two.'))
    return sheet(t, 'Delete your account', body, close=False)


def S8(t):
    body = (lede(t, 'Nothing was deleted. There was no answer from the server.') +
            foot(t, 'Your account, your groups and your seats are exactly as they were. Try again when you have a signal.'))
    return sheet(t, 'Delete your account', body, hold(t, 'Try again', 'Hold 1.5s · deletes now, no undo'))


CHECK_EMAIL_BEHIND = None


def N1(t, value='', saving=False, error=None):
    body = (lede(t, 'How the people you play with see you when you run a game.') +
            field(t, value, 'Lena') +
            (f'<span style="font:500 13px/1.45 {FT};color:{t["text"]}">{e(error)}</span>' if error else '') +
            foot(t, 'Closing this signs the phone out again. An account needs a name.'))
    footer = primary(t, 'Saving…' if saving else 'Save', disabled=(not value) or saving)
    return sheet(t, 'Your name', body, footer)


def N5(t):
    acc = (srow(t, 'Where it lives', 'Backed up', chevron_on=False) + srow(t, 'Name', 'Andro') +
           srow(t, 'Signed in as', 'andro@example.com', chevron_on=False) +
           srow(t, 'Plan', 'Full · founder', chevron_on=False) + srow(t, 'Sign out', last=True))
    return settings_screen(t, acc)


def R1(t):
    body = (lede(t, 'Everyone in The Thursday game sees this. Andro added you as Petr.') +
            field(t, 'Pete') +
            foot(t, 'If you delete your account, the seat goes back to Petr.'))
    return sheet(t, 'Your name in The Thursday game', body, primary(t, 'Save'), title_size=28)


def roster_row(t, name, sub, last=False):
    border = '' if last else f'border-bottom:1px solid {t["hair"]};'
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:13px 4px;{border}">'
            f'<span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font:600 17px {FT};'
            f'color:{t["text"]}">{e(name)}</span><span style="font:400 13px {FT};color:{t["muted"]}">{e(sub)}</span></span>'
            f'<span style="margin-left:auto;display:flex">{chevron(t)}</span></div>')


def R2(t):
    rows = (roster_row(t, 'Andro', 'You · admin') + roster_row(t, 'Pete', 'Has the app · named themselves · you added Petr') +
            roster_row(t, 'Levani', 'Has the app') + roster_row(t, 'Rati', 'Name only · no app · invite') +
            roster_row(t, 'Goga', 'Name only · no app · invite', last=True))
    return status(t) + pushed_header(t, 'Players') + \
        f'<div style="padding:22px 22px 0;display:flex;flex-direction:column;flex:1">{rows}</div>' + home(t)


def R3(t):
    body = (lede(t, 'Pete chose this name. You added this seat as Petr.') +
            f'<div style="display:flex;flex-direction:column">' +
            srow(t, 'Use Petr again') + srow(t, 'Pays into the piggy bank', 'On', chevron_on=False, last=True) + '</div>' +
            foot(t, 'If Pete changes it again, their choice wins. Every other row of this sheet is as it is today.'))
    return sheet(t, 'Pete', body, '', behind=pushed_header(t, 'Players', dim=True))


# --------------------------------------------------------------------------- board

FRAMES = [
    ('A · Deleting an account', 'One row in Settings, one sheet, four readings. The red is the hold’s and nothing else’s.', [
        ('S1', 'Settings · signed in with an email', S1,
         'Its own group at the foot of Settings, below Sign out and apart from it — the one destructive row on the screen, in ordinary type. The note under it is what makes a tap safe: nothing happens until the sheet has said what will.',
         ['the note under Delete account']),
        ('S1', 'Settings · a watcher', S1w, 'Same place. The row says access, never account.', []),
        ('S2', 'Host · two groups, a seat elsewhere, the store line', S2,
         'Full-height: a host’s sheet is the longest, and its body scrolls under a fixed footer. One stage. Groups first, then seats, then the two things that leave with the account. The backup sits directly above the hold — the last thing the thumb passes. It is a row like the drawer’s, not a button, so it reads as an offer rather than a step.',
         ['“Groups you run”', '“Your seats elsewhere”', 'the deleted line', 'the hold’s sub-line']),
        ('S2', 'Host · holding', lambda t: S2(t, holding=True),
         'H3b exactly: solid border, the wipe in the loss colour, the copy swapped, everything else at 40 %. Backup shown copied.', []),
        ('S2', 'Host · four groups, long names, a closed count of 0', S2b,
         'Full-height; the list scrolls, the backup and hold stay put. A group closed with nobody counted drops the number rather than saying “0 people”.',
         ['the closed line at 0']),
        ('S3', 'Member · three seats, one renamed', S3,
         'No backup row: a member loses nothing a backup would keep. The renamed seat says the admin’s name comes back (part C).',
         ['the renamed line']),
        ('S4', 'An account with nothing in it', S4,
         'Every friend invited and not seated. Says what there is, rather than an empty state.', ['both lines']),
        ('S5', 'A watcher', S5, 'The smallest one. Phone glyph, not the bin: nothing of theirs is deleted.', ['“Remove access”']),
        ('S6', 'Refused · a game is running', S6, 'No hold on the screen. One action, which goes to the night.',
         ['“It started at 20:05.”', '“Nothing has been deleted.”']),
        ('S7', 'Working', lambda t: S7(t, done=False), 'No close: the call is under way and cannot be taken back.', ['“Keep the app open…”']),
        ('S7', 'Done', lambda t: S7(t, done=True), 'A beat, then the app restarts empty. No button.', ['“Opening as a phone with nothing on it…”']),
        ('S8', 'Failed', S8, 'The hold comes back as “Try again”. The account is said to be untouched.', ['“Try again”', 'the second line']),
    ]),
    ('B · Your name at first sign-in', 'After the link lands, for an invite and for a code alike — one place to ask, so N4 is not drawn.', [
        ('N1', 'The name step · empty', lambda t: N1(t),
         'A sheet over Settings. Save is unavailable until something is typed. The close stays — Chrome B is never broken — and closing it signs the phone out again, which is what “required” means.',
         ['“Closing this signs the phone out again.”']),
        ('N2', 'Filled · saving', lambda t: N1(t, 'Andro', saving=True), '', []),
        ('N3', 'Refused · too long', lambda t: N1(t, 'Andro Gegechkori-Machavariani the second', error='Keep it under 40 characters.'),
         'Under the field, in text colour: nothing on this sheet is money, so nothing is red.', ['both refusals']),
        ('N5', 'Settings · the name row', N5, 'Name sits first in Account, above Signed in as. Tapping it opens N1, filled.', []),
    ]),
    ('C · Renaming your own seat', 'From PLAYERS → You, on a member’s phone as on the admin’s. The admin’s name is kept and comes back.', [
        ('R1', 'Your name in a group', R1, 'One sheet per group. The admin’s original is named in the sentence, so the player knows what they are changing.',
         ['the title', 'the footnote']),
        ('R2', 'The admin’s roster · one seat renamed', R2, 'The roster says who chose the name, and what the admin had typed.',
         ['“named themselves · you added Petr”']),
        ('R3', 'The admin opens that seat', R3, 'One row more than today: put their own name back. The player can change it again; their choice wins.',
         ['“Use Petr again”', '“their choice wins”']),
    ]),
]

ANSWERS = [
    ('1 · The backup', 'A row inside S2, directly above the hold — not a first stage. A stage would make every deletion two screens long to protect the minority who host a private group; a row costs nothing to ignore and is the last thing a thumb passes. Only where something is deleted.'),
    ('2 · Several groups', 'A line each, name over outcome. Holds at four with long names (S2, third frame): names wrap, the list scrolls inside a full-height sheet, the hold never moves.'),
    ('3 · Where S1 sits', 'Its own group at the foot of Settings, under Account, with a note. Apart from every row that is not destructive, in ordinary type — the red is the hold’s alone.'),
    ('4 · Closed at 0', 'The count is dropped, not printed: “Closed and kept. Nobody can add to it.”'),
    ('5 · Where the name is asked', 'After the link, for both ways in — one place, so the code sheet is unchanged. Closing the step signs the phone out again; that is what makes it required without breaking Chrome B.'),
    ('6 · Renaming', 'From PLAYERS → You, for anybody with a seat. The admin sees “named themselves · you added Petr” and can put their own name back, which the player can change again. The admin’s account name and their seat stay two names: the account name is read only when the admin holds no seat.'),
]


def annot(num, title, text, unsure):
    tags = ''.join(
        f'<span style="font:400 12px/1.5 {FT};color:#6C6C70;display:flex;gap:6px;align-items:baseline">'
        f'<span style="padding:3px 7px;border-radius:5px;background:rgba(138,90,0,.1);font:700 9.5px {FT};'
        f'letter-spacing:.11em;color:#8A5A00;flex:none">UNSURE</span><span>{e(u)}</span></span>' for u in unsure)
    return (f'<div style="display:flex;flex-direction:column;gap:6px;padding-left:6px;max-width:405px">'
            f'<div style="display:flex;align-items:center;gap:8px"><span style="font:800 16px {FD};color:#0B0B0F">{num}</span>'
            f'<span style="font:700 14px {FT};color:#0B0B0F">{e(title)}</span></div>'
            + (f'<span style="font:400 12.5px/1.5 {FT};color:#6C6C70;text-wrap:pretty">{e(text)}</span>' if text else '')
            + tags + '</div>')


def build():
    parts = []
    head = (f'<div style="position:sticky;left:0;width:100vw;box-sizing:border-box;padding:40px 48px 28px;background:#F1F0EC;'
            f'z-index:5;display:flex;flex-direction:column;gap:8px"><span style="font:600 11px/1 {FT};letter-spacing:.16em;'
            f'text-transform:uppercase;color:#8E8E93">The poker club · your account and your name</span><h1 style="margin:0;'
            f'font:800 30px/1.12 {FD};color:#0B0B0F;letter-spacing:-.025em">Deleting an account, your name at sign-in, and '
            f'renaming your own seat</h1><p style="margin:0;font:400 14px/1.6 {FT};color:#6C6C70;max-width:860px">'
            f'Drawn 9 November from <code>docs/design-request-account-deletion.md</code> Part 2, against what the server '
            f'already does (0024–0029). Every state dark above, light below, 393 × 852; switch to 360 in Tweaks. Built only '
            f'from parts already in the system: the sheet, the Settings row, the drawer row, and the one destructive hold, '
            f'End this poker night (H3/H3b). Strings are proposed; the ones I am least sure of carry UNSURE.</p></div>')
    parts.append(head)
    ans = ''.join(f'<div style="flex:1;min-width:340px;max-width:520px;background:#FFFFFF;border:1px solid #E2E3E7;'
                  f'border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:6px"><span style="font:700 14px {FT};'
                  f'color:#0B0B0F">{e(a)}</span><span style="font:400 13px/1.55 {FT};color:#4A4D55">{e(b)}</span></div>'
                  for a, b in ANSWERS)
    parts.append(f'<section id="answers" style="display:flex;flex-direction:column;gap:20px;padding:42px 48px 54px;width:max-content;'
                 f'min-width:100vw;box-sizing:border-box;border-bottom:1px solid rgba(11,11,15,.12)"><div style="position:sticky;'
                 f'left:48px;display:flex;flex-direction:column;gap:7px"><span style="font:600 11px/1 {FT};letter-spacing:.14em;'
                 f'text-transform:uppercase;color:#8E8E93">Read first</span><h2 style="margin:0;font:800 25px/1.15 {FD};'
                 f'color:#0B0B0F">The six open questions, answered</h2></div><div style="display:flex;gap:14px;flex-wrap:wrap;'
                 f'position:sticky;left:48px;width:calc(100vw - 96px)">{ans}</div></section>')
    for title, sub, frames in FRAMES:
        cells = []
        for num, label, fn, text, unsure in frames:
            cells.append(f'<div style="display:flex;flex-direction:column;gap:12px;flex:none;width:max-content">'
                         f'{annot(num, label, text, unsure)}{frame(f"{num} · {label}", DARK, fn(DARK))}'
                         f'{frame(f"{num} · {label}", LIGHT, fn(LIGHT))}</div>')
        parts.append(f'<section style="display:flex;flex-direction:column;gap:24px;padding:42px 48px 54px;width:max-content;'
                     f'min-width:100vw;box-sizing:border-box;border-bottom:1px solid rgba(11,11,15,.12)"><div style="position:sticky;'
                     f'left:48px;display:flex;flex-direction:column;gap:7px"><span style="font:600 11px/1 {FT};letter-spacing:.14em;'
                     f'text-transform:uppercase;color:#8E8E93">{e(title)}</span><h2 style="margin:0;font:800 25px/1.15 {FD};'
                     f'color:#0B0B0F;letter-spacing:-.02em">{e(sub)}</h2></div><div style="display:flex;align-items:flex-start;'
                     f'gap:26px">{"".join(cells)}</div></section>')
    doc = ('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
           '<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet><meta name="design_doc_mode" content="canvas">\n'
           '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
           f'<style>body{{margin:0;background:#F1F0EC;font-family:{FT}}}code{{font:500 12px ui-monospace,Menlo,monospace}}</style></helmet>\n'
           + '\n'.join(parts) +
           '\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props="{&quot;$preview&quot;:{&quot;width&quot;:1600,&quot;height&quot;:1100},'
           '&quot;previewWidth&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;393&quot;,&quot;360&quot;],&quot;default&quot;:'
           '&quot;393&quot;,&quot;tsType&quot;:&quot;\'393\' | \'360\'&quot;,&quot;section&quot;:&quot;Check&quot;}}">\n'
           'class Component extends DCLogic {\n  apply() { document.documentElement.style.setProperty(\'--pw\', (this.props.previewWidth ?? \'393\') + \'px\'); }\n'
           '  componentDidMount() { this.apply(); }\n  componentDidUpdate() { this.apply(); }\n  renderVals() { return {}; }\n}\n</script>\n</body>\n</html>\n')
    open(OUT, 'w').write(doc)
    print(OUT, len(doc))


build()
