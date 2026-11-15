// Archive: the decade index (each decade's 0 is a record), the filters, the sound covers and the mini player.
import { cover, loadPeaks, setupCanvas, twistOnHover } from './visuals.js';
import { reduced, turntable } from './motion.js';
import { createFish } from './curator.js';
const $ = id => document.getElementById(id);
const dec = y => Math.floor(y / 10) * 10;
const NEUTRAL = '#A9A89F';
const STATUS = [['', '全部'], ['collected', '已入藏'], ['uncollected', '未入藏'], ['weak', '待巩固'], ['yearWeak', '年份弱']];
// A browsing aid, not exam wording. Together these cover all 26 style ids.
const FAMILIES = [['前爵士', ['parlor', 'ragtime']], ['爵士与摇摆', ['early-jazz', 'dance', 'swing', 'western-swing']], ['蓝调', ['classic-blues', 'country-blues', 'jump-blues', 'blues-crooner', 'electric-blues']], ['乡村', ['country', 'country-western']], ['流行', ['tin-pan-alley', 'standard-pop', 'urban-folk']], ['拉丁', ['afro-cuban', 'mambo']], ['摇滚', ['rock-roll', 'rockabilly', 'chicano-rock']], ['韩国歌谣', ['trot', 'jazz-song', 'manyo', 'changga', 'early-korean-song']]];
let ctx, watcher = null, coverRun = 0, coverTimer = 0, stuck = false, spinning = null, buffering = false;
const painters = new WeakMap();
const inRoom = () => ctx.rooms.current?.name === 'archive';

