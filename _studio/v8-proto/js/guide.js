// 说明卡：上手指南 · 更新说明 · 小设计。内容都放在 changelog.js，每次更新只改那里。
// 信息分三层，只有第一层会主动出现：
//   1. 新用户：开场动画后弹一次上手指南；来过的人：每次更新后左下角出现一次小纸条（不弹窗）。
//   2. 想看再看：右上角「?」打开说明卡，「更新」里是完整的更新记录，「小设计」里是所有细节设计。
//   3. 顺便看到：每做完一轮，结果页底部放一条「你可能没注意到」，一次一条，看过不再出现。
import * as M from './model.js';
import {RELEASES, DESIGNS} from './changelog.js';

const ILL = {
  look: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[46, 39, 32, 25].map(r => `<circle class="l" cx="72" cy="58" r="${r}"/>`).join('')}
    <circle class="lb" cx="72" cy="58" r="46"/><circle class="lbl" cx="72" cy="58" r="15"/>
    <text x="72" y="61" text-anchor="middle" class="sm">1968</text><text x="72" y="8" text-anchor="middle">1854</text>
    <path class="lb" d="M146 58H124m0 0l6-4m-6 4l6 4"/><text class="cn" x="122" y="74">向内更晚</text></svg>`,
  listen: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[48, 40, 32, 24].map(r => `<circle class="l" cx="62" cy="62" r="${r}"/>`).join('')}
    <circle class="lbl" cx="62" cy="62" r="13"/><circle class="lb" cx="140" cy="14" r="6"/>
    <path class="lb arm" d="M140 14L104 44 96 54"/><rect class="head" x="90" y="52" width="10" height="7" rx="1" transform="rotate(-38 95 55)"/>
    <rect class="box ok" x="116" y="76" width="34" height="22" rx="2"/><path class="af" d="M129 81l9 6-9 6z"/></svg>`,
  answer: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[['歌名', 8, 10, 1], ['年份', 84, 10, 0], ['音乐家', 8, 60, 0], ['风格', 84, 60, 0]].map(([t, x, y, ok]) => `
      <rect class="box${ok ? ' ok' : ''}" x="${x}" y="${y}" width="68" height="42" rx="2"/><text class="cn" x="${x + 8}" y="${y + 16}">${t}</text>
      <path class="l" d="M${x + 8} ${y + 30}h${ok ? 38 : 30}"/>${ok ? `<path class="tick" d="M${x + 52} ${y + 28}l4 4 8-9"/>` : ''}`).join('')}</svg>`,
  cut: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[46, 39, 32, 25].map(r => `<circle class="l" cx="80" cy="58" r="${r}"/>`).join('')}
    <circle class="a" cx="80" cy="58" r="39"/><circle class="ap" cx="80" cy="58" r="25" transform="rotate(30 80 58)"/>
    <circle class="lbl" cx="80" cy="58" r="13"/>
    <path class="lb" d="M134 22l-12 10"/><text class="cn" x="136" y="20">刻满</text>
    <path class="lb" d="M101 99L83 85"/><text class="cn" x="103" y="106">刻了一部分</text></svg>`
};
const STEPS = [
  ['01', '看', '一圈，一首歌', '外圈 1854，内圈 1968。拖动转盘，点一条年代带就能贴近看。', ILL.look],
  ['02', '听', '点歌，落针试听', '看封面和故事；带<span class="vid-tag"><i aria-hidden="true"></i>视频</span>的歌能直接看课件视频。', ILL.listen],
  ['03', '答', '落针一轮', '随机听 10 首，每首答歌名、年份、音乐家、风格。选择题、填空题都行。', ILL.answer],
  ['04', '刻', '答对就刻上', '答对的部分刻进那一圈，记住的圈会发亮；还是漆面的，就是下次该听的。', ILL.cut]
];


