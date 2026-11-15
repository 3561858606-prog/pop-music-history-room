// Home · 特刊跨页. Two magazine pages: the left one introduces this round (issue number = round number), the right one
// carries the cover portrait, the cobalt torn paper that starts the round, last round's result on Queen II, and this issue's
// seven lectures as a table of contents. A lecture's title starts one random round of that lecture straight away; the
// square in front of it adds the lecture to a custom scope instead. Everything on the page is filled from the catalogue,
// the learning record and covers.js.
import { coverFor, KIND } from '../covers.js';
import { counts } from './mastery.js';
import { createBigFish } from './bigfish.js';
import { initShell } from './shell.js';
import { seeded } from './motion.js';
import { appearancesFor } from '../track-model.js';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
// Record labels without people on them, stuck on the pages as ornaments (each a verified image from covers.js).
const ORNAMENTS = [
  { id: 't31', cls: 'o1', page: 'pg-r' }, // Peacock 1612 · Big Mama Thornton · 1952
  { id: 't14', cls: 'o2', page: 'pg-r' }, // Brunswick 6265 · Duke Ellington · 1932
  { id: 't41', cls: 'o3', page: 'pg-r' }, // Chess 1691 · Chuck Berry · 1958
  { id: 't28', cls: 'o-l1', page: 'pg-l' }, // Decca 23610 · Louis Jordan · 1946
  { id: 't01', cls: 'o-l2', page: 'pg-l' }, // HMV I.R.204 · Richard Crooks · 1937
  { id: 't68', cls: 'o-l3', page: 'pg-l' }, // CBS 1704 · The Temptations · 1965
];
const PORTRAITS = [
  ['1956', 'Elvis Presley', 'Elvis Presley', '摇滚乐之王，第 6 讲'],
  ['1963', 'The Beatles', 'With the Beatles', '英国入侵，第 7 讲'],
  ['1967', 'Aretha Franklin', 'I Never Loved a Man the Way I Love You', '灵魂乐女王，第 7 讲'],
  ['1974', 'Queen', 'Queen II', '课程之后'],
  ['1982', 'Michael Jackson', 'Thriller', '流行之王，课程之后'],
];
let ctx, fish;

const memory = () => ctx.archive.memory;
const inLecture = id => ctx.catalog.tracks.filter(t => appearancesFor(t).some(a => a.deck === id));

function toc() {
  const s = ctx.getState(), rec = memory().records, busy = s.sessionStarted;
  $('lectureList').innerHTML = ctx.catalog.lectures.map(L => {
    const items = inLecture(L.id), held = items.filter(t => t.uncertainAudio).length, got = items.filter(t => rec[t.id]).length;
    const picked = s.selectedDecks.includes(L.id);
    return `<li class="toc-row${picked ? ' picked' : ''}" style="--c:var(--l${L.id})">`
      + `<button class="toc-pick" type="button" data-pick="${L.id}" aria-pressed="${picked}"${busy ? ' disabled' : ''} aria-label="${picked ? `把第 ${L.id} 讲移出这一轮的范围` : `把第 ${L.id} 讲加入这一轮的范围`}"><i></i></button>`
      + `<button class="toc-go" type="button" data-lecture="${L.id}"${busy ? ' disabled' : ''} aria-label="第 ${L.id} 讲 ${esc(L.label)}，${esc(L.period)}，已入藏 ${got} / ${items.length}。${busy ? '本轮结束后可练' : `随机练一轮，${items.length - held} 首可出题`}">`
      + `<span class="toc-t">${esc(L.label)}</span><small>${esc(L.period)}</small><span class="toc-c">${got} / ${items.length}${held ? ` · ${held} 待核` : ''}</span><span class="toc-n num">${pad(L.id)}</span></button></li>`;
  }).join('');
}

