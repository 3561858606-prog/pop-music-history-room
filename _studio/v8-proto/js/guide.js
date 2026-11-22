// 说明卡：上手指南 · 更新说明 · 小设计 · 问题反馈。更新内容放在 changelog.js，每次更新只改那里。
// 信息分三层，只有第一层会主动出现：
//   1. 新用户：开场动画后弹一次上手指南；来过的人：每次更新后左下角出现一次小纸条（不弹窗）。
//   2. 想看再看：右上角「?」打开说明卡，「更新」里是完整的更新记录，「小设计」里是所有细节设计，「反馈」里是联系方式。
//   3. 顺便看到：每做完一轮，结果页底部放一条「你可能没注意到」，一次一条，看过不再出现。
// 顶栏的语言按钮也在这里：中文 / 한국어 / English，换语言后整页重新载入。
import * as M from './model.js';
import {RELEASES, DESIGNS} from './changelog.js';
import {t, L, LANG, LANGS, setLang} from './i18n.js';

const ILL = {
  look: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[46, 39, 32, 25].map(r => `<circle class="l" cx="72" cy="58" r="${r}"/>`).join('')}
    <circle class="lb" cx="72" cy="58" r="46"/><circle class="lbl" cx="72" cy="58" r="15"/>
    <text x="72" y="61" text-anchor="middle" class="sm">${M.yearRange.last}</text><text x="72" y="8" text-anchor="middle">${M.yearRange.first}</text>
    <path class="lb" d="M146 58H124m0 0l6-4m-6 4l6 4"/><text class="cn" x="122" y="74">${t('向内更晚')}</text></svg>`,
  listen: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[48, 40, 32, 24].map(r => `<circle class="l" cx="62" cy="62" r="${r}"/>`).join('')}
    <circle class="lbl" cx="62" cy="62" r="13"/><circle class="lb" cx="140" cy="14" r="6"/>
    <path class="lb arm" d="M140 14L104 44 96 54"/><rect class="head" x="90" y="52" width="10" height="7" rx="1" transform="rotate(-38 95 55)"/>
    <rect class="box ok" x="116" y="76" width="34" height="22" rx="2"/><path class="af" d="M129 81l9 6-9 6z"/></svg>`,
  answer: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[['song', 8, 10, 1], ['year', 84, 10, 0], ['artist', 8, 60, 0], ['style', 84, 60, 0]].map(([k, x, y, ok]) => `
      <rect class="box${ok ? ' ok' : ''}" x="${x}" y="${y}" width="68" height="42" rx="2"/><text class="cn" x="${x + 8}" y="${y + 16}">${M.FIELD_NAMES[k]}</text>
      <path class="l" d="M${x + 8} ${y + 30}h${ok ? 38 : 30}"/>${ok ? `<path class="tick" d="M${x + 52} ${y + 28}l4 4 8-9"/>` : ''}`).join('')}</svg>`,
  cut: `<svg viewBox="0 0 160 112" aria-hidden="true">
    ${[46, 39, 32, 25].map(r => `<circle class="l" cx="80" cy="58" r="${r}"/>`).join('')}
    <circle class="a" cx="80" cy="58" r="39"/><circle class="ap" cx="80" cy="58" r="25" transform="rotate(30 80 58)"/>
    <circle class="lbl" cx="80" cy="58" r="13"/>
    <path class="lb" d="M134 22l-12 10"/><text class="cn" x="136" y="20">${t('刻满')}</text>
    <path class="lb" d="M101 99L83 85"/><text class="cn" x="103" y="106">${t('刻了一部分')}</text></svg>`
};
const VIDEO_TAG = `<span class="vid-tag"><i aria-hidden="true"></i>${t('视频')}</span>`;
const STEPS = [
  ['01', t('看'), t('一圈，一首歌'), t('外圈 {a}，内圈 {b}。拖动转盘，点一条年代带就能贴近看。', M.courseFacts()), ILL.look],
  ['02', t('听'), t('点歌，落针试听'), t('看封面和故事；带{tag}的歌能直接看课件视频。', {tag: VIDEO_TAG}), ILL.listen],
  ['03', t('答'), t('落针一轮'), t('随机听 10 首，每首答歌名、年份、音乐家、风格。选择题、填空题都行。'), ILL.answer],
  ['04', t('刻'), t('答对就刻上'), t('答对的部分刻进那一圈，记住的圈会发亮；还是漆面的，就是下次该听的。'), ILL.cut]
];

// 作者的联系方式（问题反馈）
const CONTACTS = [
  {key: 'wechat', name: '微信', id: 'bh304919', mark: '微'},
  {key: 'kakao', name: 'KakaoTalk', id: 'bh304919', mark: 'K'},
  {key: 'ins', name: 'Instagram', id: '@linbingbo', mark: 'IG', url: 'https://www.instagram.com/linbingbo/'}
];

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LATEST = RELEASES[0];
const TAG = {new: '新', fix: '修复', tweak: '改进'};
const day = v => { const [, y, m, d] = v.match(/^(\d{4})-(\d{2})-(\d{2})/) || []; if (!m) return v;
  return LANG === 'en' ? new Date(+y, m - 1, +d).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : LANG === 'ko' ? `${+m}월 ${+d}일` : `${+m} 月 ${+d} 日`; };
const count = r => { const n = {new: 0, fix: 0, tweak: 0}; for (const i of r.items) n[i.t]++; return n; };
const countText = r => { const n = count(r); return [n.new && t('新功能 {n}', {n: n.new}), n.fix && t('修复 {n}', {n: n.fix}), n.tweak && t('改进 {n}', {n: n.tweak})].filter(Boolean).join(' · '); };
const GO_LABEL = {start: '看指南', details: '看看', feedback: '去反馈', history: '去历史', 'catalog-video': '去看看', disc: '去盘面'};
const itemHTML = i => `<li><em class="rel-tag" data-t="${i.t}">${t(TAG[i.t])}</em><span>${esc(L(i.text))}</span>${i.go ? `<button class="rel-go" data-go="${i.go}">${t(GO_LABEL[i.go])} →</button>` : ''}</li>`;

function newsHTML() {
  const [latest, ...older] = RELEASES, first = RELEASES.at(-1);
  return `<p class="g-k">${t('更新说明')}</p><h2>${t('一直在更新')}</h2>
    <p class="g-lede">${t('从 {d}的第一版起，已经更新 {n} 次。最近一次在 {l}。', {d: day(first.v), n: RELEASES.length - 1, l: day(latest.v)})}</p>
    <article class="rel rel-latest"><header><time datetime="${latest.v.slice(0, 10)}">${day(latest.v)}</time><b>${esc(L(latest.title))}</b><span>${countText(latest)}</span></header><ul>${latest.items.map(itemHTML).join('')}</ul></article>
    <ol class="rel-older">${older.map(r => `<li><details class="rel"><summary><time datetime="${r.v.slice(0, 10)}">${day(r.v)}</time><b>${esc(L(r.title))}</b><span>${countText(r)}</span></summary><ul>${r.items.map(itemHTML).join('')}</ul></details></li>`).join('')}</ol>`;
}
function detailsHTML() {
  const groups = [...new Set(DESIGNS.map(d => d.group))];
  return `<p class="g-k">${t('小设计')}</p><h2>${t('藏在细节里的设计')}</h2>
    <p class="g-lede">${t('不知道也能用，知道了会更顺手。一共 {n} 个，以后还会加。', {n: DESIGNS.length})}</p>
    ${groups.map(g => `<section class="d-group"><h3>${t(g)}</h3><ul>${DESIGNS.filter(d => d.group === g).map(d => `<li><b>${esc(L(d.title))}${d.since === LATEST.v ? `<em class="d-new">${t('新')}</em>` : ''}</b><p>${esc(L(d.text))}</p></li>`).join('')}</ul></section>`).join('')}`;
}
function envText() {
  const ua = navigator.userAgent;
  const browser = (/Edg\/(\d+)/.exec(ua) && 'Edge ' + RegExp.$1) || (/Firefox\/(\d+)/.exec(ua) && 'Firefox ' + RegExp.$1) || (/(?:CriOS|Chrome)\/(\d+)/.exec(ua) && 'Chrome ' + RegExp.$1)
    || (/Version\/([\d.]+).*Safari/.exec(ua) && 'Safari ' + RegExp.$1) || 'Browser';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return `${t('版本')} ${LATEST.v} · ${LANGS.find(l => l[0] === LANG)[1]} · ${browser}${os ? ' · ' + os : ''} · ${innerWidth}×${innerHeight} · ${location.hash || '#disc'}`;
}
function feedbackHTML() {
  return `<p class="g-k">${t('问题反馈')}</p><h2>${t('有问题，直接找我')}</h2>
    <p class="g-lede">${t('发现问题、有建议，或者只是想说说用得怎么样，都欢迎联系我。写清楚是哪一页、哪首歌、用的什么设备，会更快解决。')}</p>
    <ul class="fb-contacts">${CONTACTS.map(c => `<li data-c="${c.key}"><span class="fb-mark" aria-hidden="true">${c.mark}</span>
      <span class="fb-who"><small>${t(c.name)}</small><b>${esc(c.id)}</b></span>
      ${c.url ? `<a class="fb-act" href="${c.url}" target="_blank" rel="noopener noreferrer">${t('打开')} ↗</a>` : `<button class="fb-act" data-copy="${esc(c.id)}" aria-label="${t('复制{n}号', {n: t(c.name)})}">${t('复制')}</button>`}</li>`).join('')}</ul>
    <div class="fb-env"><p>${t('反馈问题时，附上下面这行信息会更好定位：')}</p><code class="fb-env-text"></code><button class="fb-act" data-copy-env>${t('复制这行信息')}</button></div>`;
}
async function copy(text, button) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
    button.closest('dialog, body').append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch {} ta.remove();
  }
  const was = button.dataset.label ||= button.textContent;
  button.textContent = ok ? t('已复制') : t('请手动复制'); button.dataset.done = ok ? '1' : '0';
  clearTimeout(button._timer); button._timer = setTimeout(() => { button.textContent = was; delete button.dataset.done; }, 1600);
}

/* ---------- 顶栏的语言按钮 ---------- */
function createLangMenu() {
  const btn = document.getElementById('langBtn'); if (!btn) return;
  const cur = LANGS.find(l => l[0] === LANG);
  btn.textContent = cur[2]; btn.setAttribute('aria-label', t('语言') + ': ' + cur[1]); btn.title = t('语言');
  const menu = document.createElement('div'); menu.className = 'lang-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  menu.innerHTML = LANGS.map(([code, name]) => `<button role="menuitemradio" aria-checked="${code === LANG}" data-lang="${code}" lang="${code === 'zh' ? 'zh-CN' : code}">${name}</button>`).join('');
  btn.after(menu);
  const close = (focus = false) => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); };
  btn.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('[aria-checked=true]').focus(); });
  menu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; if (b.dataset.lang === LANG) return close(true); setLang(b.dataset.lang); });
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('button')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { close(true); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); e.preventDefault(); }
  });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });
  addEventListener('hashchange', () => close());
}

export function createGuide({focusDisc, dropButton, onDisc, navigate}) {
  createLangMenu();
  const save = () => M.savePrefs();
  const help = document.getElementById('helpBtn');
  const unread = () => M.prefs.readRelease !== LATEST.v;
  const markDot = () => {
    help.dataset.dot = !M.prefs.guideOpened || unread() ? '1' : '0';
    help.setAttribute('aria-label', unread() ? t('帮助、更新与反馈（有新的更新）') : t('帮助、更新与反馈'));
    dlg.querySelector('[data-tab=news]').dataset.unread = unread() ? '1' : '0';
  };

  /* ---------- 说明卡 ---------- */
  const TABS = [['start', '上手'], ['news', '更新'], ['details', '小设计'], ['feedback', '反馈']];
  const dlg = document.createElement('dialog');
  dlg.className = 'guide'; dlg.setAttribute('aria-label', t('帮助、更新与反馈'));
  dlg.innerHTML = `<header class="g-head">
      <div class="g-tabs" role="tablist" aria-label="${t('说明')}">${TABS.map(([k, label]) => `<button role="tab" id="gtab-${k}" data-tab="${k}" aria-controls="gpanel-${k}">${t(label)}${k === 'news' ? '<i aria-hidden="true"></i>' : ''}</button>`).join('')}</div>
      <button class="g-close" data-g="close" aria-label="${t('关闭')}">×</button>
    </header>
    <section class="g-sheet" role="tabpanel" id="gpanel-start" aria-labelledby="gtab-start" data-panel="start">
      <p class="g-k">${t('上手指南 · 30 秒')}</p>
      <h2 id="guideTitle">${t('这张母盘怎么用')}</h2>
      <ol class="g-steps" tabindex="-1">${STEPS.map(([n, verb, title, text, svg], i) => `
        <li aria-label="${t('第 {i} 步，共 {n} 步', {i: i + 1, n: STEPS.length})}"><span class="g-n">${n} ${verb}</span><div class="g-ill">${svg}</div><b>${title}</b><p>${text}</p></li>`).join('')}</ol>
      <div class="g-dots" aria-hidden="true">${STEPS.map(() => '<i></i>').join('')}</div>
      <ul class="g-more">
        <li><b>${t('目录')}</b>${t('按歌名、年份、风格搜索')}</li>
        <li><b>${t('历史')}</b>${t('回看每一轮的订正')}</li>
        <li><b>${t('记录')}</b>${t('只存在这台浏览器；换网址或换设备时，在「历史」导出，再到新地方导入')}</li>
      </ul>
      <div class="g-foot"><span class="g-again">${t('之后点右上角「?」可以再看，也能看更新、小设计和反馈')}</span>
        <button class="g-skip" data-g="skip">${t('跳过')}</button><button class="g-go" data-g="go">${t('开始转盘')}</button></div>
    </section>
    <section class="g-sheet g-read" role="tabpanel" id="gpanel-news" aria-labelledby="gtab-news" data-panel="news" hidden>${newsHTML()}</section>
    <section class="g-sheet g-read" role="tabpanel" id="gpanel-details" aria-labelledby="gtab-details" data-panel="details" hidden>${detailsHTML()}</section>
    <section class="g-sheet g-read" role="tabpanel" id="gpanel-feedback" aria-labelledby="gtab-feedback" data-panel="feedback" hidden>${feedbackHTML()}</section>`;
  document.body.append(dlg);
  markDot();
  const list = dlg.querySelector('.g-steps'), dots = [...dlg.querySelectorAll('.g-dots i')], go = dlg.querySelector('.g-go');
  const narrow = () => matchMedia('(max-width:640px)').matches;
  const page = () => Math.round(list.scrollLeft / Math.max(1, list.clientWidth));
  function syncPage() {
    const i = narrow() ? page() : STEPS.length - 1;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    go.textContent = t(i < STEPS.length - 1 ? '下一步 →' : '开始转盘');
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
    if (name === 'feedback') dlg.querySelector('.fb-env-text').textContent = envText();
    markDot();
  }
  dlg.querySelector('.g-tabs').addEventListener('keydown', e => {
    const names = TABS.map(x => x[0]), i = names.indexOf(tab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { show(names[(i + (e.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length], true); e.preventDefault(); }
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
    const tb = e.target.closest('[role=tab]'); if (tb) return show(tb.dataset.tab);
    const cp = e.target.closest('[data-copy]'); if (cp) return copy(cp.dataset.copy, cp);
    const env = e.target.closest('[data-copy-env]'); if (env) return copy(envText(), env);
    const target = e.target.closest('[data-go]')?.dataset.go;
    if (['start', 'details', 'feedback'].includes(target)) return show(target, true);
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
  document.addEventListener('click', e => { const d = e.target.closest('[data-open-guide]'); if (d && !dlg.contains(d)) open(d.dataset.openGuide); });

  /* ---------- 新用户关掉后：在落针按钮旁指一下 ---------- */
  let pointer = null, pointTimer = 0;
  function point() {
    const b = dropButton(); if (!b) return;
    const r = b.getBoundingClientRect();
    if (!r.width || r.top < 60 || r.bottom > innerHeight - 8) return;   // 不在视野里就不指了
    pointer = document.createElement('div'); pointer.className = 'g-point'; pointer.setAttribute('aria-hidden', 'true');
    pointer.style.cssText = `left:${r.left - 5}px;top:${r.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`;
    pointer.innerHTML = `<span>${t('准备好了，就从这里开始一轮')}</span>`;
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
    toast = document.createElement('aside'); toast.className = 'g-toast'; toast.setAttribute('aria-label', t('网站有更新'));
    toast.innerHTML = `<button class="g-x" data-t="x" aria-label="${t('关闭')}">×</button>
      <p class="g-k">${t('{d}更新', {d: day(LATEST.v)})} · ${countText(LATEST)}</p>
      <b>${esc(L(LATEST.title))}</b>
      <ul>${top.map(i => `<li>${esc(L(i.text))}</li>`).join('')}</ul>
      <div><button class="g-open" data-t="open">${t('看看更新')}</button><button data-t="x">${t('知道了')}</button></div>`;
    toast.addEventListener('click', e => { const k = e.target.closest('[data-t]')?.dataset.t; if (k === 'open') open('news'); else if (k === 'x') hideToast(); });
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
      return `<aside class="d-tip" aria-label="${t('小设计')}"><p class="g-k">${t('你可能没注意到 · {a} / {b}', {a: shown.length + 1, b: DESIGNS.length})}</p>
        <p><b>${esc(L(d.title))}</b>${esc(L(d.text))}</p><button data-open-guide="details">${t('全部小设计 →')}</button></aside>`;
    }
  };
}