const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LATEST = RELEASES[0];
const TAG = {new: '新', fix: '修复', tweak: '改进'};
const day = v => { const [, m, d] = v.match(/^\d{4}-(\d{2})-(\d{2})/) || []; return m ? `${+m} 月 ${+d} 日` : v; };
const count = r => { const n = {new: 0, fix: 0, tweak: 0}; for (const i of r.items) n[i.t]++; return n; };
const countText = r => { const n = count(r); return [n.new && `新功能 ${n.new}`, n.fix && `修复 ${n.fix}`, n.tweak && `改进 ${n.tweak}`].filter(Boolean).join(' · '); };
const GO_LABEL = {start: '看指南', details: '看看', history: '去历史', 'catalog-video': '去看看', disc: '去盘面'};
const itemHTML = i => `<li><em class="rel-tag" data-t="${i.t}">${TAG[i.t]}</em><span>${esc(i.text)}</span>${i.go ? `<button class="rel-go" data-go="${i.go}">${GO_LABEL[i.go]} →</button>` : ''}</li>`;

function newsHTML() {
  const [latest, ...older] = RELEASES, first = RELEASES.at(-1);
  return `<p class="g-k">更新说明</p><h2 id="guideNewsTitle">一直在更新</h2>
    <p class="g-lede">从 ${day(first.v)}的第一版起，已经更新 ${RELEASES.length - 1} 次。最近一次在 ${day(latest.v)}。</p>
    <article class="rel rel-latest"><header><time datetime="${latest.v.slice(0, 10)}">${day(latest.v)}</time><b>${esc(latest.title)}</b><span>${countText(latest)}</span></header><ul>${latest.items.map(itemHTML).join('')}</ul></article>
    <ol class="rel-older">${older.map(r => `<li><details class="rel"><summary><time datetime="${r.v.slice(0, 10)}">${day(r.v)}</time><b>${esc(r.title)}</b><span>${countText(r)}</span></summary><ul>${r.items.map(itemHTML).join('')}</ul></details></li>`).join('')}</ol>`;
}
function detailsHTML() {
  const groups = [...new Set(DESIGNS.map(d => d.group))];
  return `<p class="g-k">小设计</p><h2>藏在细节里的设计</h2>
    <p class="g-lede">不知道也能用，知道了会更顺手。一共 ${DESIGNS.length} 个，以后还会加。</p>
    ${groups.map(g => `<section class="d-group"><h3>${g}</h3><ul>${DESIGNS.filter(d => d.group === g).map(d => `<li><b>${esc(d.title)}${d.since === LATEST.v ? '<em class="d-new">新</em>' : ''}</b><p>${esc(d.text)}</p></li>`).join('')}</ul></section>`).join('')}`;
}

