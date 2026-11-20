/*
 * The review controls on the published board. `build.mjs --artifact` inlines
 * this file. Verdicts live in the artifact's db: collection `reviews`, one
 * document per spot key (plus `general`), body { status, comment, updatedAt },
 * status being 'approved', 'changes' or ''.
 */
(() => {
  const KEYS = [...document.querySelectorAll('figure.cell[data-key]')].map((e) => e.dataset.key);
  const state = {};
  const busy = {};
  const timers = {};
  const blockFor = (k) => document.querySelector('.rv[data-key="' + k + '"]');
  const note = document.getElementById('rvnote');
  const setNote = (t) => { note.textContent = t; note.hidden = !t; };
  const controls = () => document.querySelectorAll('.rv button, .rv textarea');
  let readOnly = false;
  let col = null;

  function renderSummary() {
    let a = 0, c = 0;
    for (const k of KEYS) {
      const st = state[k] && state[k].status;
      if (st === 'approved') a++;
      else if (st === 'changes') c++;
    }
    document.getElementById('cA').textContent = a + ' approved';
    document.getElementById('cC').textContent = c + ' need work';
    document.getElementById('cO').textContent = (KEYS.length - a - c) + ' to review';
  }

  function renderKey(k) {
    const el = blockFor(k);
    if (!el) return;
    const s = state[k] || {};
    el.querySelectorAll('.rvbtn').forEach((b) => b.setAttribute('aria-pressed', String(s.status === b.dataset.v)));
    const ta = el.querySelector('textarea');
    if (document.activeElement !== ta) ta.value = s.comment || '';
    const cell = el.closest('figure.cell');
    if (cell) {
      cell.classList.toggle('is-approved', s.status === 'approved');
      cell.classList.toggle('is-changes', s.status === 'changes');
    }
  }

  function say(k, text, err) {
    const el = blockFor(k);
    if (!el) return;
    const out = el.querySelector('.rvs');
    out.textContent = text;
    out.classList.toggle('err', !!err);
  }

  function lock(message) {
    readOnly = true;
    controls().forEach((e) => { e.disabled = true; });
    setNote(message);
  }

  async function save(k) {
    if (!col || readOnly) return;
    if (busy[k]) { busy[k] = 'again'; return; }
    busy[k] = true;
    say(k, 'Saving…');
    try {
      const s = state[k] || {};
      await col.doc(k).set({ status: s.status || '', comment: s.comment || '', updatedAt: new Date().toISOString() });
      say(k, 'Saved');
    } catch (e) {
      if (e && e.code === 'invalid_argument') {
        say(k, 'Not saved.', true);
        lock('You can read the reviews here but not change them.');
      } else {
        say(k, 'Not saved. Check your connection, then try again.', true);
      }
    }
    const again = busy[k] === 'again';
    busy[k] = false;
    if (again) save(k);
  }

  function wire() {
    document.querySelectorAll('.rv').forEach((el) => {
      const k = el.dataset.key;
      el.querySelectorAll('.rvbtn').forEach((b) => b.addEventListener('click', () => {
        const s = (state[k] = state[k] || { status: '', comment: '' });
        s.status = s.status === b.dataset.v ? '' : b.dataset.v;
        renderKey(k);
        renderSummary();
        save(k);
      }));
      const ta = el.querySelector('textarea');
      ta.addEventListener('input', () => {
        (state[k] = state[k] || { status: '', comment: '' }).comment = ta.value;
        clearTimeout(timers[k]);
        say(k, '');
        timers[k] = setTimeout(() => { delete timers[k]; save(k); }, 800);
      });
      ta.addEventListener('blur', () => {
        if (timers[k]) { clearTimeout(timers[k]); delete timers[k]; save(k); }
      });
    });
  }

  async function start() {
    let db = null, user = null;
    try { db = await window.claude?.use?.('db'); } catch (e) {}
    if (!db) {
      setNote('Approvals and comments can’t be saved in this view. Open the board on claude.ai while signed in.');
      return;
    }
    try { user = await window.claude?.use?.('user'); } catch (e) {}
    let canWrite = null;
    try { canWrite = user ? await user.can('data.write') : null; } catch (e) {}
    col = db.collection('reviews');
    wire();
    if (canWrite === false) lock('You can read the reviews here but not change them.');
    else controls().forEach((e) => { e.disabled = false; });

    if (!readOnly) setNote('Loading saved reviews…');
    let loaded = false;
    const timer = setTimeout(() => {
      if (!loaded) setNote('Saved reviews can’t be reached yet. What you see may be out of date.');
    }, 10000);
    col.onSnapshot((snap) => {
      for (const ch of snap.docChanges()) {
        const k = ch.doc.id;
        if (busy[k] || timers[k]) continue; /* this view's own edit is newer */
        if (ch.type === 'removed') delete state[k];
        else {
          const v = ch.doc.data() || {};
          state[k] = {
            status: v.status === 'approved' || v.status === 'changes' ? v.status : '',
            comment: typeof v.comment === 'string' ? v.comment : '',
          };
        }
        renderKey(k);
      }
      if (!snap.metadata.fromCache && !loaded) {
        loaded = true;
        clearTimeout(timer);
        if (!readOnly) setNote('');
      }
      renderSummary();
    }, () => {
      clearTimeout(timer);
      setNote('Saved reviews stopped updating. Reload the page to reconnect.');
    });
  }

  renderSummary();
  start();
})();
