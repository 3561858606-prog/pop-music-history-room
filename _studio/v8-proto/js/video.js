// 课件视频与题库中的视频音轨一一对应。
// 对应关系按讲次、页码以及 scripts/video-edits.json 记录的源媒体 SHA-256 核对（t73 按第 7 讲第 12 页）。
// 视频目录由 index.html 的 <meta name="course-video-base"> 指定（默认站内 course-videos/）。
// 画质档：原片（720p / 480p，在 course-videos/ 下），有的还有 1080p 原画（course-videos/1080/），
// 另有 360p、240p 流畅档（course-videos/360/、/240/，scripts/make-media-tiers.mjs 生成）。各档码率见 media-tiers.js。
import {esc} from './reading.js';
import {courseMediaUrl} from '../../../v3/catalog.js';
import {site} from './model.js';
import {t as tr} from './i18n.js';
import {VIDEO as TIERS} from './media-tiers.js';
import * as net from './net.js';

const base = (() => {
  let v = document.querySelector('meta[name="course-video-base"]')?.content?.trim() || 'course-videos/';
  if (!/^https?:\/\//.test(v)) v = site(v);   // 相对地址按站点根目录解析
  return v.endsWith('/') ? v : v + '/';
})();

// songAt：画面里音乐真正开始的位置（与听辨音轨的剪辑起点一致），只在前面有较长非音乐段时提供跳转。
export const VIDEOS = {
  t50: {file: 'L01_S014.mp4', deck: 1, slide: 14, duration: 161.24, kind: '自动钢琴演奏', songAt: 8.86, hd: true},
  t51: {file: 'L01_S015.mp4', deck: 1, slide: 15, duration: 156.48, kind: '爱迪生圆筒留声机 · 班卓琴', songAt: 14.48, hd: true},
  t52: {file: 'L01_S016.mp4', deck: 1, slide: 16, duration: 30.65, kind: '唱片留声机'},
  t53: {file: 'L03_S006.mp4', deck: 3, slide: 6, duration: 157.97, kind: '动画短片', hd: true},
  t54: {file: 'L03_S014.mp4', deck: 3, slide: 14, duration: 276.6, kind: '歌词视频'},
  t55: {file: 'L03_S015.mp4', deck: 3, slide: 15, duration: 175.1, kind: '歌词视频'},
  t56: {file: 'L06_S006.mp4', deck: 6, slide: 6, duration: 217.34, kind: 'Ed Sullivan 现场 · 1956-10-28', songAt: 64.7, hd: true},
  t73: {file: 'L07_S012.mp4', deck: 7, slide: 12, duration: 178.31, kind: '电视现场演出'},
  // 第 9 讲已重封装，各档 MP4 文件头均小于 160 KB。
  t100: {file: 'L09_S09.mp4', deck: 9, slide: 9, duration: 213.04, kind: '电影画面剪辑', indexBytes: 160_000},
  t101: {file: 'L09_S10.mp4', deck: 9, slide: 10, duration: 234.08, kind: '歌曲视频', indexBytes: 160_000}
};
export const videoOf = id => VIDEOS[id] || null;
export const hasVideo = id => id in VIDEOS;
export const videoCount = Object.keys(VIDEOS).length;

/* ---------- 画质：自动按网速挑档（网速要有码率的 2 倍），卡了自动往下降一档；也可以自己选 ---------- */
const QKEY = 'v8-proto-video-quality';
const get = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const put = (store, key, value) => { try { store.setItem(key, value); } catch {} };
let choice = /^(auto|\d{3,4})$/.test(get(localStorage, QKEY) || '') ? get(localStorage, QKEY) : 'auto';
// 这段视频有哪些档：[[高度, kbps], …] 从高到低
const tiersOf = v => Object.entries(TIERS[v.file] || {}).sort((a, b) => +b[0] - +a[0]);
const kbpsOf = (v, q) => (TIERS[v.file] || {})[q] || 1500;
const lowerOf = (v, q) => { const list = tiersOf(v), i = list.findIndex(([x]) => x === q); return i >= 0 && i < list.length - 1 ? list[i + 1][0] : null; };
export function qualityOf(v) {
  const list = tiersOf(v); if (!list.length) return null;
  if (choice !== 'auto') return (list.find(([q]) => +q <= +choice) || list.at(-1))[0];
  return net.pick(list, 2, list.find(([q]) => q === '360')?.[0]);
}
export function videoSrc(v, q = qualityOf(v)) {
  const path = (q === '1080' || q === '360' || q === '240' ? q + '/' : '') + v.file;
  return courseMediaUrl(v.deck, 'course-videos/' + path) || base + path;
}
const qualityHTML = (v, q) => { const list = tiersOf(v); if (list.length < 2) return '';
  return `<span class="vid-q" role="group" aria-label="${tr('画质')}"><button data-vid-q="auto" aria-pressed="${choice === 'auto'}">${tr('自动')}</button>${list.map(([x]) => `<button data-vid-q="${x}" aria-pressed="${choice !== 'auto' && q === x}" data-now="${q === x ? 1 : 0}">${x}p</button>`).join('')}</span>`; };
function note(fig, text) { const n = fig.querySelector('.vid-note'); if (n) n.textContent = text; }
function syncQuality(fig) { const q = fig.dataset.q; fig.querySelectorAll('[data-vid-q]').forEach(b => { const x = b.dataset.vidQ; b.setAttribute('aria-pressed', x === 'auto' ? choice === 'auto' : choice !== 'auto' && x === q); b.dataset.now = x === q ? 1 : 0; }); }

function reloadVideoAt(el, at) {
  const rate = el.playbackRate;
  el.load();
  if (at) try { el.currentTime = at; } catch {}
  el.playbackRate = rate;
  el.play().catch(() => {});
}

// 浏览器报告拖动请求停滞，且持续无数据时，用同一个视频和目标时间重试一次。
const SEEK_RETRY_IDLE_MS = 5000;
const SEEK_RESUMED_SECONDS = 1;
function watchStalledSeek(el) {
  let target = null, timer = 0;
  const clear = () => { clearTimeout(timer); target = null; };
  const matches = seek => el.src === seek.src && Math.abs(el.currentTime - seek.at) < (el.seeking ? .05 : SEEK_RESUMED_SECONDS);
  const arm = () => {
    clearTimeout(timer);
    if (!target?.stalled || target.retried || el.paused || !matches(target)) return;
    const seek = target;
    timer = setTimeout(() => {
      if (target !== seek || !seek.stalled || el.paused || !el.isConnected || !matches(seek)) return;
      seek.retried = true;
      seek.at = el.currentTime;
      reloadVideoAt(el, seek.at);
    }, Math.max(0, SEEK_RETRY_IDLE_MS - (performance.now() - seek.lastProgress)));
  };
  el.addEventListener('seeking', () => {
    if (target?.retried && matches(target)) return;
    clear();
    target = {src: el.src, at: el.currentTime, lastProgress: performance.now(), stalled: false, retried: false};
  });
  el.addEventListener('progress', () => {
    if (!target) return;
    target.lastProgress = performance.now();
    target.stalled = false;
    clearTimeout(timer);
  });
  el.addEventListener('stalled', () => { if (target) { target.stalled = true; arm(); } });
  el.addEventListener('pause', () => clearTimeout(timer));
  el.addEventListener('play', arm);
  // WebKit 有时先完成定位并播放几帧，然后才等剩余数据。
  el.addEventListener('timeupdate', () => {
    if (target && !el.seeking && el.currentTime >= target.at + SEEK_RESUMED_SECONDS) clear();
  });
  el.addEventListener('ended', clear);
  el.addEventListener('loadstart', () => { if (target && target.src !== el.src) clear(); });
  el.addEventListener('error', clear);
  return () => target?.retried === true && target.src === el.src;
}

// 换源：从同一秒接着放，原来在放就继续放。
function swap(fig, q) {
  const v = videoOf(fig.dataset.video); fig.dataset.q = q; syncQuality(fig);
  const el = fig.querySelector('video'); if (!el) return;
  const at = el.currentTime || 0, playing = !el.paused;
  el.src = videoSrc(v, q);
  el.addEventListener('loadedmetadata', () => { if (at) try { el.currentTime = at; } catch {} if (playing) el.play().catch(() => {}); }, {once: true});
}
export function setVideoQuality(fig, q) {
  choice = q; put(localStorage, QKEY, q);
  const v = videoOf(fig.dataset.video), want = qualityOf(v);
  if (fig.dataset.q !== want) swap(fig, want); else syncQuality(fig);
  note(fig, q === 'auto' ? tr('自动画质：按网速选 {q}p，卡了会自动降低。', {q: want}) : tr('已换成 {q}p。', {q: want}) + (+want >= 720 ? ' ' + tr('网速慢时可能需要缓冲。') : ''));
}

const posterOf = id => `assets/video-posters/${id}.jpg`;
export const clock = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// 目录与曲目表里的小标签。
export const videoTag = id => hasVideo(id) ? `<span class="vid-tag"><i aria-hidden="true"></i>${tr('视频')}</span>` : '';

// 详情里的视频：先显示封面帧，点了才向视频服务器请求，避免翻歌时白白下载。
export function videoFigureHTML(t) {
  const v = videoOf(t.id); if (!v) return '';
  const where = tr('第 {d} 讲 · 第 {s} 页', {d: v.deck, s: v.slide}), q = qualityOf(v);
  return `<figure class="vid" data-video="${t.id}" data-state="idle"${q ? ` data-q="${q}"` : ''}>
    <div class="vid-frame">
      <button class="vid-start" data-vid-play aria-label="${tr('播放课件视频：{s}，{w}，时长 {d}', {s: esc(t.song), w: where, d: clock(v.duration)})}">
        <img src="${posterOf(t.id)}" alt="" width="640" height="360" decoding="async">
        <span class="vid-glyph" aria-hidden="true"><i></i></span>
        <span class="vid-len" aria-hidden="true">${q ? `<b>${q}p</b>` : ''}${clock(v.duration)}</span>
      </button>
    </div>
    <figcaption>
      <span class="vid-cap"><span class="vid-src"><b>${tr('课件视频')}</b><span>${where}</span></span><span class="vid-kind">${esc(tr(v.kind))}</span></span>
      <span class="vid-acts">${qualityHTML(v, q)}${v.songAt ? `<button class="vid-jump" data-vid-jump>${tr('从音乐开始')} <span>${clock(v.songAt)}</span></button>` : ''}</span>
    </figcaption>
    <p class="vid-note" role="status"></p>
    <p class="vid-error" role="status"></p>
  </figure>`;
}

// 把封面帧换成真正的播放器。返回 video 元素。
export function mountVideo(fig, {at = 0, onPlay} = {}) {
  const id = fig.dataset.video, v = videoOf(id);
  let el = fig.querySelector('video');
  if (!el) {
    el = document.createElement('video');
    el.controls = true; el.playsInline = true; el.preload = 'auto';
    el.setAttribute('playsinline', ''); el.setAttribute('controlslist', 'nodownload');
    el.poster = posterOf(id);
    const q = qualityOf(v) || '';
    if (fig.dataset.q !== q) { fig.dataset.q = q; syncQuality(fig); }
    el.src = videoSrc(v, fig.dataset.q) + (at ? `#t=${at}` : '');
    el.setAttribute('aria-label', tr('课件视频') + ': ' + tr('第 {d} 讲 · 第 {s} 页', {d: v.deck, s: v.slide}));
    el.addEventListener('play', () => { fig.dataset.state = 'playing'; onPlay?.(); });
    el.addEventListener('pause', () => { if (fig.dataset.state === 'playing') fig.dataset.state = 'paused'; });
    // 边播边量网速。自动画质下：播放中累计卡顿超过 2 秒、一次卡住 2.5 秒，或点了播放 6 秒还没开始，就降一档，从同一秒接着放。
    net.watch(el, () => kbpsOf(v, fig.dataset.q), () => el.isConnected);
    const recoveringSeek = v.deck === 9 ? watchStalledSeek(el) : () => false;
    let started = false, startAt = 0, loadAt = 0, indexMs = 0, since = 0, stalled = 0, timer = 0;
    const downgrade = (startup = false) => {
      clearTimeout(timer); since = 0; stalled = 0;
      let lower = lowerOf(v, fig.dataset.q);
      if (choice !== 'auto' || !lower || recoveringSeek()) return;
      // 开播超时，且文件头传输速度明显撑不起下一档时，省掉再缓冲一次。
      if (startup && v.indexBytes && indexMs > 0) {
        const next = tiersOf(v).filter(([q]) => +q <= +lower);
        const bytesPerSecond = v.indexBytes * 1000 / indexMs;
        lower = net.pick(next, 1, null, bytesPerSecond * 1.25);
      }
      net.penalize(kbpsOf(v, fig.dataset.q)); swap(fig, lower);
      note(fig, tr('网速跟不上，已换成 {q}p，从同一秒接着放。', {q: lower}));
    };
    el.addEventListener('waiting', () => {
      fig.dataset.buffering = '1';
      if (started && !since && !el.seeking) { since = performance.now(); clearTimeout(timer); timer = setTimeout(downgrade, 2500); }
    });
    el.addEventListener('playing', () => {
      delete fig.dataset.buffering;
      if (!started) return;
      clearTimeout(timer);
      if (since) { stalled += performance.now() - since; since = 0; if (stalled > 2000) downgrade(); }
    });
    el.addEventListener('play', () => {
      if (started || recoveringSeek()) return;
      startAt = el.currentTime;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!started && !el.paused && el.isConnected) downgrade(true); }, 6000);
    });
    // WebKit 可能已发出 playing，但进度仍停在开播位置。等进度实际走动才结束开播计时。
    el.addEventListener('timeupdate', () => {
      if (started || el.paused || el.seeking || el.currentTime < startAt + .05) return;
      started = true;
      clearTimeout(timer);
    });
    el.addEventListener('loadstart', () => { started = false; loadAt = performance.now(); indexMs = 0; });
    el.addEventListener('loadedmetadata', () => { if (loadAt) indexMs = performance.now() - loadAt; });
    el.addEventListener('error', () => {
      fig.dataset.state = 'error';
      fig.querySelector('.vid-error').innerHTML = `${tr('视频暂时无法载入。')}<button data-vid-retry>${tr('重试')}</button>`;
    });
    fig.querySelector('.vid-start')?.replaceWith(el);
    fig.dataset.state = 'loading';
  } else if (at) {
    try { el.currentTime = at; } catch {}
  }
  el.play().catch(() => { if (fig.dataset.state !== 'error') fig.dataset.state = 'paused'; });
  el.focus({preventScroll: true});
  return el;
}

export function retryVideo(fig) {
  const el = fig.querySelector('video'); if (!el) return;
  fig.querySelector('.vid-error').textContent = ''; fig.dataset.state = 'loading';
  reloadVideoAt(el, el.currentTime || 0);
}
