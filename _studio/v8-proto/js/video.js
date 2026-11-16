// 课件视频：8 段从课件 PPTX 中原样提取的视频，与已有的 8 个视频音轨曲目一一对应。
// 对应关系按讲次、页码以及 scripts/video-edits.json 记录的源媒体 SHA-256 核对（t73 按第 7 讲第 12 页）。
// 视频目录由 index.html 的 <meta name="course-video-base"> 指定（默认站内 course-videos/）。
// hd：有 1080p 原画（course-videos/1080/ 下，原片无损重封装），其余为 720p 网页版或原片本身（480p/720p）。
import {esc} from './reading.js';
import {site} from './model.js';
import {t as tr} from './i18n.js';

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
  t73: {file: 'L07_S012.mp4', deck: 7, slide: 12, duration: 178.31, kind: '电视现场演出'}
};
export const videoOf = id => VIDEOS[id] || null;
export const hasVideo = id => id in VIDEOS;
export const videoCount = Object.keys(VIDEOS).length;

/* ---------- 画质：有 1080p 的默认放 1080p；卡顿时自动换回 720p，也可以自己选 ---------- */
const QKEY = 'v8-proto-video-quality', SLOW = 'v8-proto-video-slow';
const get = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const put = (store, key, value) => { try { store.setItem(key, value); } catch {} };
let choice = ['720', '1080'].includes(get(localStorage, QKEY)) ? get(localStorage, QKEY) : 'auto';
let slow = get(sessionStorage, SLOW) === '1';   // 这次打开网站时卡过，之后的视频先放 720p
const conn = navigator.connection;
// 网速估计只在明显很慢（2G/3G）或开了省流量时才先放 720p；其余先放 1080p，真卡了再换。
const autoHD = () => !slow && !conn?.saveData && !/(^|-)2g$|^3g$/.test(conn?.effectiveType || '');
export const qualityOf = v => !v.hd ? null : choice !== 'auto' ? choice : autoHD() ? '1080' : '720';
export const videoSrc = (v, q = qualityOf(v)) => base + (q === '1080' ? '1080/' : '') + v.file;
const qualityHTML = (v, q) => v.hd ? `<span class="vid-q" role="group" aria-label="${tr('画质')}">${['720', '1080'].map(x => `<button data-vid-q="${x}" aria-pressed="${q === x}">${x}p</button>`).join('')}</span>` : '';
function note(fig, text) { const n = fig.querySelector('.vid-note'); if (n) n.textContent = text; }
function syncQuality(fig) { const q = fig.dataset.q; fig.querySelectorAll('[data-vid-q]').forEach(b => b.setAttribute('aria-pressed', b.dataset.vidQ === q)); }
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
  if (fig.dataset.q !== q) swap(fig, q);
  note(fig, tr(q === '1080' ? '已换成 1080p 原画。网速慢时可能需要缓冲。' : '已换成 720p。'));
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
        <span class="vid-len" aria-hidden="true">${q === '1080' ? '<b>1080p</b>' : ''}${clock(v.duration)}</span>
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
    if (v.hd && !fig.dataset.q) fig.dataset.q = qualityOf(v);
    el.src = videoSrc(v, fig.dataset.q) + (at ? `#t=${at}` : '');
    el.setAttribute('aria-label', tr('课件视频') + ': ' + tr('第 {d} 讲 · 第 {s} 页', {d: v.deck, s: v.slide}));
    el.addEventListener('play', () => { fig.dataset.state = 'playing'; onPlay?.(); });
    el.addEventListener('pause', () => { if (fig.dataset.state === 'playing') fig.dataset.state = 'paused'; });
    // 自动画质：1080p 播放中累计卡顿超过 3 秒、一次卡住 4 秒，或点了播放 8 秒还没开始，就换回 720p。
    let started = false, since = 0, stalled = 0, timer = 0;
    const downgrade = () => {
      clearTimeout(timer); since = 0;
      if (choice !== 'auto' || fig.dataset.q !== '1080') return;
      slow = true; put(sessionStorage, SLOW, '1'); swap(fig, '720');
      note(fig, tr('网速跟不上 1080p，已换成 720p，从同一秒接着放。想看原画可点 1080p。'));
    };
    el.addEventListener('waiting', () => {
      fig.dataset.buffering = '1';
      if (started && !since) { since = performance.now(); clearTimeout(timer); timer = setTimeout(downgrade, 4000); }
    });
    el.addEventListener('playing', () => {
      delete fig.dataset.buffering; clearTimeout(timer);
      if (since) { stalled += performance.now() - since; since = 0; if (stalled > 3000) downgrade(); }
      started = true;
    });
    el.addEventListener('play', () => { if (!started && fig.dataset.q === '1080') { clearTimeout(timer); timer = setTimeout(() => { if (!started) downgrade(); }, 8000); } });
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
  const t = el.currentTime || 0; el.load(); if (t) try { el.currentTime = t; } catch {}
  el.play().catch(() => {});
}
