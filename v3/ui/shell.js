// Shell behaviour: the navigation ink and the settings drawer. Room transitions live in transitions.js.
import { reduced, TOKENS, getSpeed, setSpeed } from './motion.js';
import { initTransitions } from './transitions.js';
import { readPrefs, writePrefs } from './prefs.js';
const $ = id => document.getElementById(id);
const CURRENT = { home: 'practiceTab', train: 'practiceTab', report: 'practiceTab', archive: 'archiveNav', history: 'historyNav' };

function placeInk(room) {
  const ink = $('tabInk'), tab = $(CURRENT[room]); if (!ink || !tab) return;
  document.querySelectorAll('.tabs .tab').forEach(t => t.toggleAttribute('data-current', t === tab));
  const p = ink.parentElement.getBoundingClientRect(), r = tab.getBoundingClientRect();
  if (!r.width) return;
  ink.style.transform = `translateX(${r.left - p.left}px) scaleX(${r.width})`;
}
function drawer() {
  const box = $('settingsDrawer'), panel = box?.querySelector('.drawer-panel');
  let opener = null;
  const close = () => { box.removeAttribute('data-open'); setTimeout(() => { box.hidden = true; }, reduced() ? 0 : TOKENS.scene); opener?.focus?.({ preventScroll: true }); };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-settings]')) { opener = e.target.closest('[data-open-settings]'); box.hidden = false; panel.getBoundingClientRect(); box.setAttribute('data-open', ''); panel.focus({ preventScroll: true }); }
    if (e.target.closest('[data-close-settings]')) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  // transition speed: applies at once and is remembered (prefs). Feedback on press is instant either way.
  const radios = [...document.querySelectorAll('input[name=motionSpeed]')];
  radios.forEach(r => { r.checked = Number(r.value) === getSpeed(); r.addEventListener('change', () => { if (r.checked) setSpeed(Number(r.value)); }); });
  // home follow motion: on by default and deliberately small; off makes the home page completely still
  const follow = document.getElementById('followMotion'), apply = on => { document.documentElement.dataset.follow = on ? 'on' : 'off'; };
  if (follow) { follow.checked = readPrefs().follow !== false; apply(follow.checked); follow.addEventListener('change', () => { writePrefs({ follow: follow.checked }); apply(follow.checked); }); }
}
export function initShell(ctx) {
  // The ink moves before anything else in a transition: it is the first thing that says where you are going.
  addEventListener('museum:room-before', e => placeInk(e.detail.name));
  addEventListener('museum:room', e => placeInk(e.detail.name));
  initTransitions(ctx);
  addEventListener('resize', () => placeInk(ctx.rooms.current?.name || 'home'));
  document.fonts?.ready.then(() => placeInk(ctx.rooms.current?.name || 'home'));
  placeInk(ctx.rooms.current?.name || 'home');
  // Every CSS loop on the site can key off this attribute; JS loops watch document.hidden themselves.
  const sync = () => document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
  document.addEventListener('visibilitychange', sync); sync();
  drawer();
}