function today() {
  const s = ctx.getState(), recs = memory().records, wrong = s.wrongIds.length, c = counts(memory(), ctx.catalog.tracks), busy = s.sessionStarted;
  const rounds = s.reports.filter(r => r.kind !== 'year'), now = new Date(), last = s.reports.at(-1), issue = rounds.length + 1;
  $('issueNo').textContent = '/' + pad(issue);
  $('issueLine').textContent = `第 ${issue} 轮 · ${now.getMonth() + 1} 月 ${now.getDate()} 日` + (busy && s.sessionGoal ? ` · 已答 ${s.sessionHistory.length} / ${s.sessionGoal}` : '');
  $('wallCount').textContent = `已入藏 ${Object.keys(recs).length}`;
  $('reviewCount').textContent = wrong;
  $('reviewHint').textContent = busy ? '本轮结束后可以复习' : wrong ? (c.weak ? `其中明显薄弱 ${c.weak} 首` : '四项全对后移出') : '还没有待巩固的歌';
  $('reviewWrong').disabled = busy || !wrong;
  $('historyCount').textContent = s.reports.length;
  if (last) {
    const full = last.entries.filter(e => e.fields.every(f => f.isCorrect)).length, f = last.entries.flatMap(e => e.fields), pct = f.length ? Math.round(f.filter(x => x.isCorrect).length / f.length * 100) : 0;
    $('historyHint').textContent = `上一轮，${last.entries.length} 首里 ${full} 首四项全对，四项正确率 ${pct}%。`;
  } else $('historyHint').textContent = '还没有完成的一轮。听完一轮，结果贴在这里。';
  $('homeHistoryButton').disabled = busy || !s.reports.length;
  const pool = new Set((s.scopePool || []).map(String)), scoped = ctx.catalog.tracks.filter(t => pool.has(t.id));
  $('scopeSongList').innerHTML = scoped.map(t => `<li><b>${pad(t.deck)}</b><span lang="${/[가-힣]/.test(t.song) ? 'ko' : 'en'}">${esc(t.song)}</span> · ${esc(t.artist)}</li>`).join('') || '<li>这个范围暂时没有可以出题的歌。</li>';
  const decks = new Set(s.selectedDecks), held = ctx.catalog.tracks.filter(t => t.uncertainAudio && appearancesFor(t).some(a => decks.has(a.deck)));
  $('heldNote').textContent = ''; void held;
}

// The four fields, as the contributors list of the issue: how often each one has been right so far.
function fields() {
  const h = ctx.getState().history || [], rows = [['song', '歌名'], ['year', '年份'], ['artist', '音乐家'], ['style', '风格']];
  $('fieldList').innerHTML = rows.map(([k, label]) => {
    const f = h.flatMap(e => e.fields).filter(x => x.key === k), pct = f.length ? Math.round(f.filter(x => x.isCorrect).length / f.length * 100) + '%' : '—';
    return `<li><span>${label}</span><b>${pct}</b></li>`;
  }).join('') + `<li class="hash"><span>#${pad(Object.keys(memory().records).length)}</span><span>已入藏</span></li>`;
}

// The cobalt paper says the one next thing, in the student's terms.
function cta() {
  const s = ctx.getState(), btn = $('startButton'); if (!btn) return;
  const n = (s.scopePool || []).length, all = s.sessionLength === 'all', q = all ? n : Math.min(Number(s.sessionLength) || 10, n), seen = Object.keys(memory().records).length;
  let k, b, go;
  if (s.sessionStarted) { k = '本轮进行中'; b = `还剩 ${Math.max(0, s.sessionGoal - s.sessionHistory.length)} 题`; go = '继续'; }
  else if (!n) { k = '这个范围没有可以出题的歌'; b = '先换个范围'; go = ''; }
  else if (!seen) { k = '第一次来'; b = `先听 ${q} 首`; go = '开始'; }
  else { k = all ? `这一轮 · 范围里的 ${q} 首全部听一遍` : `这一轮 · 随机 ${q} 题，不重复`; b = '开始这一轮'; go = '开始'; }
  btn.innerHTML = `<span class="k">${k}</span><b>${b}</b><span class="go">${go ? go + ' →' : ''}</span>`;
}

