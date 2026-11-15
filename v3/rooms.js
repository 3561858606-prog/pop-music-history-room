// Hash routes keep static hosting portable and each learning space independent.
export function parseRoom(hash = '') {
  const [name, id] = hash.replace(/^#\/?/, '').split('/');
  // The library merged into the archive; old links land on the wall.
  if (name === 'library') return { name: 'archive', id: '' };
  return { name: ['home', 'train', 'report', 'archive', 'history'].includes(name) ? name : 'home', id: id || '' };
}
export function createRooms({ window: win, document: doc, onRoute }) {
  win.history.scrollRestoration='manual';
  let current = { name: 'home', id: '' };
  // A room transition (ui/transitions.js) may ask to take the old frame first. The whole change — route, history, rooms,
  // events — then runs a frame later inside the browser's view-transition update, so the old page is captured exactly as it
  // was. Until then nothing has changed. Work that needs the new room on screen waits in settled().
  let transition = null, pending = null, after = [];
  function show(requested, { replace = false, fromHistory = false, animate = true } = {}) {
    const next = onRoute(requested) || { name: 'home', id: '' };
    const hash = '#' + next.name + (next.id ? '/' + next.id : '');
    if (win.location.hash !== hash) win.history[replace || fromHistory ? 'replaceState' : 'pushState']({ room: next.name }, '', hash);
    const previous = current;
    win.dispatchEvent(new CustomEvent('museum:room-before',{detail:{name:next.name,previous:previous.name}}));
    current = next;
    doc.body.dataset.room = next.name;
    for (const name of ['home', 'train', 'report', 'archive', 'history']) {
      const el = doc.getElementById(name + 'Room');
      if (el) el.hidden = name !== next.name;
    }
    const sidebar=doc.querySelector('.sidebar');
    if(sidebar && !sidebar.closest('#settingsDrawer')) sidebar.hidden=next.name!=='home';
    const pageHeading=doc.querySelector('.page-heading');
    if(pageHeading)pageHeading.hidden=next.name!=='home';
    const panel = doc.getElementById('archivePanel');
    // The archive wall lives in the archive room only; training and results no longer embed a second copy of it.
    const slot = doc.getElementById('archiveSlot');
    if (slot && panel && panel.parentElement !== slot) slot.append(panel);
    if (panel) panel.hidden = next.name !== 'archive';
    const labels = {home:'01 / 音乐档案馆',train:'02 / 专注听辨',report:'03 / 结果',archive:'年代图鉴',history:'结果'};
    doc.getElementById('roomLabel').textContent = labels[next.name];
    doc.getElementById('practiceTab').setAttribute('aria-pressed', String(next.name === 'home'));
    doc.title = (labels[next.name].split(' / ').pop()) + ' · 大众音乐史复习室';
    const el = doc.getElementById(next.name + 'Room');
    win.dispatchEvent(new CustomEvent('museum:room',{detail:{name:next.name,previous:previous.name}}));
    if (previous.name !== next.name) {
      win.scrollTo?.({ top: 0, behavior: 'instant' });
      const heading = el?.querySelector('h1,h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
    return next;
  }
  function settle() { const list = after; after = []; list.forEach(fn => { try { fn(); } catch (error) { win.reportError?.(error); } }); }
  function request(requested, options = {}) {
    if (pending) pending(); // a newer change: the older one lands first, without its transition
    if (options.animate !== false && transition && requested.name !== current.name) {
      let done = false, result = null;
      const run = () => {
        if (done) return result;
        done = true; if (pending === run) pending = null;
        try { result = show(requested, options); } finally { if (!pending) settle(); }
        return result;
      };
      let deferred = false;
      try { deferred = transition({ name: requested.name, previous: current.name, fromHistory: !!options.fromHistory, trusted: !!options.trusted }, run) === true; } catch { deferred = false; }
      if (deferred) { pending = run; win.setTimeout(run, 1500); return null; }
      return run();
    }
    return show(requested, options);
  }
  win.addEventListener('popstate', e => request(parseRoom(win.location.hash), { fromHistory: true, trusted: e.isTrusted }));
  win.addEventListener('hashchange', e => {
    const next = parseRoom(win.location.hash);
    if (next.name !== current.name || next.id !== current.id) request(next, { fromHistory: true, trusted: e.isTrusted });
    else if (/^#\/?library\b/.test(win.location.hash)) win.history.replaceState({ room: next.name }, '', '#' + next.name);
  });
  return {
    go: (name, id = '', options) => request({ name, id }, options),
    initial: () => show(parseRoom(win.location.hash), { replace: true, animate: false }),
    get current() { return current; },
    // ui/transitions.js: (change, run) => true when it will call run() itself, inside a view transition
    set transition(fn) { transition = typeof fn === 'function' ? fn : null; },
    // now, or right after a change that is still waiting for its transition to take the old frame
    settled(fn) { if (pending) after.push(fn); else fn(); },
  };
}
