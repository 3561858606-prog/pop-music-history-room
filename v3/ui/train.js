// Listening room. Everything here is presentation: the current-field plate, stage reveal, red pen, contrast notes.
import { cover, loadPeaks, peaksFor } from './visuals.js';
import { penLoop, clearPen } from './pen.js';
import { coverFor, KIND, RELATION } from '../covers.js';
import { fadeIn, rise, slideIn, turntable, reduced, isPhone, TOKENS } from './motion.js';
import { createBigFish } from './bigfish.js';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const langOf = s => /[가-힣]/.test(s) ? 'ko' : 'en';
const NOT_HEARD = '__not_heard__';
let ctx, cur = null, source = null, advanceTimer = 0, spin, willReveal = false, previewAudio = null, previewTimer = 0, lastRevealedResult = null;
const audio = () => $('audio');
const groups = () => [...$('answerFields').querySelectorAll('.field-card')];
const keyOf = g => g.querySelector('[data-field]')?.dataset.field;
const answered = (s, key) => { const v = s.answers?.[key]; return typeof v === 'string' && v.trim().length > 0; };
const FIELD_LABEL = { song: '歌名', year: '年份', artist: '音乐家', style: '风格' };

/* the current field: one plate slides between groups */
function firstOpen(after = null) {
  const s = ctx.getState(), keys = groups().map(keyOf);
  if (!keys.length) return null;
  const start = after ? keys.indexOf(after) + 1 : 0;
  for (let i = 0; i < keys.length; i++) { const k = keys[(start + i) % keys.length]; if (!answered(s, k)) return k; }
  return null;
}
function movePlate(animate = true) {
  const plate = $('curPlate'), wrap = plate?.parentElement, s = ctx.getState();
  if (!plate) return;
  const g = groups().find(x => keyOf(x) === cur);
  const single = groups().length < 2;
  if (!g || s.result || isPhone()) { plate.classList.remove('on'); return; }
  const b = wrap.getBoundingClientRect(), r = g.getBoundingClientRect(), pad = single ? 8 : 10;
  if (!animate || !plate.classList.contains('on') || reduced()) plate.style.transition = 'none';
  plate.style.width = r.width + pad * 2 + 'px'; plate.style.height = r.height + 'px';
  plate.style.transform = `translate(${r.left - b.left - pad}px,${r.top - b.top}px)`;
  plate.classList.add('on');
  plate.getBoundingClientRect(); plate.style.transition = '';
}
function tabs() {
  const box = $('fieldTabs'), s = ctx.getState();
  if (!box) return;
  const gs = groups();
  if (gs.length < 2 || s.result) { box.innerHTML = ''; return; }
  box.innerHTML = gs.map((g, i) => { const k = keyOf(g); return `<button type="button" data-tab="${k}" class="${k === cur ? 'cur' : answered(s, k) ? 'done' : ''}"><b>0${i + 1}</b>${FIELD_LABEL[k]}</button>`; }).join('');
}
export function setCurrent(key, { animate = true, dir = 1 } = {}) {
  const changed = key !== cur; cur = key;
  groups().forEach(g => g.classList.toggle('is-current', keyOf(g) === cur && !ctx.getState().result));
  movePlate(animate); tabs();
  if (changed && animate && isPhone()) slideIn(groups().find(g => keyOf(g) === cur), dir);
  if (ctx.getState().result) return;
  if (isPhone() && changed && key) document.querySelector('.field-tabs')?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
}
export function moveCurrent(delta) {
  const keys = groups().map(keyOf); if (keys.length < 2) return;
  const i = Math.max(0, keys.indexOf(cur)), j = (i + delta + keys.length) % keys.length;
  setCurrent(keys[j], { dir: delta });
  groups()[j].querySelector('.written-answer:not(:disabled)')?.focus({ preventScroll: true });
}
export function currentKey() { return cur; }
export function pickByKey(n) {
  const g = groups().find(x => keyOf(x) === cur); if (!g || ctx.getState().result) return false;
  const inputs = [...g.querySelectorAll('input[type=radio]')];
  const input = n === 0 ? inputs.find(i => i.value === NOT_HEARD) : inputs.filter(i => i.value !== NOT_HEARD)[n - 1];
  if (!input) return false;
  source = 'key'; input.click(); // click alone: pre-setting checked would swallow the change event
  // Advancing a question can focus the player. Once keyboard selection is complete,
  // keep Enter on the primary answer action rather than the player's native button action.
  if (!$('submitButton').disabled) $('submitButton').focus({ preventScroll: true });
  return true;
}
function onSelect(e) {
  const s = ctx.getState(), key = e.detail.field;
  const inChoice = !!groups().find(g => keyOf(g) === key)?.querySelector('input[type=radio]');
  movePlate(); tabs(); yearEcho();
  if (!inChoice || !source) return;
  const dir = 1; source = null;
  clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => { if (ctx.getState().question === s.question && !ctx.getState().result) setCurrent(firstOpen(key), { dir }); }, 120);
}

