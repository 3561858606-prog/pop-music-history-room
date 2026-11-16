// 上手指南：第一次来只主动出现一次。
// 新用户：开场动画后弹出一张「看 → 听 → 答 → 刻」的说明卡（窄屏改成左右滑的四张卡），关掉后在落针按钮旁指一下。
// 已有记录的老用户：不弹窗，只在左下角放一张小纸片。顶栏的「?」随时能重新打开；没打开过时「?」上有一个琥珀小点。
import * as M from './model.js';

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

export function createGuide({focusDisc, dropButton, onDisc}) {
  const save = () => M.savePrefs();
  const help = document.getElementById('helpBtn');
  const markDot = () => { help.dataset.dot = M.prefs.guideOpened ? '0' : '1'; };
  markDot();

  /* ---------- 说明卡 ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'guide'; dlg.setAttribute('aria-labelledby', 'guideTitle');
  dlg.innerHTML = `<div class="g-sheet">
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
    <div class="g-foot"><span class="g-again">之后点右上角「?」可以再看</span>
      <button class="g-skip" data-g="skip">跳过</button><button class="g-go" data-g="go">开始转盘</button></div>
  </div>`;
  document.body.append(dlg);
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

  let auto = false, opener = null;
  function open({first = false} = {}) {
    hideToast(); unpoint();
    auto = first; opener = first ? null : document.activeElement;
    M.prefs.guideSeen = true; M.prefs.guideOpened = true; save(); markDot();
    list.scrollLeft = 0; dlg.returnValue = '';
    dlg.showModal(); syncPage();
    go.focus({preventScroll: true});
  }
  dlg.addEventListener('click', e => {
    const act = e.target.closest('[data-g]')?.dataset.g;
    if (act === 'go' && narrow() && page() < STEPS.length - 1) { list.scrollTo({left: (page() + 1) * list.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (act) return dlg.close(act);
    if (e.target === dlg) dlg.close('backdrop');   // 点卡片外的暗处也能关
  });
  dlg.addEventListener('close', () => {
    if (opener && opener.isConnected && opener !== document.body) opener.focus({preventScroll: true});
    else focusDisc();
    if (auto && onDisc()) setTimeout(point, 120);
    auto = false; opener = null;
  });
  help.addEventListener('click', () => open());

  /* ---------- 关掉后：在落针按钮旁指一下 ---------- */
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

  /* ---------- 老用户：左下角小纸片 ---------- */
  let toast = null;
  function showToast() {
    M.prefs.guideSeen = true; save();
    toast = document.createElement('aside'); toast.className = 'g-toast'; toast.setAttribute('aria-label', '新内容');
    toast.innerHTML = `<button class="g-x" data-t="x" aria-label="关闭">×</button>
      <p class="g-k">新内容</p>
      <p>带<span class="vid-tag"><i aria-hidden="true"></i>视频</span>的歌能直接看课件视频；「历史」里可以导入学习备份。</p>
      <div><button class="g-open" data-t="open">看上手指南</button><button data-t="x">知道了</button></div>`;
    toast.addEventListener('click', e => { const t = e.target.closest('[data-t]')?.dataset.t; if (t === 'open') open(); else if (t === 'x') hideToast(); });
    document.body.append(toast);
  }
  function hideToast() { toast?.remove(); toast = null; }
  addEventListener('hashchange', hideToast);

  let pending = 0;
  return {
    open,
    // 第一次到盘面时调用：只主动出现一次。delay 让开场动画先放完。
    auto({returning, delay}) {
      if (M.prefs.guideSeen || pending) return;
      pending = setTimeout(() => {
        pending = 0;
        if (M.prefs.guideSeen || !onDisc() || document.querySelector('dialog[open]')) return;
        returning ? showToast() : open({first: true});
      }, delay);
    }
  };
}