// Pen scribbles over the photographs, the same hand on every load (seeded).
function scribble(seed, w, h, loops = 9) {
  const rnd = seeded(seed); let x = w * .5, y = h * .5, d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
  for (let i = 0; i < loops * 3; i++) { const nx = w * (.15 + rnd() * .7), ny = h * (.15 + rnd() * .7), cx = (x + nx) / 2 + (rnd() - .5) * w * .5, cy = (y + ny) / 2 + (rnd() - .5) * h * .5; d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`; x = nx; y = ny; }
  return `<svg class="scrib" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

function ornaments() {
  for (const o of ORNAMENTS) {
    const t = ctx.catalog.tracks.find(x => x.id === o.id), c = t && coverFor(t); if (!c) continue;
    document.querySelector('.' + o.page)?.insertAdjacentHTML('beforeend', `<span class="orn ${o.cls}" aria-hidden="true"><img src="${c.img}" alt="" decoding="async" loading="lazy"></span>`);
  }
  document.querySelector('.mg-r1')?.insertAdjacentHTML('beforeend', scribble(7, 120, 160, 7).replace('class="scrib"', 'class="scrib" style="left:56%;width:70%"'));
  document.querySelector('.mg-r2')?.insertAdjacentHTML('afterbegin', scribble(19, 200, 160, 6).replace('class="scrib"', 'class="scrib" style="opacity:.55;z-index:0"'));
  document.querySelector('.o3')?.insertAdjacentHTML('beforeend', scribble(23, 100, 100, 5).replace('class="scrib"', 'class="scrib" style="inset:-14%;width:128%;height:128%"'));
}

function credits() {
  const rows = PORTRAITS.map(([y, a, al, why]) => `<li><b>${y}</b>${esc(a)}《${esc(al)}》 · ${esc(why)}</li>`);
  for (const o of ORNAMENTS) {
    const t = ctx.catalog.tracks.find(x => x.id === o.id), c = t && coverFor(t);
    if (c) rows.push(`<li><b>${esc(String(c.released || c.recorded || '').slice(0, 4))}</b>${esc(c.label || '')} ${esc(c.catalog || '')} · ${esc(c.artist)}《${esc(c.album)}》${esc(KIND[c.kind] || '')}</li>`);
  }
  $('wallCredits').innerHTML = rows.join('');
}

function render() { if (!ctx) return; toc(); today(); fields(); cta(); }

function pick(id) {
  const s = ctx.getState();
  // plain checkboxes: ticked = in this round's scope; 全选 / 取消 below the list does all of them at once
  const next = s.selectedDecks.includes(id) ? s.selectedDecks.filter(x => x !== id) : [...s.selectedDecks, id].sort((a, b) => a - b);
  ctx.actions.setDecks(next);
}

function curator() {
  const slot = $('curatorSlot'); if (!slot) return;
  fish = createBigFish({ pose: 'peek', size: 84, label: '大肥鱼从开始按钮后面探出头' });
  slot.appendChild(fish.el);
  const btn = $('startButton');
  btn.addEventListener('pointerenter', () => { if (!btn.disabled) fish.pose('listen'); });
  btn.addEventListener('pointerleave', () => fish.pose('peek'));
  btn.addEventListener('click', () => { if (!btn.disabled) fish.react('yay', 700); });
}

export function init(c) {
  ctx = c; initShell(c); curator(); ornaments(); credits();
  $('lectureList').addEventListener('click', e => {
    const p = e.target.closest('.toc-pick[data-pick]'); if (p && !p.disabled) { pick(Number(p.dataset.pick)); return; }
    const b = e.target.closest('.toc-go[data-lecture]'); if (b && !b.disabled) ctx.actions.practiceDeck(Number(b.dataset.lecture));
  });
  $('reviewWrong').addEventListener('click', () => ctx.actions.reviewWrong());
  document.addEventListener('click', e => { if (e.target.closest('[data-scope-open]')) { ctx.rooms.go('home'); document.querySelector('.toc-pick')?.focus(); } });
  // the song list under the contents closes when you click anywhere else, like a note you let go of
  document.addEventListener('pointerdown', e => { const d = $('scopeSongs'); if (d?.open && !d.contains(e.target)) d.open = false; });
  document.addEventListener('keydown', e => { const d = $('scopeSongs'); if (e.key === 'Escape' && d?.open) { d.open = false; d.querySelector('summary')?.focus(); } });
  addEventListener('museum:fx', e => { if (e.detail.kind === 'fish-hop') fish?.react('yay', 650); });
  for (const ev of ['stats', 'wall', 'collect', 'finish']) addEventListener('museum:' + ev, render);
  addEventListener('museum:room', e => { if (e.detail.name === 'home') render(); });
  render();
}