/* the stage */
function drawHeard() {
  const box = $('waveform'); if (!box) return;
  let c = box.querySelector('canvas'); if (!c) { c = document.createElement('canvas'); box.appendChild(c); }
  const W = box.clientWidth, H = box.clientHeight; if (!W) return;
  const dpr = Math.min(2, devicePixelRatio || 1); if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const a = audio(), s = ctx.getState(), d = a.duration || s.question?.track?.duration || 0;
  const heard = []; if (d) for (let i = 0; i < a.played.length; i++) heard.push([a.played.start(i) / d, a.played.end(i) / d]);
  const isHeard = t => heard.some(([x, y]) => t >= x && t <= y);
  const p = s.result && s.question ? peaksFor(s.question.track) : null;
  if (p) { // after the reveal the line opens into the song's real shape
    const n = p.length, bw = W / n;
    for (let i = 0; i < n; i++) { const h = 3 + p[i] / 100 * (H - 6); g.fillStyle = isHeard((i + .5) / n) ? '#fff' : 'rgba(255,255,255,.34)'; g.fillRect(i * bw + bw * .2, (H - h) / 2, Math.max(1, bw * .6), h); }
  } else { // before the reveal: a flat line, where only what you have heard is inked. No shape, no spoiler.
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, H / 2 - 1, W, 2);
    g.fillStyle = '#fff'; for (const [x, y] of heard) g.fillRect(x * W, H / 2 - 1.5, Math.max(1, (y - x) * W), 3);
  }
}
function drawDeck(reveal) {
  const s = ctx.getState(), c = $('deckRecord'); if (!c?.clientWidth) return;
  if (reveal && s.question) cover(c, s.question.track, { fg: '#FFFFFF' });
  else cover(c, null, { fg: '#FFFFFF', neutral: true });
}
function segs() {
  const s = ctx.getState(), box = $('qSegs'), sec = $('questionSection');
  const fixed = Number.isFinite(s.sessionGoal) && s.sessionGoal > 0 && s.sessionGoal <= 30 && s.sessionLength !== 'coverage' && s.sessionLength !== 'endless';
  sec?.toggleAttribute('data-long', !fixed && s.sessionLength === 'coverage' || (!fixed && s.sessionGoal > 30));
  if (!fixed) { box.innerHTML = ''; return; }
  const done = s.sessionHistory.length, current = s.result ? -1 : done;
  if (box.children.length !== s.sessionGoal) box.innerHTML = '<i></i>'.repeat(s.sessionGoal);
  [...box.children].forEach((el, i) => { el.className = i < done ? 'd' : i === current ? 'c' : ''; });
}
function statusHelp() {
  const s = ctx.getState(), help = $('statusHelp'); if (!help) return;
  if (s.result) { help.textContent = ''; return; }
  const early = s.reports.length < 2;
  help.textContent = !early ? '' : s.questionType === 'written' && s.sessionKind !== 'year' ? '中韩英文与已收录别名都算对 · ⌘ Enter 提交' : s.sessionKind === 'year' ? '1–4 选择 · 0 不知道' : '1–4 选择 · 0 不知道 · ← → 换项';
}

