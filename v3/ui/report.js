// Report: draws the poster from this round's real answers and works out the next step.
import { reduced, isPhone, ms, seeded, HIT } from './motion.js';
import { createBigFish } from './bigfish.js';
import { coverFor } from '../covers.js';
const $ = id => document.getElementById(id);
const LABEL = { song: '歌名', year: '年份', artist: '音乐家', style: '风格' };
let ctx, lastDrawn = null, celebrateNext = false, posterFish = null, party = [], settle = 0, countFrame = 0;
const score = e => e.fields.filter(f => f.isCorrect).length;
function current() {
  const s = ctx.getState(), id = $('summarySection')?.dataset.reportId, report = s.reports.find(r => r.id === id) || null;
  return { s, report, entries: report?.entries || s.lastSummary || [], kind: report?.kind || s.sessionKind };
}
function stats(reports) { const out = {}; for (const r of reports) for (const e of r.entries) for (const f of e.fields) { const o = out[f.key] ||= { c: 0, n: 0 }; o.n++; if (f.isCorrect) o.c++; } return out; }
function poster({ entries, kind }, previous) {
  const n = entries.length, full = entries.filter(e => score(e) === e.fields.length).length;
  $('posterBig').textContent = n ? `${full} / ${n}` : '0';
  $('posterBigLabel').textContent = !n ? '这轮还没有提交答案' : kind === 'year' ? '首年份答对' : '首四项全对';
  const acc = document.querySelector('.summary-stat.accuracy span');
  if (acc) { acc.dataset.base ||= acc.textContent; acc.textContent = acc.dataset.base; if (previous) { const pct = list => { const f = list.flatMap(e => e.fields); return f.length ? Math.round(f.filter(x => x.isCorrect).length / f.length * 100) : 0; }, d = pct(entries) - pct(previous.entries); acc.textContent += d ? ` · 比上一轮 ${d > 0 ? '+' : ''}${d} 个百分点` : ' · 与上一轮相同'; } }
  bars(entries);
}
// One bar per song at a fixed angle; all bars are the same length, the solid part is how many fields you got right.
function bars(entries) {
  const svg = $('roundBars'), b = svg.getBoundingClientRect(), W = b.width, H = b.height; if (!W) return;
  const n = entries.length, ang = -32 * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-label', `${n} 首歌的得分：${entries.map(score).join('、')}`);
  $('posterLegend').hidden = n > 30 || !n;
  if (n > 30) { // too many to draw as bars: a dense grid of cells, shade = score
    const cols = Math.ceil(Math.sqrt(n * W / H)), rows = Math.ceil(n / cols), s = Math.min(W * .9 / cols, H * .9 / rows), ox = W - cols * s - 24, oy = (H - rows * s) / 2;
    svg.innerHTML = entries.map((e, i) => `<rect x="${ox + (i % cols) * s}" y="${oy + Math.floor(i / cols) * s}" width="${s - 3}" height="${s - 3}" fill="#fff" opacity="${(.15 + .85 * score(e) / e.fields.length).toFixed(2)}"/>`).join('');
    return;
  }
  const d = Math.min(30, Math.max(12, H / (n + 3))), len = isPhone() ? W * .78 : H * 1.05, thick = Math.round(d * .55), fresh = lastDrawn !== entries && !reduced();
  lastDrawn = entries;
  svg.innerHTML = entries.map((e, i) => {
    const shift = len * .06 * Math.sin(i * 1.7), ox = W * (isPhone() ? .05 : .06) + nx * d * i + ux * shift, oy = H * (isPhone() ? .6 : .34) + ny * d * (i - (isPhone() ? n / 2 : 0)) + uy * shift;
    const v = score(e) / e.fields.length, x2 = ox + ux * len, y2 = oy + uy * len, xs = ox + ux * len * v, ys = oy + uy * len * v;
    return `<line x1="${ox}" y1="${oy}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="1.2" opacity=".6"/>${v ? `<line class="solid" data-i="${i}" x1="${ox}" y1="${oy}" x2="${xs}" y2="${ys}" stroke="#fff" stroke-width="${thick}"/>` : ''}<text x="${ox - 8}" y="${oy + 4}" font-size="11" fill="#C4CDEB" font-family="Archivo,sans-serif" text-anchor="end">${i + 1}</text>`;
  }).join('');
  if (fresh) svg.querySelectorAll('.solid').forEach(l => { const L = l.getTotalLength(), i = Number(l.dataset.i); l.animate([{ strokeDasharray: `0 ${L}` }, { strokeDasharray: `${L} 0` }], { duration: 280, delay: i * 26, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); });
}
function fields(previous, weakest) {
  const rows = [...$('summaryFields').querySelectorAll('.field-stat')], prevStats = previous ? stats([previous]) : null, keys = ['song', 'year', 'artist', 'style'];
  rows.forEach((row, i) => {
    const k = keys[i], p = prevStats?.[k]; row.classList.toggle('weak', k === weakest);
    const label = row.children[2];
    row.querySelector('.d')?.remove(); row.querySelector('i s')?.remove();
    const d = document.createElement('span'); d.className = 'd'; d.textContent = p ? `上一轮 ${Math.round(p.c / p.n * 100)}%` : ''; row.appendChild(d);
    if (p) { const s = document.createElement('s'); s.style.left = `calc(${p.c / p.n * 100}% - 1px)`; row.querySelector('i').appendChild(s); }
    void label;
  });
  $('fieldsNote').textContent = previous ? '竖线是上一轮的位置' : '';
}
function nextStep({ s, entries, kind, report }) {
  const same = s.reports.filter(r => (r.kind === 'year') === (kind === 'year'));
  const idx = report ? same.findIndex(r => r.id === report.id) : same.length - 1;
  const recent = same.slice(Math.max(0, idx - 2), idx + 1), st = stats(recent.length ? recent : [{ entries }]);
  const tested = Object.entries(st).filter(([, v]) => v.n), wrong = entries.filter(e => score(e) < e.fields.length).length;
  const sorted = tested.slice().sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n), weakest = sorted[0]?.[0], title = $('nextTitle'), why = $('nextWhy'), diag = $('nextDiag');
  const yr = entries.flatMap(e => e.fields).filter(f => f.key === 'year' && !f.isCorrect && !f.isUnknown && Number(f.chosen) && Number(f.correct)).map(f => Math.abs(Number(f.chosen) - Number(f.correct)));
  diag.textContent = yr.length >= 2 && yr.every(d => d <= 3) ? `本轮 ${yr.length} 个年份错误都在 3 年以内：年代记对了，具体年份还没记住。` : yr.filter(d => d >= 10).length >= 2 ? `有 ${yr.filter(d => d >= 10).length} 个年份差了十年以上：先分清年代，再记具体年份。` : '';
  const t = $('targetedReviewButton');
  const lead = el => { t.classList.toggle('btn', true); t.classList.toggle('sec', t !== el); };
  let mark = null;
  if (!entries.length) { title.textContent = '先听一首吧'; why.textContent = ''; }
  else if (!wrong) { title.textContent = kind === 'year' ? '这一轮年份全对' : '这一轮四项全对'; why.textContent = '隔一段时间再回忆一次，记忆会更稳。'; }
  else if (kind !== 'year' && sorted.length > 1 && (sorted[1][1].c / sorted[1][1].n) - (st[weakest].c / st[weakest].n) >= .1) {
    mark = weakest;
    const o = sorted.slice(1), low = o[0][1];
    title.textContent = `${LABEL[weakest]}是${recent.length > 1 ? `最近 ${recent.length} 轮` : '这一轮'}最弱的一项`;
    why.textContent = `${LABEL[weakest]} ${st[weakest].c} / ${st[weakest].n}，其余三项都在 ${low.c} / ${low.n} 以上。`;
    lead(t);
  } else { title.textContent = `这一轮有 ${wrong} 首还没全对`; why.textContent = '趁现在再听一遍，马上回忆比隔天更省力。'; lead(t); }
  return mark;
}
function trend({ s, kind, report }) {
  const wrap = $('trendWrap'), svg = $('trendChart'), same = s.reports.filter(r => (r.kind === 'year') === (kind === 'year')), idx = report ? same.findIndex(r => r.id === report.id) : same.length - 1;
  const list = same.slice(Math.max(0, idx - 5), idx + 1).map(r => { const f = r.entries.flatMap(e => e.fields); return f.length ? Math.round(f.filter(x => x.isCorrect).length / f.length * 100) : 0; });
  wrap.hidden = list.length < 2; if (wrap.hidden) return;
  const X = i => 30 + i * (420 / Math.max(1, list.length - 1)), Y = v => 104 - v * .9;
  svg.setAttribute('viewBox', '0 0 480 124');
  svg.setAttribute('aria-label', '最近几轮正确率：' + list.join('、'));
  svg.innerHTML = `<path d="M30 104H450" stroke="#D3D2CA"/><text x="0" y="108" font-size="11" fill="#66686F" font-family="Archivo,sans-serif">0</text><path d="M30 14H450" stroke="#E7E6DF"/><text x="0" y="18" font-size="11" fill="#66686F" font-family="Archivo,sans-serif">100</text><polyline points="${list.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="#141414" stroke-width="1.6"/>` + list.map((v, i) => { const last = i === list.length - 1; return `<rect x="${X(i) - 3}" y="${Y(v) - 3}" width="6" height="6" fill="${last ? '#141414' : '#FAFAF7'}" stroke="#141414" stroke-width="1.4"/><text x="${X(i)}" y="${Y(v) - 10}" text-anchor="middle" font-size="11" font-family="Archivo,sans-serif" fill="${last ? '#141414' : '#66686F'}" font-weight="${last ? 600 : 400}">${v}</text>`; }).join('');
}
function note() { $('reportNote').innerHTML = ''; }

