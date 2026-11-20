// 探索：首页就是这张盘。转（拖动）、贴近（进入一条年代带）、落（唱针）。
import * as M from './model.js';
import {flatDisc} from './flat.js';
import {player} from './audio.js';
import {createBgm} from './bgm.js';
import {createSfx} from './sfx.js';
import {createListener} from './listen.js';
import {FAMILIES, ERA_LOOKS, familyOf, eraOf, normalizeFx, DEFAULT_FX} from './react.js';
import {sleeveLayout} from './sleeve-layout.js';
import {nameHTML, trackStoryHTML} from './reading.js';
import {t as tr, join} from './i18n.js';
import {hasVideo, videoFigureHTML, mountVideo, retryVideo, videoOf, setVideoQuality} from './video.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const {TAU, rings, bands, GEO} = M;

export async function initExplore(ctx) {
  const canvas = $('gl'), hud = $('hud'), panel = $('panel'), live = $('live'), flatHost = $('flatHost'), stage = $('stage');
  const view = {mode: 'over', band: -1, song: null, kbBand: bands.length - 1, flat: false, needle: 'idle', intro: false};
  let disc = null, flat = null, chipAt = null;
  const spread = document.createElement('section'); spread.className = 'sleeve-spread'; spread.hidden = true; spread.setAttribute('aria-label',tr('同年封套')); stage.appendChild(spread);
  let spreadKey = '', spreadPosition = '';
  const overviewSleeves = band => [...new Map(band.ids.map(id => { const t = M.byId.get(id); return [t.year,id]; })).values()];
  const yearItems = () => view.song ? M.yearTracks(M.byId.get(view.song).year) : [];
  function positionSpread(api = disc) {
    if (spread.hidden) return;
    if (api && !view.flat) {   // 立体：按钮每一帧跟着封套在画面上的实际位置
      const edge = panelEdge(), hits = new Map(api.sleeveHits().map(h => [h.g.id, h])), W = api.state.W;
      const list = [...spread.querySelectorAll('[data-cover]')];
      for (const b of list) {
        const h = hits.get(b.dataset.cover);
        if (!h || h.x1 > edge || h.x0 < 0 || h.x1 > W) { b.style.visibility = 'hidden'; continue; }
        const w = h.x1 - h.x0, ht = h.y1 - h.y0;
        b.style.visibility = ''; b.style.transform = `translate3d(${h.x0.toFixed(1)}px,${h.y0.toFixed(1)}px,0)`;
        b.style.width = w.toFixed(1) + 'px'; b.style.height = 'auto'; b.querySelector('.st-art').style.height = ht.toFixed(1) + 'px';
        b.dataset.columns = list.length;
      }
      spread.style.setProperty('--spread-right', Math.max(20, W - edge + 28) + 'px');
      spreadPosition = ''; return;
    }
    const bounds = api ? null : stage.getBoundingClientRect(), width = api?.state.W || bounds.width, height = api?.state.H || bounds.height;
    const pf = innerWidth > 860 ? panel.offsetWidth / width : 0;
    const key = [spreadKey,width,height,pf].join(':'); if (spreadPosition === key) return; spreadPosition = key;
    const slots = sleeveLayout(yearItems().map(t => { const c = M.coverOf(t); return {id:t.id,ratio:c ? c.w/c.h : 1}; }), width,height,pf);
    for (const slot of slots) {
      const b = spread.querySelector(`[data-cover="${slot.id}"]`); if (!b) continue;
      b.style.visibility = '';
      b.style.transform = `translate3d(${slot.x}px,${slot.y}px,0)`; b.style.width = slot.width + 'px'; b.style.height = slot.height + 'px';
      b.querySelector('.st-art').style.height = slot.width + 'px'; b.dataset.columns = slot.columns;
    }
    spread.style.setProperty('--spread-right', Math.max(20,width*pf+36)+'px');
  }
  function renderSpread() {
    spread.hidden = view.mode !== 'close'; if (spread.hidden) { spreadKey = ''; return; }
    const current = M.byId.get(view.song), items = yearItems(), key = current.year + ':' + view.band + ':' + view.flat;
    spread.dataset.flat = view.flat ? '1' : '0';
    if (key !== spreadKey) {
      spreadKey = key; spreadPosition = '';
      const years = [...new Set(bands[view.band].ids.map(id => M.byId.get(id).year))];
      spread.innerHTML = `<header class="spread-head"><h2><b>${current.year}</b><span>${tr('{n} 首', {n: items.length})} · ${tr('同年封套已展开')}</span></h2><p>${tr('点击封套选歌，再落针试听')}</p><nav class="spread-years" aria-label="${tr('切换年份')}">${years.map(y => `<button data-year="${y}" aria-current="${y === current.year ? 'true' : 'false'}">${y}</button>`).join('')}</nav></header>
        <div class="spread-covers">${items.map(t => { const c = M.coverOf(t); return `<button class="sleeve-target" data-cover="${t.id}" aria-label="${esc(M.titleOf(t))}, ${esc(t.artist)}, ${t.year}" aria-pressed="${t.id === current.id}"><span class="st-art">${c ? `<img src="${c.url}" alt="" data-shape="${c.shape}" draggable="false">` : `<span>${tr('封面待补')}</span>`}</span><span class="st-title" aria-hidden="true">${esc(M.titleOf(t))}</span><span class="st-artist" aria-hidden="true">${esc(t.artist)}</span></button>`; }).join('')}</div>`;
    }
    for (const b of spread.querySelectorAll('[data-cover]')) b.setAttribute('aria-pressed', String(b.dataset.cover === view.song));
    positionSpread();
  }
  spread.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cover) select(M.ringOf.get(b.dataset.cover));
    if (b.dataset.year) { const t = M.yearTracks(+b.dataset.year)[0]; if (t) { select(M.ringOf.get(t.id)); spread.querySelector(`[data-year="${t.year}"]`)?.focus(); } }
  });
  // 指针停在封套上：盘上那张封套微微抬起
  spread.addEventListener('pointerover', e => { const b = e.target.closest('[data-cover]'); disc?.setHover(b ? M.ringOf.get(b.dataset.cover).i : -1); });
  spread.addEventListener('pointerleave', () => disc?.setHover(-1));
  spread.addEventListener('focusin', e => { const b = e.target.closest('[data-cover]'); if (b) disc?.setHover(M.ringOf.get(b.dataset.cover).i); });
  spread.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { backOver(); e.preventDefault(); return; }
    const b = e.target.closest('[data-cover]'); if (!b) return;
    const list = [...spread.querySelectorAll('[data-cover]')];
    let next;
    if (e.key === 'Home') next = 0; else if (e.key === 'End') next = list.length-1;
    if (next !== undefined) { list[next].click(); list[next].focus({preventScroll:true}); e.preventDefault(); }
  });
  addEventListener('resize', () => positionSpread());


  /* ---------- 深空：盘下面的宇宙（js/cosmos.js） ---------- */
  // 入池的只是封面：唱片标签、封套、专辑、合辑、乐谱。照片、设备、广告、宣传单不是封面
  const COSMOS_KINDS = new Set(['label', 'sleeve', 'album', 'compilation', 'sheet']);
  const cosmosPool = M.tracks.map(t => [t, M.coverOf(t)]).filter(([, c]) => c && COSMOS_KINDS.has(c.kind))
    .map(([t, c]) => ({id: t.id, decade: Math.floor(t.year / 10) * 10, url: c.url, w: c.w, h: c.h, shape: c.shape}));
  let cosmos = null, cosmosLayout = null;
  // 消失点和禁区：只在整张盘、镜头静止时重算；其余时候沿用上一次（贴近时消失点不跟着镜头跑）
  function cosmosLayoutNow() {
    if (!disc) return cosmosLayout;
    const S = disc.state, settled = S.cam && Math.hypot(...S.cam.eye.map((v, i) => v - S.goal.eye[i])) < .01;
    if (cosmosLayout && (S.mode !== 'over' || view.intro || !settled)) return cosmosLayout;
    const foe = disc.project([0, 0, 0]); if (!foe) return cosmosLayout;
    const sb = stage.getBoundingClientRect(), W = stage.clientWidth, H = stage.clientHeight;
    const rel = r => [r.left - sb.left, r.top - sb.top, r.right - sb.left, r.bottom - sb.top];
    const rim = []; for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, p = disc.project([1.16 * Math.sin(a), 0, -1.16 * Math.cos(a)]); if (p) rim.push([p[0], p[1]]); }
    const keepOut = [{poly: rim, behind: true}], arm = disc.armSegment().map(p => disc.project(p));
    if (arm[0] && arm[1]) keepOut.push({seg: [arm[0][0], arm[0][1], arm[1][0], arm[1][1]], r: 34});
    const narrow = innerWidth <= 860, panelLeft = narrow ? W + 400 : rel(panel.getBoundingClientRect())[0];
    if (!narrow) keepOut.push({rect: [panelLeft - 40, -1e3, W + 1e3, H + 1e3]});
    const headerBottom = Math.max(0, $('top').getBoundingClientRect().bottom - sb.top);
    keepOut.push({rect: [-1e3, -1e3, W + 1e3, headerBottom + 16]});
    for (const el of [stage.querySelector('.legend'), $('discHelp'), $('introSkip'), document.querySelector('.np'), $('bgmChip')]) {
      if (!el || el.hidden || !el.getClientRects().length) continue;
      const r = rel(el.getBoundingClientRect()); if (r[2] - r[0] < 1) continue;
      keepOut.push({rect: [r[0] - 16, r[1] - 16, r[2] + 16, r[3] + 16]});
    }
    return cosmosLayout = {foe: [foe[0], foe[1]], keepOut, headerBottom, panelLeft, narrow};
  }
  function mountCosmos() {
    cosmos?.destroy(); cosmos = null; cosmosLayout = null;
    const cv = $('cosmos'); if (!cv) return;
    cv.hidden = view.flat || !disc; renderCosmosToggle(); if (cv.hidden) return;
    const go = async () => {
      if (!disc || view.flat || cosmos) return;
      try {
        const {createCosmos} = await import('./cosmos.js');
        if (!disc || cosmos) return;
        cosmos = createCosmos(cv, {reduced: ctx.reduced, pool: cosmosPool, layout: cosmosLayoutNow,
          listener, fx: () => fxSettings,               // 听歌时的三条效果链：节奏、风格、年代
          onLost: () => { cosmos = null; renderCosmosToggle(); },   // WebGL 被系统收回：等它还回来（下面的 webglcontextrestored）再重建
          avoid: () => disc?.state.sleeveSet, paused: () => !!M.prefs.cosmosPaused, onReady: () => disc?.setSpace(1),
          camRate: () => disc?.state.camRate,   // 压暗、亮回和盘镜头用同一个速率
          camDist: () => disc?.state.cam ? Math.hypot(...disc.state.cam.eye) : null,   // 推近：盘镜头离盘心多远
          panel,                                   // 指针或焦点在曲目表里 = 正在读，天上不开始新的事
          unheard: () => cosmosPool.filter(p => !M.hasRecord(p.id)).map(p => p.id),   // 冲开暗云时露出一首还没听过的
          onRipple: r => { pingDigits(r); if (r.kind === 'tap') sfx.play('tap', {x: r.x, y: r.y, W: stage.clientWidth, H: stage.clientHeight}); },
          onCue: (kind, info) => sfx.play(kind === 'era' ? 'era' : kind, info),
          onAnchors: a => placeSkyUi(a)});
        updateSky();
        cosmos.setPlaying(view.needle === 'playing');
        renderCosmosToggle();
        cosmos.setState(view.intro ? 'intro' : stage.dataset.mode === 'dive' ? 'dive' : view.mode);
        if (!$('roomDisc').hidden) { cosmos.resume(); if (!view.intro) cosmos.reveal(); }
      } catch (e) { console.warn('深空不可用：', e.message); cosmos = null; cv.hidden = true; renderCosmosToggle(); }
    };
    // 盘面第一帧画完、浏览器空闲之后才载入，不和首屏抢
    requestAnimationFrame(() => (window.requestIdleCallback || (f => setTimeout(f, 600)))(go, {timeout: 2500}));
  }
  addEventListener('resize', () => { cosmosLayout = null; });
  // 暂停开关（WCAG 2.2.2）：放在图例那一行末尾。暂停 = 冻结这一帧；系统「减少动态」时本来就是静止的，不显示
  const cosmosToggle = $('cosmosToggle');
  function renderCosmosToggle() {
    if (!cosmosToggle) return;
    cosmosToggle.hidden = !cosmos || ctx.reduced();
    const fo = $('fxOpen'); if (fo) fo.hidden = !cosmos;
    cosmosToggle.textContent = tr(M.prefs.cosmosPaused ? '星空 · 继续' : '星空 · 暂停');
  }
  cosmosToggle?.addEventListener('click', () => {
    M.prefs.cosmosPaused = !M.prefs.cosmosPaused; M.savePrefs();
    cosmos?.setPaused(M.prefs.cosmosPaused); renderCosmosToggle();
  });
  /* ---------- 背景音乐（js/bgm.js）：只在唱片页；落针时让开，停下后从原来的位置淡入 ---------- */
  // 署名照曲目的写法：歌名 · 音乐家 · 年份 · 风格
  const BGM = {title: 'Vast Warm Pads', artist: 'linbingbo', year: 2026, style: '氛围音乐 · 太空音乐'};
  const bgmChip = $('bgmChip'), bgmToggle = $('bgmToggle');
  const BGM_STATE = {on: '正在播放', yield: '让给唱片中', off: '已关掉', wait: '点一下页面就开始'};
  function renderBgmToggle() {
    if (!bgmChip) return;
    const mode = bgm.mode; bgmChip.dataset.mode = mode;
    bgmChip.querySelector('.bgm-state').textContent = tr(BGM_STATE[mode]);
    bgmToggle.querySelector('span').textContent = tr(mode === 'off' ? '开启' : '关掉');
    bgmToggle.setAttribute('aria-pressed', String(mode !== 'off'));
    bgmToggle.setAttribute('aria-label', tr(mode === 'off' ? '开启背景音乐' : '关掉背景音乐'));
  }
  const bgm = createBgm({src: M.site('audio-bgm/vast-warm-pads.m4a'), enabled: () => !M.prefs.bgmOff, onChange: () => renderBgmToggle()});
  if (bgmChip) {
    bgmChip.querySelector('.bgm-title').textContent = BGM.title;
    bgmChip.querySelector('.bgm-meta').textContent = `${BGM.artist} · ${BGM.year} · ${tr(BGM.style)}`;
    bgmChip.hidden = false;
  }
  bgmToggle?.addEventListener('click', () => { M.prefs.bgmOff = !M.prefs.bgmOff; M.savePrefs(); bgm.refresh(); renderBgmToggle(); });
  renderBgmToggle();

  /* ---------- 会回应的天空：手势、悬停说明、捞起来的卡片、天文年表的说明、你的星空 ----------
     点 = 一滴水（水波）；按住 = 漩涡蓄力，松手炸开；拖 = 划水的尾流。只在天空的空白处，点盘、曲目表、按钮都照旧 */
  // 天上的声音：有音高的跟着背景音乐（背景音乐在放才响）；落针的水声只看「音效」开关
  const sfx = createSfx({enabled: () => bgm.mode === 'on', allowed: () => !M.prefs.sfxOff, context: () => bgm.ctx});
  const skyUi = document.createElement('div'); skyUi.className = 'sky-ui'; skyUi.setAttribute('aria-hidden', 'true');
  skyUi.innerHTML = '<span class="sky-tag"></span><p class="sky-era"></p><div class="sky-cons"></div>';
  stage.appendChild(skyUi);
  const skyTag = skyUi.querySelector('.sky-tag'), skyEra = skyUi.querySelector('.sky-era'), skyCons = skyUi.querySelector('.sky-cons');
  const card = document.createElement('section'); card.className = 'sky-card'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'skyCardTitle'); stage.appendChild(card);
  let cardId = null, tagId = null, skyG = null, holdTimer = 0, eraTimer = 0;
  const skyInfo = new Map();   // id → 你的星空里的那颗星（亮度、该复习的程度）
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // cosmos 每帧报一次：指针停着的东西、天文事件、星座的名字在屏幕上的位置
  function placeSkyUi(a) {
    const W = Math.min(panelEdge(), stage.clientWidth), H = stage.clientHeight;
    const h = a.hover && a.hover.id !== cardId ? a.hover : null;
    if (h) {
      if (tagId !== h.id) { tagId = h.id; const t = M.byId.get(h.id), info = skyInfo.get(h.id);
        skyTag.innerHTML = `<b>${t.year}</b>${esc(M.titleOf(t))}${info?.due > .05 ? `<em>${tr('该复习了')}</em>` : ''}`; }
      const w = skyTag.offsetWidth, x = clamp(h.x - w / 2, 8, W - w - 8), y = h.bottom + 34 < H ? h.bottom + 8 : h.top - 30;
      skyTag.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; skyTag.classList.add('on');
    } else { skyTag.classList.remove('on'); tagId = null; }
    if (a.era && a.era.a > .02) {
      if (skyEra.dataset.id !== a.era.id) { skyEra.dataset.id = a.era.id; const [y, ...rest] = tr(a.era.label).split(' · '); skyEra.innerHTML = `<b>${esc(y)}</b>${esc(rest.join(' · '))}`; }
      // 不压在任何文字上：盘边数字、年代标签、署名、底部那一条、悬停说明、同年封套的标题。往上下挪着找空位，找不到就不显示
      const w = skyEra.offsetWidth, h = skyEra.offsetHeight, x = clamp(a.era.x - w / 2, 16, W - w - 16), y0 = clamp(a.era.y, 64, H - h - 44);
      const sb = stage.getBoundingClientRect(), busy = [...stage.querySelectorAll('.hud-digit,.hud-dec,.hud-tag,.bgm-chip,.legend,.sky-tag.on,.spread-head,.sky-cons span')]
        .filter(el => el.getClientRects().length && getComputedStyle(el).opacity !== '0' && el.style.opacity !== '0')
        .map(el => { const r = el.getBoundingClientRect(); return [r.left - sb.left - 6, r.top - sb.top - 6, r.right - sb.left + 6, r.bottom - sb.top + 6]; });
      const free = y => y >= 60 && y + h <= H - 40 && !busy.some(r => x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1]);
      let y = null; for (const d of [0, 30, -30, 60, -60, 90, -90, 130, -130, 180, -180]) if (free(y0 + d)) { y = y0 + d; break; }
      skyEra.style.transform = `translate3d(${x.toFixed(1)}px,${(y ?? y0).toFixed(1)}px,0)`; skyEra.style.opacity = y == null ? '0' : Math.min(1, a.era.a * 1.4).toFixed(3);
    } else if (skyEra.dataset.id) { skyEra.style.opacity = 0; skyEra.dataset.id = ''; }
    const labels = a.labels || [];
    if (skyCons.childElementCount !== labels.length) skyCons.innerHTML = labels.map(() => '<span></span>').join('');
    // 星座名：不出舞台、彼此不压（按高低排，压到上一个就往下挪）
    const boxes = [];
    labels.map((l, i) => ({l, i})).sort((p, q) => p.l.y - q.l.y).forEach(({l, i}) => {
      const n = skyCons.children[i]; if (n.dataset.id !== l.id) { n.dataset.id = l.id; n.textContent = l.text; }
      const w = n.offsetWidth, h = n.offsetHeight || 14; let x = clamp(l.x - w / 2, 8, W - w - 8), y = clamp(l.y - h, 62, H - h - 8);
      for (const b of boxes) if (x < b[2] + 6 && x + w > b[0] - 6 && y < b[3] + 2 && y + h > b[1] - 2) y = b[3] + 3;
      boxes.push([x, y, x + w, y + h]);
      n.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; n.style.opacity = (l.a * .85).toFixed(3); });
  }
  // 点一张封面 / 一颗星：捞起来，翻成一张卡片
  function openCard(p) {
    const t = M.byId.get(p.id); if (!t) return;
    if (cardId) cosmos?.hold(cardId, false);
    cardId = p.id; cosmos?.hold(p.id, true); skyTag.classList.remove('on');
    const c = M.coverOf(t), info = skyInfo.get(p.id), last = M.lastSeen(p.id), due = info?.due > .05;
    const days = last ? Math.max(0, Math.floor((Date.now() - Date.parse(last)) / 864e5)) : null;
    const note = info ? (due ? tr('该复习了') + (days != null ? ' · ' + tr('上次是 {n} 天前', {n: days}) : '') : info.full ? tr('天上这颗星是你记住的歌：四项都刻满了') : tr('天上这颗星是你记住的歌')) : '';
    card.innerHTML = `<button class="sc-x" type="button" aria-label="${tr('关闭')}">×</button>
      ${c ? `<img class="sc-art" src="${c.url}" alt="" data-shape="${c.shape}">` : '<span class="sc-art"></span>'}
      <div class="sc-body"><div class="sc-year">${t.year}</div><h3 id="skyCardTitle">${esc(M.titleOf(t))}</h3>
        <p class="sc-meta">${esc(t.artist)} · ${esc(M.styleOf(t).label)}</p>
        <p class="sc-lec">${M.lectureIds(t).map(id => tr('第 {l} 讲', {l: id}) + ' ' + esc(M.lectureLabel(id))).join(' · ')}</p>
        ${note ? `<p class="sc-star${due ? ' due' : ''}">${note}</p>` : ''}
        <div class="sc-act"><button class="sc-find" type="button">${tr('在盘上找到它')}</button><button class="sc-play" type="button">${tr(due ? '再听一次' : '落针试听')}</button></div></div>`;
    card.hidden = false; card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    const W = Math.min(panelEdge(), stage.clientWidth), H = stage.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    let x = p.x + 36; if (x + cw > W - 16) x = p.x - 36 - cw;
    x = clamp(x, 16, W - cw - 16); const y = clamp(p.y - ch / 2, 64, H - ch - 16);
    card.style.left = x + 'px'; card.style.top = y + 'px'; card.style.transformOrigin = `${(p.x - x).toFixed(0)}px ${(p.y - y).toFixed(0)}px`;
    card.querySelector('.sc-find').focus({preventScroll: true});
    say(`${t.year}, ${M.titleOf(t)}, ${t.artist}`);
  }
  function closeCard() { if (!cardId) return; cosmos?.hold(cardId, false); cardId = null; card.hidden = true; }
  card.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = cardId, g = M.ringOf.get(id);
    if (b.classList.contains('sc-x')) { closeCard(); focusDisc(); return; }
    closeCard(); if (!g) return;
    enterBand(bands[g.band], g);                                  // 在盘上找到它：盘转到那一圈并贴近
    if (b.classList.contains('sc-play')) dropNeedle(id);          // 再听一次 / 落针试听
  });
  card.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCard(); focusDisc(); e.stopPropagation(); e.preventDefault(); } });
  // 水波碰到盘缘的数字：顺着波传过去的方向依次一闪；第一下响一个音
  function pingDigits(r) {
    if (!hudBuilt || r.gen > 1 || r.s < .3) return;
    let first = null;
    H.digits.forEach((n, d) => {
      if (n.style.opacity === '0') return; const m = n.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/); if (!m) return;
      const x = +m[1], y = +m[2], dist = Math.hypot(x - r.x, y - r.y); if (dist > 720 * Math.min(1.6, r.s)) return;
      const ms = dist / 260 * 1000; if (!first || ms < first.ms) first = {ms, d, x, y};
      setTimeout(() => { n.classList.remove('ping'); void n.offsetWidth; n.classList.add('ping'); }, ms);
    });
    if (first && r.gen === 0) setTimeout(() => sfx.play('digit', {digit: first.d, x: first.x, y: first.y, W: stage.clientWidth, H: stage.clientHeight}), first.ms);
  }
  // 从盘心朝数字 d 的方向（盘转过多少就跟着转多少）
  function spokeDir(d) {
    const o = disc?.project([0, 0, 0]), a = d / 10 * TAU + (disc?.state.rot || 0), p = disc?.project([1.16 * Math.sin(a), 0, -1.16 * Math.cos(a)]);
    if (!o || !p) return null; const v = [p[0] - o[0], p[1] - o[1]], l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l];
  }
  // 数字键 0–9：盘缘那个数字亮起，一道波从那里推进天空，年份个位是这个数字的两三首浮出来
  function summonDigit(d) {
    const n = H.digits[d]; if (n) { n.classList.remove('key'); void n.offsetWidth; n.classList.add('key'); }
    const a = d / 10 * TAU + disc.state.rot, p = disc.project([1.1 * Math.sin(a), 0, -1.1 * Math.cos(a)]), b = canvas.getBoundingClientRect();
    if (p) cosmos?.ripple(b.left + p[0], b.top + p[1], 1.1, 'digit');
    const list = cosmosPool.filter(c => M.byId.get(c.id).year % 10 === d);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    cosmos?.summon(list.map(c => ({id: c.id, dir: () => spokeDir(d), mid: () => [spokeDir(d + .5), spokeDir(d - .5)]})), 3, d);
    const names = list.slice(0, 3).map(c => { const t = M.byId.get(c.id); return `${t.year} ${M.titleOf(t)}`; });
    say(tr('年份个位是 {d} 的歌：{list}', {d, list: join(names)}));
  }
  // 落针：唱针落下的那一点泛起水波，贴着唱片往外扩散（gl.js 的 drip）；环走到盘边时，天上从盘边那一点接着荡开
  function needleRipple() {
    if (!disc) return; const tip = disc.drip(1); if (!tip) return;
    const b = canvas.getBoundingClientRect(), tp = disc.project([tip[0], 0, tip[1]]);
    if (tp) sfx.play('needle', {x: tp[0], y: tp[1], W: b.width, H: b.height});
    if (!cosmos) return;
    const r = Math.hypot(tip[0], tip[1]), dir = r > 1e-3 ? [tip[0] / r, tip[1] / r] : [0, 1], rim = disc.project([dir[0] * 1.02, 0, dir[1] * 1.02]);
    if (rim) setTimeout(() => { const bb = canvas.getBoundingClientRect(); cosmos?.ripple(bb.left + rim[0], bb.top + rim[1], .8, 'needle'); }, Math.max(0, (1.02 - r) / .62) * 1000);
  }
  // 你的星空：刻纹平均过半的歌是一颗恒星；亮度 = 掌握程度；到了复习间隔就慢慢变暗。同一讲都刻到 3/4 以上，连成星座
  const hash01 = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
  function skyData() {
    const now = Date.now(), list = [], demo = M.prefs.demo !== 'real';
    for (const g of rings) {
      const l = M.lanesOf(g.id), cut = l.reduce((a, b) => a + b, 0) / 4; if (cut < .5) continue;
      const full = l.every(v => v >= 1), interval = full ? 21 : cut >= .75 ? 9 : 4, last = M.lastSeen(g.id);
      let due = 0;
      if (last) { const days = (now - Date.parse(last)) / 864e5; due = clamp((days - interval) / interval, 0, 1); }
      else if (demo) due = hash01(g.id) > .8 ? .45 + .55 * hash01(g.id + 'd') : 0;   // 示意数据：随便挑几颗当作该复习了
      list.push({id: g.id, digit: g.t.year % 10, decade: Math.floor(g.t.year / 10) * 10, mag: .45 + .55 * Math.min(1, (cut - .5) / .5), full, due, url: M.coverOf(g.t)?.url});
    }
    const ok = new Set(list.filter(s => M.avgCut(s.id) >= .75).map(s => s.id));
    const cons = M.lectures.map(l => ({l, ids: M.tracks.filter(t => M.lectureIds(t).includes(l.id)).map(t => t.id)}))
      .filter(x => x.ids.length && x.ids.every(id => ok.has(id))).map(x => ({id: 'A' + x.l.id, label: `A${x.l.id} ${M.lectureLabel(x.l.id)}`, ids: x.ids}));
    return {list, cons, all: M.stats().full === rings.length};
  }
  /* ---------- 听歌时的星空：三条效果链和效果器面板（js/listen.js、js/react.js） ----------
     节奏（什么时候、多重）→ 风格（长什么样、怎么动）→ 年代（用哪个年代的底片拍）。每条都能开关、调强度；
     风格和年代可以跟着歌自动选，也可以手动指定；手动指定的在没放歌时也会跟着背景音乐轻轻动 */
  let fxSettings = normalizeFx(M.prefs.fx), fxTrackShown = null;
  const listener = createListener(() => ['playing', 'buffering'].includes(view.needle) ? player.taps?.() : bgm.mode === 'on' ? bgm.taps?.() : null);
  const saveFx = () => { M.prefs.fx = fxSettings; M.savePrefs(); };
  // 一首歌开始放：告诉星空这是哪一首；年代链开着、跟着歌时，天上出现这个年代的天文事件
  function startFx(t) {
    cosmos?.setTrack({id: t.id, style: t.style, year: t.year});
    if (fxTrackShown === t.id) return; fxTrackShown = t.id; listener.reset();
    if (fxSettings.on && fxSettings.era.on && fxSettings.era.pick === 'auto') setTimeout(() => cosmos?.showEra(Math.floor(t.year / 10) * 10), 1200);
  }
  const fxBoard = document.createElement('section'); fxBoard.className = 'fx-board'; fxBoard.hidden = true;
  fxBoard.setAttribute('role', 'dialog'); fxBoard.setAttribute('aria-labelledby', 'fxTitle'); stage.appendChild(fxBoard);
  const pctOf = v => Math.round(v * 100);
  function fxNowText() {
    const cur = player.current(), playing = ['playing', 'buffering', 'paused'].includes(view.needle) && cur;
    const fam = fxSettings.style.pick !== 'auto' ? fxSettings.style.pick : playing ? familyOf(cur.style) : null;
    const era = fxSettings.era.pick !== 'auto' ? fxSettings.era.pick : playing ? eraOf(cur.year) : null;
    const who = playing ? `${cur.year} ${M.titleOf(cur)}` : tr('现在没在放歌');
    return `${esc(who)}${fam ? ' · ' + tr(FAMILIES[fam].name) : ''}${era ? ' · ' + tr(ERA_LOOKS[era].name) : ''}`;
  }
  function renderFx() {
    const S = fxSettings, sel = (chain, list, cur) => `<select data-pick="${chain}" aria-label="${tr(chain === 'style' ? '风格' : '年代')}"><option value="auto"${cur === 'auto' ? ' selected' : ''}>${tr('跟着歌')}</option>${Object.entries(list).map(([k, v]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${tr(v.name)}${v.span ? ' · ' + tr(v.span) : ''}</option>`).join('')}</select>`;
    const hintOf = (chain) => { if (chain === 'style') { const k = S.style.pick !== 'auto' ? S.style.pick : null; return k ? tr(FAMILIES[k].hint) : tr('按这首歌的风格选：爵士是烟雾与铜管，摇滚是霓虹火花，蓝调是蓝调之雾……'); }
      const k = S.era.pick !== 'auto' ? S.era.pick : null; return k ? tr(ERA_LOOKS[k].hint) : tr('按这首歌的年代选底片：1920 年代是默片，1950 年代是霓虹电视……'); };
    const range = (chain, key, label, v) => `<label class="fx-knob"><span>${tr(label)}</span><input type="range" min="0" max="100" step="1" value="${pctOf(v)}" data-chain="${chain}" data-key="${key}" aria-label="${tr(label)}"><em>${pctOf(v)}</em></label>`;
    const led = (chain, on) => `<button class="fx-led" type="button" data-led="${chain}" aria-pressed="${on}"><i></i>${tr(on ? '开' : '关')}</button>`;
    fxBoard.dataset.on = S.on ? '1' : '0';
    fxBoard.innerHTML = `<header class="fx-head"><div><h3 id="fxTitle">${tr('星空效果器')}</h3><p class="fx-now">${fxNowText()}</p></div>
        <button class="fx-led fx-master" type="button" data-led="all" aria-pressed="${S.on}"><i></i>${tr(S.on ? '总开关 · 开' : '总开关 · 关')}</button>
        <button class="fx-x" type="button" aria-label="${tr('关闭')}">×</button></header>
      <div class="fx-pedals">
        <div class="fx-pedal" data-chain="rhythm" data-on="${S.rhythm.on}"><div class="fx-top"><b>${tr('节奏')}</b>${led('rhythm', S.rhythm.on)}</div>
          <p class="fx-hint">${tr('重拍时星一起亮、从盘边荡开水波，镲片让一小撮星闪，星流跟着速度快慢；点天空时水波会对到拍子上')}</p>
          ${range('rhythm', 'amt', '强度', S.rhythm.amt)}${range('rhythm', 'sens', '灵敏度', S.rhythm.sens)}<p class="fx-read" data-read="rhythm"></p></div>
        <div class="fx-pedal" data-chain="style" data-on="${S.style.on}"><div class="fx-top"><b>${tr('风格')}</b>${led('style', S.style.on)}</div>
          ${sel('style', FAMILIES, S.style.pick)}<p class="fx-hint">${hintOf('style')}</p>${range('style', 'amt', '强度', S.style.amt)}</div>
        <div class="fx-pedal" data-chain="era" data-on="${S.era.on}"><div class="fx-top"><b>${tr('年代')}</b>${led('era', S.era.on)}</div>
          ${sel('era', ERA_LOOKS, S.era.pick)}<p class="fx-hint">${hintOf('era')}</p>${range('era', 'amt', '强度', S.era.amt)}</div>
      </div>
      <footer class="fx-foot">${range('all', 'master', '总量', S.master)}
        <button class="fx-led" type="button" data-led="sfx" aria-pressed="${!M.prefs.sfxOff}"><i></i>${tr('音效')}</button>
        <button class="fx-reset" type="button">${tr('恢复默认')}</button>
        ${ctx.reduced() ? `<p class="fx-note">${tr('系统设置了减少动态：星空是静止的，这些效果不会动。')}</p>` : ''}</footer>`;
    readFx();
  }
  // 面板开着时，每 0.25 s 读一次：听到的速度、电平
  let fxTimer = 0;
  function readFx() {
    const el = fxBoard.querySelector('[data-read="rhythm"]'); if (!el) return;
    const n = cosmos?.fxNow; if (!n) { el.textContent = ''; return; }
    el.innerHTML = n.live ? `<span class="fx-meter" style="--v:${n.level}"></span>${n.bpm ? tr('约 {n} BPM', {n: n.bpm}) : tr('在听拍子…')}` : tr('有声音时，这里显示听到的速度');
    const now = fxBoard.querySelector('.fx-now'); if (now) now.innerHTML = fxNowText();
  }
  function openFx(from) {
    fxBoard.hidden = false; renderFx(); fxBoard.dataset.from = from || '';
    clearInterval(fxTimer); fxTimer = setInterval(readFx, 250);
    fxBoard.querySelector('.fx-x')?.focus({preventScroll: true});
  }
  function closeFx(focusBack = true) { if (fxBoard.hidden) return; fxBoard.hidden = true; clearInterval(fxTimer); if (focusBack) $(fxBoard.dataset.from === 'np' ? 'npFx' : 'fxOpen')?.focus?.({preventScroll: true}); }
  fxBoard.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('fx-x')) return closeFx();
    if (b.classList.contains('fx-reset')) { fxSettings = normalizeFx(structuredClone(DEFAULT_FX)); M.prefs.sfxOff = false; saveFx(); renderFx(); return; }
    const k = b.dataset.led; if (!k) return;
    if (k === 'all') fxSettings.on = !fxSettings.on;
    else if (k === 'sfx') { M.prefs.sfxOff = !M.prefs.sfxOff; M.savePrefs(); }
    else fxSettings[k].on = !fxSettings[k].on;
    saveFx(); renderFx(); fxBoard.querySelector(`[data-led="${k}"]`)?.focus({preventScroll: true});
  });
  fxBoard.addEventListener('input', e => {
    const r = e.target.closest('input[type=range]'); if (!r) return;
    const v = +r.value / 100; if (r.dataset.chain === 'all') fxSettings.master = v; else fxSettings[r.dataset.chain][r.dataset.key] = v;
    r.nextElementSibling.textContent = r.value; saveFx();
  });
  fxBoard.addEventListener('change', e => {
    const sl = e.target.closest('select[data-pick]'); if (!sl) return;
    fxSettings[sl.dataset.pick].pick = sl.value; if (!fxSettings[sl.dataset.pick].on) fxSettings[sl.dataset.pick].on = true;
    saveFx(); renderFx(); fxBoard.querySelector(`select[data-pick="${sl.dataset.pick}"]`)?.focus({preventScroll: true});
  });
  fxBoard.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeFx(); } });
  $('fxOpen')?.addEventListener('click', () => fxBoard.hidden ? openFx('legend') : closeFx());

  function updateSky() {
    if (!cosmos) return;
    const s = skyData(); skyInfo.clear(); for (const x of s.list) skyInfo.set(x.id, x);
    cosmos.setSky(s.list, s.cons); cosmos.setFinale(s.all);
  }

  // 手机：舞台底部的「曲目表」按钮，往下翻到曲目表
  $('toPanel')?.addEventListener('click', () => panel.scrollIntoView({behavior: ctx.reduced() ? 'auto' : 'smooth', block: 'start'}));
  // 长按不弹系统的选字框和菜单（iOS 的放大镜、安卓的长按菜单）
  stage.addEventListener('contextmenu', e => { if (!e.target.closest('a,input,textarea')) e.preventDefault(); });
  stage.addEventListener('selectstart', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

  /* ---------- 盘：立体或平面 ---------- */
  let glLost = false;
  // 手机切到后台、显存紧张时，系统会收回 WebGL；还回来时重建成立体的盘和星空，不留在平面盘上
  canvas.addEventListener('webglcontextrestored', () => { if (glLost) { glLost = false; mount(); } });
  $('cosmos')?.addEventListener('webglcontextrestored', () => { if (!cosmos && disc && !view.flat) mountCosmos(); });
  if (M.prefs.flat && !M.prefs.flatTest) { delete M.prefs.flat; M.savePrefs(); }   // 以前 WebGL 丢失一次就永久换成平面盘；清掉这个旧值
  async function mount() {
    disc?.destroy(); disc = null; flat = null; flatHost.replaceChildren(); hud.replaceChildren(); hudBuilt = false;
    // 平面盘：测试页可以指定；WebGL 丢失（手机切到后台久了常见）只在这一次打开里换成平面的，不写进偏好，下次打开照旧是立体的
    view.flat = M.prefs.flat === true && !!M.prefs.flatTest || glLost;
    if (!view.flat) {
      try {
        const {createDisc} = await import('./gl.js');
        disc = createDisc(canvas, {reducedMotion: ctx.reduced, onFrame: updateHud, panelFrac: () => innerWidth > 860 ? panel.offsetWidth / stage.clientWidth : 0, onLost: () => { glLost = true; mount(); }});
      } catch (e) { console.warn('WebGL 不可用，改用平面的盘：', e.message); view.flat = true; }
    }
    canvas.hidden = view.flat; flatHost.hidden = !view.flat; stage.dataset.flat = view.flat ? '1' : '0';
    if (view.flat) mountFlat();
    mountCosmos();
    $('discHelp').textContent = tr(view.flat ? '平面盘 · ↑↓ 换年代 · ←→ 换歌 · 空格落针或抬针'
      : matchMedia('(pointer:coarse)').matches ? '拖动转盘 · 点一条年代带贴近' : '拖动转盘 · 点一条年代带贴近 · ↑↓ 换年代 ←→ 换歌 · 空格落针或抬针');
    applyView(true);
  }
  function mountFlat() {
    flat = flatDisc({detail: true, digits: true, decades: true, title: tr('母盘（平面）')});
    flatHost.replaceChildren(flat.svg);
    const at = e => { const b = flat.svg.getBoundingClientRect(), vb = flat.svg.viewBox.baseVal;
      const x = vb.x + (e.clientX - b.left) / b.width * vb.width, y = vb.y + (e.clientY - b.top) / b.height * vb.height;
      return M.ringAtRadius(Math.hypot(x, y), 2.5); };
    flat.svg.addEventListener('click', e => { const g = at(e); if (g) enterBand(bands[g.band], g); });
    flat.svg.addEventListener('pointermove', e => { const g = at(e); flat.svg.style.cursor = g ? 'pointer' : ''; });
    if (view.song) flat.setFocus(view.song);
  }

  /* ---------- HUD：盘缘数字、年代名、年份牌 ---------- */
  let hudBuilt = false; const H = {digits: [], decs: [], tags: [], chip: null};
  function buildHud() {
    hud.replaceChildren(); H.digits = []; H.decs = []; H.tags = [];
    for (let d = 0; d < 10; d++) { const n = document.createElement('span'); n.className = 'hud-digit'; n.textContent = d; hud.appendChild(n); H.digits.push(n);
      n.addEventListener('animationend', () => n.classList.remove('ping', 'key'));
      // 点盘缘的数字：和按数字键一样（手机上没有键盘，也没有指针悬停）
      n.title = tr('年份个位是 {d} 的歌', {d}); n.addEventListener('click', e => { e.stopPropagation(); if (disc && cosmos && !view.flat && !view.intro) summonDigit(d); }); }
    for (const b of bands) { const n = document.createElement('span'); n.className = 'hud-dec'; n.textContent = b.label; hud.appendChild(n); H.decs.push(n); }
    for (let i = 0; i < 22; i++) { const n = document.createElement('span'); n.className = 'hud-tag'; hud.appendChild(n); H.tags.push(n); }
    H.chip = document.createElement('span'); H.chip.className = 'hud-chip'; hud.appendChild(H.chip);
    hudBuilt = true;
  }
  const place = (n, p, show = true) => { if (!p || !show) { n.style.opacity = 0; return; } n.style.opacity = ''; n.style.transform = `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0) translate(-50%,-50%)`; };
  function updateHud(api) {
    if (!hudBuilt) buildHud();
    positionSpread(api);
    const S = api.state, close = S.mode === 'close', hide = S.mode === 'dive' || S.mode === 'intro' || S.light < .6;
    const focusDigit = view.song ? M.byId.get(view.song).year % 10 : -1;
    const rd = close ? bands[S.band].outer + GEO.unit * 2.2 : 1.062;
    for (let d = 0; d < 10; d++) {
      const a = d / 10 * TAU + S.rot, p = api.project([rd * Math.sin(a), close ? .004 : 0, -rd * Math.cos(a)]);
      const n = H.digits[d]; place(n, p, !hide && p && p[1] > 40 && p[1] < S.H + 20);
      n.classList.toggle('on', d === focusDigit); n.classList.toggle('near', close);
    }
    const ad = 176 * Math.PI / 180;
    bands.forEach((b, i) => { const p = api.project([b.mid * Math.sin(ad), 0, -b.mid * Math.cos(ad)]);
      place(H.decs[i], p, !hide && !close && (S.W > 520 || b.ids.length >= 4)); H.decs[i].classList.toggle('on', i === (S.hover >= 0 ? rings[S.hover].band : view.kbBand) && !close); });
    const edge = panelEdge();
    const hits = close ? api.sleeveHits().filter(h => h.top[0] < edge) : [];
    const years = new Map();   // 同一年的封套共用一块年份牌
    for (const h of hits) { const y = h.g.t.year, e = years.get(y) || {y, x: 0, top: 1e9, n: 0, on: false}; e.x += h.top[0]; e.top = Math.min(e.top, h.top[1]); e.n++; e.on ||= h.g.id === view.song; years.set(y, e); }
    const tags = close ? [] : [...years.values()];
    H.tags.forEach((n, i) => { const e = tags[i]; if (!e || hide) { n.style.opacity = 0; return; }
      if (n.textContent !== String(e.y)) n.textContent = e.y;
      n.classList.toggle('on', e.on); place(n, [e.x / e.n, e.top - 12]); });
    for (let d = 0; d < 10; d++) { const r = H.digits[d].style.transform.match(/translate3d\(([-\d.]+)px/); if (r && +r[1] > edge) H.digits[d].style.opacity = 0; }
    // 贴近时：落在「同年封套」标题和年份按钮上的数字不显示，不和按钮叠在一起
    const head = close && !spread.hidden ? spread.querySelector('.spread-head') : null;
    if (head) { const hb = head.getBoundingClientRect(), sb = stage.getBoundingClientRect(), box = [hb.left - sb.left - 14, hb.top - sb.top - 14, hb.right - sb.left + 14, hb.bottom - sb.top + 14];
      for (let d = 0; d < 10; d++) { const m = H.digits[d].style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/); if (m && +m[1] > box[0] && +m[1] < box[2] && +m[2] > box[1] && +m[2] < box[3]) H.digits[d].style.opacity = 0; } }
    if (chipAt && !hide) { H.chip.style.opacity = 1; H.chip.style.transform = `translate3d(${chipAt.x + 14}px,${chipAt.y - 30}px,0)`; } else H.chip.style.opacity = 0;
  }
  const panelEdge = () => innerWidth > 860 ? panel.getBoundingClientRect().left - 8 : 1e9;
  function setChip(g, x, y) {
    if (!hudBuilt) return;
    if (!g) { chipAt = null; H.chip.style.opacity = 0; return; }
    if (H.chip.dataset.id !== g.id) { H.chip.dataset.id = g.id; H.chip.innerHTML = `<b>${g.t.year}</b>${esc(M.titleOf(g.t))}`; }
    chipAt = {x, y}; disc?.request();
  }

  /* ---------- 视图状态 ---------- */
  const say = text => { live.textContent = text; };
  function applyView(snap = false) {
    stage.dataset.mode = view.mode; cosmos?.setState(view.mode);
    const g = view.song ? M.ringOf.get(view.song) : null;
    if (disc) {
      if (view.mode === 'close') { disc.setMode('close', view.band); disc.setSleeves(yearItems().map(t => t.id), 1); if (g) disc.rotateTo(disc.frontPhi(g.id)); }
      else { disc.setMode('over'); disc.setSleeves(hoverBand >= 0 ? overviewSleeves(bands[hoverBand]) : [], .62); }
      disc.setFocus(g ? g.i : -1);
      if (snap) disc.jumpCamera();
    }
    flat?.setFocus(view.song);
    renderPanel(); renderSpread();
  }
  function frontRing(band) {   // 这条带里离观众最近的一圈
    const front = disc ? ((Math.PI - disc.state.rot) % TAU + TAU) % TAU : 0;
    let best = null, bd = 9;
    for (const id of band.ids) { const g = M.ringOf.get(id); const d = Math.abs(((g.phi - front + Math.PI) % TAU + TAU) % TAU - Math.PI); if (d < bd) { bd = d; best = g; } }
    return best;
  }
  function enterBand(band, g = null) {
    view.mode = 'close'; view.band = band.i; view.kbBand = band.i; hoverBand = -1; setChip(null);
    select(g || frontRing(band), false);
    applyView();
    say(`${band.name}, ${tr('{n} 首', {n: band.ids.length})}. ${view.song ? M.byId.get(view.song).year + ' ' + M.byId.get(view.song).song : ''}`);
  }
  function select(g, apply = true) {
    if (!g) return;
    view.song = g.id;
    disc?.rotateTo(g.phi);
    if (apply) { if (g.band !== view.band || view.mode !== 'close') return enterBand(bands[g.band], g); applyView(); say(`${g.t.year}, ${g.t.song}, ${g.t.artist}`); }
  }
  function backOver() {
    if (view.mode === 'over') return;
    view.mode = 'over'; view.band = -1; view.song = null; applyView(); disc?.home(); say(tr('整张盘'));
    focusDisc();
  }
  function stepSong(dir) {
    const ids = bands[view.band].ids, i = ids.indexOf(view.song), n = rings[(M.ringOf.get(ids[i]).i + dir + rings.length) % rings.length].id;
    if (n && n !== view.song) select(M.ringOf.get(n));
  }
  function stepBand(dir) {
    const i = (view.band + dir + bands.length) % bands.length; if (i === view.band) return;
    const cur = view.song ? M.ringOf.get(view.song) : null, band = bands[i];
    let best = null, bd = 9;   // 换到新年代里辐线最近的一首
    for (const id of band.ids) { const g = M.ringOf.get(id), d = cur ? Math.abs(((g.phi - cur.phi + Math.PI) % TAU + TAU) % TAU - Math.PI) : 0; if (d < bd) { bd = d; best = g; } }
    enterBand(band, best);
  }

  /* ---------- 指针 ---------- */
  let hoverBand = -1, drag = null, springBack = 0;   // 贴近时松手：盘带着惯性转一下，再弹回这一年的正面
  const local = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  function hit(x, y) {
    const sg = disc.pickSleeve(x, y); if (sg) return {g: sg, band: bands[sg.band], sleeve: true};
    const h = disc.pick(x, y); if (!h) return null;
    if (h.r < GEO.RL) return {label: true};
    const band = M.bandAtRadius(h.r); if (!band || h.r > 1) return h.r <= 1.02 ? {rim: true} : null;
    let g = M.ringAtRadius(h.r, view.mode === 'close' ? 1 : 3);
    if (!g || g.band !== band.i) g = band.ids.map(id => M.ringOf.get(id)).reduce((a, b) => Math.abs(b.mid - h.r) < Math.abs(a.mid - h.r) ? b : a);
    return {g, band};
  }
  canvas.addEventListener('pointermove', e => {
    if (!disc || view.intro) return;
    const [x, y] = local(e);
    if (skyG) {   // 在天上按着：拖动是划水，按住是漩涡
      if (skyG.mode === 'tap' && Math.hypot(x - skyG.x0, y - skyG.y0) > 6) { clearTimeout(holdTimer); skyG.mode = 'wake'; cosmos?.hover(null); cosmos?.wake(skyG.cx, skyG.cy); }
      if (skyG.mode === 'wake') cosmos?.wake(e.clientX, e.clientY); else if (skyG.mode === 'hold') cosmos?.vortexMove(e.clientX, e.clientY);
      return;
    }
    if (drag) {
      const h = disc.pick(x, y), now = performance.now();
      if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 5) { drag.moved = true; disc.setDragging(true); setChip(null); canvas.classList.add('grabbing'); }
      if (drag.moved) {
        let d = h && drag.last !== null && h.r > .05 && h.r < 2.2 ? ((h.world - drag.last + Math.PI) % TAU + TAU) % TAU - Math.PI : (x - drag.px) * -.004;
        if (Math.abs(d) > .5) d = 0;
        disc.rotateBy(d); cosmos?.spin(d); const dt = Math.max(1, now - drag.t) / 1000; drag.v = drag.v * .6 + (d / dt) * .4; drag.t = now;
        drag.last = h ? h.world : null;
      } else if (h) drag.last = h.world;
      drag.px = x; return;
    }
    const t = hit(x, y), g = t?.g || null;
    const sp = !t && cosmos ? cosmos.pick(e.clientX, e.clientY) : null;   // 天上的封面、恒星、余光星
    cosmos?.hover(sp ? sp.id : null);
    canvas.style.cursor = t?.g || t?.label || sp ? 'pointer' : t?.rim ? 'grab' : '';
    disc.setHover(g ? g.i : -1);
    setChip(g, x, y);
    if (view.mode === 'over') { const hb = t?.band ? t.band.i : -1; if (hb !== hoverBand) { hoverBand = hb; disc.setSleeves(hb >= 0 ? bands[hb].ids : [], .62);
      // 指针在一个年代上停一会儿：天上出现那个年代的一件天文事件
      clearTimeout(eraTimer); if (hb >= 0) eraTimer = setTimeout(() => { if (hoverBand === hb) cosmos?.showEra(bands[hb].decade); }, 700); } }
  });
  canvas.addEventListener('pointerdown', e => {
    canvas.classList.remove('kb');
    if (!disc || e.button !== 0) return;
    if (view.intro) return endIntro();
    if (cardId) closeCard();
    const [x, y] = local(e), h = disc.pick(x, y);
    if (!hit(x, y) && cosmos) {   // 按在天上（不是盘上）
      cosmos.skyTouch();
      skyG = {x0: x, y0: y, cx: e.clientX, cy: e.clientY, mode: 'tap', pick: cosmos.pick(e.clientX, e.clientY)};
      try { canvas.setPointerCapture(e.pointerId); } catch {} clearTimeout(holdTimer);
      if (!skyG.pick) holdTimer = setTimeout(() => { if (skyG?.mode === 'tap' && cosmos?.vortexStart(skyG.cx, skyG.cy)) { skyG.mode = 'hold'; cosmos.hover(null); canvas.classList.add('holding'); } }, 300);
      return;
    }
    drag = {x0: x, y0: y, px: x, moved: false, last: h ? h.world : null, v: 0, t: performance.now()};
    canvas.setPointerCapture(e.pointerId);
  });
  const release = e => {
    if (skyG) {
      const s = skyG; skyG = null; clearTimeout(holdTimer); canvas.classList.remove('holding');
      if (s.mode === 'hold') cosmos?.vortexEnd(); else if (s.mode === 'wake') cosmos?.wakeEnd();
      else if (e.type !== 'pointercancel') { if (s.pick) openCard(s.pick); else cosmos?.ripple(e.clientX, e.clientY); }
      return;
    }
    if (!drag) return; const d = drag; drag = null; canvas.classList.remove('grabbing');
    if (d.moved) { const fv = performance.now() - d.t < 80 ? Math.max(-6, Math.min(6, d.v)) : 0; disc.setDragging(false, fv); cosmos?.fling(fv); if (view.mode === 'close' && view.song) { clearTimeout(springBack); springBack = setTimeout(() => { if (drag || view.mode !== 'close' || !view.song) return;
      const near = disc.fanMode() === 'arc' ? disc.nearestSleeve() : null;   // 弧形转盘：转到哪张就选哪张
      if (near && near !== view.song) select(M.ringOf.get(near)); else disc.rotateTo(disc.frontPhi(view.song)); }, ctx.reduced() ? 0 : 520); } return; }
    if (e.type === 'pointercancel') return;
    const [x, y] = local(e), t = hit(x, y);
    if (!t) { cosmos?.ripple(e.clientX, e.clientY); return; }   // 点到天空的空白处：泛起水波
    if (t.label) return view.mode === 'close' ? backOver() : null;
    if (t.g) { if (view.mode === 'close' && t.g.band === view.band) select(t.g); else enterBand(t.band, t.g); }
  };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (drag || skyG) return; disc?.setHover(-1); setChip(null); cosmos?.hover(null); clearTimeout(eraTimer); if (view.mode === 'over' && hoverBand >= 0) { hoverBand = -1; disc?.setSleeves([], .62); } });
  canvas.addEventListener('wheel', e => { if (!disc || view.intro) return; e.preventDefault(); disc.rotateBy((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * .0016); }, {passive: false});
  canvas.addEventListener('dblclick', e => { if (!disc) return; const [x, y] = local(e), t = hit(x, y); if (t?.g && view.song === t.g.id) toggleNeedle(); });

  /* ---------- 键盘 ---------- */
  function focusDisc() { (view.flat ? flatHost : canvas).focus({preventScroll: true}); }
  document.addEventListener('keydown', e => {
    const room = $('roomDisc'), t = e.target;
    if (room.hidden || e.defaultPrevented || e.isComposing || e.keyCode === 229 ||
        e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
        (!room.contains(t) && t !== document.body && t !== document.documentElement) ||
        t.closest?.('input,textarea,select,[contenteditable],a,summary,[role=slider],video')) return;
    const k = e.key, button = t.closest?.('button');
    const songButton = button?.matches('[data-song],[data-cover],.needle-btn');
    if (k === ' ' && button && !songButton) return;
    if (k === 'Enter' && button) return;
    if (/^[0-9]$/.test(k) && disc && cosmos && !view.flat) { e.preventDefault(); if (view.intro) endIntro(); summonDigit(+k); return; }
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape',' '].includes(k)) return;
    if (k === 'Escape' && view.mode !== 'close') return;
    e.preventDefault();
    if (e.repeat && (k === ' ' || k === 'Enter')) return;
    if (view.intro) endIntro();
    const overview = view.mode === 'over';
    if (overview) enterBand(bands[view.kbBand]);
    if (k === 'ArrowLeft' || k === 'ArrowRight') stepSong(k === 'ArrowRight' ? 1 : -1);
    else if (k === 'ArrowUp' || k === 'ArrowDown') stepBand(k === 'ArrowUp' ? 1 : -1);
    else if (k === 'Escape') backOver();
    else if (k === ' ' || !overview) toggleNeedle();
    focusDisc();
  });

  /* ---------- 落针 ---------- */
  let needleToken = 0;
  function toggleNeedle(id = view.song) {
    if (!M.byId.get(id)) return;
    if (player.current()?.id === id && view.needle !== 'idle') return liftNeedle();
    dropNeedle(id);
  }
  // 总是从头放这一首（单曲循环、上一首/下一首都走这里）
  function dropNeedle(id) {
    const t = M.byId.get(id); if (!t) return;
    pauseVideo(); noteHistory(id);
    const g = M.ringOf.get(id), token = ++needleToken;
    player.prepare(t); view.needle = 'dropping'; renderNeedle();
    if (!disc) { player.start(); return; }
    disc.arm(g.mid, true); disc.setPlay(g.i, false);
    const t0 = performance.now();
    const wait = () => { if (token !== needleToken) return;
      if (disc.armSettled() || performance.now() - t0 > 2600 || ctx.reduced()) { player.start(); disc.setPlay(g.i, true); needleRipple(); } else requestAnimationFrame(wait); };
    requestAnimationFrame(wait);
  }
  function liftNeedle() { needleToken++; player.stop(); }

  /* ---------- 播放模式：顺序 / 随机 / 单曲循环，像听歌软件一样 ----------
     播放范围跟着右侧勾选的讲次；顺序按盘上由外到内（年份从早到晚）。
     顺序播放放到最后一首就停；随机播放把范围洗一遍再放，放完重新洗；单曲循环一直放这一首。
     上一首：放了 3 秒以上先回到这首开头；随机时按播放记录往回退。 */
  const MODES = ['order', 'shuffle', 'one'];
  const MODE_LABEL = {order: '顺序播放', shuffle: '随机播放', one: '单曲循环'};
  if (!MODES.includes(M.prefs.playMode)) M.prefs.playMode = 'order';
  const playlist = () => { const ids = rings.map(g => g.id).filter(id => M.lectureIds(M.byId.get(id)).some(l => M.prefs.scope.includes(l))); return ids.length ? ids : rings.map(g => g.id); };
  let bag = [], played = [];
  const noteHistory = id => { if (played.at(-1) !== id) played.push(id); if (played.length > 200) played.shift(); };
  function orderStep(cur, dir, wrap) {
    const list = playlist(); if (!list.length) return null;
    let i = list.indexOf(cur);
    if (i < 0) { const r = M.ringOf.get(cur)?.i ?? -1; i = dir > 0 ? list.findIndex(id => M.ringOf.get(id).i > r) - 1 : list.findIndex(id => M.ringOf.get(id).i >= r); if (i < -1) i = dir > 0 ? list.length - 1 : list.length; }
    const j = i + dir;
    if (j >= 0 && j < list.length) return list[j];
    return wrap ? list[(j + list.length) % list.length] : null;
  }
  function shuffleNext(cur) {
    const list = playlist();
    bag = bag.filter(id => list.includes(id) && id !== cur);
    if (!bag.length) { bag = list.filter(id => id !== cur); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return bag.shift() ?? cur;
  }
  function nextOf(cur, auto) {
    const mode = M.prefs.playMode;
    if (mode === 'one' && auto) return cur;
    if (mode === 'shuffle') return shuffleNext(cur);
    return orderStep(cur, 1, !auto);   // 顺序播放：自动放到最后一首停下；手动点下一首会绕回第一首
  }
  function prevOf(cur) {
    if (M.prefs.playMode === 'shuffle' && played.length > 1) { played.pop(); return played.pop(); }
    return orderStep(cur, -1, true);
  }
  // 换到另一首：如果右侧正显示刚才那首，就跟着翻到新的一首（像播放器的“正在播放”）
  function playTrack(id, from) {
    if (!id) return;
    if (from && view.mode === 'close' && view.song === from && id !== from) select(M.ringOf.get(id));
    dropNeedle(id);
  }
  function skip(dir) {
    const cur = player.current()?.id || view.song; if (!cur) return;
    if (dir < 0 && player.time().t > 3) return dropNeedle(cur);
    playTrack(dir > 0 ? nextOf(cur, false) : prevOf(cur), cur);
  }
  // 播放 / 暂停；放完停下后再点就从头放这一首
  function togglePlay(want) {
    const cur = player.current()?.id; if (!cur) return;
    const active = ['playing', 'buffering', 'dropping'].includes(view.needle);
    if (active && want !== 'play') return player.pause();
    if (!active && want !== 'pause') return view.needle === 'paused' ? player.resume() : dropNeedle(cur);
  }
  function setMode(mode) {
    M.prefs.playMode = mode; M.savePrefs(); bag = [];
    renderBar(); say(tr(MODE_LABEL[mode]));
  }

  /* ---------- 正在播放：底部播放条 ---------- */
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M19 5L9 12l10 7z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5v14M5 5l10 7-10 7z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    order: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ln"><path d="M4 7h11M4 12h11M4 17h7"/><path d="M15 17h5m-2.5-2.5L20 17l-2.5 2.5"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ln"><path d="M4 7h3.5c5 0 5 10 10 10H20m-2.5-2.5L20 17l-2.5 2.5"/><path d="M4 17h3.5c1.6 0 2.7-1 3.6-2.3m2.8-5.4C14.8 8 15.9 7 17.5 7H20m-2.5-2.5L20 7l-2.5 2.5"/></svg>',
    one: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ln"><path d="M17 7H8a4 4 0 0 0-4 4v1m3 5h9a4 4 0 0 0 4-4v-1"/><path d="M15 4.5L17.5 7 15 9.5M9 19.5L6.5 17 9 14.5"/><path d="M11.2 10.2l1.3-.9v5.4" class="one"/></svg>'
  };
  const bar = document.createElement('section');
  bar.className = 'np'; bar.hidden = true; bar.setAttribute('aria-label', tr('正在播放'));
  bar.innerHTML = `<div class="np-main">
      <button class="np-song" data-np="show" title="${tr('在盘上显示这首歌')}"><span class="np-cover"></span><span class="np-meta"><b></b><small></small></span></button>
      <div class="np-ctrl">
        <button data-np="prev" aria-label="${tr('上一首')}" title="${tr('上一首')}">${ICON.prev}</button>
        <button data-np="toggle" class="np-play"></button>
        <button data-np="next" aria-label="${tr('下一首')}" title="${tr('下一首')}">${ICON.next}</button>
      </div>
      <button data-np="mode" class="np-mode"></button>
      <button data-np="fx" class="np-fx" id="npFx" title="${tr('星空效果器')}" aria-label="${tr('星空效果器')}"><svg viewBox="0 0 24 24" aria-hidden="true" class="ln"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2.6"/></svg><span>${tr('星空')}</span></button>
      <button data-np="stop" class="np-x" aria-label="${tr('停止播放')}" title="${tr('停止播放')}">×</button>
    </div>
    <div class="np-prog"><span class="np-t">0:00</span><input type="range" min="0" max="1000" value="0" step="1" aria-label="${tr('播放进度')}"><span class="np-d">0:00</span></div>`;
  $('roomDisc').append(bar);
  const range = bar.querySelector('input'), clockOf = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let seeking = false;
  function renderBar() {
    const t = player.current();
    bar.hidden = !t; $('roomDisc').dataset.np = t ? '1' : '0';
    const mode = M.prefs.playMode, mb = bar.querySelector('.np-mode');
    bar.querySelector('.np-fx').hidden = !cosmos;
    mb.innerHTML = `${ICON[mode]}<span>${tr(MODE_LABEL[mode])}</span>`;
    mb.setAttribute('aria-label', tr('播放模式：{m}（点一下切换）', {m: tr(MODE_LABEL[mode])})); mb.title = mb.getAttribute('aria-label'); mb.dataset.mode = mode;
    if (!t) { mediaSession(null); return; }
    const playing = view.needle === 'playing' || view.needle === 'buffering' || view.needle === 'dropping';
    const pb = bar.querySelector('.np-play'); pb.innerHTML = playing ? ICON.pause : ICON.play;
    pb.setAttribute('aria-label', tr(playing ? '暂停' : '播放')); pb.title = pb.getAttribute('aria-label');
    if (bar.dataset.track !== t.id) {
      bar.dataset.track = t.id;
      const c = M.coverOf(t);
      bar.querySelector('.np-cover').innerHTML = c ? `<img src="${c.url}" alt="" width="44" height="44">` : `<i>${t.year}</i>`;
      bar.querySelector('.np-meta b').textContent = M.titleOf(t);
      bar.querySelector('.np-meta small').textContent = `${t.artist} · ${t.year}`;
      mediaSession(t);
    }
    bar.dataset.state = view.needle;
    progress();
    if ('mediaSession' in navigator) try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch {}
  }
  function progress() {
    if (seeking || bar.hidden) return;
    const {t, d} = player.time(), dur = d || player.current()?.duration || 0;
    range.value = dur ? Math.round(t / dur * 1000) : 0;
    range.style.setProperty('--p', (dur ? t / dur * 100 : 0) + '%');
    range.setAttribute('aria-valuetext', `${clockOf(t)} / ${clockOf(dur)}`);
    bar.querySelector('.np-t').textContent = clockOf(t); bar.querySelector('.np-d').textContent = clockOf(dur);
  }
  player.element.addEventListener('timeupdate', progress);
  player.element.addEventListener('loadedmetadata', progress);
  range.addEventListener('input', () => {
    seeking = true; const dur = player.time().d || player.current()?.duration || 0;
    range.style.setProperty('--p', range.value / 10 + '%');
    bar.querySelector('.np-t').textContent = clockOf(range.value / 1000 * dur);
  });
  range.addEventListener('change', () => { const dur = player.time().d || player.current()?.duration || 0; player.seek(range.value / 1000 * dur); seeking = false; progress(); });
  bar.addEventListener('click', e => {
    const act = e.target.closest('[data-np]')?.dataset.np; if (!act) return;
    const cur = player.current()?.id;
    if (act === 'toggle') return togglePlay();
    if (act === 'prev') return skip(-1);
    if (act === 'next') return skip(1);
    if (act === 'mode') return setMode(MODES[(MODES.indexOf(M.prefs.playMode) + 1) % MODES.length]);
    if (act === 'fx') return fxBoard.hidden ? openFx('np') : closeFx();
    if (act === 'stop') return liftNeedle();
    if (act === 'show' && cur) { const g = M.ringOf.get(cur); if (view.mode !== 'close' || view.song !== cur) enterBand(bands[g.band], g); }
  });
  // 系统的媒体控制（锁屏、耳机、键盘上的播放键）
  function mediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    try {
      if (!t) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; return; }
      const c = M.coverOf(t);
      navigator.mediaSession.metadata = new MediaMetadata({title: M.titleOf(t), artist: `${t.artist} · ${t.year}`, album: tr('大众音乐史复习室'), artwork: c ? [{src: c.url}] : []});
    } catch {}
  }
  if ('mediaSession' in navigator) {
    const h = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch {} };
    h('play', () => togglePlay('play')); h('pause', () => togglePlay('pause'));
    h('previoustrack', () => skip(-1)); h('nexttrack', () => skip(1));
    h('seekto', d => { if (d.seekTime != null) player.seek(d.seekTime); });
  }

  /* ---------- 课件视频 ---------- */
  // 正在看的视频跨面板重绘保留（同一首歌），换歌或离开唱片页就停下。
  let liveVideo = null;
  function pauseVideo() { liveVideo?.querySelector('video')?.pause(); }
  function keepVideo() {
    const fresh = panel.querySelector('.vid');
    if (liveVideo && fresh && liveVideo.dataset.video === fresh.dataset.video) fresh.replaceWith(liveVideo);
    else if (liveVideo) { liveVideo.querySelector('video')?.pause(); liveVideo = null; }
  }
  function playVideo(fig, at = 0) {
    liveVideo = fig;
    mountVideo(fig, {at, onPlay: () => { if (player.current()) liftNeedle(); }});
  }
  player.on((state, t) => {
    if (state === 'ended' && t) {   // 一首放完：按播放模式接下一首
      const next = nextOf(t.id, true);
      if (next) { playTrack(next, t.id); return; }
      say(tr('已经放到范围里的最后一首'));
    }
    if (state === 'playing') { view.needle = 'playing'; say(tr('正在播放 {s}', {s: t.song})); }
    else if (state === 'loading') view.needle = 'dropping';
    else if (state === 'waiting') { view.needle = 'buffering'; say(tr('音频正在缓冲')); }
    else if (state === 'paused' && player.current()) { view.needle = 'paused'; disc?.setPlay(M.ringOf.get(t.id)?.i ?? -1, false); }
    else { view.needle = 'idle'; disc?.arm(null, false); disc?.setPlay(-1, false); if (state === 'error' || state === 'blocked') say(tr('这段音频现在放不出来')); }
    if (state === 'playing' && disc) disc.setPlay(M.ringOf.get(t.id)?.i ?? -1, true);
    cosmos?.setPlaying(state === 'playing');
    if (state === 'playing' && t) startFx(t); else if (['stopped', 'idle', 'error', 'ended'].includes(state)) { cosmos?.setTrack(null); fxTrackShown = null; }
    bgm.hold('needle', state === 'playing' || state === 'loading' || state === 'waiting');   // 落针就让开
    renderNeedle(); renderBar();
  });
  function renderNeedle() {
    const b = panel.querySelector('.needle-btn'); if (!b) return;
    const mine = player.current()?.id === view.song;
    b.dataset.state = mine ? view.needle : 'idle';
    b.querySelector('span').textContent = tr(!mine || view.needle === 'idle' ? '落针试听' : view.needle === 'playing' || view.needle === 'paused' ? '抬起唱针' : view.needle === 'buffering' ? '正在缓冲…' : '唱针正在落下…');
    b.setAttribute('aria-pressed', mine ? 'true' : 'false');
  }

  /* ---------- 右侧：标签上的曲目表 ---------- */
  const inScope = id => M.prefs.scope.includes(id);
  const dropLabel = pool => M.prefs.size === 'all' ? tr('落针 · 全部 {n} 首', {n: pool}) : tr('落针 · 随机 {n} 首', {n: M.sizeFor(pool)});
  const poolSize = () => M.tracks.filter(t => M.lectureIds(t).some(inScope)).length;
  function renderPanel() {
    panel.dataset.mode = view.mode;
    if (view.mode === 'close') return renderClose();
    if (liveVideo) { pauseVideo(); liveVideo = null; }
    const st = M.stats(), all = M.prefs.scope.length === M.lectures.length;
    const pool = M.tracks.filter(t => M.lectureIds(t).some(inScope)).length;
    panel.innerHTML = `
      <div class="p-over">
        <h1 class="p-years">1854<i>—</i>1968</h1>
        <p class="p-sub">${tr('75 首 · 七讲 · 刻满 {n} 圈', {n: st.full})}${st.some ? tr('，刻了一部分 {n} 圈', {n: st.some}) : ''}</p>
        <button class="drop-btn" id="startRound"><span>${dropLabel(pool)}</span><kbd>${tr('进入听辨 →')}</kbd></button>
        ${M.unfinished().length ? `<button class="resume-round" data-resume="${M.unfinished()[0].id}">${tr('继续未完成的一轮 · 已答 {a} / {b} 首 →', {a: M.unfinished()[0].entries.length, b: M.unfinished()[0].size})}</button>` : ''}
        <div class="seg question-types" role="group" aria-label="${tr('题型')}"><button data-type="choice" aria-pressed="${M.prefs.questionType === 'choice'}">${tr('选择题')}</button><button data-type="written" aria-pressed="${M.prefs.questionType === 'written'}">${tr('填空题')}</button></div>
        <div class="p-opts">
          <div class="seg" role="group" aria-label="${tr('一轮几首')}">${[[10, tr('{n} 首', {n: 10})], [20, tr('{n} 首', {n: 20})], ['all', tr('全部听完')], ['custom', tr('自定义')]].map(([v, t]) => `<button data-size="${v}" aria-pressed="${M.prefs.size === v}">${t}</button>`).join('')}</div>
          ${M.prefs.size === 'custom' ? `<label class="p-custom">${tr('每轮')} <input id="customSize" type="number" inputmode="numeric" min="1" max="${pool}" value="${Math.min(M.prefs.custom, pool)}" aria-label="${tr('自定义每轮首数')}"> ${tr('首')} <span>${tr('（最多 {n}）', {n: pool})}</span></label>` : ''}
          <span class="p-scope">${all ? tr('范围：全部七讲') : tr('范围：{a} 讲，{b} 首', {a: M.prefs.scope.length, b: pool})}</span>
        </div>
        <div class="p-head"><span>${tr('SIDE A · 七讲')}</span><span>${tr('点方格加入范围')}</span></div>
        <ol class="lec-list">${M.lectures.map(l => `
          <li data-lec="${l.id}">
            <button class="lec-name" data-start="${l.id}" title="${tr('只练这一讲')}"><i>A${l.id}</i><b>${esc(M.lectureLabel(l.id))}</b><em>${tr('{n} 首', {n: l.count})}</em></button>
            <button class="lec-box" role="checkbox" aria-checked="${inScope(l.id)}" aria-label="${tr('把「{l}」加入范围', {l: esc(M.lectureLabel(l.id))})}" data-toggle="${l.id}"></button>
          </li>`).join('')}</ol>
        <p class="p-foot">${tr('盘面每一圈是一首歌：外圈 1854，内圈 1968。一圈正好十年，盘缘的 0—9 是年份的个位数。')}</p>
        <p class="p-feedback"><button data-open-guide="feedback">${tr('问题反馈')}</button></p>
      </div>`;
    $('legendSrc').textContent = tr(st.source === 'demo' ? '当前是示意数据' : st.source === 'empty' ? '这台浏览器里还没有作答记录' : st.source === 'proto' ? '按原型里的作答绘制' : '按这台浏览器里的学习记录绘制');
  }
  function laneRow(key, v, id) {
    const s = M.fieldStatus(id, key), text = s ? tr(s === '数据不足' && !v ? '还没刻' : s) : Math.round(v * 100) + '%';
    return `<div class="lane"><dt>${M.FIELD_NAMES[key]}</dt><dd><span class="lane-bar" style="--v:${v}"></span><em>${text}</em></dd></div>`;
  }
  let keepScroll = false;
  function renderClose() {
    const top = panel.scrollTop;
    const sameSong = panel.querySelector('.song')?.dataset.track === view.song;
    const storyOpen = sameSong && panel.querySelector('.story-long')?.open;
    const band = bands[view.band], t = M.byId.get(view.song), g = M.ringOf.get(view.song), lanes = M.lanesOf(t.id), cover = M.coverOf(t);
    const mates = M.spokeMates(t), style = M.styleOf(t);
    panel.innerHTML = `
      <div class="p-close">
        <button class="p-back" id="backOver">← ${tr('整张盘')}<kbd>Esc</kbd></button>
        <div class="p-band"><b>${band.label}</b><span>${tr('{n} 首', {n: band.ids.length})} · ${tr(band.decade < 1950 ? '78 转粗纹' : '密纹')}</span>
          <span class="p-bandnav"><button data-band="1" aria-label="${tr('更晚的年代（向内）')}" ${view.band === bands.length - 1 ? 'disabled' : ''}>↑</button><button data-band="-1" aria-label="${tr('更早的年代（向外）')}" ${view.band === 0 ? 'disabled' : ''}>↓</button></span></div>
        <article class="song" data-track="${t.id}" aria-live="off">
          <div class="song-top">
            ${cover ? `<img class="song-cover" data-shape="${cover.shape}" src="${cover.url}" alt="" width="${cover.w}" height="${cover.h}">` : ''}
            <div><div class="song-year">${t.year}</div><div class="song-spoke">${tr('{b} 带 · {n} 号辐', {b: band.label, n: t.year % 10})}</div></div>
          </div>
          <h2>${nameHTML(t, 'song', M.titleOf(t))}</h2>
          <div class="song-meta name-meta"><p>${nameHTML(t, 'artist')}</p><p>${nameHTML(t, 'style')}</p><p>${M.lectureIds(t).map(id => tr('第 {l} 讲', {l: id}) + ' ' + esc(M.lectureLabel(id))).join('; ')}</p></div>
          ${cover ? `<details class="cover-info"><summary>${esc(M.coverLabel(cover))}</summary><p>${esc(cover.album || '')}<br>${esc(cover.artist || '')}</p><p>${esc(cover.note || '')}</p>${cover.source ? `<a href="${esc(cover.source)}" target="_blank" rel="noopener noreferrer">${tr('封面来源')} ↗</a>` : ''}</details>` : ''}
          ${videoFigureHTML(t)}
          <button class="needle-btn" aria-pressed="false"><i></i><span>${tr('落针试听')}</span><kbd>${tr('空格')}</kbd></button>
          <dl class="lanes" aria-label="${tr('这一圈的四道刻纹')}">${M.KEYS.map((k, i) => laneRow(k, lanes[i], t.id)).join('')}</dl>
          ${trackStoryHTML(t)}
          ${mates.length ? `<div class="spoke"><h3>${tr('{n} 号辐上还有', {n: t.year % 10})}</h3><p>${mates.map(o => `<button data-song="${o.id}">${o.year} ${esc(M.titleOf(o))}</button>`).join('')}</p></div>` : ''}
        </article>
        <div class="p-head"><span>${band.label} · ${tr('{n} 首', {n: band.ids.length})}</span><span>${tr('←→ 换歌')}</span></div>
        <ol class="band-list">${band.ids.map(id => { const o = M.byId.get(id); return `<li><button data-song="${id}" aria-current="${id === view.song}"${hasVideo(id) ? ' class="has-video"' : ''}><i>${o.year}</i><b>${esc(M.titleOf(o))}</b>${hasVideo(id) ? `<em class="vid-mark" title="${tr('有课件视频')}"><span class="sr-only">${tr('有课件视频')}</span></em>` : ''}<span class="mini-cut" style="--v:${M.avgCut(id)}"></span></button></li>`; }).join('')}</ol>
      </div>`;
    keepVideo();
    renderNeedle();
    if (storyOpen) panel.querySelector('.story-long')?.setAttribute('open', '');
    panel.scrollTop = keepScroll || sameSong ? top : 0; keepScroll = false;
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const fig = b.closest('.vid');
    if (fig && b.hasAttribute('data-vid-play')) return playVideo(fig);
    if (fig && b.hasAttribute('data-vid-jump')) return playVideo(fig, videoOf(fig.dataset.video)?.songAt || 0);
    if (fig && b.hasAttribute('data-vid-retry')) return retryVideo(fig);
    if (fig && b.dataset.vidQ) return setVideoQuality(fig, b.dataset.vidQ);
    if (b.dataset.resume) return ctx.resumeRound(b.dataset.resume);
    if (b.dataset.type) { M.prefs.questionType = b.dataset.type; M.savePrefs(); renderPanel(); panel.querySelector(`[data-type="${b.dataset.type}"]`)?.focus(); return; }
    if (b.id === 'startRound') return ctx.startRound(M.prefs.scope, b);
    if (b.id === 'backOver') return backOver();
    if (b.dataset.size) { const v = b.dataset.size; M.prefs.size = /^\d+$/.test(v) ? +v : v; M.savePrefs(); renderPanel();
      if (v === 'custom') { const i = $('customSize'); i?.focus(); i?.select(); } else panel.querySelector(`[data-size="${v}"]`)?.focus(); return; }
    if (b.dataset.start) return ctx.startRound([+b.dataset.start], b);
    if (b.dataset.toggle) { const id = +b.dataset.toggle, s = new Set(M.prefs.scope); s.has(id) ? s.delete(id) : s.add(id);
      if (!s.size) return say(tr('至少留一讲')); M.prefs.scope = M.lectures.map(l => l.id).filter(i => s.has(i)); M.savePrefs(); renderPanel();
      panel.querySelector(`[data-toggle="${id}"]`)?.focus(); return; }
    if (b.dataset.song) { keepScroll = !!b.closest('.band-list'); select(M.ringOf.get(b.dataset.song)); panel.querySelector(`.band-list [data-song="${b.dataset.song}"]`)?.focus({preventScroll: true}); return; }
    if (b.dataset.band) return stepBand(+b.dataset.band);
    if (b.classList.contains('needle-btn')) return toggleNeedle();
  });
  // 讲次悬停：这一讲的圈在盘上亮起来
  const lecMarks = id => disc?.setMarks(id ? M.tracks.filter(t => M.lectureIds(t).includes(id)).map(t => t.id) : []);
  panel.addEventListener('pointerover', e => { const li = e.target.closest('[data-lec]'); lecMarks(li ? +li.dataset.lec : 0); });
  panel.addEventListener('pointerleave', () => lecMarks(0));
  panel.addEventListener('focusin', e => { const li = e.target.closest('[data-lec]'); lecMarks(li ? +li.dataset.lec : 0); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape' && view.mode === 'close') backOver();
    if (e.key === 'Enter' && e.target.id === 'customSize') { e.target.blur(); $('startRound')?.focus(); }
  });
  // 自定义首数：边输边更新按钮上的数字，离开输入框时收回到合法范围
  panel.addEventListener('input', e => {
    if (e.target.id !== 'customSize') return;
    const n = Math.round(+e.target.value); if (!n || n < 1) return;
    M.prefs.custom = Math.min(n, M.tracks.length); M.savePrefs();
    const s = $('startRound')?.querySelector('span'); if (s) s.textContent = dropLabel(poolSize());
  });
  panel.addEventListener('focusout', e => { if (e.target.id === 'customSize') e.target.value = Math.min(M.prefs.custom, poolSize()); });

  M.onChange(what => { if (what === 'lanes') { disc?.refreshLanes(); if (view.flat) mountFlat(); updateSky(); } if (!$('roomDisc').hidden) renderPanel(); });

  /* ---------- 入口：只在第一次 ---------- */
  let introTimer = 0;
  function playIntro() {
    if (!disc || ctx.reduced()) return;
    view.intro = true; stage.dataset.intro = '1'; $('introSkip').hidden = false; cosmos?.setState('intro');
    disc.setMode('intro'); disc.jumpCamera(); disc.setLight(0, 1.5, true);
    requestAnimationFrame(() => { disc.setLight(1, 0); disc.setMode('over', -1, 2.3); });
    clearTimeout(introTimer); introTimer = setTimeout(() => endIntro(false), 1400);
  }
  function endIntro(snap = true) {
    if (!view.intro) return; clearTimeout(introTimer);
    view.intro = false; stage.dataset.intro = '0'; $('introSkip').hidden = true; cosmos?.setState(view.mode); cosmos?.reveal();
    if (snap && disc) { disc.setLight(1, 0, true); disc.setMode('over'); disc.jumpCamera(); }
  }
  $('introSkip').addEventListener('click', () => endIntro());
  addEventListener('keydown', () => { if (view.intro) endIntro(); }, true);

  await mount();

  return {
    renderNow: n => disc?.renderNow(n),
    remount: mount,
    intro: playIntro,
    get flat() { return view.flat; },
    // 钻进标签：返回动画时长（毫秒）
    dive() { spread.hidden = true; cosmos?.setState('dive'); if (!disc || ctx.reduced()) return 0; liftNeedle(); setChip(null); stage.dataset.mode = 'dive'; disc.setMode('dive', -1, 6.2); return 520; },
    // 从标签拉远回到盘面
    surface(fromLabel) {
      liftNeedle();
      if (disc && fromLabel && !ctx.reduced()) { disc.setMode('dive'); disc.jumpCamera(); }
      view.mode = 'over'; view.band = -1; view.song = null; applyView(!fromLabel || ctx.reduced());
      if (disc && fromLabel) disc.setMode('over', -1, 3.4);
      disc?.home();
      cosmos?.resume(); if (!view.intro) cosmos?.reveal();
      bgm.setRoom(true);
    },
    // 一轮结束后回到盘面：把这一轮答过的圈当场刻上
    celebrate(list) {
      if (!list?.length) return;
      if (!disc) return;
      const todo = list.filter(c => c.before.some((v, i) => Math.abs(v - c.after[i]) > .004));
      disc.setMarks(list.map(c => c.id));
      todo.forEach((c, i) => setTimeout(() => disc.cut(c.id, c.before, c.after, 1100), 500 + i * 260));
      setTimeout(() => disc.setMarks([]), 500 + todo.length * 260 + 2600);
      // 动画开始前先把这些圈放回旧的样子
      for (const c of todo) disc.cut(c.id, c.before, c.before, 1);
      // 天上只做一件事：刻纹走完后，进步最多的那首在它年份尾数的辐线上显影（放不下就放在两个数字中间，绝不指向别的数字）
      const gain = c => c.after.reduce((s, v, i) => s + v - (c.before[i] || 0), 0);
      const spoke = d => () => { const o = disc?.project([0, 0, 0]), a = d / 10 * TAU, p = disc?.project([1.16 * Math.sin(a), 0, -1.16 * Math.cos(a)]);
        if (!o || !p) return null; const v = [p[0] - o[0], p[1] - o[1]], l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l]; };
      const mids = d => () => Array.from({length: 10}, (_, k) => k + .5).sort((a, b) => Math.abs(a - d - .5) - Math.abs(b - d - .5)).map(m => spoke(m)());
      const cands = [...list].sort((a, b) => gain(b) - gain(a)).map(c => { const d = (M.ringOf.get(c.id)?.t.year ?? 0) % 10; return {id: c.id, dir: spoke(d), mid: mids(d)}; });
      cosmos?.recall(cands, (500 + todo.length * 260 + 1500) / 1000);
    },
    focusSong(id) { const g = M.ringOf.get(id); if (g) enterBand(bands[g.band], g); },
    pause(opts = {}) { liftNeedle(); pauseVideo(); bgm.setRoom(false); closeCard(); closeFx(false); if (!opts.keepCosmos) cosmos?.pause(); },
    pauseCosmos() { cosmos?.pause(); },
    get cosmos() { return cosmos; },
    get bgm() { return bgm; },
    get sfx() { return sfx; },
    get listener() { return listener; },
    openFx, closeFx,
    updateSky,
    get disc() { return disc; },
    focus: focusDisc
  };
}