/* reveal: corrections first, nothing moves */
function known(t, s) { return t && t.id !== s.question.track.id && ctx.archive.memory.records[t.id] && !s.queueRemainingIds.includes(t.id); }
function contrastFor(f, s) {
  const T = ctx.catalog.tracks, title = t => `《<span lang="${langOf(t.song)}">${esc(t.song)}</span>》`;
  if (f.isCorrect || f.isUnknown) return null;
  if (f.key === 'year') { const t = T.find(x => String(x.year) === String(f.chosen) && known(x, s)); return t && { t, html: `你选的 ${esc(f.chosen)} 年是${title(t)}（<span lang="${langOf(t.artist)}">${esc(t.artist)}</span>）的年份` }; }
  if (f.key === 'song') { const t = T.find(x => x.song === f.chosen && known(x, s)); return t && { t, html: `${title(t)}是 <span lang="${langOf(t.artist)}">${esc(t.artist)}</span> 的，${t.year} 年` }; }
  if (f.key === 'artist') { const t = T.find(x => x.artist === f.chosen && known(x, s)); return t && { t, html: `<span lang="${langOf(t.artist)}">${esc(t.artist)}</span> 的曲目是${title(t)}，${t.year} 年` }; }
  if (f.key === 'style') { const t = T.find(x => x.style === f.chosen && known(x, s)); return t && { t, html: `这个风格的例子是${title(t)}（${t.year} 年）` }; }
  return null;
}
function fixTable(s) {
  const box = $('fixTable'); if (!box) return;
  if (!s.result || s.sessionKind === 'year') { box.innerHTML = ''; return; }
  const t = s.question.track, styleName = id => ctx.catalog.styles.find(x => x.id === id)?.label || id;
  const shown = (f, v) => f.key === 'style' ? styleName(v) : f.key === 'year' ? String(v) : v;
  const rows = [...s.result.fields].sort((a, b) => Number(a.isCorrect) - Number(b.isCorrect)).map(f => {
    const your = f.isUnknown ? '不知道' : (f.key === 'style' ? styleName(f.chosen) : f.chosen);
    if (f.isCorrect) return `<tr><td>${FIELD_LABEL[f.key]}</td><td lang="${langOf(your)}">${esc(your)}</td><td>✓</td></tr>`;
    const yearDiff = f.key === 'year' && !f.isUnknown && Number(f.chosen) ? Number(f.chosen) - t.year : 0;
    return `<tr><td>${FIELD_LABEL[f.key]}</td><td class="${f.isUnknown ? '' : 'bad'}" lang="${langOf(your)}">${esc(your)}</td><td class="ans" lang="${langOf(shown(f, f.correct))}"><span class="loopme">${esc(shown(f, f.correct))}</span>${yearDiff ? `<span class="hand">${yearDiff > 0 ? '晚了' : '早了'}${Math.abs(yearDiff)}年</span>` : ''}</td></tr>`;
  }).join('');
  const first = s.result.fields.map(f => contrastFor(f, s)).find(Boolean);
  box.innerHTML = `<table><thead><tr><th>项目</th><th>你的答案</th><th>正确答案</th></tr></thead><tbody>${rows}</tbody></table>${first ? `<p class="contrast" style="border:0;padding-left:0">${first.html} <button type="button" data-preview="${first.t.id}">▶ 对比听 10 秒</button></p>` : ''}<button class="more" type="button" id="fixMore">查看全部选项 ▾</button>`;
}
function paint(animate) {
  const s = ctx.getState(), t = s.question?.track;
  document.body.toggleAttribute('data-revealed', !!s.result);
  if (!s.result) return;
  const delayStep = animate ? 70 : 0; let order = 0;
  groups().forEach(g => {
    const key = keyOf(g), f = s.result.fields.find(x => x.key === key); clearPen(g); if (!f) return;
    g.querySelectorAll('.contrast,.year-axis-done').forEach(x => x.remove());
    const target = g.querySelector('.choice.ans .choice-text strong') || (!f.isCorrect ? g.querySelector('.written-result strong') : null);
    if (target) penLoop(g, target, { padX: 9, padY: 5, seed: 5 + order, animate, delay: delayStep * order++ });
    if (key === 'year' && !f.isUnknown && !f.isCorrect && Number(f.chosen)) {
      const d = Number(f.chosen) - t.year, mark = g.querySelector('.choice.ans .result-mark');
      if (mark) mark.innerHTML = `<span class="hand">${d > 0 ? '晚了' : '早了'}${Math.abs(d)}年</span>`;
    }
    const c = contrastFor(f, s);
    if (c) g.insertAdjacentHTML('beforeend', `<p class="contrast">${c.html} <button type="button" data-preview="${c.t.id}">▶ 对比听 10 秒</button></p>`);
  });
  fixTable(s);
  document.querySelectorAll('#fixTable .loopme').forEach((el, i) => { if (el.offsetParent) penLoop(el.closest('td'), el, { padX: 7, padY: 4, seed: 11 + i, animate, delay: delayStep * i }); });
  const label = $('replayLabel'); if (label) label.textContent = '带答案重听';
  if (s.sessionKind === 'year') yearEcho(true);
}
function revealMoment() {
  const s = ctx.getState(); if (!s.result) return;
  loadPeaks().then(() => { drawHeard(); drawDeck(true); fadeIn($('deckRecord'), TOKENS.base); });
  drawHeard(); drawDeck(true);
  const y = $('stageYear');
  if (y && !y.classList.contains('slot') && !reduced()) { y.innerHTML = [...y.textContent].map(ch => `<span>${ch}</span>`).join(''); [...y.children].forEach((d, i) => rise(d, { y: 12, ms: TOKENS.quick, delay: i * 30 })); }
  fadeIn(document.querySelector('.st-head'), TOKENS.quick);
  fadeIn($('statusTitle'), TOKENS.quick);
  fadeIn($('courseNote'), TOKENS.base, 60);
  const fx = $('feedback'); if (fx) fadeIn(fx, TOKENS.base, 60);
  if (s.result.score === s.result.total && s.sessionKind !== 'year') $('statusTitle').insertAdjacentHTML('beforeend', '<span class="hand">对，就是这个！</span>');
  sleeves(true);
  statusHelp(); segs(); tabs(); movePlate();
}

