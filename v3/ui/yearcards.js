// 年份卡片: the archive's year wall (原「年代档案墙」, archive-ui.js), opened over the training page at any moment.
// This is the same component the training room used to embed; this module only moves it into a sheet and back.
// Opening, reading or closing it never touches the question, the chosen answers, the draw order or the score.
// While the current song is unanswered the sheet shows only this round's answered songs; the cumulative tab and the
// filters open after submitting, exactly as the archive's own spoiler guard requires.
import { reduced, ms } from './motion.js';
const $ = id => document.getElementById(id);
let ctx, open = false, opener = null;

function note() {
  if (!open) return;
  const s = ctx.getState(), locked = ctx.archive.locked(), n = s.sessionHistory.length, all = ctx.archive.tab === 'all';
  $('yearSheetTitle').textContent = all ? '累计听过的年份' : '这一轮听过的年份';
  $('yearSheetNote').textContent = locked
    ? (n ? '这一题还没提交：这里只放本轮已经答过的歌，累计的年份卡片在提交后打开。' : '这一轮还没有答过的歌。提交第一题后，它会按年份出现在这里。')
    : '「本轮记录」是这一轮答过的歌，「累计图鉴」是听辨过的全部歌曲。展开卡片可以看课件说明。';
  $('archivePanel').open = true;
}
function show() {
  const panel = $('archivePanel'), slot = $('yearSheetSlot'), sheet = $('yearSheet');
  if (open || !panel || !slot || document.body.dataset.room !== 'train') return;
  open = true; opener = document.activeElement;
  slot.appendChild(panel); panel.hidden = false; panel.open = true;
  ctx.archive.wall();
  sheet.hidden = false; sheet.getBoundingClientRect(); sheet.setAttribute('data-open', '');
  $('yearCardsButton').setAttribute('aria-expanded', 'true');
  note();
  $('yearSheetClose').focus({ preventScroll: true });
}
function hide(restore = true) {
  if (!open) return;
  open = false;
  const sheet = $('yearSheet'); sheet.removeAttribute('data-open');
  $('yearCardsButton').setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (open) return;
    sheet.hidden = true;
    const panel = $('archivePanel'), home = $('archiveSlot');
    if (panel && home && panel.parentElement !== home) { home.appendChild(panel); panel.hidden = document.body.dataset.room !== 'archive'; }
  }, reduced() ? 0 : ms(240));
  if (restore) (opener && opener.isConnected ? opener : $('yearCardsButton'))?.focus?.({ preventScroll: true });
}

export function init(c) {
  ctx = c;
  $('yearCardsButton')?.addEventListener('click', () => (open ? hide() : show()));
  $('yearSheetClose')?.addEventListener('click', () => hide());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !document.querySelector('dialog[open]')) { e.preventDefault(); hide(); } });
  for (const ev of ['wall', 'question', 'fields']) addEventListener('museum:' + ev, note);
  addEventListener('museum:room-before', e => { if (e.detail.name !== 'train') hide(false); });
}