export function createGuide({focusDisc, dropButton, onDisc, navigate}) {
  const save = () => M.savePrefs();
  const help = document.getElementById('helpBtn');
  const unread = () => M.prefs.readRelease !== LATEST.v;
  const markDot = () => {
    help.dataset.dot = !M.prefs.guideOpened || unread() ? '1' : '0';
    help.setAttribute('aria-label', unread() ? '上手指南与更新说明（有新的更新）' : '上手指南与更新说明');
    dlg.querySelector('[data-tab=news]').dataset.unread = unread() ? '1' : '0';
  };

  /* ---------- 说明卡：上手 / 更新 / 小设计 ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'guide'; dlg.setAttribute('aria-label', '上手指南与更新说明');
  dlg.innerHTML = `<header class="g-head">
      <div class="g-tabs" role="tablist" aria-label="说明">
        <button role="tab" id="gtab-start" data-tab="start" aria-controls="gpanel-start">上手</button>
        <button role="tab" id="gtab-news" data-tab="news" aria-controls="gpanel-news">更新<i aria-hidden="true"></i></button>
        <button role="tab" id="gtab-details" data-tab="details" aria-controls="gpanel-details">小设计</button>
      </div>
      <button class="g-close" data-g="close" aria-label="关闭">×</button>
    </header>
    <section class="g-sheet" role="tabpanel" id="gpanel-start" aria-labelledby="gtab-start" data-panel="start">
      <p class="g-k">上手指南 · 30 秒</p>
      <h2 id="guideTitle">这张母盘怎么用</h2>
      <ol class="g-steps" tabindex="-1">${STEPS.map(([n, verb, title, text, svg], i) => `
        <li aria-label="第 ${i + 1} 步，共 ${STEPS.length} 步"><span class="g-n">${n} ${verb}</span><div class="g-ill">${svg}</div><b>${title}</b><p>${text}</p></li>`).join('')}</ol>
      <div class="g-dots" aria-hidden="true">${STEPS.map(() => '<i></i>').join('')}</div>
      <ul class="g-more">
        <li><b>目录</b>按歌名、年份、风格搜索</li>
        <li><b>历史</b>回看每一轮的订正</li>
        <li><b>记录</b>只存在这台浏览器；换网址或换设备时，在「历史」导出，再到新地方导入</li>
      </ul>
      <div class="g-foot"><span class="g-again">之后点右上角「?」可以再看，也能看更新和小设计</span>
        <button class="g-skip" data-g="skip">跳过</button><button class="g-go" data-g="go">开始转盘</button></div>
    </section>
    <section class="g-sheet g-read" role="tabpanel" id="gpanel-news" aria-labelledby="gtab-news" data-panel="news" hidden>${newsHTML()}</section>
    <section class="g-sheet g-read" role="tabpanel" id="gpanel-details" aria-labelledby="gtab-details" data-panel="details" hidden>${detailsHTML()}</section>`;
  document.body.append(dlg);
  markDot();
  const list = dlg.querySelector('.g-steps'), dots = [...dlg.querySelectorAll('.g-dots i')], go = dlg.querySelector('.g-go');
  const narrow = () => matchMedia('(max-width:640px)').matches;
  const page = () => Math.round(list.scrollLeft / Math.max(1, list.clientWidth));
  function syncPage() {
    const i = narrow() ? page() : STEPS.length - 1;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    go.textContent = i < STEPS.length - 1 ? '下一步 →' : '开始转盘';
  }
  list.addEventListener('scroll', () => requestAnimationFrame(syncPage), {passive: true});
  addEventListener('resize', () => dlg.open && syncPage());

  let tab = 'start';
  function show(name, focusTab = false) {
    tab = name;
    for (const b of dlg.querySelectorAll('[role=tab]')) { const on = b.dataset.tab === name; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focusTab) b.focus(); }
    for (const p of dlg.querySelectorAll('[role=tabpanel]')) p.hidden = p.dataset.panel !== name;
    dlg.dataset.tab = name; dlg.scrollTop = 0;
    if (name === 'news' && unread()) { M.prefs.readRelease = LATEST.v; save(); }
    if (name === 'start') { list.scrollLeft = 0; syncPage(); }
    markDot();
  }
  dlg.querySelector('.g-tabs').addEventListener('keydown', e => {
    const names = ['start', 'news', 'details'], i = names.indexOf(tab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { show(names[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3], true); e.preventDefault(); }
  });

  let auto = false, opener = null, after = null;
  function open(name = 'start', {first = false} = {}) {
    hideToast(); unpoint();
    auto = first; opener = first ? null : document.activeElement;
    M.prefs.guideSeen = true; M.prefs.guideOpened = true;
    if (first) { M.prefs.seenRelease = LATEST.v; M.prefs.readRelease = LATEST.v; }   // 新用户：所有内容都是新的，不再另提更新
    save(); dlg.returnValue = '';
    if (!dlg.open) dlg.showModal();
    show(name);
    (name === 'start' ? go : dlg.querySelector(`[data-tab=${name}]`)).focus({preventScroll: true});
  }
  dlg.addEventListener('click', e => {
    const t = e.target.closest('[role=tab]'); if (t) return show(t.dataset.tab);
    const target = e.target.closest('[data-go]')?.dataset.go;
    if (target === 'start' || target === 'details') return show(target, true);
    if (target) { after = target; return dlg.close('go'); }
    const act = e.target.closest('[data-g]')?.dataset.g;
    if (act === 'go' && narrow() && page() < STEPS.length - 1) { list.scrollTo({left: (page() + 1) * list.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (act) return dlg.close(act);
    if (e.target === dlg) dlg.close('backdrop');   // 点卡片外的暗处也能关
  });
  dlg.addEventListener('close', () => {
    const target = after; after = null;
    if (target) { auto = false; opener = null; return navigate(target); }
    if (opener && opener.isConnected && opener !== document.body) opener.focus({preventScroll: true});
    else focusDisc();
    if (auto && onDisc()) setTimeout(point, 120);
    auto = false; opener = null;
  });
  help.addEventListener('click', () => open(unread() && M.prefs.seenRelease ? 'news' : 'start'));
  document.addEventListener('click', e => { const d = e.target.closest('[data-open-guide]'); if (d) open(d.dataset.openGuide); });

  /* ---------- 新用户关掉后：在落针按钮旁指一下 ---------- */
  let pointer = null, pointTimer = 0;
  function point() {
    const b = dropButton(); if (!b) return;
    const r = b.getBoundingClientRect();
    if (!r.width || r.top < 60 || r.bottom > innerHeight - 8) return;   // 不在视野里就不指了
    pointer = document.createElement('div'); pointer.className = 'g-point'; pointer.setAttribute('aria-hidden', 'true');
    pointer.style.cssText = `left:${r.left - 5}px;top:${r.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`;
    pointer.innerHTML = '<span>准备好了，就从这里开始一轮</span>';
    document.body.append(pointer);
    clearTimeout(pointTimer); pointTimer = setTimeout(unpoint, 7000);
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'resize', 'hashchange']) addEventListener(ev, unpoint, {once: true, passive: true});
  }
  function unpoint() { clearTimeout(pointTimer); pointer?.remove(); pointer = null; }

  /* ---------- 来过的人：每次更新后，左下角一张小纸条（只出现一次，不弹窗） ---------- */
  let toast = null;
  function showToast() {
    M.prefs.guideSeen = true; M.prefs.seenRelease = LATEST.v; save();
    const top = LATEST.items.slice(0, 2);
    toast = document.createElement('aside'); toast.className = 'g-toast'; toast.setAttribute('aria-label', '网站有更新');
    toast.innerHTML = `<button class="g-x" data-t="x" aria-label="关闭">×</button>
      <p class="g-k">${day(LATEST.v)}更新 · ${countText(LATEST)}</p>
      <b>${esc(LATEST.title)}</b>
      <ul>${top.map(i => `<li>${esc(i.text)}</li>`).join('')}</ul>
      <div><button class="g-open" data-t="open">看看更新</button><button data-t="x">知道了</button></div>`;
    toast.addEventListener('click', e => { const t = e.target.closest('[data-t]')?.dataset.t; if (t === 'open') open('news'); else if (t === 'x') hideToast(); });
    document.body.append(toast);
  }
  function hideToast() { toast?.remove(); toast = null; }
  addEventListener('hashchange', hideToast);

  let pending = 0;
  return {
    open,
    // 每次到盘面时调用。新用户只弹一次上手指南；来过的人有新更新时只出一张小纸条。
    auto({returning, delay}) {
      const fresh = !M.prefs.guideSeen && !returning;
      if (pending || (!fresh && M.prefs.seenRelease === LATEST.v)) return;
      pending = setTimeout(() => {
        pending = 0;
        if (!onDisc() || document.querySelector('dialog[open]')) return;
        if (fresh) open('start', {first: true}); else if (M.prefs.seenRelease !== LATEST.v) showToast();
      }, delay);
    },
    // 一轮结束时，在结果页底部放一条「你可能没注意到」：每次一条，看过的不再出现。
    tip() {
      const shown = Array.isArray(M.prefs.tipsShown) ? M.prefs.tipsShown : [];
      const d = DESIGNS.find(x => !shown.includes(x.id)); if (!d) return '';
      M.prefs.tipsShown = [...shown, d.id]; save();
      return `<aside class="d-tip" aria-label="小设计"><p class="g-k">你可能没注意到 · ${shown.length + 1} / ${DESIGNS.length}</p>
        <p><b>${esc(d.title)}</b>${esc(d.text)}</p><button data-open-guide="details">全部小设计 →</button></aside>`;
    }
  };
}
