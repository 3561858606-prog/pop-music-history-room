// 原型的外壳：四个房间、两种底色、三个转场（钻进标签、拉远、其余淡入）。
import * as M from './model.js';
import {createTrain, renderResult} from './train.js';
import {renderHistory} from './history.js';
import {nameHTML} from './reading.js';
import {hasVideo, videoTag, videoCount} from './video.js';
import {t as tr, join, applyStatic} from './i18n.js';
import {discBgm, finishBgmStartup} from './bgm-start.js';
applyStatic();
// 画布的无障碍说明随课程数据变化（增加讲次后年份范围会变）
{ const g = document.getElementById('gl'); if (g) g.setAttribute('aria-label', tr('母盘：外圈 {a} 年，内圈 {b} 年。方向键移动，回车进入，空格落针。', M.courseFacts())); }

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// ?still：不播动画，直接到位（也用于在后台标签里检查画面）
const STILL = new URLSearchParams(location.search).has('still');
const reduced = () => STILL || matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOMS = {disc: 'roomDisc', catalog: 'roomCatalog', train: 'roomTrain', result: 'roomResult', history: 'roomHistory'};
const SIDE = {disc: 'lacquer', catalog: 'lacquer', train: 'paper', result: 'paper', history: 'paper'};
const veil = $('veil');

let explore = null, exploreP = null, current = null, pendingCuts = null, busy = false, currentHash = null;
let lastRound = null, justFinished = false;
const rememberRound = id => { try { sessionStorage.setItem('v8-proto-active-round', id || ''); } catch {} };
// 这个标签页正在做的那一轮（哪怕一首都还没答，刷新后也接着做）；没有就取最近一轮答过题的。
const preferredRound = () => { let id; try { id = sessionStorage.getItem('v8-proto-active-round'); } catch {} const own = id && M.roundById(id); return own?.state === 'active' ? own : M.unfinished()[0]; };
const notice = message => { const el = $('appNotice'); el.textContent = message; el.hidden = !message; };
const historyCtx = {report: id => go('result/' + encodeURIComponent(id)), resume: resumeRound, disc: () => go('disc')};
const train = createTrain($('roomTrain'), {
  reduced,
  exit: () => go('disc'),
  finish(r) { lastRound = r; justFinished = true; pendingCuts = r.cuts; rememberRound(''); go('result/' + encodeURIComponent(r.id)); }
});

// 上手指南、更新说明、语言菜单：不挡进入，盘面出来后再载入（guide.js + changelog.js）。
// 载入前就点了「?」或语言按钮：先载入，再替它点一次。
let guide = null, guideP = null;
const loadGuide = () => guideP ||= import('./guide.js').then(m => guide = m.createGuide({
  focusDisc: () => explore?.focus(),
  dropButton: () => document.getElementById('startRound'),
  onDisc: () => current === 'disc' && roomOf() === 'disc',
  // 更新说明里「去看看」的去处
  navigate(target) {
    if (target === 'history') return go('history');
    if (target === 'catalog-video') { cat.filter = 'video'; cat.q = ''; $('catSearch').value = ''; if (current === 'catalog') renderCatalog(); return go('catalog'); }
    if (target === 'disc') { go('disc'); explore?.focus(); }
  }
})).catch(error => { guideP = null; throw error; });
function earlyGuideClick(e) {
  if (guide) return document.removeEventListener('click', earlyGuideClick, true);
  const el = e.target.closest('#helpBtn, #langBtn, [data-open-guide]'); if (!el) return;
  e.preventDefault(); e.stopPropagation();
  loadGuide().then(() => { document.removeEventListener('click', earlyGuideClick, true); el.click(); }).catch(() => {});
}
document.addEventListener('click', earlyGuideClick, true);
const returning = () => M.history().length > 0 || M.unfinished().length > 0 || M.stats().source === 'proto';
const ensureExplore = () => exploreP ||= import('./explore.js').then(m => m.initExplore({reduced, startRound, resumeRound})).then(api => { explore = api; if (STILL || new URLSearchParams(location.search).has('debug')) window.__v8 = {explore: api}; return api; });

/* ---------- 路由 ---------- */
const roomOf = () => { const h = location.hash.slice(1).split('/')[0]; return ROOMS[h] ? h : 'disc'; };
function go(room) { if (roomOf() === room && current === room) return; location.hash = '#' + room; }
addEventListener('hashchange', () => route());