function record(canvas, active) {
  const [x, half] = setupCanvas(canvas);
  x.fillStyle = '#F1F0EA'; x.globalAlpha = .9; x.beginPath(); x.arc(0, 0, half, 0, 7); x.fill(); x.globalAlpha = 1;
  x.strokeStyle = '#141414'; x.lineWidth = Math.max(1, half * .05);
  for (let r = half * .9; r > half * .42; r -= half * .1) { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
  x.fillStyle = active ? '#D7301F' : '#8C8B85'; x.beginPath(); x.arc(0, 0, half * .34, 0, 7); x.fill();
  x.fillStyle = '#141414'; x.beginPath(); x.arc(0, 0, half * .07, 0, 7); x.fill();
}
function drawRecords() { document.querySelectorAll('#decadeNav .dec').forEach(d => { const c = d.querySelector('canvas'); if (c?.clientWidth) record(c, d.hasAttribute('aria-current')); }); }
function setCurrent(decade) {
  document.querySelectorAll('#decadeNav .dec').forEach(d => { if (d.dataset.decade === String(decade)) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  drawRecords();
  document.querySelector('#decadeNav .dec[aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
function band() {
  if (ctx.archive.locked()) return;
  const nav = $('decadeNav'), tracks = ctx.catalog.tracks, rec = ctx.archive.memory.records, list = [...new Set(tracks.map(t => dec(t.year)).filter(Number.isFinite))].sort((a, b) => a - b);
  const shown = new Set([...document.querySelectorAll('#archiveContent .decade')].map(s => s.dataset.decade));
  const cur = nav.querySelector('[aria-current]')?.dataset.decade || list[0];
  nav.innerHTML = list.map(d => { const all = tracks.filter(t => dec(t.year) === d), got = all.filter(t => rec[t.id]).length, s = String(d); return `<button class="dec" type="button" data-decade="${d}"${String(cur) === s ? ' aria-current="true"' : ''}${shown.has(s) ? '' : ' disabled'}><span class="lab" aria-label="${d} 年代">${s.slice(0, 3)}<span class="o"><canvas aria-hidden="true"></canvas></span>s</span><small>${got} / ${all.length}</small></button>`; }).join('');
  $('bandSub').textContent = `已入藏 ${Object.keys(rec).length} / ${tracks.length} 首 · 按年份排列`;
  drawRecords();
}
function watchDecades() {
  watcher?.disconnect();
  if (!inRoom()) return;
  watcher = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setCurrent(v.target.dataset.decade); }, { rootMargin: '-120px 0px -60% 0px' });
  document.querySelectorAll('#archiveContent .decade').forEach(s => watcher.observe(s));
}

// Filters. Every count answers "what would I get if I pressed this", given everything else that is already set.
function chips() {
  const A = ctx.archive, boxes = ['statusChips', 'lectureChips', 'styleChips'].map($);
  if (!inRoom() || A.tab !== 'all' || A.locked()) { boxes.forEach(b => b.replaceChildren()); return; }
  const f = A.filter, styles = f.styles || new Set(), count = patch => A.matching(patch).length, keep = focusKey();
  const off = (n, on) => (n || on ? '' : ' disabled');
  boxes[0].innerHTML = STATUS.map(([k, label]) => { const on = (f.status || '') === k, n = count({ status: k || undefined }); return `<button class="chip" type="button" data-status="${k}"${k ? '' : ' data-rest'} aria-pressed="${on}"${off(n, on)}>${label}<span class="n">${n}</span></button>`; }).join('') + (A.hasFilter() ? '<button class="chip-clear" type="button" data-clear-filters>清除筛选</button>' : '');
  boxes[1].innerHTML = '<span class="f-label">讲次</span>' + ctx.catalog.lectures.map(L => { const on = f.lecture === L.id, n = count({ lecture: L.id }); return `<button class="chip" type="button" data-lec="${L.id}" aria-pressed="${on}" aria-label="第 ${L.id} 讲 ${L.label}，${n} 首" title="第 ${L.id} 讲 · ${L.label}"${off(n, on)}><span class="lec" data-lecture="${L.id}"></span><span class="lat">${String(L.id).padStart(2, '0')}</span><span class="n">${n}</span></button>`; }).join('');
  const fam = FAMILIES.find(([, ids]) => ids.some(id => styles.has(id)));
  boxes[2].innerHTML = '<span class="f-label">风格</span>' + FAMILIES.map(([name, ids]) => { const on = fam?.[0] === name, n = count({ styles: new Set(ids) }); return `<button class="chip" type="button" data-fam="${name}" aria-pressed="${on}"${off(n, on)}>${name}<span class="n">${n}</span></button>`; }).join('') +
    (fam ? `<div class="style-sub">${fam[1].map(id => { const on = styles.size === 1 && styles.has(id), n = count({ styles: new Set([id]) }); return `<button class="chip" type="button" data-style="${id}" aria-pressed="${on}"${off(n, on)}>${ctx.catalog.styles.find(s => s.id === id)?.label || id}<span class="n">${n}</span></button>`; }).join('')}</div>` : '');
  const picked = (f.lecture != null ? 1 : 0) + (styles.size ? 1 : 0);
  $('facetToggle').innerHTML = `讲次 / 风格${picked ? `<span class="n">已选 ${picked}</span>` : ''}`;
  restoreFocus(keep);
}
// Chips are rebuilt on every change; the keyboard must not lose its place.
function focusKey() { const b = document.activeElement?.closest?.('#archiveFilters button'); if (!b || b.id === 'facetToggle') return null; const key = ['status', 'lec', 'fam', 'style'].find(k => k in b.dataset); return key ? `[data-${key}="${b.dataset[key]}"]` : '#archiveSearch'; }
function restoreFocus(selector) { if (selector) (document.querySelector('#archiveFilters ' + selector + ':not(:disabled)') || $('archiveSearch')).focus({ preventScroll: true }); }
function onFilterClick(e) {
  const b = e.target.closest('button'), A = ctx.archive; if (!b) return;
  if (b.id === 'facetToggle') { const open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); $('archiveFacets').toggleAttribute('data-open', open); return; }
  if ('clearFilters' in b.dataset) { A.clearFilters(); $('archiveSearch').focus({ preventScroll: true }); return; }
  const f = A.filter, styles = f.styles || new Set();
  if ('status' in b.dataset) A.setFilter({ status: b.dataset.status || undefined });
  else if ('lec' in b.dataset) { const id = Number(b.dataset.lec); A.setFilter({ lecture: f.lecture === id ? null : id }); }
  else if ('fam' in b.dataset) { const g = FAMILIES.find(x => x[0] === b.dataset.fam), same = g[1].some(id => styles.has(id)); A.setFilter({ styles: same ? new Set() : new Set(g[1]) }); }
  else if ('style' in b.dataset) { const id = b.dataset.style, g = FAMILIES.find(x => x[1].includes(id)), only = styles.size === 1 && styles.has(id); A.setFilter({ styles: only ? new Set(g[1]) : new Set([id]) }); }
}

// Covers. The first screen paints before the browser does, so filtering never flashes blank records; the rest follow in small batches.
function paint(c) {
  if (c.dataset.painted || !c.clientWidth) return;
  const t = ctx.catalog.tracks.find(x => x.id === c.dataset.track), card = c.closest('.archive-song'); if (!t || !card) return;
  c.dataset.painted = '1';
  const unheard = card.dataset.state === 'none';
  let twist = 0, lit = false;
  const draw = (v = twist) => { twist = v; cover(c, t, { twist: v, fg: unheard && !lit && !card.hasAttribute('data-playing') ? NEUTRAL : null }); };
  draw(0);
  painters.set(card, draw);
  if (unheard) {
    const set = on => () => { lit = on; draw(); };
    card.addEventListener('pointerenter', set(true)); card.addEventListener('pointerleave', set(false));
    card.addEventListener('focusin', set(true)); card.addEventListener('focusout', set(false));
  }
  twistOnHover(card, draw, { max: .5, onceOnView: false });
}
function drawCovers() {
  const run = ++coverRun; clearTimeout(coverTimer);
  const all = [...document.querySelectorAll('#archiveContent canvas.cover')];
  if (!all.length) return;
  loadPeaks().then(() => {
    if (run !== coverRun) return;
    const rest = [];
    for (const c of all) { const r = c.getBoundingClientRect(); if (r.width && r.top < innerHeight + 300 && r.bottom > -300) paint(c); else rest.push(c); }
    const batch = () => { if (run !== coverRun) return; rest.splice(0, 8).forEach(paint); if (rest.length) coverTimer = setTimeout(batch, 30); };
    if (rest.length) coverTimer = setTimeout(batch, 60);
  });
}
// A playing card's record turns, with the same inertia as the listening deck, and an unheard one takes its lecture colour while it sounds.
function syncSpin() {
  const c = document.querySelector('#archiveContent .archive-song[data-playing] canvas.cover');
  if (spinning?.c !== c) {
    if (spinning) { spinning.tt.set(false); painters.get(spinning.c.closest('.archive-song'))?.(); }
    spinning = c ? { c, tt: turntable(c) } : null;
    if (c) painters.get(c.closest('.archive-song'))?.();
  }
  spinning?.tt.set(!document.hidden);
}

function mini() {
  const box = $('miniPlayer'), a = $('audio'), s = ctx.getState();
  const t = s.audioContext === 'library' && !a.ended && ctx.rooms.current?.name !== 'train' && !ctx.archive.locked() ? ctx.catalog.tracks.find(x => x.id === s.audioTrackId) : null;
  if (!t) { box.hidden = true; document.body.removeAttribute('data-mini'); $('miniTitle').textContent = ''; $('miniMeta').textContent = ''; $('miniLine').style.transform = 'scaleX(0)'; return; }
  box.hidden = false; document.body.setAttribute('data-mini', '');
  $('miniTitle').textContent = t.song; $('miniTitle').lang = /[가-힣]/.test(t.song) ? 'ko' : 'en';
  $('miniMeta').textContent = buffering && !a.paused ? '正在缓冲…' : `${t.artist} · ${t.year}`;
  $('miniToggle').dataset.playing = String(!a.paused);
  $('miniToggle').setAttribute('aria-label', a.paused ? '继续播放' : '暂停');
}

function peek(host) {
  if (!host || host.querySelector('.peek')) return;
  host.insertAdjacentHTML('afterbegin', '<div class="peek"><svg viewBox="0 0 120 54" aria-hidden="true"><path d="M4 12h112v40H4z" fill="#FAFAF7" stroke="#141414" stroke-width="1.5"/><path d="M4 12 0 2h44l4 10M116 12l4-10H76l-4 10" fill="#FAFAF7" stroke="#141414" stroke-width="1.5"/></svg></div>');
  host.querySelector('.peek').prepend(createFish(96).still(8, 2).el);
}
// Lecture 7 course notes, ported from the live library: albums, background, self-test cards, corrections, slide excerpts.
// Real sleeves where the cover folder has them; otherwise the course's own illustration, marked as such.
const C7_ART = { 'pet-sounds': 'assets/covers/pet-sounds.jpg', 'the-doors': 'assets/covers/s31.jpg' };
function c7Notes() {
  const k = ctx.catalog.course7, host = document.querySelector('#archiveContent #d1960 .cards, #archiveContent #d1960');
  if (!k || !host || ctx.archive.locked() || host.querySelector('.c7-notes')) return;
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const link = url => url ? `<a class="link" href="${e(url)}" target="_blank" rel="noopener noreferrer">来源 ↗</a>` : '来源：第七讲课件正文';
  const albums = k.albums.map(a => { const real = C7_ART[a.id]; return `<figure class="c7-album"><span class="sq" style="background-image:url(${real || e(a.cover)})" role="img" aria-label="${e(a.title)}${real ? '专辑封面' : '课程示意封面'}"></span><b lang="en">${e(a.title)}</b><span>${e(a.artist)} · ${a.year} · 第 ${a.page} 页</span><span>${e(a.note)}</span>${real ? '' : '<small>课程示意封面 · 原封面待补</small>'}<span>${link(a.source)}</span></figure>`; }).join('');
  const bg = k.background.map(b => `<details><summary>${e(b.title)} · 第 ${b.pages.join('、')} 页</summary><p>${e(b.text)}</p></details>`).join('');
  const quiz = k.quiz.map(q => `<details class="c7-quiz"><summary>${e(q.question)}</summary><p>${e(q.answer)}</p></details>`).join('');
  const fix = k.corrections.map(c => `<details><summary>第 ${c.page} 页 · ${e(c.original)}</summary><p>校正／核对：${e(c.normalized)}</p><p>${e(c.reason)} ${link(c.source)}</p></details>`).join('');
  const slides = k.slides.map(sl => `<details><summary>第 ${sl.page} 页</summary><p>${e(sl.text)}</p></details>`).join('');
  host.insertAdjacentHTML('beforeend', `<details class="c7-notes"><summary>第 7 讲 · 课件资料<small>${k.albums.length} 张相关专辑 · ${k.background.length} 组背景 · ${k.quiz.length} 张知识自测卡 · 校正与课件摘录</small></summary>
    <div class="c7-albums">${albums}</div>
    <div class="c7-cols"><section><h4>背景知识</h4>${bg}</section><section><h4>知识自测 · 先回忆，再展开答案</h4>${quiz}<p class="small muted" style="margin-top:8px">知识自测与听辨评分分开，不写入成绩。</p></section><section><h4>校正与待核实映射</h4>${fix}<h4 style="margin-top:18px">课件摘录与媒体来源</h4>${slides}<p class="small muted" style="margin-top:8px">${e(k.rights)}</p></section></div></details>`);
}
function onWall(e) {
  chips(); c7Notes();
  if (inRoom()) { band(); watchDecades(); }
  drawCovers();
  peek(document.querySelector('#archiveContent .archive-empty:not(.no-match)'));
  // Filtering is a cut in two beats, no layout animation.
  if (e?.detail?.reason === 'filter' && !reduced()) $('archiveContent').animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 80, easing: 'steps(2,start)' });
  syncSpin(); mini();
}
const history = () => peek($('sessionList')?.querySelector('.archive-empty'));

