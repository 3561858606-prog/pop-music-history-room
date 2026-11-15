// 课件视频：8 段从课件 PPTX 中原样提取的视频，与已有的 8 个视频音轨曲目一一对应。
// 对应关系按讲次、页码以及 scripts/video-edits.json 记录的源媒体 SHA-256 核对（t73 按第 7 讲第 12 页）。
// 视频文件体积超出本站发布上限，单独托管；地址由 index.html 的 <meta name="course-video-base"> 指定。
import {esc} from './reading.js';
import {site} from './model.js';

const base = (() => {
  let v = document.querySelector('meta[name="course-video-base"]')?.content?.trim() || 'course-videos/';
  if (!/^https?:\/\//.test(v)) v = site(v);   // 相对地址按站点根目录解析
  return v.endsWith('/') ? v : v + '/';
})();

// songAt：画面里音乐真正开始的位置（与听辨音轨的剪辑起点一致），只在前面有较长非音乐段时提供跳转。
export const VIDEOS = {
  t50: {file: 'L01_S014.mp4', deck: 1, slide: 14, duration: 161.24, kind: '自动钢琴演奏', songAt: 8.86},
  t51: {file: 'L01_S015.mp4', deck: 1, slide: 15, duration: 156.48, kind: '爱迪生圆筒留声机 · 班卓琴', songAt: 14.48},
  t52: {file: 'L01_S016.mp4', deck: 1, slide: 16, duration: 30.65, kind: '唱片留声机'},
  t53: {file: 'L03_S006.mp4', deck: 3, slide: 6, duration: 157.97, kind: '动画短片'},
  t54: {file: 'L03_S014.mp4', deck: 3, slide: 14, duration: 276.6, kind: '歌词视频'},
  t55: {file: 'L03_S015.mp4', deck: 3, slide: 15, duration: 175.1, kind: '歌词视频'},
  t56: {file: 'L06_S006.mp4', deck: 6, slide: 6, duration: 217.34, kind: 'Ed Sullivan 现场 · 1956-10-28', songAt: 64.7},
  t73: {file: 'L07_S012.mp4', deck: 7, slide: 12, duration: 178.31, kind: '电视现场演出'}
};
export const videoOf = id => VIDEOS[id] || null;
export const hasVideo = id => id in VIDEOS;
export const videoCount = Object.keys(VIDEOS).length;
export const videoSrc = v => base + v.file;
const posterOf = id => `assets/video-posters/${id}.jpg`;
export const clock = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// 目录与曲目表里的小标签。
export const videoTag = id => hasVideo(id) ? '<span class="vid-tag"><i aria-hidden="true"></i>视频</span>' : '';

// 详情里的视频：先显示封面帧，点了才向视频服务器请求，避免翻歌时白白下载。
export function videoFigureHTML(t) {
  const v = videoOf(t.id); if (!v) return '';
  const where = `第 ${v.deck} 讲 · 第 ${v.slide} 页`;
  return `<figure class="vid" data-video="${t.id}" data-state="idle">
    <div class="vid-frame">
      <button class="vid-start" data-vid-play aria-label="播放课件视频：${esc(t.song)}，${where}，时长 ${clock(v.duration)}">
        <img src="${posterOf(t.id)}" alt="" width="640" height="360" decoding="async">
        <span class="vid-glyph" aria-hidden="true"><i></i></span>
        <span class="vid-len" aria-hidden="true">${clock(v.duration)}</span>
      </button>
    </div>
    <figcaption>
      <span class="vid-cap"><span class="vid-src"><b>课件视频</b><span>${where}</span></span><span class="vid-kind">${esc(v.kind)}</span></span>
      ${v.songAt ? `<button class="vid-jump" data-vid-jump>从音乐开始 <span>${clock(v.songAt)}</span></button>` : ''}
    </figcaption>
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
    el.src = videoSrc(v) + (at ? `#t=${at}` : '');
    el.setAttribute('aria-label', `课件视频：第 ${v.deck} 讲第 ${v.slide} 页`);
    el.addEventListener('play', () => { fig.dataset.state = 'playing'; onPlay?.(); });
    el.addEventListener('pause', () => { if (fig.dataset.state === 'playing') fig.dataset.state = 'paused'; });
    el.addEventListener('waiting', () => { fig.dataset.buffering = '1'; });
    el.addEventListener('playing', () => { delete fig.dataset.buffering; });
    el.addEventListener('error', () => {
      fig.dataset.state = 'error';
      fig.querySelector('.vid-error').innerHTML = '视频暂时无法载入。<button data-vid-retry>重试</button>';
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