// ---- the celebration poster: at the end of every round 大肥鱼 raises both hands and swings her tail, the score counts up,
// one shouted word drops in letter by letter, paper confetti in the lecture colours falls once, and the round's own records
// are pasted along the bottom edge. Any key or click finishes it at once; reduced motion shows the finished poster.
const PAPER = ['#B3AC86', '#F0A35E', '#B7A7DA', '#82B38D', '#9DB2E8', '#FFFFFF', '#DDAF3A', '#D7301F'];
const shoutFor = (full, n) => !n ? '先听一首' : full === n ? '全对！' : full / n >= .7 ? '好棒！' : full / n >= .4 ? '收工！' : '收工，再来';
function collage(entries) {
  const ids = [...new Set(entries.map(e => e.id))].slice(0, 12), rnd = seeded(ids.length * 31 + 7);
  $('posterCollage').innerHTML = ids.map(id => {
    const t = ctx.catalog.tracks.find(x => x.id === id), c = t && coverFor(t), r = (rnd() * 12 - 6).toFixed(1), e = entries.filter(x => x.id === id).at(-1), ok = e && score(e) === e.fields.length;
    return c ? `<span class="pc" data-shape="${c.shape}" style="--r:${r}deg"${ok ? '' : ' data-miss'}><img src="${c.img}" alt="" decoding="async"></span>`
      : `<span class="pc pc-tag" style="--r:${r}deg"${ok ? '' : ' data-miss'}><b>${String(t?.deck ?? '').padStart(2, '0')}</b>${(t?.song || '').slice(0, 14)}</span>`;
  }).join('');
}
function stopParty() {
  clearTimeout(settle); settle = 0;
  cancelAnimationFrame(countFrame); countFrame = 0;
  party.forEach(a => { try { a.cancel(); } catch {} }); party = [];
  $('posterConfetti').replaceChildren();
  const big = $('posterBig'); if (big.dataset.final) big.textContent = big.dataset.final;
  posterFish?.pose('idle');
}
function confetti() {
  const box = $('posterConfetti'), W = box.clientWidth, H = box.clientHeight, rnd = seeded(11); if (!W) return;
  for (let i = 0; i < 64; i++) {
    const el = document.createElement('i'), w = 5 + rnd() * 8, h = 4 + rnd() * 11;
    el.style.cssText = `left:${(rnd() * W).toFixed(0)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:${PAPER[i % PAPER.length]}`;
    box.appendChild(el);
    const dx = (rnd() - .5) * 180, rot = (rnd() - .5) * 760, a = el.animate([{ transform: 'translate(0,-24px) rotate(0deg)' }, { transform: `translate(${dx.toFixed(0)}px,${H + 30}px) rotate(${rot.toFixed(0)}deg)` }],
      { duration: ms(1500 + rnd() * 1300), delay: ms(rnd() * 460), easing: 'cubic-bezier(.3,.55,.5,1)', fill: 'both' });
    a.finished.then(() => el.remove(), () => el.remove()); party.push(a);
  }
}
function shout(text, animate) {
  const el = $('posterShout'); el.innerHTML = [...text].map(ch => `<span>${ch}</span>`).join('');
  if (!animate) return;
  el.querySelectorAll('span').forEach((sp, i) => party.push(sp.animate([{ transform: `translateY(-70px) rotate(${i % 2 ? 16 : -14}deg)`, opacity: 0 }, { transform: 'translateY(0) rotate(0deg)', opacity: 1 }], { duration: ms(460), delay: ms(300 + i * 90), easing: HIT, fill: 'backwards' })));
}
function countUp(full, n, animate) {
  const big = $('posterBig'); if (!animate || !n) return;
  const t0 = performance.now(), dur = ms(720);
  const step = now => { countFrame = 0; const k = Math.min(1, (now - t0) / dur); big.textContent = `${Math.round(full * (1 - Math.pow(1 - k, 3)))} / ${n}`; if (k < 1 && party.length) countFrame = requestAnimationFrame(step); else big.textContent = `${full} / ${n}`; };
  countFrame = requestAnimationFrame(step);
}
function celebrate({ entries }, fresh) {
  const n = entries.length, full = entries.filter(e => score(e) === e.fields.length).length, motion = fresh && !reduced();
  $('posterBig').dataset.final = n ? `${full} / ${n}` : '0';
  stopParty(); collage(entries);
  if (!posterFish) { posterFish = createBigFish({ pose: 'idle', size: isPhone() ? 96 : 150, label: '大肥鱼' }); $('posterFish').appendChild(posterFish.el); }
  shout(shoutFor(full, n), motion);
  if (fresh && n) {
    posterFish.pose('cheer');
    settle = setTimeout(() => { settle = 0; posterFish.pose('idle'); }, ms(4200));
    if (motion) { confetti(); countUp(full, n, true); }
  } else posterFish.pose(n ? 'idle' : 'peek');
}
function render() {
  const data = current(); if ($('summarySection').hidden) return;
  const same = data.s.reports.filter(r => (r.kind === 'year') === (data.kind === 'year')), idx = data.report ? same.findIndex(r => r.id === data.report.id) : -1, previous = idx > 0 ? same[idx - 1] : null;
  poster(data, previous);
  const mark = nextStep(data);
  fields(previous, mark); trend(data); note(data);
  const fresh = celebrateNext; celebrateNext = false; celebrate(data, fresh);
}
export function init(c) {
  ctx = c;
  addEventListener('museum:finish', e => { celebrateNext = !!e.detail?.fresh; queueMicrotask(render); });
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (party.length || settle || countFrame) stopParty(); }, true);
  addEventListener('museum:room', e => { if (e.detail.name !== 'report') { stopParty(); posterFish?.pose('idle'); } });
  addEventListener('museum:room', e => { if (e.detail.name === 'report') render(); });
  addEventListener('resize', () => { if (ctx.rooms.current?.name === 'report') bars(current().entries); });
  if (ctx.rooms.current?.name === 'report') render();
}