function setSide(room) {
  document.documentElement.dataset.side = SIDE[room];
  document.querySelector('meta[name=theme-color]').content = SIDE[room] === 'paper' ? '#EEE8DA' : '#0F0D0C';
  for (const a of document.querySelectorAll('.tabs a')) a.toggleAttribute('aria-current', a.dataset.tab === room);
  document.body.dataset.room = room;
}
function swap(room) {
  for (const [name, id] of Object.entries(ROOMS)) $(id).hidden = name !== room;
  setSide(room); current = room;
}
async function veilTo(on, ms) {
  if (reduced()) ms = 0;
  veil.style.transition = `opacity ${ms}ms ease`; veil.dataset.on = on ? '1' : '0';
  if (ms) await sleep(ms);
}

async function route() {
  const room = roomOf(), from = current, hash = location.hash;
  if ((room === from && currentHash === hash) || busy) return;
  currentHash = hash;
  busy = true;
  try {
    finishBgmStartup();
    if (room !== 'disc') discBgm?.setRoom(false);
    if (from === 'train') train.pause();
    // 去听辨：宇宙要陪着镜头钻进标签，换完页再停
    if (from === 'disc') explore?.pause({keepCosmos: room === 'train'});
    if (room === 'train') {
      // 没有正在做的一轮（例如在结果页按了返回）：回到盘面，不要悄悄开一轮新的
      if (!train.active()) { const saved = preferredRound(); if (!saved || !train.restore(saved)) { location.replace('#disc'); return; } rememberRound(train.id()); }
      // 钻进标签：镜头落向标签，纸色铺满，再换到纸面
      if (from === 'disc' && explore) { const ms = explore.dive(); if (ms) { await sleep(ms - 200); await veilTo(true, 200); } }
      swap('train'); train.resume(); explore?.pauseCosmos();
      await veilTo(false, 240);
    } else if (room === 'result') {
      const id = decodeURIComponent(location.hash.split('/')[1] || '');
      const report = M.history().find(r => r.id === id) || lastRound || M.history()[0];
      renderResult($('roomResult'), report, {
        toDisc: () => go('disc'),
        again: () => startRound(report?.scope || M.prefs.scope, report?.questionType),
        reviewCount: M.reviewTrackIds(report).length,
        review: () => startTraining(() => train.startReview(report)),
        history: () => go('history')
      });
      // 刚做完一轮：底部放一条小设计（一次一条）
      if (justFinished) { justFinished = false; const tip = guide?.tip(); if (tip) $('roomResult').querySelector('.rs-foot')?.insertAdjacentHTML('afterend', tip); }
      swap('result');
      $('roomResult').querySelector('[data-act=disc]')?.focus({preventScroll: true});
    } else if (room === 'history') {
      renderHistory($('roomHistory'), historyCtx); swap('history');
    } else if (room === 'catalog') {
      renderCatalog(); swap('catalog');
    } else {
      const fromPaper = from === 'train' || from === 'result' || from === 'history';
      if (fromPaper && !reduced()) { veil.style.transition = 'none'; veil.dataset.on = '1'; }
      swap('disc');
      await ensureExplore();
      explore.surface(fromPaper);       // 拉远：从标签退回整张盘
      if (pendingCuts) { explore.celebrate(pendingCuts); pendingCuts = null; }
      let introPlayed = false;
      if (from === null && !M.prefs.introSeen) { M.prefs.introSeen = true; M.savePrefs(); explore.intro(); introPlayed = true; }
      if (!STILL) { const delay = introPlayed && !reduced() ? 1800 : 500; loadGuide().then(g => g.auto({returning: returning(), delay})).catch(() => {}); }
      if (fromPaper) { await sleep(40); await veilTo(false, 320); }
      if (from !== null) explore.focus();
    }
    if (room !== 'disc' && room !== 'train' && room !== 'result' && from !== null) $(ROOMS[room]).querySelector('h1, button, [tabindex]')?.focus?.({preventScroll: true});
    window.scrollTo(0, 0);
  } catch (error) { notice(error.message || tr('页面暂未载入，请刷新重试。')); }
  finally { busy = false; if (location.hash !== currentHash) route(); }
}

let starting = false;
function startRound(scope, type = M.prefs.questionType) {
  return startTraining(() => train.start(scope, typeof type === 'string' ? type : M.prefs.questionType));
}
async function startTraining(start) {
  if (starting) return;
  starting = true;
  try {
    await train.discard();
    if (!await start()) return;
    rememberRound(train.id()); go('train');
    if (current === 'train') train.resume();
  } catch (error) { notice(error.message); }
  finally { starting = false; }
}
async function resumeRound(id) {
  if (starting) return;
  starting = true;
  try {
    await train.flush(); await M.refreshRecords();
    let saved = M.roundById(id);
    if (!saved || saved.state !== 'active') { notice(tr('这一轮已结束，请在历史里查看。')); return; }
    await train.discard();
    await M.refreshRecords(); saved = M.roundById(id);
    if (!saved || saved.state !== 'active') { notice(tr('这一轮已结束，请在历史里查看。')); go('history'); return; }
    if (!train.restore(saved)) throw Error(tr('这一轮的信息不完整，请导出备份后开始新一轮。'));
    rememberRound(id); notice(''); go('train');
  } catch (error) { notice(error.message); }
  finally { starting = false; }
}