export function init(c) {
  ctx = c;
  addEventListener('museum:wall', onWall);
  addEventListener('museum:room', e => { if (e.detail.name === 'archive') onWall(); if (e.detail.name === 'history') history(); mini(); });
  $('archiveFilters').addEventListener('click', onFilterClick);
  $('decadeNav').addEventListener('click', e => { const d = e.target.closest('.dec'); if (!d || d.disabled) return; setCurrent(d.dataset.decade); document.getElementById('d' + d.dataset.decade)?.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); });
  // Two thresholds: shrinking the band must not be able to scroll the page back out of the shrunk state.
  addEventListener('scroll', () => { const next = inRoom() && scrollY > (stuck ? 90 : 140); if (next !== stuck) { stuck = next; $('decadeBand').classList.toggle('stuck', stuck); } }, { passive: true });
  addEventListener('resize', drawRecords);
  document.fonts?.ready.then(drawRecords);
  matchMedia('(max-width:760px)').addEventListener?.('change', () => { if (inRoom()) ctx.archive.wall(); });
  document.addEventListener('visibilitychange', syncSpin);
  const a = $('audio');
  for (const ev of ['play', 'pause', 'ended', 'emptied', 'playing', 'waiting']) a.addEventListener(ev, () => { buffering = ev === 'waiting' || (buffering && ev === 'play'); syncSpin(); mini(); });
  a.addEventListener('timeupdate', () => { if (!$('miniPlayer').hidden && a.duration) $('miniLine').style.transform = `scaleX(${a.currentTime / a.duration})`; });
  $('miniToggle').addEventListener('click', () => { if (a.paused) a.play().catch(() => {}); else a.pause(); });
  $('miniClose').addEventListener('click', () => { ctx.actions.stopPreview?.(); mini(); });
  addEventListener('museum:question', mini);
  if (inRoom()) onWall();
  if (ctx.rooms.current?.name === 'history') history();
}
