// Hash routes keep static hosting portable and each learning space independent.
export function parseRoom(hash = '') {
  const [name, id] = hash.replace(/^#\/?/, '').split('/');
  return { name: ['home', 'train', 'report', 'archive', 'library', 'history'].includes(name) ? name : 'home', id: id || '' };
}
export function createRooms({ window: win, document: doc, onRoute }) {
  win.history.scrollRestoration='manual';
  let current = { name: 'home', id: '' }, animation;
  const reduced = () => win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function show(requested, { replace = false, fromHistory = false, animate = true } = {}) {
    const next = onRoute(requested) || { name: 'home', id: '' };
    const hash = '#' + next.name + (next.id ? '/' + next.id : '');
    if (win.location.hash !== hash) win.history[replace || fromHistory ? 'replaceState' : 'pushState']({ room: next.name }, '', hash);
    const previous = current;
    current = next;
    doc.body.dataset.room = next.name;
    for (const name of ['home', 'train', 'report', 'archive', 'library', 'history']) {
      const el = doc.getElementById(name + 'Room');
      if (el) el.hidden = name !== next.name;
    }
    doc.querySelector('.sidebar').hidden = next.name !== 'home';
    doc.querySelector('.page-heading').hidden = next.name !== 'home';
    const panel = doc.getElementById('archivePanel');
    const slot = doc.getElementById(next.name === 'train' ? 'trainingArchiveSlot' : next.name === 'report' ? 'summaryArchiveSlot' : 'archiveSlot');
    if (slot && panel) slot.append(panel);
    if (panel) panel.hidden = !['train', 'report', 'archive'].includes(next.name);
    const labels = {home:'01 / 音乐档案馆',train:'02 / 专注听辨',report:'03 / 学习报告',archive:'年代图鉴',library:'课程资料',history:'训练档案'};
    doc.getElementById('roomLabel').textContent = labels[next.name];
    doc.getElementById('practiceTab').setAttribute('aria-pressed', String(next.name === 'home'));
    doc.getElementById('libraryTab').setAttribute('aria-pressed', String(next.name === 'library'));
    doc.title = (labels[next.name].split(' / ').pop()) + ' · 大众音乐史复习室 2.0';
    animation?.cancel();
    const el = doc.getElementById(next.name + 'Room');
    if (animate && !reduced() && el?.animate) {
      const opening = next.name === 'train' && previous.name !== 'train';
      const closing = next.name === 'home';
      animation = el.animate(opening ? [
        { opacity: .25, transform: 'perspective(1400px) rotateY(-4deg) translateX(14px)', clipPath:'inset(0 3% 0 0)' },
        { opacity: 1, transform: 'perspective(1400px) rotateY(0) translateX(0)', clipPath:'inset(0)' }
      ] : [{ opacity: .35, transform: closing ? 'translateY(-8px) scale(.993)' : 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: opening ? 380 : 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    if (previous.name !== next.name) {
      win.scrollTo?.({ top: 0, behavior: 'instant' });
      const heading = el?.querySelector('h1,h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
    return next;
  }
  win.addEventListener('popstate', () => show(parseRoom(win.location.hash), { fromHistory: true }));
  win.addEventListener('hashchange', () => {
    const next = parseRoom(win.location.hash);
    if (next.name !== current.name || next.id !== current.id) show(next, { fromHistory: true });
  });
  return { go: (name, id = '', options) => show({ name, id }, options), initial: () => show(parseRoom(win.location.hash), { replace: true, animate: false }), get current() { return current; } };
}