/* Album sleeves join only after the answer is in: before submission no cover (and no album name) is in the page,
   so the picture can never give the song away. The record's centre label becomes the sleeve, the course note carries the
   full square sleeve, and each song option shows its own sleeve for comparison. One mapping (covers.js) with the archive. */
function sleeves(reveal) {
  document.querySelectorAll('.deck-label,.note-sleeve,.opt-sleeve').forEach(el => el.remove());
  document.querySelectorAll('.choice.has-sleeve').forEach(el => el.classList.remove('has-sleeve'));
  const s = ctx.getState(); if (!reveal || !s.result || !s.question) return;
  const t = s.question.track, c = coverFor(t), e = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  if (c) {
    // Only a round label or a square sleeve can sit on the turntable's centre; documents and photos stay whole in the note.
    if (c.shape === 'round' || c.shape === 'square') document.querySelector('#audioPlayer .rec-wrap')?.insertAdjacentHTML('beforeend', `<span class="deck-label" style="background-image:url(${c.img})" aria-hidden="true"></span>`);
    const carrier = [c.label, c.catalog].filter(Boolean).join(' ');
    $('courseNote')?.insertAdjacentHTML('beforeend', `<figure class="note-sleeve" data-shape="${c.shape}"><img src="${c.img}" alt="${e(KIND[c.kind] || '唱片图像')}：《${e(c.album)}》" width="${c.w}" height="${c.h}" decoding="async"><figcaption><b>${e(KIND[c.kind] || '')}</b><br><span lang="${langOf(c.album)}">《${e(c.album)}》</span>${carrier ? `<br>${e(carrier)}` : ''}${c.released ? ` · ${e(c.released)}` : ''}<br>${c.match === 'version' ? '同曲的另一次录音' : c.match === 'context' ? e(RELATION[c.relation] || '') : e(RELATION[c.relation] || '收录本曲')}</figcaption></figure>`);
    fadeIn(document.querySelector('.deck-label'), TOKENS.base, 80); fadeIn(document.querySelector('.note-sleeve'), TOKENS.base, 120);
  }
  // Each song option shows its own image. The correct option uses this question's track; a distractor title shared by two
  // recordings (Hound Dog, Shake, Rattle and Roll, Maple Leaf Rag) shows nothing rather than a picture that may belong to the other one.
  const songs = groups().find(g => keyOf(g) === 'song'); if (!songs) return;
  songs.querySelectorAll('.choice').forEach(ch => {
    const v = ch.querySelector('input')?.value, same = ctx.catalog.tracks.filter(x => x.song === v);
    const tr = v === t.song ? t : same.length === 1 ? same[0] : null, cv = tr && coverFor(tr);
    if (!cv) return;
    ch.classList.add('has-sleeve');
    ch.querySelector('.choice-letter')?.insertAdjacentHTML('afterend', `<span class="opt-sleeve" data-shape="${cv.shape}" style="background-image:url(${cv.img})" aria-hidden="true"></span>`);
  });
}