/* ---------- 目录：搜索和筛选，高效的那一层 ---------- */
const cat = {q: '', filter: 'all'};
const FILTERS = [['all', tr('全部')], ['open', tr('还没刻满')], ['year', tr('年份没记住')], ['new', tr('还没听过')], ['video', tr('有视频')]];
function renderCatalog() {
  $('catFilters').innerHTML = FILTERS.map(([k, label]) => `<button data-f="${k}" aria-pressed="${cat.filter === k}"${k === 'video' ? ' class="f-video"' : ''}>${k === 'video' ? `<i aria-hidden="true"></i>${label}<span>${videoCount}</span>` : label}</button>`).join('');
  const q = cat.q.trim().toLocaleLowerCase();
  const keep = t => {
    const l = M.lanesOf(t.id);
    if (cat.filter === 'open' && l.every(v => v >= 1)) return false;
    if (cat.filter === 'year' && l[1] >= .5) return false;
    if (cat.filter === 'new' && l.some(v => v > 0)) return false;
    if (cat.filter === 'video' && !hasVideo(t.id)) return false;
    if (!q) return true;
    const s = M.styleOf(t);
    return [t.song, t.artist, t.songKo, t.artistKo, t.year, s.label, s.sub, hasVideo(t.id) ? '视频 video 비디오 영상' : '', ...['song', 'artist', 'style'].flatMap(k => M.aliasesOf(t, k))].join(' ').toLocaleLowerCase().includes(q);
  };
  let shown = 0;
  $('catBody').innerHTML = M.bands.map(b => {
    const rows = b.ids.map(id => M.byId.get(id)).filter(keep); if (!rows.length) return '';
    shown += rows.length;
    return `<section class="cat-band"><h2><b>${b.label}</b><span>${tr('{n} 首', {n: rows.length})}</span></h2><ol>${rows.map(t => { const l = M.lanesOf(t.id), s = M.styleOf(t);
      // 「视频」标签紧跟主名，别写仍在下一行
      const title = nameHTML(t, 'song', M.titleOf(t)).replace('</span>', '</span>' + videoTag(t.id));
      return `<li><button data-song="${t.id}"><i>${t.year}</i><b>${title}</b><span class="c-artist">${nameHTML(t, 'artist')}</span><span class="c-style">${nameHTML(t, 'style')}</span><span class="c-lec">${tr('第 {l} 讲', {l: join(M.lectureIds(t))})}</span>
        <span class="c-lanes" role="img" aria-label="${tr('刻纹')}: ${M.KEYS.map((k, i) => M.FIELD_NAMES[k] + ' ' + Math.round(l[i] * 100) + '%').join(', ')}">${l.map(v => `<span style="--v:${v}"></span>`).join('')}</span></button></li>`; }).join('')}</ol></section>`;
  }).join('') || `<p class="cat-empty">${tr('没有符合条件的曲目。')}</p>`;
  $('catBody').dataset.count = shown;
}
$('catSearch').addEventListener('input', e => { cat.q = e.target.value; renderCatalog(); });
$('catFilters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { cat.filter = b.dataset.f; renderCatalog(); $('catFilters').querySelector(`[data-f="${cat.filter}"]`)?.focus(); } });
$('catBody').addEventListener('click', async e => { const b = e.target.closest('[data-song]'); if (!b) return; const id = b.dataset.song; go('disc'); await ensureExplore(); await sleep(60); explore.focusSong(id); });

// 第一屏出来以后，空闲时载入说明卡（很小）。逐曲长读较大，等真要显示时才载入，不和刚开始播放的歌抢网速。
function afterFirst() {
  const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
  idle(() => { loadGuide().catch(() => {}); }, {timeout: 2500});
}
M.onChange(what => {
  if (what === 'prefs-error') notice(tr('偏好暂未保存；作答记录不受影响。'));
  if (what === 'storage-error') notice(tr('记录同步暂时失败，请保留页面后重试。'));
  if (current === 'history') renderHistory($('roomHistory'), historyCtx);
});
notice(tr('正在载入本地学习记录…'));
try { await M.ready; lastRound = M.history()[0] || null; notice(''); await route(); afterFirst(); }
catch (error) {
  finishBgmStartup();
  discBgm?.setRoom(false);
  notice(tr('学习存储暂不可用：{m}。原有记录未改动，请刷新重试。', {m: error.message}));
  const retry = document.createElement('button'); retry.textContent = tr('重新载入'); retry.onclick = () => location.reload(); $('appNotice').append(retry);
}
