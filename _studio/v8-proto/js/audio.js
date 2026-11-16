// 训练与落针共用的媒体状态控制。淡入由音频时钟调度，不依赖画面帧率。
import {audioSrc, audioFallbackSrc, srcKbps, srcTier, canDowngrade} from './model.js';
import {watch, penalize} from './net.js';
import {t} from './i18n.js';
export function createAudio() {
  const element = new Audio(); element.preload = 'metadata';
  let track = null, state = 'idle', listener = null, token = 0, resumeAt = null;
  let context = null, gain = null, noise = null, silent = false;
  const messages = Object.fromEntries(Object.entries({idle: '点击播放收听', loading: '音频加载中…', ready: '音频已就绪，点击播放', playing: '正在播放',
    paused: '已暂停', waiting: '正在缓冲…', ended: '播放完毕，可以重听', blocked: '浏览器需要你点击播放', error: '音频加载失败，点击播放重试'}).map(([k, v]) => [k, t(v)]));
  const set = value => { state = value; listener?.(state, track); };
  function stopNoise() { if (noise) { try { noise.stop(); } catch {} noise.disconnect(); noise = null; } }
  function graph() {
    if (!context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC(); gain = context.createGain();
      context.createMediaElementSource(element).connect(gain).connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => set('blocked'));
    return context;
  }
  function crackle() {
    if (!context) return;
    stopNoise();
    const sr = context.sampleRate, n = Math.floor(sr * .9), buffer = context.createBuffer(1, n, sr), data = buffer.getChannelData(0);
    let pop = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < .00035) pop = (Math.random() * .7 + .3) * (Math.random() < .5 ? -1 : 1);
      lp += ((Math.random() * 2 - 1) * .05 + pop - lp) * .35; pop *= .86;
      data[i] = lp * Math.min(1, i / (sr * .03)) * Math.pow(1 - i / n, 1.4) * .5;
    }
    noise = context.createBufferSource(); noise.buffer = buffer; noise.connect(context.destination); noise.start();
  }
  // 保存用户最新的定位意图，直到媒体完成异步跳转；连续按键不会退回旧位置。
  function acknowledgeSeek() {
    if (resumeAt !== null && !element.seeking && Math.abs(element.currentTime - resumeAt) < (element.paused ? .01 : .25)) resumeAt = null;
  }
  function applyPendingSeek() {
    if (resumeAt === null || !Number.isFinite(element.duration)) return;
    resumeAt = Math.min(resumeAt, Math.max(0, element.duration));
    try { element.currentTime = resumeAt; acknowledgeSeek(); } catch {}
  }
  element.addEventListener('seeked', acknowledgeSeek);
  element.addEventListener('timeupdate', acknowledgeSeek);
  element.addEventListener('canplay', () => { if (!element.seeking) applyPendingSeek(); });
  for (const ev of ['waiting','stalled']) element.addEventListener(ev, () => { if (track && !element.paused && !silent) set('waiting'); });
  element.addEventListener('playing', () => { if (track && !silent) set('playing'); });
  element.addEventListener('pause', () => { if (track && state !== 'ended' && state !== 'error' && !silent) set('paused'); });
  element.addEventListener('ended', () => { stopNoise(); if (track) set('ended'); });
  let lastPlay = null;   // 最近一次 play() 的参数，换源后照原样再放
  // 换源：从同一位置接着放（原来在放 / 正要放就继续放）
  function switchSrc(src) {
    const wanted = lastPlay && ['loading', 'playing', 'waiting'].includes(state);
    resumeAt = element.currentTime || resumeAt || 0; token++;
    silent = true; element.src = src; silent = false;
    if (wanted) api.play({warm: lastPlay.warm}); else set('loading');
  }
  // 边播边量网速；卡住超过 1.5 秒（或点了播放 5 秒还没出声）就降到流畅档，从同一秒接着放。
  watch(element, () => track ? srcKbps(track, element.currentSrc) : 128);
  let stallTimer = 0, seekAt = 0;
  element.addEventListener('seeking', () => { seekAt = performance.now(); });
  const downgrade = () => {
    clearTimeout(stallTimer);
    if (!track || !canDowngrade(track, element.currentSrc || element.src) || !['loading', 'waiting'].includes(state)) return;
    penalize(srcKbps(track, element.currentSrc)); switchSrc(audioSrc(track, 'sd'));
  };
  element.addEventListener('waiting', () => { if (track && !element.paused && performance.now() - seekAt > 1000) { clearTimeout(stallTimer); stallTimer = setTimeout(downgrade, 1500); } });
  element.addEventListener('playing', () => clearTimeout(stallTimer));
  element.addEventListener('error', () => {
    clearTimeout(stallTimer);
    // 轻量版 / 流畅版载不了（个别浏览器或文件缺失）：换回原 mp3，从同一位置接着放
    if (track && track.src && /\/audio-(lite|sd)\//.test(element.src)) { switchSrc(audioFallbackSrc(track)); return; }
    stopNoise(); if (track) set('error');
  });
  element.addEventListener('loadedmetadata', () => {
    applyPendingSeek();
    if (state === 'loading' && element.paused) set('ready');
  });
  const api = {
    element,
    on(fn) { listener = fn; },
    current: () => track,
    failed: () => state === 'error' || state === 'blocked',
    // 网速慢时自动用的 64k 流畅档：在状态里标一下
    message: () => (messages[state] || '') + (track && ['playing', 'waiting', 'paused'].includes(state) && srcTier(element.currentSrc || element.src) === 'sd' ? ' · ' + t('流畅音质') : ''),
    tier: () => srcTier(element.currentSrc || element.src),
    load(t, at = 0) { clearTimeout(stallTimer); token++; stopNoise(); silent = true; element.pause(); track = t; resumeAt = at; element.src = audioSrc(t); silent = false; set('loading'); },
    async play({fadeIn = false, warm = false} = {}) {
      if (!track) return false;
      lastPlay = {fadeIn, warm};
      const attempt = ++token;
      if (state === 'error') { resumeAt = api.position(); element.load(); }
      silent = warm;
      if (fadeIn || warm) {
        try { graph(); } catch { set('error'); return false; }
        if (gain) { gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setValueAtTime(0, context.currentTime); }
        else element.muted = warm;
      } else if (gain) { gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setValueAtTime(1, context.currentTime); }
      set('loading');
      if (!warm) { clearTimeout(stallTimer); stallTimer = setTimeout(downgrade, 5000); }
      try {
        if (resumeAt !== null && element.readyState !== 0) applyPendingSeek();
        await element.play();
        if (attempt !== token) return false;
        if (warm) return true;
        element.muted = false;
        if (fadeIn) {
          crackle();
          if (gain) { const now = context.currentTime; gain.gain.setValueAtTime(0, now); gain.gain.setValueAtTime(0, now + .32); gain.gain.linearRampToValueAtTime(1, now + .82); }
        }
        set('playing'); return true;
      } catch (error) {
        if (attempt === token && error.name !== 'AbortError') set(error.name === 'NotAllowedError' ? 'blocked' : 'error');
        return false;
      }
    },
    position: () => resumeAt !== null ? resumeAt : element.currentTime,
    seekTo(seconds, durationHint = 0) {
      const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : durationHint || track?.duration || 0;
      if (!track || !duration || !Number.isFinite(seconds)) return false;
      const target = Math.max(0, Math.min(duration, seconds));
      resumeAt = target;
      if (Number.isFinite(element.duration) && element.readyState !== 0) applyPendingSeek();
      return true; // 元数据尚未返回时记住用户点的位置。
    },
    pause() { token++; stopNoise(); element.pause(); },
    stop() { token++; stopNoise(); silent = true; element.pause(); track = null; silent = false; set('idle'); }
  };
  return api;
}
const needle = createAudio();
let listener = null, started = false;
needle.on((state, track) => { if (started || ['error','blocked','idle'].includes(state)) listener?.(state === 'idle' ? 'stopped' : state, track); });
export const player = {
  on(fn) { listener = fn; }, current: needle.current,
  time: () => ({t: needle.element.currentTime, d: needle.element.duration || 0}),
  prepare(track) { started = false; needle.load(track); needle.play({warm: true}); listener?.('loading', track); },
  start() { started = true; try { needle.element.currentTime = 0; } catch {} needle.play({fadeIn: true}); },
  stop() { started = false; const t = needle.current(); needle.stop(); if (t) listener?.('stopped', t); },
  // 播放条用：暂停 / 继续 / 拖进度
  pause() { if (started && needle.current()) needle.pause(); },
  resume() { if (started && needle.current()) needle.play(); },
  seek(seconds) { return needle.seekTo(seconds); },
  element: needle.element
};