/* year mode: buttons answer, the axis only echoes the choice; the reveal slides it to the right year */
function yearEcho(reveal = false) {
  const s = ctx.getState(); if (s.sessionKind !== 'year' || !s.question) return;
  const g = groups()[0]; if (!g) return;
  g.querySelector('.year-axis')?.remove();
  const opts = [...g.querySelectorAll('input[type=radio]')].map(i => Number(i.value)).filter(Boolean);
  if (!opts.length) return;
  const t = s.question.track, all = [...opts, t.year], lo = Math.floor(Math.min(...all) / 10) * 10, hi = Math.ceil((Math.max(...all) + 1) / 10) * 10;
  const X = y => 20 + (y - lo) / (hi - lo) * 960, chosen = Number(s.answers?.year);
  let a = `<path d="M20 40H980" stroke="#D3D2CA" stroke-width="1.5"/>`;
  for (let y = lo; y <= hi; y += 10) a += `<path d="M${X(y)} 34V46" stroke="#66686F"/><text x="${X(y)}" y="66" text-anchor="middle" font-size="13" fill="#66686F">${y}</text>`;
  for (const y of opts) { const on = y === chosen && !s.result; a += `<rect x="${X(y) - (on ? 6 : 4)}" y="${40 - (on ? 6 : 4)}" width="${on ? 12 : 8}" height="${on ? 12 : 8}" fill="${on ? '#141414' : '#FAFAF7'}" stroke="${on ? '#141414' : '#7A7D84'}" stroke-width="1.5"/>`; }
  if (s.result) {
    const neigh = ctx.catalog.tracks.filter(x => x.id !== t.id && s.sessionTargets.has?.(x.id) && s.sessionHistory.some(e => e.id === x.id) && Math.floor(x.year / 10) === Math.floor(t.year / 10)).slice(0, 3);
    neigh.forEach((x, i) => { a += `<rect x="${X(x.year) - 3}" y="37" width="6" height="6" fill="#141414" opacity=".45"/><text x="${X(x.year)}" y="${22 - i * 14}" text-anchor="middle" font-size="12" fill="#66686F">${x.year} ${esc(x.song).slice(0, 20)}</text>`; });
    a += `<path d="M${X(t.year)} 8V40" stroke="#C8341B" stroke-width="2"/><rect x="${X(t.year) - 6}" y="34" width="12" height="12" fill="#C8341B"/>`;
  }
  g.insertAdjacentHTML('beforeend', `<svg class="year-axis" viewBox="-10 -24 1000 96" aria-hidden="true">${a}</svg>`);
}

/* contrast listening: a separate element so the main player's state stays untouched */
function preview(btn) {
  const t = ctx.catalog.tracks.find(x => x.id === btn.dataset.preview), main = audio();
  const stop = () => { clearTimeout(previewTimer); if (previewAudio) { previewAudio.pause(); previewAudio = null; } document.querySelectorAll('[data-preview]').forEach(b => { b.textContent = '▶ 对比听 10 秒'; }); };
  if (previewAudio) { const same = previewAudio.dataset.id === btn.dataset.preview; stop(); if (same) return; }
  if (!t) return;
  const wasPlaying = !main.paused && !main.ended; main.pause();
  previewAudio = new Audio(t.src); previewAudio.dataset.id = t.id;
  btn.textContent = '■ 停止';
  const finish = () => { stop(); if (wasPlaying) main.play().catch(() => {}); };
  previewAudio.addEventListener('ended', finish);
  previewAudio.play().catch(finish);
  previewTimer = setTimeout(finish, 10000);
}

function onQuestion() {
  fixTable(ctx.getState());
  clearTimeout(advanceTimer); willReveal = false;
  if (previewAudio) { previewAudio.pause(); previewAudio = null; clearTimeout(previewTimer); }
  document.body.classList.remove('show-all');
  document.body.toggleAttribute('data-revealed', !!ctx.getState().result);
  const label = $('replayLabel'); if (label) label.textContent = '重听';
  drawDeck(!!ctx.getState().result); drawHeard(); segs(); statusHelp(); decorate(); sleeves(!!ctx.getState().result);
  // a revealed question restored on reload never sees the fields event; its red pen is drawn once the room is visible
  if (ctx.getState().result && document.body.dataset.room === 'train') queueMicrotask(() => paint(false));
  setCurrent(firstOpen(), { animate: false });
  yearEcho();
  fadeIn($('answerFields'), 120); fadeIn(document.querySelector('.st-head'), 120); fadeIn($('stageYear'), 120);
}
function decorate() {
  groups().forEach(g => { const k = keyOf(g); if (k) g.dataset.key = k; if (k === 'artist') g.dataset.alwaysHelp = ''; });
}
function onFields(e) {
  decorate();
  const s = ctx.getState();
  groups().forEach(g => g.classList.toggle('is-current', keyOf(g) === cur && !s.result));
  if (!s.result) { if (!cur || !groups().some(g => keyOf(g) === cur)) setCurrent(firstOpen(), { animate: false }); else { movePlate(false); tabs(); } yearEcho(); return; }
  queueMicrotask(() => { const animate = willReveal; willReveal = false; paint(animate); if (!animate) sleeves(true); });
}
export function init(c) {
  ctx = c;
  spin = turntable(document.querySelector('#audioPlayer .rec-wrap') || $('deckRecord'));
  loadPeaks();
  const form = $('answerForm');
  form.addEventListener('pointerdown', e => {
    const g = e.target.closest('.field-card'); if (!g || ctx.getState().result) return;
    if (e.target.closest('.choice')) source = 'pointer';
    if (keyOf(g) !== cur) setCurrent(keyOf(g), { animate: true });
  }, true);
  form.addEventListener('focusin', e => { const g = e.target.closest('.written-card'); if (g && keyOf(g) !== cur) setCurrent(keyOf(g)); });
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]'); if (tab) { const keys = groups().map(keyOf); setCurrent(tab.dataset.tab, { dir: keys.indexOf(tab.dataset.tab) >= keys.indexOf(cur) ? 1 : -1 }); }
    const pv = e.target.closest('[data-preview]'); if (pv) { e.preventDefault(); preview(pv); }
    if (e.target.closest('#fixMore')) { document.body.classList.toggle('show-all'); e.target.textContent = document.body.classList.contains('show-all') ? '收起选项 ▴' : '查看全部选项 ▾'; }
    if (e.target.closest('#back5')) ctx.actions.seekBy(-5);
    if (e.target.closest('#fwd5')) ctx.actions.seekBy(5);
  });
  // 大肥鱼 peeks over the top edge of the stage, outside every control: she keeps time while the song plays and reacts for
  // one beat after an answer (both hands up for four out of four, a small tilt otherwise). She never covers the question.
  const peek = document.createElement('div'); peek.className = 'stage-fish'; peek.setAttribute('aria-hidden', 'true');
  const fish = createBigFish({ pose: 'peek', size: 64, label: '' }); peek.appendChild(fish.el);
  const toolbar = document.querySelector('#questionSection .session-toolbar');
  toolbar.appendChild(peek);
  // The torn-paper mask clips everything outside the audio panel. Put the peeking head in a free toolbar gap,
  // directly above that panel, and keep it clear of the back/progress/year-card/finish controls at every width.
  function placePeek() {
    if (document.body.dataset.room !== 'train') return;
    const box = toolbar.getBoundingClientRect(), width = peek.offsetWidth, inset = 6;
    const occupied = [...toolbar.querySelectorAll('.tb-back,.tb-progress,.tb-right')].map(el => el.getBoundingClientRect()).filter(r => r.width > 0).sort((a,b) => a.left - b.left);
    const gaps = []; let edge = box.left + inset;
    for (const r of occupied) { if (r.left - edge >= width + inset * 2) gaps.push({left:edge,right:r.left}); edge = Math.max(edge,r.right); }
    if (box.right - inset - edge >= width + inset * 2) gaps.push({left:edge,right:box.right - inset});
    const gap = gaps.sort((a,b) => (b.right-b.left) - (a.right-a.left))[0];
    if (gap) {
      toolbar.appendChild(peek); peek.removeAttribute('data-in-stage');
      peek.style.left = ((gap.left + gap.right - width) / 2 - box.left) + 'px';
    } else {
      // Very narrow or densely filled toolbars keep their space: the head peeks from the record's lower edge instead.
      $('audioPlayer').appendChild(peek); peek.setAttribute('data-in-stage',''); peek.style.left = '';
    }
  }
  addEventListener('museum:room', e => { if(e.detail.name === 'train') placePeek(); });
  addEventListener('resize', placePeek);
  document.fonts?.ready.then(placePeek);
  addEventListener('museum:audio', e => { const st = e.detail.state; if (st === 'play') fish.pose('listen'); else if (st === 'pause' || st === 'ended') fish.pose('peek'); });
  addEventListener('museum:reveal', () => { const r = ctx.getState().result; if (r) fish.react(r.score === r.total ? 'yay' : 'hmm', 1100); });
  addEventListener('museum:question', () => fish.pose('peek'));
  addEventListener('museum:question', onQuestion);
  addEventListener('museum:fields', onFields);
  addEventListener('museum:select', onSelect);
  addEventListener('museum:reveal', () => { willReveal = true; lastRevealedResult = ctx.getState().result; queueMicrotask(revealMoment); });
  addEventListener('museum:rerender', () => { statusHelp(); });
  addEventListener('museum:audio', e => { spin.set(e.detail.state === 'play'); if (e.detail.state === 'waiting') return; drawHeard(); });
  addEventListener('museum:room', e => { if (e.detail.name === 'train') { drawDeck(!!ctx.getState().result); drawHeard(); segs(); statusHelp(); if (ctx.getState().result) paint(false); requestAnimationFrame(() => movePlate(false)); movePlate(false); } else spin.set(false); });
  audio().addEventListener('timeupdate', drawHeard);
  addEventListener('resize', () => { movePlate(false); drawHeard(); });
  if (c.getState().question) onQuestion();
}
